'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { damp, damp3 } from 'maath/easing';
import * as THREE from 'three';
import { useScene, type Act } from '@/lib/sceneStore';
import { planetPositions, planetRadii } from '@/lib/planetPositions';
import { SECTIONS } from '@/lib/sections';
import { ORBIT_FRAME, orbitDistance, DEG2RAD } from '@/lib/orbitFraming';
import { SWAP_V, coverageFor } from '@/lib/diveEnvelope';

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

// --- T1 swap machine constants -------------------------------------------------
const DEV = process.env.NODE_ENV !== 'production';
// Swap point + curtain envelope live in @/lib/diveEnvelope so the DOM scroll driver can
// share them without importing three.js.

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
const LOOK = new THREE.Vector3(0, 0.5, 0);
// T4 dive choreography — a cubic-Bézier S-curve that PITCHES THROUGH the disc plane
// (y: +2.6 above → −0.9 below), not parallel to it, so the galaxy disc is never a flat
// horizontal band. Ends inside a spiral ARM (offset from centre, Sol's neighbourhood);
// the gold core slides sideways to hang in the background.
const DIVE_P0 = new THREE.Vector3(0, 2.6, 9);
const DIVE_C1 = new THREE.Vector3(-0.7, 2.5, 6.4);
const DIVE_C2 = new THREE.Vector3(2.9, 0.4, 3.2);
const DIVE_P1 = new THREE.Vector3(3.7, -0.9, 1.5);
// Look pitches from looking-DOWN at the core (camera above the plane) to looking-UP at
// the arm (camera below it) — the disc sweeps across the frame at an angle.
const LOOK_START = new THREE.Vector3(0, 0.25, 0);
const LOOK_END = new THREE.Vector3(5.2, 0.9, -1.5);
const _bz = new THREE.Vector3();
/** Cubic Bézier into `out`. */
function cubicBezier(out: THREE.Vector3, p0: THREE.Vector3, c1: THREE.Vector3, c2: THREE.Vector3, p1: THREE.Vector3, e: number) {
  const u = 1 - e, a = u * u * u, b = 3 * u * u * e, c = 3 * u * e * e, d = e * e * e;
  out.set(
    a * p0.x + b * c1.x + c * c2.x + d * p1.x,
    a * p0.y + b * c1.y + c * c2.y + d * p1.y,
    a * p0.z + b * c1.z + c * c2.z + d * p1.z
  );
}
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
const _entry = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const _orbOff = new THREE.Vector3();
const _orbAxis = new THREE.Vector3();

// --- T7b mobile tour (portrait / coarse pointer) --------------------------------------
// Portrait crops the wide overview to mostly-sun, so instead of shrinking the system (and
// making planets untappable) we run a guided tour: a brief WIDE establishing shot, then
// framed "zoom-above" stops the user swipes between. Poses live here (the rig is the sole
// camera owner); DragControls writes the stop index, the dots read it.
const EST_DIST = 30;                    // establishing: far enough that the page-planets fit portrait
const EST_ELEV = 35 * DEG2RAD;          // elevated ~35° so the ecliptic reads as a system, not a line
const EST_FOV = 64;                     // wide vertical fov so the narrow portrait frame still holds it
const EST_HOLD = 1.7;                   // s — how long the establishing shot lingers before the tour
const EST_EASE = 1.4;                   // s — glide from establishing to the first stop
const TOUR_FOV = 44;                    // per-stop fov
const TOUR_FILL = 0.4;                  // planet ≈ 40% of viewport height (huge; leaves room for the label)
const BELT_TOUR_FOV = 46;
const _tourPos = new THREE.Vector3();
const _tourLook = new THREE.Vector3();
const _est = new THREE.Vector3();
const _el = new THREE.Vector3(); // establishing look target
/** A framed "zoom-above" stop for one page-planet: a mostly-lit gibbous vantage, elevated,
 *  with the planet large and sitting a little low so its label rides near the top. */
function tourPlanetPose(pp: THREE.Vector3, r: number) {
  _sunDir.copy(pp).normalize();
  _side.copy(UP).cross(_sunDir);
  if (_side.lengthSq() < 1e-4) _side.set(1, 0, 0);
  _side.normalize();
  const A = 0.7; // ~40° off the lit direction → a bright gibbous face with a terminator edge
  _camDir.copy(_sunDir).multiplyScalar(-Math.cos(A)); // -sunDir = toward the lit side (sun behind camera)
  _camDir.addScaledVector(_side, Math.sin(A));
  _camDir.y += 0.6; // "zoom-above"
  _camDir.normalize();
  const d = r / (TOUR_FILL * Math.tan((TOUR_FOV * DEG2RAD) / 2));
  _tourPos.copy(pp).addScaledVector(_camDir, d);
  _tourLook.copy(pp);
  _tourLook.y += r * 0.8; // planet drops low in frame, label sits near centre-top
}
/**
 * Drag-to-rotate (T6): rotate `pos` around `look` by yaw (about world-Y) then pitch
 * (about the horizontal axis perpendicular to the view) — an offset applied on top of
 * the state pose, so the rig stays the sole camera owner (no OrbitControls).
 */
function applyOrbit(pos: THREE.Vector3, look: THREE.Vector3, yaw: number, pitch: number) {
  if (yaw === 0 && pitch === 0) return;
  _orbOff.subVectors(pos, look);
  _orbOff.applyAxisAngle(UP, yaw);
  _orbAxis.crossVectors(UP, _orbOff);
  if (_orbAxis.lengthSq() < 1e-6) _orbAxis.set(1, 0, 0);
  _orbAxis.normalize();
  _orbOff.applyAxisAngle(_orbAxis, pitch);
  pos.copy(look).add(_orbOff);
}

/**
 * Sole owner of the camera. WELCOME_IDLE drifts; DIVE follows scrollProgress into
 * the galactic core (damped = buttery, resolution-independent, no frames);
 * SOLAR_OVERVIEW frames the whole system. The camera teleport at the act swap is
 * hidden behind the white flash, so the two scene-graphs read as one world.
 */
export default function CameraRig() {
  const prevAct = useRef<string>('galaxy');
  const pGate = useRef(0);          // damped dive gate (frame-rate independent) → coverage + swap
  const swapLatch = useRef(false);  // blocks re-swaps until well clear of the covered window
  const reconcile = useRef(0);      // T7c: 0 idle · 1 covering · 2 revealing (force-played swap)
  const recCov = useRef(0);         // T7c: hand-driven coverage during a reconcile
  const prevScroll = useRef(-1);    // T7c: previous-frame scroll → velocity (detect "at rest")
  const arrivedViaDive = useRef(false); // T7a: true only on the fresh galaxy→solar dive, so the
                                        // arrival dolly is scroll-driven (settle lands at scrollY=max)
  const mobileArriveT = useRef(0);      // T7b: clock time the establishing shot settled (0 = not yet)
  const orbit = useRef({ yaw: 0, pitch: 0 }); // damped drag-to-rotate offset (T6)
  // Read the store via getState() inside the frame loop — subscribing with the hook
  // would re-render this component on every scroll tick.
  useFrame((state, delta) => {
    // Use the REAL frame delta so every damp() converges in wall-clock time, not per
    // frame. The old `min(delta, 1/30)` clamp made convergence frame-count-bound: on a
    // slow client (software renderer / low tier, single-digit FPS) the arrival dolly-in
    // and fov settle took ~a minute, stranding it in a far/tiny composition with the
    // zodiacal disc splayed as an "oval" — a tier-dependent framing bug. maath's damp is
    // stable for any dt (asymptotic, never overshoots), so a large delta (e.g. a
    // background-tab return) just eases straight to the current resting target, which is
    // exactly where the camera was already headed. Composition is now identical at every
    // frame rate — cost may scale with the quality tier, framing never does.
    const dt = delta;
    const store = useScene.getState();
    let act = store.act;
    const scrollProgress = store.scrollProgress;
    const cam = state.camera as THREE.PerspectiveCamera;
    const t = state.clock.elapsedTime;

    // --- T1: coverage-gated, bidirectional, ATOMIC galaxy↔solar swap --------------
    // Only the home dive owns this machine (never on a focused world route). The swap
    // is driven by ONE number — the mask coverage — and may fire ONLY while cov>0.95,
    // so no seam is ever exposed; scroll-up runs the identical sequence mirrored.
    if (!store.focusedPlanet && !store.scrollDriven) {
      // R5.1 — no dive driver is mounted (in-session return to the overview), so SCROLL IS
      // NOT THE AUTHORITY on which act shows: the route + Hero decided it. Running the
      // machine here made a frozen, stale `scrollProgress` (whatever the visitor happened
      // to be at when they left the home page) drag the damped gate back across the swap
      // point — a gold curtain flash and a spurious solar→galaxy→solar flip on every
      // return home. Instead: keep the gate pinned to the current scroll and ease any
      // residual coverage away, so the frame is always clean and never latched.
      pGate.current = scrollProgress;
      prevScroll.current = scrollProgress;
      swapLatch.current = false;
      reconcile.current = 0;
      if (store.coverage > 0.001) {
        recCov.current = Math.max(0, store.coverage - dt / 0.3);
        store.setCoverage(recCov.current);
      } else if (store.coverage !== 0) {
        store.setCoverage(0);
      }
    } else if (!store.focusedPlanet) {
      // Scroll velocity (per second) → "at rest" detection for the T7c reconcile.
      const vel = prevScroll.current < 0 ? 1 : Math.abs(scrollProgress - prevScroll.current) / Math.max(dt, 1e-4);
      prevScroll.current = scrollProgress;
      const scrollSide: Act = scrollProgress >= SWAP_V ? 'solar' : 'galaxy';

      if (reconcile.current === 0) {
        // Damp a GATE toward raw scroll (wall-clock, frame-rate independent per the tier
        // law) so a fast fling can't jump past the covered window between two frames.
        damp(pGate, 'current', scrollProgress, 0.08, dt);
        const g = pGate.current;
        // Symmetric cover envelope: a full plateau centred on the swap point — identical
        // whether diving down or surfacing up, so the reverse is the dive played backwards.
        const cov = coverageFor(g);
        store.setCoverage(cov);
        const desired: Act = g >= SWAP_V ? 'solar' : 'galaxy';
        if (desired !== act && cov > 0.95 && !swapLatch.current) {
          // Order is law — all inside this covered frame, each step logged in dev:
          //  (1) unmount old act  (2) move camera to the new entry pose  (3) mount new act.
          // setAct() schedules the React unmount+mount; advancing `act` locally NOW makes
          // THIS frame's camera block below reposition to the new act's entry pose (step 2)
          // before the new act paints — the whole crossover hidden behind cov>0.95.
          if (DEV) console.log(`[swap] ${act}→${desired}  cov=${cov.toFixed(2)} gate=${g.toFixed(3)}: unmount ${act} → camera→${desired} → mount ${desired}`);
          store.setAct(desired);
          act = desired;
          swapLatch.current = true;
          arrivedViaDive.current = desired === 'solar'; // scroll-drive the arrival dolly (T7a); cleared on reverse
          if (desired === 'solar') { try { sessionStorage.setItem('seen-intro', '1'); } catch { /* private mode */ } }
        }
        if (cov < 0.5) swapLatch.current = false; // re-arm once clear of the covered window

        // T7c — positional reconciliation. An instant jump (End/Home, scrollbar drag,
        // scrollTo, scroll restoration) can move the damped gate PAST the coverage window
        // in a single step, so the swap above never fires and the act is left stranded on
        // the wrong side of SWAP_V. When the scene is scroll-driven and the scroll has come
        // to rest with the gate settled on the wrong side, force-play the full covered swap
        // below (never skips the cover — honours the T1 law).
        if (
          store.scrollDriven &&
          scrollSide !== act &&
          vel < 0.05 &&
          Math.abs(g - scrollProgress) < 0.06
        ) {
          reconcile.current = 1;
          recCov.current = cov; // continue the cover from wherever it already is
        }
      } else if (reconcile.current === 1) {
        // Cover up to a full plateau, THEN swap (T1: only at full coverage).
        recCov.current = Math.min(1, recCov.current + dt / 0.3);
        store.setCoverage(recCov.current);
        if (recCov.current >= 0.999) {
          if (act !== scrollSide) {
            if (DEV) console.log(`[swap:reconcile] ${act}→${scrollSide}  cov=${recCov.current.toFixed(3)} scroll=${scrollProgress.toFixed(3)}`);
            store.setAct(scrollSide);
            act = scrollSide;
            pGate.current = scrollProgress;   // sync the gate so the normal machine resumes cleanly
            arrivedViaDive.current = false;   // a teleport, not a dive → time-damped reveal (overview/tour)
            if (scrollSide === 'solar') { try { sessionStorage.setItem('seen-intro', '1'); } catch { /* private mode */ } }
          }
          reconcile.current = 2;
        }
      } else {
        // Reveal: ease coverage back down over the new act.
        recCov.current = Math.max(0, recCov.current - dt / 0.3);
        store.setCoverage(recCov.current);
        if (recCov.current <= 0.001) { reconcile.current = 0; swapLatch.current = false; }
      }
    }

    // Mouse parallax — the camera answers to you, so the scene is a place, not a video.
    const px = state.pointer.x || 0;
    const py = state.pointer.y || 0;

    // Drag-to-rotate (T6): damp the applied offset toward the store target (release
    // inertia lives in DragControls). Applied ONLY in WELCOME_IDLE + SOLAR_OVERVIEW below.
    damp(orbit.current, 'yaw', store.orbitYaw, 0.12, dt);
    damp(orbit.current, 'pitch', store.orbitPitch, 0.12, dt);

    if (act === 'galaxy') {
      prevAct.current = 'galaxy';
      mobileArriveT.current = 0; // T7b: replay the establishing shot on the next solar entry
      const p = scrollProgress;
      if (p < 0.015) {
        // WELCOME_IDLE — low, close, looking across the plane; gentle drift + parallax.
        _tgt.set(
          Math.sin(t * 0.08) * 0.7 + px * 1.5,
          2.6 + Math.sin(t * 0.07) * 0.25 + py * 0.9,
          9 + Math.cos(t * 0.08) * 0.5
        );
        applyOrbit(_tgt, LOOK, orbit.current.yaw, orbit.current.pitch); // drag-to-rotate (T6)
        damp3(cam.position, _tgt, 0.5, dt);
        damp(cam, 'fov', 55, 0.5, dt);
        cam.lookAt(LOOK.x, LOOK.y, LOOK.z);
      } else {
        // DIVE — a staged S-curve that descends THROUGH the disc plane. Completes by
        // ~0.85; the veil/swap happens in the last stretch.
        const e = easeInOutCubic(clamp01((p - 0.015) / 0.85));
        cubicBezier(_tgt, DIVE_P0, DIVE_C1, DIVE_C2, DIVE_P1, e);
        _tgt.x += px * 0.6 * (1 - e);
        _tgt.y += py * 0.4 * (1 - e);
        damp3(cam.position, _tgt, 0.22, dt);
        // FOV opens for speed on the way in, eases back near arrival (deceleration cue).
        const fov = 55 + 13 * Math.sin(clamp01(e) * Math.PI * 0.85);
        damp(cam, 'fov', fov, 0.22, dt);
        // Look pitches down→up as the camera crosses the plane, and a small extra pitch
        // bump mid-dive — so the disc sweeps across the frame at an angle, never a flat
        // horizontal band. The core (LOOK_END.x) slides off-side toward the arm.
        _look.copy(LOOK_START).lerp(LOOK_END, easeInOutCubic(e));
        _look.y += 0.5 * Math.sin(e * Math.PI);
        cam.lookAt(_look.x, _look.y, _look.z);
        // Cinematic bank — a roll that tilts the disc diagonally (kills any residual
        // horizontal read). Frequency 0.85π so it stays banked THROUGH the late crossing
        // (a faster wave returned to level right where the disc goes edge-on); a touch of mouse.
        cam.rotateZ(0.11 * Math.sin(e * Math.PI * 0.85) + px * 0.05);
      }
    } else {
      const focused = useScene.getState().focusedPlanet;
      const departure = focused ? clamp01(useScene.getState().departure) : 0;
      if (focused) mobileArriveT.current = 0; // T7b: re-establish the tour after a world visit
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
        // Drag-to-rotate (T6): orbit the whole system in SOLAR_OVERVIEW. Applied to the
        // overview pose only — in ORBIT the camera uses _orbitPos (departure≈0 blends in
        // no overview), so a focused world is never rotated by the offset.
        applyOrbit(_ovPos, _ovLook, orbit.current.yaw, orbit.current.pitch);

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
        } else if (store.tourMode) {
          // --- T7b: MOBILE TOUR ---------------------------------------------------
          // Portrait crops the wide overview to mostly-sun, so we guide instead: a brief
          // WIDE establishing shot (understand the space), then a framed "zoom-above" stop
          // the user swipes between (DragControls writes tourStop). Vertical scroll stays
          // the page; tap still enters the world (the planet's own click handler).
          _est.set(
            Math.sin(t * 0.03) * 0.6,
            EST_DIST * Math.sin(EST_ELEV) + Math.sin(t * 0.05) * 0.2,
            EST_DIST * Math.cos(EST_ELEV)
          );
          _el.set(0, 0.2, 0);
          const stopIdx = ((store.tourStop % SECTIONS.length) + SECTIONS.length) % SECTIONS.length;
          const focus = SECTIONS[stopIdx].focus;
          let stopFov = TOUR_FOV;
          if (focus === 'belt') {
            _tourPos.set(Math.sin(t * 0.05) * 0.8 - 2.4, 1.9 + Math.sin(t * 0.06) * 0.2, 7.6 + Math.cos(t * 0.05) * 0.5);
            _tourLook.set(1.4, 0.2, 0);
            stopFov = BELT_TOUR_FOV;
          } else {
            const tp = planetPositions.get(focus);
            const tr = planetRadii.get(focus) ?? 0.4;
            if (tp) {
              tourPlanetPose(tp, tr);
            } else {
              // Planet not mounted yet (first solar frame) → hold the establishing pose.
              _tourPos.copy(_est); _tourLook.copy(_el); stopFov = EST_FOV;
            }
          }
          // R5.1: the scroll-driven approach is valid ONLY while the tall dive driver is
          // actually mounted. On an in-session return the driver is gone and
          // `scrollProgress` is frozen at whatever the visitor last scrolled to — reading
          // it here stranded the camera part-way through the approach with no scroll left
          // to finish it (a hard stuck state). Without a driver we fall through to the
          // time-damped path, which always settles.
          const diving = store.scrollDriven && arrivedViaDive.current && scrollProgress < 0.999;
          if (diving) {
            // Scroll-driven approach to the establishing pose (T7a rule: settle at max).
            const arrive = easeInOutCubic(clamp01((scrollProgress - SWAP_V) / (1 - SWAP_V)));
            _entry.set(0, 8, 21);
            _tgt.copy(_entry).lerp(_est, arrive);
            damp3(cam.position, _tgt, 0.3, dt);
            damp(cam, 'fov', 52 + (EST_FOV - 52) * arrive, 0.3, dt);
            cam.lookAt(_el.x, _el.y, _el.z);
          } else {
            if (mobileArriveT.current === 0) mobileArriveT.current = t; // establishing settled → start the beat
            const held = t - mobileArriveT.current;
            const blend = easeInOutCubic(clamp01((held - EST_HOLD) / EST_EASE)); // 0 wide → 1 framed
            _tgt.copy(_est).lerp(_tourPos, blend);
            _look.copy(_el).lerp(_tourLook, blend);
            damp3(cam.position, _tgt, 0.45, dt);
            damp(cam, 'fov', EST_FOV + (stopFov - EST_FOV) * blend, 0.45, dt);
            cam.lookAt(_look.x, _look.y, _look.z);
          }
        } else if (store.scrollDriven && arrivedViaDive.current && scrollProgress >= SWAP_V) {
          // T7a: scroll-driven arrival dolly. The far entry pose eases to the overview
          // across the final scroll segment [SWAP_V..1], so the camera settle lands
          // exactly at scrollY=max — every position in the tail moves the camera, no
          // inert range. Returns / deep-links (scroll<SWAP_V) fall through to the
          // time-damped reveal below, so they still fly in without a scroll driver.
          const arrive = easeInOutCubic(clamp01((scrollProgress - SWAP_V) / (1 - SWAP_V)));
          _entry.set(0, 8, 21);
          _tgt.copy(_entry).lerp(_ovPos, arrive);
          damp3(cam.position, _tgt, 0.3, dt);
          damp(cam, 'fov', 52 + (ovFov - 52) * arrive, 0.3, dt);
          cam.lookAt(_ovLook.x, _ovLook.y, _ovLook.z);
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
