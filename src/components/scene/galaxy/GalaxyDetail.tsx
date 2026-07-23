'use client';
import { useMemo } from 'react';
import * as THREE from 'three';
import { softSprite, spikeSprite } from '@/lib/spaceMaterials';

const RADIUS = 6;
const BRANCHES = 4;
const SPIN = 1.1;

/** A point on a spiral arm (matches Galaxy's params) with a little scatter. */
function armPoint(rng: () => number): [number, number, number] {
  const radius = 1 + Math.pow(rng(), 0.7) * (RADIUS - 1);
  const branch = (Math.floor(rng() * BRANCHES) / BRANCHES) * Math.PI * 2;
  const spin = radius * SPIN;
  const scatter = () => (rng() - 0.5) * 0.5;
  return [Math.cos(branch + spin) * radius + scatter(), scatter() * 0.4, Math.sin(branch + spin) * radius + scatter()];
}

/**
 * The details that turn the point cloud into an astronomical photo: glowing
 * pink-magenta HII star-birth pockets scattered through the arms, and a handful
 * of hero stars with diffraction spikes. All from the shared materials module.
 */
export default function GalaxyDetail() {
  const soft = useMemo(softSprite, []);
  const spike = useMemo(spikeSprite, []);

  const hii = useMemo(() => {
    let s = 1;
    const rng = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    return Array.from({ length: 22 }, () => ({
      pos: armPoint(rng),
      scale: 0.3 + rng() * 0.5,
      hue: rng() > 0.5 ? '#e0559b' : '#c0407a',
    }));
  }, []);

  const heroStars = useMemo(() => {
    let s = 99;
    const rng = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    return Array.from({ length: 8 }, () => ({
      pos: armPoint(rng),
      scale: 0.5 + rng() * 0.5,
      hue: rng() > 0.4 ? '#dfe8ff' : '#ffe9c8',
    }));
  }, []);

  // Dark dust clouds — normal-blended near-void sprites that darken the stars
  // behind them (the identifying mark of a real galaxy), drawn after the arms.
  const dust = useMemo(() => {
    let s = 4242;
    const rng = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    return Array.from({ length: 10 }, () => ({ pos: armPoint(rng), scale: 1.2 + rng() * 1.6 }));
  }, []);

  return (
    <group>
      {dust.map((d, i) => (
        <sprite key={`dust${i}`} position={d.pos} scale={[d.scale, d.scale * 0.6, 1]} renderOrder={2}>
          <spriteMaterial map={soft} color="#05060f" transparent opacity={0.5} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
      {hii.map((h, i) => (
        <sprite key={`hii${i}`} position={h.pos} scale={[h.scale, h.scale, 1]}>
          <spriteMaterial map={soft} color={h.hue} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
      {heroStars.map((h, i) => (
        <sprite key={`hero${i}`} position={h.pos} scale={[h.scale, h.scale, 1]}>
          <spriteMaterial map={spike} color={h.hue} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}
