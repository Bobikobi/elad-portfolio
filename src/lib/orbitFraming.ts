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
