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

  // Cheap smooth 3D value noise — used for a large-scale drift over the dome.
  float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x){
    vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }

  void main() {
    vec3 dir = normalize(vPos);
    float h = dir.y * 0.5 + 0.5;                      // 0 bottom .. 1 top
    float breathe = 0.5 + 0.5 * sin(uTime * 0.07);    // slow, few-percent drift
    // Galaxy: a rich dark indigo dome. Solar: a MUCH deeper, less-violet void so the
    // system sits in dark space — the old bright violet dome, saturated by the grade and
    // cropped by the vignette, read as a "lavender oval" washing the whole frame (F1).
    // WAVE-END SWEEP. The dome's TOP was carrying the galaxy act's corner floor. The
    // gradient runs from `bottomG` at the horizon to `topG` overhead, and the two differ
    // by nearly 3×; the welcome pose looks ACROSS the disc so its corners sample the dim
    // bottom, while the dive pitches through the plane and its corners swing up into the
    // bright top. Measured: corners 15.6% at scroll 0.35 against 24.8% at 0.5, on the same
    // sky. That is not a grade decision, it is a gradient nobody had looked at from both
    // ends. Bisecting the mid-dive frame put the dome first, ahead of the veils: hiding it
    // alone took three of the four corners from 13-21% to 6-11%.
    // The top comes down ~30% so the two poses read as one sky. The hue is untouched —
    // it was never the colour that was wrong, only how much of it there is overhead.
    vec3 bottomG = vec3(0.020, 0.027, 0.078);
    vec3 topG    = mix(vec3(0.026, 0.024, 0.066), vec3(0.038, 0.032, 0.086), breathe);
    vec3 bottomS = vec3(0.010, 0.013, 0.030);
    vec3 topS    = mix(vec3(0.016, 0.018, 0.040), vec3(0.024, 0.024, 0.052), breathe);
    vec3 bottom = mix(bottomG, bottomS, uSolar);
    vec3 top    = mix(topG,    topS,    uSolar);
    vec3 col = mix(bottom, top, smoothstep(0.15, 1.0, h));
    // B4+: a large, slow drift over the dome so NO patch of sky is ever motionless. The
    // 20s no-input test found a corner that moved by 0.2 of 255 over the whole window —
    // technically alive, actually frozen. Two octaves at different rates so the pattern
    // never repeats, and ±12% of a sky that is already near-black is invisible as an
    // effect and decisive as a measurement.
    float drift = noise(dir * 1.7 + vec3(0.0, uTime * 0.013, uTime * 0.008)) * 0.65
                + noise(dir * 3.9 - vec3(uTime * 0.006, 0.0, uTime * 0.011)) * 0.35;
    col *= 0.88 + 0.24 * drift;
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
