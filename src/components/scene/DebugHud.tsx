'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react';
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
  // SUN-2. Where the disc actually IS, in CSS px from the top-left. Finding the sun by
  // thresholding a screenshot picks up the bloom skirt and the nearby planets with it: the
  // first attempt reported a radius 33% too large and an edge that "varied" by 23%. The
  // camera knows exactly where the sphere projects to; the screenshot does not.
  sunX: number;
  sunY: number;
  // SUN-2 tier law: the extra noise octaves are shader maths and must not change what the
  // renderer DOES per frame.
  calls: number;
  tris: number;
  planets: { key: string; px: number; x: number; y: number }[]; // diameter + centre, in CSS px
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
  solar: false, sunPct: 0, sunPx: 0, sunX: 0, sunY: 0, calls: 0, tris: 0, planets: [], fps: 0,
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
const _pp = new THREE.Vector3();

export interface ClockFreezeState {
  frozen: boolean;
  fixedStep: boolean;
  frame: number;
  elapsedTime: number;
}

export interface ClockFreezeHandle {
  readonly frame: number;
  freeze: () => Promise<ClockFreezeState>;
  unfreeze: () => Promise<ClockFreezeState>;
  waitForFrame: (frame: number) => Promise<ClockFreezeState>;
  state: () => ClockFreezeState;
}

type PendingClockBarrier = {
  ready: (control: ClockControl) => boolean;
  resolve: (state: ClockFreezeState) => void;
};

type ClockControl = {
  clock: THREE.Clock;
  fixedStep: boolean;
  frozen: boolean;
  frozenAt: number;
  frame: number;
  fixedElapsed: number;
  pending: PendingClockBarrier[];
  originalGetDelta: THREE.Clock['getDelta'];
  originalGetDeltaDescriptor: PropertyDescriptor | undefined;
  wrappedGetDelta: THREE.Clock['getDelta'];
};

const FIXED_DELTA = 1 / 60;
const clockControls = new WeakMap<THREE.Clock, ClockControl>();

function getClockControl(clock: THREE.Clock): ClockControl {
  const existing = clockControls.get(clock);
  if (existing) return existing;

  const control = {} as ClockControl;
  control.clock = clock;
  control.fixedStep = false;
  control.frozen = false;
  control.frozenAt = 0;
  control.frame = 0;
  control.fixedElapsed = 0;
  control.pending = [];
  control.originalGetDelta = clock.getDelta;
  control.originalGetDeltaDescriptor = Object.getOwnPropertyDescriptor(clock, 'getDelta');
  control.wrappedGetDelta = () => {
    if (control.frozen) {
      // FramePacer can change R3F's frameloop while the page becomes idle, and R3F resets
      // its clock while doing so. Reasserting the captured value here keeps even that frame
      // at the promised phase; this remains the single pre-subscriber intervention point.
      clock.elapsedTime = control.frozenAt;
      return 0;
    }
    if (control.fixedStep) {
      // Derive this value from completed scene steps instead of adding to the Clock's
      // current value. Fiber's setFrameloop() resets elapsedTime and Clock.stop() calls
      // getDelta outside a rendered frame; neither event may create or erase a step.
      clock.elapsedTime = control.fixedElapsed + FIXED_DELTA;
      return FIXED_DELTA;
    }
    return control.originalGetDelta.call(clock);
  };
  clockControls.set(clock, control);
  return control;
}

function installWrappedGetDelta(control: ClockControl) {
  control.clock.getDelta = control.wrappedGetDelta;
}

function restoreGetDelta(control: ClockControl) {
  const { clock } = control;
  if (clock.getDelta !== control.wrappedGetDelta) return;
  if (control.originalGetDeltaDescriptor) {
    Object.defineProperty(clock, 'getDelta', control.originalGetDeltaDescriptor);
  } else {
    // `getDelta` normally comes from Clock.prototype. Deleting our temporary own
    // property restores that original shape as well as the original implementation.
    Reflect.deleteProperty(clock, 'getDelta');
  }
}

function clockSnapshot(control: ClockControl): ClockFreezeState {
  return {
    frozen: control.frozen,
    fixedStep: control.fixedStep,
    frame: control.frame,
    elapsedTime: control.frozen
      ? control.frozenAt
      : control.fixedStep
        ? control.fixedElapsed
        : control.clock.elapsedTime,
  };
}

/**
 * Arms `?fixedStep=1` before R3F can render its first frame. This is called from Canvas's
 * synchronous `onCreated`, not from the probe's effect: Fiber 9.6.1's installed Provider
 * marks the root active and invokes `onCreated` in the same layout-effect task, while its
 * frame loop samples `clock.getDelta()` later, at the top of `update()`. The browser cannot
 * run that rAF callback in the middle of this task, so frame one necessarily reaches this
 * wrapper. The probe's frame subscriber then records that delivered step before the render
 * barrier resolves, so the public count describes completed scene frames rather than raw
 * requestAnimationFrame callbacks.
 *
 * With the parameter absent this deliberately does nothing: the original Clock method,
 * elapsed time, and first wall-clock delta retain their existing behaviour. The availability
 * check is repeated here as a side-effect boundary so an accidental future call cannot read
 * the URL or patch a production clock.
 */
export function installFixedStepClock(clock: THREE.Clock) {
  if (!HUD_AVAILABLE || typeof window === 'undefined') return;
  if (!new URLSearchParams(window.location.search).has('fixedStep')) return;

  const control = getClockControl(clock);
  control.fixedStep = true;
  control.frame = 0;
  control.fixedElapsed = 0;
  clock.elapsedTime = 0;
  installWrappedGetDelta(control);
}

/**
 * Lives INSIDE the Canvas and installs the debug harness's clock seam. This is deliberately
 * separate from {@link HudProbe}: the numbers overlay is opt-in on preview builds, but a
 * screenshot harness must be able to freeze any HUD-capable page without also painting the
 * overlay into the image.
 *
 * The installed @react-three/fiber 9.6.1 frame loop calls `state.clock.getDelta()` exactly
 * once at the start of `update()`, before it visits any `useFrame` subscriber. The installed
 * three.js `Clock.getDelta()` both returns that frame's delta AND advances `elapsedTime`.
 * Wrapping that one method therefore reaches both animation laws in the scene: accumulators
 * receive either zero or exactly 1/60, while shaders and transforms reading
 * `state.clock.elapsedTime` see the matching pinned or frame-derived value. Freezing or
 * stepping individual callbacks would miss one law or the other and would inevitably drift
 * as new animated components were added.
 *
 * Resume resets only `oldTime`, the wall-clock sampling cursor used by Three's next delta.
 * Without that resync, the first live frame would include the whole measurement pause as one
 * enormous delta; restarting the Clock instead would reset `elapsedTime` and re-phase every
 * elapsed-time shader. Keeping the accumulated time and moving only the cursor gives the next
 * frame its ordinary post-resume delta, so OFF is indistinguishable from a normal pause.
 */
export function ClockFreezeProbe() {
  const get = useThree((s) => s.get);
  const control = useRef<ClockControl | null>(null);

  // This layout effect runs as part of the R3F scene commit, before Provider's onCreated
  // activates the root. It gives the frame subscriber its control for frame one; onCreated
  // then arms that same WeakMap entry before the browser can enter the first rAF update.
  useLayoutEffect(() => {
    if (!HUD_AVAILABLE) return;
    control.current = getClockControl(get().clock);
  }, [get]);

  // Resolving freeze/unfreeze and waitForFrame from a scene frame makes each promise a real
  // render barrier: by the time its continuation runs, every subscriber has consumed that
  // frame and the composer has rendered it. A synchronous toggle/counter would leave the
  // harness guessing whether requestAnimationFrame had consumed the requested state yet.
  useFrame(() => {
    const c = control.current;
    if (!c) return;
    c.frame += 1;
    if (c.fixedStep && !c.frozen) {
      c.fixedElapsed += FIXED_DELTA;
      c.clock.elapsedTime = c.fixedElapsed;
    }
    if (!c.pending.length) return;
    const ready: PendingClockBarrier[] = [];
    const waiting: PendingClockBarrier[] = [];
    for (const pending of c.pending) (pending.ready(c) ? ready : waiting).push(pending);
    c.pending = waiting;
    for (const p of ready) p.resolve(clockSnapshot(c));
  });

  useEffect(() => {
    // SceneRoot also guards the mount. Keeping the availability check at the side-effect
    // boundary makes the invariant explicit: a production build cannot patch the clock or
    // publish a window handle even if this component is accidentally rendered elsewhere.
    if (!HUD_AVAILABLE) return;

    // Reach through R3F's imperative getter because this probe intentionally patches store
    // machinery; a value selected directly by a React hook is correctly treated as immutable.
    const clock = get().clock;
    const c = getClockControl(clock);
    control.current = c;
    // Strict Mode replays effects in development. `onCreated` armed the control only once,
    // so reinstall its fixed wrapper when this is the replayed setup.
    if (c.fixedStep) installWrappedGetDelta(c);
    const afterFrame = (ready: PendingClockBarrier['ready']) => new Promise<ClockFreezeState>((resolve) => {
      c.pending.push({ ready, resolve });
    });
    const handle: ClockFreezeHandle = {
      get frame() { return c.frame; },
      freeze: () => {
        if (!c.frozen) {
          c.frozenAt = c.fixedStep ? c.fixedElapsed : clock.elapsedTime;
          clock.elapsedTime = c.frozenAt;
          c.frozen = true;
          installWrappedGetDelta(c);
        }
        return afterFrame((current) => current.frozen);
      },
      unfreeze: () => {
        if (c.frozen) {
          clock.elapsedTime = c.frozenAt;
          if (clock.running) clock.oldTime = performance.now();
          c.frozen = false;
          if (!c.fixedStep) restoreGetDelta(c);
        }
        return afterFrame((current) => !current.frozen);
      },
      waitForFrame: (frame) => {
        if (!Number.isSafeInteger(frame) || frame < 0) {
          return Promise.reject(new RangeError('frame must be a non-negative safe integer'));
        }
        if (c.frame >= frame) return Promise.resolve(clockSnapshot(c));
        return afterFrame((current) => current.frame >= frame);
      },
      state: () => clockSnapshot(c),
    };

    (window as unknown as { __clock?: ClockFreezeHandle }).__clock = handle;

    return () => {
      if (c.frozen) {
        clock.elapsedTime = c.frozenAt;
        if (clock.running) clock.oldTime = performance.now();
      }
      c.frozen = false;
      for (const p of c.pending.splice(0)) p.resolve(clockSnapshot(c));
      restoreGetDelta(c);
      control.current = null;
      const debugWindow = window as unknown as { __clock?: ClockFreezeHandle };
      if (debugWindow.__clock === handle) delete debugWindow.__clock;
    };
  }, [get]);

  return null;
}

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
      // The disc's centre in CSS px. `project` gives NDC in [-1,1] with y up; the screen has
      // y down and the origin at the top-left.
      _p.copy(_sun).project(cam);
      hudData.sunX = ((_p.x + 1) / 2) * vw;
      hudData.sunY = ((1 - _p.y) / 2) * vh;

      const planets: { key: string; px: number; x: number; y: number }[] = [];
      planetPositions.forEach((pos, key) => {
        const R = planetRadii.get(key) ?? 0;
        _p.copy(pos);
        const d = cam.position.distanceTo(_p);
        // SUN-3: the disc's CENTRE as well as its size. Without it a harness measuring
        // per-body exposure has to guess which blob is which planet from colour and width,
        // and two of them differ by 1px of diameter.
        _pp.copy(pos).project(cam);
        planets.push({
          key,
          px: heightFraction(R, d, fovYrad) * vh,
          x: ((_pp.x + 1) / 2) * vw,
          y: ((1 - _pp.y) / 2) * vh,
        });
      });
      planets.sort((a, b) => a.key.localeCompare(b.key));
      hudData.planets = planets;
    } else {
      hudData.sunPct = 0;
      hudData.sunPx = 0;
      hudData.sunX = 0;
      hudData.sunY = 0;
      hudData.planets = [];
    }

    // What the renderer did on the PREVIOUS frame - this hook runs before R3F's render, so
    // reading after it would report a half-built frame. One frame late is invisible for a
    // diagnostic and is the same convention the corner readback already uses.
    //
    // `autoReset` has to be off for the number to mean anything: three.js clears the counters
    // at the START of every render, and with the composer's passes each one clearing again,
    // reading here returned `calls: 1, triangles: 1` - one pass's worth, not the frame's.
    // Off, the counters accumulate across every pass, and this is the one place that resets
    // them, once per frame, after they have been read.
    //
    // Taken off the frame STATE rather than the `useThree` value: the renderer from a hook
    // is not ours to mutate, and the compiler's immutability rule is right to say so.
    const renderer = state.gl;
    renderer.info.autoReset = false;
    hudData.calls = renderer.info.render.calls;
    hudData.tris = renderer.info.render.triangles;
    renderer.info.reset();

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
