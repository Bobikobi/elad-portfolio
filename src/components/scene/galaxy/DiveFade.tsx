'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScene } from '@/lib/sceneStore';
import { HUD_AVAILABLE } from '../DebugHud';

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
 * So the dive now DIMS. One near-black plane locked in front of the camera, opacity ramped on
 * `scrollProgress`, taking the light out of the approach without taking the picture away: at
 * its deepest it still passes about half the frame, so what the visitor flies into is the
 * galaxy's own core burning down to an ember rather than a screen that has been switched off.
 *
 * CROSSING v2 — why "an ember" and not "black". v1 closed this plane to 94% by scroll 0.64 and
 * shipped. Measured on the shipped build, the frame sat under mean 20 of 255 across 44% of the
 * whole scroll, in both directions, and nothing in it changed: the owner read it as the scene
 * switching off mid-flight and the scroll sticking. Darkness is the crossover's job and the
 * swap curtain already does it over about a tenth of the scroll. This plane's job is only the
 * two things the numbers actually demand — see FADE_MAX.
 *
 * Why `scrollProgress` and not `coverage`: coverage is the curtain's envelope, a narrow
 * symmetric hump around the swap that exists to hide the act-mount stall and is shaped by a
 * rate limiter and a readiness hold (see CameraRig). It is 0 for the whole dive. This fade
 * has to start long before it, and it must not be able to perturb the swap machine, so it
 * reads the raw scroll and touches nothing else.
 *
 * Why this cannot dim the galaxy at rest: at rest `scrollProgress` is 0, below FADE_FROM, and
 * the plane is hidden outright there. The galaxy sitting still is byte-identical to before
 * (measured: 0.0000 mean difference, max pixel difference 0, over two pairs of recordings).
 */

/**
 * Where the dimming starts and where it reaches full depth.
 *
 * FADE_FROM is set by the light. Even with nothing added to it, the galaxy brightens as the
 * camera flies in: measured with no plane at all, 76 mean at rest, 80 by scroll 0.20, a peak
 * of 87 at 0.40. The passage may not be brighter than the rest state the visitor is already
 * looking at (C1's bar, 80), so the dimming has to have started before the galaxy crosses it.
 * A smoothstep is nearly flat at its foot, so the start sits well below 0.20: at 0.06 the
 * plane is under 1.5% opaque for the whole first tenth of the scroll, where the welcome is
 * still on screen, and starting there instead of 0.12 measured 78.2 mean and 7.70% of pixels
 * above 200 against 79.4 and 7.95 - real margin on both of C1's numbers for nothing visible.
 *
 * FADE_TO is set by the colour. The galaxy's gold core (`#FFC978`) fills the view over the end
 * of the approach and carries a red-green split that peaks at 36 with no plane over it, around
 * scroll 0.65, falling back to 9 by 0.80 as the camera passes it. C3 allows 20, so the plane
 * has to be at its full depth by the time that peak arrives. Swept on a preview with `?fade`,
 * full depth at 0.66 measured a split of 25.3, at 0.62 21.8, at 0.58 19.4 and at 0.55 16.7;
 * 0.55 is the one with margin, and the bar is not a target to touch.
 */
const FADE_FROM = 0.06;
const FADE_TO = 0.55;
/**
 * How deep it goes, and the reason v2 exists. A third of the frame still reaches the visitor: 36 of
 * colour split becomes about 19, the 87 peak becomes about 66, and the darkest the dive itself
 * ever gets is around 21 (see the return-trip note below) — the same brightness as the settled solar system on the other side.
 * Nothing here is near black, so nothing here can read as frozen. The near-black stretch of the
 * passage is the swap curtain's alone, which is 0.11 of the scroll wide by its own geometry
 * (COVER_PLATEAU + COVER_FALLOFF in diveEnvelope) and is the crossover itself. Going deeper
 * than this only buys colour: 0.68 measured a split of 19.4 with the frame under mean 20 from
 * scroll 0.872, this one 16.7 from 0.867, and each step deeper starts the darkness earlier.
 */
const FADE_MAX = 0.71;
// 0.74 was the first pick and it was measured on the DOWN direction only. On the way back up the
// same ember reads about 5 levels darker (19.0 at scroll 0.68-0.76 against 25 going down) and
// dipped under the mean-20 line, stretching the near-black run to 0.25 of the scroll. Swept on the
// return at a 360-frame ramp: 0.72 -> ember floor 20.5, colour 18.5; 0.71 -> 21.2, 19.0;
// 0.70 -> 21.9, 19.5. 0.71 leaves about one level on each side of the two bars.

/**
 * Fastest the plane may change, in opacity per second. The scroll is read raw, so a scroll
 * TELEPORT (scrollbar drag, End key, scroll restoration - the paths CameraRig documents and
 * supports) would otherwise take the plane from invisible to 78% in one frame while the
 * camera's damped gate is still where it was: measured on the deployed build, a jump to
 * mid-dive dropped the frame by 52 luminance levels in one captured frame, against the 25
 * the passage is allowed. At 2/s a jump takes half a second to land - and a real scroll never
 * asks for more: the steepest part of the fade is 2.6 opacity per unit of progress, so
 * anything under ~0.75 of the whole driver per second (about 2,100 px/s) is untouched.
 */
const FADE_RATE = 2.0;

/**
 * `?fade=from,to,max` — the sweep knob these three numbers were chosen with, on the same
 * seam as `?hl` in ExposureToneMap and gated the same way, so production always runs the
 * constants above. Reading it once per mount is enough: the recorder sets it in the URL.
 */
const fadeParams = (): [number, number, number] => {
  if (!HUD_AVAILABLE || typeof window === 'undefined') return [FADE_FROM, FADE_TO, FADE_MAX];
  const raw = new URLSearchParams(window.location.search).get('fade');
  if (!raw) return [FADE_FROM, FADE_TO, FADE_MAX];
  const v = raw.split(',').map(Number);
  if (v.length !== 3 || v.some((n) => !Number.isFinite(n)) || v[1] <= v[0] || v[2] < 0 || v[2] > 1) {
    throw new Error(`?fade must be from,to,max with to > from and 0 <= max <= 1 - got "${raw}"`);
  }
  return [v[0], v[1], v[2]];
};

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const _fwd = new THREE.Vector3();
const DEG2RAD = Math.PI / 180;

export default function DiveFade() {
  const plane = useRef<THREE.Mesh>(null);
  // The opacity actually drawn. Null until the first frame: this component mounts with the
  // galaxy act, including on the way BACK from the solar system, where the camera is already
  // deep in the dive and the plane must be at its full value at once, under the swap curtain.
  // Ramping up from 0 there would let the bright galaxy show as the curtain releases.
  const shown = useRef<number | null>(null);
  const [from, to, max] = useRef(fadeParams()).current;

  useFrame((state, delta) => {
    const m = plane.current;
    if (!m) return;
    const target = smoothstep(from, to, useScene.getState().scrollProgress) * max;
    const cur = shown.current;
    const step = FADE_RATE * delta;
    const a = cur === null ? target : cur + Math.min(step, Math.max(-step, target - cur));
    shown.current = a;
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
