'use client';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { softSprite, makeSparkleMaterial } from '@/lib/spaceMaterials';
import { makeRng, SEED } from '@/lib/rng';

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
  const soft = useMemo(() => softSprite(), []);

  // Three fields, three seeds. These were already deterministic — via three copies of a
  // hand-rolled Lehmer generator whose seed lived in a closure variable, which the
  // immutability rule flags because that closure outlives the render. Same determinism, one
  // implementation, and the seeds are now in the register instead of being magic numbers.
  const hii = useMemo(() => {
    const rng = makeRng(SEED.galaxyDetail);
    return Array.from({ length: 22 }, () => ({
      pos: armPoint(rng),
      scale: 0.3 + rng() * 0.5,
      hue: rng() > 0.5 ? '#e0559b' : '#c0407a',
    }));
  }, []);

  const heroStars = useMemo(() => {
    const rng = makeRng(SEED.galaxyDetailHeroes);
    return Array.from({ length: 8 }, () => ({
      pos: armPoint(rng),
      scale: 0.5 + rng() * 0.5,
      hue: rng() > 0.4 ? '#dfe8ff' : '#ffe9c8',
    }));
  }, []);

  // B13+: procedural tapered spikes with their own scintillation (shared clock).
  const heroMats = useMemo(
    () => heroStars.map((h, i) => makeSparkleMaterial({ color: h.hue, rayLen: 0.12 + (i % 4) * 0.025, secondary: i === 0 ? 1 : 0, phase: i * 1.7, rate: 0.5 + (i % 3) * 0.2, opacity: 0.9 })),
    [heroStars]
  );
  useEffect(() => () => heroMats.forEach((m) => m.dispose()), [heroMats]);

  // Dark dust clouds — normal-blended near-void sprites that darken the stars
  // behind them (the identifying mark of a real galaxy), drawn after the arms.
  const dust = useMemo(() => {
    const rng = makeRng(SEED.galaxyDetailDust);
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
        <sprite key={`hero${i}`} position={h.pos} scale={[h.scale, h.scale, 1]} material={heroMats[i]} />
      ))}
    </group>
  );
}
