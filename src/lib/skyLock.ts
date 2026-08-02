import { useRef } from 'react';
import type * as THREE from 'three';

/**
 * Hold a slowly-spinning field STILL relative to the sky while a world is focused.
 *
 * In the overview the zodiacal dust and the asteroid belt turn gently, which is right: they
 * are a system seen whole, and a system that does not move is a diagram. In a world close-up
 * the same motion reads completely differently — the camera is metres from the planet, so the
 * same 0.01 rad/s sweeps the specks tens of pixels across the frame every second, and a field
 * of drifting specks around a planet is a dust cloud orbiting it, not a sky behind it.
 * Measured on the alias at /about: one dust grain crossed 32.6px in 1.3 seconds.
 *
 * Freezing the field's OWN spin is not enough, and that is the whole reason this helper
 * exists. Both fields are children of `solarRoot`, which turns at 0.004 rad/s of its own, so
 * zeroing the child leaves 40% of the dust's motion and 14% of the belt's still running,
 * inherited. The fix has to cancel the parent, not just stop the child.
 *
 * It cancels it by MEASURING it rather than by knowing its rate: the world yaw is captured at
 * the moment of locking and then re-imposed every frame as `frozen - parentYaw`. Hardcoding
 * 0.004 in two more files would work today and would silently rot the first time anyone
 * retunes the system's drift.
 *
 * Assumes the only inherited rotation that CHANGES is the immediate parent's yaw, which is
 * true of this graph (`solarRoot` has a fixed X tilt and an animated Y). Anything else would
 * need the full world quaternion, which is a heavier tool than this graph needs.
 *
 * Continuous in both directions: on unlock the field simply resumes accumulating from
 * wherever it currently sits, so there is no snap either way.
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
