'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { Locale } from '@/lib/translations';
import { translations as tr } from '@/lib/translations';
import { homePath } from '@/lib/sections';
import {
  ringMetrics,
  sectorPath,
  innerArcPath,
  pointAt,
  windowArc,
  scrollSpan,
  type RingMetrics,
} from '@/lib/ringGeometry';
import { useWorldExit } from '@/hooks/useWorldExit';
import DepartureMeter from './DepartureMeter';

const t = (k: string, l: Locale) => tr[k]?.[l] ?? k;
const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * The Projects "Jupiter frame". Each project is its own floating window and every window
 * is an ANNULAR SECTOR around the focused planet (B8b): concave inner arc concentric with
 * the limb, radial side edges that diverge outward, gentle convex outer arc. The windows
 * fan around the planet like a ring and TRAVEL ALONG that ring as the list scrolls — the
 * ring itself never moves, because it is derived from the planet's projection every frame.
 *
 * Why the shape is an SVG <path> and not a clip-path on a div: a clip-path clips the
 * border away with everything else, and the hairline following all four curves is most of
 * what makes these read as windows rather than as masked rectangles. So the shape is a
 * real path (fill + stroke + a gold accent stroked along the inner arc only), and the HTML
 * content sits on top of it, rotated onto the same radius.
 *
 * Scrolling: the list is a real scroll container (native wheel, touch, keyboard, and the
 * departure gesture's `inContent` test all keep working) whose scrollTop is read in the
 * layout rAF and converted to arc length — scrollDelta / rMid radians. Nothing here is
 * React state; the departure meter re-renders every frame during a gesture and would
 * otherwise fight the layer for every attribute it owns.
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
  const deckRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [portrait, setPortrait] = useState(false);
  // Escape / scroll-away / back — the shared world exit (R5.1, R5.10). Scrolling inside
  // the ring stays native content scroll; anywhere else builds the departure meter.
  const { meter, returnHome } = useWorldExit(locale, listRef);

  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait), (max-width: 767px)');
    const on = () => setPortrait(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // --- The ring layer: paths, transforms, scroll → angle. One rAF, attributes only. ---
  useEffect(() => {
    const list = listRef.current;
    const deck = deckRef.current;
    const rail = railRef.current;
    const svg = svgRef.current;
    if (!list || !deck || !rail || !svg) return;

    const rtl = document.documentElement.dir === 'rtl';
    // `?ringprobe=1` publishes the frame the layer actually used, so the acceptance
    // measurements assert against the same numbers the camera is framed from instead of
    // re-deriving them. Off by default — nothing extra reaches a normal render.
    const probe = new URLSearchParams(window.location.search).has('ringprobe');
    const cards = Array.from(deck.querySelectorAll<HTMLElement>('[data-window]'));
    const n = cards.length;

    // One <path> for the window, one for the gold inner-arc accent, one gradient each.
    // Written by the layout pass, read by the focus handlers below.
    const pitchRef = { current: 1 };
    const centreOffsetRef = { current: 0 };
    const spanRef = { current: 0 };

    const defs = document.createElementNS(SVG_NS, 'defs');
    svg.appendChild(defs);
    const bodies: SVGPathElement[] = [];
    const accents: SVGPathElement[] = [];
    const grads: SVGLinearGradientElement[] = [];
    const unbind: Array<() => void> = [];
    cards.forEach((card, i) => {
      const grad = document.createElementNS(SVG_NS, 'linearGradient');
      grad.setAttribute('id', `ring-accent-${i}`);
      grad.setAttribute('gradientUnits', 'userSpaceOnUse');
      for (const [offset, opacity] of [['0%', '0'], ['50%', '0.75'], ['100%', '0']] as const) {
        const stop = document.createElementNS(SVG_NS, 'stop');
        stop.setAttribute('offset', offset);
        stop.setAttribute('stop-color', 'rgb(255,201,120)');
        stop.setAttribute('stop-opacity', opacity);
        grad.appendChild(stop);
      }
      defs.appendChild(grad);
      grads.push(grad);

      const body = document.createElementNS(SVG_NS, 'path');
      body.setAttribute('class', 'ring-window');
      svg.appendChild(body);
      bodies.push(body);

      const accent = document.createElementNS(SVG_NS, 'path');
      accent.setAttribute('class', 'ring-accent');
      accent.setAttribute('fill', 'none');
      accent.setAttribute('stroke', `url(#ring-accent-${i})`);
      accent.setAttribute('stroke-width', '1.5');
      svg.appendChild(accent);
      accents.push(accent);

      // Hover and focus light the window's own path — the shape is not an ancestor of the
      // content, so the usual CSS hover has nothing to hang off.
      const hot = (on: boolean) => {
        body.classList.toggle('is-hot', on);
        accent.classList.toggle('is-hot', on);
      };
      const onEnter = () => hot(true);
      const onLeave = () => hot(false);
      const onFocus = () => {
        hot(true);
        // Keyboard focus must be able to reach a window that is currently off the fan.
        const target = clamp(i * pitchRef.current - centreOffsetRef.current, 0, spanRef.current);
        list.scrollTo({ top: target, behavior: 'smooth' });
      };
      card.addEventListener('pointerenter', onEnter);
      card.addEventListener('pointerleave', onLeave);
      card.addEventListener('focusin', onFocus);
      card.addEventListener('focusout', onLeave);
      unbind.push(() => {
        card.removeEventListener('pointerenter', onEnter);
        card.removeEventListener('pointerleave', onLeave);
        card.removeEventListener('focusin', onFocus);
        card.removeEventListener('focusout', onLeave);
      });
    });

    /** Bounding box of the whole fan, sampled off the sector boundary so it is right for
     *  every locale and both orientations without four hand-written cases. */
    const fanBox = (m: RingMetrics) => {
      const reach = m.fan + m.dHalf;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let s = 0; s <= 24; s++) {
        const th = m.th0 - reach + (2 * reach * s) / 24;
        for (const r of [m.r0, m.r1]) {
          const [x, y] = pointAt(m, r, th);
          if (x < x0) x0 = x;
          if (y < y0) y0 = y;
          if (x > x1) x1 = x;
          if (y > y1) y1 = y;
        }
      }
      return { x: x0 - 12, y: y0 - 12, w: x1 - x0 + 24, h: y1 - y0 + 24 };
    };

    let raf = 0;
    let sig = '';
    const update = (force = false) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const m = ringMetrics(vw, vh, rtl, portrait);
      // The rig's pose has a live micro-drift, so the ring has to be rebuilt whenever the
      // limb moves — but only then. This guard is what keeps a 60Hz loop from doing 12
      // path rebuilds a frame while the planet is settled and nobody is scrolling.
      const next = `${vw}|${vh}|${m.cx.toFixed(1)}|${m.cy.toFixed(1)}|${m.R.toFixed(1)}|${Math.round(list.scrollTop)}`;
      if (!force && next === sig) return;
      sig = next;
      const t0 = probe ? performance.now() : 0;
      pitchRef.current = m.pitch;
      centreOffsetRef.current = m.fan * m.rMid - m.pitch / 2;

      svg.setAttribute('width', String(vw));
      svg.setAttribute('height', String(vh));

      const box = fanBox(m);
      const L = clamp(box.x, 0, vw);
      const T = clamp(box.y, 0, vh);
      list.style.insetInlineStart = '';
      list.style.left = `${L.toFixed(1)}px`;
      list.style.top = `${T.toFixed(1)}px`;
      list.style.width = `${Math.min(box.w, vw - L).toFixed(1)}px`;
      list.style.height = `${Math.min(box.h, vh - T).toFixed(1)}px`;

      const span = scrollSpan(n, m);
      spanRef.current = span;
      rail.style.height = `${(list.clientHeight + span).toFixed(1)}px`;
      const scroll = clamp(list.scrollTop, 0, span);

      const head = headerRef.current;
      if (head && !m.portrait) {
        // The header takes the strip the ring leaves free — which side that is comes off
        // the planet for the same reason the fan's side does.
        head.style.setProperty('--ring-header-w', `${m.headerW.toFixed(1)}px`);
        head.style.insetInlineStart = 'auto';
        head.style.left = m.th0 === 0 ? 'auto' : '0';
        head.style.right = m.th0 === 0 ? '0' : 'auto';
      }

      for (let i = 0; i < n; i++) {
        const a = windowArc(i, n, scroll, m);
        const th = m.th0 + (m.sweep * a) / m.rMid;
        const off = Math.abs(th - m.th0);
        // Windows dissolve as they leave the readable part of the fan instead of popping.
        // The band is deliberately short and the falloff steep: a half-faded window is a
        // ghost with legible text in it, and the ring looked like it had a rendering bug
        // when one sat there at 30% for the whole length of the fan.
        const over = off + m.dHalf - m.fan;
        const opacity = clamp(1 - over / (m.dHalf * 0.75), 0, 1) ** 2;
        const card = cards[i];
        const body = bodies[i];
        const accent = accents[i];

        if (opacity <= 0.012) {
          card.style.visibility = 'hidden';
          body.setAttribute('d', '');
          accent.setAttribute('d', '');
          continue;
        }
        card.style.visibility = '';
        body.setAttribute('d', sectorPath(m, m.r0, m.r1, th - m.dHalf, th + m.dHalf));
        body.setAttribute('opacity', opacity.toFixed(3));
        accent.setAttribute('d', innerArcPath(m, m.r0, th - m.dHalf, th + m.dHalf));
        accent.setAttribute('opacity', opacity.toFixed(3));

        const [gx0, gy0] = pointAt(m, m.r0, th - m.dHalf);
        const [gx1, gy1] = pointAt(m, m.r0, th + m.dHalf);
        const g = grads[i];
        g.setAttribute('x1', gx0.toFixed(1));
        g.setAttribute('y1', gy0.toFixed(1));
        g.setAttribute('x2', gx1.toFixed(1));
        g.setAttribute('y2', gy1.toFixed(1));

        const [cxp, cyp] = pointAt(m, m.rContent, th);
        const rot = ((th - m.th0) * 180) / Math.PI;
        card.style.width = `${(m.portrait ? m.contentHalf * 2 : m.contentDepth).toFixed(1)}px`;
        card.style.height = `${(m.portrait ? m.contentDepth : m.contentHalf * 2).toFixed(1)}px`;
        card.style.opacity = opacity.toFixed(3);
        card.style.transform =
          `translate(${(cxp - L).toFixed(1)}px, ${(cyp - T).toFixed(1)}px)` +
          ` rotate(${rot.toFixed(2)}deg) translate(-50%, -50%)`;
      }
      list.dataset.ready = '1';
      if (probe) {
        svg.dataset.ring = JSON.stringify({
          cx: m.cx, cy: m.cy, R: m.R, r0: m.r0, r1: m.r1,
          rMid: m.rMid, dHalf: m.dHalf, fan: m.fan, th0: m.th0, sweep: m.sweep,
          contentDepth: m.contentDepth, contentHalf: m.contentHalf, scroll, span,
          costMs: +(performance.now() - t0).toFixed(3),
        });
      }
    };

    // One loop, the same one the limb is published from: scroll, resize and the planet's
    // own drift all arrive as a changed signature, so there is nothing to subscribe to and
    // nothing that can update half a frame late and shear the ring off its planet.
    const loop = () => {
      update();
      raf = requestAnimationFrame(loop);
    };
    update(true);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      unbind.forEach((fn) => fn());
      defs.remove();
      bodies.forEach((p) => p.remove());
      accents.forEach((p) => p.remove());
      for (const card of cards) card.style.cssText = '';
      delete list.dataset.ready;
    };
  }, [portrait, children]);

  const back = t('contact.back', locale);
  const departureLabel = t('world.departure', locale);

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      {/* Header — the strip of screen the ring leaves free on the far side of the fan. */}
      <header
        ref={headerRef}
        className="pointer-events-none absolute flex items-start justify-between gap-3"
        style={
          portrait
            ? { insetInlineStart: 0, insetInlineEnd: 0, top: '4.75rem', padding: '0 1rem' }
            : { insetInlineStart: 0, top: '4.75rem', width: 'var(--ring-header-w, 18rem)', padding: '0 1.5rem' }
        }
      >
        <div className="pointer-events-auto">
          <h1 className="text-2xl text-[var(--color-star-white)] md:text-3xl">{title}</h1>
          <p className="world-body mt-2 text-[var(--color-star-white)]/55">{tagline}</p>
        </div>
        <Link
          href={homePath(locale)}
          data-world-back=""
          onClick={(e) => { e.preventDefault(); returnHome(); }}
          className="pointer-events-auto mt-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-white/15 bg-[rgba(5,7,20,0.6)] px-3 py-1 text-xs text-[var(--color-star-white)]/75 transition-colors hover:border-[var(--color-core-gold)]/60 hover:text-[var(--color-core-gold)]"
        >
          <span aria-hidden>↩</span>
          {back}
        </Link>
      </header>

      {/* The shapes. Screen-space px (no viewBox), under the content, never interactive. */}
      <svg ref={svgRef} className="ring-layer pointer-events-none absolute inset-0 h-full w-full" aria-hidden />

      {/* The list: a real scroll container over the fan. The rail gives it something to
          scroll; the deck is sticky and zero-height so the windows stay put in screen
          space while scrollTop turns into arc length. */}
      <div
        ref={listRef}
        data-chrome=""
        className="ring-scroll pointer-events-auto absolute"
      >
        {/* Deck first: a sticky box only stays put from its OWN normal position onward,
            so it has to start at the top of the scroll content, with the rail below it. */}
        <div ref={deckRef} className="sticky top-0 h-0">
          {children}
        </div>
        <div ref={railRef} aria-hidden />
      </div>

      <DepartureMeter value={meter} label={departureLabel} />
    </div>
  );
}
