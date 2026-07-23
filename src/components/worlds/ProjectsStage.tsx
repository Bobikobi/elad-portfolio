'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/lib/translations';
import { translations as tr } from '@/lib/translations';
import { homePath } from '@/lib/sections';
import { useScene } from '@/lib/sceneStore';
import { projectedPlanetRect } from '@/lib/orbitFraming';

const t = (k: string, l: Locale) => tr[k]?.[l] ?? k;
const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

// Departure gesture tuning.
const THRESH = 180; // px accumulated outside the list to commit the return flight
const DECAY_PER_S = THRESH / 0.8; // meter fully decays in ~0.8s once input stops
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
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);
  const setDeparture = useScene((s) => s.setDeparture);
  const [portrait, setPortrait] = useState(false);
  const [meterUi, setMeterUi] = useState(0);

  // Return to the solar overview. Mark the intro as seen so the home route lands in
  // the overview (not a re-dive), then navigate — the URL is the source of truth and
  // CosmicStage's bridge clears the focus so the camera flies back.
  const returningRef = useRef(false);
  const returnHome = () => {
    if (returningRef.current) return;
    returningRef.current = true;
    try { sessionStorage.setItem('seen-intro', '1'); } catch {}
    setDeparture(0);
    router.push(homePath(locale));
  };

  // Reset the meter on mount/unmount so a stale value never scrubs the next world.
  useEffect(() => {
    setDeparture(0);
    return () => setDeparture(0);
  }, [setDeparture]);

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

  // --- Departure meter (scroll outside the list). ---
  useEffect(() => {
    const inList = (target: EventTarget | null) => !!(target instanceof Node && listRef.current?.contains(target));
    let meter = 0;
    let last = 0;
    let decayRaf = 0;
    let prevTs = 0;

    const apply = () => {
      const v = clamp(meter / THRESH, 0, 1);
      setDeparture(v);
      setMeterUi(v);
      if (meter >= THRESH) returnHome();
    };
    const decay = (ts: number) => {
      const dt = prevTs ? (ts - prevTs) / 1000 : 0;
      prevTs = ts;
      if (performance.now() - last > 60) {
        meter = Math.max(0, meter - DECAY_PER_S * dt);
        apply();
      }
      if (meter > 0 && !returningRef.current) decayRaf = requestAnimationFrame(decay);
      else { decayRaf = 0; prevTs = 0; }
    };
    const bump = (amount: number) => {
      meter = Math.min(THRESH * 1.1, meter + amount);
      last = performance.now();
      apply();
      if (!decayRaf && !returningRef.current) { prevTs = 0; decayRaf = requestAnimationFrame(decay); }
    };

    const onWheel = (e: WheelEvent) => {
      if (returningRef.current) { e.preventDefault(); return; }
      if (inList(e.target)) return; // native content scroll
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      bump(Math.abs(e.deltaY) * unit);
    };

    let touchY = 0;
    let touchInList = false;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? 0;
      touchInList = inList(e.target);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchInList || returningRef.current) return;
      const y = e.touches[0]?.clientY ?? 0;
      const dy = touchY - y;
      touchY = y;
      e.preventDefault();
      bump(Math.abs(dy));
    };

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') returnHome(); };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(decayRaf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <button
            onClick={returnHome}
            className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-white/15 bg-[rgba(5,7,20,0.6)] px-3 py-1 text-xs text-[var(--color-star-white)]/75 transition-colors hover:border-[var(--color-core-gold)]/60 hover:text-[var(--color-core-gold)]"
          >
            <span aria-hidden>↩</span>
            {back}
          </button>
        </header>

        <div ref={listRef} className="world-scroll pointer-events-auto flex-1 pt-1">
          <div className="flex flex-col gap-3 pb-6">{children}</div>
        </div>
      </div>

      {/* Departure indicator — orbit-arc + localized hint, fades in with the meter. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-[8dvh] flex flex-col items-center gap-2 transition-opacity duration-200"
        style={{ opacity: meterUi }}
        aria-hidden={meterUi < 0.05}
      >
        <svg width="46" height="24" viewBox="0 0 46 24" fill="none">
          <path d="M2 22 A 40 40 0 0 1 44 22" stroke="var(--color-core-gold)" strokeWidth="1" strokeOpacity="0.5" fill="none" />
          <circle cx={2 + 42 * clamp(meterUi, 0, 1)} cy={22 - 20 * Math.sin(Math.PI * clamp(meterUi, 0, 1))} r="2.5" fill="var(--color-core-gold)" />
        </svg>
        <span className="text-[11px] tracking-[0.14em] text-[var(--color-core-gold)]/80">{departureLabel}</span>
      </div>
    </div>
  );
}
