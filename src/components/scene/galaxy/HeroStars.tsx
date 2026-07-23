'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { spikeSprite, starColor } from '@/lib/spaceMaterials';

/**
 * A handful of bright hero stars with 4-point diffraction spikes, scattered across the
 * far sky at large radius. Pure additive sprites (localized, no broad wash) — they add
 * sparkle + depth to the background and twinkle slowly on their own phases. Shared sky:
 * lives in SceneRoot so both acts show the SAME stars (one universe, no flicker at the
 * swap). Colour comes from the shared stellar palette so they match the field stars.
 */
interface Hero {
  pos: [number, number, number];
  scale: number;
  color: THREE.Color;
  phase: number;
  speed: number;
}

const COUNT = 11;

export default function HeroStars() {
  const tex = useMemo(spikeSprite, []);
  const group = useRef<THREE.Group>(null);
  const stars = useMemo<Hero[]>(() => {
    return Array.from({ length: COUNT }, () => {
      // On a large sphere, biased away from dead-centre so they read as distant sky, not
      // objects among the planets.
      const u = Math.random() * Math.PI * 2;
      const v = Math.acos(2 * Math.random() - 1);
      const R = 70 + Math.random() * 14;
      return {
        pos: [
          R * Math.sin(v) * Math.cos(u),
          R * Math.cos(v) * 0.7 + 6, // lift a touch so more sit above the ecliptic
          -Math.abs(R * Math.sin(v) * Math.sin(u)) - 8, // keep them in the far -z sky
        ],
        scale: 2.4 + Math.random() * 2.6,
        color: starColor(new THREE.Color()),
        phase: Math.random() * 6.28,
        speed: 0.4 + Math.random() * 0.8,
      };
    });
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const g = group.current;
    if (!g) return;
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const spr = g.children[i] as THREE.Sprite;
      // Slow, per-star twinkle (opacity) — the sky is alive, never a frozen backdrop.
      (spr.material as THREE.SpriteMaterial).opacity = 0.5 + 0.4 * Math.sin(t * s.speed + s.phase);
    }
  });

  return (
    <group ref={group}>
      {stars.map((s, i) => (
        <sprite key={i} position={s.pos} scale={[s.scale, s.scale, 1]}>
          <spriteMaterial map={tex} color={s.color} transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}
