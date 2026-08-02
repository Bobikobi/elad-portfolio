import { projectedPlanetRect, livePlanetRect, livePlanetRectFresh, DEG2RAD } from './orbitFraming';

/**
 * B8b — the Projects windows are ANNULAR SECTORS, not rectangles.
 *
 * B8 tucked rectangles toward the limb with a per-window margin. That kept the GAP
 * roughly constant but the windows stayed boxes: their top and bottom edges were
 * parallel, so the column read as a straight list standing next to a curve instead of a
 * ring wrapped around a world. The shape itself has to carry the geometry.
 *
 * Every window is now a slice of the annulus centred on the planet's projected centre:
 *
 *   • inner edge  — a concave arc at radius r0 = R + gap, CONCENTRIC with the limb, so
 *                   the gap is constant along its whole length by construction;
 *   • side edges  — RADIAL lines from the planet's centre, so they diverge outward: a
 *                   truncated pizza slice, which is what makes the fan read as a ring;
 *   • outer edge  — a gentle convex arc at r1 = r0 + depth.
 *
 * Everything here is a pure function of the viewport so the same numbers can be asserted
 * from a test or a measuring probe without a browser. The stage calls `ringMetrics` once
 * per frame and feeds the results straight into path `d` attributes and transforms —
 * there is no React state on this path.
 */

export interface RingTuning {
  /** px between the planet limb and a window's inner arc — constant, by construction. */
  gap: number;
  /** radial depth of a window (r1 - r0). */
  depth: number;
  /** a window's tangential thickness AT rMid, so windows look equally thick despite the fan. */
  thick: number;
  /** tangential px between two neighbouring windows, also measured at rMid. */
  cardGap: number;
  /** half the total fan, degrees. Beyond this the text tilt stops being readable. */
  fanDeg: number;
  /** corner rounding, px. */
  corner: number;
  /** padding between the inner arc and the content box. */
  padInner: number;
  /** padding between the outer arc and the content box. */
  padOuter: number;
  /** padding between a radial edge and the content box. */
  padSide: number;
  /** px of screen the header needs beside the ring before the ring gives depth back. */
  headroom: number;
}

export const RING_TUNING: { landscape: RingTuning; portrait: RingTuning } = {
  landscape: {
    gap: 48,
    depth: 330,
    thick: 240,
    cardGap: 20,
    fanDeg: 35,
    corner: 14,
    padInner: 28,
    padOuter: 24,
    padSide: 8,
    headroom: 200,
  },
  // Portrait: the planet owns the top of the frame and the windows fan BELOW it, curved
  // edge on top. The planet is much smaller here (fill 0.44 of a short viewport), so the
  // ring is tight and a full-width window eats most of the fan — one window reads at a
  // time with its neighbours peeking in. That is the honest consequence of keeping the
  // arc concentric with a small limb, and it behaves like a carousel on a rail.
  portrait: {
    gap: 40,
    depth: 240,
    thick: 300,
    cardGap: 16,
    fanDeg: 30,
    corner: 14,
    padInner: 26,
    padOuter: 22,
    padSide: 8,
    headroom: 0,
  },
};

export interface RingMetrics {
  /** planet projected centre + radius, px. */
  cx: number;
  cy: number;
  R: number;
  /** inner / outer / mid radius of the window ring, px. */
  r0: number;
  r1: number;
  rMid: number;
  /** angle (rad) of the fan's centre: the direction the windows sit in from the planet. */
  th0: number;
  /** +1 / -1 — which way angle grows so that window i+1 is always "after" window i on
   *  screen (down the fan in landscape, along the reading direction in portrait). */
  sweep: 1 | -1;
  /** half the total fan, rad. */
  fan: number;
  /** half-angle of ONE window. */
  dHalf: number;
  /** arc length (px, at rMid) from one window's centre to the next. */
  pitch: number;
  corner: number;
  /** the content box inscribed in the sector: radial size, tangential half-size, and the
   *  radius its centre sits at. Inscribed at the INNER end, which is the narrow one. */
  contentDepth: number;
  contentHalf: number;
  rContent: number;
  portrait: boolean;
  /** px available for the header strip on the far side of the ring. */
  headerW: number;
}

export function ringMetrics(vw: number, vh: number, rtl: boolean, portrait: boolean): RingMetrics {
  const k = portrait ? RING_TUNING.portrait : RING_TUNING.landscape;
  // The rendered limb when the rig is publishing one, the design framing until then (the
  // first paint, reduced-motion, and the no-WebGL fallback all land here).
  const rect = livePlanetRectFresh(vw, vh)
    ? { cx: livePlanetRect.cx, cy: livePlanetRect.cy, r: livePlanetRect.r }
    : projectedPlanetRect(vw, vh, rtl, portrait);
  const r0 = rect.r + k.gap;

  // The ring is anchored to the planet, so the room left over for the header is whatever
  // is between the ring's outer edge and the inline-start screen edge. On a short-and-wide
  // desktop there is plenty; on a small laptop there is not, and the ring gives depth back
  // rather than sliding off its own planet.
  // Which side the fan sits on is read off the PLANET, not off the locale. The rig already
  // mirrors the pose for RTL, and asking the document a second time is how the two can
  // disagree — a stored locale that flips the copy without flipping `dir` put the windows
  // on the opposite side of the planet from the camera, half of them off-screen.
  const th0 = portrait ? Math.PI / 2 : rect.cx < vw / 2 ? 0 : Math.PI;
  // Angle grows clockwise on screen (y is down): on the planet's RIGHT that runs downward,
  // on its LEFT upward. The sweep cancels that so window i+1 is always the next one down.
  // Portrait fans horizontally, so there it follows the reading direction instead.
  const sweep: 1 | -1 = portrait ? (rtl ? 1 : -1) : th0 === 0 ? 1 : -1;

  const edge = portrait ? vh - rect.cy : th0 === 0 ? vw - rect.cx : rect.cx;
  const depth = portrait
    ? Math.min(k.depth, Math.max(160, edge - k.gap - 12))
    : Math.min(k.depth, Math.max(200, edge - r0 - k.headroom));

  const r1 = r0 + depth;
  const rMid = (r0 + r1) / 2;
  // A window is WIDEST at its outer arc, and in portrait that width runs across the phone.
  // Left alone, the tuned thickness puts the outer corners past both screen edges, which
  // is the one thing that would break the hairline: a border cut by the viewport. So the
  // thickness is clamped by what actually fits rather than by a number picked per device.
  const thick = portrait
    ? Math.min(k.thick, 2 * rMid * Math.asin(Math.min(0.9, (vw / 2 - 10) / r1)))
    : k.thick;
  const dHalf = thick / 2 / rMid;

  const rIn = r0 + k.padInner;
  const contentDepth = depth - k.padInner - k.padOuter;
  // The two side edges are radial, so a window is narrowest at its inner end: an inscribed
  // rectangle is bounded there. Corner rounding eats a little more.
  const contentHalf = Math.max(24, rIn * dHalf - k.padSide - k.corner * 0.35);

  return {
    cx: rect.cx,
    cy: rect.cy,
    R: rect.r,
    r0,
    r1,
    rMid,
    th0,
    sweep,
    fan: k.fanDeg * DEG2RAD,
    dHalf,
    pitch: thick + k.cardGap,
    corner: k.corner,
    contentDepth,
    contentHalf,
    rContent: rIn + contentDepth / 2,
    portrait,
    headerW: portrait ? 0 : Math.max(150, edge - r1 - 24),
  };
}

/** Screen point at polar (r, th) around the planet centre. */
export function pointAt(m: Pick<RingMetrics, 'cx' | 'cy'>, r: number, th: number): [number, number] {
  return [m.cx + r * Math.cos(th), m.cy + r * Math.sin(th)];
}

const f = (n: number) => n.toFixed(2);

/**
 * The window itself: inner arc → radial edge → outer arc → radial edge, with all four
 * corners rounded. The corners are quadratic joins through the true corner point; at a
 * 14px radius against radii of 300-700px the deviation from a true fillet is well under a
 * pixel, and unlike a fillet it can never invert when the sector gets thin.
 */
export function sectorPath(
  m: Pick<RingMetrics, 'cx' | 'cy' | 'corner'>,
  r0: number,
  r1: number,
  thA: number,
  thB: number
): string {
  const span = thB - thA;
  // Never let the rounding eat more than a third of an edge, or a small window folds.
  const c = Math.max(0, Math.min(m.corner, (r1 - r0) / 3, (r0 * span) / 3));
  const a0 = c / r0; // angular bite of the corner on the inner arc
  const a1 = c / r1; // ... and on the outer arc
  const P = (r: number, t: number) => pointAt(m, r, t);

  const A = P(r0, thA + a0);
  const B = P(r0, thB - a0);
  const K1 = P(r0, thB);
  const C = P(r0 + c, thB);
  const D = P(r1 - c, thB);
  const K2 = P(r1, thB);
  const E = P(r1, thB - a1);
  const F = P(r1, thA + a1);
  const K3 = P(r1, thA);
  const G = P(r1 - c, thA);
  const H = P(r0 + c, thA);
  const K4 = P(r0, thA);

  // large-arc is always 0 here (a window never spans 180deg); the inner arc runs with
  // increasing angle (sweep 1) and the outer one comes back (sweep 0).
  return (
    `M${f(A[0])} ${f(A[1])}` +
    `A${f(r0)} ${f(r0)} 0 0 1 ${f(B[0])} ${f(B[1])}` +
    `Q${f(K1[0])} ${f(K1[1])} ${f(C[0])} ${f(C[1])}` +
    `L${f(D[0])} ${f(D[1])}` +
    `Q${f(K2[0])} ${f(K2[1])} ${f(E[0])} ${f(E[1])}` +
    `A${f(r1)} ${f(r1)} 0 0 0 ${f(F[0])} ${f(F[1])}` +
    `Q${f(K3[0])} ${f(K3[1])} ${f(G[0])} ${f(G[1])}` +
    `L${f(H[0])} ${f(H[1])}` +
    `Q${f(K4[0])} ${f(K4[1])} ${f(A[0])} ${f(A[1])}` +
    'Z'
  );
}

/** The gold accent: the inner arc alone, so the signature line follows the limb. */
export function innerArcPath(
  m: Pick<RingMetrics, 'cx' | 'cy' | 'corner'>,
  r0: number,
  thA: number,
  thB: number
): string {
  const a0 = Math.min(m.corner, (r0 * (thB - thA)) / 3) / r0;
  const A = pointAt(m, r0, thA + a0);
  const B = pointAt(m, r0, thB - a0);
  return `M${f(A[0])} ${f(A[1])}A${f(r0)} ${f(r0)} 0 0 1 ${f(B[0])} ${f(B[1])}`;
}

/** Where window `i` sits, in arc length (px at rMid) from the fan's centre. */
export function windowArc(i: number, count: number, scroll: number, m: RingMetrics): number {
  void count;
  return (i + 0.5) * m.pitch - m.fan * m.rMid - scroll;
}

/** How far the list can travel: enough to bring the last window inside the fan, no more. */
export function scrollSpan(count: number, m: RingMetrics): number {
  return Math.max(0, count * m.pitch - 2 * m.fan * m.rMid);
}
