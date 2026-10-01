'use client';
import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useScene } from '@/lib/sceneStore';
import { ORR, orrGeom } from '@/lib/orrery';
import { TOUR_SECTIONS } from '@/lib/sections';

const SKY_TILT = 0.42; // must match SolarAct's solarRoot rotation.x (and Constellations')
const START = TOUR_SECTIONS.findIndex((s) => s.id === 'projects');

/**
 * The world-fixed sky layers (HeroStars, Nebula) turned with the mobile swipe about the same
 * tilted ecliptic normal as Constellations, so the whole sky moves as one (Codex on #78: the
 * diffraction stars and nebulae stood still while the real sky turned past them). Counted from
 * the opening stop, so the frame a visitor lands on - the gold galaxy anchor included - is
 * exactly the one it was. The galaxy act is never turned.
 */
export default function TourSky({ children }: { children: React.ReactNode }) {
  const yaw = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = yaw.current;
    if (!g) return;
    const s = useScene.getState();
    if (s.act !== 'solar') g.rotation.y = 0;
    else if (s.tourMode && !s.focusedPlanet) g.rotation.y = (s.tourPos - START) * ORR.SP * orrGeom().dir;
  });
  return (
    <group rotation={[SKY_TILT, 0, 0]}>
      <group ref={yaw}>
        <group rotation={[-SKY_TILT, 0, 0]}>{children}</group>
      </group>
    </group>
  );
}
