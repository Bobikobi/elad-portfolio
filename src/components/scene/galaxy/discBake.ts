import * as THREE from 'three';

/**
 * The galaxy's continuous light, baked once into a texture over the disc plane.
 *
 * #82 stage 2, round 2. An additive point cloud cannot draw what makes a spiral read as a
 * photograph: arms that are continuous light with a sharp inner edge, thin dark lanes cut INTO
 * that light, knots of star birth strung along it, and faint starlight between the arms. Points
 * add light only, so every lane was a place where fewer points were drawn, and the black layer
 * that tried to take light back out read as a lens pasted on the sky. Here the disc's light is
 * computed per texel, the dust multiplies it before anything reaches the frame, and the result is
 * drawn additively on a plane that turns with the cloud - a lane is simply less light, and the
 * sky can never be darkened by it.
 *
 * The model is M101 (the Pinwheel), chosen by the owner from four references: a small warm core,
 * two unequal trunks that branch into several knotty, fragmented outer arms, a lopsided outline
 * (one side reaches further), thin reddish-brown lanes on the arms' inner edges, a web of dust
 * filaments spiralling into the core, and pink HII knots with blue clusters beside them.
 *
 * Coordinates: q = uv * 2 - 1 is the disc plane in units of the radius, q.x along world x and
 * q.y along world z, so the CPU angle atan2(z, x) is the shader's atan(q.y, q.x). Arms are
 * trailing for the cloud's spin (the pattern turns toward decreasing angle), so the angle of an
 * arm grows with radius and its concave (inner) side is the side of larger angle at a fixed
 * radius - which is where the dust lanes sit.
 *
 * Output (linear, half float): rgb = light after dust, a = the dust's transmission in green.
 * The points read `a` in their vertex shader so the resolved stars sit behind the same lanes.
 */

/** One arm of the disc. Angles in radians (CPU convention), radii as a share of the radius. */
interface ArmSpec {
  /** Angle at `rho0`. Ignored for a branch, which starts at its parent's angle. */
  theta0: number;
  /** Reference radius: where a trunk's angle is `theta0`, or where a branch leaves its parent. */
  rho0: number;
  /** Pitch angle (degrees) inside `openFrom`, and the more open pitch it eases to by `openTo`. */
  pitchIn: number;
  pitchOut: number;
  openFrom: number;
  openTo: number;
  /** The radii the arm carries light over (faded in and out at both ends). */
  start: number;
  end: number;
  strength: number;
  /** Half-width scale: the arm is `width * (0.35 + rho)` across. */
  width: number;
  /** How much dust its inner edge carries. */
  lane: number;
  /** How likely a stretch of it is to hold a star-forming knot. */
  knots: number;
  /** Index of the trunk a branch leaves, or -1. */
  parent: number;
}

// Two unequal trunks ~170 degrees apart, a branch off each, and two outer fragments. Branch C is
// the long, knot-rich arm that reaches past everything else (M101's NGC 5461/5462 side); the rest
// stop short of it so the outline is lopsided rather than a circle.
const ARM_SPECS: ArmSpec[] = [
  { theta0: 0.3, rho0: 0.05, pitchIn: 18, pitchOut: 24, openFrom: 0.2, openTo: 0.6, start: 0.04, end: 0.92, strength: 1.0, width: 0.05, lane: 1.0, knots: 1.0, parent: -1 },
  { theta0: 0.3 + Math.PI - 0.25, rho0: 0.05, pitchIn: 19, pitchOut: 26, openFrom: 0.2, openTo: 0.6, start: 0.04, end: 0.8, strength: 0.9, width: 0.048, lane: 1.0, knots: 0.9, parent: -1 },
  { theta0: 0, rho0: 0.3, pitchIn: 0, pitchOut: 42, openFrom: 0.3, openTo: 0.4, start: 0.3, end: 1.0, strength: 0.8, width: 0.05, lane: 0.7, knots: 1.5, parent: 0 },
  { theta0: 0, rho0: 0.3, pitchIn: 0, pitchOut: 45, openFrom: 0.3, openTo: 0.4, start: 0.3, end: 0.9, strength: 0.65, width: 0.048, lane: 0.6, knots: 1.1, parent: 1 },
  { theta0: 0.82, rho0: 0.3, pitchIn: 24, pitchOut: 30, openFrom: 0.35, openTo: 0.6, start: 0.3, end: 0.86, strength: 0.6, width: 0.045, lane: 0.6, knots: 1.0, parent: -1 },
  { theta0: 3.85, rho0: 0.3, pitchIn: 26, pitchOut: 31, openFrom: 0.35, openTo: 0.65, start: 0.3, end: 0.95, strength: 0.55, width: 0.045, lane: 0.5, knots: 1.0, parent: -1 },
  { theta0: 1.6, rho0: 0.06, pitchIn: 15, pitchOut: 18, openFrom: 0.12, openTo: 0.3, start: 0.06, end: 0.34, strength: 0.5, width: 0.035, lane: 1.0, knots: 0.3, parent: -1 },
  { theta0: 1.6 + Math.PI, rho0: 0.06, pitchIn: 16, pitchOut: 19, openFrom: 0.12, openTo: 0.3, start: 0.07, end: 0.3, strength: 0.45, width: 0.035, lane: 1.0, knots: 0.3, parent: -1 },
  { theta0: 4.49, rho0: 0.62, pitchIn: 24, pitchOut: 26, openFrom: 0.7, openTo: 0.9, start: 0.62, end: 0.97, strength: 0.42, width: 0.045, lane: 0.3, knots: 1.3, parent: -1 },
  { theta0: 5.76, rho0: 0.66, pitchIn: 26, pitchOut: 28, openFrom: 0.7, openTo: 0.9, start: 0.66, end: 0.95, strength: 0.38, width: 0.042, lane: 0.3, knots: 1.0, parent: -1 },
];

/** An arm as the shader sees it: the angle is theta0 + b1*s + (b2 - b1)*ramp(s), s = ln(rho/rho0). */
export interface Arm {
  theta0: number;
  rho0: number;
  b1: number;
  b2: number;
  s1: number;
  s2: number;
  start: number;
  end: number;
  strength: number;
  width: number;
  lane: number;
  knots: number;
}

const wind = (pitchDeg: number) => 1 / Math.tan((pitchDeg * Math.PI) / 180);

/** Integral of smoothstep(s1, s2, x) from -inf to s: the extra winding as the pitch opens. */
function rampInt(s: number, s1: number, s2: number): number {
  const w = s2 - s1;
  const t = Math.min(1, Math.max(0, (s - s1) / w));
  return w * (t * t * t - 0.5 * t * t * t * t) + Math.max(s - s2, 0);
}

/** The angle of an arm's spine at radius `rho` (share of the radius). */
export function armTheta(a: Arm, rho: number): number {
  const s = Math.log(rho / a.rho0);
  return a.theta0 + a.b1 * s + (a.b2 - a.b1) * rampInt(s, a.s1, a.s2);
}

/** The arm's local winding, d(angle)/d(ln rho) = 1 / tan(pitch). */
export function armWind(a: Arm, rho: number): number {
  const s = Math.log(rho / a.rho0);
  const t = Math.min(1, Math.max(0, (s - a.s1) / (a.s2 - a.s1)));
  return a.b1 + (a.b2 - a.b1) * t * t * (3 - 2 * t);
}

export const ARMS: Arm[] = (() => {
  const out: Arm[] = [];
  for (const sp of ARM_SPECS) {
    const base = { start: sp.start, end: sp.end, strength: sp.strength, width: sp.width, lane: sp.lane, knots: sp.knots };
    if (sp.parent < 0) {
      out.push({ ...base, theta0: sp.theta0, rho0: sp.rho0, b1: wind(sp.pitchIn), b2: wind(sp.pitchOut), s1: Math.log(sp.openFrom / sp.rho0), s2: Math.log(sp.openTo / sp.rho0) });
    } else {
      // A branch leaves its parent along the parent's own direction and opens from there, so
      // the fork is a smooth parting and not a kink.
      const p = out[sp.parent];
      out.push({ ...base, theta0: armTheta(p, sp.rho0), rho0: sp.rho0, b1: armWind(p, sp.rho0), b2: wind(sp.pitchOut), s1: 0, s2: Math.log(sp.openTo / sp.rho0) });
    }
  }
  return out;
})();

const NARMS = ARMS.length;

const bakeVertex = /* glsl */ `
  in vec3 position;
  in vec2 uv;
  out vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// NARMS is prepended as a define; nothing is interpolated into this literal.
export const bakeFragment = /* glsl */ `
  precision highp float;
  in vec2 vUv;
  out vec4 fragColor;

  uniform vec4 uArmA[NARMS]; // theta0, rho0, b1, b2
  uniform vec4 uArmB[NARMS]; // s1, s2, start, end
  uniform vec4 uArmC[NARMS]; // strength, width, lane, knots
  uniform float uSeed;
  // Loop bounds the compiler cannot see through. Every loop here would otherwise be unrolled at
  // every call site after inlining, which made the program ~10x larger and cost over a second of
  // main-thread compile on a first visit; a loop kept as a loop compiles its body once.
  uniform int uNArms;
  uniform int uZero;

  const float PI = 3.14159265;
  const float TAU = 6.28318531;

  // Hash without sine: stable across GPUs, which a sin() hash at large arguments is not.
  vec3 hash33(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.xxy + p.yxx) * p.zyx);
  }
  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
  }
  // Gradient noise, roughly -1..1. The eight corners in a loop, for the same reason as above.
  float gnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    float n = 0.0;
    for (int k = 0; k < 8 + uZero; k++) {
      vec3 c = vec3(float(k & 1), float((k >> 1) & 1), float(k >> 2));
      vec3 w = mix(1.0 - u, u, c);
      n += w.x * w.y * w.z * dot(hash33(i + c) * 2.0 - 1.0, f - c);
    }
    return n * 1.7;
  }
  float fbm(vec3 p, int oct) {
    float a = 0.5, s = 0.0, n = 0.0;
    for (int k = 0; k < oct + uZero; k++) {
      s += a * gnoise(p);
      n += a;
      p = p * 2.03 + vec3(17.1, 9.2, 3.7);
      a *= 0.5;
    }
    return s / n;
  }
  // Thin veins: 1 on the zero-crossings of a noise field, which form a connected network of
  // curves, sharpened by a power. Two octaves, the finer one fainter.
  float veins(vec3 p, float sharp) {
    float v = 0.0, a = 1.0;
    for (int k = 0; k < 2 + uZero; k++) {
      // gnoise can exceed 1 in magnitude, and pow of a negative base is undefined (NaN).
      v += a * pow(max(1.0 - abs(gnoise(p)), 0.0), sharp);
      p = p * 2.13 + vec3(5.3, 11.9, 7.1);
      a *= 0.6;
    }
    return v;
  }
  // A frame that follows a spiral of the given winding and is seamless around the disc: the
  // angle is sampled on a circle, so it wraps by construction, and cells scale with radius.
  vec3 logPolar(float theta, float s, float windK, float around, float along, float seed) {
    float psi = theta - windK * s;
    return vec3(cos(psi) * around, sin(psi) * around, s * along + seed);
  }

  float rampInt(float s, float s1, float s2) {
    float w = s2 - s1;
    float t = clamp((s - s1) / w, 0.0, 1.0);
    return w * (t * t * t - 0.5 * t * t * t * t) + max(s - s2, 0.0);
  }
  float armTheta(int i, float rho) {
    vec4 A = uArmA[i];
    vec4 B = uArmB[i];
    float s = log(rho / A.y);
    return A.x + A.z * s + (A.w - A.z) * rampInt(s, B.x, B.y);
  }
  float armWind(int i, float rho) {
    vec4 A = uArmA[i];
    vec4 B = uArmB[i];
    float s = log(rho / A.y);
    return A.z + (A.w - A.z) * smoothstep(B.x, B.y, s);
  }
  float wrapPi(float a) {
    return a - TAU * floor((a + PI) / TAU);
  }
  float armEnv(int i, float rho) {
    vec4 B = uArmB[i];
    return smoothstep(B.z, B.z + 0.08, rho) * (1.0 - smoothstep(B.w - 0.2, B.w, rho));
  }

  // Star clusters: compact blobs on a jittered grid, one a cell, a few bright and most faint.
  float speckle(vec2 p, float seed) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float s = 0.0;
    for (int k = 0; k < 9 + uZero; k++) {
      vec2 c = vec2(float(k % 3 - 1), float(k / 3 - 1));
      vec3 h = hash33(vec3(i + c, seed));
      vec2 o = c + h.xy - f;
      float r = 0.12 + 0.18 * h.z;
      float a = hash13(vec3(i + c, seed + 7.0));
      s += a * a * exp(-dot(o, o) / (r * r));
    }
    return s;
  }

  void main() {
    vec2 q0 = vUv * 2.0 - 1.0;
    float rho0 = length(q0);
    if (rho0 > 0.999) {
      fragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }
    // Lopsided: the outer disc is offset from the nucleus, so one side reaches further.
    vec2 q = q0 - vec2(0.05, 0.02) * smoothstep(0.2, 1.0, rho0);
    float rho = max(length(q), 1e-4);
    float theta = atan(q.y, q.x);
    float s = log(rho);

    // ---- Arms. Each is a profile across its spine, sharp on the inner (concave) edge where the
    // lane sits and soft on the outer one. The spine wanders, the brightness changes along it,
    // and outside it breaks into segments.
    float armSum = 0.0;
    float tauArm = 0.0;
    float pink = 0.0;
    float blue = 0.0;
    for (int i = 0; i < uNArms; i++) {
      float env = armEnv(i, rho);
      if (env <= 0.0) continue;
      vec4 C = uArmC[i];
      float b = armWind(i, rho);
      float g = inversesqrt(1.0 + b * b);
      float d = rho * wrapPi(theta - armTheta(i, rho)) * g;
      float w = C.y * (0.35 + 1.4 * rho);
      if (abs(d) > 6.0 * w) continue;
      float fi = float(i);
      float dd = d - 0.35 * w * gnoise(vec3(s * 4.0, fi * 2.7, 11.0 + uSeed));
      float wIn = 0.55 * w;
      float x = dd > 0.0 ? dd / wIn : dd / (1.35 * w);
      float prof = exp(-0.5 * x * x);
      float brk = fbm(vec3(s * 3.2, fi * 7.3 + 40.0 + uSeed, 0.5), 2);
      float frag = mix(1.0, smoothstep(-0.3, 0.2, brk), smoothstep(0.45, 0.7, rho));
      float vary = 0.7 + 0.6 * smoothstep(-0.5, 0.5, gnoise(vec3(s * 2.2, fi * 1.9, 60.0 + uSeed)));
      armSum += C.x * env * prof * frag * vary;

      // The lane: thin, on the inner edge, continuous but changing depth, with a fainter
      // companion just inside it.
      float lc = wIn * (1.0 + 0.35 * gnoise(vec3(s * 9.0, fi * 5.1, 3.0 + uSeed)));
      float lw = 0.0016 + 0.0034 * rho;
      float depth = 0.35 + 0.65 * smoothstep(-0.5, 0.5, gnoise(vec3(s * 6.0, fi * 3.3, 80.0 + uSeed)));
      float lt = (dd - lc) / lw;
      float lt2 = (dd - lc - 0.45 * wIn) / (0.7 * lw);
      float lanes = exp(-0.5 * lt * lt) + 0.5 * exp(-0.5 * lt2 * lt2) * smoothstep(-0.2, 0.4, gnoise(vec3(s * 5.0, fi * 4.4, 90.0 + uSeed)));
      tauArm += 1.3 * C.z * env * depth * lanes;

      // Feathers: dust spurs that leave the lane every so often and cross the arm toward its outer
      // side at a much steeper pitch (45 degrees off the arm), fading out in the gap beyond.
      float across = lc - dd;
      if (across > 0.0 && across < 3.5 * w) {
        float FL = 0.07;
        float sr = s - across * g / rho;
        float k0 = floor(sr / FL);
        for (int dk = -1; dk <= 1 + uZero; dk++) {
          float k = k0 + float(dk);
          vec3 h = hash33(vec3(k, fi * 13.0 + 5.0, uSeed + 21.0));
          if (h.x > 0.5) continue;
          float root = (k + 0.2 + 0.6 * h.y) * FL;
          float len = (0.8 + 2.4 * h.z) * w;
          // Each leans its own way and wanders, so they read as torn dust, not combed strokes.
          float lean = 0.6 + 1.0 * fract(h.x * 7.13);
          float dist = 0.707 * (sr + across * g / rho * (1.0 - lean) - root) * rho / g;
          dist += 0.6 * lw * gnoise(vec3(across / lw * 0.35, k, 31.0 + uSeed));
          float fw = lw * (0.5 + 0.9 * fract(h.y * 5.7));
          float taper = 1.0 - smoothstep(0.5, 1.0, across / len);
          tauArm += 0.9 * C.z * env * taper * exp(-0.5 * (dist * dist) / (fw * fw));
        }
      }

      // Star-forming complexes just outside the lane: lobes of glowing hydrogen and the young
      // blue clusters that lit them. Most are small; a few in the outer arms are giants.
      if (prof < 0.01 || frag < 0.05) continue;
      float L = 0.035;
      float k0 = floor(s / L);
      for (int dk = -1; dk <= 1 + uZero; dk++) {
        float k = k0 + float(dk);
        vec3 h = hash33(vec3(k, fi * 17.0 + 3.0, uSeed));
        if (h.x > 0.5 * C.w) continue;
        float rk = exp((k + h.y) * L);
        float envk = armEnv(i, rk);
        float bk = armWind(i, rk);
        float wk = C.y * (0.35 + 1.4 * rk);
        float dko = (h.z * 1.4 - 0.5) * 0.6 * wk;
        float thk = armTheta(i, rk) + dko * sqrt(1.0 + bk * bk) / rk;
        vec2 pk = rk * vec2(cos(thk), sin(thk));
        vec3 h2 = hash33(vec3(k, fi * 17.0 + 9.0, uSeed + 5.0));
        float giant = step(0.88, h2.x) * smoothstep(0.4, 0.55, rk);
        float size = mix(0.0018 + 0.003 * h2.y, 0.004 + 0.004 * h2.y, giant);
        float spread = mix(2.5, 6.0, giant);
        float amp = envk * frag * mix(0.2 + 0.6 * h2.z * h2.z, 0.9, giant);
        for (int l = 0; l < 4 + uZero; l++) {
          vec3 h3 = hash33(vec3(k * 4.0 + float(l), fi + 41.0, uSeed + 11.0));
          vec2 off = (h3.xy - 0.5) * size * spread;
          float r = size * (0.5 + 0.5 * h3.z);
          vec2 dq = q - pk - off;
          float gk = amp * (0.4 + 0.6 * h3.z) * exp(-dot(dq, dq) / (r * r));
          if (l == 0) pink += gk;
          else blue += gk;
        }
      }
    }

    // ---- Light. Two populations. The old disc is warm, short and smooth but mottled; the young
    // one lives in the arms, made of clusters, and falls off slowly so the outer arms stay bright
    // while the light between them drops away (M101: 3:1 at a fifth of the radius, 20:1 at two
    // thirds).
    vec3 cBulge = vec3(1.0, 0.72, 0.46);
    vec3 cOld = vec3(1.0, 0.8, 0.6);
    vec3 cYoung = vec3(0.76, 0.84, 1.0);
    vec3 cClus = vec3(0.5, 0.7, 1.0);
    vec3 cHII = vec3(1.0, 0.42, 0.58);

    float bulge = 0.9 * exp(-rho / 0.025);
    float mott = 0.5 + 0.5 * fbm(vec3(q * 9.0, 7.0 + uSeed), 3);
    float old = 0.5 * exp(-rho / 0.15) * (0.7 + 0.6 * mott);
    float young = 0.5 * exp(-rho / 0.75);
    float floorY = mix(0.14, 0.1, smoothstep(0.15, 0.7, rho));
    // Clusters gather into complexes: dense in places along an arm, sparse in others.
    float complexes = smoothstep(-0.15, 0.55, fbm(vec3(q * 22.0, 30.0 + uSeed), 2));
    float clus = (speckle(q * 150.0, 1.0 + uSeed) + 0.7 * speckle(q * 75.0, 2.0 + uSeed) + 0.35 * speckle(q * 38.0, 3.0 + uSeed)) * (0.25 + 1.5 * complexes);
    float arm = min(armSum, 1.6);
    vec3 youngCol = mix(vec3(0.92, 0.9, 0.88), cYoung, smoothstep(0.08, 0.35, rho));
    vec3 light = cBulge * bulge + cOld * old * (0.85 + 0.3 * arm)
               + youngCol * young * (floorY + 0.7 * arm) + cClus * young * arm * 1.4 * clus;
    // Unresolved stars: a fine grain over everything.
    light *= 0.75 + 0.6 * speckle(q * 420.0, 9.0 + uSeed);

    // ---- Dust. The arm lanes and feathers, and through the inner disc a network of thin
    // filaments that follows the spiral loosely, branches and joins, and comes in patches.
    vec3 pn = logPolar(theta, s, 2.0, 4.5, 6.0, 20.0 + uSeed);
    pn += 0.5 * vec3(gnoise(pn * 0.7 + 3.1), gnoise(pn * 0.7 + 7.7), gnoise(pn * 0.7 + 1.3));
    float net = pow(max(1.0 - abs(gnoise(pn)), 0.0), 6.0) + 0.6 * pow(max(1.0 - abs(gnoise(pn * 2.1 + 5.0)), 0.0), 8.0);
    float cut = smoothstep(-0.1, 0.35, fbm(logPolar(theta, s, 2.0, 2.2, 3.0, 140.0 + uSeed), 2));
    // ...and each filament is cut into short pieces, so the network reads as cracked, not combed.
    cut *= smoothstep(-0.25, 0.3, gnoise(pn * 1.3 + vec3(50.0, 0.0, uSeed)));
    float inner = smoothstep(0.03, 0.08, rho) * (1.0 - smoothstep(0.3, 0.65, rho));
    float tau = tauArm + 0.9 * net * cut * inner;
    // Optical depth saturates: lanes are brown and translucent, never holes.
    tau = 1.8 * (1.0 - exp(-tau / 1.8));
    // Reddening: blue is taken out faster than red.
    vec3 T = exp(-tau * vec3(0.7, 1.0, 1.45));

    light *= T;
    // Knots sit partly in front of the dust that made them.
    light += (cHII * pink * 0.7 + cClus * blue * 0.9) * mix(vec3(1.0), T, 0.5);

    // An irregular rim, and nothing at all at the texture's edge.
    float rimR = 0.95 + 0.06 * gnoise(vec3(cos(theta) * 1.6, sin(theta) * 1.6, 4.0 + uSeed));
    light *= 1.0 - smoothstep(rimR - 0.15, rimR, rho);
    light *= 1.0 - smoothstep(0.92, 0.995, rho0);

    fragColor = vec4(light, T.g);
  }
`;

/**
 * Bakes the disc into a new half-float target of `size` x `size`, mipmapped and anisotropic so
 * the oblique welcome view stays sharp. Drawn in horizontal bands so no single draw runs long
 * enough on a weak GPU to trip a driver watchdog. Restores the renderer's target.
 */
export function bakeDisc(gl: THREE.WebGLRenderer, size: number, seed = 0): THREE.WebGLRenderTarget {
  const rt = new THREE.WebGLRenderTarget(size, size, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  });
  rt.texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    defines: { NARMS },
    vertexShader: bakeVertex,
    fragmentShader: bakeFragment,
    uniforms: {
      uArmA: { value: ARMS.map((a) => new THREE.Vector4(a.theta0, a.rho0, a.b1, a.b2)) },
      uArmB: { value: ARMS.map((a) => new THREE.Vector4(a.s1, a.s2, a.start, a.end)) },
      uArmC: { value: ARMS.map((a) => new THREE.Vector4(a.strength, a.width, a.lane, a.knots)) },
      uSeed: { value: seed },
      uNArms: { value: NARMS },
      uZero: { value: 0 },
    },
    depthTest: false,
    depthWrite: false,
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  const quad = new THREE.Mesh(geometry, material);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const prev = gl.getRenderTarget();
  const bands = 8;
  gl.setRenderTarget(rt);
  for (let b = 0; b < bands; b++) {
    const y0 = Math.floor((b * size) / bands);
    const y1 = Math.floor(((b + 1) * size) / bands);
    rt.scissor.set(0, y0, size, y1 - y0);
    rt.scissorTest = true;
    gl.setRenderTarget(rt);
    gl.render(scene, camera);
  }
  rt.scissorTest = false;
  gl.setRenderTarget(prev);

  geometry.dispose();
  material.dispose();
  return rt;
}
