'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScene } from '@/lib/sceneStore';
import { featherSpriteProps } from '@/lib/spaceMaterials';

/**
 * Photographic nebula veils threaded along the dive corridor (T2.5). Real
 * public-domain Hubble/NASA stills (NASA Image & Video Library), pre-feathered into
 * soft-edged transparent patches, hung at varied depths and hues. The dive flies
 * THROUGH them: a few sit right on the flight path and wash the frame in translucent
 * colour as the camera passes; the rest hang farther out for depth. Each drifts on
 * its own phase and parallaxes by its depth — so the corridor reads rich like the
 * reference photos, not like a flat backdrop. Additive + toneMapped:false so Bloom
 * catches the bright cores; all fade in with the dive so the welcome stays minimal.
 */

// Mirrors the camera path (CameraRig DIVE_FROM → DIVE_TO); veils are seeded relative
// to it so "close" ones are genuinely on the flight line.
const A = new THREE.Vector3(0, 2.6, 9);
const B = new THREE.Vector3(3.6, 0, 1.6);
const DIR = new THREE.Vector3().subVectors(B, A);
const LEN = DIR.length();
DIR.normalize();
const NX = new THREE.Vector3().crossVectors(DIR, new THREE.Vector3(0, 1, 0)).normalize();
const NY = new THREE.Vector3().crossVectors(DIR, NX).normalize();

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

interface VeilDef {
  slug: string;
  u: number;          // fraction along the (extended) corridor
  off: [number, number]; // radial offset in the (NX, NY) plane
  scale: number;
  tint: string;       // gentle hue lean (multiplies the photo - kept pale)
  op: number;
  close: boolean;     // on the flight path → washes the frame on the pass
  phase: number;
}

// WAVE-END SWEEP — the opacities below were all cut to roughly a third of what they were.
//
// The mid-dive frame measured mean 134, median 137 and p99 189: half the picture sitting
// above mid-grey with the whole histogram squeezed into a narrow bright band, saturation
// down at 0.33. On screen that is a flat salmon fog with no black anywhere and no
// structure — not a galaxy interior. Corners read 20-33% against a frame that should be
// mostly space.
//
// The cause is the one the whole wave keeps finding. These are ADDITIVE layers, and their
// values were chosen when nothing tone-mapped: a stack of veils that summed past 1.0 used
// to clip to a bright coloured core with dark sky between, so pushing them was free at the
// edges and only cost saturation in the middle. With ACES actually running, that same sum
// no longer clips — it ROLLS OFF, so every part of the frame the veils touch lands in the
// same compressed mid-tone and the contrast between core and gap disappears. More opacity
// stopped buying brightness and started buying fog.
//
// Bisected on the alias, and the answer was not one sprite: hiding any single veil moved
// the corners by under half a point, while hiding the GROUP took the frame from mean 140
// to 63 and the corners from 33% to 8%. So it is the sum that is wrong, and the fix is a
// level, not surgery.
//
// Then the dive was profiled end to end rather than judged from the one screenshot that
// had been taken, and that changed the second cut. The haze was not spread over the
// descent — it was a BAND. At scroll 0.05-0.35 the frame held a floor of p10 37-47 and a
// range near 200; at 0.5-0.62 the floor rose to 67-72 and the range collapsed to 130-141.
// That band is the middle of the corridor, where the `lagoon` close pass overlaps `bubble`
// and `ring` — three of the largest sprites in the set, stacked. So those five came down
// again while the rest stayed: the early dive was already right and cutting it further
// would have taken colour out of a part that never had a problem.
const VEILS: VeilDef[] = [
  // Three close passes on the flight line, distinct hues (spec acceptance: ≥2).
  { slug: 'eagle',     u: 0.30, off: [1.3, 0.8],   scale: 16, tint: '#bfe6ea', op: 0.22, close: true,  phase: 0.0 },  // teal
  { slug: 'lagoon',    u: 0.56, off: [-1.6, -1.0], scale: 15, tint: '#f0c39a', op: 0.21, close: true,  phase: 2.1 },  // warm/rose
  { slug: 'orion',     u: 0.80, off: [-1.0, 1.4],  scale: 17, tint: '#e6b48c', op: 0.22, close: true,  phase: 4.0 },  // warm orange
  // Depth layer — farther off the path, larger, fainter.
  { slug: 'helix',     u: 0.04, off: [-7, -6],     scale: 30, tint: '#c4bcf2', op: 0.15, close: false, phase: 1.2 },  // violet
  { slug: 'trifid',    u: 0.16, off: [10, 6],      scale: 30, tint: '#b9c4ff', op: 0.17, close: false, phase: 3.4 },  // indigo/blue
  { slug: 'bubble',    u: 0.40, off: [-12, 4],     scale: 34, tint: '#aecbff', op: 0.10, close: false, phase: 0.7 },  // blue
  { slug: 'ring',      u: 0.50, off: [13, 10],     scale: 34, tint: '#e6a8c8', op: 0.09, close: false, phase: 5.1 },  // pink
  { slug: 'veil',      u: 0.66, off: [9, -8],      scale: 28, tint: '#a9e0d6', op: 0.15, close: false, phase: 2.7 },  // teal
  { slug: 'crab',      u: 0.90, off: [-8, 7],      scale: 26, tint: '#dca6d0', op: 0.15, close: false, phase: 1.9 },  // magenta
  { slug: 'tarantula', u: 1.06, off: [4, -3],      scale: 24, tint: '#f0cba0', op: 0.20, close: false, phase: 3.9 },  // warm (final approach glow)
];

function veilBase(v: VeilDef): THREE.Vector3 {
  return new THREE.Vector3()
    .copy(A)
    .addScaledVector(DIR, (v.u - 0.15) * (LEN + 14))
    .addScaledVector(NX, v.off[0])
    .addScaledVector(NY, v.off[1]);
}

export default function TransitVeils() {
  const group = useRef<THREE.Group>(null);

  const textures = useMemo(
    () =>
      VEILS.map((v) => {
        const tx = new THREE.TextureLoader().load(`/textures/nebula/${v.slug}.webp`);
        tx.colorSpace = THREE.SRGBColorSpace;
        return tx;
      }),
    []
  );
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);

  const bases = useMemo(() => VEILS.map(veilBase), []);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const cam = state.camera.position;
    // Reveal with the dive so the minimal welcome isn't cluttered by clouds.
    const reveal = smoothstep(0.03, 0.2, useScene.getState().scrollProgress);
    for (let i = 0; i < VEILS.length; i++) {
      const v = VEILS[i];
      const child = g.children[i] as THREE.Sprite;
      const b = bases[i];
      // Own slow drift (independent phase) → the layers never move as one.
      child.position.set(
        b.x + Math.sin(t * 0.05 + v.phase) * 0.5,
        b.y + Math.cos(t * 0.043 + v.phase) * 0.4,
        b.z + Math.sin(t * 0.037 + v.phase * 1.7) * 0.4
      );
      const d = cam.distanceTo(child.position);
      // Close veils grow to wash the frame on approach, then clear as the camera
      // passes through (cut just before d→0 so no flat slab / near-plane clip).
      // Distant veils only read in the mid range, never wash.
      //
      // The far edge came in from 30→12 to 22→9. A "close pass" is meant to be a PASS: at
      // the old envelope a close veil sat at full opacity across eighteen units of the
      // corridor, which at scale 16 is most of the dive spent inside one sprite rather
      // than crossing it. The near edge is unchanged — that one exists to avoid the
      // near-plane slab and was never the problem.
      const env = v.close
        ? smoothstep(0.7, 2.2, d) * smoothstep(22, 9, d)
        : smoothstep(3, 8, d) * smoothstep(72, 30, d);
      const mat = child.material as THREE.SpriteMaterial;
      mat.opacity = v.op * reveal * env;
      child.visible = mat.opacity > 0.008;
    }
  });

  return (
    <group ref={group}>
      {VEILS.map((v, i) => (
        <sprite key={v.slug} scale={[v.scale, v.scale, 1]} position={bases[i].toArray()}>
          <spriteMaterial
            map={textures[i]}
            color={v.tint}
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
            {...featherSpriteProps}
          />
        </sprite>
      ))}
    </group>
  );
}
