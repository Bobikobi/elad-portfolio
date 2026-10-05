'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScene } from '@/lib/sceneStore';
import { COVER_IN, COVER_OUT } from '@/lib/passageProfile';
import { HUD_AVAILABLE } from './DebugHud';

/**
 * The swap mask (T3) — the in-world curtain that hides the galaxy↔solar crossover. Driven
 * by the SAME `coverage` number the swap machine gates on (owned by CameraRig, symmetric
 * around the swap point). Lives in SceneRoot so it persists across the act unmount/mount and
 * covers the seam from both directions.
 *
 * ONE black plane, camera-locked, over-filling the frustum so the periphery cannot reveal
 * the swap (galaxy edges ~8% → solar edges 0% would otherwise flicker at the corners).
 *
 * CROSSING — why it is black, and why it is only a plane now. It used to be warm gold at up
 * to 0.96 opacity plus an additive cream centre glow and a waypoint star, on the theory that
 * a bloomed warm core bridged the Act-1 core colour to the Act-2 sun and was gentler than a
 * white flash. Measured, it was the flash: at the peak the frame's mean luminance hit 211 of
 * 255 with 70% of every pixel above level 200, against a settled solar system of 31. Its
 * 99th percentile sat at 242, a hair above its own mean — no tonal range left anywhere in
 * the picture. The glow's leading edge also drove |mean R − mean G| to 28, a colour the site
 * has nowhere else. A curtain is supposed to be the part you do NOT see.
 *
 * Black also makes the bridge honest: `DiveFade` has already taken the frame to near-black
 * by the time coverage starts to rise, so the crossover is now one continuous darkness
 * rather than a hand-off between two bright things.
 *
 * Coverage stays the geometric envelope, not a pixel-measured composite, on purpose: it must
 * be symmetric (scroll-up mirrors the dive; the solar-side camera never flies the corridor,
 * so nothing there would "measure" as covered) and identical on every quality tier
 * (composition LAW) — a bloom/luminance readback would be neither.
 */

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * The walls' gain as the passage enters (x) and from its middle on (y), and the floor (z) under
 * the gain of the thin things on them - streaks and specks - so the entry can be as dark as the
 * dimmed dive it takes over from and still be full of detail. `?tun=x,y,z` in HUD builds is the
 * sweep knob they were chosen with; production runs the constants.
 */
const TUNNEL_GAIN: [number, number, number] = (() => {
  const d: [number, number, number] = [0.05, 0.5, 0.6];
  if (!HUD_AVAILABLE || typeof window === 'undefined') return d;
  const raw = new URLSearchParams(window.location.search).get('tun');
  if (!raw) return d;
  const v = raw.split(',').map(Number);
  if (v.length !== 3 || v.some((n) => !Number.isFinite(n) || n < 0)) throw new Error(`?tun must be enter,middle,detail-floor gains >= 0 - got "${raw}"`);
  return [v[0], v[1], v[2]];
})();

const _fwd = new THREE.Vector3();
const DEG2RAD = Math.PI / 180;

/**
 * The curtain is a living tunnel (#82 stage 2). It was a deep-blue star-streak picture on a
 * static canvas, scaled up with coverage: owner feedback on the v3 preview was "there is a
 * stretch where everything is black", and the picture fixed that, but it barely moved -
 * consecutive tunnel frames differed by ~1 level of 255 and a fifth of the frame carried any
 * detail (preview, desktop and phone). Now it is a shader on the same plane: nebula walls and
 * star streaks flowing past on the clock, in the direction of travel, and a warm centre that
 * grows with the passage's progress through the curtain so the dive ends looking into the sun
 * it is about to reveal (and the return trip shrinks it back). Opaque at full coverage (the
 * mount frame stays hidden); bright only in that small centre, so the passage is never
 * brighter than rest.
 */
const tunnelVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const tunnelFragment = /* glsl */ `
  uniform float uFlow;    // distance travelled down the tunnel, signed by the scroll direction
  uniform float uTime;    // the wall clock, for the swirl alone (it never reverses)
  uniform float uWarm;    // 0..1, the passage's progress through the curtain
  uniform float uAspect;
  uniform float uOpacity;
  uniform vec3 uGain;     // the walls' gain entering, from the middle on, and the detail's floor
  varying vec2 vUv;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; }
    return v;
  }
  vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }

  void main() {
    // Measured against the frame's short side, so a portrait phone sees the same tunnel as a
    // desktop instead of a narrow slice of it with an oversized sun.
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0) / min(uAspect, 1.0);
    float r = length(p);
    float a = atan(p.y, p.x);
    // A tunnel seen down its axis: depth goes as 1/r, so the walls rush outward as they near.
    float z = 0.16 / max(r, 0.004) + uFlow;
    float sw = a + 0.35 * sin(uTime * 1.1 + z * 0.4);
    vec3 q = vec3(cos(sw) * 1.6, sin(sw) * 1.6, z * 0.55);

    // The tunnel is made of the galaxy it leaves (owner, 2026-10-04: "the tunnel's colours are
    // unrelated"): the photo's palette, read off M101 - a blue-black sky, blue-white arm light in
    // nebula and filaments, brown dust lanes cutting it, pink star-forming knots on the
    // filaments, and the arm's stars streaking past. It enters in those colours, and from the
    // middle of the passage on (uWarm 0.5, after the act has swapped) the walls warm toward the
    // sun ahead, so the hand-over at each end is to something of the same colour.
    float n = fbm(q);
    float ridge = 1.0 - abs(2.0 * fbm(q * 2.7 + 5.0) - 1.0);
    ridge = pow(ridge, 6.0);
    float dust = smoothstep(0.5, 0.8, fbm(q * 1.7 + 23.0));
    // The walls and the thin things on them (streaks, specks) are kept apart so the entry's low
    // gain dims the walls and leaves the thin things their floor.
    vec3 wash = lin(vec3(0.035, 0.045, 0.075));
    wash += lin(vec3(0.30, 0.36, 0.44)) * smoothstep(0.4, 0.85, n);
    wash += lin(vec3(0.56, 0.63, 0.74)) * ridge * 0.6;
    wash += lin(vec3(0.78, 0.36, 0.55)) * ridge * smoothstep(0.6, 0.8, n) * 0.35;
    wash = mix(wash, lin(vec3(0.16, 0.10, 0.065)), dust * 0.7);
    vec3 fine = vec3(0.0);

    // Star streaks: thin radial lines in angular lanes, each lane its own length and phase -
    // the arm's blue-white stars, with every fifth one a yellow giant as in the photo.
    float lanes = 420.0;
    float s = (a / 6.2831853 + 0.5) * lanes;
    float id = floor(s);
    float h = hash(vec3(id, 7.0, 1.0));
    float across = abs(fract(s) - 0.5);
    float w = 0.5 * fwidth(s);
    float line = 1.0 - smoothstep(0.08, 0.08 + w + 0.12, across);
    float seg = fract(z * (0.35 + h * 0.6) + h * 13.0);
    float streak = smoothstep(0.0, 0.25, seg) * (1.0 - smoothstep(0.55 + 0.3 * h, 0.95, seg));
    streak *= step(0.62, h) * line * smoothstep(0.05, 0.25, r);
    vec3 sc = fract(h * 97.0) < 0.2 ? lin(vec3(1.0, 0.86, 0.62)) : lin(vec3(0.80, 0.88, 1.0));
    fine += sc * streak * (0.3 + 0.7 * (h - 0.62) / 0.38);

    // Specks on the walls, flowing with them.
    vec3 sq = vec3(a * 40.0 / 6.2831853, z * 3.0, 0.0);
    vec3 si = floor(sq);
    float sh = hash(si + 3.0);
    vec2 sf = fract(sq.xy) - 0.5;
    vec3 kc = fract(sh * 53.0) < 0.25 ? lin(vec3(1.0, 0.9, 0.72)) : lin(vec3(0.85, 0.9, 1.0));
    fine += kc * step(0.8, sh) * (1.0 - smoothstep(0.0, 0.15, length(sf))) * smoothstep(0.05, 0.2, r);

    float g = mix(uGain.x, uGain.y, smoothstep(0.5, 0.85, uWarm));
    vec3 col = wash * g + fine * max(g, uGain.z);

    // Warming toward the sun, from the middle of the passage on: the walls keep their light and
    // take the sun's colour.
    float warm = smoothstep(0.5, 1.0, uWarm);
    float wl = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(col, wl * lin(vec3(1.0, 0.70, 0.42)) * 1.6, warm * 0.75);

    // The centre: the knot the dive flew into (DiveStar - a white core in a blue-white halo),
    // growing as the passage closes on it and turning into the sun ahead. Its bright part stays
    // small - the curtain is never brighter than the rest pose around it.
    float core = mix(0.025, 0.09, uWarm);
    float glow = exp(-r * r / (core * core));
    float sun = smoothstep(0.3, 1.0, uWarm);
    col = mix(col, mix(lin(vec3(1.0, 0.99, 0.97)), lin(vec3(1.0, 0.80, 0.52)), sun), glow * 0.8);
    col += mix(lin(vec3(0.80, 0.91, 1.0)), lin(vec3(0.85, 0.45, 0.22)), sun) * exp(-r / (core * 2.0)) * 0.22;

    gl_FragColor = vec4(col, uOpacity);
  }
`;

export default function SwapMask() {
  const fill = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(
    () => ({ uFlow: { value: 0 }, uTime: { value: 0 }, uWarm: { value: 0 }, uAspect: { value: 1 }, uOpacity: { value: 0 }, uGain: { value: new THREE.Vector3(...TUNNEL_GAIN) } }),
    []
  );
  const last = useRef({ p: 0, dir: 1 });

  useFrame((state, dt) => {
    const m = fill.current;
    if (!m) return;
    const { coverage: cov, scrollProgress: p } = useScene.getState();
    // The direction of travel, kept through a held frame, so the walls flow toward the viewer
    // on the dive and away on the return trip.
    if (Math.abs(p - last.current.p) > 1e-6) last.current.dir = p > last.current.p ? 1 : -1;
    last.current.p = p;
    m.visible = cov > 0.006;
    if (!m.visible) return;

    const cam = state.camera as THREE.PerspectiveCamera;
    cam.getWorldDirection(_fwd);
    const d = 1.0;
    m.position.copy(cam.position).addScaledVector(_fwd, d);
    m.quaternion.copy(cam.quaternion);
    const h = 2 * d * Math.tan((cam.fov * DEG2RAD) / 2) * 1.3;
    const aspect = state.size.width / Math.max(1, state.size.height);
    m.scale.set(h * aspect, h, 1);
    const u = (m.material as THREE.ShaderMaterial).uniforms;
    const step = Math.min(dt, 0.1);
    u.uFlow.value += step * 3.2 * last.current.dir;
    u.uTime.value += step;
    u.uWarm.value = smoothstep(COVER_IN, COVER_OUT, p);
    u.uAspect.value = aspect;
    // Opaque well before the swap window (the machine fires only while cov > 0.95) and
    // ramped from low coverage rather than slammed on near the peak: coming back UP from the
    // solar overview this plane is the whole transition, with no dive fade underneath it.
    u.uOpacity.value = smoothstep(0.15, 0.95, cov);
  });

  return (
    <mesh ref={fill} renderOrder={19} visible={false}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        vertexShader={tunnelVertex}
        fragmentShader={tunnelFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </mesh>
  );
}
