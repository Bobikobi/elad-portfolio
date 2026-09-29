// Phone-motion parallax for the mobile orrery (Elad, 2026-09-29: "like Facebook 360 photos,
// a sense of depth - moving the phone shows more").
//
// The input is the gyroscope's rotation RATE, integrated with a leak, not the absolute
// orientation: the absolute angles gimbal-lock when the phone is held upright, and a leaky
// integral is exactly the wanted behaviour anyway - turning the phone swings the view, holding
// the new angle lets it drift back to centre (TAU), so the carousel never stays off-centre.
// A small dead zone on the rate swallows sensor bias, so a phone lying still does not creep.
//
// iOS gates the sensor behind DeviceMotionEvent.requestPermission(), which only works from a
// tap; `needsPermission()` tells the UI whether to offer that tap. Android just delivers.

const TAU = 1.5;       // s - a held tilt fades back to centre with this time constant
const DEAD = 0.8;      // deg/s - rates below this are sensor bias, not a hand
const MAX = 25;        // deg - the view never swings further than this much phone turn
const SMOOTH = 0.06;   // s - low-pass on the output against sensor jitter

/** Phone turn in degrees since it last held still: x = turned right, y = tilted to look down. */
export const tilt = { x: 0, y: 0, live: false, refused: false };

let raw = { x: 0, y: 0 };
let lastT = 0;
let started = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((f) => f());

function onMotion(e: DeviceMotionEvent) {
  const r = e.rotationRate;
  if (!r || r.beta == null || r.gamma == null) return;
  const now = performance.now();
  const dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 0;
  lastT = now;
  if (!tilt.live) { tilt.live = true; notify(); }
  // Portrait only; the orrery is a portrait layout and landscape swaps the device axes.
  const angle = screen.orientation?.angle ?? 0;
  if (angle !== 0) { raw = { x: 0, y: 0 }; return; }
  const dz = (v: number) => (Math.abs(v) < DEAD ? 0 : v);
  // rotationRate.gamma: about the device's long axis (positive = the screen turns to face
  // right); .beta: about its short axis (positive = the top edge comes toward the face, the
  // screen faces down).
  const leak = Math.exp(-dt / TAU);
  raw.x = Math.max(-MAX, Math.min(MAX, raw.x * leak + dz(r.gamma) * dt));
  raw.y = Math.max(-MAX, Math.min(MAX, raw.y * leak + dz(r.beta) * dt));
}

/** Call once per rendered frame; returns the smoothed turn (also on `tilt`). */
export function stepTilt(dt: number) {
  // Keep leaking between events too, so a sensor that stops reporting settles at centre.
  if (performance.now() - lastT > 200) { const l = Math.exp(-dt / TAU); raw.x *= l; raw.y *= l; }
  const a = 1 - Math.exp(-dt / SMOOTH);
  tilt.x += (raw.x - tilt.x) * a;
  tilt.y += (raw.y - tilt.y) * a;
  return tilt;
}

export function startTilt() {
  if (started || typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  started = true;
  window.addEventListener('devicemotion', onMotion);
}

type PermissionCtor = { requestPermission?: () => Promise<'granted' | 'denied'> };

/** iOS: the sensor stays silent until a tap grants it. */
export function needsPermission() {
  return typeof window !== 'undefined' && typeof (window.DeviceMotionEvent as unknown as PermissionCtor)?.requestPermission === 'function';
}

/** Must be called from a tap handler. */
export async function requestTilt() {
  const ctor = window.DeviceMotionEvent as unknown as PermissionCtor;
  // A refusal is final on iOS (it will not prompt again), so the offer goes away either way.
  const refuse = () => { tilt.refused = true; notify(); return false; };
  try {
    // Called on the class, never detached - a detached static can throw on WebKit.
    if (ctor.requestPermission && (await ctor.requestPermission()) !== 'granted') return refuse();
  } catch { return refuse(); }
  startTilt();
  return true;
}

export function onTiltLive(f: () => void) { listeners.add(f); return () => { listeners.delete(f); }; }
