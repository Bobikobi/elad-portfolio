'use client';
import { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const _c = new THREE.Color();

// The belt lives between Mars (orbit 4.25) and Jupiter (6.3): a fine, dense ring, not a
// necklace of boulders. Radii are drawn from a soft gaussian around the centre so the
// belt has a dense core that thins at both edges (its real cross-section), and angles
// cluster into a few streams (Kirkwood-gap clumping) with dust between them.
const BELT_R = 5.3; // ring centre
const BELT_HALF = 0.55; // half-width of the dense zone
const CLUSTERS = 5;

// Rocky palette — cool basalt greys through warm carbonaceous browns. Baked per-rock as
// an instanceColor so the single draw call still shows material variety.
const ROCK_COLORS = ['#6b5f57', '#7a6a5c', '#585049', '#8a7563', '#4e463f', '#9c8871'];

/**
 * Asteroid belt between Mars and Jupiter — ONE InstancedMesh (a single draw call) of
 * clumped, power-law-sized rocks on a tilted ring. A strong power law makes the vast
 * majority tiny specks with only a few larger chunks, so it reads as a fine dusty belt
 * rather than scattered boulders. Rocks are lumpy (per-axis scale) and tinted per
 * instance; the whole ring drifts slowly and each rock keeps its baked tumble.
 */
export default function AsteroidBelt({ count = 1100 }: { count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const rocks = useMemo(() => {
    // Gaussian-ish radius via averaging two uniforms (triangular) → dense core, thin edges.
    const gauss = () => (Math.random() + Math.random() - 1); // ~[-1,1], peaked at 0
    return Array.from({ length: count }, () => {
      // Clumped angle: pick a stream centre, spread within it; a fraction scatter freely
      // as inter-stream dust so the clumps don't look like hard spokes.
      const stream = Math.floor(Math.random() * CLUSTERS) * ((Math.PI * 2) / CLUSTERS);
      const clumped = Math.random() < 0.72;
      const angle = clumped ? stream + gauss() * 0.55 : Math.random() * Math.PI * 2;
      const radius = BELT_R + gauss() * BELT_HALF + (clumped ? 0 : gauss() * 0.25);
      const y = gauss() * 0.16; // thin vertical spread → a disc, not a tube
      // Strong power law: most rocks are dust-fine, a rare few are visible chunks.
      const size = 0.014 + Math.pow(Math.random(), 5) * 0.11;
      // Lumpy, irregular rocks (non-uniform per-axis scale).
      const lump: [number, number, number] = [
        0.7 + Math.random() * 0.6,
        0.7 + Math.random() * 0.6,
        0.7 + Math.random() * 0.6,
      ];
      return {
        angle, radius, y, size, lump,
        color: ROCK_COLORS[(Math.random() * ROCK_COLORS.length) | 0],
        rx: Math.random() * 6.28, ry: Math.random() * 6.28, rz: Math.random() * 6.28,
      };
    });
  }, [count]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    rocks.forEach((r, i) => {
      _p.set(Math.cos(r.angle) * r.radius, r.y, Math.sin(r.angle) * r.radius);
      _e.set(r.rx, r.ry, r.rz);
      _q.setFromEuler(_e);
      _s.set(r.size * r.lump[0], r.size * r.lump[1], r.size * r.lump[2]);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
      mesh.setColorAt(i, _c.set(r.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [rocks]);

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.025;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      {/* No `color` prop: the per-instance instanceColor (setColorAt) multiplies the
          default white base, so each rock keeps its own tint from one draw call. */}
      <meshStandardMaterial roughness={0.95} metalness={0.05} flatShading />
    </instancedMesh>
  );
}
