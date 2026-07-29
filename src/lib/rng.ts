/**
 * Deterministic seeded randomness for the procedural scene.
 *
 * Every field in this scene — the galaxy's arms, the dive corridor, the hero stars, the
 * asteroid belt, the zodiacal dust, the moons — was seeded with `Math.random()` inside a
 * `useMemo`. That is fifty `react-hooks/purity` errors, and the rule is not being pedantic:
 * a `useMemo` may be discarded and recomputed at React's discretion, so an impure one means
 * the scene can silently regenerate into a DIFFERENT scene mid-session. It also meant no two
 * loads were alike, which quietly undermined every visual verification in this project — a
 * screenshot could not be compared against another screenshot, so "the belt looks wrong"
 * could never be distinguished from "the belt rolled differently this time".
 *
 * Seeding fixes both at once. Same seed, same scene, every load, on every machine and every
 * quality tier — so a difference between two captures is now always a real difference.
 *
 * mulberry32: one multiply-xorshift round on a 32-bit counter. It is ~10 lines, has no state
 * beyond that counter, and passes gjrand's basic suite at this scale. Nothing here needs
 * cryptographic quality — it needs to be the SAME nothing twice.
 */

/** A seeded [0, 1) generator. Deterministic for a given seed, forever. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  // A zero counter is a fixed point for the first round, so nudge it off zero.
  if (a === 0) a = 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The seed register. Every seeded field is listed HERE rather than inline, because the one
 * thing that must not happen is two fields sharing a seed: they would then generate the same
 * sequence, and a belt whose angles correlate with the dust's angles reads as an artefact
 * without ever looking like a bug. Arbitrary, distinct, and written down.
 */
export const SEED = {
  galaxy: 0x5eed_0001,
  heroStars: 0x5eed_0002,
  diveField: 0x5eed_0003,
  diveHeroes: 0x5eed_0007,
  foregroundDust: 0x5eed_0008,
  prominences: 0x5eed_0009,
  galaxyDetail: 0x5eed_000a,
  galaxyDetailHeroes: 0x5eed_000b,
  galaxyDetailDust: 0x5eed_000c,
  backgroundStars: 0x5eed_000d,
  asteroidBelt: 0x5eed_0004,
  zodiacalDust: 0x5eed_0005,
  moons: 0x5eed_0006,
} as const;
