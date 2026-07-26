'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScene } from '@/lib/sceneStore';
import { softSprite, spikeSprite, CORE_GOLD } from '@/lib/spaceMaterials';

/**
 * The swap mask (T3) — the in-world curtain that hides the galaxy↔solar crossover,
 * replacing the flat DOM gold gradient. Driven by the SAME `coverage` number the swap
 * machine gates on (owned by CameraRig, symmetric around the swap point). Lives in
 * SceneRoot so it persists across the act unmount/mount and covers the seam from both
 * directions. Three layers, camera-locked:
 *   1) a warm gold FILL plane (alpha) that ramps in only near the peak — this is what
 *      actually covers the whole frame (incl. corners), so the periphery can't reveal
 *      the swap (galaxy edges ~8% → solar edges 0% would otherwise flicker);
 *   2) a soft additive centre glow for a warm bloomed core (kept low, not a white flash);
 *   3) a burst of "waypoint stars" (diffraction spikes) the dive flies into.
 * Warm gold, never clinical white — keeps the Act-1 core / Act-2 sun colour bridge and
 * avoids a photosensitive flash. Peaks once per crossing (coverage is one eased hump).
 *
 * Coverage stays the geometric envelope, not a pixel-measured composite, on purpose:
 * it must be symmetric (scroll-up mirrors the dive; the solar-side camera never flies
 * the corridor, so nothing there would "measure" as covered) and identical on every
 * quality tier (composition LAW) — a bloom/luminance readback would be neither.
 */

interface Waypoint {
  ox: number; oy: number; dz: number; scale: number; hue: string; appear: number;
}
const WAYPOINTS: Waypoint[] = [
  { ox: 0.0, oy: 0.05, dz: 2.0, scale: 2.4, hue: '#fff3da', appear: 0.28 },
  { ox: -0.9, oy: 0.5, dz: 2.6, scale: 1.6, hue: CORE_GOLD, appear: 0.34 },
  { ox: 1.0, oy: -0.35, dz: 2.4, scale: 1.8, hue: '#ffe9c4', appear: 0.3 },
  { ox: 0.7, oy: 0.7, dz: 3.0, scale: 1.1, hue: CORE_GOLD, appear: 0.42 },
  { ox: -0.7, oy: -0.7, dz: 2.9, scale: 1.2, hue: '#e9efff', appear: 0.4 },
  { ox: -1.3, oy: -0.1, dz: 3.2, scale: 1.0, hue: '#ffe9c4', appear: 0.5 },
];

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const DEG2RAD = Math.PI / 180;
const UP = new THREE.Vector3(0, 1, 0);

export default function SwapMask() {
  const soft = useMemo(softSprite, []);
  const spike = useMemo(spikeSprite, []);
  const group = useRef<THREE.Group>(null);
  const fill = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Sprite>(null);
  const spikes = useRef<THREE.Group>(null);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const cov = useScene.getState().coverage;
    g.visible = cov > 0.006;
    if (!g.visible) return;

    const cam = state.camera as THREE.PerspectiveCamera;
    cam.getWorldDirection(_fwd);
    _right.copy(_fwd).cross(UP).normalize();
    _up.copy(_right).cross(_fwd).normalize();
    const aspect = state.size.width / Math.max(1, state.size.height);

    // 1) Full-frame gold fill (alpha) — covers the periphery so the swap can't leak at
    //    the edges. Ramps in only near the peak; a plane locked one unit ahead, sized to
    //    over-fill the frustum and oriented to face the camera.
    if (fill.current) {
      const d = 1.0;
      fill.current.position.copy(cam.position).addScaledVector(_fwd, d);
      fill.current.quaternion.copy(cam.quaternion);
      const h = 2 * d * Math.tan((cam.fov * DEG2RAD) / 2) * 1.3;
      fill.current.scale.set(h * aspect, h, 1);
      (fill.current.material as THREE.MeshBasicMaterial).opacity = smoothstep(0.5, 1.0, cov) * 0.96;
    }

    // 2) Soft warm centre glow (additive, kept modest so the peak isn't a white flash).
    if (glow.current) {
      const gs = 6 + 6 * smoothstep(0.2, 1.0, cov);
      glow.current.position.copy(cam.position).addScaledVector(_fwd, 2.3);
      glow.current.scale.set(gs, gs, 1);
      (glow.current.material as THREE.SpriteMaterial).opacity = smoothstep(0.2, 0.9, cov) * 0.32;
    }

    // 3) Waypoint stars — the burst the dive flies into.
    const sg = spikes.current;
    if (sg) {
      for (let i = 0; i < WAYPOINTS.length; i++) {
        const w = WAYPOINTS[i];
        const spr = sg.children[i] as THREE.Sprite;
        spr.position.copy(cam.position).addScaledVector(_fwd, w.dz).addScaledVector(_right, w.ox).addScaledVector(_up, w.oy);
        const rise = smoothstep(w.appear, w.appear + 0.28, cov);
        const sink = 1 - 0.4 * smoothstep(0.9, 1.0, cov);
        const k = w.scale * (0.7 + 0.9 * rise);
        spr.scale.set(k, k, 1);
        (spr.material as THREE.SpriteMaterial).opacity = rise * sink;
      }
    }
  });

  return (
    <group ref={group} visible={false}>
      <mesh ref={fill} renderOrder={19}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={CORE_GOLD} transparent opacity={0} depthWrite={false} depthTest={false} toneMapped={false} />
      </mesh>
      <sprite ref={glow} renderOrder={20}>
        <spriteMaterial map={soft} color={'#fff0d2'} transparent opacity={0} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <group ref={spikes}>
        {WAYPOINTS.map((w, i) => (
          <sprite key={i} renderOrder={21}>
            <spriteMaterial map={spike} color={w.hue} transparent opacity={0} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </sprite>
        ))}
      </group>
    </group>
  );
}
