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
