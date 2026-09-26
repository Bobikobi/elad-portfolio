'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScene } from '@/lib/sceneStore';
import { HUD_AVAILABLE } from '../DebugHud';
import {
  SUN_EMISSIVE_EXPOSURE,
  SUN_LAMP_DECAY,
  SUN_LAMP_DISTANCE,
  SUN_LAMP_INTENSITY,
  SUN_LAMP_OVERVIEW_SCALE,
  sunLampScale,
} from '@/lib/photometry';
import { softSprite, streakSprite, CORE_GOLD } from '@/lib/spaceMaterials';
import { makeRng, SEED } from '@/lib/rng';

/**
 * Print a TS number as a GLSL float literal.
 *
 * Two hazards, and both are invisible to the type system because they live inside a
 * template string. This shader is GLSL ES 1.00 - it writes gl_FragColor - and that dialect
 * has no implicit int-to-float conversion, so an interpolated `2` fails to compile and the
 * sun vanishes. But `toFixed(1)`, the obvious way to force the decimal point, silently
 * ROUNDS: it turns 1.55 into "1.6" and 0.06 into "0.1". photometry.ts exists precisely so
 * these numbers can be tuned, so a rounding trap in the interpolation is a wrong value
 * waiting for the first person who tunes one. Full precision, and a decimal point only
 * where JavaScript would not print one.
 */
const glslFloat = (v: number) => (Number.isInteger(v) ? v.toFixed(1) : String(v));

/** `?pinSpin` freezes the sun's rigid rotation so a harness can measure surface evolution. */
const SPIN_PINNED =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('pinSpin');

// Shared compact value-noise (used by both the surface colour and the edge wobble).
const NOISE_GLSL = /* glsl */ `
  float hash(vec3 p){ p = fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float noise(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                   mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                   mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
  float fbm(vec3 p){ float v=0.0, a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.0; a*=0.5; } return v; }
  // SUN-2 granulation. TWO octaves, not four: this is sampled at ten times the surface
  // frequency, and fbm's remaining octaves would land at ~70 cycles per radius - finer than
  // the disc has pixels at any framing the sun is seen at, which is not detail, it is noise
  // for the sampler to alias.
  float grain(vec3 p){ return noise(p) * 0.62 + noise(p * 2.0) * 0.38; }

  // CELLULAR noise, and this is the one that matters.
  //
  // Value noise makes CLOUDS: soft woolly blobs, which is what the surface looked like
  // through every round of frequency and amplitude tuning, because no amount of either turns
  // a cloud into a cell. A photosphere is not cloudy - it is a pavement of bright granules
  // separated by NARROW DARK LANES, and that shape only comes out of a distance-to-nearest-
  // point field.
  //
  // Returns the two nearest distances. Their DIFFERENCE is near zero exactly on the border
  // between two cells and nowhere else, which is the lane; inside a cell it is large.
  //
  // EIGHT cells, not twenty-seven. The exact version searches the full 3x3x3 neighbourhood
  // and it measured +3.1ms on the low tier and +2.6ms on the high one - a fifth of the frame
  // for a texture that is deliberately subtle. The two nearest centres are, in practice,
  // in the octant the sample leans toward, so that is the octant this searches: its own cell
  // and the seven neighbours on the side it is nearest to.
  //
  // It can pick a wrong second-nearest where three cells nearly meet. On a warped field at
  // this contrast that is a lane a pixel wide being a shade off, and the frame time is worth
  // more than that.
  vec2 worley(vec3 p){
    vec3 i = floor(p), f = fract(p);
    vec3 s = step(vec3(0.5), f) * 2.0 - 1.0;
    float f1 = 9.0, f2 = 9.0;
    for (int a = 0; a < 2; a++)
    for (int b = 0; b < 2; b++)
    for (int c = 0; c < 2; c++) {
      vec3 g = vec3(float(a) * s.x, float(b) * s.y, float(c) * s.z);
      vec3 o = vec3(hash(i + g), hash(i + g + 11.3), hash(i + g + 27.7));
      float d = length(g + o - f);
      if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) { f2 = d; }
    }
    return vec2(f1, f2);
  }
`;

// Slightly wobbling edge — the silhouette breathes so it's not a hard circle.
const sunVert = /* glsl */ `
  uniform float uTime;
  varying vec3 vPos;
  varying vec3 vNormal;
  ${NOISE_GLSL}
  void main() {
    vPos = position;
    vNormal = normalize(normalMatrix * normal);
    // P7: 0.12 -> 0.03. This vertex wobble was the last fast clock in the sun and it was
    // the one actually driving the surface's decorrelation - it displaces EVERY vertex
    // radially, not just the silhouette, so the whole texture swims in screen space while
    // the shader's own time terms sit twenty times slower. Measured: slowing the fragment
    // clocks twice moved the granulation half-life 4.407s -> 4.408s, i.e. not at all.
    // SUN-2's C3 wants a live limb and is measured against this term, so it is slowed by
    // four rather than by twenty, and C3 must be re-measured before this stage is signed.
    // SUN-ALIVE: the radial wobble is gone. It moved every vertex, so the whole face swam and
    // the loops' roots came loose from it; the living edge is now the spicule fringe in the
    // corona. Kept at zero rather than deleted so the note above still has its subject.
    float d = 0.5;
    // 0.09 -> 0.13. With the bloom no longer smeared across the limb the silhouette is
    // measured against the geometry itself rather than the glow around it, and the same
    // displacement that read as 1.55% of the radius through the haze reads as 1.16%
    // without it. The edge did not get calmer; it stopped being flattered.
    vec3 displaced = position + normal * (d - 0.5) * 0.08;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;
// Two-octave flowing plasma. HDR (>1) output so Bloom + God Rays catch it.
const sunFrag = /* glsl */ `
  uniform float uTime;
  uniform float uPulse;
  varying vec3 vPos;
  varying vec3 vNormal;
  ${NOISE_GLSL}
  void main() {
    // SUN-2, and this is the change that decides whether it reads as a star at all.
    //
    // At 2.4 the base octave completes about seven cycles across the disc: continent-sized
    // soft blotches. Looking at the crop rather than the statistic is what caught it - the
    // sun read as a pale moon, mottled at a scale no photograph of a star has, and no amount
    // of exposure or fine grain fixes a structure that is simply the wrong size. Doubled, it
    // is about fourteen, and the weight moves to the finer of the two so the big shapes stop
    // dominating the face.
    vec3 p = vPos * 4.6;
    // The large scale keeps its job and loses its dominance: real photospheres do vary in
    // brightness across the disc, but slowly and gently, and it was this term - a cloud -
    // that the whole surface was reading as.
    float slow = fbm(p + vec3(0.0, uTime*0.008, 0.0));
    float fast = fbm(p*2.6 - vec3(0.0, uTime*0.024, uTime*0.008));
    float big = slow*0.55 + fast*0.45;

    // THE GRANULATION. ~36 cells across the disc, which is what a photograph of the sun
    // shows at this size; the sun's own are far finer than any screen could resolve, and
    // drawing them at their true scale is drawing grey.
    // WARPED, or it reads as crackle. An unwarped Voronoi is a regular pavement - even
    // cell sizes, even lane widths, the look of dried mud rather than plasma. Pushing the
    // sample point around with the large-scale field first breaks the regularity in both
    // size and shape, and costs one extra noise lookup.
    // SUN-ALIVE: the warp itself flows, so granules are carried along instead of only fading.
    vec3 warp = vec3(slow - 0.5, fast - 0.5, noise(p * 1.9 + vec3(7.3, 0.0, uTime * 0.05)) - 0.5) * 1.5;
    vec2 w = worley(vPos * 17.0 + warp + vec3(0.0, uTime * 0.00042, uTime * 0.0006));
    // Bright inside the cell, dark in the narrow lane where the two nearest centres are
    // equidistant. The upper edge is deliberately low - a wide smoothstep here paints fat
    // grey borders and the pavement turns back into cloud.
    // Wide and SHALLOW. A narrow window with a big weight draws a net over the disc - the
    // contrast between a real granule and its lane is maybe a fifth of the disc's range, not
    // half of it, and at half the surface reads as a lychee skin rather than as plasma.
    float cells = smoothstep(0.0, 0.46, w.y - w.x);
    // A little variation between neighbouring granules, so the pavement is not one tone.
    // P7: 12 -> 15 here and in the worley call above, and they must move together or the
    // per-cell tint stops lining up with the cells it is tinting. The power spectrum put
    // the grain at 2.37% of the disc diameter against S1's 1-2%; 12/15 scales that to about
    // 1.9%. The reference's real granule is 0.066%, which at this disc size is half a pixel
    // - the target is the finest grain that survives being drawn, not the true one.
    float perCell = hash(floor(vPos * 17.0 + 0.5)) * 0.07;

    // The LEVEL matters as much as the pattern. The cell term sits near 1 over most of a
    // granule and the large scale averages 0.5, so the first balance put n's mean near 0.77
    // - past the hot stop across nearly the whole disc, and the surface went pale again
    // exactly as it had with the old ramp. These weights put the mean near 0.49, where the
    // amber lives, and leave the hot stop for the brightest cells.
    // P7, 2026-08-17. MEASURED, not adjusted by eye: the rendered disc was analysed two
    // ways and they disagreed by 140% - autocorrelation found structure at 12.9% of the
    // disc diameter, the power spectrum at 2.26%. That is not noise in the instrument, it
    // is two structures, and the coarse one was winning: the big field carried weight 0.34
    // the cells' 0.12, nearly three times as much. The golf-ball reading is that term.
    // Raising the cell FREQUENCY - the obvious fix - would only have produced a finer golf
    // ball, because it does not touch which structure the eye lands on. The weights are
    // swapped instead, and the constant is trimmed to hold n's mean near 0.5 where the
    // amber lives, since the level decides the ramp stop as much as the pattern does.
    // SUN-4: the pavement stops leading. At 0.28 the cells carried the face and it read as
    // cobblestone - the owner's own word for it was a "grainy speckle" on an orange-brown ball.
    // Broad thermal patches now lead (0.18 -> 0.34) and the cells become a texture inside
    // them (0.28 -> 0.15), so at thumbnail size the disc resolves into large warm shapes and the
    // granules only appear when you look for them. The constant follows so n keeps its mean
    // near 0.47, where the ramp below puts the gold.
    float n = 0.20 + big * 0.36 + cells * 0.09 + perCell * 0.5;
    // SUN-2. The surface had the large blotches and nothing else - measured, its
    // high-frequency energy was 1.3 luminance units against 6.5 for the large structure, and
    // that is what makes a photographed sun read as smooth instead of boiling. A detail
    // octave at 10x the surface frequency, drifting SLOWLY and across the other two rather
    // than with them, so the three do not read as one sheet sliding.
    // Kept at the SAME absolute frequency it had before the base was doubled - 62 times the
    // surface position, not 26 times a base that has itself moved - or the two octaves would
    // have converged and there would be no separation between the cells and their grain.
    // Sub-cell texture, on top of the pavement rather than instead of it. Smaller than it
    // was: the cells now carry the structure, and this only stops each granule from being a
    // flat plate.
    // P7: every time term above and below divided by twenty. The granulation's measured
    // half-life was 0.657 SECONDS - the surface boiled away in under a second, which reads
    // as shimmer rather than as a live photosphere. The real sun halves in 252s; the
    // criterion asks for 6-20s, because a visitor should see it move without waiting four
    // minutes for it.
    float gr = grain(p*13.6 + vec3(uTime*0.00162, -uTime*0.0018, uTime*0.0012));
    n += (gr - 0.5) * 0.22;
    // SUN-3. THE defect this stage exists for, and it was not in this shader's structure -
    // it was in these nine numbers.
    //
    // Measured on the render: the sun's red channel came out 225 of 255 across ONE HUNDRED
    // PERCENT of the disc, standard deviation 0.31. Every bit of shading the shader
    // computes - the granulation, the limb darkening below, the plasma flow - existed only
    // in green and blue, because red had no room left to move in. A sphere whose brightest
    // channel is a flat plateau cannot read as a sphere, and that is the whole of "it looks
    // clunky": not the silhouette (measured at 0.97% rms, which is what it should be), not
    // the granulation (which is there), but a face with no falloff across it.
    //
    // Two things did it, and B3 set up both while chasing a real problem:
    //
    //  - the mid and hot stops BOTH had red at 1.00, so from the mid stop upward the ramp
    //    had no red gradient left to give at all;
    //  - at 1.5x exposure that put the exposed red at 1.16-1.85, which is deep in ACES's
    //    shoulder. Simulated over the pipeline, a 10% brightness change there moves the
    //    output 3 of 255; at 0.6 linear the same change moves 7. The limb darkening below
    //    really does cut linear red by 37% from centre to limb - and 37% arrived at the
    //    screen as 0.2%.
    //
    // B3's reasoning was sound for the frame it was written against ("ACES desaturates its
    // highlights toward white, so push the source more saturated"). The step it missed is
    // that pushing a colour PAST the shoulder does not keep it saturated, it freezes it:
    // the gold stops being a colour the surface has and becomes a ceiling it rests on.
    //
    // So the stops are desaturated to 62% and scaled to 56%, which puts the whole disc back
    // on the part of the curve that has slope. Measured on the render: the disc's mean moves
    // from sRGB (216, 141, 87) to (186, 124, 89) and, far more to the point, red stops being
    // a plateau - it now runs 208 at the centre to 174 at the limb where it used to run 225
    // to 225. Dimmer, and for the first time shaded.
    //
    // The dimming is not a side effect to be tuned away, it IS the fix: on this pipeline a
    // sun bright enough to sit in ACES's shoulder is a sun with no shading, and the two
    // cannot both be had. How bright it should be from here is the owner's call, not a
    // measurement - the criteria constrain the gradient, never the level.
    // SUN-4: the dark and mid stops leave brown for amber-gold. The owner read the disc as a
    // flat orange-brown ball; a photosphere is white-gold at its heart and only turns amber
    // toward the limb, and the limb tint below now supplies that. Red stays under the
    // shoulder (mid red 0.56 x 1.5 = 0.84) so SUN-3's gradient survives.
    vec3 dark = vec3(0.400, 0.185, 0.075);
    vec3 mid  = vec3(0.700, 0.430, 0.170);
    // The hot stop is the one place red should NOT lead: a hotter patch of a photosphere is
    // whiter, not redder. Red barely rises from the mid stop while green doubles.
    // P7: 0.510,0.419,0.267 -> 0.690,0.566,0.361, the same hue scaled by 1.35.
    //
    // SUN-3 dimmed everything to get red off its plateau, and that was right, but it left
    // the core at 212 of 255 where S2 asks for 240. The lever is the HOT stop rather than
    // the exposure: exposure lifts the limb with the centre and flattens the very gradient
    // SUN-3 recovered, while the hot stop moves only the brightest cells - the limb sits
    // low on the ramp and does not follow. So S2 and S4 move the same way for once, which
    // is why this is tried before anything cleverer.
    vec3 hot  = vec3(1.035, 0.849, 0.541);
    // SUN-2: the lanes between the cells go deeper and the ramp starts earlier, so the dark
    // stop is actually reached somewhere on the disc instead of being a limit the surface
    // approaches. (SUN-3 note: that pass left the HOT stop alone on the grounds that B3 had
    // measured the gold surviving ACES at exactly those values. It had - but "survives ACES"
    // and "is past the point where ACES still has slope" turned out to be the same place.)
    // The ramp's windows move UP. n centres near 0.5, so with the old windows almost the
    // whole disc sat at or past the mid stop and the surface came out one flat cream tone -
    // "not rich enough", and correctly so: a photographed sun is mostly deep amber with the
    // bright cells as a minority. Now most of the face lives between the dark and mid stops,
    // and the hot stop is reserved for the cells that have actually earned it.
    vec3 col = mix(dark, mid, smoothstep(0.34, 0.74, n));
    // P7: the hot window drops from (0.74, 0.94) to (0.56, 0.76), and this is a repair of
    // a defect THIS STAGE introduced. Rebalancing the surface weights - the coarse field
    // down to 0.18, the cells up to 0.28 - also lowered n's ceiling: its realistic maximum
    // is about 0.745, so the hot stop sat just outside the range the surface can reach and
    // was effectively unreachable. The proof was flat: scaling the hot stop by 1.35 changed
    // the rendered core peak by exactly zero, 212 of 255 before and after, to the last
    // decimal of every measurement. A constant that can be changed by a third with no
    // effect on a pixel is not being used.
    col = mix(col, hot, smoothstep(0.56, 0.76, n));
    // SUN-2 limb darkening. The exponent was 0.35, which holds the term above 0.9 across
    // most of the disc and then falls off a cliff in the last few percent of the radius: the
    // rendered limb measured 1.006x the centre's luminance, i.e. no sphericity at all. At
    // 0.6 the darkening is spread across the disc, which is the term that makes a flat
    // circle read as a ball.
    float ndv = max(dot(vNormal, vec3(0.0,0.0,1.0)), 0.0);
    // SUN-3: exponent 0.6 -> 1.0, floor 0.26 -> 0.32.
    //
    // The earlier note here blamed Bloom for the darkening "arriving as 6%". It was not
    // Bloom - toggled off with everything else held, Bloom moved the limb ratio by 0.001.
    // It was GOD RAYS, which smear the source radially and so paint the bright centre back
    // out across the limb; see the weight constant in Effects.tsx. Worth recording because
    // the wrong culprit had this term chasing a number it could not reach, which is how it
    // ended up as a cliff in the last tenth of the radius with the inner 70% varying by 2%.
    //
    // With the real cause fixed and red free to move, the exponent does what it says: near
    // 1.0 this is close to the linear I(mu) = a + b*mu a real photosphere follows, and the
    // falloff is spread across the whole face instead of piled at the edge.
    //
    // NOTE on how this is measured: the visible limb is NOT ndv = 0. For a sphere of radius
    // 1.5 seen from 10.65 the tangent point sits at ndv = r/d = 0.141, so the disc spans
    // 1.0 down to 0.141 and no further. Reading it as the orthographic sqrt(1 - r^2) makes
    // the predicted limb far darker than the renderer's, and that error spent a round
    // looking like a mystery term somewhere in the post chain.
    float limb = pow(ndv, 1.0);
    // Exposure rationale lives with SUN_EMISSIVE_EXPOSURE in photometry.ts.
    // glslFloat, not toFixed: see its comment - one guarantees the decimal point, the
    // other also rounds the value away.
    // P7: the limb floor drops 0.32 -> 0.20. S4 wants limb/centre at or under 0.75 and it
    // measured 0.800; the geometric term at the r 0.90-0.97 annulus is about 0.56, so the
    // gap is what bloom, the god rays and the corona put back. Deepening the floor darkens
    // the limb WITHOUT touching the centre, so it moves S4 and leaves S2 alone - the same
    // reason the hot stop was the right lever for S2.
    // SUN-4: two sunspots, attached to the sphere (object space) so they ride the rotation.
    // Penumbra and a darker umbra, irregular edge from the granule field; together well under
    // 1% of the disc. They give the face a scale and an "organised" activity: without them
    // every patch of the surface is equally important, which is what makes it read as a material.
    vec3 pd = normalize(vPos);
    float spot = 1.0;
    {
      float d1 = length(pd - normalize(vec3(0.42, 0.30, 0.86))) / 0.115;
      float d2 = length(pd - normalize(vec3(-0.30, -0.22, 0.93))) / 0.075;
      d1 *= 0.9 + 0.2 * cells; d2 *= 0.9 + 0.2 * cells;
      spot *= 1.0 - 0.42 * (1.0 - smoothstep(0.50, 1.0, d1)) - 0.45 * (1.0 - smoothstep(0.20, 0.45, d1));
      spot *= 1.0 - 0.42 * (1.0 - smoothstep(0.50, 1.0, d2)) - 0.45 * (1.0 - smoothstep(0.20, 0.45, d2));
    }
    col *= spot;
    // SUN-ALIVE: local flare-ups. A 3D noise swept through time at ~3 s per feature: blobs
    // swell, burn white-hot above the bloom threshold and fade, each in its own place and at
    // its own moment. This replaces the global pulse (one brightness for the whole ball),
    // which is what "burning" is not.
    float evn = noise(pd * 12.0 + vec3(0.0, 0.0, uTime * 0.33));
    float ev = smoothstep(0.70, 0.90, evn) * smoothstep(0.30, 0.60, n) * spot;
    col = mix(col, hot, ev * 0.35) * (1.0 + 1.2 * ev);
    col *= (${glslFloat(SUN_EMISSIVE_EXPOSURE)} + uPulse) * mix(0.09, 1.0, limb);
    // SUN-4: the limb is cooler as well as darker - blue and then green fall away faster than
    // red, so the rim turns amber instead of just grey-orange. Red is untouched on purpose.
    // SUN-HOT: the rim goes deeper red-orange (Elad: "flat orange, not burning").
    col *= mix(vec3(1.0, 0.48, 0.20), vec3(1.0), smoothstep(0.10, 0.75, limb));
    // SUN-HOT: the core burns toward yellow-white. Brighter and less saturated in the inner
    // half of the disc only, so the centre-to-rim gradient deepens instead of lifting the
    // whole ball. Targets (measured on screen): centre R,G >= 245, B >= 170, hue at the rim
    // <= 20 deg, centre >= 1.8x rim luminance, < 15% of the centre burnt to white.
    float core = smoothstep(0.45, 1.0, limb);
    col *= 1.0 + 0.8 * core;
    col = mix(col, vec3(max(col.r, col.g)) * vec3(1.0, 0.93, 0.74), 0.45 * core);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const SUN_R = 1.5;

// R2.2 milky-halo fix. A bisection (Debug HUD + corner luminance) showed the washed
// "milky halo" around the sun on arrival — worst on mobile — came from the additive gold
// corona SHELL (scale 1.28) being amplified by Bloom into a large pale disc, with the soft
// outer halo SPRITE (scale 4.4) secondary. Both off: Bloom alone gives a tight natural
// glow and the system sits in dark space (corners <10% lum, measured).
const SHOW_HALO_SPRITE = false;  // big soft gold disc (scale 4.4) - milky-halo contributor
const SHOW_CORONA_SHELL = false; // corona backside shell (scale 1.28) - primary milky-halo source
// SUN-2: OFF. The streak is drawn across the disc, and on the old cloudy surface nobody
// could tell. On a granular one it reads as a bright horizontal line cutting the star in
// half - toggled off and on with everything else held, and the line goes with it. A real
// anamorphic flare extends past a light source; it does not draw a stripe through it.
// The sprite itself is kept, so restoring it is one word if the owner wants it back.
const SHOW_ANAMORPHIC = false;   // short horizontal gold streak - it crossed the disc

/**
 * Solar prominences - magma loops that belong to the sphere.
 *
 * SUN-4. Earlier builds drew each loop as a flat sprite billboarded to the camera, so when the
 * view moved the arches slid around the limb like stickers on the glass. Each loop is now real
 * geometry in the sun's own frame (it turns with the surface): two feet on the sphere, three
 * nested tube strands rising between them, seen correctly from any angle and hidden by the
 * sphere's depth test when they stand behind it. A life is ~30-44 s: the plasma FILLS the loop
 * from both feet upward (the crest lights last), holds while the strands sway and bright knots
 * creep along them, then drains from the crest back down to the feet. Nothing scales as a whole,
 * so nothing reads as a bubble inflating. The tube is soft-edged toward its silhouette (view
 * angle) so it reads as glowing plasma, not a wire.
 */
const PROM_COUNT = 3;
const PROM_STRANDS = 3;
const PROM_SEG = 48;
const PROM_RING = 6;
const smooth01 = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
const promVert = /* glsl */ `
  attribute float aU;
  attribute float aK;
  varying vec3 vN;
  varying vec3 vV;
  varying float vU;
  varying float vK;
  varying vec3 vW;
  void main() {
    vU = aU; vK = aK;
    vN = normalMatrix * normal;
    vW = (modelMatrix * vec4(position, 1.0)).xyz;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;
const promFrag = /* glsl */ `
  uniform float uTime;
  uniform float uFill;
  uniform float uSeed;
  uniform vec3 uSunC;
  uniform float uSunR;
  varying vec3 vN;
  varying vec3 vV;
  varying float vU;
  varying float vK;
  varying vec3 vW;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  void main() {
    float m = 1.0 - abs(2.0 * vU - 1.0);            // 0 at the feet, 1 at the crest
    float t = uTime;
    float wob = vnoise(vec2(vU * 5.0 + vK * 3.1 + uSeed, t * 0.10)) - 0.5;
    // the plasma fills from the feet upward and drains from the crest downward, with a ragged front
    float edge = uFill * 1.35 - 0.25;
    float vis = 1.0 - smoothstep(edge - 0.2, edge, m + 0.14 * wob);
    float dir = mod(vK, 2.0) < 0.5 ? 1.0 : -1.0;
    // SUN-ALIVE: the knots travel ~0.25 of the arc per second (was 0.03), so plasma is seen
    // running along the loop instead of a lit wire slowly changing its pattern.
    float n = 0.65 * vnoise(vec2(vU * 6.0 - t * 1.6 * dir + uSeed + vK * 7.0, vK * 2.0 + t * 0.05))
            + 0.35 * vnoise(vec2(vU * 15.0 - t * 3.5 * dir + uSeed * 1.7, vK * 5.0 + t * 0.09));
    float bright = 0.5 + 1.0 * smoothstep(0.25, 0.8, n);
    bright *= 1.0 + 0.9 * pow(1.0 - m, 3.0);        // footpoints pool brighter
    float fr = pow(clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0), 1.4);
    float hot = clamp((bright - 0.7) * 0.9, 0.0, 1.0);
    vec3 col = mix(vec3(0.95, 0.24, 0.07), vec3(1.0, 0.50, 0.20), hot);
    // SUN-ALIVE: drawn only OUTSIDE the disc as the camera sees it. Additive light laid over
    // the face read as a loop seen THROUGH the sun (owner, 2026-09-26). Per fragment: the
    // viewing ray's closest approach to the sun's centre, against the sun's radius.
    vec3 rd = normalize(vW - cameraPosition);
    vec3 sc = uSunC - cameraPosition;
    float miss = length(sc - rd * dot(sc, rd));
    float outside = smoothstep(uSunR, uSunR * 1.012, miss);
    gl_FragColor = vec4(col * fr * bright * vis * outside * 0.55, 1.0);
  }
`;
const _pt = new THREE.Vector3();
const _pb = new THREE.Vector3();
const _pp = new THREE.Vector3();
const _pq = new THREE.Vector3();
const _pT = new THREE.Vector3();
const _pn = new THREE.Vector3();
const _pr = new THREE.Vector3();
const _pv = new THREE.Vector3();
const _sunW = new THREE.Vector3();
const _yAxis = new THREE.Vector3(0, 1, 0);
function makePromGeometry() {
  const per = PROM_SEG + 1;
  const nv = PROM_STRANDS * per * PROM_RING;
  const g = new THREE.BufferGeometry();
  const aU = new Float32Array(nv);
  const aK = new Float32Array(nv);
  const idx: number[] = [];
  for (let k = 0; k < PROM_STRANDS; k++) {
    for (let i = 0; i <= PROM_SEG; i++) {
      for (let j = 0; j < PROM_RING; j++) {
        const v = (k * per + i) * PROM_RING + j;
        aU[v] = i / PROM_SEG;
        aK[v] = k;
        if (i < PROM_SEG) {
          const v2 = (k * per + i + 1) * PROM_RING + j;
          const j2 = (j + 1) % PROM_RING;
          const va = (k * per + i) * PROM_RING + j2;
          const vb = (k * per + i + 1) * PROM_RING + j2;
          idx.push(v, v2, vb, v, vb, va);
        }
      }
    }
  }
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
  g.setAttribute('aU', new THREE.BufferAttribute(aU, 1));
  g.setAttribute('aK', new THREE.BufferAttribute(aK, 1));
  g.setIndex(idx);
  return g;
}
const STRAND_H = [1.0, 0.82, 0.66];
const STRAND_SPAN = [1.0, 0.9, 0.8];
const STRAND_SIDE = [0.0, 0.25, -0.25];
const STRAND_RAD = [1.0, 0.8, 0.65];
/** Writes one loop's tubes into g: feet at +-span/2 around surface point c, plane spanned by c and t. */
function fillPromGeometry(g: THREE.BufferGeometry, c: THREE.Vector3, t: THREE.Vector3, span: number, height: number, lean: number, time: number, seed: number) {
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const nor = g.getAttribute('normal') as THREE.BufferAttribute;
  _pb.crossVectors(t, c).normalize();
  const per = PROM_SEG + 1;
  const theta = span / SUN_R / 2;
  for (let k = 0; k < PROM_STRANDS; k++) {
    for (let i = 0; i <= PROM_SEG; i++) {
      const u = (i / PROM_SEG) * 2 - 1;
      const bump = 1 - u * u;
      const sway = Math.sin(u * 3.1 + time * 0.23 + seed + k * 1.7);
      const phi = u * theta * STRAND_SPAN[k] + lean * bump + 0.02 * sway * bump;
      const r = SUN_R * (0.965 + height * STRAND_H[k] * Math.pow(bump, 0.7) * (1 + 0.06 * Math.sin(time * 0.31 + seed + k)));
      const side = STRAND_SIDE[k] * SUN_R * 0.05 * bump + 0.005 * SUN_R * Math.sin(u * 4 + time * 0.19 + k * 2.3 + seed) * bump;
      _pp.copy(c).multiplyScalar(Math.cos(phi)).addScaledVector(t, Math.sin(phi)).multiplyScalar(r).addScaledVector(_pb, side);
      // tangent by a small step along u
      const u2 = u + 0.02;
      const bump2 = 1 - u2 * u2;
      const phi2 = u2 * theta * STRAND_SPAN[k] + lean * bump2 + 0.02 * Math.sin(u2 * 3.1 + time * 0.23 + seed + k * 1.7) * bump2;
      const r2 = SUN_R * (0.965 + height * STRAND_H[k] * Math.pow(Math.max(bump2, 0), 0.7) * (1 + 0.06 * Math.sin(time * 0.31 + seed + k)));
      _pq.copy(c).multiplyScalar(Math.cos(phi2)).addScaledVector(t, Math.sin(phi2)).multiplyScalar(r2).addScaledVector(_pb, side);
      _pT.subVectors(_pq, _pp).normalize();
      _pn.crossVectors(_pb, _pT).normalize();
      const rad = SUN_R * 0.011 * STRAND_RAD[k] * (1 + 0.7 * Math.pow(1 - bump, 3) + 0.18 * Math.sin(u * 9 + time * 0.4 + k));
      for (let j = 0; j < PROM_RING; j++) {
        const al = (j / PROM_RING) * Math.PI * 2;
        _pr.copy(_pb).multiplyScalar(Math.cos(al)).addScaledVector(_pn, Math.sin(al));
        const v = (k * per + i) * PROM_RING + j;
        pos.setXYZ(v, _pp.x + _pr.x * rad, _pp.y + _pr.y * rad, _pp.z + _pr.z * rad);
        nor.setXYZ(v, _pr.x, _pr.y, _pr.z);
      }
    }
  }
  pos.needsUpdate = true;
  nor.needsUpdate = true;
}
function Prominences({ spin }: { spin: React.RefObject<THREE.Mesh | null> }) {
  const group = useRef<THREE.Group>(null);
  const geos = useMemo(() => Array.from({ length: PROM_COUNT }, () => makePromGeometry()), []);
  const uniforms = useMemo(
    () => Array.from({ length: PROM_COUNT }, (_, i) => ({ uTime: { value: 0 }, uFill: { value: 0 }, uSeed: { value: i * 17.3 }, uSunC: { value: new THREE.Vector3() }, uSunR: { value: SUN_R } })),
    [],
  );
  const life = useMemo(() => {
    const rnd = makeRng(SEED.prominences);
    return Array.from({ length: PROM_COUNT }, (_, i) => ({
      len: 30 + rnd() * 14,
      offset: (i / PROM_COUNT) * 34 + rnd() * 6,
    }));
  }, []);
  // Where each loop stands, chosen ONCE per life and then fixed to the surface: roots never slide.
  const placed = useRef(Array.from({ length: PROM_COUNT }, () => ({
    cycle: -1, c: new THREE.Vector3(), t: new THREE.Vector3(), span: 0, big: 0, lean: 0,
  })));
  const clk = useRef(0);
  useFrame((state, dt) => {
    // Own clock: the scene's elapsedTime restarts when the act mounts, and every phase here
    // (fill, sway, knots) jumped with it. This one only ever moves forward, and only smoothly.
    clk.current += Math.min(dt, 0.1);
    const t = clk.current;
    const g = group.current;
    if (!g) return;
    // The loops turn with the surface they stand on.
    if (spin.current) g.rotation.y = spin.current.rotation.y;
    g.updateMatrixWorld();
    g.getWorldPosition(_sunW);
    const sunRw = SUN_R * g.getWorldScale(_pr).x;
    // The camera's direction in the loops' own (spinning) frame. SUN-4 assumed the resting
    // camera sat on +Z; any orbit broke both the placement and the fade built on it.
    _pv.copy(state.camera.position);
    g.worldToLocal(_pv).normalize();
    const rate = HUD_AVAILABLE && SPIN_PINNED ? 0 : 0.03;
    for (let i = 0; i < PROM_COUNT; i++) {
      const L = life[i];
      const u = (t + L.offset) / L.len;
      const cycle = Math.floor(u);
      const ph = u - cycle;
      const P = placed.current[i];
      if (P.cycle !== cycle) {
        P.cycle = cycle;
        // Each cycle re-rolls where the loop stands and how big it is, deterministically.
        const rnd = makeRng(SEED.prominences + i * 7919 + cycle * 104729);
        // On the limb as the camera sees it NOW, a little in front of or behind it...
        _pt.set(0, 1, 0).cross(_pv);
        if (_pt.lengthSq() < 1e-4) _pt.set(1, 0, 0);
        _pt.normalize();
        _pb.crossVectors(_pv, _pt);
        const az = rnd() * Math.PI * 2;
        const zc = (rnd() - 0.5) * 0.24;
        const rr = Math.sqrt(1 - zc * zc);
        P.c.copy(_pt).multiplyScalar(rr * Math.cos(az)).addScaledVector(_pb, rr * Math.sin(az)).addScaledVector(_pv, zc);
        // ...carried back by the turn still to come before mid-life, so it stands in profile then.
        P.c.applyAxisAngle(_yAxis, -rate * L.len * (0.5 - ph)).normalize();
        const psi = rnd() * Math.PI * 2;
        P.big = rnd() < 0.2 ? 0.4 : 0.1 + rnd() * 0.12;
        P.span = SUN_R * (0.18 + rnd() * 0.24);
        P.lean = (rnd() - 0.5) * 0.1;
        _pt.set(0, 1, 0).cross(P.c);
        if (_pt.lengthSq() < 1e-4) _pt.set(1, 0, 0);
        _pt.normalize();
        _pb.crossVectors(P.c, _pt);
        P.t.copy(_pt).multiplyScalar(Math.cos(psi)).addScaledVector(_pb, Math.sin(psi)).normalize();
      }
      // The third loop is the occasional one: it sits out about a third of the time.
      const present = i < 2 ? 1 : smooth01((Math.sin(cycle * 2.399 + i) + 0.4) * 2);
      // No on-disc fade any more: the shader hides exactly the fragments that cover the disc.
      const fill = smooth01(ph / 0.4) * smooth01((1 - ph) / 0.4) * present * smooth01(t / 8);
      fillPromGeometry(geos[i], P.c, P.t, P.span, P.big * (0.5 + 0.5 * smooth01(ph / 0.5)), P.lean, t, i * 17.3 + cycle * 3.1);
      const un = ((g.children[i] as THREE.Mesh).material as THREE.ShaderMaterial).uniforms;
      un.uTime.value = t;
      un.uSeed.value = i * 17.3 + cycle * 3.1;
      un.uFill.value = fill;
      un.uSunC.value.copy(_sunW);
      un.uSunR.value = sunRw;
      (g.children[i] as THREE.Mesh).visible = fill > 0.001;
    }
  });
  return (
    <group ref={group}>
      {geos.map((geo, i) => (
        <mesh key={i} geometry={geo} frustumCulled={false}>
          <shaderMaterial vertexShader={promVert} fragmentShader={promFrag} uniforms={uniforms[i]} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * SUN-4: the inner corona - a thin, uneven halo attached to the limb, out to 1.45 R. Astra's
 * critique of the resting sun was that its emission stopped dead at the surface; bloom alone
 * gives a soft smear, not a corona. Two exponentials (a tight bright one hugging the limb, a
 * wide faint one), three broad wisps that drift over 11-17 s, faded to zero by the outer edge.
 * The R2.2 milky-halo defect was a 1.28x SHELL and a 4.4x sprite, both far larger and far more
 * even than this; S3 (corona >= 2x the sky) and R2.2's corner block are the guards.
 */
const _coronaCentre = new THREE.Vector3();
const _coronaDir = new THREE.Vector3();
const CORONA_OUTER = 1.45;
const CORONA_GAIN = 0.5;
const SPICULE_GAIN = 1.4;
const _sunScale = new THREE.Vector3();
const coronaVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const coronaFrag = /* glsl */ `
  uniform float uTime;
  uniform float uGain;
  uniform float uSpic;
  varying vec2 vUv;
  ${NOISE_GLSL}
  void main() {
    vec2 q = (vUv - 0.5) * 2.0 * ${glslFloat(CORONA_OUTER)};   // radius in units of R
    float rho = length(q);
    if (rho < 1.0) discard;
    float th = atan(q.y, q.x);
    float e = rho - 1.0;
    float amp = 0.55 * exp(-e / 0.055) + 0.035 * exp(-e / 0.25);
    float wisp = 1.0 + 0.20 * sin(3.0 * th + uTime * 0.09) * sin(2.0 * th - uTime * 0.07 + 1.7);
    float fade = 1.0 - smoothstep(${glslFloat(CORONA_OUTER - 0.3)}, ${glslFloat(CORONA_OUTER)}, rho);
    vec3 col = mix(vec3(1.0, 0.94, 0.82), vec3(1.0, 0.77, 0.54), smoothstep(0.0, 0.25, e));
    // SUN-ALIVE: the spicule fringe. Short flame tongues standing on the limb, 1-4% of R
    // tall and a few px wide, each living ~1-2 s, with gaps between them so the edge is torn
    // rather than outlined. Seamless around the circle (3D noise on the direction, time as
    // the third axis) and HDR, so the bloom catches the tips.
    vec2 dir = q / rho;
    float sp = noise(vec3(dir * 22.0, uTime * 0.8));
    float tall = 0.020 + 0.050 * noise(vec3(dir * 9.0 + 3.1, uTime * 0.5));
    float h = clamp(e / tall, 0.0, 1.0);
    // The threshold rises with height, so each tongue narrows to a tip instead of a bead.
    float spic = smoothstep(0.52 + 0.30 * h, 0.90, sp) * (1.0 - h);
    vec3 fringe = vec3(1.0, 0.45, 0.15) * spic * uSpic;
    gl_FragColor = vec4(col * amp * wisp * fade * uGain + fringe, 1.0);
  }
`;
function Corona() {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uGain: { value: CORONA_GAIN }, uSpic: { value: SPICULE_GAIN } }), []);
  useFrame((state, dt) => {
    const m = mesh.current;
    if (m) {
      // SUN-ALIVE: the plane sits BEHIND the centre, so under perspective the sphere's
      // silhouette crosses it at more than 1 R (about 1.06 R at the overview). The corona was
      // drawn from 1.0 R, so its brightest band - and any fringe on it - was hidden behind the
      // disc. Scale the plane so its unit circle is exactly the silhouette as seen now.
      m.parent!.getWorldPosition(_coronaCentre);
      const rw = SUN_R * m.parent!.getWorldScale(_sunScale).x;
      const dist = Math.max(_coronaCentre.distanceTo(state.camera.position), rw * 1.05);
      const limb = ((dist + rw * 0.35) * (rw / Math.sqrt(dist * dist - rw * rw))) / rw;
      m.scale.setScalar(SUN_R * CORONA_OUTER * 2 * limb);
      // Face the camera POSITION, not its orientation: the sun is rarely on the view axis, and a
      // plane parallel to the view plane is tilted against the line to the sun, so its near half
      // rides in front of the sphere and paints a pale crescent over the disc (seen on the first
      // capture). It also sits a third of a radius behind the centre, so the sphere always wins
      // the depth test wherever the two are nearly level at the limb.
      m.parent!.getWorldPosition(_coronaCentre);
      _coronaDir.copy(_coronaCentre).sub(state.camera.position).normalize();
      // World offset, converted to the parent's frame: the group may be scaled or rotated.
      m.position.copy(m.parent!.worldToLocal(_coronaCentre.addScaledVector(_coronaDir, SUN_R * 0.35)));
      m.lookAt(state.camera.position);
    }
    if (mat.current) {
      const un = mat.current.uniforms;
      un.uTime.value += dt;
      // The halo breathes over ~12 s, two incommensurate sines so it never loops visibly. Most
      // of the glow around the disc is the disc's own bloom, so this alone moved the screen by
      // only 2.5-3%; the disc's slow pulse (Sun) uses the same sines and carries the rest.
      const tt = un.uTime.value;
      un.uGain.value = CORONA_GAIN * (1 + 0.18 * Math.sin(tt * 0.52) + 0.07 * Math.sin(tt * 0.21 + 2.0));
    }
  });
  return (
    <mesh ref={mesh} scale={SUN_R * CORONA_OUTER * 2}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial ref={mat} vertexShader={coronaVert} fragmentShader={coronaFrag} uniforms={uniforms} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** The burning sun: displaced plasma surface (HDR for Bloom/God Rays), fresnel
 *  corona, soft gold halo, living prominences and a slow pulse. Registers its mesh
 *  as the God Rays source. Its gold = the galaxy core's gold (one continuity). */
/** `?lamp=0.15` overrides SUN_LAMP_OVERVIEW_SCALE for one page load, so the overview's
 *  brightness can be chosen side by side instead of guessed. Read once, at import. */
const LAMP_OVERRIDE = (() => {
  if (typeof window === 'undefined') return null;
  const v = new URLSearchParams(window.location.search).get('lamp');
  if (v === null || v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
})();

export default function Sun() {
  const lampRef = useRef<THREE.PointLight>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const streakRef = useRef<THREE.Sprite>(null);
  const setSunMesh = useScene((s) => s.setSunMesh);
  const tex = useMemo(() => softSprite(), []);
  const streakTex = useMemo(() => streakSprite(), []);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uPulse: { value: 0 } }), []);
  // Driven through the live material — a memoised object is frozen to the React Compiler.
  const sunMat = useRef<THREE.ShaderMaterial>(null);
  const prevCam = useRef(new THREE.Vector3());
  const speed = useRef(0);

  useEffect(() => {
    setSunMesh(meshRef.current);
    return () => setSunMesh(null);
  }, [setSunMesh]);

  useFrame((_, dt) => {
    // The overview lights every world at once and read too bright; a focused world keeps the
    // lamp its own aperture was calibrated against. Eased so a focus change is not a pop.
    const l = lampRef.current;
    if (!l) return;
    // A departure scrub shows the overview while focus is still set, so the lamp follows the
    // same `departure` the camera and exposure do.
    const s = useScene.getState();
    const overview = LAMP_OVERRIDE ?? SUN_LAMP_OVERVIEW_SCALE;
    const dep = s.focusedPlanet ? Math.min(1, Math.max(0, s.departure)) : 1;
    const target = SUN_LAMP_INTENSITY * (1 + (overview - 1) * dep);
    l.intensity += (target - l.intensity) * Math.min(1, dt * 3);
    sunLampScale.value = l.intensity / SUN_LAMP_INTENSITY;
  });

  useFrame((state, dt) => {
    const u = sunMat.current?.uniforms;
    let pulse = 0;
    if (u) {
      u.uTime.value += dt;
      // Breathe on irregular slow noise + rare flare pulse (spec: sun is alive).
      const t = u.uTime.value;
      // SUN-ALIVE: +-25% -> a slow +-10% breath. The flicker now lives in local flare-ups in
      // the shader; this only feeds the bloom, which is most of the glow around the disc. Same
      // two sines as the corona's breath (Corona), so disc glow and halo swell together.
      pulse = 0.10 * Math.sin(t * 0.52) + 0.05 * Math.sin(t * 0.21 + 2.0);
      u.uPulse.value = pulse;
    }
    // Debug-only: a harness measuring how fast the SURFACE evolves has to stop the sun
    // spinning first. Measured on 2026-08-17: slowing every time term in the shader by
    // twenty barely moved the granulation half-life, 0.657s to 0.568s, because the
    // decorrelation was never coming from the shader. At 0.03 rad/s a point on the disc
    // travels about 3% of the radius per second, which is more than half a granule - so
    // the pattern was being carried off the sample point long before it could change.
    // With the spin pinned, a correlation measurement sees evolution and nothing else.
    // Absent from production builds exactly like the rest of the HUD surface.
    if (meshRef.current && !(HUD_AVAILABLE && SPIN_PINNED)) meshRef.current.rotation.y += dt * 0.03;

    // Camera speed in world units per second, damped. Drives the streak: light stretches
    // when the frame moves and eases back on braking.
    const v = dt > 1e-4 ? prevCam.current.distanceTo(state.camera.position) / dt : 0;
    prevCam.current.copy(state.camera.position);
    speed.current += (Math.min(v, 12) - speed.current) * Math.min(1, dt * 2.5);
    const s = streakRef.current;
    if (s) {
      const stretch = 1 + speed.current * 0.22;
      s.scale.set(7 * stretch, 0.6 + speed.current * 0.02, 1);
      (s.material as THREE.SpriteMaterial).opacity = 0.10 + Math.min(0.16, speed.current * 0.035) + pulse * 0.05;
    }
  });

  return (
    <group name="sun">
      {/* Lamp rationale and values live in photometry.ts. */}
      <pointLight ref={lampRef} position={[0, 0, 0]} intensity={SUN_LAMP_INTENSITY} distance={SUN_LAMP_DISTANCE} decay={SUN_LAMP_DECAY} color="#fff0dc" />
      {/* Plasma surface (the God Rays source) */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[SUN_R, 96, 96]} />
        <shaderMaterial ref={sunMat} vertexShader={sunVert} fragmentShader={sunFrag} uniforms={uniforms} toneMapped={false} />
      </mesh>
      <Prominences spin={meshRef} />
      <Corona />
      {/* Fresnel-ish corona shell */}
      {SHOW_CORONA_SHELL && (
        <mesh scale={1.28}>
          <sphereGeometry args={[SUN_R, 32, 32]} />
          <meshBasicMaterial color={CORE_GOLD} transparent opacity={0.12} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {/* Soft outer halo sprite - hugs the corona. Kept tight + low opacity so it reads
          as corona bloom, not a milky haze washing the frame (F3, worst on small/mobile
          viewports where the same sprite covers more of the frame). */}
      {SHOW_HALO_SPRITE && (
        <sprite scale={[4.4, 4.4, 1]}>
          <spriteMaterial map={tex} color={CORE_GOLD} transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
      )}
      {/* B5: the anamorphic streak. Was the round sprite stretched 8 x 0.28 - an ellipse,
          which has a waist, so it read as a bar laid across the sun instead of light
          bleeding sideways out of it. Now a purpose-drawn streak (thickest and brightest
          at the centre, thinning to nothing at both tips) whose length and brightness are
          driven by how fast the camera is moving: a lens flares harder when the frame is
          moving, and a constant streak is a decal. */}
      {SHOW_ANAMORPHIC && (
        <sprite ref={streakRef} scale={[7, 0.6, 1]}>
          <spriteMaterial map={streakTex} color={'#ffd9a0'} transparent opacity={0.13} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
      )}
    </group>
  );
}
