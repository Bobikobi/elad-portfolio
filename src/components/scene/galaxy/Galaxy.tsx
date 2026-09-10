'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { galaxyVertexShader, galaxyFragmentShader } from './shaders';
import { makeRng, SEED } from '@/lib/rng';

interface GalaxyProps {
  count?: number;
}

// Design system: gold core → cosmic-blue mid → galaxy-indigo arm edges.
const PARAMS = {
  radius: 6,
  branches: 4,
  spin: 1.1,
  randomness: 0.22,
  randomnessPower: 2.8,
  coreColor: '#FFC978', // --core-gold
  midColor: '#4D8DFF', // --cosmic-blue
  edgeColor: '#6D5AE6', // --galaxy-indigo
};

/** Procedural spiral galaxy as a single additive point cloud, spun in the vertex shader. */
export default function Galaxy({ count = 200000 }: GalaxyProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const pixelRatio = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 1.5) : 1;

  const geometry = useMemo(() => new THREE.BufferGeometry(), []);

  useEffect(() => {
    if (pointsRef.current) pointsRef.current.visible = false;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const randomness = new Float32Array(count * 3);

    const core = new THREE.Color(PARAMS.coreColor);
    const mid = new THREE.Color(PARAMS.midColor);
    const edge = new THREE.Color(PARAMS.edgeColor);
    const tmp = new THREE.Color();
    const rnd = makeRng(SEED.galaxy);
    let cursor = 0;
    let buildFrame = 0;
    let revealFrame = 0;
    let cancelled = false;

    const buildSlice = () => {
      const end = Math.min(count, cursor + 10000);
      for (let i = cursor; i < end; i++) {
        const i3 = i * 3;
        const radius = Math.pow(rnd(), 1.1) * PARAMS.radius;
        const branchAngle = ((i % PARAMS.branches) / PARAMS.branches) * Math.PI * 2;
        const spinAngle = radius * PARAMS.spin;

        const rand = () =>
          Math.pow(rnd(), PARAMS.randomnessPower) * (rnd() < 0.5 ? 1 : -1) * PARAMS.randomness * radius;

        positions[i3] = Math.cos(branchAngle + spinAngle) * radius;
        positions[i3 + 1] = 0;
        positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius;

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
      }
      cursor = end;

      if (cursor < count) {
        buildFrame = requestAnimationFrame(buildSlice);
        return;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
      geometry.setAttribute('aRandomness', new THREE.BufferAttribute(randomness, 3));

      // Attribute construction finishes in this callback. Reveal from a later callback so
      // R3F's subsequent buffer upload/first draw cannot land in the construction task.
      revealFrame = requestAnimationFrame(() => {
        if (!cancelled && pointsRef.current) pointsRef.current.visible = true;
      });
    };

    buildFrame = requestAnimationFrame(buildSlice);
    return () => {
      cancelled = true;
      cancelAnimationFrame(buildFrame);
      cancelAnimationFrame(revealFrame);
    };
  }, [count, geometry]);

  useEffect(() => () => geometry.dispose(), [geometry]);

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
    <points ref={pointsRef} geometry={geometry} visible={false} raycast={() => null} frustumCulled={false}>
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
