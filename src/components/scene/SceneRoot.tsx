'use client';
import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import SeededStars from './SeededStars';
import * as THREE from 'three';
import { NEUTRAL_APERTURE } from '@/lib/photometry';
import { useScene } from '@/lib/sceneStore';
import { sparkleClock } from '@/lib/spaceMaterials';
import GalaxyAct from './acts/GalaxyAct';
import SolarAct from './acts/SolarAct';
import CameraRig from './CameraRig';
import Effects from './Effects';
import SwapMask from './SwapMask';
import DragControls from './DragControls';
import TourDots from './TourDots';
import Constellations, { ConstellationLabel } from './Constellations';
import PlanetLabelsOverlay, { PlanetLabelDriver } from './PlanetLabels';
import QualityGovernor from './QualityGovernor';
import { FramePacer, ResolutionScaler, liveDpr } from './PerfPacer';
import GradientSky from './galaxy/GradientSky';
import Nebula from './galaxy/Nebula';
import HeroStars from './galaxy/HeroStars';
import TourSky from './TourSky';
import {
  ClockFreezeProbe,
  HudProbe,
  DebugHudOverlay,
  HUD_AVAILABLE,
  installFixedStepClock,
  useHudEnabled,
} from './DebugHud';

/**
 * The single WebGL canvas — fixed, full-bleed, behind the DOM. `dynamic(ssr:false)`
 * at the import site keeps it client-only. CameraRig (sole camera owner) and post FX
 * persist here across the act swap; only the act CONTENT (galaxy vs solar) changes,
 * so GalaxyAct fully unmounts/disposes at the flash while the world feels continuous.
 */
/** Runs `fn` with every act group shown, then restores each group's own visibility. */
function withActsShown(scene: THREE.Scene, fn: () => void) {
  const acts = scene.children.filter((o) => o.name.startsWith('act:'));
  const was = acts.map((o) => o.visible);
  acts.forEach((o) => { o.visible = true; });
  try { fn(); } finally { acts.forEach((o, i) => { o.visible = was[i]; }); }
}

function warmDraw(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
  const target = new THREE.WebGLRenderTarget(64, 64, { type: THREE.HalfFloatType });
  const culled: THREE.Object3D[] = [];
  scene.traverse((o) => { if (o.frustumCulled) { o.frustumCulled = false; culled.push(o); } });
  const prev = gl.getRenderTarget();
  try {
    withActsShown(scene, () => {
      gl.setRenderTarget(target);
      gl.render(scene, camera);
    });
  } finally {
    gl.setRenderTarget(prev);
    culled.forEach((o) => { o.frustumCulled = true; });
    target.dispose();
  }
}

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
      // Twice: as the first frame will draw, then with every act shown, so the act that is
      // not on screen gets the programs it will be drawn with - its lights counted, which
      // three only collects from VISIBLE objects. Both run behind the loader.
      gl.compile(scene, camera);
      withActsShown(scene, () => gl.compile(scene, camera));
      compiled.current = true;
      return;
    }
    frames.current += 1;
    // A compile builds programs but uploads nothing: vertex buffers go to the GPU on an
    // object's first draw. One draw of everything into a scratch target, culling off, so
    // the hidden act's first visible frame is a plain frame. Textures whose images are still
    // downloading here upload on first use instead.
    if (frames.current === 1) warmDraw(gl, scene, camera);
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
        // Starts conservative and is owned by ResolutionScaler from the first evaluation.
        // Opening at 1.5 spent the most expensive seconds of the whole session — compiles,
        // uploads, first draws — on 2.25x the fragments, on exactly the machines that
        // cannot afford it. It rises within a few seconds wherever there is headroom.
        // Later renders pass the scaler's current ratio back: R3F re-applies this prop on
        // every render, and a constant 1 here dropped a phone to 1x on each act change.
        dpr={liveDpr()}
        camera={{ position: [0, 2.6, 9], fov: 55, near: 0.1, far: 200 }}
        shadows={false}
        onCreated={({ gl, clock }) => {
          // R3F 9.6.1 calls onCreated after the scene graph commit but before its first
          // requestAnimationFrame update. Fixed-step must be installed here: mounting the
          // probe below in an effect would make first-frame coverage depend on scheduling.
          if (HUD_AVAILABLE) installFixedStepClock(clock);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = NEUTRAL_APERTURE;
        }}
      >
        <color attach="background" args={['#050714']} />
        {/* R5.9 - the quality governor owns every tier decision now (warm-up grace,
            hysteresis, refresh-rate-aware pacing). A raw PerformanceMonitor.onDecline
            downgraded on the very first frames, while shaders were still compiling. */}
        <QualityGovernor />
        {/* Cost control, composition untouched. AdaptiveDpr used to sit here; it reacts to
            R3F's regress() signal, which nothing in this scene raises, so it was a second
            writer of `dpr` doing nothing. ResolutionScaler measures the frame instead. */}
        <FramePacer />
        <ResolutionScaler />
        <Warmup />
        <CameraRig />
        {/* Shared SKY - lives outside both acts and never swaps, so the universe is
            continuous through the transition (only the "middle" changes). */}
        <GradientSky solar={act === 'solar'} />
        {/* Seeded (see SeededStars): drei's own Stars rolls this field fresh on every load, which
            G5 caught after the seeding pass had closed every Math.random() in our own files. */}
        {/* Galaxy act only: the solar act has the real naked-eye sky (RealSky, inside
            Constellations) instead - random stars there read as noise in front of it. Hidden,
            not unmounted, so scrolling back up does not rebuild 13000 stars. */}
        <group visible={act === 'galaxy'}>
          <SeededStars radius={84} depth={64} count={high ? 13000 : 4000} factor={4} saturation={0.55} fade speed={0.5} />
        </group>
        <TourSky>
          <HeroStars />
          {/* Shared sky persists across BOTH acts (cohesion spec: one rich universe).
              In the solar act the veils drop to a faint backdrop so they read as distant
              nebulosity, not the milky haze that used to wash the poster frame - corners
              stay <10% brightness but never empty (stars + a nebula touch everywhere). */}
          {/* B4: 0.28 left the solar sky effectively empty, which is most of why the worlds
              read as faded. The veils are a BACKDROP, not a rumour of one. */}
          {/* GALAXY-REST: `anchor` is the gold "galaxy we dived out of". It belongs to the solar
              act, where we HAVE dived out of one; in the welcome frame it is a bright gold ellipse
              hanging half off the left border, and it is what the edge measurement was reading
              there all along - 10.3 of the left band's 10.3, in master as well. Solar keeps it at
              exactly its old strength; the swap happens behind DiveFade's black. */}
          <Nebula intensity={act === 'solar' ? 0.5 : 1} anchor={act === 'solar' ? 1 : 0} />
        </TourSky>
        {/* Both acts stay mounted and the swap only flips which one is drawn (#82). Mounting
            the solar act at the swap cost a 0.1-0.5s frozen frame right at the curtain - React
            building it, then every shader compiling on its first draw - and remounting the
            galaxy on the way back cost the same. Warmup compiles and uploads both behind the
            loader. Each act's per-frame work checks `act` where it would otherwise change the
            next entry (SolarAct's orbits restart from their phases, as on a fresh mount). */}
        <group name="act:galaxy" visible={act === 'galaxy'}>
          <GalaxyAct />
        </group>
        <group name="act:solar" visible={act === 'solar'}>
          <SolarAct />
          <Constellations />
        </group>
        {/* In-world swap curtain - persists across the act swap, covers the seam. */}
        <SwapMask />
        <Effects />
        {/* Priority 2 → the last thing in the frame, after the composer has drawn it, so
            every pill lands on the exact pixels of the body it names (R5.4). */}
        <PlanetLabelDriver />
        {/* Unlike the visible HUD, the measurement seam is available without ?hud=1 so its
            own overlay never contaminates a screenshot. The build-time flag is the outer
            guard: production neither mounts the probe nor publishes anything to window. */}
        {HUD_AVAILABLE && <ClockFreezeProbe />}
        {HUD_AVAILABLE && hudOn && <HudProbe />}
      </Canvas>
      <DragControls />
      {HUD_AVAILABLE && hudOn && <DebugHudOverlay />}
    </div>
    {/* Interactive scene chrome lives OUTSIDE the aria-hidden canvas wrapper: these are
        real buttons a screen-reader user must be able to reach. (They were previously
        nested inside it - focusable content under aria-hidden.) */}
    <PlanetLabelsOverlay />
    <TourDots />
    <ConstellationLabel />
    </>
  );
}
