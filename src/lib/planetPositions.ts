import * as THREE from 'three';

/**
 * Live world positions of the page-planets, updated each frame by the Planet
 * component and read by CameraRig to fly to / orbit a moving target. A plain
 * mutable map — no React re-renders.
 */
export const planetPositions = new Map<string, THREE.Vector3>();

/** Live radius of each page-planet, so CameraRig can frame it as a size-aware hero
 *  (distance ∝ radius → every planet fills the same share of the frame). */
export const planetRadii = new Map<string, number>();

/**
 * Live world-space NORMAL of a ringed planet's ring plane, published by the body that owns
 * the rings so the camera never has to guess at it.
 *
 * The camera needs this because "the rings are open" is an angle between the sightline and
 * this plane, and it was previously left to chance: the vantage swung the camera right
 * through every angle to it as the body orbited, so the rings measured 0.4° (edge-on and
 * invisible) at some longitudes and 73° (face-on, a target rather than a planet) at others.
 * Deriving it in the rig instead would mean hard-coding the ring mesh's local rotation in a
 * second file — exactly the kind of duplicated constant that goes stale silently.
 */
export const planetRingNormal = new Map<string, THREE.Vector3>();

/**
 * B14 — where the belt pill hangs during the mobile tour's belt stop, in world space.
 * The belt has no body to anchor to, so the anchor used to be a hard-coded point that was
 * only correct for the pose that stop happened to use; when the stop learned to ride the
 * band, the pill stayed behind over the sun. CameraRig now writes the ring point the tour
 * camera is actually aimed at, each frame, and the label driver reads it — one owner for
 * the pose, one number for the label.
 */
export const beltTourAnchor = new THREE.Vector3(1.4, 0.9, 0);

/** Page-planet mapping: which planet is which section, and its DOM label + anchor. */
export interface PlanetPage {
  labelKey: string; // i18n nav key
  href: string; // existing section anchor / route
}
export const PLANET_PAGES: Record<string, PlanetPage> = {
  saturn: { labelKey: 'nav.projects', href: '#projects' },
  jupiter: { labelKey: 'nav.services', href: '#services' },
  earth: { labelKey: 'nav.about', href: '#about' },
  mars: { labelKey: 'nav.contact', href: '#contact' },
};
