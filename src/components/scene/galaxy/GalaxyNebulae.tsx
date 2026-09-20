'use client';
import { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { loadBitmapTexture } from '@/lib/bitmapTexture';

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
// GALAXY-REST: the pockets were seeded out to radius 4.6, where the point cloud now fades out.
// A nebula that does not fade is what reaches the frame border, so the outer ones are pulled in
// and dimmed; the arms keep their colour, the picture stops running off the edges.
const PULL_IN = 0.76;
const POCKETS: Pocket[] = [
  { img: 'lagoon', pos: [2.8, 0.15, 1.6], scale: 3.2, tint: '#e88fb0', op: 0.5 }, // pink HII
  { img: 'orion', pos: [-3.2, 0.1, -1.2], scale: 3.6, tint: '#c99ce0', op: 0.42 }, // violet HII
  { img: 'trifid', pos: [1.4, 0.2, -3.4], scale: 2.8, tint: '#e090c0', op: 0.46 }, // magenta HII
  { img: 'tarantula', pos: [-2.2, -0.1, 3.4], scale: 3.0, tint: '#ff9aa8', op: 0.4 }, // rose HII
  { img: 'eagle', pos: [4.2, 0.1, -0.6], scale: 3.0, tint: '#f0c088', op: 0.24 }, // gold arm
  { img: 'ring', pos: [-4.6, 0.15, 0.8], scale: 2.2, tint: '#8fd0e6', op: 0.22 }, // blue reflection
];

export default function GalaxyNebulae() {
  const group = useRef<THREE.Group>(null);
  const gl = useThree((s) => s.gl);
  const textureLoads = useMemo(
    () =>
      POCKETS.map((p) =>
        loadBitmapTexture(`/textures/nebula/${p.img}.webp`, gl, { colorSpace: THREE.SRGBColorSpace })
      ),
    [gl]
  );
  const texes = textureLoads.map((load) => load.texture);
  useEffect(() => () => textureLoads.forEach((load) => load.dispose()), [textureLoads]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const g = group.current;
    if (!g) return;
    for (let i = 0; i < POCKETS.length; i++) {
      const base = POCKETS[i].pos;
      const c = g.children[i];
      c.position.x = base[0] * PULL_IN + Math.sin(t * 0.03 + i) * 0.18;
      c.position.z = base[2] * PULL_IN + Math.cos(t * 0.025 + i * 1.3) * 0.18;
    }
  });

  return (
    <group ref={group}>
      {POCKETS.map((p, i) => (
        <sprite key={p.img} position={[p.pos[0] * PULL_IN, p.pos[1], p.pos[2] * PULL_IN]} scale={[p.scale, p.scale * 0.78, 1]}>
          <spriteMaterial map={texes[i]} color={p.tint} transparent opacity={p.op} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}
