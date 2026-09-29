'use client';
import { useEffect, useState } from 'react';
import { useScene } from '@/lib/sceneStore';
import { TOUR_SECTIONS } from '@/lib/sections';
import { useI18n } from '@/lib/i18n';
import { overviewElevDeg } from './CameraRig';
import { orrPxPerStop } from '@/lib/orrery';
import { recenterTilt } from '@/lib/tilt';

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
// Mobile carousel gesture (GPT review, 2026-09-28): a drag is recognised after 8px when it is
// clearly horizontal; the star follows the finger 1:1, as far as the finger goes; release lands on
// the stop nearest where the fling would coast to (at least one stop past 22% of a stop or on a
// flick, so a fast flick crosses several); the two ends resist over at most 24px, no wrap.
const TOUR_THRESHOLD = 8;
const TOUR_H_RATIO = 1.25;
const TOUR_COMMIT = 0.22;         // stops
const TOUR_FLICK_V = 0.45;        // px/ms, measured over the last 80ms
const TOUR_FLICK_MIN = 12;        // px of total travel before a flick counts
const TOUR_OVERSCROLL = 24;       // px
const TOUR_COAST = 0.18;          // s of release velocity added before picking the stop
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
    // since then, in stop-units. The shown position is tourRaw itself except past either
    // end, where it is resisted.
    let tourAnchor = 0, tourRaw = 0, tourPx = 300;
    let tourSamples: { t: number; x: number }[] = [];

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
      // Mobile orrery: the centred star's label sits right under it, so a swipe that starts on
      // it must still move the carousel (its click is skipped via dragMoved).
      const tgt = e.target as HTMLElement | null;
      const onCanvas = tgt?.tagName === 'CANVAS' || (isTour() && !!tgt?.closest('[data-planet-label]'));
      if (!onCanvas || !canDrag()) return;
      stopInertia();
      active = true; dragging = false; horiz = null;
      startX = lastX = e.clientX; startY = lastY = e.clientY; lastT = performance.now();
      vYaw = vPitch = 0;
      tourAnchor = useScene.getState().tourStop; tourRaw = 0;
      tourPx = orrPxPerStop(tourAnchor, window.innerWidth, window.innerHeight) || 300;
      tourSamples = [{ t: performance.now(), x: e.clientX }];
      setCursor('grabbing');
    };
    const onMove = (e: PointerEvent) => {
      if (!active) return;
      const totX = e.clientX - startX, totY = e.clientY - startY;
      if (!dragging) {
        const tour = isTour() && e.pointerType === 'touch';
        if (Math.hypot(totX, totY) <= (tour ? TOUR_THRESHOLD : THRESHOLD)) return;
        // Touch: lock to the dominant axis — horizontal rotates, vertical is left to
        // the page (dive scroll). The carousel wants a clearly horizontal start.
        horiz = e.pointerType === 'touch' ? Math.abs(totX) > Math.abs(totY) * (tour ? TOUR_H_RATIO : 1) : true;
        if (!horiz) { active = false; setCursor(canDrag() ? 'grab' : ''); return; }
        dragging = true;
        useScene.getState().setDragMoved(true);
        setHint(false);
        try { localStorage.setItem('seen-drag-hint', '1'); } catch { /* private mode */ }
      }
      if (!canDrag()) return;
      // Mobile orrery: the star under the finger follows it 1:1 in screen space (pixels are
      // turned into carousel position by the fixed camera's own projection), across as many
      // stops as the finger travels; past the first/last stop it gives at most TOUR_OVERSCROLL px.
      if (isTour()) {
        const s = useScene.getState();
        const now = performance.now();
        const N = TOUR_SECTIONS.length;
        // Incremental, with the px-per-stop of the grabbed star where it is NOW - perspective
        // changes it as the star leaves the centre, and 1:1 must hold across several stops.
        const px = orrPxPerStop(tourAnchor, window.innerWidth, window.innerHeight, tourAnchor + tourRaw) || tourPx;
        tourRaw -= (e.clientX - lastX) / px;
        let pos = tourAnchor + tourRaw;
        const over = pos < 0 ? pos : pos > N - 1 ? pos - (N - 1) : 0;
        if (over) {
          const px = Math.abs(over) * tourPx;
          pos -= over - Math.sign(over) * (TOUR_OVERSCROLL * (1 - Math.exp(-px / TOUR_OVERSCROLL))) / tourPx;
        }
        tourSamples.push({ t: now, x: e.clientX });
        while (tourSamples.length > 2 && now - tourSamples[0].t > 80) tourSamples.shift();
        const dtS = Math.max(0.001, (now - lastT) / 1000);
        vTour = -(e.clientX - lastX) / tourPx / dtS;
        s.setTourDrag(true);
        s.setTourPos(pos);
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
        // Release: the stop nearest where the release speed would coast to; past TOUR_COMMIT of
        // a stop, or on a flick (speed over the last 80ms), at least one stop in the drag's
        // direction; otherwise spring back. Never past either end.
        const s = useScene.getState();
        const N = TOUR_SECTIONS.length;
        const first = tourSamples[0], last = tourSamples[tourSamples.length - 1];
        const flickV = first && last && last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0; // px/ms
        const flick = Math.abs(flickV) >= TOUR_FLICK_V && Math.abs(tourRaw) * tourPx >= TOUR_FLICK_MIN;
        const dir = Math.abs(tourRaw) >= TOUR_COMMIT ? Math.sign(tourRaw) : flick ? -Math.sign(flickV) : 0;
        const coast = flick ? (-flickV * 1000 / tourPx) * TOUR_COAST : 0; // stops
        let stop = Math.round(tourAnchor + tourRaw + coast);
        if (dir && Math.sign(stop - tourAnchor) !== dir) stop = tourAnchor + dir;
        stop = Math.max(0, Math.min(N - 1, stop));
        s.setTourVel(vTour);
        s.setTourStop(stop);
        s.setTourDrag(false);
        if (stop !== tourAnchor) recenterTilt(); // new planet frames straight, not tilted
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
