// Phone-motion parallax for the mobile orrery (Elad, 2026-09-29: "like Facebook 360 photos,
// a sense of depth - moving the phone shows more"; 2026-09-29 follow-up: "only works up and
// down, and it's aggressive and jerky - it should be a fixed focal point, and any tilt gives
// a peek at whatever is off-screen that way").
//
// R2: the first version integrated the gyroscope's rotation RATE with a leaky decay. That
// mixes device-local axes as the phone's own tilt changes (which is why it read mostly as
// vertical - the horizontal axis on a phone held at a normal viewing angle, not bolt
// upright, barely showed up in raw rotation rate), and integrating a noisy rate signal is
// what produced the jerkiness. Reading the device's ABSOLUTE orientation instead and taking
// the plain difference from a baseline gives both axes symmetrically and needs no decay
// tuning to stay bounded - it already is.
//
// Also per Elad's approved answer: the view holds a new angle rather than drifting back to
// centre (true Facebook-360 behaviour) - it only recentres when the tour moves to a new
// stop, via `recenterTilt()`.
//
// iOS gates the sensor behind DeviceOrientationEvent.requestPermission(), which only works
// from a tap; `needsPermission()` tells the UI whether to offer that tap. Android just
// delivers events.

const MAX = 25;        // deg - the view never swings further than this much phone turn
const SMOOTH = 0.18;   // s - low-pass on the output; slow enough to read as calm, not jerky

/** Phone turn in degrees since the last recentre: x = turned right, y = tilted to look down. */
export const tilt = { x: 0, y: 0, live: false, refused: false };

let raw = { x: 0, y: 0 };
let baseline: { beta: number; gamma: number } | null = null;
let started = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((f) => f());

const clamp = (v: number) => Math.max(-MAX, Math.min(MAX, v));

function onOrientation(e: DeviceOrientationEvent) {
  if (e.beta == null || e.gamma == null) return;
  if (!tilt.live) { tilt.live = true; notify(); }
  // Portrait only; the orrery is a portrait layout and landscape swaps the device axes.
  const angle = screen.orientation?.angle ?? 0;
  if (angle !== 0) return;
  // The first reading becomes "centre" - whatever angle the phone happens to be held at.
  if (!baseline) baseline = { beta: e.beta, gamma: e.gamma };
  // gamma: left/right tilt of the device -> horizontal look. beta: front/back tilt -> vertical.
  raw.x = clamp(e.gamma - baseline.gamma);
  raw.y = clamp(e.beta - baseline.beta);
}

/** Call once per rendered frame; returns the smoothed turn (also on `tilt`). */
export function stepTilt(dt: number) {
  const a = 1 - Math.exp(-dt / SMOOTH);
  tilt.x += (raw.x - tilt.x) * a;
  tilt.y += (raw.y - tilt.y) * a;
  // Verification handle, present in production like PerfPacer's `__perf` - read-only, no
  // secrets, and the only way to measure real-device tilt against the on-screen effect.
  if (typeof window !== 'undefined') (window as unknown as Record<string, unknown>).__tilt = { ...tilt };
  return tilt;
}

/** Re-anchor "centre" to the phone's current angle - called when the tour moves to a new
 *  stop, so the new planet always starts framed straight rather than carrying the old tilt. */
export function recenterTilt() {
  baseline = null;
}

export function startTilt() {
  if (started || typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  started = true;
  window.addEventListener('deviceorientation', onOrientation);
}

type PermissionCtor = { requestPermission?: () => Promise<'granted' | 'denied'> };

/** iOS: the sensor stays silent until a tap grants it. */
export function needsPermission() {
  return (
    typeof window !== 'undefined' &&
    typeof (window.DeviceOrientationEvent as unknown as PermissionCtor)?.requestPermission === 'function'
  );
}

/** Must be called from a tap handler. */
export async function requestTilt() {
  const ctor = window.DeviceOrientationEvent as unknown as PermissionCtor;
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
