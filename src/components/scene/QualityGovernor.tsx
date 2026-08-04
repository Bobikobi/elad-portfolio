'use client';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useScene, type Quality } from '@/lib/sceneStore';

/**
 * Quality governor v2 (R5.9). Replaces drei's raw `PerformanceMonitor onDecline`, which
 * judged the very first frames — the ones spent compiling shaders and uploading textures
 * — and so demoted perfectly capable machines to the low tier before the scene had even
 * warmed up, permanently.
 *
 * Four rules:
 *
 *  1. WARM-UP GRACE. Nothing is measured for the first {@link WARMUP_S} seconds after the
 *     first frame. Compile + upload cost belongs to loading, not to the steady state.
 *  2. REFRESH-RATE DETECTION. The display period is estimated as a low percentile of the
 *     observed frame deltas (load only ever makes frames LONGER, so the fast tail is the
 *     honest signal), then snapped to a real refresh rate. A 120Hz laptop must not be
 *     judged against a 60Hz yardstick, and vice-versa.
 *  3. PACING PROFILE. 100Hz-capable displays get `smooth` — run at the display rate.
 *     Everything else locks to an even-paced 60: on a 75/90Hz panel an uncapped scene
 *     produces a repeating long/short frame pattern that reads as micro-stutter even at
 *     "good" FPS. Pacing is COST ONLY; it never changes what is in the frame.
 *  4. HYSTERESIS, and an inverted default (PERF-2). Everyone STARTS on the low-cost
 *     profile; high has to be earned by holding near the target, for eight seconds, with
 *     no frame longer than 1.6 periods in that window, and it can be earned once. A
 *     downgrade still needs only a sustained shortfall - cheap to leave, expensive to
 *     enter. The old default was the other way round, so a borderline machine's first
 *     experience of the site was the stutter it took 1.2s to react to.
 *
 * TIER COMPOSITION LAW: the governor only ever writes `quality` (particle counts, God
 * Rays samples, hi-res texture tier) and the frame pacing. Camera framing, poses, easing
 * and the act machine are untouched — composition is identical on every tier.
 */

const WARMUP_S = 3.5;          // no judging while shaders compile / textures upload
const SAMPLE_TARGET = 96;      // frame deltas collected for the refresh-rate estimate
const DOWN_RATIO = 0.62;       // below this share of target fps = struggling
const DOWN_HOLD_S = 1.2;       // sustained shortfall before a downgrade
const MAX_DOWNGRADES = 2;      // then latch low
// PERF-2 promotion criteria. These are deliberately much harder than the demotion ones,
// and harder than the 0.86-for-6s they replace, for a reason that only shows up once the
// default is inverted: the evidence is now gathered while running CHEAP, and "coping at
// 86% of target while cheap" says almost nothing about "100% while expensive".
const UP_RATIO = 0.97;         // near the ceiling, not merely comfortable
const UP_HOLD_S = 8;           // long enough to cross a transition, not one quiet moment
const UP_STALL_X = 1.6;        // any frame this many periods long resets the window
const MAX_PROMOTIONS = 1;      // one attempt; a machine that failed the real test is not asked twice
const SMOOTH_HZ_MIN = 100;     // display rates at or above this get the `smooth` profile
const EVEN_TARGET = 60;        // the even-paced lock

/** Real-world refresh rates we snap the estimate to. */
const KNOWN_RATES = [30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 240];

/**
 * What the governor is currently thinking, for the debug HUD (PERF-2). A plain mutable
 * value object, never React state - it changes every frame and nothing should re-render
 * for it. `hold` is how many of the required seconds of clean headroom have accumulated,
 * which is the one number that answers "why has this machine not been promoted".
 */
export const governorState = { tier: 'low', hold: 0, need: 0, target: 0, promotions: 0 };

function snapRate(hz: number): number {
  let best = KNOWN_RATES[0];
  let bestErr = Infinity;
  for (const r of KNOWN_RATES) {
    const err = Math.abs(r - hz);
    if (err < bestErr) { bestErr = err; best = r; }
  }
  return best;
}

/** `?hz=90` forces a measured refresh rate, so the paced-60 path is testable on a 60Hz
 *  machine. Ignored in production builds. */
function forcedHz(): number | null {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'production') return null;
  if (typeof window === 'undefined') return null;
  const v = Number(new URLSearchParams(window.location.search).get('hz'));
  return Number.isFinite(v) && v > 0 ? v : null;
}

export default function QualityGovernor() {
  const setQuality = useScene((s) => s.setQuality);
  const setDisplayHz = useScene((s) => s.setDisplayHz);
  const setPacing = useScene((s) => s.setPacing);
  const invalidate = useThree((s) => s.invalidate);
  const setFrameloop = useThree((s) => s.setFrameloop);
  // 0 until the estimate lands; the flip from 0 → measured is what starts the paced loop.
  const displayHz = useScene((s) => s.displayHz);

  const started = useRef(0);
  const samples = useRef<number[]>([]);
  const decided = useRef(false);
  const targetFps = useRef(EVEN_TARGET);
  const fps = useRef(0);
  const belowFor = useRef(0);
  const aboveFor = useRef(0);
  const downgrades = useRef(0);
  const promotions = useRef(0);
  const pacedRef = useRef(false);

  // Paced driver for the even-60 lock: R3F is switched to on-demand and we ask for one
  // frame per 1/60s slot. Frames are still real frames (same delta-driven easing), we
  // simply stop asking for the ones the design does not need.
  useEffect(() => {
    if (!displayHz || !pacedRef.current) return;
    // Switch to on-demand HERE, in the same tick that starts the driver, so there is
    // never a window where the loop is off and nothing is asking for frames.
    setFrameloop('demand');
    let raf = 0;
    let last = 0;
    const period = 1000 / EVEN_TARGET;
    const tick = (ts: number) => {
      raf = requestAnimationFrame(tick);
      if (ts - last >= period - 1) {
        last = ts;
        invalidate();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); setFrameloop('always'); };
  }, [invalidate, setFrameloop, displayHz]);

  useFrame((_, delta) => {
    const now = performance.now() / 1000;
    if (!started.current) { started.current = now; return; }
    const dt = Math.max(1e-4, delta);

    // --- refresh-rate estimate ---------------------------------------------------------
    if (!decided.current) {
      samples.current.push(dt);
      if (samples.current.length >= SAMPLE_TARGET) {
        const sorted = [...samples.current].sort((a, b) => a - b);
        // 10th percentile: the fastest honest frames. Load lengthens frames, never
        // shortens them, so the low tail is the closest thing to the display period.
        const p10 = sorted[Math.floor(sorted.length * 0.1)];
        const measured = forcedHz() ?? snapRate(1 / p10);
        const pacing = measured >= SMOOTH_HZ_MIN ? 'smooth' : 'even';
        targetFps.current = pacing === 'smooth' ? measured : EVEN_TARGET;
        decided.current = true;
        samples.current.length = 0;
        setDisplayHz(measured);
        setPacing(pacing);
        // Only engage the paced loop where it actually buys something: a panel faster
        // than 60 but below the smooth threshold, whose uncapped cadence is uneven.
        if (pacing === 'even' && measured > EVEN_TARGET + 6) pacedRef.current = true;
      }
      return;
    }

    // --- steady-state tier governance --------------------------------------------------
    if (now - started.current < WARMUP_S) return;
    fps.current = fps.current ? fps.current * 0.9 + (1 / dt) * 0.1 : 1 / dt;

    const q: Quality = useScene.getState().quality;
    const target = targetFps.current;

    // Demotion: unchanged, and judged on the smoothed rate.
    if (fps.current < target * DOWN_RATIO) belowFor.current += dt;
    else belowFor.current = 0;

    // Promotion: near the ceiling, sustained, AND with no long frame in the window. A mean
    // hides a stutter - a run that averages fine while dropping one frame in forty is
    // exactly the machine that must not be promoted, and only the stall test sees it.
    if (dt * 1000 > (1000 / target) * UP_STALL_X) aboveFor.current = 0;
    else if (fps.current > target * UP_RATIO) aboveFor.current += dt;
    else aboveFor.current = 0;

    governorState.tier = q;
    governorState.hold = aboveFor.current;
    governorState.need = UP_HOLD_S;
    governorState.target = target;
    governorState.promotions = promotions.current;

    if (q === 'high' && belowFor.current > DOWN_HOLD_S && downgrades.current < MAX_DOWNGRADES) {
      downgrades.current += 1;
      belowFor.current = 0;
      // A demotion after a promotion is the real test coming back negative: latch.
      promotions.current = MAX_PROMOTIONS;
      setQuality('low');
    } else if (q === 'low' && aboveFor.current > UP_HOLD_S && promotions.current < MAX_PROMOTIONS) {
      promotions.current += 1;
      aboveFor.current = 0;
      setQuality('high');
    }
  });

  return null;
}
