'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScene } from '@/lib/sceneStore';
import { HUD_AVAILABLE } from '../DebugHud';
import { edgeOnShow, galaxyLight } from './Galaxy';

/**
 * The galaxy seen edge-on (owner, 2026-10-06). Dragged down at rest, the camera reaches the
 * disc's own height, where the photograph - a flat sheet - and the field drawn from it (0.03
 * thick) collapse to a line: 77 px high on a 1440 x 900 frame, against 382 at rest. The owner
 * asked for the drag to stay free and for that view to look real, at up to 4x the line's height.
 *
 * A real spiral seen edge-on is a thick glowing lens with a bulge in the middle, split along its
 * plane by a dark lane of dust (NGC 891, NGC 4565). This draws that: a camera-facing card on
 * the disc's axis holding the photo's light projected edge-on - its radial profile, colour by
 * colour, integrated along the line of sight, spread over a height that grows toward the
 * bulge - with the dust lane in its alpha, which dims what lies in the plane behind it (the
 * photo and the field; the stars lifted off the plane draw after it, renderOrder 2).
 *
 * It shows only near edge-on (Galaxy, edgeOnShow) and only at rest: from the welcome view (26 deg) and
 * through the dive it is not drawn at all, so neither changes.
 */
const TEX_W = 256;
const TEX_H = 128;
// Half-height of the card, world units.
const Y_MAX = 3.2;
// Vertical scale (sech^2) of the light at radius r: H_CORE at the centre, so the core stays a
// compact knot, rising to H_DISC by CORE_R. The bulge is not drawn taller: the line of sight
// through the bright inner rings already makes the middle columns the brightest, which is
// what makes the lens shape.
const H_CORE = 0.15;
const H_DISC_D = 0.42;
const CORE_R = 1.2;
// The dust lane: its half-height, its opacity, and where along the disc it thins out.
const DUST_H = 0.09;
const DUST_D = 0.75;
const DUST_TO: [number, number] = [0.45, 0.85];
// Peak brightness of the projected light, in the scene's linear units.
const GAIN_D = 1.1;
// `?eo=gain[,height[,dust]]` in HUD builds: the sweep knob.
const EO = (() => {
  const d = { gain: GAIN_D, h: H_DISC_D, dust: DUST_D };
  const v = HUD_AVAILABLE && typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('eo') : null;
  if (v === null) return d;
  const n = v.split(',').map(Number);
  if (n.length > 3 || n.some((x) => !Number.isFinite(x) || x < 0)) throw new Error(`EdgeOnDisc: ?eo must be gain[,height[,dust]], all >= 0 - got "${v}"`);
  return { gain: n[0], h: n[1] ?? d.h, dust: n[2] ?? d.dust };
})();
const RADIAL_BINS = 128;

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
// Premultiplied: rgb is light added, a the share of what is behind that the dust takes away.
const fragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uGain;
  uniform float uShow;
  varying vec2 vUv;
  void main() {
    vec4 t = texture2D(uMap, vUv);
    gl_FragColor = vec4(t.rgb * t.rgb * uGain * uShow, t.a * uShow);
  }
`;

// The projection is ~90 ms of arithmetic (256 x 96 x 128 sech^2 terms): built a column at a
// time inside this budget a frame, so the welcome view keeps its frame rate while it builds
// (it lands about a second after the photo, which the edge-on view is never reached before).
const BUILD_BUDGET_MS = 4;

/**
 * The photo's light projected edge-on, as TEX_W x TEX_H (x across the disc, y up its axis).
 * A generator: it yields after each column, and returns the texture.
 */
function* buildTexture(ph: NonNullable<ReturnType<typeof galaxyLight>>): Generator<void, THREE.DataTexture> {
  // Radial profile of the face-on photo: mean light and colour per ring.
  const sum = new Float64Array(RADIAL_BINS * 3);
  const n = new Float64Array(RADIAL_BINS);
  const cell = (2 * ph.r) / ph.map;
  for (let j = 0; j < ph.map; j++) {
    const z = -ph.r + (j + 0.5) * cell;
    for (let i = 0; i < ph.map; i++) {
      const x = -ph.r + (i + 0.5) * cell;
      const b = Math.floor((Math.hypot(x, z) / ph.r) * RADIAL_BINS);
      if (b >= RADIAL_BINS) continue;
      const c = j * ph.map + i;
      sum[b * 3] += ph.rgb[c * 3];
      sum[b * 3 + 1] += ph.rgb[c * 3 + 1];
      sum[b * 3 + 2] += ph.rgb[c * 3 + 2];
      n[b]++;
    }
  }
  const ring = (r: number, k: number) => {
    const b = Math.min(RADIAL_BINS - 1, Math.floor((r / ph.r) * RADIAL_BINS));
    return n[b] ? sum[b * 3 + k] / n[b] : 0;
  };
  // Edge-on: light at (x, y) is the line-of-sight integral of ring(r) * sech^2(y / h) / h.
  const img = new Float32Array(TEX_W * TEX_H * 3);
  const steps = 96;
  let peak = 0;
  for (let u = 0; u < TEX_W; u++) {
    const x = -ph.r + ((u + 0.5) / TEX_W) * 2 * ph.r;
    for (let s = 0; s < steps; s++) {
      const d = -ph.r + ((s + 0.5) / steps) * 2 * ph.r;
      const r = Math.hypot(x, d);
      if (r >= ph.r) continue;
      const h = H_CORE + (EO.h - H_CORE) * THREE.MathUtils.smoothstep(r, 0, CORE_R);
      const w = (2 * ph.r) / steps / h;
      const cr = ring(r, 0) * w, cg = ring(r, 1) * w, cb = ring(r, 2) * w;
      for (let v = 0; v < TEX_H; v++) {
        const y = (((v + 0.5) / TEX_H) * 2 - 1) * Y_MAX;
        const sh = 1 / Math.cosh(y / h);
        const k = sh * sh;
        const o = (v * TEX_W + u) * 3;
        img[o] += cr * k;
        img[o + 1] += cg * k;
        img[o + 2] += cb * k;
      }
    }
    yield;
  }
  for (let i = 0; i < img.length; i++) peak = Math.max(peak, img[i]);
  const data = new Uint8Array(TEX_W * TEX_H * 4);
  for (let v = 0; v < TEX_H; v++) {
    const y = (((v + 0.5) / TEX_H) * 2 - 1) * Y_MAX;
    for (let u = 0; u < TEX_W; u++) {
      const x = ((u + 0.5) / TEX_W) * 2 - 1;
      const dust = EO.dust * Math.exp(-((y / DUST_H) ** 2)) * (1 - THREE.MathUtils.smoothstep(Math.abs(x), DUST_TO[0], DUST_TO[1]));
      // The ends and the top and bottom fade, so the card has no visible edge.
      const end = (1 - THREE.MathUtils.smoothstep(Math.abs(x), 0.9, 1)) * (1 - THREE.MathUtils.smoothstep(Math.abs(y) / Y_MAX, 0.5, 1));
      const o = v * TEX_W + u;
      for (let k = 0; k < 3; k++) data[o * 4 + k] = Math.round(255 * Math.sqrt((img[o * 3 + k] / peak) * (1 - 0.6 * dust) * end));
      data[o * 4 + 3] = Math.round(255 * dust * end);
    }
  }
  const tex = new THREE.DataTexture(data, TEX_W, TEX_H, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export default function EdgeOnDisc() {
  const [tex, setTex] = useState<THREE.DataTexture | null>(null);
  const [radius, setRadius] = useState(1);
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  useEffect(() => () => tex?.dispose(), [tex]);
  const uniforms = useMemo(() => ({ uMap: { value: tex }, uGain: { value: EO.gain }, uShow: { value: 0 } }), [tex]);

  const build = useRef<Generator<void, THREE.DataTexture> | null>(null);

  useFrame(({ camera }) => {
    if (!tex) {
      if (!build.current) {
        const ph = galaxyLight();
        if (!ph) return;
        setRadius(ph.r);
        build.current = buildTexture(ph);
      }
      const t0 = performance.now();
      let step = build.current.next();
      while (!step.done && performance.now() - t0 < BUILD_BUDGET_MS) step = build.current.next();
      if (step.done) {
        build.current = null;
        setTex(step.value);
      }
      return;
    }
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;
    const p = camera.position;
    const show = edgeOnShow(p, useScene.getState().scrollProgress);
    mesh.visible = show > 0.001;
    mat.uniforms.uShow.value = show;
    mesh.rotation.y = Math.atan2(p.x, p.z);
  });

  if (!tex) return null;
  return (
    <mesh ref={meshRef} renderOrder={1} raycast={() => null} visible={false}>
      <planeGeometry args={[2 * radius, 2 * Y_MAX]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.CustomBlending}
        blendSrc={THREE.OneFactor}
        blendDst={THREE.OneMinusSrcAlphaFactor}
      />
    </mesh>
  );
}
