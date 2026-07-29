import * as THREE from 'three';
import { planetPositions, planetRadii } from './planetPositions';

/**
 * Inter-planet eclipses — analytic, per frame, essentially free.
 *
 * A note on the model, because the obvious one is wrong here. Treating the sun as a POINT
 * source makes a shadow cone that GROWS with distance (radius rA·L/|a|), and in a system
 * this compressed that turns every rough alignment into a total eclipse: Mercury, radius
 * 0.16, would throw a 0.52-unit shadow out at Jupiter's orbit and black out a 0.64-unit
 * planet. Measured on the alias, Neptune sat at strength 1.0 in the resting frame — a
 * permanently dark planet.
 *
 * The physically exact model is worse for the opposite reason. This sun has radius 1.5
 * while Mercury orbits at 1.95, so the true umbra behind Mercury is 0.23 units long and
 * ends long before it reaches anything. Honest geometry here means no planet can ever
 * eclipse another, at all.
 *
 * So the model is the parallel-ray one in between: the shadow is a CYLINDER of the
 * occluder's own radius, and an occluder must be a decent fraction of its target's size
 * to count. That keeps the effect tied to real positions — the alignments are whatever
 * the orbits produce, never scripted — while making it rare and partial, which is what a
 * shadow sweeping a disc should be.
 *
 * The result is not "dim the planet". The occluder's position and radius go to the
 * planet's own shader, which recomputes the same geometry PER FRAGMENT and gets a real
 * curved penumbra sweeping across the sphere.
 */

/** An occluder smaller than this fraction of its target casts nothing worth drawing. */
const MIN_SIZE_RATIO = 0.45;
/** How dark the deepest point of a shadow gets. Not zero: this is a partial eclipse. */
export const ECLIPSE_FLOOR = 0.3;

export interface EclipseHit {
  /** World position of the occluding body (the sun is at the origin). */
  occ: THREE.Vector3;
  /** Radius of the occluding body. */
  occR: number;
  /** 0 = clear, 1 = the shadow cone is centred on this body. */
  strength: number;
}

const _a = new THREE.Vector3();
const _perp = new THREE.Vector3();

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/**
 * Strongest occluder of `key` right now, or null. `pos`/`radius` are the body's own live
 * world position and radius (the caller has them; re-reading the map would be a frame
 * behind for itself).
 */
export function eclipseFor(key: string, pos: THREE.Vector3, radius: number): EclipseHit | null {
  const distB = pos.length();
  if (distB < 1e-3) return null;
  let best: EclipseHit | null = null;

  planetPositions.forEach((a, other) => {
    if (other === key) return;
    const rA = planetRadii.get(other);
    if (!rA) return;
    if (rA < radius * MIN_SIZE_RATIO) return; // too small to matter at this scale
    _a.copy(a);
    const distA = _a.length();
    if (distA >= distB) return; // an occluder has to be nearer the star than its target

    // Where A's centre projects onto the sun→B ray, as a fraction of the way out to B.
    const t = _a.dot(pos) / (distB * distB);
    if (t <= 0.02 || t >= 0.99) return;

    _perp.copy(pos).multiplyScalar(t).sub(_a);
    const perp = _perp.length(); // A's centre off the sun→B line
    const shadowR = rA; // parallel rays: the shadow keeps the occluder's own width
    if (perp > shadowR + radius) return;

    const strength = 1 - smooth(shadowR * 0.5, shadowR + radius * 0.9, perp);
    if (strength <= 0.002) return;
    if (!best || strength > best.strength) best = { occ: a, occR: rA, strength };
  });

  return best;
}
