'use client';
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useScene, type Quality } from '@/lib/sceneStore';
import { isIdle } from './PerfPacer';

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
 *  4. HYSTERESIS. A downgrade needs a sustained shortfall; a promotion needs sustained
 *     REAL headroom (see {@link UP_RATIO}); and one demotion latches the tier low for the
 *     rest of the session, so a borderline machine cannot oscillate.
 *
 * PERF-2 — THE DEFAULT IS LOW, AND PROMOTION IS THE MECHANISM.
 *
 * This used to start every visitor on the high tier and demote on evidence, which meant an
 * integrated-GPU desktop was handed a profile built for a gaming GPU and stuttered its way
 * through the first seconds — while a phone, correctly classified low, ran fine. The defect
 * was never the cost of the high tier; it was who got assigned to it.
 *
 * So the burden of proof is inverted. Everyone starts cheap. A machine is promoted only
 * after it has held sustained headroom AT the cheap cost, which is the only evidence that
 * means anything about what it can afford. A promotion nobody notices is a much better
 * failure mode than a stutter everybody does.
 *
 * TIER COMPOSITION LAW: the governor only ever writes `quality` (particle counts, God
 * Rays samples, hi-res texture tier) and the frame pacing. Camera framing, poses, easing
 * and the act machine are untouched — composition is identical on every tier.
 */

const WARMUP_S = 3.5;          // no judging while shaders compile / textures upload
const SAMPLE_TARGET = 96;      // frame deltas collected for the refresh-rate estimate
// ...but never wait longer than this for them. Measured on the branch alias under a 4x CPU
// throttle: the scene delivered 7-12fps, so 96 samples would have taken 8-14 SECONDS, and
// until the estimate lands the governor returns early and governs nothing at all. The
// machines that most need a demotion were the ones guaranteed not to get one.
const DECIDE_BY_S = 4;
// When the deadline fires with a starved sample set, assume the ordinary display rather
// than trusting the estimate. A struggling machine's FASTEST frames are still slow, so the
// estimate would come back "30Hz display" — and a 30fps target is one a stuttering machine
// meets, which is exactly how a governor talks itself out of ever demoting.
const ASSUMED_HZ = 60;
const DOWN_RATIO = 0.62;       // below this share of target fps = struggling
// PERF-2 raised this from 0.86. Promotion is now THE mechanism rather than a rarely-taken
// path, so the bar is what a machine with genuine headroom clears and a borderline one does
// not: at a 60fps target, sustained 55fps+. The machines this defect is about sit at 40-55
// and stay exactly where they are.
const UP_RATIO = 0.92;         // above this share = real headroom, not "coping"
const DOWN_HOLD_S = 1.2;       // sustained shortfall before a downgrade
// Shortened from 6s. The promotion changes particle counts, so it is visible; landing it
// early, while a visitor is still orienting in the scene, is much less noticeable than
// six seconds in. Still long enough that a burst of easy frames cannot trigger it.
const UP_HOLD_S = 3;
// A promotion this late is a surprise, not an improvement: a machine that has not proven
// headroom in the first half-minute is not about to, and changing the sky under someone
// who has settled in is worse than leaving it alone.
const PROMOTE_WINDOW_S = 25;
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

/**
 * `?tier=low` pins the quality tier. Ignored in production builds, like `?hz`.
 *
 * Without this a low-tier decision cannot be inspected on purpose: the tier is whatever
 * the governor concluded about the machine that happened to be looking, so "does the low
 * tier still look right" was a question nobody could answer with a screenshot. Judging a
 * cost knob by eye requires being able to hold the tier still.
 */
/**
 * `?fpsTarget=20` lowers the bar the governor judges against. Ignored in production.
 *
 * The promotion path is now THE mechanism, and it can only be observed on a machine with
 * headroom — which this development box is not: it renders the cosmic home at a steady
 * 30fps against a 60 target, so it correctly never promotes and the path stays unproven.
 * "Correctly never fires" and "cannot fire" produce identical evidence, and that ambiguity
 * is exactly how a knob silently stops being wired. Lowering the target turns any machine
 * into a machine with headroom for one run.
 */
function forcedTarget(): number | null {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'production') return null;
  if (typeof window === 'undefined') return null;
  const v = Number(new URLSearchParams(window.location.search).get('fpsTarget'));
  return Number.isFinite(v) && v > 0 ? v : null;
}

function forcedTier(): Quality | null {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'production') return null;
  if (typeof window === 'undefined') return null;
  const v = new URLSearchParams(window.location.search).get('tier');
  return v === 'low' || v === 'high' ? v : null;
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
  const latchedLow = useRef(false);
  const pinned = useRef<Quality | null>(null);

  useEffect(() => {
    const t = forcedTier();
    pinned.current = t;
    if (t) setQuality(t);
  }, [setQuality]);

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
      const enough = samples.current.length >= SAMPLE_TARGET;
      const tooLong = now - started.current > DECIDE_BY_S;
      if (enough || tooLong) {
        const sorted = [...samples.current].sort((a, b) => a - b);
        // 10th percentile: the fastest honest frames. Load lengthens frames, never
        // shortens them, so the low tail is the closest thing to the display period.
        const p10 = sorted[Math.floor(sorted.length * 0.1)];
        const measured = forcedHz() ?? (enough ? snapRate(1 / p10) : ASSUMED_HZ);
        const pacing = measured >= SMOOTH_HZ_MIN ? 'smooth' : 'even';
        targetFps.current = forcedTarget() ?? (pacing === 'smooth' ? measured : EVEN_TARGET);
        decided.current = true;
        samples.current.length = 0;
        setDisplayHz(measured);
        setPacing(pacing);
      }
      return;
    }

    // --- steady-state tier governance --------------------------------------------------
    if (now - started.current < WARMUP_S) return;
    // An idle page is being paced to 30fps on purpose. Measuring it here reads as a
    // machine that cannot hold the target and demotes the tier for a scene nobody was
    // even interacting with — measured on the branch alias, where six of eight cosmic
    // routes came back `low` purely because they had been left alone for 2.5 seconds.
    // Frames only count while the loop is running free.
    if (isIdle(performance.now())) { belowFor.current = 0; aboveFor.current = 0; return; }
    fps.current = fps.current ? fps.current * 0.9 + (1 / dt) * 0.1 : 1 / dt;

    if (pinned.current) return; // an explicitly pinned tier is not up for renegotiation
    const q: Quality = useScene.getState().quality;
    const target = targetFps.current;
    if (fps.current < target * DOWN_RATIO) { belowFor.current += dt; aboveFor.current = 0; }
    else if (fps.current > target * UP_RATIO) { aboveFor.current += dt; belowFor.current = 0; }
    else { belowFor.current = 0; aboveFor.current = 0; }

    if (q === 'high' && belowFor.current > DOWN_HOLD_S) {
      // One demotion is final. The old code allowed two against a BINARY tier, so the
      // second spent budget and changed nothing — a counter guarding a door that was
      // already shut. What actually matters is that a machine which has proven it cannot
      // hold the high tier is never offered it again, or the two rules take turns and the
      // visitor watches the sky flap.
      latchedLow.current = true;
      belowFor.current = 0;
      setQuality('low');
    } else if (
      q === 'low' &&
      !latchedLow.current &&
      aboveFor.current > UP_HOLD_S &&
      now - started.current < PROMOTE_WINDOW_S
    ) {
      aboveFor.current = 0;
      setQuality('high');
    }
  });

  return null;
}
