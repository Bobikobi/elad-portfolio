'use client';
import { useEffect, useRef, useState } from 'react';
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
export function useHudEnabled(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!HUD_AVAILABLE) return;
    const dev = process.env.NODE_ENV !== 'production';
    const hudQuery = new URLSearchParams(window.location.search).has('hud');
    setOn(dev || hudQuery);
  }, []);
  return on;
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
  camDist: number; // camera distance to sun (overview) — handy while tuning
  pdb: boolean; // preserveDrawingBuffer actually enabled?
  center: number; // center-screen luminance (sampling sanity check)
}

export const hudData: HudData = {
  solar: false, sunPct: 0, sunPx: 0, planets: [], fps: 0,
  corners: [0, 0, 0, 0], vw: 0, vh: 0, fov: 0, camDist: 0, pdb: false, center: 0,
};

/** Perspective on-screen size (fraction of viewport HEIGHT) of a sphere of world
 *  radius R whose centre is `dist` from the camera. Uses the same tan model as the
 *  R2 tuning aid: fraction = 2*atan(R/dist) / fovY. */
function heightFraction(R: number, dist: number, fovYrad: number): number {
  if (dist <= 0) return 0;
  return (2 * Math.atan(R / dist)) / fovYrad;
}

const _sun = new THREE.Vector3();
const _p = new THREE.Vector3();

/** Lives INSIDE the Canvas — reads camera + renderer each frame and fills `hudData`. */
export function HudProbe() {
  const gl = useThree((s) => s.gl);
  const lastRead = useRef(0);
  const c2 = useRef<HTMLCanvasElement | null>(null);
  const ctx2 = useRef<CanvasRenderingContext2D | null>(null);
  if (!c2.current) {
    c2.current = document.createElement('canvas');
    c2.current.width = 4;
    c2.current.height = 4;
    ctx2.current = c2.current.getContext('2d', { willReadFrequently: true });
  }

  useFrame((state, dt) => {
    const cam = state.camera as THREE.PerspectiveCamera;
    const { act, sunMesh } = useScene.getState();
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
    if (now - lastRead.current > 200 && ctx2.current) {
      lastRead.current = now;
      try {
        const src = gl.domElement; // WebGL canvas (post-processed; needs preserveDrawingBuffer)
        const attrs = (gl.getContext() as WebGLRenderingContext).getContextAttributes();
        hudData.pdb = !!attrs?.preserveDrawingBuffer;
        const W = src.width, H = src.height; // device px, top-left origin for drawImage
        // Sample the corner REGION (a small block inset ~3% from the edge), not the single
        // outermost pixel which the strong vignette crushes to pure black.
        const s = 10, m = Math.round(Math.min(W, H) * 0.03);
        const sample = (x: number, y: number) => {
          ctx2.current!.clearRect(0, 0, s, s);
          ctx2.current!.drawImage(src, x, y, s, s, 0, 0, s, s);
          const data = ctx2.current!.getImageData(0, 0, s, s).data;
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
          : '  —';
        el.textContent =
          `HUD ${d.solar ? 'SOLAR' : 'galaxy'}  ${fmt(d.fps, 0)} fps  fov ${fmt(d.fov, 1)}°  ${d.vw}×${d.vh}\n` +
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
