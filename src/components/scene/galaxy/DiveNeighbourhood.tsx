'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { makeRng, SEED } from '@/lib/rng';
import { useScene } from '@/lib/sceneStore';
import { DISC_R, DIVE_DESIGN, diveStarAt } from '@/lib/diveStar';
import { HUD_AVAILABLE } from '../DebugHud';
import { galaxyFrame, galaxyLight } from './Galaxy';
import { spriteStarFragment, spriteStarUniforms, spriteStarVertex } from './spriteStars';

// Where the dive ends (CameraRig DIVE_P1, within 0.2 of this since the locked dive of #82 stage 2
// moved it 0.35 short of the star), for the path as designed: the points move with the star
// (lib/diveStar, `target - DIVE_DESIGN`). The disc there is only ~0.25 thick, so a camera
// that arrives inside it sees a bright line over black; this fills the space around the
// arrival point with stars above and below the plane so the arrival reads as being INSIDE.
const CENTRE = new THREE.Vector3(3.7, 0, 1.5);
const COUNT = 7000;
const SIZE = 0.07;
// Owner, 2026-10-06: at the start of the scroll the right-hand side filled with points "too
// bright, as if suddenly on the screen and not out of the galaxy" - 3.1x the points over the
// dim outer arm that rest had there, all at 0.9 in a fixed palette of blues. Each star now
// takes the photo's colour where it lies (COLOUR_CELLS around it, so a dim cell's noisy ratio
// cannot paint it green), is kept with the photo's light there (KEEP_GAMMA, gentler than the
// sparkles' 1.5 so the arrival stays thick), and shows at FAR of the sparkles' opacity until
// the camera comes within NEAR_TO of it, then brightens to BOOST times it by NEAR[0]: the stars
// come out of the galaxy as it is reached, and the arrival is as bright as it was. Swept
// (keep, boost, near, far): 0.75/2/5/0.3 left 1.5x the points on the dim rim and a seam to the
// tunnel of 14.6 (C2, bar 10, master 3.0) - the old blue snow had lit the last frame; 0.3/3/6/
// 0.12 gives 1.35x and 4.5.
const OPACITY = 0.5;
const COLOUR_CELLS = 3;
// `?dn=keepGamma,boost,nearTo,far` in HUD builds is the sweep knob.
const [KEEP_GAMMA, BOOST, NEAR_TO, FAR] = (() => {
  const d = [0.3, 3, 6, 0.12];
  const v = HUD_AVAILABLE && typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('dn') : null;
  if (v === null) return d;
  const n = v.split(',').map(Number);
  if (n.length !== 4 || n.some((x) => !Number.isFinite(x) || x < 0)) throw new Error(`DiveNeighbourhood: ?dn must be keepGamma,boost,nearTo,far - got "${v}"`);
  return n;
})();
const NEAR: [number, number] = [1.5, NEAR_TO];
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
  const uniforms = useMemo(() => {
    const u = spriteStarUniforms(SIZE, TWINKLE, REVEAL_SOFT);
    u.uNear.value.set(NEAR[0], NEAR[1]);
    u.uBoost.value = BOOST;
    u.uFar.value = FAR;
    return u;
  }, []);

  // Built once the photo's light is sampled (Galaxy, about a second after the photo); until then
  // nothing is drawn, which at rest is what is drawn anyway.
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const build = () => {
    const ph = galaxyLight();
    if (!ph) return;
    const rnd = makeRng(SEED.diveNeighbourhood);
    const order = makeRng(SEED.diveReveal);
    const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) * 1.2;
    // The cloud is laid on the disc as it stands unturned: its design centre moved onto the knot.
    // The points turn with the disc (useFrame), so a star keeps the place in the photo it took
    // its colour from.
    const knot = diveStarAt(0, new THREE.Vector3());
    const dx = knot.x - DIVE_DESIGN[0];
    const dz = knot.z - DIVE_DESIGN[2];
    const pos: number[] = [];
    const col: number[] = [];
    const on: number[] = [];
    const phase: number[] = [];
    const cell = (2 * ph.r) / ph.map;
    for (let i = 0; i < COUNT; i++) {
      const x = CENTRE.x + gauss() * 1.8 + dx;
      const y = Math.max(-0.9, Math.min(0.9, gauss() * 0.42));
      const z = CENTRE.z + gauss() * 1.8 + dz;
      const bright = 0.5 + rnd() * 0.7;
      const keep = rnd();
      const t = order();
      const tw = order();
      const inside = RIM * DISC_R - Math.hypot(x, z);
      if (inside < 0) continue;
      const ci = Math.min(ph.map - 1, Math.max(0, Math.floor((x + ph.r) / cell)));
      const cj = Math.min(ph.map - 1, Math.max(0, Math.floor((z + ph.r) / cell)));
      const c = cj * ph.map + ci;
      const light = ph.light[c];
      if (!(light > 0) || keep > (Math.min(light, ph.cap) / ph.cap) ** KEEP_GAMMA) continue;
      let r = 0, g = 0, b = 0;
      for (let jj = Math.max(0, cj - COLOUR_CELLS); jj <= Math.min(ph.map - 1, cj + COLOUR_CELLS); jj++) {
        for (let ii = Math.max(0, ci - COLOUR_CELLS); ii <= Math.min(ph.map - 1, ci + COLOUR_CELLS); ii++) {
          const n = (jj * ph.map + ii) * 3;
          r += ph.rgb[n];
          g += ph.rgb[n + 1];
          b += ph.rgb[n + 2];
        }
      }
      const top = Math.max(r, g, b);
      const edge = Math.min(1, inside / RIM_FLAT);
      pos.push(x, y * edge * edge * (3 - 2 * edge), z);
      col.push((r / top) * bright, (g / top) * bright, (b / top) * bright);
      on.push(REVEAL_FROM + (REVEAL_TO - REVEAL_FROM - REVEAL_SOFT) * t);
      phase.push(tw);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('aOn', new THREE.Float32BufferAttribute(on, 1));
    geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(phase, 1));
    setGeometry(geo);
  };
  // Handed in as a prop, so R3F does not dispose it; the act unmounts at every crossing.
  useEffect(() => () => geometry?.dispose(), [geometry]);

  const ptsRef = useRef<THREE.Points>(null);
  useFrame((state) => {
    if (!geometry) {
      build();
      return;
    }
    if (ptsRef.current) ptsRef.current.rotation.y = galaxyFrame.spin;
    const u = matRef.current?.uniforms;
    if (!u) return;
    const p = useScene.getState().scrollProgress;
    u.uReveal.value = p;
    u.uOpacity.value = p > 0 ? OPACITY : 0;
    u.uScale.value = state.size.height * 0.5;
    u.uTime.value = state.clock.elapsedTime;
  });

  if (!geometry) return null;
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
