'use client';
import { useEffect, useState } from 'react';
import { useScene } from '@/lib/sceneStore';
import { TOUR_SECTIONS } from '@/lib/sections';
import { useI18n } from '@/lib/i18n';
import { overviewElevDeg } from './CameraRig';

/**
 * Drag-to-rotate (T6). A pointer layer that writes a yaw/pitch OFFSET into the store;
 * CameraRig applies it on top of the WELCOME_IDLE / SOLAR_OVERVIEW pose (so the rig is
 * still the sole camera owner — no OrbitControls). Active only in those two modes; a
 * <5px pointer sequence stays a click (planet navigation), a longer one rotates and
 * suppresses the click. Release coasts with damped inertia. Yaw is free - a full 360 round
 * the sun - and pitch runs from 80 deg above the planets' plane to 45 deg below it (Elad,
 * 2026-09-28), both about the ecliptic's normal. Mobile: the canvas has `touch-action: pan-y`, so vertical drags stay page
 * scroll (which drives the dive) and only horizontal drags rotate. No auto-recenter.
 */
// T6.1: 0.2°/px — a full-width (~300px) drag yaws ≤60°, so a moderate swing brings an
// off-frame planet back in without the system flying past into empty space.
const YAW_SENS = (0.2 * Math.PI) / 180;   // rad per px (≈0.00349)
const PITCH_SENS = 0.003;
// Limits in elevation above the ecliptic plane. 80 stops short of straight down the pole,
// where the plane-normal "up" would spin the frame with every degree of yaw.
const ELEV_MAX = 80;
const ELEV_MIN = -45;
const PLANE_TILT_DEG = (0.42 * 180) / Math.PI; // SolarAct's solarRoot rotation.x
const THRESHOLD = 5;      // px - separates a rotate-drag from a navigating tap
// Positive pitch LOWERS the camera (CameraRig.applyOrbit), so the rest elevation sets both ends.
const clampPitch = (p: number) => {
  const rest = overviewElevDeg(window.innerWidth / window.innerHeight) + PLANE_TILT_DEG;
  return Math.max(((rest - ELEV_MAX) * Math.PI) / 180, Math.min(((rest - ELEV_MIN) * Math.PI) / 180, p));
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

    let active = false, dragging = false;
    let startX = 0, startY = 0, lastX = 0, lastY = 0, lastT = 0;
    let vYaw = 0, vPitch = 0, vTour = 0;
    let horiz: boolean | null = null; // touch axis lock
    let raf = 0;
    // Tour detent: the stop the drag started from, and the RAW (unresisted) displacement
    // since then, in stop-units. displayPos is a resisted function of tourRaw, never the
    // raw finger delta itself, so the carousel never shows a position past the neighbouring
    // stop while dragging.
    let tourAnchor = 0, tourRaw = 0;

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
        s.setOrbit(s.orbitYaw + vYaw * dt, clampPitch(s.orbitPitch + vPitch * dt));
        raf = Math.abs(vYaw) > 0.03 || Math.abs(vPitch) > 0.03 ? requestAnimationFrame(step) : 0;
      };
      raf = requestAnimationFrame(step);
    };

    const onDown = (e: PointerEvent) => {
      useScene.getState().setDragMoved(false);
      if ((e.target as HTMLElement)?.tagName !== 'CANVAS' || !canDrag()) return;
      stopInertia();
      active = true; dragging = false; horiz = null;
      startX = lastX = e.clientX; startY = lastY = e.clientY; lastT = performance.now();
      vYaw = vPitch = 0;
      tourAnchor = useScene.getState().tourStop; tourRaw = 0;
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
      // Mobile orrery: detent scroll, not freeform. A full-screen swipe is one stop of RAW
      // displacement, but the carousel only ever shows a resisted (eased, clamped) fraction
      // of it - the finger can drag past a stop, the carousel never visibly does. onUp turns
      // that raw displacement into a snap: past 40% of a stop, advance; short of it, spring
      // back to the stop the drag started from.
      if (isTour()) {
        const s = useScene.getState();
        const now = performance.now();
        const dPos = -(e.clientX - lastX) / window.innerWidth;
        const N = TOUR_SECTIONS.length;
        tourRaw += dPos;
        const clamped = Math.max(-1, Math.min(1, tourRaw));
        // easeOutCubic, sign-preserving: fast near zero, flattens toward +-1 stop.
        const eased = Math.sign(clamped) * (1 - Math.pow(1 - Math.abs(clamped), 3));
        const raw = tourAnchor + eased;
        const next = ((raw % N) + N) % N;
        vTour = dPos / Math.max(0.001, (now - lastT) / 1000);
        s.setTourDrag(true);
        s.setTourPos(next);
        lastX = e.clientX; lastY = e.clientY; lastT = now;
        return;
      }
      const now = performance.now();
      const dt = Math.max(0.001, (now - lastT) / 1000);
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      const s = useScene.getState();
      const nextYaw = s.orbitYaw - dx * YAW_SENS; // drag → the system follows the pointer
      const nextPitch = clampPitch(s.orbitPitch - dy * PITCH_SENS);
      s.setOrbit(nextYaw, nextPitch);
      vYaw = (-dx * YAW_SENS) / dt;
      vPitch = (nextPitch - s.orbitPitch) / dt;
      lastX = e.clientX; lastY = e.clientY; lastT = now;
    };
    const onUp = () => {
      if (dragging && useScene.getState().tourDrag) {
        // Detent release: past 40% of a stop, advance to the neighbour; short of it, spring
        // back to the stop the drag started from. Displacement only - the eased on-screen
        // position during the drag already absorbed the fling feel.
        const s = useScene.getState();
        const N = TOUR_SECTIONS.length;
        const clamped = Math.max(-1, Math.min(1, tourRaw));
        const advance = Math.abs(clamped) > 0.4 ? Math.sign(clamped) : 0;
        const stop = (((tourAnchor + advance) % N) + N) % N;
        s.setTourVel(vTour);
        s.setTourStop(stop);
        s.setTourDrag(false);
      }
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
