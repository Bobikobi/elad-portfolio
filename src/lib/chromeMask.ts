import * as THREE from 'three';

/**
 * Screen-space "chrome mask" — the rectangles of DOM chrome (the navbar, a world panel,
 * the projects column) that scene debris must never crawl behind.
 *
 * A rock drifting under a semi-transparent glass panel or across the navbar reads as dirt
 * on the lens, not as a solar system, and no amount of world-space tuning fixes it: the
 * offending rocks are perfectly legal in 3D and only collide in the projection. So the cut
 * is made where the problem is — in screen space, in the fragment shader, with a soft
 * feather so nothing pops at a boundary.
 *
 * Rects are published in DRAWING-BUFFER pixels with y measured from the BOTTOM, i.e. the
 * exact space of `gl_FragCoord.xy`, so a shader compares against them with no conversion.
 * Any element that wants to be respected just carries `data-chrome`.
 */

export const CHROME_MAX = 4;
/** Soft edge, in drawing-buffer px, around each rect. */
export const CHROME_FEATHER = 26;

export const chromeRects = {
  value: Array.from({ length: CHROME_MAX }, () => new THREE.Vector4(0, 0, 0, 0)),
};
export const chromeCount = { value: 0 };

const _size = new THREE.Vector2();
let tick = 0;

/**
 * Re-measure the chrome. The panels are `position: fixed` and only move on resize or a
 * route change, so this samples every {@link EVERY} frames rather than every frame — four
 * `getBoundingClientRect` calls at 5Hz is free, and it needs no observers to stay correct.
 */
const EVERY = 12;

export function updateChromeRects(gl: THREE.WebGLRenderer, force = false) {
  if (!force && tick++ % EVERY !== 0) return;
  if (typeof document === 'undefined') return;
  const canvas = gl.domElement;
  const cw = canvas.clientWidth || 1;
  const ch = canvas.clientHeight || 1;
  gl.getDrawingBufferSize(_size);
  const sx = _size.x / cw;
  const sy = _size.y / ch;

  const els = document.querySelectorAll<HTMLElement>('[data-chrome]');
  let n = 0;
  for (const el of els) {
    if (n >= CHROME_MAX) break;
    const b = el.getBoundingClientRect();
    if (b.width < 4 || b.height < 4) continue;
    // css-top-down rect → drawing-buffer bottom-up rect
    chromeRects.value[n].set(b.left * sx, (ch - b.bottom) * sy, b.right * sx, (ch - b.top) * sy);
    n++;
  }
  chromeCount.value = n;
}

/**
 * GLSL companion. Declares the uniforms and `chromeKeep(vec2 fragCoord)` → 0 inside a
 * chrome rect, 1 well outside it, smooth across {@link CHROME_FEATHER} px.
 */
export const chromeMaskGLSL = /* glsl */ `
uniform vec4 uChrome[${CHROME_MAX}];
uniform int uChromeN;
float chromeKeep(vec2 frag) {
  float keep = 1.0;
  for (int i = 0; i < ${CHROME_MAX}; i++) {
    if (i >= uChromeN) break;
    vec4 r = uChrome[i];
    vec2 d = max(r.xy - frag, frag - r.zw);
    float outside = length(max(d, vec2(0.0)));
    keep = min(keep, smoothstep(0.0, ${CHROME_FEATHER.toFixed(1)}, outside));
  }
  return keep;
}
`;

/** The same function in JS, for the verification probes (identical inputs → identical answer). */
export function chromeKeep(x: number, y: number) {
  let keep = 1;
  for (let i = 0; i < chromeCount.value; i++) {
    const r = chromeRects.value[i];
    const dx = Math.max(r.x - x, x - r.z, 0);
    const dy = Math.max(r.y - y, y - r.w, 0);
    const outside = Math.hypot(dx, dy);
    const t = Math.min(1, Math.max(0, outside / CHROME_FEATHER));
    keep = Math.min(keep, t * t * (3 - 2 * t));
  }
  return keep;
}
