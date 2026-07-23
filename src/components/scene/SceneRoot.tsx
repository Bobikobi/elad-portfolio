'use client';
import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerformanceMonitor, AdaptiveDpr, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useScene } from '@/lib/sceneStore';
import GalaxyAct from './acts/GalaxyAct';
import SolarAct from './acts/SolarAct';
import CameraRig from './CameraRig';
import Effects from './Effects';
import GradientSky from './galaxy/GradientSky';
import Nebula from './galaxy/Nebula';
import { HudProbe, DebugHudOverlay } from './DebugHud';

const DEBUG = process.env.NODE_ENV !== 'production';

/**
 * The single WebGL canvas — fixed, full-bleed, behind the DOM. `dynamic(ssr:false)`
 * at the import site keeps it client-only. CameraRig (sole camera owner) and post FX
 * persist here across the act swap; only the act CONTENT (galaxy vs solar) changes,
 * so GalaxyAct fully unmounts/disposes at the flash while the world feels continuous.
 */
/** Signals the loader to fade once a few real frames have been drawn (no pop-in). */
function ReadySignal() {
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (frames.current === 3) useScene.getState().setSceneReady(true);
  });
  return null;
}

export default function SceneRoot() {
  const setQuality = useScene((s) => s.setQuality);
  const act = useScene((s) => s.act);
  const high = useScene((s) => s.quality) === 'high';

  // pointerEvents:auto so R3F can raycast planet clicks. It sits at z-0 behind the DOM;
  // on immersive routes `main` is pointer-events-none (ClientProviders) so clicks fall
  // through to the planets, while classic pages keep `main` interactive and the canvas
  // never receives their clicks.
  return (
    <div className="fixed inset-0" style={{ zIndex: 0, pointerEvents: 'auto' }} aria-hidden="true">
      <Canvas
        gl={{ powerPreference: 'high-performance', antialias: true, alpha: false, preserveDrawingBuffer: DEBUG }}
        dpr={[1, 1.5]}
        camera={{ position: [0, 2.6, 9], fov: 55, near: 0.1, far: 200 }}
        shadows={false}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1;
        }}
      >
        <color attach="background" args={['#050714']} />
        <PerformanceMonitor onDecline={() => setQuality('low')} />
        <AdaptiveDpr pixelated />
        <ReadySignal />
        <CameraRig />
        {/* Shared SKY — lives outside both acts and never swaps, so the universe is
            continuous through the transition (only the "middle" changes). */}
        <GradientSky />
        <Stars radius={84} depth={64} count={high ? 13000 : 4000} factor={4} saturation={0.3} fade speed={0.5} />
        {/* Shared sky persists across BOTH acts (cohesion spec: one rich universe).
            In the solar act the veils drop to a faint backdrop so they read as distant
            nebulosity, not the milky haze that used to wash the poster frame — corners
            stay <10% brightness but never empty (stars + a nebula touch everywhere). */}
        <Nebula intensity={act === 'solar' ? 0.18 : 1} />
        {act === 'galaxy' ? <GalaxyAct /> : <SolarAct />}
        <Effects />
        {DEBUG && <HudProbe />}
      </Canvas>
      {DEBUG && <DebugHudOverlay />}
    </div>
  );
}
