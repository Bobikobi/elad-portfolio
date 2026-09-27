'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScene } from '@/lib/sceneStore';
import { makeRng, SEED } from '@/lib/rng';

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

/**
 * The curtain is a deep-blue star-streak tunnel, not black: owner feedback on the v3 preview
 * was "there is a stretch where everything is black". Opaque at full coverage (the mount
 * frame stays hidden), base level ~32 so the stretch never drops under the mean-20 bar, and
 * radial trails so it reads as the dive's speed rather than a blank. Seeded, and scaled from
 * the coverage number only, so scrolling back runs the same frames in reverse.
 */
function makeTunnelTexture(): THREE.CanvasTexture {
  const N = 512;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d')!;
  g.fillStyle = '#122046';
  g.fillRect(0, 0, N, N);
  const glow = g.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N * 0.22);
  glow.addColorStop(0, 'rgba(255,214,160,0.35)');
  glow.addColorStop(1, 'rgba(255,214,160,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, N, N);
  const rnd = makeRng(SEED.swapTunnel);
  g.lineCap = 'round';
  for (let i = 0; i < 420; i++) {
    const a = rnd() * Math.PI * 2;
    const r0 = N * (0.06 + rnd() * 0.32);
    const r1 = r0 + N * (0.05 + rnd() * 0.25);
    const grad = g.createLinearGradient(N / 2 + Math.cos(a) * r0, N / 2 + Math.sin(a) * r0, N / 2 + Math.cos(a) * r1, N / 2 + Math.sin(a) * r1);
    grad.addColorStop(0, 'rgba(200,220,255,0)');
    grad.addColorStop(1, `rgba(215,228,255,${0.35 + rnd() * 0.5})`);
    g.strokeStyle = grad;
    g.lineWidth = 0.6 + rnd() * 1.4;
    g.beginPath();
    g.moveTo(N / 2 + Math.cos(a) * r0, N / 2 + Math.sin(a) * r0);
    g.lineTo(N / 2 + Math.cos(a) * r1, N / 2 + Math.sin(a) * r1);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export default function SwapMask() {
  const fill = useRef<THREE.Mesh>(null);
  const tunnel = useMemo(() => makeTunnelTexture(), []);

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
    const rush = 1 + 1.2 * cov; // trails rush outward as the curtain closes, retrace as it opens
    m.scale.set(h * (state.size.width / Math.max(1, state.size.height)) * rush, h * rush, 1);
    // Opaque well before the swap window (the machine fires only while cov > 0.95) and
    // ramped from low coverage rather than slammed on near the peak: coming back UP from the
    // solar overview this plane is the whole transition, with no dive fade underneath it.
    (m.material as THREE.MeshBasicMaterial).opacity = smoothstep(0.15, 0.95, cov);
  });

  return (
    <mesh ref={fill} renderOrder={19} visible={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={tunnel}
        color={'#ffffff'}
        transparent
        opacity={0}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </mesh>
  );
}
