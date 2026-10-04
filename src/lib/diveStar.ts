/**
 * The star the home dive flies into (#82 stage 2). CameraRig aims the end of the dive at it and
 * locks the look on it; DiveStar draws it; the swap curtain's warm centre then grows out of the
 * same spot. One definition, dependency-free, so none of them imports another.
 *
 * World-fixed, not inside the galaxy's spinning group: the spin eases to 0 over the first 15% of
 * scroll, so during the dive the disc is still anyway, and a target that turned with it would
 * move the end of the path - and every turn rate along it - by however long the visitor rested.
 * The cost is that the patch of the photograph under it differs from visit to visit.
 *
 * In the disc plane at 0.8 of the disc's radius (5.0), where the old dive ended.
 */
export const DIVE_STAR: readonly [number, number, number] = [3.8, 0, 1.2];
