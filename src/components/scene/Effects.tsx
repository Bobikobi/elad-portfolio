'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, Noise, GodRays, HueSaturation } from '@react-three/postprocessing';
import { useScene } from '@/lib/sceneStore';
import ExposureToneMap from './ExposureToneMap';


// The postprocessing VignetteEffect exposes `darkness`/`offset` as live setters; the
// package isn't hoisted for a direct type import (pnpm), so we type the ref structurally.
type VignetteLike = { darkness: number; offset: number };
type HueSatLike = { hue: number; saturation: number };

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

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
  // God Rays belong to the OVERVIEW where the sun is the hero. In a focused world
  // (ORBIT) the sun is framed off-screen; leaving God Rays on would streak its glare
  // back in from the edge and re-dominate the frame (F1). So: overview only.
  // B5 / the tier LAW: God Rays used to be `high`-only, which is a COMPOSITION difference
  // between tiers, not a cost one — a weak machine saw a different sky. Both tiers get the
  // rays now; only the sample count drops. (They stay overview-only: in ORBIT the sun is
  // deliberately framed ~110° off-view, so the effect would have nothing to radiate from
  // but the frame edge.)
  const godRays = solar && !focused && !!sunMesh;

  // Ease the vignette across the swap (T3) so the corners don't flip between solar's
  // deep vignette and the galaxy's mild one at the crossover — that flip (galaxy
  // corners ~9% → solar corners ~0%) was the last visible seam behind the gold mask.
  // Driven imperatively so `coverage` never re-renders the composer per frame.
  const vigRef = useRef<VignetteLike | null>(null);
  const hueSatRef = useRef<HueSatLike | null>(null);
  const curSat = useRef(OVERVIEW_SAT);
  const curHue = useRef(0);
  useFrame((_, dt) => {
    const { act: a, coverage, focusedPlanet: fp, departure } = useScene.getState();
    const sol = a === 'solar';
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
    <EffectComposer multisampling={0}>
      {godRays ? (
        <GodRays sun={sunMesh} samples={high ? 60 : 26} density={0.86} decay={0.93} weight={0.16} exposure={0.2} clampMax={0.78} blur />
      ) : (
        <></>
      )}
      {/* B3: bloom runs AFTER tone mapping, so in a focused world — where a planet fills
          two thirds of the frame and its whole lit face sits above the overview's 0.72
          threshold — it was adding a broad glow on top of an image already near the top
          of the range, and that addition is what clipped. The overview keeps its numbers
          (the sun is the hero there and must burn); a world raises the bar so only the
          genuinely burning limb blooms. This is a per-STATE change, not per-tier: every
          tier sees the identical values. */}
      <Bloom
        key={solar && focused ? 'world' : solar ? 'overview' : 'galaxy'}
        mipmapBlur
        intensity={solar ? (focused ? 0.34 : 0.6) : 0.5}
        luminanceThreshold={solar ? (focused ? 0.86 : 0.72) : 0}
        luminanceSmoothing={solar ? 0.22 : 0}
        radius={solar ? 0.45 : 0.5}
      />
      {/* THE APERTURE + THE TONE MAPPER. Must sit after God Rays and Bloom (they want the
          HDR image) and before the grade, the grain and the vignette (they want a
          display-referred one). See ExposureToneMap for why three cannot do this itself
          once a composer owns the render. */}
      <ExposureToneMap />
      {/* Global grade: a gentle saturation lift — colour on the planets without touching
          any texture. Kept LOW in solar (was 0.14) because the higher lift pushed the dim
          sky violet, which the vignette then framed as a milky "lavender oval" (F1). */}
      {/* A6: the grade now runs in BOTH acts (driven per-frame above) — same family. */}
      <HueSaturation ref={(e: HueSatLike | null) => { hueSatRef.current = e ?? null; }} saturation={OVERVIEW_SAT} />
      {/* Very subtle film grain + vignette — the glue that binds the depth layers. */}
      <Noise premultiply opacity={0.045} />
      {/* Deeper vignette in the solar act pulls the corners to deep space (spec: <10%
          brightness at the edges) while the sun keeps the centre warm. Darkness/offset
          are driven per-frame (vigRef) to ease across the swap — see above. */}
      <Vignette ref={(e: VignetteLike | null) => { vigRef.current = e ?? null; }} offset={0.28} darkness={0.62} />
    </EffectComposer>
  );
}
