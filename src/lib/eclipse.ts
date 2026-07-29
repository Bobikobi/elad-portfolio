import * as THREE from 'three';
import { planetPositions, planetRadii } from './planetPositions';

/**
 * Inter-planet eclipses — analytic, per frame, essentially free.
 *
 * The sun is a POINT light at the origin, so a planet's shadow is a cone that GROWS with
 * distance: an occluder of radius rA at |a| casts a shadow of radius rA·L/|a| at distance
 * L. That single fact is the whole test. For a body B we ask which other body A lies
 * between it and the star, and how far A's centre sits from the sun→B line compared with
 * the shadow radius out at B. It costs one dot product and one length per pair, 56 pairs,
 * and it is exact rather than scripted — the alignments are whatever the orbits actually
 * produce, which is why they are rare and worth watching for.
 *
 * The result is not "dim the planet". The occluder's position and radius go to the
 * planet's own shader, which recomputes the same cone PER FRAGMENT and gets a real curved
 * penumbra sweeping across the sphere.
 */

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
    _a.copy(a);
    const distA = _a.length();
    if (distA >= distB) return; // an occluder has to be nearer the star than its target

    // Where A's centre projects onto the sun→B ray, as a fraction of the way out to B.
    const t = _a.dot(pos) / (distB * distB);
    if (t <= 0.02 || t >= 0.99) return;

    _perp.copy(pos).multiplyScalar(t).sub(_a);
    const perp = _perp.length(); // A's centre off the sun→B line
    const shadowR = rA * (distB / distA); // the cone at B's distance
    if (perp > shadowR + radius * 1.5) return;

    const strength = 1 - smooth(shadowR * 0.85, shadowR + radius * 1.3, perp);
    if (strength <= 0.002) return;
    if (!best || strength > best.strength) best = { occ: a, occR: rA, strength };
  });

  return best;
}
