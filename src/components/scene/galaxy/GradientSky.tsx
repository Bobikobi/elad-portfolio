'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vert = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const frag = /* glsl */ `
  uniform float uTime;
  uniform float uSolar;                               // 0 galaxy .. 1 solar
  varying vec3 vPos;
  void main() {
    float h = normalize(vPos).y * 0.5 + 0.5;          // 0 bottom .. 1 top
    float breathe = 0.5 + 0.5 * sin(uTime * 0.07);    // slow, few-percent drift
    // Galaxy: a rich dark indigo dome. Solar: a MUCH deeper, less-violet void so the
    // system sits in dark space — the old bright violet dome, saturated by the grade and
    // cropped by the vignette, read as a "lavender oval" washing the whole frame (F1).
    vec3 bottomG = vec3(0.020, 0.027, 0.078);
    vec3 topG    = mix(vec3(0.035, 0.030, 0.090), vec3(0.055, 0.045, 0.120), breathe);
    vec3 bottomS = vec3(0.010, 0.013, 0.030);
    vec3 topS    = mix(vec3(0.016, 0.018, 0.040), vec3(0.024, 0.024, 0.052), breathe);
    vec3 bottom = mix(bottomG, bottomS, uSolar);
    vec3 top    = mix(topG,    topS,    uSolar);
    vec3 col = mix(bottom, top, smoothstep(0.15, 1.0, h));
    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Breathing depth-gradient sky sphere — no flat "background colour" anywhere. In the
 *  solar act it drops to a deep void so the planets read against dark space. */
export default function GradientSky({ solar = false }: { solar?: boolean }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uSolar: { value: 0 } }), []);
  useFrame((_, dt) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value += dt;
    // Ease between the two skies so the act swap has no hard colour step.
    const u = matRef.current.uniforms.uSolar;
    u.value += ((solar ? 1 : 0) - u.value) * Math.min(1, dt * 1.5);
  });
  return (
    <mesh scale={-1} name="sky">
      <sphereGeometry args={[90, 32, 32]} />
      <shaderMaterial ref={matRef} vertexShader={vert} fragmentShader={frag} uniforms={uniforms} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}
