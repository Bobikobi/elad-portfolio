'use client';
import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * A6 — one-universe cohesion. Real public-domain Hubble nebulae (the SAME sprites used by
 * the world backdrops and the dive veils) seeded into the spiral arms as HII star-forming
 * pockets + a couple of blue reflection nebulae. The galaxy stays a procedural point cloud;
 * these just give its arms the same photographic family the rest of the cosmos speaks in.
 * Embedded in the disc plane (radius ~2.5-4.6, y≈0), additive + low opacity so they read as
 * nebulosity among the stars, and drift slowly so the arms are never frozen.
 */
interface Pocket {
  img: string;
  pos: [number, number, number];
  scale: number;
  tint: string;
  op: number;
}
const POCKETS: Pocket[] = [
  { img: 'lagoon', pos: [2.8, 0.15, 1.6], scale: 3.2, tint: '#e88fb0', op: 0.5 }, // pink HII
  { img: 'orion', pos: [-3.2, 0.1, -1.2], scale: 3.6, tint: '#c99ce0', op: 0.42 }, // violet HII
  { img: 'trifid', pos: [1.4, 0.2, -3.4], scale: 2.8, tint: '#e090c0', op: 0.46 }, // magenta HII
  { img: 'tarantula', pos: [-2.2, -0.1, 3.4], scale: 3.0, tint: '#ff9aa8', op: 0.4 }, // rose HII
  { img: 'eagle', pos: [4.2, 0.1, -0.6], scale: 3.4, tint: '#f0c088', op: 0.34 }, // gold arm
  { img: 'ring', pos: [-4.6, 0.15, 0.8], scale: 2.4, tint: '#8fd0e6', op: 0.32 }, // blue reflection
];

export default function GalaxyNebulae() {
  const group = useRef<THREE.Group>(null);
  const texes = useMemo(() => {
    const loader = new THREE.TextureLoader();
    return POCKETS.map((p) => {
      const t = loader.load(`/textures/nebula/${p.img}.webp`);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    });
  }, []);
  useEffect(() => () => texes.forEach((t) => t.dispose()), [texes]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const g = group.current;
    if (!g) return;
    for (let i = 0; i < POCKETS.length; i++) {
      const base = POCKETS[i].pos;
      const c = g.children[i];
      c.position.x = base[0] + Math.sin(t * 0.03 + i) * 0.18;
      c.position.z = base[2] + Math.cos(t * 0.025 + i * 1.3) * 0.18;
    }
  });

  return (
    <group ref={group}>
      {POCKETS.map((p, i) => (
        <sprite key={p.img} position={p.pos} scale={[p.scale, p.scale * 0.78, 1]}>
          <spriteMaterial map={texes[i]} color={p.tint} transparent opacity={p.op} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}
