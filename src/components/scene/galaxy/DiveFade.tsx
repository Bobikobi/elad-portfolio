'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScene } from '@/lib/sceneStore';

/**
 * CROSSING — the dive's fade to near-black, the thing the passage is made of.
 *
 * The passage used to be made of ADDED light: a field of velocity-stretched stars, ten
 * additive nebula veils flown through, and a gold curtain at the end. Measured on the
 * shipped build, the frame climbed from the galaxy's own 76 mean to 148 through the dive
 * and then to 211 at the crossover, with 70% of every pixel above level 200. A judgement
 * asked for with clean eyes called it fireworks laid over a picture rather than flight, and
 * the cheapest way out was to travel through darkness instead of through glare.
 *
 * So the dive now DARKENS. One black plane locked in front of the camera, opacity ramped on
 * `scrollProgress`, closing over the second half of the descent — and by the time the swap
 * curtain's own coverage begins to rise the frame is already nearly black, so the crossover
 * has nothing left to flash.
 *
 * Why `scrollProgress` and not `coverage`: coverage is the curtain's envelope, a narrow
 * symmetric hump around the swap that exists to hide the act-mount stall and is shaped by a
 * rate limiter and a readiness hold (see CameraRig). It is 0 for the whole dive. This fade
 * has to start long before it, and it must not be able to perturb the swap machine, so it
 * reads the raw scroll and touches nothing else.
 *
 * Why this cannot dim the galaxy at rest: FADE_FROM is well past the welcome, and the plane
 * is hidden outright below it. The galaxy sitting still is byte-identical to before.
 */

/**
 * Scroll progress at which the darkness starts closing, and where it is complete.
 *
 * FADE_TO is set by the colour, not by the light. With the veils gone, the frame's remaining
 * red-green split is the galaxy's own gold core (`#FFC978`) filling the view at the end of
 * the approach. Backing the measured frames out through the fade that was over them, the
 * split UNDER it runs 38 at scroll 0.61, 57 at 0.62 and 83 at 0.65 - it is still climbing
 * while the picture is already dim, which is why a dim gold frame kept carrying a cast of 13
 * at an earlier setting. The passage may carry at most 10 (the site reads 1.4 at the galaxy
 * and 7.8 at the settled solar system), and that is what puts the end of the fade at 0.64.
 * Ending at 0.68 measured 10.1, which passes nothing; the bar is not a target to touch.
 *
 * FADE_FROM is set by the light. Even with nothing added, the galaxy brightens as the camera
 * flies into it: 76 at rest, 80 by scroll 0.21, 87 by 0.40. The passage may not be brighter
 * than the rest state the visitor is already looking at (bar: 80), so the darkness has to be
 * closing before the galaxy passes it. Starting at 0.20 - exactly where it crosses - measured
 * 80.4 against the bar of 80, so the start sits at 0.10 for real margin; the smoothstep is
 * nearly flat at its foot, so nothing visible happens until well after that. The fade is
 * long and gentle, 0.10 to 0.64, which is the point of it: a slow dimming reads as distance,
 * a short one as a cut.
 */
const FADE_FROM = 0.1;
const FADE_TO = 0.64;
/**
 * Near-black, not black. Six percent of the galaxy reads through at full fade - far too
 * little to carry colour or glare (51 * 0.06 = 3), and enough that a visitor who stops
 * scrolling inside the passage is looking at a dark sky rather than at a dead screen.
 */
const FADE_MAX = 0.94;

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const _fwd = new THREE.Vector3();
const DEG2RAD = Math.PI / 180;

export default function DiveFade() {
  const plane = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const m = plane.current;
    if (!m) return;
    const a = smoothstep(FADE_FROM, FADE_TO, useScene.getState().scrollProgress) * FADE_MAX;
    m.visible = a > 0.002;
    if (!m.visible) return;

    // One unit ahead, facing the camera, over-filling the frustum so the corners go dark
    // with the centre. Same construction as the swap curtain, for the same reason.
    const cam = state.camera as THREE.PerspectiveCamera;
    cam.getWorldDirection(_fwd);
    const d = 1.0;
    m.position.copy(cam.position).addScaledVector(_fwd, d);
    m.quaternion.copy(cam.quaternion);
    const h = 2 * d * Math.tan((cam.fov * DEG2RAD) / 2) * 1.3;
    m.scale.set(h * (state.size.width / Math.max(1, state.size.height)), h, 1);
    (m.material as THREE.MeshBasicMaterial).opacity = a;
  });

  // renderOrder 18: under the swap curtain (19), over the scene. depthTest off so nothing
  // in the corridor can poke through it.
  return (
    <mesh ref={plane} renderOrder={18} visible={false}>
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
