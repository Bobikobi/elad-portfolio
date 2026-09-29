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
 *  jupiter, saturn) - must track each planet's `orbit` in SolarAct.tsx (and the belt's
 *  own ring radius, BELT_RING_R in CameraRig.tsx). DragControls uses them to turn finger
 *  pixels into carousel position 1:1. */
export const TOUR_ORBIT_R = [3.35, 4.25, 5.1, 6.3, 8.0];

export const ORR = {
  CR: 2.8,    // camera distance from the sun centre (sun radius is 1.5)
  h: 1.0,     // camera height above the orbital plane
  beta: 0.78, // rad between the view axis and the direction to the sun
  Lref: 6.5,  // distance along the view axis at which the axis meets the plane
  SP: 0.4,    // rad of orbit between neighbouring carousel stars (0.3 made the loop feel short, Elad 2026-09-29)
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

/** The carousel loops (Elad, 2026-09-29): `tourPos` runs on unbounded, and a stop index is
 *  taken mod N. `orrWrap(d)` folds a stop offset into [-N/2, N/2). */
export function orrWrap(d: number, n: number = TOUR_ORBIT_R.length): number {
  return d - n * Math.floor(d / n + 0.5);
}

/** Orbit angle a carousel star of radius R and index idx takes at carousel position pos. The
 *  offset is wrapped, so the star 2.5 stops away on one side re-enters on the other - out of
 *  frame, where the jump is not seen. */
export function orrSlot(R: number, idx: number, pos: number, g: OrrGeom = orrGeom()): number {
  return rayAngle(g, R) + orrWrap(idx - pos) * ORR.SP * g.dir;
}

/** Screen pixels the star at stop `idx` moves per unit of carousel position, at rest on the
 *  view ray. Projects two nearby slots through the fixed orrery camera, in the root frame
 *  (the camera's up is the orbital plane's normal, so the root's own tilt cancels out). */
export function orrPxPerStop(idx: number, width: number, height: number, at: number = idx): number {
  const g = orrGeom();
  const N = TOUR_ORBIT_R.length;
  idx = ((Math.round(idx) % N) + N) % N;
  const R = TOUR_ORBIT_R[idx];
  const { pos, look } = orrPose(g);
  let fx = look[0] - pos[0], fy = look[1] - pos[1], fz = look[2] - pos[2];
  const fl = Math.hypot(fx, fy, fz); fx /= fl; fy /= fl; fz /= fl;
  // right = forward x up, up = +y
  let rx = -fz, rz = fx; const rl = Math.hypot(rx, rz); rx /= rl; rz /= rl;
  const focal = height / 2 / Math.tan((ORR.fov * Math.PI) / 360);
  const sx = (p: number) => {
    const an = orrSlot(R, idx, p, g);
    const px = Math.cos(an) * R - pos[0], py = -pos[1], pz = Math.sin(an) * R - pos[2];
    return (focal * (px * rx + pz * rz)) / (px * fx + py * fy + pz * fz) + width / 2;
  };
  const e = 0.02;
  return Math.abs(sx(at + e) - sx(at - e)) / (2 * e);
}

/** Fixed camera and look point, in the root's local frame. */
export function orrPose(g: OrrGeom = orrGeom()) {
  return {
    pos: [g.cx, ORR.h, g.cz] as const,
    look: [g.cx + g.dx * ORR.Lref, ORR.ty, g.cz + g.dz * ORR.Lref] as const,
  };
}
