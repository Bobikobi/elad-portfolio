'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vert = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aScale;
  attribute float aPhase;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(aScale * uPixelRatio * (1.0 / -mv.z), 0.5, 14.0 * uPixelRatio);
    vTwinkle = 0.7 + 0.3 * sin(uTime * (0.6 + aPhase) + aPhase * 6.28);
    vColor = aColor;
  }
`;
const frag = /* glsl */ `
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    float a = smoothstep(0.5, 0.12, d);
    gl_FragColor = vec4(vColor, a * vTwinkle);
  }
`;

// Realistic stellar colour classes (spec: ~55% warm-white, 15% orange giants,
// 20% hot blue-white, 10% deep blue).
function starColor(): [number, number, number] {
  const r = Math.random();
  const c = new THREE.Color();
  if (r < 0.55) c.setHSL(0.11, 0.35, 0.9);
  else if (r < 0.7) c.setHSL(0.06, 0.75, 0.62);
  else if (r < 0.9) c.setHSL(0.6, 0.5, 0.86);
  else c.setHSL(0.62, 0.8, 0.6);
  return [c.r, c.g, c.b];
}

/**
 * Volumetric star field the camera flies THROUGH on the dive — a thick corridor of
 * stars in every direction (above/below/sides), so perspective alone makes them
 * flee to all four edges (a star tunnel, not a flat band). Real star colours +
 * power-law sizes kill the "uniform flakes" look.
 */
export default function DiveField({ count = 4200 }: { count?: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const pixelRatio = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 1.5) : 1;

  const geo = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const scale = new Float32Array(count);
    const phase = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Fill a wide, tall volume around the dive corridor (origin ← → welcome).
      pos[i * 3] = (Math.random() - 0.5) * 34;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 22;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 34;
      const [r, g, b] = starColor();
      col[i * 3] = r; col[i * 3 + 1] = g; col[i * 3 + 2] = b;
      // Power-law sizes: many small, few big.
      scale[i] = 10 + Math.pow(Math.random(), 5) * 90;
      phase[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aScale', new THREE.BufferAttribute(scale, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    return g;
  }, [count]);

  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uPixelRatio: { value: pixelRatio } }), [pixelRatio]);
  useFrame((_, dt) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += dt;
  });

  return (
    <points geometry={geo} raycast={() => null} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
