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
 * relative to it. Measured from the 2048 photo: peak of the 6 px blur at (3.313, 1.208), RGB
 * (232, 241, 244) in its core, (95, 109, 115) around it.
 */
export const DIVE_KNOT: readonly [number, number, number] = [3.313, 0, 1.208];
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
