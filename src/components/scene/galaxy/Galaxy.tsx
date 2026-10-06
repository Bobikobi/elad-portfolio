'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { discVertexShader, discFragmentShader, starVertexShader, starFragmentShader } from './shaders';
import { makeRng, SEED } from '@/lib/rng';
import { loadBitmapTexture, type BitmapTextureLoad } from '@/lib/bitmapTexture';
import { useScene } from '@/lib/sceneStore';
import { HUD_AVAILABLE } from '../DebugHud';
import { DISC_R } from '@/lib/diveStar';
import { paletteStar, spriteStarFragment, spriteStarUniforms, spriteStarVertex } from './spriteStars';

/**
 * The galaxy act's disc: the Hubble photograph of M101 (ESA/Hubble heic0602, CC BY 4.0,
 * credited in the footer) laid on the disc plane, and a star field drawn from that same
 * photograph that takes its light over as the dive goes down. Owner, 2026-10-02, shown real
 * galaxies next to the procedural one: "I liked the direction". The procedural cloud and its
 * dust layer are kept at tag `attempt/2026-10-galaxy-procedural-bake`.
 *
 * Both layers turn together in one group, which stream 2 of #82 also puts the dive's
 * destination star in (`galaxyFrame.spin`).
 */

/** Same curve as GLSL smoothstep, on the CPU side. */
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const DISC_URL = '/images/galaxy/m101-disc-2048.webp';
// High tier only. 2048 texels over the disc come to about one per pixel at 2 units of height,
// where the photo still carries most of the dive's light.
const DISC_URL_HIGH = '/images/galaxy/m101-disc-4096.webp';
// The star field is sampled from a MAP x MAP readback: a cell is 0.025 units, finer than an
// arm's width and coarse enough to sample in about a second at the frame budget below.
const MAP = 512;
// Every tier samples the same 200k list; the low tier draws its first 40k. Tiers scale cost,
// never composition (DECISIONS 2026-07, the tier law).
const STARS_MAX = 200000;
const STARS_LOW = 40000;
// Stars land with probability Y^0.55 and each carries Y^0.45, so light per area still goes as
// Y (no brightness squared) while the faint outer disc the dive enters keeps enough stars to
// read as a field instead of a few sparks.
const GAMMA = 0.55;
// The stars' nominal share of the disc's light at rest, criterion M2 (5 +- 2% on screen). The
// photo foreshortens with the view (about 0.5 at the welcome elevation) and points do not, so
// the screen share runs above this. 0.026 was the geometric estimate and measured 7.1% (frame
// sums of ?gx=0,1 against ?gx=1,0, sky taken off, 2026-10-04); scaled down to land near 5.
const REST_STARS = 0.011;
// The thick-disc layer's share (buildHalo): it and REST_STARS split the 0.019 that measured M2
// at 5.4%, so the stars' share of the rest frame stays where M2 put it.
const HALO_SHARE = 0.008;
// Stars lifted out of the disc plane, and the height they are lifted by: a thick disc of 0.35
// thickening to 0.7 over the bulge. One count on every tier (composition law).
const HALO_N = 2500;
const HALO_H = 0.35;
// The sparkles (buildSparkles): soft stars of a fixed world size over the whole disc, visible
// from rest. Owner, 2026-10-05, of the dive's stars: they "are prettier than the galaxy itself",
// and appear only once the camera tilts - spread over the galaxy, they are the life it lacks.
// One count on every tier. They add light rather than take it from the photo, so M2 (the stars'
// share at rest, 5 +- 2%) was replaced by the owner with "at least twice the stars you can pick
// out at rest". `?spk=` in HUD builds is the sweep knob (below). Swept 2026-10-05 at radius 5
// (points picked out at rest, sparkles on / off, worst of 3 phases): 6000 at 0.5 added 1.3x;
// 12000 at 0.5, 1.5x; 2x took 16000-20000 at 0.8 and buried the photo's lanes under a snow of
// equal points. 12000 at 0.5 keeps the photo; the bigger disc (lib/diveStar) carries the rest
// (2.4-2.55x today's points). Steeper placement than the field's Y^0.55 is what puts them on the
// arms: their light follows the photo's at r 0.81 per cell (gamma 1.0: 0.61).
const SPARKLE_OPACITY_D = 0.5;
const SPARKLE_N_D = 12000;
const SPARKLE_SIZE_D = 0.07;
const SPARKLE_GAMMA_D = 1.5;
const SPARKLE_FADE_S = 1.5;
// rad/s: a turn every ten minutes, felt rather than watched.
const SPIN = 0.01;
// The turn eases to a stop at half a radian (time constant 50 s), so the dive's late path,
// which is laid on a knot of this disc (lib/diveStar), never moves further than was flown.
const SPIN_MAX = 0.5;
// World units: below half a pixel everywhere except the last unit of the dive, where a star
// passing the lens grows to the shader's size cap.
const STAR_SIGMA = 0.0015;
// Linear luminance of one star's brightest pixel. ACES displays 1.6 at about 230 of 255, so a
// single star never clips white and blooms.
const STAR_PEAK = 1.6;
// Camera height over the disc across which the stars take the light over (k = 0 above, 1 below).
// The welcome shot sits at 4.6; the dive is under 2.5 from its middle on.
const HANDOVER: [number, number] = [0.5, 2.5];
// A disc that arrives after the loader has lifted fades in over this, instead of popping.
const LOAD_FADE_S = 0.6;
// The 4096's GPU upload is one frame of 80-180 ms here (three production loads, 2026-10-04),
// and that frame used to land 70-90 ms after the reveal, in the middle of the loader's fade.
// It now waits for the welcome view to be still: this long after the reveal, with no scroll
// for HI_IDLE_S. At rest the scene moves well under a pixel in 180 ms, so the frozen frame
// cannot be seen; mid-dive it would be. A visitor who dives first keeps the 2048 until back
// at rest.
const HI_AFTER_REVEAL_S = 1.0;
const HI_IDLE_S = 0.5;
// Sampling runs inside the frame; 4 ms of a 16.7 ms frame leaves the render its time.
const SAMPLE_BUDGET_MS = 4;
// A star's colour is the photo's chromaticity, normalised to luminance 1. Dim cells are noisy
// and their ratio can run to 10+ in one channel; past 3 it is mixed toward white, which keeps
// its luminance at 1 and its hue.
const CHROMA_MAX = 3;
// 15% of stars are pulled half-way toward a hot blue-white and 15% toward an old amber, so the
// field has individual stars of distinct colour and not only the photo's average tint.
const NUDGE_SHARE = 0.15;
const NUDGE_MIX = 0.5;

const lum = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const unitLum = (r: number, g: number, b: number): [number, number, number] => {
  const y = lum(r, g, b);
  return [r / y, g / y, b / y];
};
const BLUE_WHITE = unitLum(0.52, 0.64, 1.0);
const AMBER = unitLum(1.0, 0.52, 0.21);

/**
 * HUD builds only. `?gx=photo,stars` scales the two layers (M2 measures `?gx=1,0` against
 * `?gx=0,1`); `?spin=` is the turn in rad/s (`?gr=`, the disc radius, is in lib/diveStar). Malformed values throw,
 * so a measurement can never silently run on the shipped constants.
 */
const hudParam = (name: string): string | null =>
  HUD_AVAILABLE && typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get(name) : null;
const GX: [number, number] = (() => {
  const v = hudParam('gx');
  if (!v) return [1, 1];
  const n = v.split(',').map(Number);
  if (n.length !== 2 || n.some((x) => !Number.isFinite(x) || x < 0)) {
    throw new Error(`Galaxy: ?gx must be photo,stars with both >= 0 - got "${v}"`);
  }
  return [n[0], n[1]];
})();
// The disc's radius lives in lib/diveStar (DISC_R), with the knot the dive flies into.
const R = DISC_R;
// Life at rest (owner, 2026-10-04: "not rich and alive enough"): how far the photo's grain
// scintillates (shaders.ts, discFragmentShader) and how far each star twinkles. `?life=s,t` in
// HUD builds is the sweep knob.
const SHIMMER = 0.8;
const TWINKLE = 0.35;
const LIFE: [number, number] = (() => {
  const v = hudParam('life');
  if (!v) return [SHIMMER, TWINKLE];
  const n = v.split(',').map(Number);
  if (n.length !== 2 || n.some((x) => !Number.isFinite(x) || x < 0 || x > 1)) {
    throw new Error(`Galaxy: ?life must be shimmer,twinkle in 0..1 - got "${v}"`);
  }
  return [n[0], n[1]];
})();
const SPIN_RATE = (() => {
  const v = hudParam('spin');
  if (v === null) return SPIN;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Error(`Galaxy: ?spin must be a rate >= 0 in rad/s - got "${v}"`);
  return n;
})();

// `?spk=opacity[,count[,gamma[,size]]]`: the sweep knob over the four sparkle constants.
const SPK: { opacity: number; n: number; gamma: number; size: number } = (() => {
  const d = { opacity: SPARKLE_OPACITY_D, n: SPARKLE_N_D, gamma: SPARKLE_GAMMA_D, size: SPARKLE_SIZE_D };
  const v = hudParam('spk');
  if (v === null) return d;
  const n = v.split(',').map(Number);
  if (n.length > 4 || n.some((x) => !Number.isFinite(x) || x < 0)) {
    throw new Error(`Galaxy: ?spk must be opacity[,count[,gamma[,size]]], all >= 0 - got "${v}"`);
  }
  return { opacity: n[0], n: Math.round(n[1] ?? d.n), gamma: n[2] ?? d.gamma, size: n[3] ?? d.size };
})();

// The forward ACES fit's matrices (ExposureToneMap.acesFilmic), inverted. Matrix3.set takes
// rows; the GLSL there lists the same matrices by column.
const MIN_INV = new THREE.Matrix3()
  .set(0.59719, 0.35458, 0.04823, 0.076, 0.90834, 0.01566, 0.0284, 0.13383, 0.83777)
  .invert();
const MOUT_INV = new THREE.Matrix3()
  .set(1.60475, -0.53108, -0.07367, -0.10208, 1.10813, -0.00605, -0.00327, -0.07276, 1.07602)
  .invert();

/** The JS twin of `invACES` in shaders.ts - change the two together. */
const invRRT = (y: number) => {
  const A = 1 - 0.983729 * y;
  const B = 0.0245786 - 0.432951 * y;
  const C = -(0.000090537 + 0.238081 * y);
  return (-B + Math.sqrt(Math.max(B * B - 4 * A * C, 0))) / (2 * A);
};
const TOE = invRRT(0);
function invAces(r: number, g: number, b: number, out: number[]) {
  const o = MOUT_INV.elements; // column-major: (M v)_i = sum_j e[j*3+i] v_j
  const m = MIN_INV.elements;
  r = Math.min(r, 0.97);
  g = Math.min(g, 0.97);
  b = Math.min(b, 0.97);
  const clamp = (v: number) => Math.min(0.99, Math.max(0, v));
  const x0 = invRRT(clamp(o[0] * r + o[3] * g + o[6] * b));
  const x1 = invRRT(clamp(o[1] * r + o[4] * g + o[7] * b));
  const x2 = invRRT(clamp(o[2] * r + o[5] * g + o[8] * b));
  out[0] = Math.max(m[0] * x0 + m[3] * x1 + m[6] * x2 - TOE, 0) * 0.6;
  out[1] = Math.max(m[1] * x0 + m[4] * x1 + m[7] * x2 - TOE, 0) * 0.6;
  out[2] = Math.max(m[2] * x0 + m[5] * x1 + m[8] * x2 - TOE, 0) * 0.6;
}

interface Field {
  positions: Float32Array;
  colors: Float32Array;
  scales: Float32Array;
  /** Summed luminance of the first STARS_LOW stars and of all of them. */
  rawLow: number;
  rawAll: number;
  /** The photo's light in the units the disc draws it: summed Y times a cell's area. */
  flux: number;
  /** The sparkles' places (buildSparkles), drawn to follow the arms more steeply than the field. */
  sparkles: Float32Array;
}

/**
 * The photo at MAP x MAP, decoded again from the file rather than read back from the texture:
 * the texture's bitmap was flipped at decode, and an HTMLImageElement fallback is not, so the
 * texture's own image has two orientations. This one has the file's: row 0 is the top.
 */
async function readDisc(): Promise<Uint8ClampedArray | null> {
  try {
    const response = await fetch(DISC_URL);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const blob = await response.blob();
    let src: ImageBitmap | HTMLImageElement;
    if (typeof createImageBitmap === 'function') {
      src = await createImageBitmap(blob, {
        resizeWidth: MAP,
        resizeHeight: MAP,
        resizeQuality: 'high',
        premultiplyAlpha: 'none',
        colorSpaceConversion: 'none',
      });
    } else {
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.src = url;
      await image.decode();
      URL.revokeObjectURL(url);
      src = image;
    }
    const canvas = document.createElement('canvas');
    canvas.width = MAP;
    canvas.height = MAP;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('no 2d context');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, MAP, MAP);
    if ('close' in src) src.close();
    return ctx.getImageData(0, 0, MAP, MAP).data;
  } catch (error: unknown) {
    console.error('[Galaxy] Star field readback failed; the photo is drawn alone', error);
    return null;
  }
}

/**
 * Samples the star field from the readback, yielding often enough that the frame loop can run
 * it inside SAMPLE_BUDGET_MS a frame. Seeded, so every load and every tier get the same stars.
 * Returns null for a black image, which has no light to place stars by.
 */
function* sampleField(px: Uint8ClampedArray): Generator<void, Field | null> {
  const cell = (2 * R) / MAP;
  const lut = new Float32Array(256);
  for (let v = 0; v < 256; v++) {
    const c = v / 255;
    lut[v] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }
  const rgb = [0, 0, 0];
  const lightAt = new Float32Array(MAP * MAP);
  const cdf = new Float64Array(MAP * MAP);
  let flux = 0;
  let acc = 0;
  for (let j = 0; j < MAP; j++) {
    for (let i = 0; i < MAP; i++) {
      const p = j * MAP + i;
      invAces(lut[px[p * 4]], lut[px[p * 4 + 1]], lut[px[p * 4 + 2]], rgb);
      const y = lum(rgb[0], rgb[1], rgb[2]);
      lightAt[p] = y;
      flux += y;
      acc += y ** GAMMA;
      cdf[p] = acc;
    }
    if (j % 8 === 7) yield;
  }
  if (!(acc > 0)) return null;

  const rnd = makeRng(SEED.galaxy);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
  const positions = new Float32Array(STARS_MAX * 3);
  const colors = new Float32Array(STARS_MAX * 3);
  const scales = new Float32Array(STARS_MAX);
  let rawLow = 0;
  let rawAll = 0;
  for (let s = 0; s < STARS_MAX; s++) {
    // The first cell whose running sum passes u. Strictly greater, so a cell of zero light,
    // whose sum equals its neighbour's, is never picked.
    const u = rnd() * acc;
    let lo = 0;
    let hi = MAP * MAP - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] > u) hi = mid;
      else lo = mid + 1;
    }
    const i = lo % MAP;
    const j = (lo - i) / MAP;
    // Canvas row j is file row j, which the disc lays at world -z (PlaneGeometry turned -90deg
    // about x puts the texture's top at -z); column i runs along +x.
    const x = -R + (i + rnd()) * cell;
    const z = -R + (j + rnd()) * cell;
    const r = Math.hypot(x, z);
    positions[s * 3] = x;
    // A thin disc (0.03) thickening into a bulge of 0.35 at the centre.
    positions[s * 3 + 1] = gauss() * (0.03 + 0.35 * Math.exp(-((r / 0.9) ** 2)));
    positions[s * 3 + 2] = z;

    // Lognormal grain with a mean of 1 (E[exp(0.8 n)] = exp(0.32)): a field of unequal stars.
    const y = lightAt[lo];
    const raw = y ** (1 - GAMMA) * Math.exp(0.8 * gauss() - 0.32);
    invAces(lut[px[lo * 4]], lut[px[lo * 4 + 1]], lut[px[lo * 4 + 2]], rgb);
    let cr = rgb[0] / y;
    let cg = rgb[1] / y;
    let cb = rgb[2] / y;
    const top = Math.max(cr, cg, cb);
    if (top > CHROMA_MAX) {
      const t = (top - CHROMA_MAX) / (top - 1);
      cr += (1 - cr) * t;
      cg += (1 - cg) * t;
      cb += (1 - cb) * t;
    }
    const pick = rnd();
    const nudge = pick < NUDGE_SHARE ? BLUE_WHITE : pick < 2 * NUDGE_SHARE ? AMBER : null;
    if (nudge) {
      cr += (nudge[0] - cr) * NUDGE_MIX;
      cg += (nudge[1] - cg) * NUDGE_MIX;
      cb += (nudge[2] - cb) * NUDGE_MIX;
    }
    colors[s * 3] = cr * raw;
    colors[s * 3 + 1] = cg * raw;
    colors[s * 3 + 2] = cb * raw;
    scales[s] = Math.min(2, Math.max(0.5, Math.exp(0.35 * gauss())));
    rawAll += raw;
    if (s < STARS_LOW) rawLow += raw;
    if (s % 1024 === 1023) yield;
  }
  // The sparkles land with probability min(Y, cap)^SPK.gamma: steeper than the field's
  // Y^0.55, so they gather on the arms and their knots rather than sprinkling the dim disc
  // evenly; the cap (the 97th percentile of the disc's light) keeps the core, the brightest and
  // smoothest place in the photo, from taking most of them.
  const lit = Array.from(lightAt).filter((y) => y > 0).sort((a, b) => a - b);
  const cap = lit.length ? lit[Math.floor(lit.length * 0.97)] : 1;
  let sacc = 0;
  for (let p = 0; p < MAP * MAP; p++) {
    sacc += Math.min(lightAt[p], cap) ** SPK.gamma;
    cdf[p] = sacc;
  }
  yield;
  const sparkles = new Float32Array(SPK.n * 3);
  const srnd = makeRng(SEED.galaxySparkle);
  for (let s = 0; s < SPK.n; s++) {
    const u = srnd() * sacc;
    let lo = 0;
    let hi = MAP * MAP - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] > u) hi = mid;
      else lo = mid + 1;
    }
    const i = lo % MAP;
    const j = (lo - i) / MAP;
    const x = -R + (i + srnd()) * cell;
    const z = -R + (j + srnd()) * cell;
    const r = Math.hypot(x, z);
    sparkles[s * 3] = x;
    sparkles[s * 3 + 1] = (srnd() - 0.5) * 2 * (0.04 + 0.3 * Math.exp(-((r / 0.9) ** 2)));
    sparkles[s * 3 + 2] = z;
  }
  return { positions, colors, scales, rawLow, rawAll, flux: flux * cell * cell, sparkles };
}

/**
 * The galaxy's depth (owner, 2026-10-04: "depth, layers, parallax"). The photograph is a sheet
 * and the field stars carry 1% of the light at rest, so as the welcome camera orbits nothing
 * moves against anything. This layer is the first HALO_N stars of the field - placed by the
 * photo's light, so over the arms and the core - lifted off the plane on both sides and each
 * carrying about 60 field stars' light, so they read as single bright stars that slide over the
 * arms beneath them as the view turns.
 */
interface Halo {
  positions: Float32Array;
  colors: Float32Array;
  scales: Float32Array;
  raw: number;
}
function buildHalo(f: Field): Halo {
  const rnd = makeRng(SEED.galaxyHalo);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
  const positions = new Float32Array(HALO_N * 3);
  const colors = f.colors.slice(0, HALO_N * 3);
  const scales = f.scales.slice(0, HALO_N);
  let raw = 0;
  for (let s = 0; s < HALO_N; s++) {
    const x = f.positions[s * 3];
    const z = f.positions[s * 3 + 2];
    positions[s * 3] = x;
    positions[s * 3 + 1] = gauss() * HALO_H * (1 + Math.exp(-((Math.hypot(x, z) / 1.2) ** 2)));
    positions[s * 3 + 2] = z;
    raw += lum(colors[s * 3], colors[s * 3 + 1], colors[s * 3 + 2]);
  }
  return { positions, colors, scales, raw };
}

/**
 * The sparkles: SPK.n stars placed by the photo's light (sampleField), so dense on the arms
 * and the knots, thin between them, none off the disc - drawn as the dive's soft stars
 * (spriteStars). Warm over the bulge, where the photo is gold, and in the dive's blues
 * elsewhere.
 */
function buildSparkles(f: Field): THREE.BufferGeometry {
  const rnd = makeRng(SEED.galaxySparkle ^ 0x77);
  const pos = f.sparkles;
  const col = new Float32Array(SPK.n * 3);
  const on = new Float32Array(SPK.n);
  const phase = new Float32Array(SPK.n);
  const c = new THREE.Color();
  for (let s = 0; s < SPK.n; s++) {
    const r = Math.hypot(pos[s * 3], pos[s * 3 + 2]);
    paletteStar(rnd, 0.2 + 0.6 * Math.exp(-((r / 1.5) ** 2)), c);
    col.set([c.r, c.g, c.b], s * 3);
    phase[s] = rnd();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aOn', new THREE.BufferAttribute(on, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  return geo;
}

// Module level, so a remount (StrictMode, a route change back home) neither fetches nor samples
// again: the field is the same field for the whole session.
let readback: Promise<Uint8ClampedArray | null> | null = null;
let sampler: Generator<void, Field | null> | null = null;
let field: Field | null = null;
let halo: Halo | null = null;
let sparkles: THREE.BufferGeometry | null = null;
const drawingBuffer = new THREE.Vector2();

/**
 * Written every frame for the rest of the scene to read.
 * - `spin`: the disc's signed turn about y. Stream 2 lays the dive's late path and its target
 *   star in this frame. Negative is clockwise seen from above, the way M101's arms trail: they
 *   open counter-clockwise outward in the photograph (+83 deg per unit ln r, measured).
 * - `handover`: k, 0 while the photo carries the disc and 1 once the stars do (Effects blends
 *   the galaxy bloom with it).
 */
export const galaxyFrame = { spin: 0, handover: 0 };

export default function Galaxy() {
  const gl = useThree((s) => s.gl);
  const high = useScene((s) => s.quality) === 'high';
  const spinRef = useRef<THREE.Group>(null);
  const discMatRef = useRef<THREE.ShaderMaterial>(null);
  const starMatRef = useRef<THREE.ShaderMaterial>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const haloRef = useRef<THREE.Points>(null);
  const haloMatRef = useRef<THREE.ShaderMaterial>(null);
  const sparkleRef = useRef<THREE.Points>(null);
  const sparkleMatRef = useRef<THREE.ShaderMaterial>(null);
  const sparkledAt = useRef<number | null>(null);
  const turn = useRef(0);
  const arrived = useRef(false);
  const arrivedLate = useRef(false);
  const fadeFrom = useRef<number | null>(null);
  const hi = useRef<BitmapTextureLoad | null>(null);
  const hiReady = useRef(false);
  const hiUploaded = useRef(false);
  const revealedAt = useRef<number | null>(null);
  const stillSince = useRef(0);
  const lastScroll = useRef(0);
  const loFreed = useRef(false);

  // Same anisotropy on both tiers, so they draw the same disc at a grazing angle.
  const aniso = useMemo(() => Math.min(8, gl.capabilities.getMaxAnisotropy()), [gl]);
  // Pre-uploaded, the one exception to bitmapTexture's startup rule: the loader waits for this
  // disc (galaxyDiscReady) so that the first revealed frame has the galaxy in it.
  const disc = useMemo(
    () => loadBitmapTexture(DISC_URL, gl, { colorSpace: THREE.SRGBColorSpace, anisotropy: aniso, preupload: true }),
    [gl, aniso]
  );
  useEffect(() => {
    disc.ready.then(() => {
      // Decided here and not in the frame loop: the loader lifts on galaxyDiscReady, and a
      // frame loop that read sceneReady could see it already true in the very frame this disc
      // arrived and fade it in behind a loader that was waiting for it.
      arrivedLate.current = useScene.getState().sceneReady;
      arrived.current = true;
      useScene.getState().setGalaxyDiscReady(true);
    });
    return () => disc.dispose();
  }, [disc]);

  useEffect(() => {
    if (!readback) readback = readDisc();
    readback.then((px) => {
      if (px && !sampler && !field) sampler = sampleField(px);
    });
  }, []);

  // The 4096 loads once the tier is high, and stays when the tier drops: going back down would
  // re-upload the 2048 mid-session for no saving that matters. Decoded here, off the main
  // thread; uploaded by the frame loop when the view is still (HI_AFTER_REVEAL_S).
  useEffect(() => {
    if (!high || hi.current) return;
    const load = loadBitmapTexture(DISC_URL_HIGH, gl, { colorSpace: THREE.SRGBColorSpace, anisotropy: aniso });
    hi.current = load;
    load.ready.then((t) => {
      if (t) hiReady.current = true;
    });
  }, [high, gl, aniso]);
  useEffect(() => () => hi.current?.dispose(), []);

  const discUniforms = useMemo(
    () => ({
      uMap: { value: disc.texture },
      uGain: { value: 0 },
      uTime: { value: 0 },
      uShimmer: { value: LIFE[0] },
      uMinInv: { value: MIN_INV },
      uMoutInv: { value: MOUT_INV },
    }),
    [disc]
  );
  const starUniforms = useMemo(
    () => ({
      uFocal: { value: 1 },
      uEnergy: { value: 0 },
      uSigma: { value: STAR_SIGMA },
      uPeak: { value: STAR_PEAK },
      uSigmaMax: { value: 3 },
      uTime: { value: 0 },
      uTwinkle: { value: LIFE[1] },
    }),
    []
  );
  const haloUniforms = useMemo(
    () => ({
      uFocal: { value: 1 },
      uEnergy: { value: 0 },
      uSigma: { value: STAR_SIGMA },
      uPeak: { value: STAR_PEAK },
      uSigmaMax: { value: 3 },
      uTime: { value: 0 },
      uTwinkle: { value: LIFE[1] },
    }),
    []
  );

  const sparkleUniforms = useMemo(() => {
    const u = spriteStarUniforms(SPK.size, LIFE[1], 0.001);
    u.uReveal.value = 1;
    return u;
  }, []);

  useFrame(({ camera, clock, gl: renderer, size: css }, dt) => {
    const group = spinRef.current;
    const discMat = discMatRef.current;
    const starMat = starMatRef.current;
    const points = pointsRef.current;
    if (!group || !discMat || !starMat || !points) return;
    const st = useScene.getState();

    if (sampler) {
      const t0 = performance.now();
      let step = sampler.next();
      while (!step.done && performance.now() - t0 < SAMPLE_BUDGET_MS) step = sampler.next();
      if (step.done) {
        field = step.value;
        sampler = null;
      }
    }
    const geo = points.geometry;
    // No attributes until the field is whole: an attribute three has seen is uploaded on the
    // first draw, so empty placeholders would cost the 5.6 MB upload twice.
    if (field && !geo.getAttribute('position')) {
      geo.setAttribute('position', new THREE.BufferAttribute(field.positions, 3));
      geo.setAttribute('aColor', new THREE.BufferAttribute(field.colors, 3));
      geo.setAttribute('aScale', new THREE.BufferAttribute(field.scales, 1));
    }
    const haloPts = haloRef.current;
    if (field && haloPts && !haloPts.geometry.getAttribute('position')) {
      halo ??= buildHalo(field);
      haloPts.geometry.setAttribute('position', new THREE.BufferAttribute(halo.positions, 3));
      haloPts.geometry.setAttribute('aColor', new THREE.BufferAttribute(halo.colors, 3));
      haloPts.geometry.setAttribute('aScale', new THREE.BufferAttribute(halo.scales, 1));
    }
    // The sparkles fade in over SPARKLE_FADE_S from the frame the field lands (about a second
    // after the photo): appearing on a still view, they would otherwise pop.
    const spk = sparkleRef.current;
    if (field && spk && spk.geometry !== sparkles) {
      sparkles ??= buildSparkles(field);
      spk.geometry = sparkles;
      sparkledAt.current = clock.elapsedTime;
    }
    const starsOn = field !== null && geo.getAttribute('position') !== undefined;
    if (starsOn) geo.setDrawRange(0, high ? STARS_MAX : STARS_LOW);

    // The turn stops the moment the scroll leaves 0: the dive's target is a knot of this disc
    // (lib/diveStar), and a disc that kept turning would carry it off the path being flown. At
    // this rate the stop is a hundredth of a pixel a frame - nothing to ease.
    if (st.scrollProgress <= 0) turn.current += SPIN_RATE * dt * Math.max(0, 1 - turn.current / SPIN_MAX);
    group.rotation.y = -turn.current;
    galaxyFrame.spin = group.rotation.y;

    // A disc decoded before the loader lifted is there from the first revealed frame; a later
    // one fades in.
    if (arrived.current && fadeFrom.current === null) fadeFrom.current = arrivedLate.current ? clock.elapsedTime : -Infinity;
    const load = fadeFrom.current === null ? 0 : Math.min(1, (clock.elapsedTime - fadeFrom.current) / LOAD_FADE_S);

    const now = clock.elapsedTime;
    discMat.uniforms.uTime.value = now;
    starMat.uniforms.uTime.value = now;
    if (st.sceneReady && revealedAt.current === null) revealedAt.current = now;
    if (st.scrollProgress !== lastScroll.current || st.scrollProgress > 0) stillSince.current = now;
    lastScroll.current = st.scrollProgress;
    if (
      hiReady.current && hi.current && !hiUploaded.current
      && revealedAt.current !== null && now - revealedAt.current > HI_AFTER_REVEAL_S
      && now - stillSince.current > HI_IDLE_S
    ) {
      renderer.initTexture(hi.current.texture);
      hiUploaded.current = true;
    }
    if (hiUploaded.current && hi.current) {
      discMat.uniforms.uMap.value = hi.current.texture;
      if (!loFreed.current) {
        loFreed.current = true;
        disc.dispose();
      }
    }

    // The act group sits at the origin, so the camera's y is its height over the disc. Until
    // the stars exist the photo carries all the light.
    const k = 1 - smoothstep(HANDOVER[0], HANDOVER[1], camera.position.y);
    galaxyFrame.handover = k;
    const share = starsOn ? REST_STARS + (1 - REST_STARS - HALO_SHARE) * k : 0;
    const haloShare = starsOn && halo ? HALO_SHARE : 0;
    discMat.uniforms.uGain.value = (1 - share - haloShare) * load * GX[0];
    if (field) {
      const drawn = high ? field.rawAll : field.rawLow;
      starMat.uniforms.uEnergy.value = ((share * field.flux) / drawn) * load * GX[1];
    }
    const haloMat = haloMatRef.current;
    if (haloMat) {
      haloMat.uniforms.uEnergy.value = field && halo ? ((haloShare * field.flux) / halo.raw) * load * GX[1] : 0;
      haloMat.uniforms.uTime.value = now;
    }
    const spkMat = sparkleMatRef.current;
    if (spkMat) {
      const since = sparkledAt.current === null ? 0 : Math.min(1, (now - sparkledAt.current) / SPARKLE_FADE_S);
      spkMat.uniforms.uOpacity.value = SPK.opacity * since * since * load;
      spkMat.uniforms.uScale.value = css.height * 0.5;
      spkMat.uniforms.uTime.value = now;
    }
    // Pixels per world unit at unit depth: projection[5] = 1 / tan(fov / 2).
    const size = renderer.getDrawingBufferSize(drawingBuffer);
    starMat.uniforms.uFocal.value = camera.projectionMatrix.elements[5] * 0.5 * size.y;
    starMat.uniforms.uSigmaMax.value = 3 * renderer.getPixelRatio();
    if (haloMat) {
      haloMat.uniforms.uFocal.value = starMat.uniforms.uFocal.value;
      haloMat.uniforms.uSigmaMax.value = starMat.uniforms.uSigmaMax.value;
    }
  });

  // Raycasting off on both (perf trap); the points are never culled, as their bounds are empty
  // until the field lands.
  return (
    <group ref={spinRef}>
      <mesh rotation-x={-Math.PI / 2} raycast={() => null}>
        <planeGeometry args={[2 * R, 2 * R]} />
        <shaderMaterial
          ref={discMatRef}
          vertexShader={discVertexShader}
          fragmentShader={discFragmentShader}
          uniforms={discUniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <points ref={pointsRef} raycast={() => null} frustumCulled={false}>
        <bufferGeometry />
        <shaderMaterial
          ref={starMatRef}
          vertexShader={starVertexShader}
          fragmentShader={starFragmentShader}
          uniforms={starUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <points ref={haloRef} raycast={() => null} frustumCulled={false}>
        <bufferGeometry />
        <shaderMaterial
          ref={haloMatRef}
          vertexShader={starVertexShader}
          fragmentShader={starFragmentShader}
          uniforms={haloUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      {/* The geometry is the module's (sparkles), shared across remounts: never disposed here. */}
      <points ref={sparkleRef} raycast={() => null} frustumCulled={false} dispose={null}>
        <shaderMaterial
          ref={sparkleMatRef}
          vertexShader={spriteStarVertex}
          fragmentShader={spriteStarFragment}
          uniforms={sparkleUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
