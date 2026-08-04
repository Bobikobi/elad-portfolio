'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { makeRng, SEED } from '@/lib/rng';

function softDot() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,0.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/**
 * Foreground interstellar dust — large soft motes scattered through the volume
 * (many between camera and galaxy) so parallax always has something drifting near
 * the lens. Additive, faint, slowly turning.
 */
export default function Dust({ count = 70 }: { count?: number }) {
  const tex = useMemo(() => softDot(), []);
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const rnd = makeRng(SEED.foregroundDust);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rnd() - 0.5) * 26;
      pos[i * 3 + 1] = (rnd() - 0.5) * 16;
      pos[i * 3 + 2] = (rnd() - 0.5) * 22;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count]);

  useFrame((_, dt) => {
    if (ref.current) {
      ref.current.rotation.y += dt * 0.01;
      ref.current.rotation.x += dt * 0.004;
    }
  });

  return (
    <points ref={ref} geometry={geo} raycast={() => null} frustumCulled={false}>
      <pointsMaterial
        map={tex}
        color="#9fb0e8"
        size={0.7}
        sizeAttenuation
        transparent
        opacity={0.28}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
