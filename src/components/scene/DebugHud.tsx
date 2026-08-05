'use client';
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useScene } from '@/lib/sceneStore';
import { planetPositions, planetRadii } from '@/lib/planetPositions';

/**
 * Debug HUD. Numbers are computed from the live camera projection + a framebuffer
 * readback — never guessed — and are the accepted source for camera-tuning measurements.
 *
 *   • sun disc height as % of viewport (perspective projection of SUN_R at its distance)
 *   • each labeled planet's on-screen DIAMETER in px
 *   • FPS (smoothed)
 *   • luminance % of the 4 viewport corners, sampled from the POST-processed framebuffer
 *
 * AVAILABILITY (see {@link HUD_AVAILABLE}): the HUD ships in every build EXCEPT the
 * production deployment, and only *shows* on `?hud=1` (always on in dev). This is
 * deliberate: a `next dev` build renders differently from a real prod build, so tuning
 * numbers taken in dev do not match the deployed site. The HUD must run against the
 * REAL prod render — a preview deploy, or a local `next build && next start` — so every
 * measurement reflects what visitors actually see.
 */

/**
 * True in every build except the production deployment. `NEXT_PUBLIC_VERCEL_ENV` is
 * inlined at build time (Vercel sets it to 'production' | 'preview'; it is undefined for
 * local `dev`/`build`), so on the production domain this collapses to a literal `false`
 * and the whole HUD tree — guarded by `HUD_AVAILABLE &&` at every render site — is
 * dead-code-eliminated from the shipped bundle. Everywhere else it is available.
 *
 * Requires Vercel's "Automatically expose System Environment Variables" (default ON).
 */
export const HUD_AVAILABLE = process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production';

/**
 * Runtime gate for actually rendering the HUD: on in dev (as before), or whenever the
 * page is opened with `?hud=1`. Returns a constant `false` when !HUD_AVAILABLE so the
 * production bundle never wires up the query listener.
 */
const hudSubscribe = () => () => {}; // dev mode and ?hud= cannot change while the page is open
const hudOff = () => false;
const hudOn = () => HUD_AVAILABLE && (process.env.NODE_ENV !== 'production' || new URLSearchParams(window.location.search).has('hud'));

export function useHudEnabled(): boolean {
  // The query string is not state — it is read-only, external, and fixed for the page's life.
  // As `useState` + effect it was the `set-state-in-effect` error, and the server snapshot of
  // `false` is exactly what the old initial value already was, so nothing about the rendered
  // output changes: the HUD still appears only after hydration.
  return useSyncExternalStore(hudSubscribe, hudOn, hudOff);
}

const DEG2RAD = Math.PI / 180;
const SUN_R = 1.5; // matches Sun.tsx SUN_R (world units)


export interface HudData {
  solar: boolean;
  sunPct: number; // sun disc height as % of viewport height
  sunPx: number;
  planets: { key: string; px: number }[]; // on-screen diameter in px
  fps: number;
  corners: [number, number, number, number]; // TL, TR, BL, BR luminance %
  vw: number;
  vh: number;
  fov: number;
  camDist: number; // camera distance to sun (overview) - handy while tuning
  pdb: boolean; // preserveDrawingBuffer actually enabled?
  center: number; // center-screen luminance (sampling sanity check)
  cov: number; // T1 swap mask coverage 0..1 (swap fires only >0.95)
  scroll: number; // dive scroll progress 0..1
}

export const hudData: HudData = {
  solar: false, sunPct: 0, sunPx: 0, planets: [], fps: 0,
  corners: [0, 0, 0, 0], vw: 0, vh: 0, fov: 0, camDist: 0, pdb: false, center: 0,
  cov: 0, scroll: 0,
};

/**
 * Verification handle. Same availability rule as the HUD — present on preview deploys and
 * local builds, dead-code-eliminated on the production bundle — so an automated pass can
 * read and drive the REAL scene state (act, coverage, quality tier, measured refresh rate,
 * the hovered decorative body) instead of inferring it from pixels.
 */
if (HUD_AVAILABLE && typeof window !== 'undefined') {
  (window as unknown as { __scene?: typeof useScene }).__scene = useScene;
  (window as unknown as { __hud?: HudData }).__hud = hudData;
}

/** Perspective on-screen size (fraction of viewport HEIGHT) of a sphere of world
 *  radius R whose centre is `dist` from the camera. Uses the same tan model as the
 *  R2 tuning aid: fraction = 2*atan(R/dist) / fovY. */
function heightFraction(R: number, dist: number, fovYrad: number): number {
  if (dist <= 0) return 0;
  return (2 * Math.atan(R / dist)) / fovYrad;
}

/** Side of the square block sampled at each corner, in device px. */
const CORNER_BLOCK = 10;

const _sun = new THREE.Vector3();
const _p = new THREE.Vector3();

/** Lives INSIDE the Canvas — reads camera + renderer each frame and fills `hudData`. */
export function HudProbe() {
  const gl = useThree((s) => s.gl);
  const lastRead = useRef(0);
  // The readback canvas is created once, in a memo rather than by lazily filling refs during
  // render — writing to a ref during render is the `refs` error, and there is nothing
  // ref-shaped about this: it is a derived value with no dependencies.
  const readback = useMemo(() => {
    const canvas = document.createElement('canvas');
    // Must match the sample block below. It was 4x4 while `sample` draws and reads a
    // 10x10 block, so 84 of every 100 pixels came back as out-of-canvas transparent
    // black and every corner reading was fiction.
    canvas.width = CORNER_BLOCK;
    canvas.height = CORNER_BLOCK;
    return { canvas, ctx: canvas.getContext('2d', { willReadFrequently: true }) };
  }, []);

  useFrame((state, dt) => {
    const cam = state.camera as THREE.PerspectiveCamera;
    const { act, sunMesh, coverage, scrollProgress } = useScene.getState();
    hudData.cov = coverage;
    hudData.scroll = scrollProgress;
    const solar = act === 'solar';
    const fovYrad = cam.fov * DEG2RAD;
    const vh = state.size.height;
    const vw = state.size.width;

    hudData.solar = solar;
    hudData.vw = vw;
    hudData.vh = vh;
    hudData.fov = cam.fov;
    hudData.fps = hudData.fps ? hudData.fps * 0.9 + (1 / Math.max(1e-3, dt)) * 0.1 : 1 / Math.max(1e-3, dt);

    if (solar) {
      if (sunMesh) sunMesh.getWorldPosition(_sun);
      else _sun.set(0, 0, 0);
      const sunDist = cam.position.distanceTo(_sun);
      const sunFrac = heightFraction(SUN_R, sunDist, fovYrad);
      hudData.sunPct = sunFrac * 100;
      hudData.sunPx = sunFrac * vh;
      hudData.camDist = sunDist;

      const planets: { key: string; px: number }[] = [];
      planetPositions.forEach((pos, key) => {
        const R = planetRadii.get(key) ?? 0;
        _p.copy(pos);
        const d = cam.position.distanceTo(_p);
        planets.push({ key, px: heightFraction(R, d, fovYrad) * vh });
      });
      planets.sort((a, b) => a.key.localeCompare(b.key));
      hudData.planets = planets;
    } else {
      hudData.sunPct = 0;
      hudData.sunPx = 0;
      hudData.planets = [];
    }

    // Corner luminance from the POST-processed framebuffer (captures bloom/vignette/etc.).
    // Throttled to ~5Hz — readPixels is a GPU stall. Reads the previous frame (priority 0
    // useFrame runs before R3F's auto-render), which is invisible for a diagnostic.
    const now = performance.now();
    if (now - lastRead.current > 200 && readback.ctx) {
      lastRead.current = now;
      try {
        const src = gl.domElement; // WebGL canvas (post-processed; needs preserveDrawingBuffer)
        const attrs = (gl.getContext() as WebGLRenderingContext).getContextAttributes();
        hudData.pdb = !!attrs?.preserveDrawingBuffer;
        const W = src.width, H = src.height; // device px, top-left origin for drawImage
        // Sample the corner REGION (a small block inset ~3% from the edge), not the single
        // outermost pixel which the strong vignette crushes to pure black.
        const s = CORNER_BLOCK, m = Math.round(Math.min(W, H) * 0.03);
        const sample = (x: number, y: number) => {
          readback.ctx!.clearRect(0, 0, s, s);
          readback.ctx!.drawImage(src, x, y, s, s, 0, 0, s, s);
          const data = readback.ctx!.getImageData(0, 0, s, s).data;
          let lum = 0;
          for (let i = 0; i < s * s; i++) {
            lum += (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;
          }
          return (lum / (s * s)) * 100;
        };
        hudData.corners = [
          sample(m, m),                 // TL
          sample(W - m - s, m),         // TR
          sample(m, H - m - s),         // BL
          sample(W - m - s, H - m - s), // BR
        ];
        hudData.center = sample((W - s) / 2, (H - s) / 2);
      } catch {
        /* draw/read unsupported — leave previous values */
      }
    }
  });

  return null;
}

/** Lives OUTSIDE the Canvas (DOM overlay). Own rAF loop → no per-frame React churn. */
export function DebugHudOverlay() {
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    let raf = 0;
    const fmt = (n: number, d = 1) => n.toFixed(d);
    const tick = () => {
      const el = ref.current;
      if (el) {
        const d = hudData;
        const c = d.corners;
        const cornerFlag = (v: number) => (v < 10 ? '' : ' ⚠');
        const planetLines = d.planets.length
          ? d.planets.map((p) => `  ${p.key.padEnd(8)} ${fmt(p.px, 0).padStart(5)} px (${fmt((p.px / d.vh) * 100, 1)}%)`).join('\n')
          : '  -';
        el.textContent =
          `HUD ${d.solar ? 'SOLAR' : 'galaxy'}  ${fmt(d.fps, 0)} fps  fov ${fmt(d.fov, 1)}°  ${d.vw}×${d.vh}\n` +
          `swap  scroll ${fmt(d.scroll, 3)}  cov ${fmt(d.cov, 3)}${d.cov > 0.95 ? ' [SWAP-OK]' : ''}\n` +
          `sun disc  ${fmt(d.sunPct, 1)}% h   (${fmt(d.sunPx, 0)} px)  camDist ${fmt(d.camDist, 2)}\n` +
          `planets (diameter):\n${planetLines}\n` +
          `corners %lum  TL ${fmt(c[0], 1)}${cornerFlag(c[0])}  TR ${fmt(c[1], 1)}${cornerFlag(c[1])}\n` +
          `              BL ${fmt(c[2], 1)}${cornerFlag(c[2])}  BR ${fmt(c[3], 1)}${cornerFlag(c[3])}\n` +
          `  [pdb ${d.pdb ? 'on' : 'OFF'}  center ${fmt(d.center, 1)}%]`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <pre
      ref={ref}
      data-debug-hud
      className="pointer-events-none fixed left-2 top-16 z-[9998] m-0 whitespace-pre rounded-md border border-white/15 bg-black/70 px-3 py-2 font-mono text-[11px] leading-[1.45] text-[#7CFCB0]"
      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
      aria-hidden="true"
    />
  );
}
