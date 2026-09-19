'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScene } from '@/lib/sceneStore';

/**
 * The swap mask (T3) — the in-world curtain that hides the galaxy↔solar crossover. Driven
 * by the SAME `coverage` number the swap machine gates on (owned by CameraRig, symmetric
 * around the swap point). Lives in SceneRoot so it persists across the act unmount/mount and
 * covers the seam from both directions.
 *
 * ONE black plane, camera-locked, over-filling the frustum so the periphery cannot reveal
 * the swap (galaxy edges ~8% → solar edges 0% would otherwise flicker at the corners).
 *
 * CROSSING — why it is black, and why it is only a plane now. It used to be warm gold at up
 * to 0.96 opacity plus an additive cream centre glow and a waypoint star, on the theory that
 * a bloomed warm core bridged the Act-1 core colour to the Act-2 sun and was gentler than a
 * white flash. Measured, it was the flash: at the peak the frame's mean luminance hit 211 of
 * 255 with 70% of every pixel above level 200, against a settled solar system of 31. Its
 * 99th percentile sat at 242, a hair above its own mean — no tonal range left anywhere in
 * the picture. The glow's leading edge also drove |mean R − mean G| to 28, a colour the site
 * has nowhere else. A curtain is supposed to be the part you do NOT see.
 *
 * Black also makes the bridge honest: `DiveFade` has already taken the frame to near-black
 * by the time coverage starts to rise, so the crossover is now one continuous darkness
 * rather than a hand-off between two bright things.
 *
 * Coverage stays the geometric envelope, not a pixel-measured composite, on purpose: it must
 * be symmetric (scroll-up mirrors the dive; the solar-side camera never flies the corridor,
 * so nothing there would "measure" as covered) and identical on every quality tier
 * (composition LAW) — a bloom/luminance readback would be neither.
 */

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const _fwd = new THREE.Vector3();
const DEG2RAD = Math.PI / 180;

export default function SwapMask() {
  const fill = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const m = fill.current;
    if (!m) return;
    const cov = useScene.getState().coverage;
    m.visible = cov > 0.006;
    if (!m.visible) return;

    const cam = state.camera as THREE.PerspectiveCamera;
    cam.getWorldDirection(_fwd);
    const d = 1.0;
    m.position.copy(cam.position).addScaledVector(_fwd, d);
    m.quaternion.copy(cam.quaternion);
    const h = 2 * d * Math.tan((cam.fov * DEG2RAD) / 2) * 1.3;
    m.scale.set(h * (state.size.width / Math.max(1, state.size.height)), h, 1);
    // Opaque well before the swap window (the machine fires only while cov > 0.95) and
    // ramped from low coverage rather than slammed on near the peak: coming back UP from the
    // solar overview this plane is the whole transition, with no dive fade underneath it.
    (m.material as THREE.MeshBasicMaterial).opacity = smoothstep(0.15, 0.95, cov);
  });

  return (
    <mesh ref={fill} renderOrder={19} visible={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        color={'#01010a'}
        transparent
        opacity={0}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </mesh>
  );
}
