'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScene } from '@/lib/sceneStore';
import { softSprite, makeSparkleMaterial, CORE_GOLD } from '@/lib/spaceMaterials';

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
 *   3) ONE waypoint star the dive flies into.
 * Warm gold, never clinical white — keeps the Act-1 core / Act-2 sun colour bridge and
 * avoids a photosensitive flash. Peaks once per crossing (coverage is one eased hump).
 *
 * B6: there were SIX waypoint stars, all rising together into the peak, and six
 * overlapping diffraction crosses at maximum coverage is not a crossing — it is a blast.
 * A single star is a destination; a constellation of them is glare. So: one, dead ahead,
 * with its own scintillation, and the exposure it reaches is capped rather than stacked.
 *
 * Coverage stays the geometric envelope, not a pixel-measured composite, on purpose:
 * it must be symmetric (scroll-up mirrors the dive; the solar-side camera never flies
 * the corridor, so nothing there would "measure" as covered) and identical on every
 * quality tier (composition LAW) — a bloom/luminance readback would be neither.
 */

/** The one waypoint star: slightly off dead-centre, a little above the horizon line. */
const WAYPOINT = { ox: 0.12, oy: 0.18, dz: 2.2, scale: 2.6, hue: '#fff1d6', appear: 0.26 };

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
  const starMat = useMemo(
    () => makeSparkleMaterial({ color: WAYPOINT.hue, rayLen: 0.22, secondary: 1, rate: 1.1, opacity: 0 }),
    []
  );
  const group = useRef<THREE.Group>(null);
  const fill = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Sprite>(null);
  const star = useRef<THREE.Sprite>(null);

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

    // 3) The waypoint star — one destination the dive flies into.
    const spr = star.current;
    if (spr) {
      const w = WAYPOINT;
      spr.position.copy(cam.position).addScaledVector(_fwd, w.dz).addScaledVector(_right, w.ox).addScaledVector(_up, w.oy);
      const rise = smoothstep(w.appear, w.appear + 0.34, cov);
      // Ease OFF into the peak instead of stacking onto it: at full coverage the gold
      // fill is already carrying the frame, and a star still climbing there is what
      // turned the crossing into a flash.
      const sink = 1 - 0.55 * smoothstep(0.82, 1.0, cov);
      const k = w.scale * (0.7 + 0.8 * rise);
      spr.scale.set(k, k, 1);
      (spr.material as THREE.SpriteMaterial).opacity = rise * sink * 0.85;
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
      <sprite ref={star} renderOrder={21} material={starMat} />
    </group>
  );
}
