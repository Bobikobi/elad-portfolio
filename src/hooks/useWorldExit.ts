'use client';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { useScene } from '@/lib/sceneStore';
import { homePath } from '@/lib/sections';
import type { Locale } from '@/lib/translations';

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

// Departure gesture tuning (shared by every world so the gesture means the same thing
// everywhere — the Projects world used to be the only one that answered a scroll).
const THRESH = 180; // px accumulated outside the content column to commit the return flight
const DECAY_PER_S = THRESH / 0.8; // the meter fully decays in ~0.8s once input stops

/**
 * The one way out of a planet world, shared by every world route (R5.1 + R5.10).
 *
 * Three exits, all equivalent:
 *   • Escape — always, from anywhere on the page.
 *   • Scrolling OUTSIDE the content column (over the planet / open space) — builds a
 *     departure meter that scrubs the camera back toward the overview and, at full,
 *     commits the return flight. Scrolling INSIDE the column stays content scroll.
 *   • The visible back control the caller renders, via the returned `returnHome`.
 *
 * Before this hook only the Projects world answered a scroll, so on the other four
 * worlds the wheel simply did nothing over three quarters of the viewport — the "some
 * positions don't respond" report. `meter` (0..1) is React state for the small progress
 * indicator ONLY; the camera is scrubbed through the scene store, never through React.
 */
export function useWorldExit(locale: Locale, contentRef: RefObject<HTMLElement | null>) {
  const router = useRouter();
  const setDeparture = useScene((s) => s.setDeparture);
  const [meter, setMeter] = useState(0);
  const returningRef = useRef(false);

  const returnHome = useCallback(() => {
    if (returningRef.current) return;
    returningRef.current = true;
    // Mark the intro as seen so home lands in the solar overview rather than replaying
    // the whole dive — the URL is the source of truth, CosmicStage clears the focus and
    // the camera flies back.
    try { sessionStorage.setItem('seen-intro', '1'); } catch { /* private mode */ }
    setDeparture(0);
    router.push(homePath(locale));
  }, [locale, router, setDeparture]);

  // Reset the meter on mount/unmount so a stale value never scrubs the next world.
  useEffect(() => {
    setDeparture(0);
    return () => setDeparture(0);
  }, [setDeparture]);

  useEffect(() => {
    // A departure gesture is one made over the SCENE — the planet or open space. Because
    // the world chrome is pointer-events-none except for its own panel, "over the scene"
    // is exactly "the event target is the canvas". Testing that directly (rather than
    // "not inside the content column") is what keeps the gesture from swallowing scroll
    // inside the other floating islands — the chat panel and the accessibility widget
    // both live outside the content column and were previously unscrollable here.
    const overScene = (target: EventTarget | null) =>
      target instanceof Element && target.tagName === 'CANVAS';
    const inContent = (target: EventTarget | null) =>
      !!(target instanceof Node && contentRef.current?.contains(target));
    let acc = 0;
    let last = 0;
    let decayRaf = 0;
    let prevTs = 0;

    const apply = () => {
      const v = clamp(acc / THRESH, 0, 1);
      setDeparture(v);
      setMeter(v);
      if (acc >= THRESH) returnHome();
    };
    const decay = (ts: number) => {
      const dt = prevTs ? (ts - prevTs) / 1000 : 0;
      prevTs = ts;
      if (performance.now() - last > 60) {
        acc = Math.max(0, acc - DECAY_PER_S * dt);
        apply();
      }
      if (acc > 0 && !returningRef.current) decayRaf = requestAnimationFrame(decay);
      else { decayRaf = 0; prevTs = 0; }
    };
    const bump = (amount: number) => {
      acc = Math.min(THRESH * 1.1, acc + amount);
      last = performance.now();
      apply();
      if (!decayRaf && !returningRef.current) { prevTs = 0; decayRaf = requestAnimationFrame(decay); }
    };

    const onWheel = (e: WheelEvent) => {
      if (returningRef.current) return;
      if (inContent(e.target) || !overScene(e.target)) return; // native scroll wins
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      bump(Math.abs(e.deltaY) * unit);
    };

    let touchY = 0;
    let touchOnScene = false;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? 0;
      touchOnScene = overScene(e.target) && !inContent(e.target);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!touchOnScene || returningRef.current) return;
      const y = e.touches[0]?.clientY ?? 0;
      const dy = touchY - y;
      touchY = y;
      e.preventDefault();
      bump(Math.abs(dy));
    };

    // R5.10 — Escape always leaves the world. Ignored while a text field has focus (the
    // contact form lives inside a world) so Esc there means "dismiss my input" first.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Escape is a "dismiss the innermost thing" key: a modal (the mobile nav drawer)
      // and a focused text field (the contact form, the chat box) both outrank the world.
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) {
        el?.blur();
        return;
      }
      returnHome();
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(decayRaf);
    };
  }, [contentRef, returnHome, setDeparture]);

  return { meter, returnHome };
}
