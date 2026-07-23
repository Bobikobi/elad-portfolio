'use client';
import { create } from 'zustand';
import type * as THREE from 'three';

export type Act = 'galaxy' | 'solar';
export type CameraMode =
  | 'WELCOME_IDLE'
  | 'DIVE'
  | 'FLASH'
  | 'SOLAR_OVERVIEW'
  | 'FLYING'
  | 'ORBIT';
export type Quality = 'high' | 'low';

interface SceneState {
  act: Act;
  /** 0..1 dive progress across the galaxy act (single source of truth: scrollDriver). */
  scrollProgress: number;
  cameraMode: CameraMode;
  focusedPlanet: string | null;
  /** Departure gesture progress 0..1 while in ORBIT — scrubs the camera back toward
   *  the overview; 1.0 commits the return flight. Owned by the world's ProjectsStage. */
  departure: number;
  quality: Quality;
  /** Sun mesh — set by the Sun component, read by Effects as the God Rays source. */
  sunMesh: THREE.Mesh | null;
  /** True once the WebGL scene has rendered its first frame (hides the loader). */
  sceneReady: boolean;
  setAct: (act: Act) => void;
  setScrollProgress: (p: number) => void;
  setCameraMode: (m: CameraMode) => void;
  setFocusedPlanet: (id: string | null) => void;
  setDeparture: (v: number) => void;
  setQuality: (q: Quality) => void;
  setSunMesh: (m: THREE.Mesh | null) => void;
  setSceneReady: (v: boolean) => void;
}

export const useScene = create<SceneState>((set) => ({
  act: 'galaxy',
  scrollProgress: 0,
  cameraMode: 'WELCOME_IDLE',
  focusedPlanet: null,
  departure: 0,
  quality: 'high',
  sunMesh: null,
  sceneReady: false,
  setAct: (act) => set({ act }),
  setScrollProgress: (scrollProgress) => set({ scrollProgress }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  setFocusedPlanet: (focusedPlanet) => set({ focusedPlanet }),
  setDeparture: (departure) => set({ departure }),
  setQuality: (quality) => set({ quality }),
  setSunMesh: (sunMesh) => set({ sunMesh }),
  setSceneReady: (sceneReady) => set({ sceneReady }),
}));
