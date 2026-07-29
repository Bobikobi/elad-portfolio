'use client';
import { useSyncExternalStore } from 'react';

/**
 * True when the browser can create a WebGL context. SSR-safe: assumes available on the
 * server, then reports the real answer on the client — so no-WebGL visitors fall back
 * cleanly.
 *
 * This used to be `useState(true)` plus a `setState` in an effect, which is the
 * `set-state-in-effect` error and, more to the point, a wasted render on every single
 * visitor: the effect fired and re-rendered the whole scene subtree even when the answer was
 * the same `true` it started with.
 *
 * `useSyncExternalStore` is the right shape for this, because the thing being read is not
 * state at all — it is an unchanging fact about the browser. The store never emits (WebGL
 * support cannot change mid-session), so `subscribe` is a no-op, and the two snapshot
 * functions say exactly what the server and the client each know.
 */

/** Never fires — the answer cannot change while the page is open. */
const subscribe = () => () => {};

/** Probed at most once per page: creating a throwaway GL context is not free. */
let probed: boolean | null = null;
function clientSnapshot(): boolean {
  if (probed === null) {
    try {
      const c = document.createElement('canvas');
      probed = !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      probed = false;
    }
  }
  return probed;
}

const serverSnapshot = () => true;

export function useWebGLAvailable(): boolean {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
