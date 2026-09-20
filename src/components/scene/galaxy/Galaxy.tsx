'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { galaxyVertexShader, galaxyFragmentShader } from './shaders';
import { makeRng, SEED } from '@/lib/rng';

/** Same curve as GLSL smoothstep, on the CPU side. */
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

interface GalaxyProps {
  count?: number;
}

// Design system: ivory core → cosmic-blue mid → galaxy-indigo arm edges.
//
// GALAXY-REST: four tightly-wound branches read as concentric rings, not arms (measured: the
// four-fold angular component m4 = 0.18). Two broad arms with a quarter of the winding read as
// arms, and the per-point angular spread below is what makes them broad and irregular instead
// of four thin wires. The core is ivory rather than gold because it is the only warm thing left
// in the frame and gold at this density smeared across 41% of the picture.
const PARAMS = {
  radius: 5.4,
  branches: 2,
  spin: 0.42,
  randomness: 0.22,
  randomnessPower: 2.8,
  armSpread: 0.42, // radians of angular scatter at the rim: broad arms, not wires
  bulgeShare: 0.14, // points drawn into the compact core instead of the disc
  bulgeRadius: 0.85,
  laneOffset: 0.38, // where the dust lane runs across the arm, as a share of the arm's half-width
  laneWidth: 0.16,
  laneDepth: 0.85, // how much of a point's light the lane takes
  discDim: 0.58, // arms read grey-blue instead of white, and stop merging into the core
  bulgeGain: 2.1, // the core is the one thing allowed to saturate
  coreColor: '#FFF4E2', // ivory
  midColor: '#4D8DFF', // --cosmic-blue
  edgeColor: '#6D5AE6', // --galaxy-indigo
};

/** Procedural spiral galaxy as a single additive point cloud, spun in the vertex shader. */
export default function Galaxy({ count = 200000 }: GalaxyProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const pixelRatio = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 1.5) : 1;

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const randomness = new Float32Array(count * 3);
    const dims = new Float32Array(count);

    const core = new THREE.Color(PARAMS.coreColor);
    const mid = new THREE.Color(PARAMS.midColor);
    const edge = new THREE.Color(PARAMS.edgeColor);
    const tmp = new THREE.Color();
    const rnd = makeRng(SEED.galaxy);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const bulge = i % 100 < PARAMS.bulgeShare * 100;
      // The disc keeps the old radial law; the bulge is a separate, much tighter population,
      // which is what makes the core a point instead of the inner half of the disc.
      const radius = bulge
        ? Math.pow(rnd(), 2.6) * PARAMS.bulgeRadius
        : 0.35 + Math.pow(rnd(), 0.9) * (PARAMS.radius - 0.35);
      const branchAngle = ((i % PARAMS.branches) / PARAMS.branches) * Math.PI * 2;
      const spinAngle = radius * PARAMS.spin;
      // Angular scatter across the arm, widening outward, with a cube law so the arm has a
      // dense spine and thin edges. Plus a slow radial wobble so no arm is a clean curve.
      const t = radius / PARAMS.radius;
      const u = Math.pow(rnd(), 3) * (rnd() < 0.5 ? 1 : -1);
      const spread = bulge ? (rnd() - 0.5) * Math.PI * 2 : u * PARAMS.armSpread * (0.25 + t);
      const wobble = bulge ? 0 : Math.sin(radius * 2.7 + branchAngle * 1.7) * 0.16;
      const angle = branchAngle + spinAngle + spread + wobble;

      // Dust lane: a band at a fixed angular offset inside each arm, taking most of the light
      // from the points that fall in it. Additive blending cannot darken, so a lane can only be
      // made by NOT drawing there.
      // Position across the arm, in units of the arm's own half-width, so the lane keeps its
      // proportions from the core to the rim instead of being a fixed angle.
      const half = PARAMS.armSpread * (0.25 + t);
      const across = spread / half;
      const inLane = !bulge && Math.abs(Math.abs(across) - PARAMS.laneOffset) < PARAMS.laneWidth;
      const laneKeep = inLane ? 1 - PARAMS.laneDepth : 1;

      const rand = () =>
        Math.pow(rnd(), PARAMS.randomnessPower) * (rnd() < 0.5 ? 1 : -1) * PARAMS.randomness * radius;

      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = Math.sin(angle) * radius;

      randomness[i3] = rand();
      // Real 3D thickness: a spherical bulge near the core, a thin disc in the arms.
      randomness[i3 + 1] = rand() * (0.25 + 1.1 * Math.exp(-radius * 0.85));
      randomness[i3 + 2] = rand();

      // Two-stage gradient: core→mid over the inner half, mid→edge over the outer half.
      const tr = radius / PARAMS.radius;
      if (tr < 0.5) tmp.copy(core).lerp(mid, tr * 2);
      else tmp.copy(mid).lerp(edge, (tr - 0.5) * 2);
      colors[i3] = tmp.r;
      colors[i3 + 1] = tmp.g;
      colors[i3 + 2] = tmp.b;

      scales[i] = 0.5 + rnd() * 0.8;
      // Rim fade: the old cloud had a hard outer edge that the frame cut off, so the galaxy ran
      // off three borders. The last quarter of the radius fades out instead.
      const rim = 1 - smoothstep(0.55, 0.96, t);
      dims[i] = bulge ? PARAMS.bulgeGain : laneKeep * rim * PARAMS.discDim;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geo.setAttribute('aRandomness', new THREE.BufferAttribute(randomness, 3));
    geo.setAttribute('aDim', new THREE.BufferAttribute(dims, 1));
    return geo;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 40 },
      uPixelRatio: { value: pixelRatio },
    }),
    [pixelRatio]
  );

  useFrame((_, dt) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += dt;
  });

  // Points never raycast (perf trap); frustumCulled off so the custom-geometry
  // bounding sphere can't cull the galaxy at steep dive angles.
  return (
    <points geometry={geometry} raycast={() => null} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        vertexShader={galaxyVertexShader}
        fragmentShader={galaxyFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
