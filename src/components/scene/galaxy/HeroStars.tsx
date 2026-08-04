'use client';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { makeSparkleMaterial, starColor } from '@/lib/spaceMaterials';
import { makeRng, SEED } from '@/lib/rng';

/**
 * A handful of bright hero stars with diffraction spikes, scattered across the far sky at
 * large radius. Pure additive sprites (localized, no broad wash) — they add sparkle and
 * depth to the background. Shared sky: lives in SceneRoot so both acts show the SAME stars
 * (one universe, no flicker at the swap). Colour comes from the shared stellar palette so
 * they match the field stars.
 *
 * B13+: the spike is drawn per fragment now (see makeSparkleMaterial) rather than stamped
 * from a canvas that stroked a constant-width cross — that was a plus sign, not a glint.
 * Ray LENGTH scales with the star's brightness, the brightest few get faint 45°
 * secondaries, and every star scintillates on its own phase.
 */
interface Hero {
  pos: [number, number, number];
  scale: number;
  bright: number; // 0..1
  color: THREE.Color;
  phase: number;
  rate: number;
}

const COUNT = 11;

export default function HeroStars() {
  const group = useRef<THREE.Group>(null);
  const stars = useMemo<Hero[]>(() => {
    const rnd = makeRng(SEED.heroStars);
    return Array.from({ length: COUNT }, () => {
      // On a large sphere, biased away from dead-centre so they read as distant sky, not
      // objects among the planets.
      const u = rnd() * Math.PI * 2;
      const v = Math.acos(2 * rnd() - 1);
      const R = 70 + rnd() * 14;
      // Power law: mostly modest glints, a couple of genuinely bright ones.
      const bright = Math.pow(rnd(), 2.2);
      return {
        pos: [
          R * Math.sin(v) * Math.cos(u),
          R * Math.cos(v) * 0.7 + 6, // lift a touch so more sit above the ecliptic
          -Math.abs(R * Math.sin(v) * Math.sin(u)) - 8, // keep them in the far -z sky
        ],
        scale: 2.4 + bright * 3.4,
        bright,
        color: starColor(new THREE.Color(), rnd),
        phase: rnd() * 6.28,
        rate: 0.35 + rnd() * 0.75,
      };
    });
  }, []);

  const materials = useMemo(
    () =>
      stars.map((s) =>
        makeSparkleMaterial({
          color: s.color,
          // Ray length follows brightness — the whole point of a hero star is that the
          // bright ones throw the longer spikes.
          rayLen: 0.1 + s.bright * 0.13,
          secondary: s.bright > 0.82 ? 1 : 0,
          phase: s.phase,
          rate: s.rate,
          opacity: 0.55 + s.bright * 0.45,
        })
      ),
    [stars]
  );
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);

  return (
    <group ref={group} name="heroStars">
      {stars.map((s, i) => (
        <sprite key={i} position={s.pos} scale={[s.scale, s.scale, 1]} material={materials[i]} />
      ))}
    </group>
  );
}
