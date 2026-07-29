'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { damp, damp3 } from 'maath/easing';
import * as THREE from 'three';
import { useScene, type Act } from '@/lib/sceneStore';
import { planetPositions, planetRadii, planetRingNormal, beltTourAnchor } from '@/lib/planetPositions';
import { SECTIONS } from '@/lib/sections';
import { ORBIT_FRAME, orbitDistance, DEG2RAD } from '@/lib/orbitFraming';
import { SWAP_V, coverageFor } from '@/lib/diveEnvelope';
import { HUD_AVAILABLE } from './DebugHud';

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
/** Clamp into [-1, 1] — the valid domain of acos, which clamp01 is NOT. */
const clampUnit = (x: number) => (x < -1 ? -1 : x > 1 ? 1 : x);

// --- T1 swap machine constants -------------------------------------------------
const DEV = process.env.NODE_ENV !== 'production';
// Swap point + curtain envelope live in @/lib/diveEnvelope so the DOM scroll driver can
// share them without importing three.js.

// Per-planet ORBIT exposure. The system is spatially compressed, so irradiance falls off
// 25× between the innermost and outermost world; at a single aperture the near planets
// clip while the far ones go muddy. This is the aperture per world, and it is the only
// lever that works — albedo cannot rescue a diffuse radiance already well above 1.
//
// B3 retune, measured on the alias: at the old values Jupiter had 6.1% of its disc at
// 250+ (p99 luminance 250.6, i.e. a white field, not a planet) and Mars 10.4% clipped in
// the RED channel alone with mean blue at 0.2/255 — the "neon yellow". Values below put
// each world's peak just under the roll-off instead of through it.
// Calibrated by sweeping the aperture on the alias and measuring each disc, once the tone
// mapper was actually switched on (see ExposureToneMap — before that none of these numbers
// reached a pixel). At exposure 1.0 the measured discs came out at mean luminance
// jupiter 140 / clip 0%, saturn 93 / 0%, mars 95 / 0.9%, earth 211 / 19.5% — Earth is the
// outlier because its cloud and night-lights shells stack on top of an already close-lit
// body. These values land every world in the 90-135 band with clipping at zero.
const ORBIT_EXPOSURE: Record<string, number> = { earth: 0.62, mars: 0.72, jupiter: 0.85, saturn: 1.0, belt: 1.0 };

// --- The ORBIT vantage is SOLVED, not dialled in --------------------------------------
// The old construction was "sit A radians off the lit direction, then add a fixed vertical
// lift". Both halves are reasonable and together they leave everything to chance, because
// the lift is a CONSTANT added to a direction whose own y-component swings ±0.44 as a body
// orbits inside a system tilted 0.42rad. Two separate things came out as functions of
// orbital position rather than of intent, and each was measured on the alias:
//
//   • the LIT FRACTION — Saturn ran 45.7% to 71.7% lit, tracking sunDir.y exactly, so
//     /projects showed a mostly-NIGHT hero for half of every revolution;
//   • the RING OPENING — 0.4° at some longitudes (edge-on: the rings are not visible at
//     all) to 73° at others (face-on: a vinyl record, the "beige swoosh").
//
// A direction has exactly two degrees of freedom and there are exactly two things to get
// right, so spend them on the targets instead of on constants:
//
//     camDir = f·cos α + (e1·cos φ + e2·sin φ)·sin α
//
// with f the direction to the sun and (e1, e2) any orthonormal pair perpendicular to it.
// α alone fixes the phase — the lit fraction is (1 + cos α)/2 for EVERY φ — and φ then
// swings the camera around the sun-planet axis, which is precisely the freedom needed to
// choose the angle to the ring plane. Two independent targets, two closed forms, no
// iteration, and neither depends on where the body happens to be.
const LIT_TARGET: Record<string, number> = {
  // The ruling asks for ≥70%; this sits well clear of that floor and is also the most the
  // ring-opening constraint above will allow at every orbital position. 0.76 ± 0.03 spans
  // 73-79% lit — a clearly lit hero throughout, never a half-dark one.
  saturn: 0.76,
};
// The other four worlds keep the phase they were APPROVED at, and this is why.
//
// My first pass gave every world the same raised target on the reasoning that "favour the
// lit side" is a general preference and none of them would get darker. Sweeping caught what
// that actually did: Mars went from 0.32% of the frame clipping to 3.62%, and lowering its
// aperture barely moved it, because the cause was not exposure. Raising the lit fraction
// pulls the SUB-SOLAR POINT — the brightest spot on the body, where the sun is directly
// overhead — from near the limb, where it is foreshortened over few pixels, into open view.
// On Mars's bright dust that spot blows out and takes the polar terrain with it.
//
// The ruling was scoped to /projects Saturn. So Saturn gets the lit hero and the rest keep
// 0.66, the middle of the 58-71% range the old construction wandered over — which is the
// look that was reviewed and called reference-grade. They still gain the real fix: the phase
// no longer depends on where the body happens to be in its orbit.
const LIT_DEFAULT = 0.66;
const LIT_WOBBLE_DEFAULT = 0.04;
const LIT_WOBBLE: Record<string, number> = { saturn: 0.03 };
/** How far the sightline should sit off the reference plane, in radians. */
const PLANE_TARGET: Record<string, number> = {
  // Saturn's own ring plane. Real Saturn opens to about 27°; this is the poster version of
  // that — unmistakably a ring system, nowhere near the face-on "vinyl record" a free solve
  // drifts into. Backed off from 26° so the whole wobble stays inside the reachable set.
  saturn: 24 * DEG2RAD,
};
// Everything else measures against the ecliptic, and 19° is what the old fixed lift of
// 0.35 produced on average — so the worlds that were already approved keep their vantage.
const PLANE_DEFAULT = 19 * DEG2RAD;

const _f = new THREE.Vector3();
const _e1 = new THREE.Vector3();
const _e2 = new THREE.Vector3();
const _planeN = new THREE.Vector3();

/**
 * Build the ORBIT vantage direction (planet → camera).
 *
 * `lit` is delivered exactly. `planeN`/`planeAngle` are honoured when the geometry allows
 * it and approached as closely as possible when it does not — the priority order matters:
 * a world that is too dark is a worse frame than a ring that is a few degrees flatter.
 */
function orbitVantage(
  out: THREE.Vector3,
  sunDir: THREE.Vector3,     // sun → planet, unit
  planeN: THREE.Vector3,     // unit normal of the plane to open against
  lit: number,
  planeAngle: number,
  sideSign: number,
  prevPhi: number | null     // last frame's choice, for branch continuity — see below
): number {
  // Phase angle straight from the target: lit = (1 + cos α)/2.
  const alpha = Math.acos(clampUnit(2 * clamp01(lit) - 1));
  _f.copy(sunDir).negate();                      // planet → sun
  _e1.copy(UP).cross(_f);
  if (_e1.lengthSq() < 1e-6) _e1.set(1, 0, 0);
  _e1.normalize();
  _e2.copy(_f).cross(_e1).normalize();

  const ca = Math.cos(alpha), sa = Math.sin(alpha);
  // camDir·planeN = P·cos α + sin α·(Q·cos φ + R·sin φ) = P·cos α + sin α·M·cos(φ − ψ)
  const P = _f.dot(planeN);
  const Q = _e1.dot(planeN) * sideSign;
  const R = _e2.dot(planeN);
  const M = Math.hypot(Q, R);
  const psi = Math.atan2(R, Q);
  // The sightline may sit `planeAngle` off the plane on EITHER side of it — above the rings
  // or below them — and each side has two solutions, φ = ψ ± dφ. Four candidates, all of
  // them correct on both targets, and they are genuinely different places to stand.
  //
  // Which one is chosen has to be decided ONCE and then held, because picking per-frame by
  // "whichever is higher" is right in a still and wrong over time: as the body orbits, the
  // candidates' heights cross, the argmax swaps and the camera TELEPORTS. Simulated over a
  // full revolution at every root yaw, that measured a 106° jump for Saturn and 122° for
  // the others, against ~0.2° for a smooth step. Holding only the branch and still flipping
  // the SIDE — which flips when the sun crosses the ring plane — left 52°. Both have to be
  // continuous, so both are chosen the same way.
  //
  // Height decides the first frame; after that the candidate nearest last frame's is taken
  // and the camera walks its orbit. (Damping would have turned the teleport into a fast
  // unexplained swing, not removed it — a discontinuity has to go from the solve.)
  // Out-of-reach sides are CLAMPED rather than dropped — dropping one makes it vanish from
  // the candidate set the instant it becomes unreachable, stranding whatever was being
  // tracked and jumping the camera (77.7° of it, measured). But a clamped candidate is only
  // an approximation of the target, so it must never be PREFERRED: tracking one parked
  // Saturn near edge-on for 8.6% of its revolution, which is the very thing the ruling is
  // about. Exact solutions win over clamped ones; continuity decides among equals.
  // ONE side, always. The sightline could sit `planeAngle` off the plane above it or below
  // it, and letting the solve choose per-frame delivers the target 100% of the time — at
  // the cost of a 76° camera JUMP twice a revolution, when the side it was tracking becomes
  // unreachable. Fixing the side removes that entirely (worst step 3.8°) and means Saturn's
  // rings are always seen from the same face, which is what a held composition wants.
  //
  // The price is that the side has to be REACHABLE at every orbital position, and that is
  // a real constraint rather than a preference. Reachability works out to
  //     |acos(f·n) − α| ≤ 90° − planeAngle
  // and for Saturn f·n spans ±0.453 (its axial tilt, 0.47rad, seen from an orbit in the
  // root's own plane). At 80% lit, α = 53.1° and the requirement is f·n ≥ −0.454 — inside
  // the span by a thousandth, i.e. failing about a fifth of the time. That is why the
  // targets below sit where they do: they are not taste, they are the edge of the geometry
  // with a margin, and they still clear the ruling's 70% floor at every point of the wobble.
  let best = 0, bestScore = -Infinity, bestExact = false;
  {
    const sign = 1;
    const want = Math.sin(planeAngle) * sign;
    const rhs = M < 1e-6 ? 2 : (want - P * ca) / (sa * M);
    const exact = Math.abs(rhs) <= 1;
    const dphi = Math.acos(clampUnit(rhs));
    for (const phi of [psi + dphi, psi - dphi]) {
      const score =
        prevPhi === null
          ? _f.y * ca + sa * (_e1.y * Math.cos(phi) * sideSign + _e2.y * Math.sin(phi))
          : -Math.abs(Math.atan2(Math.sin(phi - prevPhi), Math.cos(phi - prevPhi)));
      if ((exact && !bestExact) || (exact === bestExact && score > bestScore)) {
        bestScore = score; best = phi; bestExact = exact;
      }
    }
  }
  if (bestScore === -Infinity) best = psi;   // degenerate geometry only
  out.copy(_f).multiplyScalar(ca)
    .addScaledVector(_e1, sa * Math.cos(best) * sideSign)
    .addScaledVector(_e2, sa * Math.sin(best));
  out.normalize();
  return best;
}
const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// --- B7: the arrival, and why the curtain kept being torn open ---------------------------
// Mounting the solar act is not free. Eight textured planets, a seventeen-thousand-body
// belt, the dust buffers and every material's first compile all land in ONE React commit —
// measured on the alias at 984ms for a single frame, with a 157ms frame beside it.
//
// The curtain exists precisely to hide that. It did not, because its coverage was a pure
// function of the damped gate, and `damp()` is wall-clock: across a 984ms frame the gate
// converges completely, so coverage was recomputed from the far side of the swap window
// and came out at 0.48 — and the gold fill only starts at 0.5, so it was fully transparent.
// The curtain went from covering the frame to gone in the single frame it existed to cover,
// and what it uncovered was the camera part-way through its arrival dolly. That is the
// "arrival": a freeze, then a lurch.
//
// The fix is in two parts, and neither of them is a timer.
//
// First, the thing being waited on is "has the new act actually DRAWN yet", which no wall
// clock can answer — so the curtain is held fully shut for REVEAL_FRAMES drawn frames
// after a swap. Second, the reveal itself is rate-limited: coverage may rise as fast as
// it likes (covering quickly is never wrong) but may only fall at 1/REVEAL_FADE per
// second. Without that limiter the reveal runs at whatever speed the damped gate happens
// to catch up, which after a stalled frame is "instantly" — measured at a 0.29 step in
// 10ms, the gold fill going from 40% opaque to nothing between two frames. The limit is
// wall-clock, so the fade looks identical on every machine; the frame count is the
// readiness gate, and only that part is frame-bound, by necessity.
//
// A gl.compile() on the first frame after the swap was tried here and removed: it did
// concentrate every new material's program build in one place, but it MOVED the cost
// rather than removing it — the stall frame went from 984ms to 1926ms — and the hold
// already covers those first draws, so the lazy compiles happen behind the curtain
// regardless. Paying twice to be told the same thing is not an optimisation.
//
// G1 — "by necessity" was doing a lot of work in that sentence, and it was wrong. A pure
// frame count is 133ms at 60fps and NINETEEN SECONDS on a software renderer: measured on
// the alias under SwiftShader at 0.6fps, an instant scrollTo(max) swapped correctly, the
// envelope fell to 0 on the very next frame — and the curtain stayed fully opaque, gold
// wash over the whole viewport, `hold` ticking 7·6·5·4·3 one per 2.4s frame. Same shape as
// the CameraRig delta clamp: a quantity that reads as "a moment" at 60Hz and as "forever"
// at 1Hz. The reveal limiter below was NOT the culprit — it has always used the real dt.
//
// So the hold gets two exits, and the readiness floor stays frame-bound because only a
// drawn frame can prove the act drew:
//   · the fast path is unchanged — REVEAL_FRAMES drawn frames, which at 60fps elapses long
//     before the wall-clock cap and therefore still decides;
//   · on a slow client the cap takes over once REVEAL_MIN_FRAMES have actually drawn (the
//     stall frame the curtain exists to hide is one of them, so the act IS on screen).
// The floor cannot be waived: releasing on a clock alone would uncover a frame that has
// not been drawn, which is the B7 defect with the sign flipped.
const REVEAL_FRAMES = 8;
const REVEAL_MIN_FRAMES = 2;   // readiness floor — drawn frames, never wall-clock
const REVEAL_HOLD_CAP = 0.4;   // s — past this the floor alone governs
const REVEAL_FADE = 0.35; // s

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
const _tmp = new THREE.Vector3();
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

// --- B14: /technologies is the BELT world, so the belt has to be the shot ---------------
// The old pose was a world-fixed point looking at (1.4, 0.2, 0) — which is a point two
// units from the sun. So the page whose whole subject is the asteroid belt was framed on
// the star, with the band as a thin arc somewhere behind it, and nothing in the screenshot
// said "belt". It also ignored the solar root's own tilt and yaw entirely, so what little
// band was in frame drifted out of alignment as the system turned.
//
// The camera now RIDES the ring: it sits just outside the dense zone and a little above
// the plane, and looks along the band — yawed inward off the tangent so the ring curves
// away into the distance instead of leaving the frame, and pitched down so the band reads
// as a plane rather than a line. Measured against the belt's own annulus, that puts the
// nearest visible grains ~2.6 units from the lens (past the near-dissolve floor, so the
// foreground field actually draws) and carries the band out to ~10.5 units: a real
// perspective recession, near to far, inside one frame.
//
// The sun stays out of it, which is the whole reason for the inward yaw being 26° and not
// more: at this pose the star is 62° off the view axis and its limb clears the frame
// corner by ~11°, so it lights the dust from the side without ever appearing. And the ride
// direction mirrors with the writing direction — the band takes the side of the frame the
// content panel does NOT (panel inline-start, band inline-end), same contract as the
// planet worlds.
//
// The pose is expressed in the SOLAR ROOT's own frame and transformed out, so it tracks
// the ecliptic's tilt and slow yaw instead of pretending the plane is world-flat.
const BELT_RING_R = 5.1; // must match AsteroidBelt's BELT_R
/**
 * `out` — how far outside the ring centre the camera rides · `y` — height above the
 * ecliptic · `yaw` — inward off the tangent (this is what keeps the receding ring in
 * frame, and every degree of it walks the sun closer to the corner) · `pitch` — look-down
 * onto the band, which also lifts the band UP the frame, so portrait uses more of it to
 * clear the bottom content sheet.
 */
const BELT_RIDE = {
  landscape: { out: 1.6, y: 1.35, yaw: 26 * DEG2RAD, pitch: 14 * DEG2RAD, fov: 46 },
  // Portrait is not just a narrower landscape: the content sheet owns the bottom ~58% of
  // the screen, so the only canvas the visitor actually sees is a letterbox strip above
  // it, and the pose has to be scored on THAT strip rather than on the whole frame. A
  // wider lens made everything smaller in the one place it needed to be biggest, so this
  // goes the other way — a 46° lens (band magnified), a harder inward yaw (more ring
  // inside the narrow horizontal wedge) and enough pitch to lift the whole band into the
  // strip. Measured on the ring's own annulus, that carries 15.6% of it into the visible
  // strip versus 12% before, from 1.5 units out to 9.2.
  portrait: { out: 0.9, y: 1.0, yaw: 40 * DEG2RAD, pitch: 26 * DEG2RAD, fov: 46 },
  // The mobile tour's belt stop, which had the identical defect: it looked at (1.4,0.2,0)
  // and so filled 44% of a phone screen with the SUN while the belt it was naming lay in
  // a corner. Same ride, further out and higher, so the stop establishes the band and
  // entering the world moves into it.
  tour: { out: 1.3, y: 2.5, yaw: 32 * DEG2RAD, pitch: 16 * DEG2RAD, fov: 58 },
};
const BELT_DRIFT = 0.011; // rad/s the vantage creeps round the ring
const _beltPos = new THREE.Vector3();
const _beltLook = new THREE.Vector3();
const _beltDir = new THREE.Vector3();
type BeltRide = (typeof BELT_RIDE)['landscape'];
/**
 * A belt-riding pose in the SOLAR ROOT's OWN frame (the caller lifts it to world space so
 * it tracks the ecliptic's tilt and yaw). `dirSign` is the direction of travel round the
 * ring: reversing it mirrors the whole composition left-to-right, which is how the band
 * ends up on the side of the frame the content panel does not use.
 */
function beltRidePose(pos: THREE.Vector3, look: THREE.Vector3, ride: BeltRide, dirSign: number, phi: number) {
  const cs = Math.cos(phi), sn = Math.sin(phi);
  pos.set(cs * (BELT_RING_R + ride.out), ride.y, sn * (BELT_RING_R + ride.out));
  // tangent · cos(yaw) + inward · sin(yaw), then pitched down.
  const cy = Math.cos(ride.yaw), sy = Math.sin(ride.yaw), cp = Math.cos(ride.pitch);
  _beltDir.set(
    (dirSign * -sn * cy - cs * sy) * cp,
    -Math.sin(ride.pitch),
    (dirSign * cs * cy - sn * sy) * cp
  );
  look.copy(pos).addScaledVector(_beltDir, 8);
}

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
  // B7: the reveal latch. See REVEAL_FRAMES — after a swap the curtain is held shut for a
  // number of DRAWN frames and then eased open, instead of being handed straight back to a
  // schedule that assumes the swap was free.
  // The ORBIT vantage's chosen branch, kept across frames so it never flips (see
  // orbitVantage). Cleared whenever the focused world changes.
  const vantagePhi = useRef<number | null>(null);
  const vantageFor = useRef<string | null>(null);
  const revealHold = useRef(0);
  const revealDrawn = useRef(0); // G1: drawn frames since the latch — the readiness floor
  const revealAge = useRef(0);   // G1: wall-clock seconds since the latch — the slow-client exit
  const dtNominal = useRef(1 / 60); // G1b: min-biased estimate of this client's own frame time
  const fadeAge = useRef(0);        // G1b: seconds the current fade has been running
  const covOut = useRef(0); // last published coverage — the rate limiter's state
  // The solar root, cached: the belt poses are expressed in its frame and would otherwise
  // cost a whole-scene name search every frame. Re-resolved whenever the act swap has
  // replaced it (`parent === null` once three has detached the old one).
  const solarRoot = useRef<THREE.Object3D | null>(null);
  const beltRoot = (scene: THREE.Scene) => {
    if (!solarRoot.current || !solarRoot.current.parent) {
      solarRoot.current = scene.getObjectByName('solarRoot') ?? null;
    }
    return solarRoot.current;
  };
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

    // B7 — advance the reveal latch once per DRAWN frame, before anything reads it. While
    // it is held the curtain is pinned shut; afterwards it eases open on a wall clock and
    // becomes a FLOOR under whatever the envelope says, so the handover is never a step.
    if (revealHold.current > 0) {
      revealHold.current -= 1;
      revealDrawn.current += 1;
      revealAge.current += dt;
      // G1: the two exits. Frames alone at 60fps (133ms), the clock once enough frames have
      // genuinely drawn — so a 5fps client waits ~0.4s instead of ~1.6s, and a 0.6fps client
      // waits for its two frames instead of all eight.
      if (revealDrawn.current >= REVEAL_MIN_FRAMES && revealAge.current >= REVEAL_HOLD_CAP) {
        revealHold.current = 0;
      }
    }
    const held = revealHold.current > 0 ? 1 : 0;
    /**
     * Publish coverage. Two rules, and both exist because a long frame breaks the naive
     * version: while the hold is up the curtain is pinned shut, and at all times coverage
     * may RISE freely but may only FALL at a bounded rate. Covering fast is never wrong;
     * uncovering fast is the defect. Without the limiter the reveal is however fast the
     * damped gate happens to catch up — which after a stalled frame is "instantly", and
     * measured at a 0.29 step, i.e. the gold fill going from 40% opaque to nothing between
     * two frames 10ms apart.
     *
     * G1b — the fade's dt is not the frame's dt, and the difference is a defect I introduced
     * and then measured: releasing the hold on the wall clock can hand the FIRST fade frame
     * a 400ms delta, and 0.4/0.35 > 1, so the entire fade happens in one step. B7's own test
     * caught it — worst drop 1.000, the full curtain gone between two samples.
     *
     * A flat clamp is not the fix either: `min(dt, 1/30)` is exactly the frame-count-bound
     * mistake this file already documents twice, and on a 0.6fps client it would stretch the
     * fade across 21 of its 2.3-second frames — 48 seconds of gold.
     *
     * What separates the two cases is not the frame in front of us but the client behind it:
     * one long frame on a 60fps machine is a stall (clamp it — a fade is a fade), while
     * every frame being long is a slow client (do not clamp — there is no such thing as a
     * smooth fade at 0.6fps, and holding the curtain there is the G1 bug). So the clamp is
     * relative to the client's own established cadence, tracked min-biased for the reason
     * the QualityGovernor gives: load only ever makes frames LONGER, so the fast tail is the
     * honest signal. A stall barely moves the estimate; a genuinely slow client moves it all
     * the way, and gets its curtain back immediately.
     */
    const nominal = dtNominal.current;
    // Fall toward a faster cadence quickly, rise toward a slower one grudgingly.
    dtNominal.current = dt < nominal ? nominal + (dt - nominal) * 0.25 : nominal + (dt - nominal) * 0.015;
    // …and the clamp YIELDS once the fade has had its full wall-clock budget. Without this it
    // can do the very thing it was added to prevent from the other side: a clamp that keeps
    // shortening each step also keeps the curtain up longer, which is G1 again. So it shapes
    // the fade for REVEAL_FADE seconds and then gets out of the way — total fade time is
    // bounded at REVEAL_FADE plus one frame on every client, fast or slow.
    // Two conditions, and the second one is the subtle half. Shaping is only meaningful while
    // the fade still has budget left (`fadeAge`) AND while a single frame is shorter than the
    // whole fade — because if one frame already exceeds REVEAL_FADE, there is no fade to shape:
    // the client cannot draw an intermediate step, so clamping the first frame does not make
    // the transition smoother, it just spends a whole extra frame with the curtain up. Measured
    // at 8fps: exactly one wasted frame, 3 frames to clear where 2 is the floor.
    const shaping = fadeAge.current < REVEAL_FADE && dt < REVEAL_FADE;
    const fadeDt = shaping ? Math.min(dt, Math.max(nominal * 3, 1 / 45)) : dt;
    const setCoverage = (v: number) => {
      const wanted = Math.max(v, held);
      const out = wanted >= covOut.current ? wanted : Math.max(wanted, covOut.current - fadeDt / REVEAL_FADE);
      // The fade's own clock: it runs only while the curtain is actually coming down, and any
      // rise (a new crossing, a reconcile covering up again) starts it over.
      if (out >= covOut.current) fadeAge.current = 0;
      else fadeAge.current += dt;
      covOut.current = out;
      if (HUD_AVAILABLE) {
        (window as unknown as { __reveal?: unknown }).__reveal = {
          hold: revealHold.current, envelope: +v.toFixed(3),
          published: +out.toFixed(3), gate: +pGate.current.toFixed(4),
          drawn: revealDrawn.current, age: +revealAge.current.toFixed(3),
          dt: +dt.toFixed(3), nominal: +dtNominal.current.toFixed(4), fadeDt: +fadeDt.toFixed(3),
        };
      }
      store.setCoverage(out);
    };
    /** Called at every swap site: shut the curtain and keep it shut until the act draws. */
    const latchReveal = () => {
      revealHold.current = REVEAL_FRAMES;
      revealDrawn.current = 0;
      revealAge.current = 0;
    };

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
        setCoverage(recCov.current);
      } else if (store.coverage !== 0) {
        setCoverage(0);
      }
    } else if (!store.focusedPlanet) {
      // Scroll velocity (per second) → "at rest" detection for the T7c reconcile.
      const vel = prevScroll.current < 0 ? 1 : Math.abs(scrollProgress - prevScroll.current) / Math.max(dt, 1e-4);
      prevScroll.current = scrollProgress;
      const scrollSide: Act = scrollProgress >= SWAP_V ? 'solar' : 'galaxy';

      if (reconcile.current === 0) {
        // Damp a GATE toward raw scroll (wall-clock, frame-rate independent per the tier
        // law) so a fast fling can't jump past the covered window between two frames.
        const prevGate = pGate.current;
        damp(pGate, 'current', scrollProgress, 0.08, dt);
        // …except a damp cannot promise that, because it is wall-clock: across the 984ms
        // frame the act mount costs, it converges completely and the gate lands on the far
        // side of the swap window having never been inside it. The swap then never fires
        // (it needs cov>0.95), the reconcile has to clean up afterwards, and the visitor
        // sees the seam. So state the rule directly instead of hoping the damp implies it:
        // a frame that WOULD cross the swap point stops exactly on it. One frame at full
        // coverage is guaranteed, whatever the frame took.
        if (prevGate !== pGate.current && (prevGate < SWAP_V) !== (pGate.current < SWAP_V)) {
          pGate.current = SWAP_V;
        }
        const g = pGate.current;
        // Symmetric cover envelope: a full plateau centred on the swap point — identical
        // whether diving down or surfacing up, so the reverse is the dive played backwards.
        const cov = coverageFor(g);
        setCoverage(cov);
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
          latchReveal(); // B7 — the curtain stays shut until the new act has actually drawn
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
        setCoverage(recCov.current);
        if (recCov.current >= 0.999) {
          if (act !== scrollSide) {
            if (DEV) console.log(`[swap:reconcile] ${act}→${scrollSide}  cov=${recCov.current.toFixed(3)} scroll=${scrollProgress.toFixed(3)}`);
            store.setAct(scrollSide);
            act = scrollSide;
            latchReveal(); // B7 — same hold on the reconciled swap
            pGate.current = scrollProgress;   // sync the gate so the normal machine resumes cleanly
            arrivedViaDive.current = false;   // a teleport, not a dive → time-damped reveal (overview/tour)
            if (scrollSide === 'solar') { try { sessionStorage.setItem('seen-intro', '1'); } catch { /* private mode */ } }
          }
          reconcile.current = 2;
        }
      } else {
        // Reveal: ease coverage back down over the new act.
        recCov.current = Math.max(0, recCov.current - dt / 0.3);
        setCoverage(recCov.current);
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
      {
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

        if (focused === 'belt') {
          // --- B14: ride the band (see BELT_RIDE) -------------------------------------
          const ride = portrait ? BELT_RIDE.portrait : BELT_RIDE.landscape;
          const dirSign = document.documentElement.dir === 'rtl' ? -1 : 1;
          beltRidePose(_beltPos, _beltLook, ride, dirSign, t * BELT_DRIFT + 1.35);
          _beltPos.y += Math.sin(t * 0.06) * 0.05; // a hair of float, so it breathes
          const root = beltRoot(state.scene);
          if (root) { root.localToWorld(_beltPos); root.localToWorld(_beltLook); }
          // Departure scrub, same contract as a planet world: the meter eases the ride
          // back out to the overview so the exit gesture is visible while it is happening.
          _tgt.copy(_beltPos).lerp(_ovPos, departure);
          _look.copy(_beltLook).lerp(_ovLook, departure);
          damp3(cam.position, _tgt, 0.5, dt);
          damp(cam, 'fov', ride.fov + (ovFov - ride.fov) * departure, 0.5, dt);
          cam.lookAt(_look.x, _look.y, _look.z);
        } else if (pp) {
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

          // Sun-relative vantage, SOLVED rather than dialled in — see orbitVantage. The
          // two things this pose has to get right are how much of the disc is in daylight
          // and, for a ringed world, how far open the rings are; a direction has exactly
          // two degrees of freedom, and the old "fixed azimuth + fixed vertical lift"
          // spent them both on constants, leaving the orbit to decide both outcomes.
          //
          // B5's "eclipse beat" survives, moved one level up: the lit TARGET breathes on
          // the same slow irregular cycle, so the terminator still wanders across the disc
          // — but between two fractions we chose. The sun only moves further behind the
          // camera as the target rises, so the off-frame rule is never at risk from it.
          _sunDir.copy(pp).normalize();
          const sideSign = rtl ? -1 : 1; // keep the lit limb on the outer (planet) edge
          const wob = LIT_WOBBLE[focused as string] ?? LIT_WOBBLE_DEFAULT;
          const litTarget =
            (LIT_TARGET[focused as string] ?? LIT_DEFAULT) +
            Math.sin(t * 0.055) * wob * 0.62 +
            Math.sin(t * 0.021 + 1.7) * wob * 0.38;
          // The plane to open against: a ringed world's own ring plane (published live by
          // the body that owns it), everything else the ecliptic.
          const ringN = planetRingNormal.get(focused as string);
          if (ringN) _planeN.copy(ringN);
          else {
            const root = beltRoot(state.scene);
            if (root) _planeN.set(0, 1, 0).transformDirection(root.matrixWorld).normalize();
            else _planeN.set(0, 1, 0);
          }
          if (vantageFor.current !== focused) { vantageFor.current = focused as string; vantagePhi.current = null; }
          vantagePhi.current = orbitVantage(
            _camDir,
            _sunDir,
            _planeN,
            litTarget,
            PLANE_TARGET[focused as string] ?? PLANE_DEFAULT,
            sideSign,
            vantagePhi.current
          );
          _orbitPos.copy(pp).addScaledVector(_camDir, d);
          _orbitPos.x += Math.sin(t * 0.2) * 0.03 * d; // living micro-drift
          _orbitPos.y += Math.cos(t * 0.15) * 0.02 * d;

          // Offset the lookAt so the planet lands off-centre on the inline-end side
          // (ndcX) and rides a little high (ndcY).
          //
          // B8 — this used to build the screen basis from the direction to the PLANET and
          // then hand the result to lookAt(), which rebuilds its own basis from the
          // direction to the OFFSET POINT. Those two differ by a roll of about 9° here,
          // and the horizontal offset is five times the vertical one, so the roll leaked
          // enough of the horizontal into the vertical to cancel it almost exactly:
          // measured on the alias, the planet landed at ndcY −0.008 against a design value
          // of +0.12, i.e. dead centre instead of riding high, 57px from where the DOM arc
          // believed the limb was. The horizontal was right the whole time, which is
          // exactly why it never looked like a bug.
          //
          // Solved by iterating instead of assuming: build the basis from the LOOK point —
          // the axis lookAt will actually use — and repeat until it stops moving. Three
          // passes converge to well under a pixel, and it costs a handful of dot products.
          // Depth comes from the same axis, so the offset scales by the planet's real
          // depth rather than by the design distance.
          const tanHalf = Math.tan((f.fovDeg * DEG2RAD) / 2);
          const sx = (rtl ? -f.ndcX : f.ndcX) * tanHalf * aspect;
          const sy = f.ndcY * tanHalf;
          _orbitLook.copy(pp);
          for (let i = 0; i < 3; i++) {
            _viewDir.copy(_orbitLook).sub(_orbitPos).normalize();
            _right.copy(_viewDir).cross(UP).normalize();
            _up2.copy(_right).cross(_viewDir).normalize();
            const depth = _tmp.copy(pp).sub(_orbitPos).dot(_viewDir);
            _orbitLook.copy(pp).addScaledVector(_right, -sx * depth).addScaledVector(_up2, -sy * depth);
          }

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
            // B14: the belt stop rides the band too — from further out, so it establishes
            // the ring and entering the world moves into it.
            beltRidePose(_tourPos, _tourLook, BELT_RIDE.tour, document.documentElement.dir === 'rtl' ? -1 : 1, t * BELT_DRIFT + 1.35);
            // Where this pose is actually aimed on the ring — the pill's anchor. Drop the
            // sightline onto the ecliptic, then pull that point back onto the ring radius,
            // so the label lands on the band the stop is showing rather than on a constant.
            _beltDir.copy(_tourLook).sub(_tourPos).normalize();
            const s = _beltDir.y < -1e-3 ? -_tourPos.y / _beltDir.y : 8;
            beltTourAnchor.copy(_tourPos).addScaledVector(_beltDir, s);
            beltTourAnchor.y = 0;
            beltTourAnchor.setLength(BELT_RING_R);
            const root = beltRoot(state.scene);
            if (root) {
              root.localToWorld(_tourPos);
              root.localToWorld(_tourLook);
              root.localToWorld(beltTourAnchor);
            }
            stopFov = BELT_RIDE.tour.fov;
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
