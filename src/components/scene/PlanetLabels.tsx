'use client';
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useRouter } from 'next/navigation';
import { useScene } from '@/lib/sceneStore';
import { planetPositions, planetRadii, PLANET_PAGES, beltTourAnchor } from '@/lib/planetPositions';
import { PLANET_SECTION, TOUR_SECTIONS, sectionPath } from '@/lib/sections';
import { BODY_FACTS, DECORATIVE_BODIES } from '@/lib/bodyFacts';
import { HUD_AVAILABLE } from './DebugHud';
import { useI18n } from '@/lib/i18n';

/**
 * All scene→DOM labelling in ONE place (R5.4 + R5.6).
 *
 * Every pill and tooltip lives in a plain fixed overlay OUTSIDE the canvas, and its
 * screen position is written by a single driver that runs INSIDE the R3F frame loop at
 * priority 2 — i.e. after the camera rig has posed the camera, after each planet has
 * advanced its orbit, and after the composer has drawn the frame, all within the same
 * requestAnimationFrame. That ordering is the whole point:
 *
 *   • Before, each pill was a drei <Html> mounted as a CHILD of its planet. React runs
 *     child effects before parent effects, so the Html subscribed to the frame loop
 *     BEFORE the planet that moves it — every pill was placed from the planet's PREVIOUS
 *     frame position while the planet itself was drawn from this one. During camera
 *     motion that one-frame lag is exactly the label "jumping" off its planet.
 *   • Positions are written as raw sub-pixel `translate3d`. No rounding (rounding is a
 *     ±0.5px shimmer at speed), no per-frame React state, no layout reads.
 *
 * The overlay sits at z-20: above the canvas, deliberately BELOW the world panels (z-30)
 * and the navbar (z-50), so a label can never cover the site chrome.
 */

// --- registry ------------------------------------------------------------------------
// Plain module map of the DOM nodes the driver moves. No React state involved.
const nodes = new Map<string, HTMLElement>();
const register = (key: string) => (el: HTMLElement | null) => {
  if (el) nodes.set(key, el);
  else nodes.delete(key);
};

/** World anchor for the belt marker in the overview (the belt has no body to hang a pill
 *  on). The mobile tour's belt stop uses the LIVE anchor CameraRig writes instead — see
 *  `beltTourAnchor`: that stop rides the band now, so a constant would strand the pill. */
const BELT_ANCHOR = new THREE.Vector3(5.0, 0.15, 0);

const PAGE_KEYS = Object.keys(PLANET_PAGES);

const _wp = new THREE.Vector3();
const _ndc = new THREE.Vector3();

// --- R5.6 hover hysteresis -------------------------------------------------------------
// A decorative body is a small disc that ORBITS, and the camera answers to the pointer, so
// the body drifts under a perfectly still cursor and the pointer sits near its edge more
// often than not. A bare enter/leave raycast therefore chatters: acquired, lost, acquired,
// several times a second, and the tooltip strobes. The cure is an explicit hysteresis run
// from the label driver, which already projects every body to the screen each frame:
//   • acquire on a clean hit (pointer inside the projected disc),
//   • HOLD while the pointer is within a STICKY-times-larger disc plus a small slack ring,
//   • and only drop after the miss has PERSISTED — a single bad frame proves nothing.
// Hovering the tooltip itself also holds, otherwise Mercury's CV download would vanish the
// moment you reached for it.
const HOVER_STICKY = 1.5;    // grown hit radius while a body is already hovered
const HOVER_SLACK_PX = 24;   // dead-band ring beyond the sticky disc
const HOVER_MISS_MS = 250;   // a miss must persist this long before the hover drops

// B10 once parked a visible marker on the frame rim for an off-frame Uranus/Neptune so its
// tooltip stayed reachable. Removed (Elad, 2026-09-27): an unlabeled dot pinned in a corner
// read as a bug. The pointer reaches a body while any of its disc is in frame; the keyboard
// keeps a visually hidden button per body (below), which shows the card wherever it is.
const TIP_TAU = 0.055;       // tooltip position smoothing time constant, in SECONDS
const DEG2RAD = Math.PI / 180;

/** Live pointer, updated from real events only — never polled, never a layout read. */
const ptr = { x: -1, y: -1, seen: false, onScene: false, onTip: false };
/** The decorative body whose hidden button has keyboard focus ('' = none). */
const kbd = { key: '' };

/** Hide a node without touching layout or leaving a focusable ghost behind. */
function hide(el: HTMLElement) {
  if (el.style.visibility !== 'hidden') {
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    el.style.visibility = 'hidden';
  }
}

function place(el: HTMLElement, x: number, y: number, opacity: number, interactive: boolean) {
  // Sub-pixel translate3d only — the pill rides the planet exactly.
  el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
  const o = opacity.toFixed(3);
  if (el.style.opacity !== o) el.style.opacity = o;
  if (el.style.visibility !== 'visible') el.style.visibility = 'visible';
  const pe = interactive ? 'auto' : 'none';
  if (el.style.pointerEvents !== pe) el.style.pointerEvents = pe;
}

/**
 * The driver. Priority 2 → runs LAST in the frame, after the composer's priority-1
 * render, so the DOM and the pixels it labels are always from the same instant.
 */
export function PlanetLabelDriver() {
  // Hover bookkeeping lives in refs — none of it may cause a React render. Only the final
  // enter/leave decision is published to the store.
  const hoverMiss = useRef(0);
  const tip = useRef({ x: 0, y: 0, key: '' });

  useEffect(() => {
    // Touch has no hover: a tap toggles the tooltip (SolarAct) and the driver keeps out of
    // it entirely, so a tapped card is never yanked away by a phantom "miss".
    const track = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const t = e.target as Element | null;
      ptr.x = e.clientX;
      ptr.y = e.clientY;
      ptr.seen = true;
      ptr.onScene = t?.tagName === 'CANVAS';
      ptr.onTip = !!t?.closest?.('[data-body-tooltip]');
    };
    // `pointerover` matters as much as `pointermove` here: the scene moves under a STILL
    // cursor, so the element being hit-tested changes with no mouse motion at all. The
    // moment the card slides beneath the pointer, the canvas raises pointerout — and with
    // nothing else arriving, the flags stayed false and the hover died 250ms later, which
    // is precisely the strobe this hysteresis exists to prevent. `pointerover` re-reads
    // the new target, so being covered by the card counts as still being on target.
    window.addEventListener('pointermove', track, { passive: true });
    window.addEventListener('pointerover', track, { passive: true });
    // Only a pointer that has genuinely left the document is "gone" — not one that merely
    // crossed from one element to another.
    const gone = () => { ptr.onScene = false; ptr.onTip = false; };
    document.documentElement.addEventListener('pointerleave', gone, { passive: true });
    window.addEventListener('blur', gone);
    // Touch: a tapped card stays until the next tap lands somewhere else - background, a
    // constellation, another body (Elad, 2026-09-29). The body's own tap handler (an R3F
    // click, which runs before this window-level one) toggles or swaps the card; if this
    // tap left it untouched, the tap missed it, so the card closes.
    let downKey: string | null = null, downTouch = false;
    const down = (e: PointerEvent) => {
      downTouch = e.pointerType !== 'mouse' && (e.target as Element | null)?.tagName === 'CANVAS';
      downKey = useScene.getState().hoveredBody;
    };
    const click = () => {
      const s = useScene.getState();
      if (downTouch && downKey && !s.dragMoved && s.hoveredBody === downKey) s.setHoveredBody(null);
      downTouch = false;
    };
    window.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('click', click);
    return () => {
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('click', click);
      window.removeEventListener('pointermove', track);
      window.removeEventListener('pointerover', track);
      document.documentElement.removeEventListener('pointerleave', gone);
      window.removeEventListener('blur', gone);
    };
  }, []);

  useFrame((state, delta) => {
    const st = useScene.getState();
    const cam = state.camera as THREE.PerspectiveCamera;
    const vw = state.size.width;
    const vh = state.size.height;

    // The whole layer belongs to the solar OVERVIEW. A focused world, the galaxy act, or
    // the swap curtain all mean "no pills".
    const covFade = Math.max(0, Math.min(1, 1 - (st.coverage - 0.12) / 0.38));
    const overviewOn = st.act === 'solar' && !st.focusedPlanet && covFade > 0.001;
    // Mobile orrery: only the stop in the centre is labelled, fading out over half a stop of
    // swipe. Neighbours used to keep their pills too, and the belt's pill (anchored between
    // mars and jupiter) landed on top of mars's, so mars read "Technologies".
    const tourWeight = (focus: string) => {
      const i = TOUR_SECTIONS.findIndex((s) => s.focus === focus);
      if (i < 0) return 0;
      const N = TOUR_SECTIONS.length, d = Math.abs(i - st.tourPos) % N;
      return Math.max(0, 1 - Math.min(d, N - d) / 0.5);
    };

    const project = (pos: THREE.Vector3, lift: number) => {
      _wp.copy(pos);
      _wp.y += lift;
      _ndc.copy(_wp).project(cam);
      let x = (_ndc.x * 0.5 + 0.5) * vw;
      let y = (-_ndc.y * 0.5 + 0.5) * vh;
      const behind = _ndc.z > 1;
      if (behind) { x = vw - x; y = vh - y; } // behind the camera → mirror to the far edge
      const off = behind || Math.abs(_ndc.x) > 0.97 || Math.abs(_ndc.y) > 0.97;
      return { x, y, off, behind };
    };

    // Verification handle: where the CURRENT frame's body positions say each pill belongs.
    // Read between frames it reports frame N, and the pill's transform was written at
    // priority 2 of frame N — so a driver working from stale positions (the drei <Html>
    // failure this replaced) would disagree with it by one frame of camera motion.
    if (HUD_AVAILABLE) {
      (window as unknown as {
        __labelProbe?: (k: string, lift?: number) => { x: number; y: number; off: boolean; rPx: number } | null;
      }).__labelProbe = (k, lift) => {
        const p = planetPositions.get(k);
        if (!p) return null;
        // Default lift = where the PILL goes; pass 0 for the body's own centre.
        const at = project(p, lift ?? (planetRadii.get(k) ?? 0.4) + 0.35);
        const d = cam.position.distanceTo(p);
        const rPx = d <= 0 ? 0 : ((2 * Math.atan((planetRadii.get(k) ?? 0.3) / d)) / (cam.fov * DEG2RAD)) * vh * 0.5;
        return { ...at, rPx };
      };
    }

    // --- section pills ---------------------------------------------------------------
    for (const key of PAGE_KEYS) {
      const el = nodes.get(key);
      if (!el) continue;
      const pos = planetPositions.get(key);
      if (!overviewOn || !pos) { hide(el); continue; }
      // Mobile tour: only the active stop is labelled — the others are off-frame anyway
      // and their clamped pills would pile up along the edges.
      const tw = st.tourMode ? tourWeight(key) : 1;
      if (tw <= 0) { hide(el); continue; }
      // In the tour the caption sits just BELOW the disc, in screen space (GPT review: a
      // name pasted on the planet fights its texture). The overview keeps the world-space
      // lift so the pill clears the disc there instead.
      const lift = st.tourMode ? 0 : (planetRadii.get(key) ?? 0.4) + 0.35;
      const p = project(pos, lift);
      if (st.tourMode && p.off) { hide(el); continue; } // out of frame: no clamped pill
      let { x, y } = p;
      if (st.tourMode) {
        const d = cam.position.distanceTo(pos);
        const rPx = ((2 * Math.atan((planetRadii.get(key) ?? 0.3) / d)) / (cam.fov * DEG2RAD)) * vh * 0.5;
        y = Math.min(vh - 150, y + rPx + 16 + el.offsetHeight / 2);
      }
      if (p.off) {
        // Never crop a section away: clamp the pill to the frame, clear of the navbar
        // (top) and the tour dots / drag hint (bottom).
        x = Math.min(vw - 66, Math.max(66, x));
        y = Math.min(vh - 96, Math.max(74, y));
      }
      place(el, x, y, covFade * tw, covFade * tw > 0.5);
    }

    // --- belt pill --------------------------------------------------------------------
    const belt = nodes.get('belt');
    if (belt) {
      const btw = st.tourMode ? tourWeight('belt') : 1;
      if (!overviewOn || btw <= 0) hide(belt);
      else {
        const { x, y: by } = project(st.tourMode ? beltTourAnchor : BELT_ANCHOR, 0);
        const y = st.tourMode ? by + 24 + belt.offsetHeight / 2 : by;
        place(
          belt,
          Math.min(vw - 66, Math.max(66, x)),
          Math.min(vh - 96, Math.max(74, y)),
          covFade * btw,
          covFade * btw > 0.5
        );
      }
    }

    // --- decorative hover, with hysteresis (R5.6) --------------------------------------
    // Run from here rather than from raycast enter/leave events because this is the one
    // place that already knows where every body IS this frame, in screen pixels.
    const fovY = cam.fov * DEG2RAD;
    /** Projected screen radius of a body, in px — same tan model as the HUD. */
    const radiusPx = (key: string, pos: THREE.Vector3) => {
      const d = cam.position.distanceTo(pos);
      return d <= 0 ? 0 : ((2 * Math.atan((planetRadii.get(key) ?? 0.3) / d)) / fovY) * vh * 0.5;
    };
    /** Where a decorative body can be hovered on screen - while any of its disc is in frame. */
    const reachable = (key: string, pos: THREE.Vector3) => {
      const p = project(pos, 0);
      if (p.behind) return null;
      const r = radiusPx(key, pos);
      if (p.x + r < 0 || p.x - r > vw || p.y + r < 0 || p.y - r > vh) return null;
      return { x: p.x, y: p.y, r };
    };

    if (!overviewOn || !ptr.seen || st.tourMode) {
      if (st.hoveredBody && !st.tourMode && st.hoveredBody !== kbd.key) { st.setHoveredBody(null); hoverMiss.current = 0; }
    } else {
      // Nearest body to the pointer, measured from the EDGE of its target.
      let bestKey: string | null = null;
      let bestGap = Infinity;
      let bestHit = false;
      for (const key of DECORATIVE_BODIES) {
        const pos = planetPositions.get(key);
        if (!pos) continue;
        const a = reachable(key, pos);
        if (!a) continue;
        const gap = Math.hypot(a.x - ptr.x, a.y - ptr.y) - a.r;
        if (gap < bestGap) { bestGap = gap; bestKey = key; bestHit = gap <= 0; }
      }

      const cur = st.hoveredBody;
      if (cur && DECORATIVE_BODIES.includes(cur)) {
        const pos = planetPositions.get(cur);
        const a = pos ? reachable(cur, pos) : null;
        const r = a ? a.r : 0;
        const dist = a ? Math.hypot(a.x - ptr.x, a.y - ptr.y) : Infinity;
        // Held by the sticky disc + slack ring, or by the pointer being on the card itself.
        const held = kbd.key === cur || ptr.onTip || (ptr.onScene && dist <= r * HOVER_STICKY + HOVER_SLACK_PX);
        if (held) {
          hoverMiss.current = 0;
          // A clean hit on a DIFFERENT body still wins immediately — moving from one body
          // to the next should feel direct, the hysteresis only resists letting go.
          if (bestHit && bestKey && bestKey !== cur) st.setHoveredBody(bestKey);
        } else if (!hoverMiss.current) {
          hoverMiss.current = state.clock.elapsedTime;
        } else if ((state.clock.elapsedTime - hoverMiss.current) * 1000 > HOVER_MISS_MS) {
          hoverMiss.current = 0;
          st.setHoveredBody(null);
        }
      } else {
        hoverMiss.current = 0;
        if (ptr.onScene && bestHit && bestKey) st.setHoveredBody(bestKey);
      }
      // Verification handle. "The tooltip did not appear" has at least five causes here —
      // the pointer flags, the nearest-target search, the hysteresis, the acquisition gate
      // — and a screenshot distinguishes none of them.
      if (HUD_AVAILABLE) {
        (window as unknown as { __hover?: unknown }).__hover = {
          hovered: st.hoveredBody,
          bestKey, bestGap: +bestGap.toFixed(1), bestHit,
          onScene: ptr.onScene, onTip: ptr.onTip,
          ptr: [Math.round(ptr.x), Math.round(ptr.y)],
        };
      }
    }

    // --- decorative tooltip -----------------------------------------------------------
    const tipEl = nodes.get('tooltip');
    if (tipEl) {
      const key = useScene.getState().hoveredBody;
      const pos = key ? planetPositions.get(key) : null;
      // A body that orbits out of frame takes its card with it.
      // Keyboard focus keeps it: the card then sits at the frame edge nearest the body.
      const a = overviewOn && key && pos ? reachable(key, pos) ?? (key === kbd.key ? project(pos, 0) : null) : null;
      if (!a || !key || !pos) { hide(tipEl); tip.current.key = ''; }
      else {
        const x = a.x;
        const y = project(pos, (planetRadii.get(key) ?? 0.3) + 0.28).y;
        // Keep the card fully on screen — it is far wider than a pill.
        const halfW = tipEl.offsetWidth / 2 || 130;
        const halfH = tipEl.offsetHeight / 2 || 46;
        const tx = Math.min(vw - halfW - 12, Math.max(halfW + 12, x));
        const ty = Math.min(vh - halfH - 16, Math.max(halfH + 76, y));
        if (tip.current.key !== key) {
          // First frame on a new body: snap, so the card appears where it belongs rather
          // than flying in from the previous body.
          tip.current.key = key;
          tip.current.x = tx;
          tip.current.y = ty;
        } else {
          // Damped follow. The card is a big slab of text; letting it track the orbiting
          // body pixel-for-pixel reads as jitter even when the position is exactly right.
          // Wall-clock damping, not a per-frame lerp — under the tier composition law the
          // card must land in the same place at 60Hz and at 144Hz.
          const k = 1 - Math.exp(-delta / TIP_TAU);
          tip.current.x += (tx - tip.current.x) * k;
          tip.current.y += (ty - tip.current.y) * k;
        }
        place(tipEl, tip.current.x, tip.current.y, 1, true);
      }
    }
  }, 2);
  return null;
}

// --- DOM overlay -----------------------------------------------------------------------

const PILL_BASE = 'absolute left-0 top-0 cursor-pointer whitespace-nowrap border text-[var(--color-star-white)] shadow-[0_4px_18px_rgba(5,7,20,0.55)] transition-colors duration-200 hover:border-[var(--color-core-gold)]/70 hover:text-[var(--color-core-gold)] focus:outline-none focus-visible:border-[var(--color-core-gold)] focus-visible:text-[var(--color-core-gold)] focus-visible:ring-2 focus-visible:ring-[var(--color-core-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(5,7,20,0.9)]';
// Mobile tour caption (GPT review): 20/26 semibold name, a 14px "tap to enter" line under it,
// a 48px-tall touch target, on a darker plate so both lines hold >= 4.5:1 over any planet.
const PILL_TOUR = 'touch-pan-y flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl border-white/25 bg-[rgba(5,7,20,0.86)] px-5 py-2 text-[20px] font-semibold leading-[26px]';
const PILL_DESK = 'rounded-full border-white/20 bg-[rgba(5,7,20,0.78)] px-3.5 py-1.5 text-[13px] font-medium leading-none';

function Pill({ nodeKey, label, hint, tour, onOpen }: { nodeKey: string; label: string; hint: string; tour: boolean; onOpen: () => void }) {
  return (
    <button
      ref={register(nodeKey)}
      type="button"
      data-planet-label={nodeKey}
      aria-label={label}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      className={`${PILL_BASE} ${tour ? PILL_TOUR : PILL_DESK}`}
      style={{ fontFamily: 'var(--font-body, var(--font-hebrew))', opacity: 0, visibility: 'hidden', willChange: 'transform' }}
    >
      {label}
      {tour && <span className="text-[14px] font-normal leading-5 text-[var(--color-star-white)]/80">{hint}</span>}
    </button>
  );
}

/**
 * The overlay. Renders once; afterwards React only touches these nodes when the locale
 * changes or the hovered body changes — both rare, user-driven events.
 */
export default function PlanetLabelsOverlay() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const hovered = useScene((s) => s.hoveredBody);
  const tour = useScene((s) => s.tourMode);

  const open = (key: string) => {
    if (useScene.getState().dragMoved) return; // a rotate-drag / swipe ended here
    const section = key === 'belt' ? 'technologies' : PLANET_SECTION[key];
    if (section) router.push(sectionPath(section, locale));
  };

  const fact = hovered ? BODY_FACTS[hovered] : null;
  const showSoon = fact?.action?.kind === 'soon';

  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
      {PAGE_KEYS.map((key) => (
        <Pill key={key} nodeKey={key} label={t(PLANET_PAGES[key].labelKey)} hint={t('welcome.tapHint')} tour={tour} onOpen={() => open(key)} />
      ))}
      <Pill nodeKey="belt" label={t('nav.tech')} hint={t('welcome.tapHint')} tour={tour} onOpen={() => open('belt')} />

      {/* Keyboard route to the decorative facts: visually hidden, one per body. */}
      {DECORATIVE_BODIES.map((key) => (
        <button
          key={key}
          type="button"
          className="sr-only"
          aria-label={BODY_FACTS[key].name[locale]}
          onFocus={() => { kbd.key = key; useScene.getState().setHoveredBody(key); }}
          onBlur={() => {
            if (kbd.key === key) kbd.key = '';
            const s = useScene.getState();
            if (s.hoveredBody === key) s.setHoveredBody(null);
          }}
          onClick={() => {
            const s = useScene.getState();
            s.setHoveredBody(s.hoveredBody === key ? null : key);
          }}
        />
      ))}


      {/* Decorative-body tooltip - one node, re-used for whichever body is hovered. */}
      <div
        ref={register('tooltip')}
        role="tooltip"
        data-body-tooltip={hovered ?? ''}
        className="absolute left-0 top-0 w-[min(19rem,78vw)] rounded-2xl border border-white/15 px-4 py-3 shadow-[0_10px_40px_rgba(5,7,20,0.6)]"
        style={{
          background: 'rgba(5,7,20,0.86)',
          opacity: 0,
          visibility: 'hidden',
          willChange: 'transform',
          fontFamily: 'var(--font-body, var(--font-hebrew))',
        }}
      >
        {fact && (
          <>
            <p
              className="text-[15px] leading-none text-[var(--color-core-gold)]"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 400, letterSpacing: '0.04em' }}
            >
              {fact.name[locale]}
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--color-star-white)]/80">{fact.fact[locale]}</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--color-star-white)]/55">{fact.tie[locale]}</p>
            {showSoon && (
              <span className="mt-3 inline-flex items-center rounded-full border border-white/15 px-3 py-1 text-[12px] text-[var(--color-star-white)]/55">
                {fact.cta?.[locale]}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
