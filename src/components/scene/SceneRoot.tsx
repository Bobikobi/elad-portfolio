'use client';
import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr } from '@react-three/drei';
import SeededStars from './SeededStars';
import * as THREE from 'three';
import { useScene } from '@/lib/sceneStore';
import { sparkleClock } from '@/lib/spaceMaterials';
import GalaxyAct from './acts/GalaxyAct';
import SolarAct from './acts/SolarAct';
import CameraRig from './CameraRig';
import Effects from './Effects';
import SwapMask from './SwapMask';
import DragControls from './DragControls';
import TourDots from './TourDots';
import PlanetLabelsOverlay, { PlanetLabelDriver } from './PlanetLabels';
import QualityGovernor from './QualityGovernor';
import GradientSky from './galaxy/GradientSky';
import Nebula from './galaxy/Nebula';
import HeroStars from './galaxy/HeroStars';
import { HudProbe, DebugHudOverlay, HUD_AVAILABLE, useHudEnabled } from './DebugHud';

/**
 * The single WebGL canvas — fixed, full-bleed, behind the DOM. `dynamic(ssr:false)`
 * at the import site keeps it client-only. CameraRig (sole camera owner) and post FX
 * persist here across the act swap; only the act CONTENT (galaxy vs solar) changes,
 * so GalaxyAct fully unmounts/disposes at the flash while the world feels continuous.
 */
/**
 * Warm-up + ready signal (T5 — "composer from frame one"). The EffectComposer is
 * already the sole renderer from frame 1 (its priority-1 render disables R3F's
 * auto-render), so every frame is composited. What we add here is a PRECOMPILE on the
 * first frame — `gl.compile` builds every mounted scene material's program up front
 * (galaxy point cloud, dive field, veils, sky, swap mask) instead of letting them
 * compile lazily as each is first drawn, which would hitch/pop AFTER the loader lifts.
 * The composer's own effect-pass shaders compile on its first render, so we then wait a
 * couple more composited frames before signalling ready — the revealed frame is fully
 * post-processed, warm, and hitch-free (no dim-then-bloom pop-in).
 */
function Warmup() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const compiled = useRef(false);
  const frames = useRef(0);
  // Verification handle (HUD_AVAILABLE gate — stripped from the production bundle). A
  // screenshot can show that something is wrong in the frame but never WHICH object did
  // it; with the live scene graph in hand a harness can bisect by hiding one node at a
  // time, which is the only way to name the culprit instead of guessing at it.
  useEffect(() => {
    if (!HUD_AVAILABLE) return;
    (window as unknown as Record<string, unknown>).__three = { scene, camera, gl, THREE };
  }, [scene, camera, gl]);
  useFrame((state) => {
    // One clock for every sparkle in the scene (see spaceMaterials.sparkleClock) — a sky
    // full of scintillating stars costs this single assignment.
    sparkleClock.value = state.clock.elapsedTime;
    if (!compiled.current) {
      gl.compile(scene, camera);
      compiled.current = true;
      return;
    }
    frames.current += 1;
    if (frames.current === 3) useScene.getState().setSceneReady(true);
  });
  return null;
}

export default function SceneRoot() {
  const act = useScene((s) => s.act);
  const high = useScene((s) => s.quality) === 'high';
  const hudOn = useHudEnabled();

  // pointerEvents:auto so R3F can raycast planet clicks. It sits at z-0 behind the DOM;
  // on immersive routes `main` is pointer-events-none (ClientProviders) so clicks fall
  // through to the planets, while classic pages keep `main` interactive and the canvas
  // never receives their clicks.
  return (
    <>
    <div className="fixed inset-0" style={{ zIndex: 0, pointerEvents: 'auto', touchAction: 'pan-y' }} aria-hidden="true">
      <Canvas
        gl={{ powerPreference: 'high-performance', antialias: true, alpha: false, preserveDrawingBuffer: HUD_AVAILABLE }}
        /* PERF-2: 1.25 rather than 1.5. Pixels are the cheapest thing to give back on a
           machine that is struggling and the least visible on one that is not. */
        dpr={[1, 1.25]}
        camera={{ position: [0, 2.6, 9], fov: 55, near: 0.1, far: 200 }}
        shadows={false}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1;
        }}
      >
        <color attach="background" args={['#050714']} />
        {/* R5.9 — the quality governor owns every tier decision now (warm-up grace,
            hysteresis, refresh-rate-aware pacing). A raw PerformanceMonitor.onDecline
            downgraded on the very first frames, while shaders were still compiling. */}
        <QualityGovernor />
        <AdaptiveDpr pixelated />
        <Warmup />
        <CameraRig />
        {/* Shared SKY — lives outside both acts and never swaps, so the universe is
            continuous through the transition (only the "middle" changes). */}
        <GradientSky solar={act === 'solar'} />
        {/* Seeded (see SeededStars): drei's own Stars rolls this field fresh on every load, which
            G5 caught after the seeding pass had closed every Math.random() in our own files. */}
        <SeededStars radius={84} depth={64} count={high ? 13000 : 4000} factor={4} saturation={0.55} fade speed={0.5} />
        <HeroStars />
        {/* Shared sky persists across BOTH acts (cohesion spec: one rich universe).
            In the solar act the veils drop to a faint backdrop so they read as distant
            nebulosity, not the milky haze that used to wash the poster frame — corners
            stay <10% brightness but never empty (stars + a nebula touch everywhere). */}
        {/* B4: 0.28 left the solar sky effectively empty, which is most of why the worlds
            read as faded. The veils are a BACKDROP, not a rumour of one. */}
        <Nebula intensity={act === 'solar' ? 0.5 : 1} />
        {act === 'galaxy' ? <GalaxyAct /> : <SolarAct />}
        {/* In-world swap curtain — persists across the act swap, covers the seam. */}
        <SwapMask />
        <Effects />
        {/* Priority 2 → the last thing in the frame, after the composer has drawn it, so
            every pill lands on the exact pixels of the body it names (R5.4). */}
        <PlanetLabelDriver />
        {HUD_AVAILABLE && hudOn && <HudProbe />}
      </Canvas>
      <DragControls />
      {HUD_AVAILABLE && hudOn && <DebugHudOverlay />}
    </div>
    {/* Interactive scene chrome lives OUTSIDE the aria-hidden canvas wrapper: these are
        real buttons a screen-reader user must be able to reach. (They were previously
        nested inside it — focusable content under aria-hidden.) */}
    <PlanetLabelsOverlay />
    <TourDots />
    </>
  );
}
