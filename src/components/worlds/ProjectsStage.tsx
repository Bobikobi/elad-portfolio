'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { Locale } from '@/lib/translations';
import { translations as tr } from '@/lib/translations';
import { homePath } from '@/lib/sections';
import { projectedPlanetRect } from '@/lib/orbitFraming';
import { useWorldExit } from '@/hooks/useWorldExit';
import DepartureMeter from './DepartureMeter';

const t = (k: string, l: Locale) => tr[k]?.[l] ?? k;
const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

// Arc shaping (desktop).
//
// B8 — the arc had the right SHAPE and the wrong everything else. It applied a bump of at
// most ARC_AMP=120px to a column whose width was a CSS clamp with no relationship to the
// planet, so measured on the alias the windows' inner edges sat 254-439px clear of the
// limb they were supposed to be following, and the bump was about a quarter of the limb's
// real inset (306px at this framing). What you saw was a straight column of cards with a
// void between them and the planet — the curvature was there in the code and nowhere on
// the screen.
//
// So both numbers now come from the planet's own projected circle instead of being
// invented. The column's inner edge is placed ARC_GAP off the limb at the equator, and
// each window tucks toward the planet by exactly the amount the limb recedes at ITS
// height — a constant gap along the whole curve — up to ARC_TUCK, which stops the top and
// bottom cards sliding across the disc. The column's width is derived from the same
// circle, so the geometry holds at any viewport; the ratio cap only guards silly aspects.
const ARC_GAP = 26; // px gap between a window's inner edge and the limb
const ARC_TUCK = 84; // px — the most a window may tuck past the equator line
const ARC_MAX_COL = 0.56; // fraction of the viewport width the column may occupy
const ARC_ROT = 3.6; // deg max tangential tilt

/**
 * The Projects "Jupiter frame": each project is its OWN floating glass window (no outer
 * container). Windows stack vertically in a content column on the inline-START side and
 * their inner edge curves against the focused planet's limb (arc locked to the planet
 * via the shared orbitFraming constants — a per-frame CSS-var/transform layer, never
 * per-frame React state). Scroll steering: scrolling INSIDE the list is content scroll
 * (own container, overscroll-contain); scrolling OUTSIDE (over the planet / open space)
 * builds a departure meter that scrubs the camera back and, on commit, flies home.
 * Esc and the visible back button always return.
 */
export default function ProjectsStage({
  locale,
  title,
  tagline,
  children,
}: {
  locale: Locale;
  title: string;
  tagline: string;
  children: ReactNode;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [portrait, setPortrait] = useState(false);
  // Escape / scroll-away / back — the shared world exit (R5.1, R5.10). Scrolling inside
  // the window list stays native content scroll; anywhere else builds the meter.
  const { meter, returnHome } = useWorldExit(locale, listRef);

  // Track orientation.
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait), (max-width: 767px)');
    const on = () => setPortrait(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // --- Arc layout: curve each window's inner edge against the planet limb. ---
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const windows = () => Array.from(list.querySelectorAll<HTMLElement>('[data-window]'));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (portrait) {
      // Portrait: no arc sweep. Static tapered insets — the first window (nearest the
      // planet's lower limb) is inset most, each one below widens toward full width, so
      // the stack "opens" out of the planet's curve.
      (list.parentElement as HTMLElement | null)?.style.removeProperty('--arc-col-w');
      windows().forEach((el, i) => {
        el.style.transform = '';
        el.style.marginInlineEnd = '';
        el.style.marginInline = `${Math.max(0, 26 - i * 9)}px`;
      });
      return;
    }

    let raf = 0;
    const rtl = document.documentElement.dir === 'rtl';
    const signEnd = rtl ? -1 : 1; // inline-end physical direction (planet side)
    const column = list.parentElement as HTMLElement | null;
    const update = () => {
      const vw = window.innerWidth;
      const rect = projectedPlanetRect(vw, window.innerHeight, rtl, false);
      // The column runs from the inline-start screen edge to the MOST tucked position any
      // window can take; every window then gives back the difference as an inline-end
      // margin, so nothing ever needs a negative margin or overflows.
      // The column's own inline padding sits between its box edge and the windows, so it
      // has to be part of the width or every gap comes out one padding too wide.
      const padEnd = column ? parseFloat(getComputedStyle(column).paddingInlineEnd) || 0 : 0;
      const geometric = vw - (rect.cx + rect.r + ARC_GAP - ARC_TUCK) + padEnd;
      const colWidth = clamp(geometric, 300, vw * ARC_MAX_COL);
      // Through a custom property, not `style.width`: the departure meter is React state
      // that ticks every frame, so any width React owns would be re-asserted mid-gesture
      // and snap the column back to its CSS fallback. React never diffs a property it does
      // not declare, so this one survives every re-render.
      column?.style.setProperty('--arc-col-w', `${colWidth.toFixed(1)}px`);

      for (const el of windows()) {
        el.style.marginInline = '';
        const r = el.getBoundingClientRect();
        const mid = r.top + r.height / 2;
        const dy = mid - rect.cy;
        // Half-chord of the planet's circle at this window's height: the limb's horizontal
        // extent there. `rect.r - halfChord` is exactly how far the limb has receded, which
        // is exactly how far the window may move toward it while keeping the gap constant.
        const halfChord = Math.abs(dy) < rect.r ? Math.sqrt(rect.r * rect.r - dy * dy) : 0;
        const tuck = Math.min(ARC_TUCK, rect.r - halfChord);
        el.style.marginInlineEnd = `${(ARC_TUCK - tuck).toFixed(1)}px`;
        // Tangential tilt, following the limb's slope rather than a linear ramp.
        const tt = clamp(dy / rect.r, -1, 1);
        const rot = signEnd * tt * ARC_ROT;
        el.style.transform = `rotate(${rot.toFixed(2)}deg)`;
      }
    };
    update();
    if (reduce) return; // static, no scroll coupling
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    document.addEventListener('scroll', onScroll, true); // capture: the list's own scroll too
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [portrait]);

  // --- Window enter stagger (once, when scrolled into view). ---
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }),
      { root: list, threshold: 0.15 }
    );
    list.querySelectorAll('[data-window]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const back = t('contact.back', locale);
  const departureLabel = t('world.departure', locale);

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      {/* Content column — inline-START side; the planet owns the opposite side. */}
      <div
        className="pointer-events-none absolute flex flex-col gap-3"
        style={
          portrait
            ? { insetInlineStart: 0, insetInlineEnd: 0, top: '44dvh', bottom: 0, padding: '0 1rem 1rem' }
            : {
                insetInlineStart: 0,
                top: '4.75rem',
                bottom: '1.25rem',
                // Owned by the arc layer (B8) — the fallback is only what shows before the
                // first measurement, and on reduced-motion where the arc runs once.
                width: 'var(--arc-col-w, clamp(300px, 38vw, 31rem))',
                paddingInline: '1.5rem',
              }
        }
      >
        <header className="pointer-events-auto flex items-start justify-between gap-4 pt-1">
          <div>
            <h1
              className="text-2xl text-[var(--color-star-white)] md:text-3xl"
            >
              {title}
            </h1>
            <p className="world-body mt-2 text-[var(--color-star-white)]/55">{tagline}</p>
          </div>
          <Link
            href={homePath(locale)}
            data-world-back=""
            onClick={(e) => { e.preventDefault(); returnHome(); }}
            className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-white/15 bg-[rgba(5,7,20,0.6)] px-3 py-1 text-xs text-[var(--color-star-white)]/75 transition-colors hover:border-[var(--color-core-gold)]/60 hover:text-[var(--color-core-gold)]"
          >
            <span aria-hidden>↩</span>
            {back}
          </Link>
        </header>

        <div ref={listRef} data-chrome="" className="world-scroll pointer-events-auto flex-1 pt-1">
          <div className="flex flex-col gap-3 pb-6">{children}</div>
        </div>
      </div>

      {/* Departure indicator — orbit-arc + localized hint, fades in with the meter. */}
      <DepartureMeter value={meter} label={departureLabel} />
    </div>
  );
}
