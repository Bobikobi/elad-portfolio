/**
 * The passage's one clock (#82). The played passage drives the scroll; the camera reads the
 * scroll. Before this file each side shaped the motion on its own - the player eased each leg
 * to a stop, the dive finished its path at scroll 0.865 and the arrival eased in from rest -
 * so the camera parked for 0.4s in front of the curtain and crept for a second after it.
 *
 * Here the scroll is a plain piecewise-LINEAR function of time, and the camera's progress is
 * shaped in TIME on top of it: the dive accelerates all the way into the curtain and the
 * arrival leaves it at speed and brakes only as it lands. Both directions use the same
 * mapping, so the return trip is the forward one played backwards (it accelerates out of the
 * overview and brakes into the galaxy at rest). A hand-scrolled driver gets the same path.
 */
import { SWAP_V, COVER_PLATEAU, COVER_FALLOFF } from './diveEnvelope';

/** Scroll where the curtain starts to rise, and where it has fully lifted again. */
const COVER_IN = SWAP_V - COVER_PLATEAU - COVER_FALLOFF;
const COVER_OUT = SWAP_V + COVER_PLATEAU + COVER_FALLOFF;
/** Scroll below which the galaxy is at rest (the welcome idle). */
export const DIVE_START = 0.015;

/** Time (ms) spent on each scroll segment: the dive, the curtain, the arrival. */
const DIVE_MS = 1200;
const TUNNEL_MS = 500;
const ARRIVE_MS = 900;
export const PASSAGE_MS = DIVE_MS + TUNNEL_MS + ARRIVE_MS;

/** Scroll position at passage time `ms` (0..PASSAGE_MS). */
export function scrollAt(ms: number): number {
  if (ms <= 0) return 0;
  if (ms < DIVE_MS) return (COVER_IN * ms) / DIVE_MS;
  if (ms < DIVE_MS + TUNNEL_MS) return COVER_IN + ((COVER_OUT - COVER_IN) * (ms - DIVE_MS)) / TUNNEL_MS;
  if (ms < PASSAGE_MS) return COVER_OUT + ((1 - COVER_OUT) * (ms - DIVE_MS - TUNNEL_MS)) / ARRIVE_MS;
  return 1;
}

/** Passage time (ms) at scroll `p` - the inverse of {@link scrollAt}. */
export function timeAt(p: number): number {
  if (p <= 0) return 0;
  if (p < COVER_IN) return (DIVE_MS * p) / COVER_IN;
  if (p < COVER_OUT) return DIVE_MS + (TUNNEL_MS * (p - COVER_IN)) / (COVER_OUT - COVER_IN);
  if (p < 1) return DIVE_MS + TUNNEL_MS + (ARRIVE_MS * (p - COVER_OUT)) / (1 - COVER_OUT);
  return PASSAGE_MS;
}

const T_START = timeAt(DIVE_START);
const T_SWAP = timeAt(SWAP_V);
/** The arrival starts where the curtain is 60% shut on its way open, not at the swap. */
const T_ARRIVE = timeAt(SWAP_V + COVER_PLATEAU + 0.4 * COVER_FALLOFF);

/**
 * Dive progress (0..1 along the dive path) at scroll `p`. Ease-IN only: it leaves the rest
 * pose at a third of its mean speed and is still accelerating when the curtain closes, at
 * 1.65x the mean. A pure quadratic would start from a dead stop; the linear share is what the
 * short hand-off damp in the camera rig hides.
 */
export function diveAt(p: number): number {
  const x = Math.min(1, Math.max(0, (timeAt(p) - T_START) / (T_SWAP - T_START)));
  return 0.35 * x + 0.65 * x * x;
}

/**
 * Arrival progress (0..1 along the line from the entry pose to the overview) at scroll `p`.
 * `ratio` is the overview's distance from the sun over the entry pose's.
 *
 * Ease-OUT only: it leaves the curtain at speed and brakes to rest exactly at the end. Started
 * at the swap, a third of the move ran behind the shut curtain and the visible part began at a
 * third of the dive's peak speed (desktop, measured on the preview); so the camera waits at the
 * entry pose until the curtain is mostly open.
 *
 * The distance shrinks geometrically, so the apparent speed follows the ease on every screen.
 * Moved linearly, the phone's 7.5x zoom (desktop's is 2x) sped up halfway through the arrival
 * and peaked there at twice the dive's speed. The ease power then sets the opening speed,
 * power x |ln ratio| per arrival: held near 2.3, the pace the dive enters the curtain at, and
 * never below a quadratic, the gentlest braking that still lands without a jolt (desktop
 * gets a cubic, the phone a quadratic).
 */
export function arriveAt(p: number, ratio = 1): number {
  const x = Math.min(1, Math.max(0, (timeAt(p) - T_ARRIVE) / (PASSAGE_MS - T_ARRIVE)));
  const zoom = Math.abs(Math.log(ratio));
  const a = 1 - (1 - x) ** Math.min(3, Math.max(2, 2.3 / Math.max(zoom, 1e-3)));
  return zoom < 1e-3 ? a : (1 - ratio ** a) / (1 - ratio);
}
