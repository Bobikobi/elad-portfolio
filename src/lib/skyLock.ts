import { useRef } from 'react';
import type * as THREE from 'three';

/**
 * Make a slowly-drifting field read as SKY while a world is focused.
 *
 * In the overview the zodiacal dust and the asteroid belt turn gently, which is right: they are
 * a system seen whole, and a system that does not move is a diagram. In a world close-up the
 * same motion reads completely differently - the camera is metres from the planet, so the same
 * 0.01 rad/s sweeps the specks tens of pixels across the frame every second, and a field of
 * drifting specks around a planet is a dust cloud orbiting it, not a sky behind it.
 *
 * Two separate causes, found by measuring rather than by reading the code, and each needed its
 * own answer.
 *
 * ROTATION. Freezing the field's own spin is not enough, and that is why this is a helper
 * rather than two `if` statements: both fields are children of `solarRoot`, which turns at
 * 0.004 rad/s of its own, so zeroing the child leaves 40% of the dust's motion and 14% of the
 * belt's still running, inherited. The parent is cancelled by MEASURING its yaw and re-imposing
 * the world yaw captured at lock time, rather than by hardcoding 0.004 in two more files where
 * it would rot the first time the system's drift is retuned.
 *
 * PARALLAX is the other half, and it is NOT solved here - see ZodiacalDust, which fades the
 * near field out instead. A camera-translation lock was tried and removed: it has to capture
 * its offset from the lens at some instant, `focusedPlanet` flips before the camera has flown
 * to the world, and the field was therefore dragged along the entire approach - measured as
 * zero visible grains at /about and 27px of drift at /contact, both worse than doing nothing.
 * A skybox lock is the right tool for a field that is genuinely at infinity; this one is not.
 *
 * Assumes the only inherited rotation that CHANGES is the immediate parent's yaw, which is true
 * of this graph (`solarRoot` has a fixed X tilt and an animated Y). Anything else would need
 * the full world quaternion, a heavier tool than this graph needs.
 *
 * Continuous in both directions: on unlock the field resumes accumulating from wherever it
 * currently sits, so there is no snap either way.
 */
export function useSkyLock(rate: number) {
  const worldYaw = useRef<number | null>(null);
  return (obj: THREE.Object3D | null | undefined, dt: number, locked: boolean) => {
    if (!obj) return;
    if (!locked) {
      worldYaw.current = null;
      obj.rotation.y += dt * rate;
      return;
    }
    const parentYaw = obj.parent?.rotation.y ?? 0;
    worldYaw.current ??= obj.rotation.y + parentYaw;
    obj.rotation.y = worldYaw.current - parentYaw;
  };
}
