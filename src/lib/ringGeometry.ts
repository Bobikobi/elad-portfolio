import {
  projectedPlanetRect,
  livePlanetRect,
  livePlanetRectFresh,
  livePlanetPlane,
  livePlanetPlaneFresh,
  DEG2RAD,
} from './orbitFraming';

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
  /** the fan's design half-angle, degrees. The real fan is clamped below it by whatever
   *  is actually on the screen - see fanUp / fanDown. */
  fanDeg: number;
  /** px of screen above the ring that belongs to the navbar and must stay clear. */
  navSafe: number;
  /** px of clearance kept at the bottom of the viewport. */
  bottomSafe: number;
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
    // B8d - a window is a picture now, not a text box, so its thickness is no longer set
    // by what has to fit inside it. Laying the ring in the planet's ring plane also gave
    // the fan its full 35deg back on both sides, so the count comes from the fan rather
    // than from thin windows: at 170 + 14 that is four in view.
    //
    // Window count is the performance lever on this layer, and it took three measurement
    // rounds to be sure of it. 130px thickness put five windows in the fan and measured
    // 49.5-51fps at the low tier, against 57-59.5 for the build before and 60 for a
    // no-ring control. Caching the canonical geometry - building every path once at angle
    // 0 and letting a rotation carry it - was the obvious fix and changed nothing, which
    // ruled out the per-frame JS. Nor was it any one visual feature: with the shadow off,
    // the previews off, or both, the low tier still measured 52.2-54.0. What is left is
    // the count itself, so the count is what gives.
    thick: 230,
    cardGap: 16,
    fanDeg: 35,
    corner: 14,
    padInner: 28,
    padOuter: 24,
    padSide: 8,
    // B8d - the header used to take whatever the ring left over, with a 150px floor, and
    // at this framing that floor was binding: the title and the back control ended up
    // pressed against the viewport edge. It is a reservation now, and the ring gives up
    // depth for it rather than the other way round.
    headroom: 300,
    navSafe: 72,
    bottomSafe: 24,
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
    navSafe: 96,
    bottomSafe: 16,
  },
};

export interface RingMetrics {
  /**
   * The ring is built in a CANONICAL space centred on the origin, and one matrix carries
   * it to the screen: `[a, b, c, d, e, f]`, exactly SVG's `matrix()`. When the planet's
   * ring plane is known (B8d) that matrix is the plane's projection, so a circle in
   * canonical space lands as the ellipse the planet's own rings lie on and the windows
   * become slices of the SAME plane. Otherwise it is a plain translation and the ring is
   * the screen-plane circle it has always been.
   *
   * Keeping the geometry canonical is what lets every path, arc and corner stay circular
   * maths. Elliptical arc commands would have had to re-derive semi-axes and a rotation
   * for every one of them, and the rounding would have stopped being a fillet.
   */
  matrix: [number, number, number, number, number, number];
  /** planet projected centre + radius, px, in SCREEN space. */
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
  /** the fan's two half-angles, rad. They are NOT equal: the space above the planet's
   *  projected centre and the space below it are not the same, and the fan is clamped by
   *  what is really there rather than by one symmetric constant. */
  fanUp: number;
  fanDown: number;
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
  /** true when the ring is laid out in the planet's ring plane rather than the screen. */
  plane: boolean;
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

  // The ring plane's projection, when the rig has published one and this is the landscape
  // fan. Portrait keeps the screen-plane ring on purpose: measured, the plane's major axis
  // alone is 484px on a 390px-wide phone, so a plane-aligned fan there is wider than the
  // device before a single window is placed.
  const plane = !portrait && livePlanetPlaneFresh(vw, vh) ? livePlanetPlane : null;
  const lu = plane ? Math.hypot(plane.ux, plane.uy) : 1;
  const matrix: [number, number, number, number, number, number] = plane
    ? [plane.ux / lu, plane.uy / lu, plane.vx / lu, plane.vy / lu, rect.cx, rect.cy]
    : [1, 0, 0, 1, rect.cx, rect.cy];
  const toScreen = (r: number, th: number): [number, number] => {
    const x = r * Math.cos(th);
    const y = r * Math.sin(th);
    return [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]];
  };
  /** How many screen px one canonical unit is worth in the direction `th`. 1 along the
   *  major axis, the axis ratio along the minor one. */
  const scaleAt = (th: number) => {
    const [x, y] = toScreen(1, th);
    return Math.hypot(x - matrix[4], y - matrix[5]);
  };

  // Which canonical direction the fan sits in: away from the planet's side of the screen.
  // Read off the PLANET, never off the locale - the rig already mirrors the pose for RTL,
  // and asking the document a second time is how the two can disagree.
  const th0 = portrait ? Math.PI / 2 : rect.cx < vw / 2 ? 0 : Math.PI;
  // Which way canonical angle grows ON SCREEN is a property of the projected basis, not a
  // rule about left and right: under the plane matrix `v` can point either way. Sample it.
  const [, yA] = toScreen(1, th0);
  const [, yB] = toScreen(1, th0 + 0.05);
  const sweep: 1 | -1 = portrait ? (rtl ? 1 : -1) : yB >= yA ? 1 : -1;

  const design = k.fanDeg * DEG2RAD;

  // The inner radius has to clear the LIMB, and under an elliptical projection that is not
  // one radius: a canonical unit is worth fewer screen px toward the minor axis, so the
  // window that swings furthest off the major axis is the one that decides. Solve for the
  // worst case over the design fan rather than for the fan's centre.
  let worstScale = 1;
  for (let e = -1; e <= 1; e += 0.25) {
    worstScale = Math.min(worstScale, scaleAt(th0 + sweep * e * (design + 0.2)));
  }
  const r0 = (rect.r + k.gap) / Math.max(0.2, worstScale);

  // Depth: what is left between the ring and the far edge once the header keeps its zone.
  const edge = portrait ? vh - rect.cy : th0 === 0 ? vw - rect.cx : rect.cx;
  const room = portrait ? edge - k.gap - 12 : edge / Math.max(0.2, scaleAt(th0)) - r0 - k.headroom;
  const depth = Math.min(k.depth, Math.max(portrait ? 160 : 200, room));

  const r1 = r0 + depth;
  const rMid = (r0 + r1) / 2;
  // A window is WIDEST at its outer arc, and in portrait that width runs across the phone.
  // Left alone, the tuned thickness puts the outer corners past both screen edges, which
  // is the one thing that would break the hairline: a border cut by the viewport.
  const thick = portrait
    ? Math.min(k.thick, 2 * rMid * Math.asin(Math.min(0.9, (vw / 2 - 10) / r1)))
    : k.thick;
  const dHalf = thick / 2 / rMid;

  const rIn = r0 + k.padInner;
  const contentDepth = depth - k.padInner - k.padOuter;
  const contentHalf = Math.max(24, rIn * dHalf - k.padSide - k.corner * 0.35);

  // Defect 3 - the fan is clamped by the obstacles that are really on the screen rather
  // than by an angle chosen in the abstract: the navbar strip above, the viewport edges
  // everywhere else. Asymmetric, because the planet's centre does not sit halfway down.
  //
  // The clamp is a SCAN, not a formula. The first version solved `asin(room / r1)`, which
  // silently assumes the fan spreads vertically - true in landscape, false in portrait,
  // and false again under the plane matrix. It measured a 0 degree upper fan on a phone
  // and hid every window.
  //
  // Vertical is HARD: a window under the navbar is the defect being fixed, and one past
  // the bottom cannot be reached. Horizontal is SOFT, because the ring is deliberately
  // wider than a phone and treating that as fatal collapsed the fan to nothing.
  const sideSlack = vw * 0.35;
  const fits = (delta: number): boolean => {
    for (let e = -1; e <= 1; e += 1) {
      const th = th0 + sweep * (delta + e * dHalf);
      for (const r of [r0, r1, (r0 + r1) / 2]) {
        const [x, y] = toScreen(r, th);
        if (y < k.navSafe || y > vh - k.bottomSafe) return false;
        if (x < -sideSlack || x > vw + sideSlack) return false;
        if (Math.hypot(x - rect.cx, y - rect.cy) < rect.r + k.gap * 0.5) return false;
      }
    }
    return true;
  };
  const scan = (dir: 1 | -1): number => {
    const step = design / 36;
    let best = 0;
    for (let a = step; a <= design + 1e-9; a += step) {
      if (!fits(dir * a)) break;
      best = a;
    }
    return best;
  };
  const fanUp = scan(-1);
  const fanDown = scan(1);

  return {
    matrix,
    cx: rect.cx,
    cy: rect.cy,
    R: rect.r,
    r0,
    r1,
    rMid,
    th0,
    sweep,
    fanUp,
    fanDown,
    dHalf,
    pitch: thick + k.cardGap,
    corner: k.corner,
    contentDepth,
    contentHalf,
    rContent: rIn + contentDepth / 2,
    portrait,
    plane: plane !== null,
    headerW: portrait ? 0 : Math.max(k.headroom - 40, edge - r1 * scaleAt(th0) - 24),
  };
}

/** Canonical (x, y) mapped to the screen through the ring's matrix. */
export function toScreen(m: RingMetrics, x: number, y: number): [number, number] {
  return [
    m.matrix[0] * x + m.matrix[2] * y + m.matrix[4],
    m.matrix[1] * x + m.matrix[3] * y + m.matrix[5],
  ];
}

/** Screen point for a canonical polar coordinate. */
export function screenAt(m: RingMetrics, r: number, th: number): [number, number] {
  return toScreen(m, r * Math.cos(th), r * Math.sin(th));
}

/** CANONICAL point at polar (r, th). The layer draws in this space and one matrix on the
 *  group carries it to the screen, so nothing here knows about the projection. */
export function pointAt(_m: unknown, r: number, th: number): [number, number] {
  return [r * Math.cos(th), r * Math.sin(th)];
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

/**
 * A bare arc, for the scroll rail (B8c). Same convention as the window paths so the rail
 * sits concentric with everything else rather than being a straight bar beside a ring.
 */
export function arcPath(
  m: Pick<RingMetrics, 'cx' | 'cy'>,
  r: number,
  thA: number,
  thB: number
): string {
  const A = pointAt(m, r, thA);
  const B = pointAt(m, r, thB);
  const large = Math.abs(thB - thA) > Math.PI ? 1 : 0;
  const sweep = thB > thA ? 1 : 0;
  return `M${f(A[0])} ${f(A[1])}A${f(r)} ${f(r)} 0 ${large} ${sweep} ${f(B[0])} ${f(B[1])}`;
}

/** Arc length (px at rMid) available above and below the fan's centre. */
export const arcUp = (m: RingMetrics) => m.fanUp * m.rMid;
export const arcDown = (m: RingMetrics) => m.fanDown * m.rMid;

/** How far into the fan the FIRST window starts: half a pitch, or the whole fan when the
 *  fan is narrower than that. A phone leaves almost no fan at all, and an offset that
 *  assumed half a pitch of room put the only window that fits outside it. */
const lead = (m: RingMetrics) => Math.min(m.pitch / 2, arcUp(m));
const tail = (m: RingMetrics) => Math.min(m.pitch / 2, arcDown(m));

/** Where window `i` sits, in arc length (px at rMid) from the fan's centre. */
export function windowArc(i: number, count: number, scroll: number, m: RingMetrics): number {
  void count;
  return i * m.pitch - arcUp(m) + lead(m) - scroll;
}

/** How far the list can travel: enough to bring the last window inside the fan, no more. */
export function scrollSpan(count: number, m: RingMetrics): number {
  return Math.max(0, (count - 1) * m.pitch - arcUp(m) + lead(m) - arcDown(m) + tail(m));
}

/**
 * 1 well inside the fan, 0 once a window has left it. Measured on the window's CENTRE,
 * not its edges: with the fan clamped to nothing on a phone, an edge test reported every
 * window - including the one dead centre - as outside, and the ring rendered empty.
 * The band is short and the falloff steep on purpose: a half-faded window is a ghost.
 */
export function fanOpacity(a: number, m: RingMetrics): number {
  // `room` is how far INSIDE the clamped fan this window's centre still is. The fade
  // therefore happens inside the fan and a window is gone by the time it reaches the
  // edge - which is what makes the clamp mean anything. Fading outward instead let
  // windows render half a pitch past the limit, which put them back under the navbar
  // (measured: top at y=7 against a navbar ending at y=64) after the clamp had just
  // been added to stop exactly that.
  const room = Math.min(arcDown(m) - a, a + arcUp(m));
  const t = room / (m.pitch * 0.9);
  return (t < 0 ? 0 : t > 1 ? 1 : t) ** 1.4;
}

/**
 * How far out of the ring a window has risen, 0 at the fan's edge and 1 once it is fully
 * in. The layer turns this into a small scale about the ring's centre, so a window
 * travels INTO the fan along its own radius instead of switching on where it stands -
 * "like the discs", which is what the ring already does with everything else.
 */
export function fanRise(a: number, m: RingMetrics): number {
  const room = Math.min(arcDown(m) - a, a + arcUp(m));
  const t = room / (m.pitch * 0.9);
  return t < 0 ? 0 : t > 1 ? 1 : t;
}
