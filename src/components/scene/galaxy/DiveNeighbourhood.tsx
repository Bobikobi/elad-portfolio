'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { softSprite } from '@/lib/spaceMaterials';
import { makeRng, SEED } from '@/lib/rng';
import { useScene } from '@/lib/sceneStore';
import { DIVE_DESIGN, diveStarAt } from '@/lib/diveStar';
import { galaxyFrame } from './Galaxy';

// Where the dive ends (CameraRig DIVE_P1, within 0.2 of this since the locked dive of #82 stage 2
// moved it 0.35 short of the star), for the path as designed: the points move with the star
// (lib/diveStar, `target - DIVE_DESIGN`). The disc there is only ~0.25 thick, so a camera
// that arrives inside it sees a bright line over black; this fills the space around the
// arrival point with stars above and below the plane so the arrival reads as being INSIDE.
const CENTRE = new THREE.Vector3(3.7, 0, 1.5);
const COUNT = 7000;
// From 0.15 of the scroll (was 0.35): the first half of the dive was the rest view getting
// closer, fine detail 0.86-1.2 where the second half reached 3-7.5; the field fading in from
// here doubles the dive's median fine detail (C4, M101 in motion, 2026-10-04).
const FADE_FROM = 0.15;
const FADE_TO = 0.6;
const OPACITY = 0.9;

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Stars in the neighbourhood of the dive's arrival point. Opacity is a pure function of
 * scroll (zero at rest, so the galaxy's at-rest frame is untouched), and the field is seeded,
 * so the way back retraces the same frames as the way in.
 */
export default function DiveNeighbourhood() {
  const matRef = useRef<THREE.PointsMaterial>(null);
  const map = useMemo(() => softSprite(), []);

  const geometry = useMemo(() => {
    const rnd = makeRng(SEED.diveNeighbourhood);
    const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) * 1.2;
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const c = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = CENTRE.x + gauss() * 1.8;
      pos[i * 3 + 1] = Math.max(-0.9, Math.min(0.9, gauss() * 0.42));
      pos[i * 3 + 2] = CENTRE.z + gauss() * 1.8;
      c.set(rnd() < 0.2 ? '#ffe9c8' : rnd() < 0.5 ? '#9db8ff' : '#6d7fe8').multiplyScalar(0.5 + rnd() * 0.7);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return geo;
  }, []);
  // Handed in as a prop, so R3F does not dispose it; the act unmounts at every crossing.
  useEffect(() => () => geometry.dispose(), [geometry]);

  const ptsRef = useRef<THREE.Points>(null);
  useFrame(() => {
    if (ptsRef.current) {
      diveStarAt(galaxyFrame.spin, ptsRef.current.position);
      ptsRef.current.position.x -= DIVE_DESIGN[0];
      ptsRef.current.position.z -= DIVE_DESIGN[2];
    }
    if (matRef.current) matRef.current.opacity = smoothstep(FADE_FROM, FADE_TO, useScene.getState().scrollProgress) * OPACITY;
  });

  return (
    <points ref={ptsRef} geometry={geometry} raycast={() => null} frustumCulled={false}>
      <pointsMaterial
        ref={matRef}
        map={map}
        size={0.07}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
