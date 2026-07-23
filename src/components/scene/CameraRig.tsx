'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { damp, damp3 } from 'maath/easing';
import * as THREE from 'three';
import { useScene } from '@/lib/sceneStore';
import { planetPositions, planetRadii } from '@/lib/planetPositions';
import { ORBIT_FRAME, orbitDistance, DEG2RAD } from '@/lib/orbitFraming';

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

// Per-planet ORBIT exposure. Inner planets sit so close to the sun that their lit
// disc clips to gold at full exposure (Earth/Mars washed out); normalising the
// aperture down brings them to the same readable brightness as the outer worlds so
// the texture/identity reads. Only applied while a world is focused — the solar
// overview / galaxy stay at 1.0, so the approved arrival pose is untouched. The sun
// surface + corona are toneMapped:false, so they stay burning regardless.
const ORBIT_EXPOSURE: Record<string, number> = { earth: 0.32, mars: 0.5, jupiter: 0.85, saturn: 0.6 };
// Ringed worlds need a much higher vantage so the rings open up instead of reading
// edge-on (invisible). Others keep a low, "look up at a world" angle.
const RINGED = new Set(['saturn']);
const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// Immersive welcome: low + close, looking ACROSS the galaxy plane so it fills the
// frame and spills off the left/right edges (you're inside space, not viewing a disc).
const DIVE_FROM = new THREE.Vector3(0, 2.6, 9);
// Dive ends inside a spiral ARM (offset from centre), not the core — Sol's real
// neighbourhood. The gold core slides sideways to hang in the background.
const DIVE_TO = new THREE.Vector3(3.6, 0.0, 1.6);
const LOOK = new THREE.Vector3(0, 0.5, 0);
const _tgt = new THREE.Vector3();
const _look = new THREE.Vector3();
const _sunDir = new THREE.Vector3();
const _side = new THREE.Vector3();
const _camDir = new THREE.Vector3();
const _viewDir = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up2 = new THREE.Vector3();
const _orbitPos = new THREE.Vector3();
const _orbitLook = new THREE.Vector3();
const _ovPos = new THREE.Vector3();
const _ovLook = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const LOOK_CORE = new THREE.Vector3(0, 0.4, 0);
const LOOK_ARM = new THREE.Vector3(5.2, 0, -1.5); // forward along travel — core drifts off-side

/**
 * Sole owner of the camera. WELCOME_IDLE drifts; DIVE follows scrollProgress into
 * the galactic core (damped = buttery, resolution-independent, no frames);
 * SOLAR_OVERVIEW frames the whole system. The camera teleport at the act swap is
 * hidden behind the white flash, so the two scene-graphs read as one world.
 */
export default function CameraRig() {
  const prevAct = useRef<string>('galaxy');
  // Read the store via getState() inside the frame loop — subscribing with the hook
  // would re-render this component on every scroll tick.
  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30); // clamp so a background-tab return can't jump the camera
    const { act, scrollProgress } = useScene.getState();
    const cam = state.camera as THREE.PerspectiveCamera;
    const t = state.clock.elapsedTime;

    // Mouse parallax — the camera answers to you, so the scene is a place, not a video.
    const px = state.pointer.x || 0;
    const py = state.pointer.y || 0;

    if (act === 'galaxy') {
      prevAct.current = 'galaxy';
      const p = scrollProgress;
      if (p < 0.015) {
        // WELCOME_IDLE — low, close, looking across the plane; gentle drift + parallax.
        _tgt.set(
          Math.sin(t * 0.08) * 0.7 + px * 1.5,
          2.6 + Math.sin(t * 0.07) * 0.25 + py * 0.9,
          9 + Math.cos(t * 0.08) * 0.5
        );
        damp3(cam.position, _tgt, 0.5, dt);
        damp(cam, 'fov', 55, 0.5, dt);
        cam.lookAt(LOOK.x, LOOK.y, LOOK.z);
      } else {
        // DIVE — dive completes by ~0.85; the veil/swap happens in the last stretch.
        const e = easeInOutCubic(clamp01((p - 0.015) / 0.85));
        _tgt.copy(DIVE_FROM).lerp(DIVE_TO, e);
        _tgt.x += px * 0.6 * (1 - e);
        _tgt.y += py * 0.4 * (1 - e);
        damp3(cam.position, _tgt, 0.22, dt);
        // FOV opens for speed on the way in, eases back near arrival (deceleration cue).
        const fov = 55 + 13 * Math.sin(clamp01(e) * Math.PI * 0.85);
        damp(cam, 'fov', fov, 0.22, dt);
        // Look shifts from core toward the travel direction, so the core slides off-side.
        _look.copy(LOOK_CORE).lerp(LOOK_ARM, easeInOutCubic(e));
        cam.lookAt(_look.x, _look.y, _look.z);
      }
    } else {
      const focused = useScene.getState().focusedPlanet;
      const departure = focused ? clamp01(useScene.getState().departure) : 0;
      // On first entering the solar act, snap to a start pose then fly IN. From the
      // dive we snap FAR for a zoom-in reveal; a deep-link straight to a world starts
      // closer so the flight to its planet is short and graceful.
      if (prevAct.current !== 'solar') {
        prevAct.current = 'solar';
        // Reveal starts already at a legible scale (never "tiny") then flies IN to the
        // poster pose. A deep-link straight to a world starts closer still.
        if (focused) cam.position.set(0, 5, 16);
        else cam.position.set(0, 8, 21);
      }
      const pp = focused && focused !== 'belt' ? planetPositions.get(focused) : null;
      if (focused === 'belt') {
        // Technologies = the asteroid belt: a lower, closer glide skimming the belt.
        _tgt.set(Math.sin(t * 0.05) * 0.8 - 2.4, 1.9 + Math.sin(t * 0.06) * 0.2, 7.6 + Math.cos(t * 0.05) * 0.5);
        damp3(cam.position, _tgt, 0.6, dt);
        damp(cam, 'fov', 46, 0.6, dt);
        _look.set(1.4, 0.2, 0);
        cam.lookAt(_look.x, _look.y, _look.z);
      } else {
        const aspect = state.size.width / Math.max(1, state.size.height);
        const portrait = aspect < 1;

        // --- SOLAR_OVERVIEW pose (also the departure destination we scrub back to) ---
        // Look ACROSS the system (low elevation), not down at a diagram. three's `fov`
        // is VERTICAL, so the sun's share of viewport HEIGHT depends only on fov+dist.
        const wide = clamp01((aspect - 0.6) / 1.2); // 0 portrait .. 1 wide
        // Sun disc target 35-45% of viewport HEIGHT on arrival (measured via Debug HUD):
        // dist = R/tan(f*fovY/2) with R=1.5 → ~40% desktop, ~38% portrait (mobile full-screen).
        const ovDist = 11.0 - 0.9 * wide;
        const ovElev = (20 - 7 * wide) * DEG2RAD;
        const ovFov = 42 - wide;
        _ovPos.set(
          Math.sin(t * 0.03) * 0.5 - 0.6 * wide,
          ovDist * Math.sin(ovElev) + Math.sin(t * 0.05) * 0.2,
          ovDist * Math.cos(ovElev) + Math.cos(t * 0.03) * 0.4
        );
        _ovLook.set(Math.sin(t * 0.04) * 0.15, 0.2, 0);

        if (pp) {
          // --- ORBIT: the "Jupiter frame". The focused planet is the DOMINANT hero —
          // framed huge and pinned to the inline-END side (left in RTL / right in LTR),
          // its inner limb curving through the frame; the sun is pushed OFF-frame so it
          // is at most a faint edge glow (F1). Composition constants come from the
          // shared orbitFraming module so the DOM window-arc curves against this exact
          // limb.
          const rtl = document.documentElement.dir === 'rtl';
          const f = portrait ? ORBIT_FRAME.portrait : ORBIT_FRAME.landscape;
          const r = planetRadii.get(focused as string) ?? 0.4;
          const d = orbitDistance(r, f);

          // Sun-relative gibbous vantage (sun at world origin): sit on the lit side,
          // ~60° off the lit direction, so there's ALWAYS a terminator crossing the
          // disc and the sun sits ~110° from the view centre = well outside the frustum.
          _sunDir.copy(pp).normalize();
          _side.copy(UP).cross(_sunDir);
          if (_side.lengthSq() < 1e-4) _side.set(1, 0, 0);
          _side.normalize();
          const sideSign = rtl ? -1 : 1; // keep the lit limb on the outer (planet) edge
          // ~72° off the lit direction: sits further behind the lit side so the sun (and
          // its off-frame bloom) is pushed fully out of frame — it was still bleeding a
          // warm glow into the top corner at 60° (F3). Terminator still crosses the disc.
          const A = 1.25;
          _camDir.copy(_sunDir).multiplyScalar(-Math.cos(A));
          _camDir.addScaledVector(_side, Math.sin(A) * sideSign);
          // Elevation: ringed worlds get a high vantage so the rings open up (edge-on
          // rings read as nothing); others keep a low "look up at a world" angle.
          _camDir.y += RINGED.has(focused as string) ? 0.72 : 0.35;
          _camDir.normalize();
          _orbitPos.copy(pp).addScaledVector(_camDir, d);
          _orbitPos.x += Math.sin(t * 0.2) * 0.03 * d; // living micro-drift
          _orbitPos.y += Math.cos(t * 0.15) * 0.02 * d;

          // Offset the lookAt so the planet lands off-centre on the inline-end side
          // (ndcX) and rides a little high (ndcY) — computed in the camera's own screen
          // basis at the planet's depth.
          _viewDir.copy(pp).sub(_orbitPos).normalize();
          _right.copy(_viewDir).cross(UP).normalize();
          _up2.copy(_right).cross(_viewDir).normalize();
          const tanHalf = Math.tan((f.fovDeg * DEG2RAD) / 2);
          const nx = (rtl ? -f.ndcX : f.ndcX) * tanHalf * aspect * d;
          const ny = f.ndcY * tanHalf * d;
          _orbitLook.copy(pp).addScaledVector(_right, -nx).addScaledVector(_up2, -ny);

          // Departure scrub: blend ORBIT → OVERVIEW by the departure meter (0..1).
          _tgt.copy(_orbitPos).lerp(_ovPos, departure);
          _look.copy(_orbitLook).lerp(_ovLook, departure);
          const fov = f.fovDeg + (ovFov - f.fovDeg) * departure;
          damp3(cam.position, _tgt, 0.5, dt);
          damp(cam, 'fov', fov, 0.5, dt);
          cam.lookAt(_look.x, _look.y, _look.z);
        } else {
          damp3(cam.position, _ovPos, 0.7, dt);
          damp(cam, 'fov', ovFov, 0.7, dt);
          cam.lookAt(_ovLook.x, _ovLook.y, _ovLook.z);
        }
      }
    }
    // Aperture: ease toward the focused planet's ORBIT exposure (1.0 everywhere else);
    // as the departure meter scrubs back toward the overview, ease exposure back to 1.
    const fp = useScene.getState().focusedPlanet;
    const dep = fp ? clamp01(useScene.getState().departure) : 0;
    const orbitExpo = fp ? ORBIT_EXPOSURE[fp] ?? 1 : 1;
    const expoTarget = act === 'solar' && fp ? orbitExpo + (1 - orbitExpo) * dep : 1;
    damp(state.gl, 'toneMappingExposure', expoTarget, 0.4, dt);

    cam.updateProjectionMatrix();
  });

  return null;
}
