'use client';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useScene } from '@/lib/sceneStore';

/**
 * Cost control that never touches composition.
 *
 * The TIER COMPOSITION LAW applies to everything in this file: buffer size, pixel ratio
 * and how often we ask for a frame are cost. Camera framing, poses, easing and what is in
 * the scene are identical on every tier and in every state here.
 *
 * Two owners, one activity signal:
 *
 *  - {@link FramePacer} owns the frameloop. Idle pages drop to 30fps.
 *  - {@link ResolutionScaler} owns the pixel ratio. It scales the render buffer down to
 *    hold the target rate and returns to full when there is headroom or the page is idle.
 *
 * Both used to be partly drei's job (`AdaptiveDpr`) or the governor's (its paced loop).
 * Two components setting `dpr`, or two setting `frameloop`, is how a scene ends up
 * oscillating; each of these is now the only writer of its own knob.
 */

// --- the activity signal ------------------------------------------------------------------
// Input, not store writes: CameraRig writes `coverage` every frame, so subscribing to the
// store would mean the scene was never idle. Transition state is read imperatively below.
const IDLE_AFTER_MS = 2500;
const IDLE_FPS = 30;
const EVEN_FPS = 60;

let lastInput = 0;

function useActivityListeners() {
  useEffect(() => {
    lastInput = performance.now();
    const mark = () => { lastInput = performance.now(); };
    const events = ['pointermove', 'pointerdown', 'wheel', 'scroll', 'keydown', 'touchstart', 'touchmove'] as const;
    for (const e of events) window.addEventListener(e, mark, { passive: true });
    // Coming back to the tab is activity: the first frame after a long hidden stretch
    // should be a full one, not a throttled one.
    document.addEventListener('visibilitychange', mark);
    return () => {
      for (const e of events) window.removeEventListener(e, mark);
      document.removeEventListener('visibilitychange', mark);
    };
  }, []);
}

/**
 * Idle = no input recently AND nothing is animating itself.
 *
 * Exported because the quality governor MUST NOT judge a throttled frame. It measures
 * fps from the frame delta, and an idle page deliberately delivering 30fps looks exactly
 * like a machine failing to hold 60 — which demoted the tier on a perfectly capable
 * machine within seconds of the page settling. The idle throttle and the tier decision
 * have to agree on when the clock is running.
 */
export function isIdle(now: number) {
  if (now - lastInput < IDLE_AFTER_MS) return false;
  const s = useScene.getState();
  // A flight between worlds has no pointer motion but is the most cinematic moment in the
  // piece; throttling it would be the one place 30fps is obvious.
  if (!s.sceneReady) return false;
  return s.coverage <= 0.001 && s.departure <= 0.001;
}

/**
 * The frameloop. R3F runs `always` by default: every vsync, forever, whether or not
 * anything changed. A page left open on the overview costs a full frame budget for
 * ambient drift alone, which is where the idle throttle pays.
 *
 * Also absorbs the paced-60 lock the governor used to drive, so the frameloop has exactly
 * one owner. On a 75/90Hz panel an uncapped scene produces a repeating long/short frame
 * pattern that reads as micro-stutter even at a "good" average.
 */
export function FramePacer() {
  useActivityListeners();
  const invalidate = useThree((s) => s.invalidate);
  const setFrameloop = useThree((s) => s.setFrameloop);
  const pacing = useScene((s) => s.pacing);
  const displayHz = useScene((s) => s.displayHz);

  useEffect(() => {
    if (!displayHz) return; // nothing measured yet - leave the loop alone
    // A pace is only worth driving where it buys something: a panel between 60 and the
    // smooth threshold, whose uncapped cadence is uneven. A 60Hz display already paces
    // itself, so there the driver only ever engages when the page goes idle.
    const pacedWhenActive = pacing === 'even' && displayHz > EVEN_FPS + 6;

    let raf = 0;
    let last = 0;
    let demand = false;

    const setLoop = (wantDemand: boolean) => {
      if (wantDemand === demand) return;
      demand = wantDemand;
      setFrameloop(wantDemand ? 'demand' : 'always');
      if (wantDemand) invalidate(); // never leave a frame un-asked-for in the swap tick
    };

    const tick = (ts: number) => {
      raf = requestAnimationFrame(tick);
      const idle = isIdle(ts);
      const wantDemand = idle || pacedWhenActive;
      setLoop(wantDemand);
      if (!wantDemand) return;
      const period = 1000 / (idle ? IDLE_FPS : EVEN_FPS);
      if (ts - last >= period - 1) {
        last = ts;
        invalidate();
      }
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      setFrameloop('always');
    };
  }, [invalidate, setFrameloop, pacing, displayHz]);

  return null;
}

// --- dynamic resolution -------------------------------------------------------------------
// 0.85, not 0.6. The floor was 0.6 and the scaler sat on it across every cosmic route
// while the frame rate did not move: this scene is pass-bound, not fill-bound, so the
// pixels were being spent for nothing. Sharpness is not a currency to spend for zero
// return (owner ruling). The mechanism stays for a genuinely fill-bound machine — a dense
// display on the high tier, where the base ratio is 1.5 — but it can no longer blur the
// scene into softness chasing frames it will not get back.
const MIN_SCALE = 0.85;
const MAX_SCALE = 1;
const STEP_DOWN = 0.1;
const STEP_UP = 0.05;
const EVAL_MS = 1000;      // one decision per second - a buffer resize is not free
const WARMUP_MS = 4000;    // same reason as the governor's grace: compiles are not steady state
const LOW_RATIO = 0.85;    // below this share of target = scale down
const HIGH_RATIO = 0.95;   // above this share = room to scale back up

/**
 * Dynamic resolution scaling — the largest win available that is invisible at rest.
 *
 * Frame time is measured for a second at a time; the render buffer is scaled between 1.0
 * and 0.6 of the base pixel ratio to hold the target rate, and returns to full whenever
 * there is headroom or the page goes idle. What a visitor perceives is a stable frame
 * rate; what they do not perceive is which buffer size produced it.
 *
 * The BASE ratio is where the tier shows up: capped at 1.0 outside the high tier. On a
 * mid laptop with a dense display, 1.5 → 1.0 is a 2.25× cut in fragments before a single
 * shader is touched, and it is the cheapest large win on exactly the machines that need it.
 */
export function ResolutionScaler() {
  const setDpr = useThree((s) => s.setDpr);
  const quality = useScene((s) => s.quality);
  const pacing = useScene((s) => s.pacing);
  const displayHz = useScene((s) => s.displayHz);

  const scale = useRef(MAX_SCALE);
  const applied = useRef(0);
  const frames = useRef(0);
  const elapsed = useRef(0);
  const since = useRef(0);

  // PERF-2: the high-tier ceiling comes down 1.5 -> 1.25. A dense display still gets more
  // pixels than the low tier, but 1.5 was 2.25x the fragments of 1.0 and it was being
  // handed to every machine that started high — which, before the inversion, was all of
  // them. 1.25 is 1.56x: still visibly crisper, materially cheaper.
  const base =
    quality === 'high'
      ? Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, 1.25)
      : 1;

  const apply = (next: number) => {
    const dpr = +(base * next).toFixed(3);
    if (Math.abs(dpr - applied.current) < 0.01) return;
    applied.current = dpr;
    setDpr(dpr);
  };

  /**
   * Verification handle, deliberately present in PRODUCTION builds too — unlike the debug
   * HUD, which is stripped. The tier a machine ends up on, and whether the scaler is
   * holding the rate, are only meaningful when measured on the real deployment on a real
   * machine; a screenshot cannot show either. Read-only diagnostics, no secrets.
   */
  const publish = (fps: number, idle: boolean) => {
    if (typeof window === 'undefined') return;
    (window as unknown as Record<string, unknown>).__perf = {
      quality,
      pacing,
      displayHz,
      fps: +fps.toFixed(1),
      dpr: applied.current,
      scale: scale.current,
      base,
      idle,
    };
  };

  useEffect(() => { apply(scale.current); /* re-apply when the tier changes the base */ },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base]);

  useFrame((_, delta) => {
    const now = performance.now();
    if (!since.current) { since.current = now; return; }
    if (now - since.current < WARMUP_MS) return;

    frames.current += 1;
    elapsed.current += delta;
    if (elapsed.current * 1000 < EVAL_MS) return;

    const fps = frames.current / elapsed.current;
    frames.current = 0;
    elapsed.current = 0;

    // Idle pages are cheap by definition and get their pixels back.
    const idle = isIdle(now);
    if (idle) {
      if (scale.current !== MAX_SCALE) { scale.current = MAX_SCALE; apply(MAX_SCALE); }
      publish(fps, true);
      return;
    }

    const target = pacing === 'smooth' && displayHz ? displayHz : EVEN_FPS;
    if (fps < target * LOW_RATIO && scale.current > MIN_SCALE) {
      scale.current = Math.max(MIN_SCALE, +(scale.current - STEP_DOWN).toFixed(2));
      apply(scale.current);
    } else if (fps > target * HIGH_RATIO && scale.current < MAX_SCALE) {
      scale.current = Math.min(MAX_SCALE, +(scale.current + STEP_UP).toFixed(2));
      apply(scale.current);
    }
    publish(fps, false);
  });

  return null;
}
