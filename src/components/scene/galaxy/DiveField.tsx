'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { damp3 } from 'maath/easing';
import * as THREE from 'three';
import { starColor, makeSparkleMaterial } from '@/lib/spaceMaterials';
import { useScene } from '@/lib/sceneStore';
import { makeRng, SEED } from '@/lib/rng';

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Each star is a billboarded quad (not a gl_Point — points can't stretch). The
// vertex shader elongates the quad along the star's on-screen motion between this
// frame and one "shutter" ago, so the field reads as a star TUNNEL radiating from
// the focus-of-expansion (dead ahead) rather than a flat band. Streak length ∝
// camera speed × proximity, so it shortens back to points the instant the dive
// brakes. The far majority barely stretch (aStretch low) → they stay as depth.
const vert = /* glsl */ `
  uniform float uTime;
  uniform float uViewportH;
  uniform float uStretchK;
  uniform vec3 uPrevOffsetView; // view-space vector from now → one shutter ago
  attribute vec3 aCenter;
  attribute float aScale;
  attribute vec3 aColor;
  attribute float aPhase;
  attribute float aStretch;
  varying vec3 vColor;
  varying float vTwinkle;
  varying vec2 vEdge;
  varying float vStretch;
  void main() {
    vec2 corner = position.xy;                 // ±1 quad corner
    vec4 mv = modelViewMatrix * vec4(aCenter, 1.0);
    float depth = max(0.001, -mv.z);
    float px = clamp(aScale / depth, 0.6, 14.0);
    vec4 clip = projectionMatrix * mv;
    // Where this (world-static) star sat one shutter ago, as the camera moved:
    vec4 clipPrev = projectionMatrix * (mv + vec4(uPrevOffsetView, 0.0));
    vec2 ndc = clip.xy / clip.w;
    vec2 ndcPrev = clipPrev.xy / clipPrev.w;
    float aspect = projectionMatrix[1][1] / projectionMatrix[0][0];
    // Screen motion in a square (aspect-corrected) space so caps stay round:
    vec2 mo = vec2((ndc.x - ndcPrev.x) * aspect, ndc.y - ndcPrev.y);
    float moLen = length(mo);
    float streak = clamp(moLen * uStretchK * aStretch, 0.0, 0.85);
    vec2 dir = moLen > 1e-5 ? mo / moLen : vec2(1.0, 0.0);
    vec2 perp = vec2(-dir.y, dir.x);
    float hy = px * 2.0 / uViewportH;          // round radius in square-NDC units
    vec2 off = dir * (corner.x * (hy + streak)) + perp * (corner.y * hy);
    off.x /= aspect;                            // back to real NDC
    gl_Position = clip;
    gl_Position.xy += off * clip.w;
    vEdge = corner;
    vStretch = streak / max(hy, 1e-4);
    vTwinkle = 0.7 + 0.3 * sin(uTime * (0.6 + aPhase) + aPhase * 6.28);
    vColor = aColor;
  }
`;
// Soft capsule: a round dot at rest, a thin round-capped streak when stretched.
const frag = /* glsl */ `
  uniform float uReveal;                       // fades the field in with the dive
  varying vec3 vColor;
  varying float vTwinkle;
  varying vec2 vEdge;
  varying float vStretch;
  void main() {
    float ax = vEdge.x * (1.0 + vStretch);     // along, in radius units
    float seg = max(abs(ax) - vStretch, 0.0);  // distance past the straight segment
    float d = length(vec2(seg, vEdge.y));
    float a = smoothstep(1.0, 0.25, d) * vTwinkle * uReveal;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

// Corridor the dive travels (mirrors CameraRig DIVE_FROM → DIVE_TO). Stars seeded
// along it always pass close, guaranteeing streaks; the rest fill a wide volume so
// perspective sends them to all four edges.
const PATH_A = new THREE.Vector3(0, 2.6, 9);
const PATH_B = new THREE.Vector3(3.6, 0, 1.6);
const SHUTTER = 0.05; // seconds of "exposure" folded into the offset (kept small so the projected difference stays in its linear regime; uStretchK is the visible knob)

/**
 * Volumetric star tunnel the camera flies THROUGH on the dive. GPU velocity streaks
 * (single instanced draw) turn camera motion into radial light-streaks and back into
 * points on braking; realistic stellar colours + power-law sizes kill the "flakes"
 * look. A few hero stars with diffraction spikes pass close for scale.
 */
export default function DiveField({ count = 4200 }: { count?: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const prevPos = useRef<THREE.Vector3 | null>(null);
  const smoothOff = useRef(new THREE.Vector3());
  const heroRef = useRef<THREE.Group>(null);

  const _delta = useMemo(() => new THREE.Vector3(), []);
  const _off = useMemo(() => new THREE.Vector3(), []);
  const _invQ = useMemo(() => new THREE.Quaternion(), []);

  const geo = useMemo(() => {
    const g = new THREE.InstancedBufferGeometry();
    // Base quad (corners ±1).
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);

    const center = new Float32Array(count * 3);
    const color = new Float32Array(count * 3);
    const scale = new Float32Array(count);
    const phase = new Float32Array(count);
    const stretch = new Float32Array(count);
    const dir = new THREE.Vector3().subVectors(PATH_B, PATH_A);
    const len = dir.length();
    dir.normalize();
    // A stable perpendicular basis around the path for the corridor seeding.
    const up = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const nx = new THREE.Vector3().crossVectors(dir, up).normalize();
    const ny = new THREE.Vector3().crossVectors(dir, nx).normalize();
    const col = new THREE.Color();
    const p = new THREE.Vector3();
    const rnd = makeRng(SEED.diveField);
    for (let i = 0; i < count; i++) {
      if (rnd() < 0.6) {
        // Along the corridor, radius power-biased toward the axis → close passes.
        const u = rnd();
        const ang = rnd() * Math.PI * 2;
        const rad = Math.pow(rnd(), 1.8) * 11;
        p.copy(PATH_A).addScaledVector(dir, (u - 0.15) * (len + 14));
        p.addScaledVector(nx, Math.cos(ang) * rad);
        p.addScaledVector(ny, Math.sin(ang) * rad);
      } else {
        // Wide background volume so the field crosses every screen edge.
        p.set((rnd() - 0.5) * 36, (rnd() - 0.5) * 24, (rnd() - 0.5) * 36);
      }
      center[i * 3] = p.x; center[i * 3 + 1] = p.y; center[i * 3 + 2] = p.z;
      starColor(col, rnd);
      color[i * 3] = col.r; color[i * 3 + 1] = col.g; color[i * 3 + 2] = col.b;
      scale[i] = 5 + Math.pow(rnd(), 6) * 55; // power-law: many small, few big
      phase[i] = rnd();
      // Stretch mix (spec): ~70% plain (depth), ~20% light, ~10% strong streaks.
      const r = rnd();
      stretch[i] = r < 0.7 ? rnd() * 0.12 : r < 0.9 ? 0.3 + rnd() * 0.35 : 0.85 + rnd() * 0.5;
    }
    g.setAttribute('aCenter', new THREE.InstancedBufferAttribute(center, 3));
    g.setAttribute('aColor', new THREE.InstancedBufferAttribute(color, 3));
    g.setAttribute('aScale', new THREE.InstancedBufferAttribute(scale, 1));
    g.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
    g.setAttribute('aStretch', new THREE.InstancedBufferAttribute(stretch, 1));
    g.instanceCount = count;
    return g;
  }, [count]);

  // Hero stars: a handful seeded ON the corridor axis so they sweep close by.
  const heroes = useMemo(() => {
    // Was a hand-rolled Lehmer generator with its seed in a closure variable, which the
    // immutability rule flags for a real reason (the closure outlives the render). Same job,
    // one shared implementation, and now listed in the seed register with everything else.
    const rng = makeRng(SEED.diveHeroes);
    const dir = new THREE.Vector3().subVectors(PATH_B, PATH_A).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const nx = new THREE.Vector3().crossVectors(dir, up).normalize();
    const ny = new THREE.Vector3().crossVectors(dir, nx).normalize();
    const len = PATH_A.distanceTo(PATH_B);
    return Array.from({ length: 8 }, () => {
      const u = rng();
      const p = new THREE.Vector3().copy(PATH_A)
        .addScaledVector(dir, (u - 0.1) * (len + 10))
        .addScaledVector(nx, (rng() - 0.5) * 5)
        .addScaledVector(ny, (rng() - 0.5) * 5);
      return { pos: p.toArray() as [number, number, number], scale: 0.7 + rng() * 1.1, hue: rng() > 0.45 ? '#dfe8ff' : '#ffe3bd', phase: rng() * 6.28 };
    });
  }, []);

  // B13+: real tapered spikes with their own scintillation, not a stamped plus sign.
  const heroMats = useMemo(
    () => heroes.map((h, i) => makeSparkleMaterial({ color: h.hue, rayLen: 0.13 + (i % 3) * 0.03, secondary: i % 4 === 0 ? 1 : 0, phase: h.phase, rate: 0.6 + (i % 5) * 0.15, opacity: 0 })),
    [heroes]
  );
  useEffect(() => () => heroMats.forEach((m) => m.dispose()), [heroMats]);

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uViewportH: { value: 1000 }, uStretchK: { value: 15 }, uReveal: { value: 0 }, uPrevOffsetView: { value: new THREE.Vector3() } }),
    []
  );

  useFrame((state, dt) => {
    const cam = state.camera;
    // Fade the whole field in with the dive so the welcome stays minimal (galaxy is
    // the star); at rest before the dive there are no distracting near-blobs.
    const reveal = smoothstep(0.02, 0.16, useScene.getState().scrollProgress);
    const m = matRef.current;
    if (m) {
      m.uniforms.uTime.value += dt;
      m.uniforms.uReveal.value = reveal;
      m.uniforms.uViewportH.value = state.size.height;
      // Camera velocity → view-space offset one shutter ago (rotation only).
      if (!prevPos.current) prevPos.current = cam.position.clone();
      _delta.subVectors(cam.position, prevPos.current);
      prevPos.current.copy(cam.position);
      const invDt = 1 / Math.max(dt, 1e-4);
      _off.copy(_delta).multiplyScalar(invDt * SHUTTER); // world displacement over the shutter
      _invQ.copy(cam.quaternion).invert();
      _off.applyQuaternion(_invQ);                        // into view space
      damp3(smoothOff.current, _off, 0.04, dt);
      m.uniforms.uPrevOffsetView.value.copy(smoothOff.current);
    }
    // Hero stars: gentle twinkle in scale so they feel alive, not decals.
    const grp = heroRef.current;
    if (grp) {
      const t = state.clock.elapsedTime;
      for (let i = 0; i < grp.children.length; i++) {
        const spr = grp.children[i] as THREE.Sprite;
        const base = heroes[i];
        const k = base.scale * (0.9 + 0.15 * Math.sin(t * 1.3 + base.phase));
        spr.scale.set(k, k, 1);
        (spr.material as THREE.SpriteMaterial).opacity = 0.9 * reveal;
      }
    }
  });

  return (
    <group>
      <mesh geometry={geo} raycast={() => null} frustumCulled={false}>
        <shaderMaterial
          ref={matRef}
          vertexShader={vert}
          fragmentShader={frag}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <group ref={heroRef}>
        {heroes.map((h, i) => (
          <sprite key={i} position={h.pos} scale={[h.scale, h.scale, 1]} material={heroMats[i]} />
        ))}
      </group>
    </group>
  );
}
