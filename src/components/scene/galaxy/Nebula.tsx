'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { softSprite, NEBULA_HUES, CORE_GOLD } from '@/lib/spaceMaterials';

/**
 * The wrapping FAR SKY — lives in SceneRoot, never swaps, so the universe is
 * continuous through the act transition. Everything here sits on a large radius
 * (55-85) so it reads as distant backdrop, NOT as objects among the planets (the
 * old bug: patches at radius ~10 sat inside the orbits and washed the frame). Three
 * layers: coloured nebula veils in the corners, a few tiny distant galaxies, and the
 * gold galaxy-core anchor low on the horizon — "the galaxy we dived out of".
 */

interface Patch {
  pos: [number, number, number];
  scale: number;
  color: string;
  op: number;
}

// Coloured nebula veils, biased to the upper corners + sides + the far -z sky so no
// screen region is dead black. Indigo/violet with two warmer HII touches (pink/rose).
const NEBULAE: Patch[] = [
  { pos: [-52, 34, -44], scale: 46, color: NEBULA_HUES[1], op: 0.19 }, // upper-left violet
  { pos: [50, 36, -42], scale: 44, color: NEBULA_HUES[0], op: 0.17 }, // upper-right blue
  { pos: [-64, -18, -30], scale: 40, color: NEBULA_HUES[2], op: 0.12 }, // left indigo
  { pos: [62, -14, -34], scale: 38, color: NEBULA_HUES[0], op: 0.11 }, // right blue
  { pos: [4, 46, -50], scale: 52, color: NEBULA_HUES[1], op: 0.17 }, // top violet
  { pos: [-24, 30, -56], scale: 40, color: NEBULA_HUES[4], op: 0.11 }, // top-left pink HII touch
  { pos: [32, 22, -58], scale: 38, color: NEBULA_HUES[3], op: 0.10 }, // top-right magenta touch
  { pos: [-20, -38, -60], scale: 40, color: NEBULA_HUES[2], op: 0.09 }, // lower violet
];

// A few faint distant galaxies — small soft ellipses (whitish-blue), far off.
const GALAXIES: Patch[] = [
  { pos: [48, 22, -72], scale: 5.5, color: '#c9d4ff', op: 0.5 },
  { pos: [-52, -10, -68], scale: 4.2, color: '#e6dcff', op: 0.42 },
  { pos: [18, -30, -74], scale: 3.4, color: '#cfe0ff', op: 0.36 },
];

export default function Nebula({ intensity = 1 }: { intensity?: number }) {
  const tex = useMemo(softSprite, []);
  const group = useRef<THREE.Group>(null);
  // Slow absolute drift from base position (time-based, not per-frame accumulation).
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const g = group.current;
    if (!g) return;
    for (let i = 0; i < NEBULAE.length; i++) {
      const child = g.children[i];
      const base = NEBULAE[i].pos;
      child.position.x = base[0] + Math.sin(t * 0.02 + i) * 1.4;
      child.position.y = base[1] + Math.cos(t * 0.017 + i * 1.3) * 1.1;
    }
  });
  return (
    <group ref={group} name="nebula">
      {NEBULAE.map((p, i) => (
        <sprite key={`n${i}`} position={p.pos} scale={[p.scale, p.scale * 0.72, 1]}>
          <spriteMaterial map={tex} color={p.color} transparent opacity={p.op * intensity} blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      ))}
      {GALAXIES.map((p, i) => (
        <sprite key={`g${i}`} position={p.pos} scale={[p.scale, p.scale * 0.5, 1]}>
          <spriteMaterial map={tex} color={p.color} transparent opacity={p.op * intensity} blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      ))}
      {/* Galaxy-core anchor — the gold we came from, hanging small + low on the far
          horizon. Same gold + sprite as the sun's halo = the colour bridge between
          acts. Kept distant and dim so it never competes with the real sun. */}
      <sprite position={[-56, -12, -76]} scale={[20, 13, 1]}>
        <spriteMaterial map={tex} color={CORE_GOLD} transparent opacity={0.3 * intensity} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      <sprite position={[-56, -12, -75]} scale={[7, 5, 1]}>
        <spriteMaterial map={tex} color={'#fff0d0'} transparent opacity={0.38 * intensity} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
    </group>
  );
}
