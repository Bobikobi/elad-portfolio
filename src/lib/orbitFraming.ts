/**
 * Shared "Jupiter frame" ORBIT composition constants — the single source of truth
 * for how a focused planet is framed, used by BOTH the WebGL camera (CameraRig) and
 * the DOM layout (ProjectsStage arc) so the floating windows curve against the SAME
 * limb the camera actually renders. Keeping this in one module is what keeps the arc
 * and the planet locked together without any per-frame scene→DOM plumbing.
 *
 * The planet is framed HUGE and anchored to the INLINE-END side (opposite the content
 * column): physical right in LTR (en/ru), physical left in RTL (he) — the reference
 * "giant planet on one side, list floating over space on the other". `fill` = the
 * planet DIAMETER as a fraction of viewport HEIGHT. Camera distance derives from it:
 *   d = radius / (tan(fov/2) * fill)
 * The sun is deliberately kept off-frame (see CameraRig's gibbous construction) so it
 * is at most a faint edge glow, never a dominant element.
 */
export interface OrbitFrame {
  fovDeg: number;
  /** planet diameter / viewport height */
  fill: number;
  /** planet centre horizontal offset in NDC toward the inline-end side (0..1). */
  ndcX: number;
  /** planet centre vertical offset in NDC, + = above centre (camera looks up). */
  ndcY: number;
}

export const ORBIT_FRAME = {
  // Desktop: big planet pinned to one side, left limb curving through the frame, the
  // camera slightly below so we look UP at a world.
  landscape: { fovDeg: 40, fill: 0.68, ndcX: 0.42, ndcY: 0.12 } as OrbitFrame,
  // Portrait: planet owns the top ~40%, centred; the window list lives below it.
  portrait: { fovDeg: 50, fill: 0.44, ndcX: 0, ndcY: 0.52 } as OrbitFrame,
};

export const DEG2RAD = Math.PI / 180;

/**
 * The focused planet's ACTUAL projected limb, published by CameraRig every frame.
 *
 * B8b — `projectedPlanetRect` below is the DESIGN framing, and it is not the limb the
 * camera draws. Two reasons: `fill` is defined through tan(fov/2), which is the
 * tangent-plane size of the sphere rather than its silhouette (the real disc is larger by
 * 1/sqrt(1-(R/d)^2) — about 10px here), and the orbit pose carries a deliberate micro-
 * drift plus critical damping, so the disc breathes by a few px around the design value.
 * A window whose inner arc is meant to sit a CONSTANT gap off that limb cannot be built
 * from the design number; it has to follow the real one.
 *
 * So the rig fits a circle to the projected silhouette and leaves it here — a plain
 * mutable value object, the same pattern as the chrome mask in the other direction, so
 * scene→DOM costs nothing per frame and never goes through React.
 *
 * `vw`/`vh` are the viewport it was measured in. They are the real staleness test: the
 * rig does not run a frame it has nothing to change (a focused world settles, and since
 * SPARKLE-2 it deliberately stops sweeping), so a last-published value can be hundreds of
 * ms old and still be exactly right — but it is worthless the moment the viewport is a
 * different size, which is also the one case the rig is guaranteed to republish for.
 */
export const livePlanetRect = { cx: 0, cy: 0, r: 0, vw: 0, vh: 0, stamp: -1e9 };

/**
 * The focused planet's RING PLANE, projected to screen (B8d).
 *
 * `u` and `v` are the screen-space images of two orthonormal in-plane world vectors, each
 * one planet-radius long: `u` along the projected ellipse's major axis (the direction the
 * plane is not foreshortened in), `v` perpendicular to it inside the plane. A circle of
 * radius p planet-radii in that plane is then, on screen,
 *
 *     C + p * (u * cos(th) + v * sin(th))
 *
 * which is exactly an SVG `matrix(ux, uy, vx, vy, cx, cy)`. That is why the ring layer can
 * keep every path in a plain unit-circle space and hand the whole ellipse to one transform
 * instead of re-deriving elliptical arcs.
 *
 * `ringOuter` is where the planet's own rings end, in the same planet-radius units, so the
 * window ring can be placed a constant distance outside them rather than a guessed one.
 * `axisRatio` = |v| / |u|: 1 is face-on, 0 is edge-on. Below ~0.12 the plane is too closed
 * to lay anything out in and the caller should fall back to the screen-plane ring.
 */
export const livePlanetPlane = {
  ux: 1, uy: 0,
  vx: 0, vy: 1,
  ringOuter: 0,
  axisRatio: 1,
  vw: 0, vh: 0,
  stamp: -1e9,
};

export function livePlanetPlaneFresh(vw: number, vh: number): boolean {
  return (
    livePlanetPlane.ringOuter > 0 &&
    livePlanetPlane.axisRatio > 0.12 &&
    livePlanetPlane.vw === vw &&
    livePlanetPlane.vh === vh
  );
}

/** True when the published limb still describes THIS viewport. */
export function livePlanetRectFresh(vw: number, vh: number): boolean {
  return livePlanetRect.r > 0 && livePlanetRect.vw === vw && livePlanetRect.vh === vh;
}

/** Camera distance from a planet of the given radius for a frame preset. */
export function orbitDistance(radius: number, f: OrbitFrame): number {
  return radius / (Math.tan((f.fovDeg * DEG2RAD) / 2) * f.fill);
}

/** The focused planet's projected screen rect (px), computed directly from the frame
 *  preset — no scene readback. `rtl` flips the inline-end side to the left. */
export function projectedPlanetRect(
  vw: number,
  vh: number,
  rtl: boolean,
  portrait: boolean
): { cx: number; cy: number; r: number } {
  const f = portrait ? ORBIT_FRAME.portrait : ORBIT_FRAME.landscape;
  const nx = rtl ? -f.ndcX : f.ndcX; // inline-end: left in RTL, right in LTR
  return {
    cx: (nx * 0.5 + 0.5) * vw,
    cy: (0.5 - f.ndcY * 0.5) * vh,
    r: f.fill * 0.5 * vh,
  };
}
