'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * The naked-eye sky behind the solar system (Elad, 2026-09-28: "the sky still feels empty next
 * to what a human eye sees from Earth"): every star to magnitude 6 at its real position, colour
 * and brightness - down to magnitude 7.5, what a long exposure from a dark site shows, about
 * 25,500 stars - and the Milky Way where it really runs. Rendered inside the Constellations
 * group, so it shares that sky's frame exactly - see skyPoint there for the orientation.
 *
 * Both assets are baked from d3-celestial 0.7.35 (BSD-3, Olaf Frohn) by scripts/bake-sky.py:
 * - /sky/stars.bin: 6 bytes a star, little-endian - u16 lon*100, u16 (lat+90)*100, u8 (mag+2)*25,
 *   u8 (B-V+0.5)*100 - ecliptic J2000, brightest first, from stars.8.json cut at magnitude 7.5.
 *   Stars already drawn by a figure are left out, so no star is drawn twice.
 * - /sky/milkyway.png: the five mw.json brightness contours, summed, in an ecliptic
 *   equirectangular frame (u = longitude / 360, top row = latitude +90).
 */
const STAR_R = 165;       // just beyond the figures (160)
const MW_R = 175;         // behind everything, inside the far plane (200)
const MW_GAIN = 0.11;     // the band's peak brightness - Elad judges this one on the preview
const DEG = Math.PI / 180;

/** B-V colour index -> star colour (blue-white O/B through orange-red M), mildly saturated. */
const BV_STOPS: [number, [number, number, number]][] = [
  [-0.3, [0.66, 0.76, 1.0]], [0.0, [0.84, 0.89, 1.0]], [0.6, [1.0, 0.96, 0.9]],
  [1.2, [1.0, 0.84, 0.64]], [2.0, [1.0, 0.7, 0.46]],
];
function bvColor(bv: number): [number, number, number] {
  if (bv <= BV_STOPS[0][0]) return BV_STOPS[0][1];
  for (let i = 1; i < BV_STOPS.length; i++) {
    const [b1, c1] = BV_STOPS[i];
    if (bv <= b1) {
      const [b0, c0] = BV_STOPS[i - 1];
      const t = (bv - b0) / (b1 - b0);
      return [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t];
    }
  }
  return BV_STOPS[BV_STOPS.length - 1][1];
}

const STAR_VS = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  uniform float uDpr;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    gl_PointSize = aSize * uDpr;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
const STAR_FS = /* glsl */ `
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.0, d);
    gl_FragColor = vec4(vColor * a * a, 1.0);
  }`;

const MW_VS = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
// Inverse of Constellations' skyPoint: dir = (cos l cos b, -sin b, sin l cos b), l = lon - lon0.
const MW_FS = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uLon0;
  uniform float uGain;
  varying vec3 vDir;
  const float PI = 3.14159265;
  void main() {
    vec3 d = normalize(vDir);
    float lon = atan(d.z, d.x) + uLon0;
    float lat = asin(clamp(-d.y, -1.0, 1.0));
    vec2 uv = vec2(fract(lon / (2.0 * PI)), 0.5 + lat / PI); // flipY: v = 1 is the top row (lat +90)
    float v = texture2D(uMap, uv).r;
    gl_FragColor = vec4(vec3(0.78, 0.84, 1.0) * v * uGain, 1.0);
  }`;

export default function RealSky({ lon0 }: { lon0: number }) {
  const [data, setData] = useState<DataView | null>(null);
  useEffect(() => {
    let live = true;
    fetch('/sky/stars.bin')
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`stars.bin ${r.status}`))))
      .then((b) => { if (live) setData(new DataView(b)); })
      .catch((e) => console.error('[RealSky]', e)); // the figures and the rest of the sky still render
    return () => { live = false; };
  }, []);

  const stars = useMemo(() => {
    if (!data) return null;
    const n = data.byteLength / 6;
    const pos = new Float32Array(n * 3), size = new Float32Array(n), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const o = i * 6;
      const l = (data.getUint16(o, true) / 100 - lon0) * DEG, b = (data.getUint16(o + 2, true) / 100 - 90) * DEG;
      const mag = data.getUint8(o + 4) / 25 - 2, bv = data.getUint8(o + 5) / 100 - 0.5;
      pos[i * 3] = Math.cos(l) * Math.cos(b) * STAR_R;
      pos[i * 3 + 1] = -Math.sin(b) * STAR_R;
      pos[i * 3 + 2] = Math.sin(l) * Math.cos(b) * STAR_R;
      // The figure stars' scale (Constellations.tsx) for the bright ones; below magnitude ~4.8 a
      // floor takes over. On that scale alone a mag-6 star came out at ~5% after the tone
      // mapper and the vignette - the "empty sky". The floor stays under the faintest figure
      // star (0.32 at mag 4.6), so the figures remain the brightest thing in their patch.
      size[i] = Math.max(1.6 + (4.6 - mag) * 1.15, 1.5);
      const a = Math.min(1.1, Math.max(0.32 + (4.6 - mag) * 0.24, 0.28 - 0.05 * (mag - 5)));
      const c = bvColor(bv);
      col[i * 3] = c[0] * a; col[i * 3 + 1] = c[1] * a; col[i * 3 + 2] = c[2] * a;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    const m = new THREE.ShaderMaterial({
      vertexShader: STAR_VS, fragmentShader: STAR_FS, uniforms: { uDpr: { value: 1 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    return new THREE.Points(g, m);
  }, [data, lon0]);

  const band = useMemo(() => {
    const tex = new THREE.TextureLoader().load('/sky/milkyway.png');
    // No mipmaps: the u seam at longitude 0 would otherwise pick a tiny mip there and draw a line.
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.wrapS = THREE.RepeatWrapping;
    const m = new THREE.ShaderMaterial({
      vertexShader: MW_VS, fragmentShader: MW_FS,
      uniforms: { uMap: { value: tex }, uLon0: { value: lon0 * DEG }, uGain: { value: MW_GAIN } },
      side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    return { geo: new THREE.SphereGeometry(MW_R, 64, 32), mat: m, tex };
  }, [lon0]);

  useEffect(() => () => { stars?.geometry.dispose(); (stars?.material as THREE.Material | undefined)?.dispose(); }, [stars]);
  useEffect(() => () => { band.geo.dispose(); band.mat.dispose(); band.tex.dispose(); }, [band]);

  // Through the ref: the memoised object is a render input and must not be mutated directly.
  const pts = useRef<THREE.Points>(null);
  useFrame((state) => {
    const p = pts.current;
    if (p) (p.material as THREE.ShaderMaterial).uniforms.uDpr.value = state.gl.getPixelRatio();
  });

  return (
    <group name="real-sky">
      <mesh geometry={band.geo} material={band.mat} renderOrder={-1} />
      {stars && <primitive ref={pts} object={stars} />}
    </group>
  );
}
