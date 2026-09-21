'use client';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { softSprite, makeSparkleMaterial } from '@/lib/spaceMaterials';
import { makeRng, SEED } from '@/lib/rng';

// GALAXY-REST: these used to be 6 / 4 / 1.1 - the galaxy's old four-branch, tightly wound shape.
// The point cloud is two broad arms that fade out over their outer third, so the old numbers
// scattered the pink pockets and hero stars over empty sky, including out at the frame edges.
// They track the arms again, and stop short of the fade.
//
// Round 3 keeps them in step with Galaxy.tsx's PARAMS: the disc grew to 6.3 and its fade moved
// out to 0.62, so detail that stopped at 0.8 of the OLD radius would now sit in the bright inner
// half only and leave the widened arms bare.
const RADIUS = 6.3;
const BRANCHES = 2;
const SPIN = 0.42;
const OUTER = 0.78; // no detail past here: beyond it the arms themselves are fading out

/** A point on a spiral arm (matches Galaxy's params) with a little scatter. */
function armPoint(rng: () => number): [number, number, number] {
  // Radius spread evenly from outside the core, plus an angular scatter across the arm: two
  // branches with a power law piled all 22 pockets into two clumps against the core, which read as
  // pink bokeh balls rather than star-birth regions along the arms, and swelled the measured core.
  const radius = 2.2 + rng() * (RADIUS * OUTER - 2.2);
  const branch = (Math.floor(rng() * BRANCHES) / BRANCHES) * Math.PI * 2 + (rng() - 0.5) * 0.6;
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
      scale: 0.22 + rng() * 0.32,
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
          <spriteMaterial map={soft} color={h.hue} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
      {heroStars.map((h, i) => (
        <sprite key={`hero${i}`} position={h.pos} scale={[h.scale, h.scale, 1]} material={heroMats[i]} />
      ))}
    </group>
  );
}
