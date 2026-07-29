'use client';
import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useRouter } from 'next/navigation';
import { useScene } from '@/lib/sceneStore';
import { planetPositions, planetRadii, PLANET_PAGES, beltTourAnchor } from '@/lib/planetPositions';
import { PLANET_SECTION, SECTIONS, sectionPath } from '@/lib/sections';
import { BODY_FACTS, CV_HREF, DECORATIVE_BODIES } from '@/lib/bodyFacts';
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
const TOUR_STOPS = SECTIONS.length;

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

// --- B10: the rim markers -------------------------------------------------------------
// A decorative body's tooltip is raised by hovering the BODY, and the hover test skipped
// any body that was off-frame — so a tooltip you could not see the planet for was simply
// unreachable. Measured over a full revolution at the resting overview, Uranus is inside
// the frame 35.6% of the time and Neptune 33.4%: for two thirds of every orbit those two
// worlds had no way in at all. Pulling the orbits in barely moves those numbers, because
// the cause is not the orbit — the overview camera sits INSIDE the system, ten units from
// the sun, so the near half of every outer orbit passes below the frustum entirely.
//
// The section pills already solved the same problem for the same reason: "never crop a
// section away — clamp the pill to the frame". This is that rule, applied to the other
// class of body. When a decorative world is off-frame it leaves a small marker on the rim
// where it lies, and that marker is both the hover target and the visible cue that
// something is out there. Nothing changes while the body IS in frame.
const RIM_R = 13;            // hit radius of a rim marker, px
const RIM_INSET_X = 34;      // how far in from the left/right edges the marker sits
const RIM_TOP = 96;          // clear of the navbar
const RIM_BOTTOM = 116;      // clear of the tour dots / drag hint
const TIP_TAU = 0.055;       // tooltip position smoothing time constant, in SECONDS
const DEG2RAD = Math.PI / 180;

/** Live pointer, updated from real events only — never polled, never a layout read. */
const ptr = { x: -1, y: -1, seen: false, onScene: false, onTip: false, onRim: false };

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
      // B10: the pointer resting on a rim marker counts as holding that body, exactly as
      // resting on the tooltip does — otherwise the hysteresis would drop the hover 250ms
      // after the marker raised it, which is the strobe this whole mechanism exists to
      // prevent, only now on the one target you can actually aim at.
      ptr.onRim = !!t?.closest?.('[data-body-rim]');
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
    const gone = () => { ptr.onScene = false; ptr.onTip = false; ptr.onRim = false; };
    document.documentElement.addEventListener('pointerleave', gone, { passive: true });
    window.addEventListener('blur', gone);
    return () => {
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
    const tourIdx = ((st.tourStop % TOUR_STOPS) + TOUR_STOPS) % TOUR_STOPS;
    const tourFocus = SECTIONS[tourIdx]?.focus;

    const project = (pos: THREE.Vector3, lift: number) => {
      _wp.copy(pos);
      _wp.y += lift;
      _ndc.copy(_wp).project(cam);
      let x = (_ndc.x * 0.5 + 0.5) * vw;
      let y = (-_ndc.y * 0.5 + 0.5) * vh;
      const behind = _ndc.z > 1;
      if (behind) { x = vw - x; y = vh - y; } // behind the camera → mirror to the far edge
      const off = behind || Math.abs(_ndc.x) > 0.97 || Math.abs(_ndc.y) > 0.97;
      return { x, y, off };
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
      if (st.tourMode && tourFocus !== key) { hide(el); continue; }
      const p = project(pos, (planetRadii.get(key) ?? 0.4) + 0.35);
      let { x, y } = p;
      if (p.off) {
        // Never crop a section away: clamp the pill to the frame, clear of the navbar
        // (top) and the tour dots / drag hint (bottom).
        x = Math.min(vw - 66, Math.max(66, x));
        y = Math.min(vh - 96, Math.max(74, y));
      }
      place(el, x, y, covFade, covFade > 0.5);
    }

    // --- belt pill --------------------------------------------------------------------
    const belt = nodes.get('belt');
    if (belt) {
      if (!overviewOn || (st.tourMode && tourFocus !== 'belt')) hide(belt);
      else {
        const { x, y } = project(st.tourMode ? beltTourAnchor : BELT_ANCHOR, 0);
        place(
          belt,
          Math.min(vw - 66, Math.max(66, x)),
          Math.min(vh - 96, Math.max(74, y)),
          covFade,
          covFade > 0.5
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
    /**
     * Where a decorative body can be reached on screen, and how big its target is. In
     * frame that is the body itself; out of frame it is the rim marker standing in for it
     * (B10). One function so the hover test, the hysteresis and the marker placement can
     * never disagree about where the thing is.
     */
    const reachable = (key: string, pos: THREE.Vector3) => {
      const p = project(pos, 0);
      if (!p.off) return { x: p.x, y: p.y, r: radiusPx(key, pos), rim: false };
      return {
        x: Math.min(vw - RIM_INSET_X, Math.max(RIM_INSET_X, p.x)),
        y: Math.min(vh - RIM_BOTTOM, Math.max(RIM_TOP, p.y)),
        r: RIM_R,
        rim: true,
      };
    };

    if (!overviewOn || !ptr.seen || st.tourMode) {
      if (st.hoveredBody && !st.tourMode) { st.setHoveredBody(null); hoverMiss.current = 0; }
    } else {
      // Nearest body to the pointer, measured from the EDGE of its target.
      let bestKey: string | null = null;
      let bestGap = Infinity;
      let bestHit = false;
      for (const key of DECORATIVE_BODIES) {
        const pos = planetPositions.get(key);
        if (!pos) continue;
        const a = reachable(key, pos);
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
        const held = ptr.onTip || ptr.onRim || (ptr.onScene && dist <= r * HOVER_STICKY + HOVER_SLACK_PX);
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
    }

    // --- B10: rim markers for the decorative bodies that are off-frame -----------------
    // Shown ONLY while a body is out of view, at the point on the rim where it lies; the
    // hover test above already treats that point as the body's target.
    for (const key of DECORATIVE_BODIES) {
      const el = nodes.get(`rim:${key}`);
      if (!el) continue;
      const pos = planetPositions.get(key);
      if (!overviewOn || !pos || st.tourMode) { hide(el); continue; }
      const a = reachable(key, pos);
      if (!a.rim) { hide(el); continue; }
      const on = st.hoveredBody === key;
      place(el, a.x, a.y, (on ? 1 : 0.55) * covFade, covFade > 0.5);
    }

    // --- decorative tooltip -----------------------------------------------------------
    const tipEl = nodes.get('tooltip');
    if (tipEl) {
      const key = useScene.getState().hoveredBody;
      const pos = key ? planetPositions.get(key) : null;
      if (!overviewOn || !key || !pos) { hide(tipEl); tip.current.key = ''; }
      else {
        // Anchored to whatever is actually reachable: the body when it is in frame, its rim
        // marker when it is not (B10). Anchoring to the raw projection would put the card
        // for an off-frame body somewhere across the screen from the thing you just hovered.
        const a = reachable(key, pos);
        const x = a.x;
        const y = a.rim ? a.y : project(pos, (planetRadii.get(key) ?? 0.3) + 0.28).y;
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

function Pill({ nodeKey, label, onOpen }: { nodeKey: string; label: string; onOpen: () => void }) {
  return (
    <button
      ref={register(nodeKey)}
      type="button"
      data-planet-label={nodeKey}
      aria-label={label}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      className="absolute left-0 top-0 cursor-pointer whitespace-nowrap rounded-full border border-white/20 bg-[rgba(5,7,20,0.78)] px-3.5 py-1.5 text-[13px] font-medium leading-none text-[var(--color-star-white)] shadow-[0_4px_18px_rgba(5,7,20,0.55)] transition-colors duration-200 hover:border-[var(--color-core-gold)]/70 hover:text-[var(--color-core-gold)] focus:outline-none focus-visible:border-[var(--color-core-gold)] focus-visible:text-[var(--color-core-gold)] focus-visible:ring-2 focus-visible:ring-[var(--color-core-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(5,7,20,0.9)]"
      style={{ fontFamily: 'var(--font-body, var(--font-hebrew))', opacity: 0, visibility: 'hidden', willChange: 'transform' }}
    >
      {label}
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
  // A CV link that is not actually published would be a broken download, so probe once
  // and degrade Mercury to the same "coming soon" affordance Venus uses.
  const [cvOk, setCvOk] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(CV_HREF, { method: 'HEAD' })
      .then((r) => { if (!cancelled) setCvOk(r.ok); })
      .catch(() => { if (!cancelled) setCvOk(false); });
    return () => { cancelled = true; };
  }, []);

  const open = (key: string) => {
    if (useScene.getState().dragMoved) return; // a rotate-drag / swipe ended here
    const section = key === 'belt' ? 'technologies' : PLANET_SECTION[key];
    if (section) router.push(sectionPath(section, locale));
  };

  const fact = hovered ? BODY_FACTS[hovered] : null;
  const action = fact?.action ?? null;
  const cvMissing = action?.kind === 'cv' && cvOk === false;
  const showSoon = action?.kind === 'soon' || cvMissing;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
      {PAGE_KEYS.map((key) => (
        <Pill key={key} nodeKey={key} label={t(PLANET_PAGES[key].labelKey)} onOpen={() => open(key)} />
      ))}
      <Pill nodeKey="belt" label={t('nav.tech')} onOpen={() => open('belt')} />

      {/* B10 — rim markers. A decorative world that has orbited out of frame leaves this
          behind on the rim: the cue that it is out there, and the target that raises its
          tooltip. Hidden entirely while the body is in frame, so the resting overview is
          unchanged whenever the planets happen to be on the near side. */}
      {DECORATIVE_BODIES.map((key) => (
        <button
          key={key}
          ref={register(`rim:${key}`)}
          type="button"
          data-body-rim={key}
          aria-label={BODY_FACTS[key].name[locale]}
          onPointerEnter={() => useScene.getState().setHoveredBody(key)}
          onFocus={() => useScene.getState().setHoveredBody(key)}
          onClick={() => {
            const s = useScene.getState();
            s.setHoveredBody(s.hoveredBody === key ? null : key);
          }}
          className="absolute left-0 top-0 grid h-[26px] w-[26px] place-items-center rounded-full border border-[var(--color-core-gold)]/45 bg-[rgba(5,7,20,0.7)] transition-colors duration-200 hover:border-[var(--color-core-gold)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-core-gold)]"
          style={{ opacity: 0, visibility: 'hidden', willChange: 'transform' }}
        >
          <span aria-hidden className="block h-[6px] w-[6px] rounded-full bg-[var(--color-core-gold)]" />
        </button>
      ))}

      {/* Decorative-body tooltip — one node, re-used for whichever body is hovered. */}
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
            {action?.kind === 'cv' && !cvMissing && (
              <a
                href={action.href}
                download
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-core-gold)]/50 px-3 py-1 text-[12px] text-[var(--color-core-gold)] transition-colors hover:border-[var(--color-core-gold)] hover:bg-[var(--color-core-gold)]/10"
              >
                {fact.cta?.[locale]}
              </a>
            )}
            {showSoon && (
              <span className="mt-3 inline-flex items-center rounded-full border border-white/15 px-3 py-1 text-[12px] text-[var(--color-star-white)]/55">
                {(cvMissing ? BODY_FACTS.venus.cta : fact.cta)?.[locale]}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
