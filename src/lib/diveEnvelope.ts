/**
 * The galaxy↔solar crossover envelope — the ONE definition of where the swap happens
 * and how wide the covering curtain is. Lives in its own dependency-free module so the
 * DOM side (the scroll driver in Hero) can reason about the curtain without importing
 * the WebGL rig (which would drag three.js into the initial page bundle).
 */

/** Dive progress (0..1) at which the galaxy act crosses over to the solar act. */
export const SWAP_V = 0.9;
/** Coverage == 1 while |gate − SWAP_V| < this: a fully hidden window for the swap. */
export const COVER_PLATEAU = 0.02;
/** Coverage eases to 0 over this much beyond the plateau, symmetrically. */
export const COVER_FALLOFF = 0.06;

/** The curtain's coverage (0..1) for a given damped gate position. */
export function coverageFor(gate: number): number {
  const d = Math.abs(gate - SWAP_V);
  if (d < COVER_PLATEAU) return 1;
  const v = 1 - (d - COVER_PLATEAU) / COVER_FALLOFF;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
