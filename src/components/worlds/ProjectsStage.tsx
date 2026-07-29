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
const ARC_GAP = 48; // px virtual gap between the window edge and the planet limb
const ARC_AMP = 120; // px max inset at the planet's equator (amplified so the arc reads)
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
      windows().forEach((el, i) => {
        el.style.transform = '';
        el.style.marginInline = `${Math.max(0, 26 - i * 9)}px`;
      });
      return;
    }

    let raf = 0;
    const rtl = document.documentElement.dir === 'rtl';
    const signEnd = rtl ? -1 : 1; // inline-end physical direction (planet side)
    const update = () => {
      const rect = projectedPlanetRect(window.innerWidth, window.innerHeight, rtl, false);
      for (const el of windows()) {
        el.style.marginInline = '';
        const r = el.getBoundingClientRect();
        const mid = r.top + r.height / 2;
        const tt = clamp((mid - rect.cy) / (rect.r + ARC_GAP), -1, 1);
        const curve = Math.sqrt(Math.max(0, 1 - tt * tt)); // 1 at the equator .. 0 beyond
        // Concave-toward-planet: the window at the planet's equator stays at the column
        // base (furthest from the planet, which bulges most there); windows above/below
        // slide toward the planet (inline-END) as its limb recedes. This keeps the whole
        // stack on-screen (never pushed off the inline-start edge) while its inner edge
        // mirrors the limb — cards floating like satellites along the curve.
        const push = (1 - curve) * ARC_AMP;
        const x = signEnd * push; // toward the planet at the extremes, 0 at the equator
        const rot = signEnd * tt * ARC_ROT; // tangential tilt following the limb
        el.style.transform = `translateX(${x.toFixed(2)}px) rotate(${rot.toFixed(2)}deg)`;
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
            : { insetInlineStart: 0, top: '4.75rem', bottom: '1.25rem', width: 'clamp(300px, 38vw, 31rem)', paddingInline: '1.5rem' }
        }
      >
        <header className="pointer-events-auto flex items-start justify-between gap-4 pt-1">
          <div>
            <h1
              className="text-2xl text-[var(--color-star-white)] md:text-3xl"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 300, letterSpacing: '0.03em' }}
            >
              {title}
            </h1>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-star-white)]/55 md:text-[13px]">{tagline}</p>
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
