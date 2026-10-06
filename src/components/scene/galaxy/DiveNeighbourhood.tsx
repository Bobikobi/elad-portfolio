'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { makeRng, SEED } from '@/lib/rng';
import { useScene } from '@/lib/sceneStore';
import { DISC_R, DIVE_DESIGN, diveStarAt } from '@/lib/diveStar';
import { galaxyFrame } from './Galaxy';
import { paletteStar, spriteStarFragment, spriteStarUniforms, spriteStarVertex } from './spriteStars';

// Where the dive ends (CameraRig DIVE_P1, within 0.2 of this since the locked dive of #82 stage 2
// moved it 0.35 short of the star), for the path as designed: the points move with the star
// (lib/diveStar, `target - DIVE_DESIGN`). The disc there is only ~0.25 thick, so a camera
// that arrives inside it sees a bright line over black; this fills the space around the
// arrival point with stars above and below the plane so the arrival reads as being INSIDE.
const CENTRE = new THREE.Vector3(3.7, 0, 1.5);
const COUNT = 7000;
const SIZE = 0.07;
const OPACITY = 0.9;
// Each star has its own moment to appear, spread evenly over [REVEAL_FROM, REVEAL_TO] of the
// scroll, and takes REVEAL_SOFT of scroll to come up. Owner, 2026-10-05: the whole cloud faded
// in together (one opacity over 0.15-0.6) and on the right-hand side it "popped out of nowhere";
// one by one, the eye follows the field thickening as the camera comes down.
const REVEAL_FROM = 0.03;
const REVEAL_TO = 0.62;
const REVEAL_SOFT = 0.12;
// Stars past this fraction of the disc's radius are dropped: off the disc's edge they had
// nothing under them and read as a cloud hanging beside the galaxy. The photo's own light ends
// well inside its square, so the rim is where the arms fade, and over the last RIM_FLAT of
// radius the stars settle onto the plane, or from the oblique welcome view the ones above it
// still stand out past the edge.
const RIM = 0.85;
const RIM_FLAT = 1.2;
const TWINKLE = 0.35;

/**
 * Stars in the neighbourhood of the dive's arrival point, the same kind of star as the galaxy's
 * sparkles (spriteStars), so the dive thickens a field that was already there at rest. A pure
 * function of scroll (zero at rest, so the galaxy's at-rest frame is untouched), and seeded, so
 * the way back retraces the same frames as the way in.
 */
export default function DiveNeighbourhood() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => spriteStarUniforms(SIZE, TWINKLE, REVEAL_SOFT), []);

  const geometry = useMemo(() => {
    const rnd = makeRng(SEED.diveNeighbourhood);
    const order = makeRng(SEED.diveReveal);
    const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) * 1.2;
    // Where the cloud sits on the disc before any turn: its design centre moved onto the knot.
    const knot = diveStarAt(0, new THREE.Vector3());
    const dx = knot.x - DIVE_DESIGN[0];
    const dz = knot.z - DIVE_DESIGN[2];
    const pos: number[] = [];
    const col: number[] = [];
    const on: number[] = [];
    const phase: number[] = [];
    const c = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      const x = CENTRE.x + gauss() * 1.8;
      const y = Math.max(-0.9, Math.min(0.9, gauss() * 0.42));
      const z = CENTRE.z + gauss() * 1.8;
      paletteStar(rnd, 0.2, c);
      const t = order();
      const ph = order();
      const inside = RIM * DISC_R - Math.hypot(x + dx, z + dz);
      if (inside < 0) continue;
      const edge = Math.min(1, inside / RIM_FLAT);
      pos.push(x, y * edge * edge * (3 - 2 * edge), z);
      col.push(c.r, c.g, c.b);
      on.push(REVEAL_FROM + (REVEAL_TO - REVEAL_FROM - REVEAL_SOFT) * t);
      phase.push(ph);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('aOn', new THREE.Float32BufferAttribute(on, 1));
    geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(phase, 1));
    return geo;
  }, []);
  // Handed in as a prop, so R3F does not dispose it; the act unmounts at every crossing.
  useEffect(() => () => geometry.dispose(), [geometry]);

  const ptsRef = useRef<THREE.Points>(null);
  useFrame((state) => {
    if (ptsRef.current) {
      diveStarAt(galaxyFrame.spin, ptsRef.current.position);
      ptsRef.current.position.x -= DIVE_DESIGN[0];
      ptsRef.current.position.z -= DIVE_DESIGN[2];
    }
    const u = matRef.current?.uniforms;
    if (!u) return;
    const p = useScene.getState().scrollProgress;
    u.uReveal.value = p;
    u.uOpacity.value = p > 0 ? OPACITY : 0;
    u.uScale.value = state.size.height * 0.5;
    u.uTime.value = state.clock.elapsedTime;
  });

  return (
    <points ref={ptsRef} geometry={geometry} raycast={() => null} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        vertexShader={spriteStarVertex}
        fragmentShader={spriteStarFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
