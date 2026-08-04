'use client';
import { create } from 'zustand';
import type * as THREE from 'three';

export type Act = 'galaxy' | 'solar';
export type Quality = 'high' | 'low';
/** R5.9 — frame-pacing profile, decided once during the loader from the measured
 *  display refresh rate. 'smooth' = a 120Hz-capable display, so we let the scene run at
 *  the display rate; 'even' = lock to an even-paced 60. Pacing is COST ONLY: it changes
 *  how often we draw, never what is drawn (tier composition LAW). */
export type Pacing = 'smooth' | 'even';

interface SceneState {
  act: Act;
  /** 0..1 dive progress across the galaxy act (single source of truth: scrollDriver). */
  scrollProgress: number;
  /** 0..1 mask coverage of the galaxy↔solar swap (T1). Written each frame by CameraRig
   *  from the (damped) dive gate; the atomic act swap may fire ONLY while coverage>0.95,
   *  and the DOM mask overlay reads it for its opacity. Bidirectional: the same envelope
   *  peaks whether diving down or surfacing up, so scroll-up mirrors the dive. */
  coverage: number;
  focusedPlanet: string | null;
  /** Departure gesture progress 0..1 while in ORBIT — scrubs the camera back toward
   *  the overview; 1.0 commits the return flight. Owned by the world's ProjectsStage. */
  departure: number;
  /** Drag-to-rotate offset (T6) — a yaw/pitch the user drags, applied by CameraRig ON
   *  TOP of the WELCOME_IDLE / SOLAR_OVERVIEW pose (never OrbitControls; the rig stays
   *  the sole camera owner). Persists (no auto-recenter); pitch is clamped by the writer. */
  orbitYaw: number;
  orbitPitch: number;
  /** True when the last pointer sequence crossed the drag threshold — the planet click
   *  handler reads it to tell a rotate-drag from a navigating tap. */
  dragMoved: boolean;
  /** T7b: portrait/coarse-pointer devices swap the wide overview + drag-rotate for a
   *  planet-to-planet tour (a brief establishing shot, then framed stops navigated by
   *  horizontal swipe). Set from a matchMedia listener; read by CameraRig each frame and
   *  by the pagination dots. */
  tourMode: boolean;
  /** Current tour stop — an index into SECTIONS (0..4). Persists across the session so a
   *  return to the overview resumes where the tour left off. */
  tourStop: number;
  /** T7c: the tall galaxy→solar dive driver is mounted (a fresh visit), so scroll position
   *  is the authority on which act should be showing. Lets CameraRig reconcile an instant
   *  scroll teleport (End key / scrollbar / scrollTo / restoration) that skipped the
   *  coverage window — WITHOUT swapping a returning visitor who legitimately sits in the
   *  solar overview at scroll 0 (no driver). */
  scrollDriven: boolean;
  quality: Quality;
  /** R5.9 — measured display refresh rate (Hz, median rAF delta during the loader).
   *  0 until measured. */
  displayHz: number;
  /** R5.9 — frame pacing profile derived from `displayHz`. */
  pacing: Pacing;
  /** R5.6 — which DECORATIVE body (mercury/venus/uranus/neptune) the pointer is on.
   *  Set only on hover enter/leave, never per frame; the tooltip's SCREEN position is
   *  written imperatively by the label driver. */
  hoveredBody: string | null;
  /** Sun mesh — set by the Sun component, read by Effects as the God Rays source. */
  sunMesh: THREE.Mesh | null;
  /** True once the WebGL scene has rendered its first frame (hides the loader). */
  sceneReady: boolean;
  setAct: (act: Act) => void;
  setScrollProgress: (p: number) => void;
  setCoverage: (v: number) => void;
  setFocusedPlanet: (id: string | null) => void;
  setDeparture: (v: number) => void;
  setOrbit: (yaw: number, pitch: number) => void;
  setDragMoved: (v: boolean) => void;
  setTourMode: (v: boolean) => void;
  setTourStop: (i: number) => void;
  setScrollDriven: (v: boolean) => void;
  setQuality: (q: Quality) => void;
  setDisplayHz: (hz: number) => void;
  setPacing: (p: Pacing) => void;
  setHoveredBody: (k: string | null) => void;
  setSunMesh: (m: THREE.Mesh | null) => void;
  setSceneReady: (v: boolean) => void;
}

export const useScene = create<SceneState>((set) => ({
  act: 'galaxy',
  scrollProgress: 0,
  coverage: 0,
  focusedPlanet: null,
  departure: 0,
  orbitYaw: 0,
  orbitPitch: 0,
  dragMoved: false,
  tourMode: false,
  tourStop: 0,
  scrollDriven: false,
  // PERF-2: everyone STARTS cheap. This was 'high', so every visitor was handed the
  // expensive profile and only demoted after failing it - which meant a borderline
  // machine's first experience of the site was the stutter. A promotion is invisible; a
  // stutter is not, so the burden of proof moved to the promotion.
  quality: 'low',
  displayHz: 0,
  pacing: 'even',
  hoveredBody: null,
  sunMesh: null,
  sceneReady: false,
  setAct: (act) => set({ act }),
  setScrollProgress: (scrollProgress) => set({ scrollProgress }),
  setCoverage: (coverage) => set({ coverage }),
  setFocusedPlanet: (focusedPlanet) => set({ focusedPlanet }),
  setDeparture: (departure) => set({ departure }),
  setOrbit: (orbitYaw, orbitPitch) => set({ orbitYaw, orbitPitch }),
  setDragMoved: (dragMoved) => set({ dragMoved }),
  setTourMode: (tourMode) => set({ tourMode }),
  setTourStop: (tourStop) => set({ tourStop }),
  setScrollDriven: (scrollDriven) => set({ scrollDriven }),
  setQuality: (quality) => set({ quality }),
  setDisplayHz: (displayHz) => set({ displayHz }),
  setPacing: (pacing) => set({ pacing }),
  setHoveredBody: (hoveredBody) => set({ hoveredBody }),
  setSunMesh: (sunMesh) => set({ sunMesh }),
  setSceneReady: (sceneReady) => set({ sceneReady }),
}));
