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
  varying vec3 vPos;
  void main() {
    float h = normalize(vPos).y * 0.5 + 0.5;         // 0 bottom .. 1 top
    float breathe = 0.5 + 0.5 * sin(uTime * 0.07);    // slow, few-percent drift
    vec3 bottom = vec3(0.020, 0.027, 0.078);          // space-void
    vec3 top = mix(vec3(0.035, 0.030, 0.090), vec3(0.055, 0.045, 0.120), breathe); // dark indigo
    vec3 col = mix(bottom, top, smoothstep(0.15, 1.0, h));
    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Breathing depth-gradient sky sphere — no flat "background colour" anywhere. */
export default function GradientSky() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame((_, dt) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += dt;
  });
  return (
    <mesh scale={-1}>
      <sphereGeometry args={[90, 32, 32]} />
      <shaderMaterial ref={matRef} vertexShader={vert} fragmentShader={frag} uniforms={uniforms} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}
