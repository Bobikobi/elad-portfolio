/**
 * The star the home dive flies into (#82 stage 2). CameraRig aims the end of the dive at it and
 * locks the look on it; DiveStar draws it; the swap curtain's warm centre then grows out of the
 * same spot. One definition, dependency-free, so none of them imports another.
 *
 * It is the brightest knot in the photograph's arms (a giant star-forming region on the east
 * arm, 3.53 from the centre), so the dive ends in something the visitor already saw at rest.
 * Until 2026-10-04 it was a world-fixed point at 0.8 of the radius that the spin carried a patch
 * of dim outer arm under (owner: "the start of the path has to match").
 *
 * The knot turns with the disc, so the dive's target is the knot as the disc stands when the dive
 * starts: Galaxy stops the turn the moment the scroll leaves 0, which holds the target still for
 * the whole dive, and the late path (DIVE_P1, DIVE_C2, the objects the dive passes) is laid
 * relative to it. Measured from the 2048 photo at radius 5: peak of the 6 px blur at
 * (3.313, 1.208), RGB (232, 241, 244) in its core, (95, 109, 115) around it.
 */
const KNOT_AT_5: readonly [number, number, number] = [3.313, 0, 1.208];

/**
 * The disc's radius in world units (Galaxy draws the photo across 2R). Here, not in Galaxy, so
 * the knot - a fixed place in the photograph - scales with it and CameraRig can lay the dive on
 * it at module load. `?gr=` in non-production builds is the size knob; malformed values throw.
 *
 * 6.3 since 2026-10-05 (owner: "maybe make it cover more of the screen"): 1.31x wider at rest
 * (worst phase 974 px against 741 at 5.0), with CameraRig's look lowered to 0.1 so the disc
 * rises in the frame. The bottom band is what bounds it: at the old look, 6.3 put a wall of
 * galaxy light on the bottom edge (G5 bottom 41, master 28.7; at 5.0 it was 25.4, and a look
 * of -0.2 that fixed the bottom pushed the disc into the name). At 6.3 / 0.1: bottom 23.5.
 */
export const DISC_R: number = (() => {
  const d = 6.3;
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' || typeof window === 'undefined') return d;
  const v = new URLSearchParams(window.location.search).get('gr');
  if (v === null) return d;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`?gr must be a radius > 0 - got "${v}"`);
  return n;
})();

/** The knot at DISC_R; measured on the photo at radius 5. */
export const DIVE_KNOT: readonly [number, number, number] = [KNOT_AT_5[0] * (DISC_R / 5), 0, KNOT_AT_5[2] * (DISC_R / 5)];
/**
 * Where the path was designed to end (the old world-fixed star). The late path and the dive's
 * props are authored around it and moved by `target - DIVE_DESIGN`.
 */
export const DIVE_DESIGN: readonly [number, number, number] = [3.8, 0, 1.2];

/** The knot in world space for the disc turned `spin` radians about y (three's rotation.y). */
export function diveStarAt(spin: number, out: { x: number; y: number; z: number }) {
  const c = Math.cos(spin);
  const s = Math.sin(spin);
  out.x = DIVE_KNOT[0] * c + DIVE_KNOT[2] * s;
  out.y = DIVE_KNOT[1];
  out.z = -DIVE_KNOT[0] * s + DIVE_KNOT[2] * c;
  return out;
}
