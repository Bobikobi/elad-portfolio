'use client';
import { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();

/**
 * Asteroid belt between Mars and Jupiter — ONE InstancedMesh (a single draw call)
 * of clumped, power-law-sized rocks on tilted eccentric orbits. Rotates slowly as a
 * group; each rock tumbles via its baked spin in the matrix (cheap).
 */
export default function AsteroidBelt({ count = 1100 }: { count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const rocks = useMemo(() => {
    return Array.from({ length: count }, () => {
      // Clumped: bias angles toward a few cluster centres.
      const cluster = Math.floor(Math.random() * 6) * (Math.PI / 3);
      const angle = cluster + (Math.random() - 0.5) * 1.4;
      const radius = 4.8 + Math.random() * 0.8;
      const y = (Math.random() - 0.5) * 0.3;
      const size = 0.025 + Math.pow(Math.random(), 4) * 0.14;
      return { angle, radius, y, size, rx: Math.random() * 6.28, rz: Math.random() * 6.28, spin: 0.2 + Math.random() * 0.5 };
    });
  }, [count]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    rocks.forEach((r, i) => {
      _p.set(Math.cos(r.angle) * r.radius, r.y, Math.sin(r.angle) * r.radius);
      _e.set(r.rx, 0, r.rz);
      _q.setFromEuler(_e);
      _s.setScalar(r.size);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [rocks]);

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.03;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#6b5f57" roughness={0.95} metalness={0.05} flatShading />
    </instancedMesh>
  );
}
