'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
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
 *  4. HYSTERESIS. A downgrade needs a sustained shortfall, an upgrade needs a longer
 *     sustained surplus, and after {@link MAX_DOWNGRADES} downgrades the tier is latched
 *     low so a borderline machine cannot oscillate.
 *
 * TIER COMPOSITION LAW: the governor only ever writes `quality` (particle counts, God
 * Rays samples, hi-res texture tier) and the frame pacing. Camera framing, poses, easing
 * and the act machine are untouched — composition is identical on every tier.
 */

const WARMUP_S = 3.5;          // no judging while shaders compile / textures upload
const SAMPLE_TARGET = 96;      // frame deltas collected for the refresh-rate estimate
const DOWN_RATIO = 0.62;       // below this share of target fps = struggling
const UP_RATIO = 0.86;         // above this share = comfortable
const DOWN_HOLD_S = 1.2;       // sustained shortfall before a downgrade
const UP_HOLD_S = 6;           // (longer) sustained surplus before an upgrade
const MAX_DOWNGRADES = 2;      // then latch low
const SMOOTH_HZ_MIN = 100;     // display rates at or above this get the `smooth` profile
const EVEN_TARGET = 60;        // the even-paced lock

/** Real-world refresh rates we snap the estimate to. */
const KNOWN_RATES = [30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 240];

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

  const started = useRef(0);
  const samples = useRef<number[]>([]);
  const decided = useRef(false);
  const targetFps = useRef(EVEN_TARGET);
  const fps = useRef(0);
  const belowFor = useRef(0);
  const aboveFor = useRef(0);
  const downgrades = useRef(0);

  // The paced driver used to live here. It now belongs to FramePacer, which also owns the
  // idle throttle — two components calling setFrameloop is how a scene ends up with a loop
  // that neither of them thinks it turned off. This file governs the TIER and the pacing
  // PROFILE; it no longer touches the loop.

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
      }
      return;
    }

    // --- steady-state tier governance --------------------------------------------------
    if (now - started.current < WARMUP_S) return;
    fps.current = fps.current ? fps.current * 0.9 + (1 / dt) * 0.1 : 1 / dt;

    const q: Quality = useScene.getState().quality;
    const target = targetFps.current;
    if (fps.current < target * DOWN_RATIO) { belowFor.current += dt; aboveFor.current = 0; }
    else if (fps.current > target * UP_RATIO) { aboveFor.current += dt; belowFor.current = 0; }
    else { belowFor.current = 0; aboveFor.current = 0; }

    if (q === 'high' && belowFor.current > DOWN_HOLD_S && downgrades.current < MAX_DOWNGRADES) {
      downgrades.current += 1;
      belowFor.current = 0;
      setQuality('low');
    } else if (q === 'low' && aboveFor.current > UP_HOLD_S && downgrades.current < MAX_DOWNGRADES) {
      aboveFor.current = 0;
      setQuality('high');
    }
  });

  return null;
}
