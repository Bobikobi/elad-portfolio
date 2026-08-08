'use client';
import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, Noise, GodRays, HueSaturation, SMAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useScene } from '@/lib/sceneStore';
import { HUD_AVAILABLE } from './DebugHud';
import ExposureToneMap from './ExposureToneMap';


// The postprocessing VignetteEffect exposes `darkness`/`offset` as live setters; the
// package isn't hoisted for a direct type import (pnpm), so we type the ref structurally.
type VignetteLike = { darkness: number; offset: number };
type HueSatLike = { hue: number; saturation: number };
/** GodRaysEffect — `godRaysMaterial.weight` is a live setter, so the rays can be faded
 *  in and out without ever rebuilding the effect chain. */
type GodRaysLike = { godRaysMaterial: { weight: number } };

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

// A5: per-world colour grade — a subtle hue shift + saturation lift on the EXISTING
// HueSaturation pass (no new pass, no LUT) that gives each focused world its own
// cinematic mood on top of its nebula palette. Eased in on focus, out on departure.
const OVERVIEW_SAT = 0.06;
const GALAXY_SAT = 0.08; // A6: the same gentle grade enriches the galaxy arms (one universe)
// B3: these were roughly halved. The grade runs AFTER tone mapping, so a saturation lift
// takes a channel that the tone mapper had carefully landed at ~0.95 and pushes it over 1
// — it does not enrich the colour, it clips it, and it clips the DOMINANT channel first.
// Mars was the proof: at sat 0.19 its mean blue came out at 0.2 of 255 (saturation pulls
// each channel away from luminance, and blue was already the low one), which is exactly
// what "neon yellow" is. A mood is worth a few percent, never a channel.
// RULING 2: God Rays follow the SUN, not the state machine.
// The resting rule stands — in ORBIT the sun is deliberately framed ~110° off-view, so
// there is nothing there for rays to radiate from but the frame edge. But the FLIGHT
// between the overview and a world sweeps the camera through that whole 110°, and the sun
// crossing the frame is the one moment in the whole piece where a shaft of light belongs.
// Turning the effect off the instant a planet is clicked threw that away.
//
// So the gate is measured rather than declared: the angle between the camera's forward
// axis and the direction to the sun, against the frustum's own corner half-angle. Weight
// fades over [0.9, 1.7] × that half-angle (rays still reach into frame from a source just
// outside it), and the effect is MOUNTED out to 2.2× — i.e. always well before the weight
// leaves zero and well after it returns, so a chain rebuild can never be seen. The
// overview keeps its unconditional mount so that a drag-rotate which swings the sun off
// the edge fades the rays without recompiling the composer mid-gesture.
const SUN_POS = new THREE.Vector3(0, 0, 0);
const GODRAY_WEIGHT = 0.16;
const RAY_FADE_IN = 0.9;   // × half-diagonal fov - full weight inside this
const RAY_FADE_OUT = 1.7;  // × half-diagonal fov - zero weight beyond this
const RAY_MOUNT = 2.2;     // × half-diagonal fov - mounted out to here (hysteresis below)
const _fwd = new THREE.Vector3();
const _toSun = new THREE.Vector3();

const WORLD_GRADE: Record<string, { hue: number; sat: number }> = {
  earth: { hue: -0.02, sat: 0.08 }, // cool, clean
  jupiter: { hue: 0.02, sat: 0.08 }, // warm, rich
  saturn: { hue: 0.025, sat: 0.07 }, // golden
  mars: { hue: 0.025, sat: 0.06 }, // hot rust
  belt: { hue: -0.03, sat: 0.08 }, // teal-tech
};

/**
 * Post FX (one fullscreen pass). Runs uninterrupted across the act swap (one camera,
 * one look) so the two scene-graphs read as one world.
 *
 * Bloom threshold is ACT-DEPENDENT — this is the difference between "space" and
 * "purple fog": the galaxy act is a dim additive point cloud, so thresholding it
 * flickers → threshold 0. The solar act has textured planets + an HDR (>1) sun; a
 * zero threshold there blooms the entire dark-indigo sky into a uniform purple haze
 * and blurs every star into mush. So in solar we raise the threshold to ~0.7 — only
 * the burning sun and lit planet limbs bloom, the sky stays deep and the stars crisp.
 */
export default function Effects() {
  const act = useScene((s) => s.act);
  const sunMesh = useScene((s) => s.sunMesh);
  const high = useScene((s) => s.quality) === 'high';
  const focused = useScene((s) => s.focusedPlanet);
  const solar = act === 'solar';
  // B5 / the tier LAW: God Rays used to be `high`-only, which is a COMPOSITION difference
  // between tiers, not a cost one — a weak machine saw a different sky. Both tiers get the
  // rays now; only the sample count drops.
  // RULING 2: in the overview the sun is the hero and the rays are unconditional; inside a
  // world they exist only while the sun is actually near the frame, which in practice means
  // the flight in and the flight out. See the constants above.
  const [sunNear, setSunNear] = useState(false);
  const godRays = solar && !!sunMesh && (!focused || sunNear);

  // Ease the vignette across the swap (T3) so the corners don't flip between solar's
  // deep vignette and the galaxy's mild one at the crossover — that flip (galaxy
  // corners ~9% → solar corners ~0%) was the last visible seam behind the gold mask.
  // Driven imperatively so `coverage` never re-renders the composer per frame.
  const vigRef = useRef<VignetteLike | null>(null);
  const hueSatRef = useRef<HueSatLike | null>(null);
  const godRaysRef = useRef<GodRaysLike | null>(null);

  /**
   * PASS AUDIT (HUD builds only). The scene is pass-bound, not fill-bound — ~15 fullscreen
   * passes a frame with 76% of CPU samples in GL submission — so the pass LIST is the thing
   * worth knowing, and it cannot be read off the source: @react-three/postprocessing merges
   * consecutive effects into one EffectPass, but a CONVOLUTION effect takes a pass of its
   * own AND breaks the run, so the effects after it start a new pass. Which of ours are
   * convolution is a fact about the library, not about this file. So: ask the composer.
   */
  const composerRef = useRef<{ passes?: unknown[] } | null>(null);
  useEffect(() => {
    if (!HUD_AVAILABLE) return;
    const id = setTimeout(() => {
      const passes = composerRef.current?.passes;
      if (!Array.isArray(passes)) return;
      (window as unknown as Record<string, unknown>).__passes = passes.map((p) => {
        const pass = p as { constructor: { name: string }; enabled?: boolean; effects?: { name?: string }[] };
        return {
          pass: pass.constructor.name,
          enabled: pass.enabled !== false,
          merged: pass.effects?.map((e) => e?.name ?? '?') ?? null,
        };
      });
    }, 300); // the layout effect that builds the passes runs after this one
    return () => clearTimeout(id);
  }, [godRays, solar, focused, high]);
  const curSat = useRef(OVERVIEW_SAT);
  const curHue = useRef(0);
  const curWeight = useRef(0);
  useFrame((st, dt) => {
    const { act: a, coverage, focusedPlanet: fp, departure } = useScene.getState();
    const sol = a === 'solar';

    // --- RULING 2: how much of the sun is in this frame? --------------------------------
    const cam = st.camera as THREE.PerspectiveCamera;
    cam.getWorldDirection(_fwd);
    _toSun.copy(SUN_POS).sub(cam.position);
    const dist = _toSun.length();
    // Half the angle from the frame centre to a CORNER — the largest angle at which the
    // sun is still inside the picture, and the honest threshold for "in frame".
    const halfDiag = Math.atan(
      Math.tan((cam.fov * Math.PI) / 360) * Math.hypot(1, cam.aspect)
    );
    const ang = dist < 1e-4 ? 0 : Math.acos(Math.max(-1, Math.min(1, _fwd.dot(_toSun) / dist)));
    const inFrame = 1 - smoothstep(halfDiag * RAY_FADE_IN, halfDiag * RAY_FADE_OUT, ang);
    // Mount hysteresis: a wide band either side of the fade so the chain is rebuilt only
    // while the weight is already pinned at zero.
    if (sol && fp) {
      if (!sunNear && ang < halfDiag * RAY_MOUNT) setSunNear(true);
      else if (sunNear && ang > halfDiag * (RAY_MOUNT + 0.5)) setSunNear(false);
    } else if (sunNear) setSunNear(false);
    const gr = godRaysRef.current;
    if (gr) {
      const target = sol ? GODRAY_WEIGHT * inFrame : 0;
      curWeight.current += (target - curWeight.current) * Math.min(1, dt * 5);
      gr.godRaysMaterial.weight = curWeight.current;
    } else {
      curWeight.current = 0;
    }
    if (HUD_AVAILABLE) {
      (window as unknown as { __godrays?: unknown }).__godrays = {
        mounted: !!gr,
        weight: +curWeight.current.toFixed(4),
        sunAngleDeg: +((ang * 180) / Math.PI).toFixed(1),
        halfDiagDeg: +((halfDiag * 180) / Math.PI).toFixed(1),
        inFrame: +inFrame.toFixed(3),
      };
    }

    const v = vigRef.current;
    if (v) {
      v.darkness = sol ? 0.87 - 0.25 * coverage : 0.62;
      v.offset = sol ? 0.32 - 0.04 * coverage : 0.28;
    }
    // A5: ease the per-world grade in on focus, back to the neutral overview on departure.
    const hs = hueSatRef.current;
    if (hs) {
      const g = sol && fp ? WORLD_GRADE[fp] : null;
      const dep = fp ? clamp01(departure) : 0;
      const tSat = !sol ? GALAXY_SAT : g ? OVERVIEW_SAT + (g.sat - OVERVIEW_SAT) * (1 - dep) : OVERVIEW_SAT;
      const tHue = g ? g.hue * (1 - dep) : 0;
      const k = Math.min(1, dt * 3);
      curSat.current += (tSat - curSat.current) * k;
      curHue.current += (tHue - curHue.current) * k;
      hs.saturation = curSat.current;
      hs.hue = curHue.current;
    }
  });

  return (
    <EffectComposer
      ref={(c: { passes?: unknown[] } | null) => { composerRef.current = c ?? null; }}
      multisampling={0}
    >
      {godRays ? (
        /* weight starts at 0 and is driven per-frame (RULING 2) — so the frame in which the
           effect mounts is identical to the frame before it, and the rebuild is invisible. */
        <GodRays
          ref={(e: GodRaysLike | null) => { godRaysRef.current = e ?? null; }}
          sun={sunMesh}
          // Explicit rather than relying on the effect's default: the rays are blurred and
          // mip-based, so half resolution is close to free visually and is a quarter of
          // the fragments in the pass that samples 26-60 times per pixel.
          resolutionScale={0.5}
          // Presence is composition and stays in every tier (owner ruling); only the
          // sample count is cost. Low 26 -> 16, and PERF-2 brings high 60 -> 32: the high
          // tier had grown while nobody was checking what it cost the borderline machines
          // that were being assigned to it.
          samples={high ? 32 : 16}
          density={0.86}
          decay={0.93}
          weight={0}
          exposure={0.2}
          clampMax={0.78}
          blur
        />
      ) : (
        <></>
      )}
      {/* B3: bloom runs AFTER tone mapping, so in a focused world - where a planet fills
          two thirds of the frame and its whole lit face sits above the overview's 0.72
          threshold - it was adding a broad glow on top of an image already near the top
          of the range, and that addition is what clipped. The overview keeps its numbers
          (the sun is the hero there and must burn); a world raises the bar so only the
          genuinely burning limb blooms. This is a per-STATE change, not per-tier: every
          tier sees the identical values. */}
      <Bloom
        key={`${solar && focused ? 'world' : solar ? 'overview' : 'galaxy'}-${high ? 'hi' : 'lo'}`}
        mipmapBlur
        // Half-res base for the same reason as the rays: the blur is a mip chain, so the
        // pass cannot resolve detail this buffer would have carried anyway.
        resolutionScale={0.5}
        // THE lever, and the audit is what identified it. The composer builds only three
        // passes, yet the frame costs 21-28 renderer.render() calls: mipmapBlur runs a
        // downsample and an upsample per mip LEVEL, so the level count - not the pass
        // list - is what the frame is actually paying for. 9 -> 6 removes ~6 renders a
        // frame, roughly 29% of them on the home route.
        //
        // The widest levels are a 1-2px buffer stretched across the screen: the faintest,
        // broadest part of the glow. A slightly tighter halo against no stutter is the
        // owner's ruling, and it is the same family as the god-ray sample count.
        //
        // NOTE: `levels` is a MOUNT-TIME option in postprocessing, not a live setter, so
        // it belongs in the key below - a tier change has to rebuild this effect for the
        // number to take. That is why `high` is part of the key.
        //
        // PERF-2: high goes 9 -> 7. The widest two levels are a 1-2px buffer stretched
        // across the frame — the faintest, broadest part of the halo — and on a machine
        // with genuine headroom their absence is imperceptible, while on the borderline
        // machines that were wrongly living in the high tier it is four fewer renders a
        // frame. The high tier had drifted UP during the pass round (21.0 -> 22.7 on
        // home); this is the correction.
        levels={high ? 7 : 6}
        // SUN-2: the OVERVIEW threshold goes 0.72 -> 0.94 and its intensity 0.6 -> 0.5.
        //
        // Bloom runs after tone mapping, and at 0.72 most of the sun's disc - not just its
        // hottest cells - was over the bar. The glow was therefore being laid over the
        // surface itself: measured, a 48% limb darkening arrived at the screen as 8%,
        // because the halo spilling inward off the bright interior filled the limb back in,
        // and the granulation was smeared for the same reason. At 0.94 only the genuinely
        // burning cells bloom, which is what the threshold is for; the disc keeps its own
        // shading and the star still glows.
        //
        // This can only make the halo TIGHTER, which is the direction R2.2 wanted - but the
        // corner luminance is re-measured anyway rather than argued about.
        intensity={solar ? (focused ? 0.34 : 0.5) : 0.5}
        luminanceThreshold={solar ? (focused ? 0.86 : 0.94) : 0}
        luminanceSmoothing={solar ? 0.22 : 0}
        radius={solar ? 0.45 : 0.5}
      />
      {/* THE APERTURE + THE TONE MAPPER. Must sit after God Rays and Bloom (they want the
          HDR image) and before the grade, the grain and the vignette (they want a
          display-referred one). See ExposureToneMap for why three cannot do this itself
          once a composer owns the render. */}
      <ExposureToneMap />
      {/* Global grade: a gentle saturation lift - colour on the planets without touching
          any texture. Kept LOW in solar (was 0.14) because the higher lift pushed the dim
          sky violet, which the vignette then framed as a milky "lavender oval" (F1). */}
      {/* A6: the grade now runs in BOTH acts (driven per-frame above) - same family. */}
      <HueSaturation ref={(e: HueSatLike | null) => { hueSatRef.current = e ?? null; }} saturation={OVERVIEW_SAT} />
      {/* Very subtle film grain + vignette - the glue that binds the depth layers. */}
      <Noise premultiply opacity={0.045} />
      {/* Deeper vignette in the solar act pulls the corners to deep space (spec: <10%
          brightness at the edges) while the sun keeps the centre warm. Darkness/offset
          are driven per-frame (vigRef) to ease across the swap - see above. */}
      <Vignette ref={(e: VignetteLike | null) => { vigRef.current = e ?? null; }} offset={0.28} darkness={0.62} />
      {/* B13: the composer runs with multisampling 0, so nothing was anti-aliasing the
          planet limbs - a lit rim against near-black space is the worst case for a
          stair-stepped edge, and at DPR 1 it was visible on every world. SMAA is one
          cheap fullscreen pass and it goes last, on the finished frame.
          F5: it is also the ONLY effect the composer could not merge - the audit shows
          every other effect collapsing into a single EffectPass while SMAA takes one of
          its own, because it is the convolution effect in the chain. On the low tier it
          now comes off, on the owner's ruling and against a side-by-side crop. High tier
          keeps it: there, a jagged edge is still a defect rather than a setting. */}
      {high ? <SMAA /> : <></>}
    </EffectComposer>
  );
}
