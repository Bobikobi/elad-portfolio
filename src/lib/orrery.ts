import { TOUR_SECTIONS } from '@/lib/sections';

/**
 * Mobile orrery geometry, in the solar root's own frame (sun at the origin, orbits in the x/z plane).
 *
 * The camera never moves while the visitor swipes. It hangs near the sun, looking out across the
 * system with the sun's limb at one edge of the frame. A swipe turns the carousel position, and
 * every carousel star is moved along its OWN orbit so that the selected one lands on the view ray,
 * its neighbours a fixed angular step to either side. Radii are never touched, so each star keeps
 * its real distance from the sun; only the angle changes.
 */
/** Orbit radii of the five carousel stops, in TOUR_SECTIONS order (earth, mars, belt,
 *  jupiter, saturn) — must track each planet's `orbit` in SolarAct.tsx (and the belt's
 *  own ring radius, BELT_RING_R in CameraRig.tsx). Exported so CameraRig can size the
 *  continuous-orbit drift compensation for the selected stop without importing SolarAct. */
export const TOUR_ORBIT_R = [3.35, 4.25, 5.1, 6.3, 8.0];
/** rad/s baseline for the mobile tour's continuous orbit motion: each star's own rate is
 *  BASE_RATE / orbit^1.5 (a Kepler-ish falloff), so saturn (orbit 8.0) drifts at ~0.005
 *  rad/s and earth (orbit 3.35) at ~0.018 rad/s. */
export const BASE_RATE = 0.113;

export const ORR = {
  CR: 2.8,    // camera distance from the sun centre (sun radius is 1.5)
  h: 1.0,     // camera height above the orbital plane
  beta: 0.78, // rad between the view axis and the direction to the sun
  Lref: 6.5,  // distance along the view axis at which the axis meets the plane
  SP: 0.3,    // rad of orbit between neighbouring carousel stars
  fov: 56,
  ty: 0,      // extra height of the look point
};

export interface OrrGeom { cx: number; cz: number; dx: number; dz: number; dir: number }

/** View ray + which way along an orbit is "screen right". Cheap enough to redo every call. */
export function orrGeom(): OrrGeom {
  const cx = ORR.CR, cz = 0;
  const ux = -1, uz = 0; // camera -> sun
  let dx = ux, dz = uz;
  for (const s of [1, -1]) {
    const c = Math.cos(ORR.beta * s), sn = Math.sin(ORR.beta * s);
    const x = ux * c - uz * sn, z = ux * sn + uz * c;
    // screen right = D x UP = (-dz, 0, dx); keep the turn that puts the sun on the LEFT.
    if (ux * -z + uz * x < 0) { dx = x; dz = z; break; }
  }
  const g = { cx, cz, dx, dz, dir: 1 };
  // Which sense of orbit angle moves a star to the right of the frame (probed at a mid radius).
  const a0 = rayAngle(g, 5);
  const p0x = Math.cos(a0) * 5, p0z = Math.sin(a0) * 5;
  const p1x = Math.cos(a0 + 0.05) * 5, p1z = Math.sin(a0 + 0.05) * 5;
  g.dir = (p1x - p0x) * -dz + (p1z - p0z) * dx > 0 ? 1 : -1;
  return g;
}

/** Orbit angle at which the view ray crosses the circle of radius R. */
function rayAngle(g: OrrGeom, R: number): number {
  const b = g.cx * g.dx + g.cz * g.dz;
  const c2 = g.cx * g.cx + g.cz * g.cz - R * R;
  const t = -b + Math.sqrt(Math.max(0, b * b - c2));
  return Math.atan2(g.cz + g.dz * t, g.cx + g.dx * t);
}

/** Orbit angle a carousel star of radius R and index idx takes at carousel position pos.
 *  Uses the shortest circular path so the carousel wraps seamlessly at the N-stop boundary. */
export function orrSlot(R: number, idx: number, pos: number, g: OrrGeom = orrGeom(), N = TOUR_SECTIONS.length): number {
  const raw = idx - pos;
  const d = ((raw % N + N + N / 2) % N) - N / 2;
  return rayAngle(g, R) + d * ORR.SP * g.dir;
}

/** Fixed camera and look point, in the root's local frame. */
export function orrPose(g: OrrGeom = orrGeom()) {
  return {
    pos: [g.cx, ORR.h, g.cz] as const,
    look: [g.cx + g.dx * ORR.Lref, ORR.ty, g.cz + g.dz * ORR.Lref] as const,
  };
}
