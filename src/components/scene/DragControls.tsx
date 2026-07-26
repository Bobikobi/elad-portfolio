'use client';
import { useEffect, useState } from 'react';
import { useScene } from '@/lib/sceneStore';
import { SECTIONS } from '@/lib/sections';
import { useI18n } from '@/lib/i18n';

/**
 * Drag-to-rotate (T6). A pointer layer that writes a yaw/pitch OFFSET into the store;
 * CameraRig applies it on top of the WELCOME_IDLE / SOLAR_OVERVIEW pose (so the rig is
 * still the sole camera owner — no OrbitControls). Active only in those two modes; a
 * <5px pointer sequence stays a click (planet navigation), a longer one rotates and
 * suppresses the click. Release coasts with damped inertia. Pitch is clamped ±25°, yaw
 * is free. Mobile: the canvas has `touch-action: pan-y`, so vertical drags stay page
 * scroll (which drives the dive) and only horizontal drags rotate. No auto-recenter.
 */
// T6.1: 0.2°/px — a full-width (~300px) drag yaws ≤60°, so a moderate swing brings an
// off-frame planet back in without the system flying past into empty space. Pitch stays
// gentle and hard-clamped ±25°.
const YAW_SENS = (0.2 * Math.PI) / 180;   // rad per px (≈0.00349)
const PITCH_SENS = 0.003;
const PITCH_CLAMP = (25 * Math.PI) / 180;
const THRESHOLD = 5;      // px — separates a rotate-drag from a navigating tap
const SWIPE_THRESHOLD = 45; // px — a horizontal swipe that advances the mobile tour (T7b)
const clampPitch = (p: number) => Math.max(-PITCH_CLAMP, Math.min(PITCH_CLAMP, p));

// Soft yaw comfort-range (T6.1): free within ±COMFORT, then asymptotically eased toward
// a hard MAX so the yaw can never run away — the sun stays framed even on a hard fling.
// Wider than the pitch clamp (the overview reads fine rotated further about Y).
const YAW_COMFORT = (40 * Math.PI) / 180;
const YAW_MAX = (62 * Math.PI) / 180;
const clampYaw = (y: number) => {
  const a = Math.abs(y);
  if (a <= YAW_COMFORT) return y;
  const range = YAW_MAX - YAW_COMFORT;
  const eased = range * (1 - Math.exp(-(a - YAW_COMFORT) / range)); // → range as a→∞
  return Math.sign(y) * (YAW_COMFORT + eased);
};

export default function DragControls() {
  const { t } = useI18n();
  const [hint, setHint] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const canDrag = () => {
      const s = useScene.getState();
      return (s.act === 'galaxy' && s.scrollProgress < 0.015) || (s.act === 'solar' && !s.focusedPlanet);
    };
    const canvasEl = () => document.querySelector('canvas') as HTMLElement | null;
    const setCursor = (c: string) => { const el = canvasEl(); if (el) el.style.cursor = c; };

    // T7b: portrait / coarse-pointer devices run the guided tour (swipe between stops)
    // instead of drag-to-rotate. One media query is the single source of truth, mirrored
    // into the store so CameraRig and the dots agree with the gesture layer.
    const tourMql = window.matchMedia('(orientation: portrait) and (pointer: coarse)');
    const applyTour = () => useScene.getState().setTourMode(tourMql.matches);
    applyTour();
    tourMql.addEventListener('change', applyTour);
    const isTour = () => {
      const s = useScene.getState();
      return s.tourMode && s.act === 'solar' && !s.focusedPlanet;
    };

    let active = false, dragging = false, swiped = false;
    let startX = 0, startY = 0, lastX = 0, lastY = 0, lastT = 0;
    let vYaw = 0, vPitch = 0;
    let horiz: boolean | null = null; // touch axis lock
    let raf = 0;

    const stopInertia = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
    const inertia = () => {
      let last = performance.now();
      const step = () => {
        const now = performance.now();
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        // Subtle inertia: a shorter tau (0.10s) so the coast is a soft settle, not a long glide.
        const decay = Math.exp(-dt / 0.10);
        vYaw *= decay; vPitch *= decay;
        const s = useScene.getState();
        s.setOrbit(clampYaw(s.orbitYaw + vYaw * dt), clampPitch(s.orbitPitch + vPitch * dt));
        raf = Math.abs(vYaw) > 0.03 || Math.abs(vPitch) > 0.03 ? requestAnimationFrame(step) : 0;
      };
      raf = requestAnimationFrame(step);
    };

    const onDown = (e: PointerEvent) => {
      useScene.getState().setDragMoved(false);
      if ((e.target as HTMLElement)?.tagName !== 'CANVAS' || !canDrag()) return;
      stopInertia();
      active = true; dragging = false; swiped = false; horiz = null;
      startX = lastX = e.clientX; startY = lastY = e.clientY; lastT = performance.now();
      vYaw = vPitch = 0;
      setCursor('grabbing');
    };
    const onMove = (e: PointerEvent) => {
      if (!active) return;
      const totX = e.clientX - startX, totY = e.clientY - startY;
      if (!dragging) {
        if (Math.hypot(totX, totY) <= THRESHOLD) return;
        // Touch: lock to the dominant axis — horizontal rotates, vertical is left to
        // the page (dive scroll).
        horiz = e.pointerType === 'touch' ? Math.abs(totX) > Math.abs(totY) : true;
        if (!horiz) { active = false; setCursor(canDrag() ? 'grab' : ''); return; }
        dragging = true;
        useScene.getState().setDragMoved(true);
        setHint(false);
        try { localStorage.setItem('seen-drag-hint', '1'); } catch { /* private mode */ }
      }
      if (!canDrag()) return;
      // T7b: in tour mode a horizontal swipe advances to the next/previous stop (one step
      // per gesture, wrap-around) — never a rotate. Vertical is already page scroll above.
      if (isTour()) {
        if (!swiped && Math.abs(totX) > SWIPE_THRESHOLD) {
          const s = useScene.getState();
          const n = SECTIONS.length;
          const dir = totX < 0 ? 1 : -1; // swipe left → next planet (carousel convention)
          s.setTourStop((((s.tourStop + dir) % n) + n) % n);
          swiped = true;
        }
        return;
      }
      const now = performance.now();
      const dt = Math.max(0.001, (now - lastT) / 1000);
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      const s = useScene.getState();
      const nextYaw = clampYaw(s.orbitYaw - dx * YAW_SENS); // drag → the system follows the pointer
      const nextPitch = clampPitch(s.orbitPitch - dy * PITCH_SENS);
      s.setOrbit(nextYaw, nextPitch);
      vYaw = (-dx * YAW_SENS) / dt;
      vPitch = (nextPitch - s.orbitPitch) / dt;
      lastX = e.clientX; lastY = e.clientY; lastT = now;
    };
    const onUp = () => {
      if (dragging && !reduce && (Math.abs(vYaw) > 0.05 || Math.abs(vPitch) > 0.05)) inertia();
      active = false; dragging = false;
      setCursor(canDrag() ? 'grab' : '');
      setTimeout(() => useScene.getState().setDragMoved(false), 0); // after the R3F click reads it
    };
    const onHover = (e: PointerEvent) => {
      if (!active && (e.target as HTMLElement)?.tagName === 'CANVAS') setCursor(canDrag() ? 'grab' : '');
    };

    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('pointerover', onHover);

    // One-time subtle hint: first time the overview is draggable this browser.
    let hintTimer = 0;
    const hintPoll = window.setInterval(() => {
      let seen = false;
      try { seen = localStorage.getItem('seen-drag-hint') === '1'; } catch { /* ignore */ }
      if (seen) { clearInterval(hintPoll); return; }
      if (useScene.getState().act === 'solar' && !useScene.getState().focusedPlanet) {
        setHint(true);
        clearInterval(hintPoll);
        hintTimer = window.setTimeout(() => setHint(false), 5000);
      }
    }, 800);

    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('pointerover', onHover);
      stopInertia();
      tourMql.removeEventListener('change', applyTour);
      clearInterval(hintPoll);
      clearTimeout(hintTimer);
    };
  }, []);

  if (!hint) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-10 flex justify-center transition-opacity duration-700">
      <span className="rounded-full border border-[var(--color-star-white)]/12 bg-[rgba(5,7,20,0.6)] px-4 py-1.5 text-xs tracking-[0.14em] text-[var(--color-star-white)]/70">
        {t(useScene.getState().tourMode ? 'welcome.swipeHint' : 'welcome.dragHint')}
      </span>
    </div>
  );
}
