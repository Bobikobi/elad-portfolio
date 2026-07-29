'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScene } from '@/lib/sceneStore';
import { softSprite, CORE_GOLD } from '@/lib/spaceMaterials';

// Shared compact value-noise (used by both the surface colour and the edge wobble).
const NOISE_GLSL = /* glsl */ `
  float hash(vec3 p){ p = fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float noise(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                   mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                   mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
  float fbm(vec3 p){ float v=0.0, a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.0; a*=0.5; } return v; }
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
    float d = fbm(normalize(position) * 3.0 + vec3(0.0, uTime * 0.12, 0.0));
    vec3 displaced = position + normal * (d - 0.5) * 0.09;
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
    vec3 p = vPos * 2.4;
    float slow = fbm(p + vec3(0.0, uTime*0.05, 0.0));               // big slow swirls
    float fast = fbm(p*2.6 - vec3(0.0, uTime*0.16, uTime*0.05));    // fast granules
    float n = slow*0.6 + fast*0.4;
    vec3 dark = vec3(0.55, 0.14, 0.02);
    vec3 mid  = vec3(1.0, 0.5, 0.11);
    vec3 hot  = vec3(1.0, 0.93, 0.66);
    vec3 col = mix(dark, mid, smoothstep(0.28, 0.6, n));
    col = mix(col, hot, smoothstep(0.62, 0.86, n));
    float limb = pow(max(dot(vNormal, vec3(0.0,0.0,1.0)), 0.0), 0.35); // subtle limb darkening
    col *= (2.0 + uPulse) * mix(0.75, 1.0, limb);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const SUN_R = 1.5;
const PROM_COUNT = 7;

// R2.2 milky-halo fix. A bisection (Debug HUD + corner luminance) showed the washed
// "milky halo" around the sun on arrival — worst on mobile — came from the additive gold
// corona SHELL (scale 1.28) being amplified by Bloom into a large pale disc, with the soft
// outer halo SPRITE (scale 4.4) secondary. Both off: Bloom alone gives a tight natural
// glow and the system sits in dark space (corners <10% lum, measured).
const SHOW_HALO_SPRITE = false;  // big soft gold disc (scale 4.4) — milky-halo contributor
const SHOW_CORONA_SHELL = false; // corona backside shell (scale 1.28) — primary milky-halo source
const SHOW_ANAMORPHIC = true;    // short horizontal gold streak — kept (subtle, not a wash)

/** Solar prominences — flame arcs licking off the limb, each on its own irregular
 *  cycle so some are erupting while others fade (spec: break in 10-25s cycles). */
function Prominences() {
  const group = useRef<THREE.Group>(null);
  const tex = useMemo(softSprite, []);
  const proms = useMemo(
    () =>
      Array.from({ length: PROM_COUNT }, (_, i) => {
        const a = (i / PROM_COUNT) * Math.PI * 2 + Math.random() * 0.5;
        return {
          a,
          x: Math.cos(a),
          y: Math.sin(a),
          len: 0.8 + Math.random() * 1.1,
          speed: 0.06 + Math.random() * 0.09,
          phase: Math.random() * 6.28,
        };
      }),
    []
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const g = group.current;
    if (!g) return;
    for (let i = 0; i < proms.length; i++) {
      const pr = proms[i];
      // Irregular eruption envelope: mostly small, occasionally licks out far.
      const base = 0.5 + 0.5 * Math.sin(t * pr.speed + pr.phase);
      const burst = Math.max(0, Math.sin(t * pr.speed * 0.5 + pr.phase * 1.7) - 0.72) * 3.4;
      const e = Math.min(1.4, base * 0.5 + burst);
      const s = g.children[i] as THREE.Sprite;
      const l = SUN_R * (1.0 + pr.len * 0.5 * e);
      s.position.set(pr.x * (SUN_R + 0.05) * 1.02, pr.y * (SUN_R + 0.05) * 1.02, 0);
      s.scale.set(0.5 + 0.4 * e, l, 1);
      (s.material as THREE.SpriteMaterial).opacity = 0.12 + 0.5 * e;
      s.material.rotation = pr.a - Math.PI / 2;
    }
  });
  return (
    <group ref={group}>
      {proms.map((_, i) => (
        <sprite key={i}>
          <spriteMaterial map={tex} color={'#ff8a2a'} transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}

/** The burning sun: displaced plasma surface (HDR for Bloom/God Rays), fresnel
 *  corona, soft gold halo, living prominences and a slow pulse. Registers its mesh
 *  as the God Rays source. Its gold = the galaxy core's gold (one continuity). */
export default function Sun() {
  const meshRef = useRef<THREE.Mesh>(null);
  const setSunMesh = useScene((s) => s.setSunMesh);
  const tex = useMemo(softSprite, []);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uPulse: { value: 0 } }), []);

  useEffect(() => {
    setSunMesh(meshRef.current);
    return () => setSunMesh(null);
  }, [setSunMesh]);

  useFrame((_, dt) => {
    uniforms.uTime.value += dt;
    // Breathe on irregular slow noise + rare flare pulse (spec: sun is alive).
    const t = uniforms.uTime.value;
    uniforms.uPulse.value = 0.15 * Math.sin(t * 0.6) + 0.1 * Math.sin(t * 0.23 + 1.3) + Math.max(0, Math.sin(t * 0.11) - 0.9) * 3.0;
    if (meshRef.current) meshRef.current.rotation.y += dt * 0.03;
  });

  return (
    <group name="sun">
      <pointLight position={[0, 0, 0]} intensity={650} distance={90} decay={2} color="#ffd9a0" />
      {/* Plasma surface (the God Rays source) */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[SUN_R, 96, 96]} />
        <shaderMaterial vertexShader={sunVert} fragmentShader={sunFrag} uniforms={uniforms} toneMapped={false} />
      </mesh>
      <Prominences />
      {/* Fresnel-ish corona shell */}
      {SHOW_CORONA_SHELL && (
        <mesh scale={1.28}>
          <sphereGeometry args={[SUN_R, 32, 32]} />
          <meshBasicMaterial color={CORE_GOLD} transparent opacity={0.12} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {/* Soft outer halo sprite — hugs the corona. Kept tight + low opacity so it reads
          as corona bloom, not a milky haze washing the frame (F3, worst on small/mobile
          viewports where the same sprite covers more of the frame). */}
      {SHOW_HALO_SPRITE && (
        <sprite scale={[4.4, 4.4, 1]}>
          <spriteMaterial map={tex} color={CORE_GOLD} transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
      )}
      {/* Subtle gold anamorphic streak — short, gold, fades to the tips (softSprite is
          transparent at its edges), NOT the old cheap white cross-screen band. */}
      {SHOW_ANAMORPHIC && (
        <sprite scale={[8, 0.28, 1]}>
          <spriteMaterial map={tex} color={'#ffd9a0'} transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
      )}
    </group>
  );
}
