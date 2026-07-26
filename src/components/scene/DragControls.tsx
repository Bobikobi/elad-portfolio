'use client';
import { useEffect, useRef, useState } from 'react';
import { useScene } from '@/lib/sceneStore';
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
const YAW_SENS = 0.005;   // rad per px
const PITCH_SENS = 0.003;
const PITCH_CLAMP = (25 * Math.PI) / 180;
const THRESHOLD = 5;      // px — separates a rotate-drag from a navigating tap
const clampPitch = (p: number) => Math.max(-PITCH_CLAMP, Math.min(PITCH_CLAMP, p));

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

    let active = false, dragging = false;
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
        const decay = Math.exp(-dt / 0.12);
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
      const now = performance.now();
      const dt = Math.max(0.001, (now - lastT) / 1000);
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      const s = useScene.getState();
      const nextYaw = s.orbitYaw - dx * YAW_SENS;      // drag → the system follows the pointer
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
      clearInterval(hintPoll);
      clearTimeout(hintTimer);
    };
  }, []);

  if (!hint) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-10 flex justify-center transition-opacity duration-700">
      <span className="rounded-full border border-[var(--color-star-white)]/12 bg-[rgba(5,7,20,0.6)] px-4 py-1.5 text-xs tracking-[0.14em] text-[var(--color-star-white)]/70">
        {t('welcome.dragHint')}
      </span>
    </div>
  );
}
