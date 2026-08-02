import { useRef } from 'react';
import * as THREE from 'three';

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
 * PARALLAX. With rotation dead the specks still crossed 14px per 1.2s, because the camera
 * tracks an orbiting planet and the visible grains are only 2.5-15 units away - near enough
 * that a camera translation of 0.08 units swings them noticeably. No dissolve threshold fixes
 * that: the farthest visible grain is 15 units out, so pushing the near-fade far enough to kill
 * the parallax also kills the field. What actually makes something read as distant is having no
 * parallax at all, so while locked the field TRANSLATES with the camera - its offset from the
 * lens is held constant, exactly as a skybox behaves. Grain distances then stay fixed too, so
 * the shader's own near-dissolve stops flickering as a bonus.
 *
 * `followCamera` is opt-in per field. The zodiacal dust takes it: it is diffuse scattered light
 * with no fixed identity, and nobody can say where a given grain "should" be. The asteroid belt
 * does NOT: it contains real rock meshes at real places, and sliding those with the lens would
 * be wrong wherever the belt is actually part of the composition.
 *
 * Assumes the only inherited rotation that CHANGES is the immediate parent's yaw, which is true
 * of this graph (`solarRoot` has a fixed X tilt and an animated Y). Anything else would need
 * the full world quaternion, a heavier tool than this graph needs.
 *
 * Release is eased, not snapped: leaving a world damps the field back to where it belongs over
 * RELEASE_S, so the overview never opens on a cloud jumping back into place.
 */
const RELEASE_S = 0.8;

const _want = new THREE.Vector3();
const _world = new THREE.Vector3();

export function useSkyLock(rate: number, opts: { followCamera?: boolean } = {}) {
  const worldYaw = useRef<number | null>(null);
  const offset = useRef<THREE.Vector3 | null>(null);
  const home = useRef<THREE.Vector3 | null>(null);

  return (obj: THREE.Object3D | null | undefined, dt: number, locked: boolean, camera?: THREE.Camera) => {
    if (!obj) return;

    if (!locked) {
      worldYaw.current = null;
      offset.current = null;
      obj.rotation.y += dt * rate;
      // Ease back to the field's own place. `home` is null unless it was ever moved, so a field
      // that never locked pays nothing for this.
      if (home.current) {
        const k = Math.min(1, dt / RELEASE_S);
        obj.position.lerp(home.current, k);
        if (obj.position.distanceToSquared(home.current) < 1e-6) {
          obj.position.copy(home.current);
          home.current = null;
        }
      }
      return;
    }

    const parentYaw = obj.parent?.rotation.y ?? 0;
    worldYaw.current ??= obj.rotation.y + parentYaw;
    obj.rotation.y = worldYaw.current - parentYaw;

    if (!opts.followCamera || !camera) return;
    home.current ??= obj.position.clone();
    obj.updateWorldMatrix(true, false);
    _world.setFromMatrixPosition(obj.matrixWorld);
    offset.current ??= _world.clone().sub(camera.position);
    _want.copy(camera.position).add(offset.current);
    // The offset is a WORLD vector; the position we assign is in the parent's space.
    obj.parent?.worldToLocal(_want);
    obj.position.copy(_want);
  };
}
