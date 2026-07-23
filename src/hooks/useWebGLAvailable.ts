'use client';
import { useEffect, useState } from 'react';

/**
 * True when the browser can create a WebGL context. SSR-safe: assumes available
 * until mounted, then verifies once — so no-WebGL visitors fall back cleanly.
 */
export function useWebGLAvailable(): boolean {
  const [ok, setOk] = useState(true);
  useEffect(() => {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      setOk(!!gl);
    } catch {
      setOk(false);
    }
  }, []);
  return ok;
}
