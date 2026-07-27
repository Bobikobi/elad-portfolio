'use client';
import { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const _c = new THREE.Color();

// The belt lives between Mars (orbit 4.25) and Jupiter (6.3): a fine, dense ring, not a
// necklace of boulders. Radii are drawn from a soft gaussian around the centre so the
// belt has a dense core that thins at both edges (its real cross-section), and angles
// cluster into a few streams (Kirkwood-gap clumping) with dust between them.
//
// R5.3 — the annulus is now HARD-CLAMPED to a corridor that cannot reach either
// neighbour's sphere. The old spread (5.3 ± 0.55, plus up to 0.25 of extra scatter)
// reached 6.10, while Jupiter's surface starts at 6.30 − 0.64 = 5.66: rocks were being
// seeded INSIDE the giant and poked back out through its skin as specks crawling over
// the disc — the pass-through. Radius never changes after seeding and everything orbits
// as one rigid group, so a purely radial guarantee holds for all time.
const BELT_R = 5.1; // ring centre
const BELT_HALF = 0.3; // half-width of the dense zone
const CLUSTERS = 5;
const MARS_REACH = 4.25 + 0.3; // Mars orbit + radius
const JUPITER_REACH = 6.3 - 0.64; // Jupiter orbit − radius
const R_MIN = MARS_REACH + 0.2; // 4.75
const R_MAX = JUPITER_REACH - 0.2; // 5.46

// Near-camera dissolve. In the close ORBIT frame the camera sits ~2.6 units from the
// focused planet, so belt rocks drifting between it and the lens rendered as crude
// low-poly boulders filling the frame (and crowding the band the navbar sits over).
// They now dissolve away as they approach: a stable screen-space dither `discard`, so
// the material stays OPAQUE and fully depth-tested against the planets — a fade would
// have needed transparency, which is exactly what breaks depth ordering.
const NEAR_GONE = 0.9; // fully dissolved closer than this (world units)
const NEAR_FULL = 2.7; // fully solid beyond this

// Rocky palette — cool basalt greys through warm carbonaceous browns. Baked per-rock as
// an instanceColor so the single draw call still shows material variety.
const ROCK_COLORS = ['#6b5f57', '#7a6a5c', '#585049', '#8a7563', '#4e463f', '#9c8871'];

/**
 * Asteroid belt between Mars and Jupiter — ONE InstancedMesh (a single draw call) of
 * clumped, power-law-sized rocks on a tilted ring. A strong power law makes the vast
 * majority tiny specks with only a few larger chunks, so it reads as a fine dusty belt
 * rather than scattered boulders. Rocks are lumpy (per-axis scale) and tinted per
 * instance; the whole ring drifts slowly and each rock keeps its baked tumble.
 */
export default function AsteroidBelt({ count = 1100 }: { count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const rocks = useMemo(() => {
    // Gaussian-ish radius via averaging two uniforms (triangular) → dense core, thin edges.
    const gauss = () => (Math.random() + Math.random() - 1); // ~[-1,1], peaked at 0
    return Array.from({ length: count }, () => {
      // Clumped angle: pick a stream centre, spread within it; a fraction scatter freely
      // as inter-stream dust so the clumps don't look like hard spokes.
      const stream = Math.floor(Math.random() * CLUSTERS) * ((Math.PI * 2) / CLUSTERS);
      const clumped = Math.random() < 0.72;
      const angle = clumped ? stream + gauss() * 0.55 : Math.random() * Math.PI * 2;
      const raw = BELT_R + gauss() * BELT_HALF + (clumped ? 0 : gauss() * 0.18);
      const radius = Math.min(R_MAX, Math.max(R_MIN, raw)); // never inside a neighbour
      const y = gauss() * 0.16; // thin vertical spread → a disc, not a tube
      // Strong power law: most rocks are dust-fine, a rare few are visible chunks.
      const size = 0.014 + Math.pow(Math.random(), 5) * 0.11;
      // Lumpy, irregular rocks (non-uniform per-axis scale).
      const lump: [number, number, number] = [
        0.7 + Math.random() * 0.6,
        0.7 + Math.random() * 0.6,
        0.7 + Math.random() * 0.6,
      ];
      return {
        angle, radius, y, size, lump,
        color: ROCK_COLORS[(Math.random() * ROCK_COLORS.length) | 0],
        rx: Math.random() * 6.28, ry: Math.random() * 6.28, rz: Math.random() * 6.28,
      };
    });
  }, [count]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    rocks.forEach((r, i) => {
      _p.set(Math.cos(r.angle) * r.radius, r.y, Math.sin(r.angle) * r.radius);
      _e.set(r.rx, r.ry, r.rz);
      _q.setFromEuler(_e);
      _s.set(r.size * r.lump[0], r.size * r.lump[1], r.size * r.lump[2]);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
      mesh.setColorAt(i, _c.set(r.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [rocks]);

  // Near-camera dissolve, injected into the standard material so the rocks keep real
  // lighting, real depth-writes and the single draw call. `vViewPosition` is already a
  // varying on MeshStandardMaterial, so this costs one length() and a hash per fragment.
  const onBeforeCompile = useMemo(
    () => (shader: THREE.WebGLProgramParametersWithUniforms) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
         {
           float _camD = length( vViewPosition );
           float _keep = smoothstep( ${NEAR_GONE.toFixed(2)}, ${NEAR_FULL.toFixed(2)}, _camD );
           if ( _keep < 0.999 ) {
             float _h = fract( sin( dot( gl_FragCoord.xy, vec2(12.9898, 78.233) ) ) * 43758.5453 );
             if ( _h > _keep ) discard;
           }
         }`
      );
    },
    []
  );

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.025;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      {/* No `color` prop: the per-instance instanceColor (setColorAt) multiplies the
          default white base, so each rock keeps its own tint from one draw call.
          Opaque + depthWrite (the default) is deliberate: it is what makes the belt
          depth-test correctly against every planet. */}
      <meshStandardMaterial roughness={0.95} metalness={0.05} flatShading onBeforeCompile={onBeforeCompile} />
    </instancedMesh>
  );
}
