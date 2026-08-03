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
  arcPath,
  arcUp,
  arcDown,
  fanOpacity,
  fanRise,
  screenAt,
  type RingMetrics,
} from '@/lib/ringGeometry';
import { livePlanetPlane } from '@/lib/orbitFraming';
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
  const panelRef = useRef<HTMLDivElement>(null);
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
    const panel = panelRef.current;
    if (!list || !deck || !rail || !svg || !panel) return;
    const panelTitle = panel.querySelector<HTMLElement>('[data-panel-title]')!;
    const panelDesc = panel.querySelector<HTMLElement>('[data-panel-desc]')!;
    const panelTech = panel.querySelector<HTMLElement>('[data-panel-tech]')!;

    const rtl = document.documentElement.dir === 'rtl';
    // `?ringprobe=1` publishes the frame the layer actually used, so the acceptance
    // measurements assert against the same numbers the camera is framed from instead of
    // re-deriving them. Off by default — nothing extra reaches a normal render.
    const probe = new URLSearchParams(window.location.search).has('ringprobe');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // The owner wants the words only while the pointer is on a window. A phone has no
    // pointer, so there the panel falls back to naming whichever window is at the centre
    // of the fan - otherwise a touch device would show twelve pictures and no way to
    // learn what any of them is.
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const cards = Array.from(deck.querySelectorAll<HTMLElement>('[data-window]'));
    const n = cards.length;

    // One <path> for the window, one for the gold inner-arc accent, one gradient each.
    // Written by the layout pass, read by the focus handlers below.
    const pitchRef = { current: 1 };
    const hovered = { current: -1 };
    const shownActive = { current: -2 };
    const centreOffsetRef = { current: 0 };
    const spanRef = { current: 0 };

    const defs = document.createElementNS(SVG_NS, 'defs');
    svg.appendChild(defs);
    // Every path below is built in CANONICAL space around the origin; this group carries
    // it to the screen. When the planet's ring plane is known that matrix is the plane's
    // projection, so the windows become slices of the same plane the rings lie in - and
    // the arcs, the corner joins and the rail stay circular maths in a file that never
    // learns what an ellipse is.
    const space = document.createElementNS(SVG_NS, 'g');
    svg.appendChild(space);
    const bodies: SVGPathElement[] = [];
    const accents: SVGPathElement[] = [];
    const grads: SVGLinearGradientElement[] = [];
    const photos: Array<SVGImageElement | null> = [];
    const hits: SVGGElement[] = [];
    const clips: Array<SVGPathElement | null> = [];
    const marks: Array<SVGTextElement | null> = [];
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

      // The preview, painted INTO the sector and clipped to it (B8c). Putting it in an
      // element inside the content box drew a second rounded rectangle within the ring
      // segment - a window inside a window. Clipped to the shape there is only ever one
      // outline, and the photo picks up the curves for free.
      const src = card.dataset.preview;
      let photo: SVGImageElement | null = null;
      let clipPath: SVGPathElement | null = null;
      if (src) {
        const clip = document.createElementNS(SVG_NS, 'clipPath');
        clip.setAttribute('id', `ring-clip-${i}`);
        clipPath = document.createElementNS(SVG_NS, 'path');
        clip.appendChild(clipPath);
        defs.appendChild(clip);

        photo = document.createElementNS(SVG_NS, 'image');
        photo.setAttribute('class', 'ring-photo');
        photo.setAttribute('href', src);
        photo.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        photo.setAttribute('clip-path', `url(#ring-clip-${i})`);
      }
      photos.push(photo);
      clips.push(clipPath);

      // No screenshot to show: four of the twelve are tools and private work with no
      // site to photograph. A drawn monogram beats an empty pane, and it needs no asset.
      let mark: SVGTextElement | null = null;
      if (!src && card.dataset.mark) {
        mark = document.createElementNS(SVG_NS, 'text');
        mark.setAttribute('class', 'ring-mark');
        mark.setAttribute('text-anchor', 'middle');
        mark.setAttribute('dominant-baseline', 'central');
        mark.setAttribute('fill', 'rgba(255,201,120,0.30)');
        mark.setAttribute('style', 'font-family: var(--font-display); font-weight: 300; letter-spacing: 0.08em');
        mark.textContent = card.dataset.mark;
      }
      marks.push(mark);

      // B8d - the SHAPE is the control. The accessible copy of this project is a real
      // link in the DOM (off-screen, see ProjectsWorld); this group is its painted face,
      // so it is aria-hidden and the pointer is what it answers to. Hit-testing then
      // follows the sector exactly instead of a rectangle drawn around it.
      const hitG = document.createElementNS(SVG_NS, 'g');
      hitG.setAttribute('aria-hidden', 'true');
      hitG.setAttribute('style', 'pointer-events: auto; cursor: pointer');
      space.appendChild(hitG);
      hits.push(hitG);
      if (photo) hitG.appendChild(photo);

      const body = document.createElementNS(SVG_NS, 'path');
      body.setAttribute('class', 'ring-window');
      // The plane matrix scales the two axes differently, so a stroke would come out
      // thicker one way than the other. This keeps the hairline a hairline.
      body.setAttribute('vector-effect', 'non-scaling-stroke');
      // B8d - the window IS the preview now, so the glass over it is a tint rather than a
      // surface: at the panel weight (0.78) under a 0.32 photo the screenshot was a dark
      // smudge. Set inline, not in the stylesheet, because `app/**` belongs to the other
      // session this round.
      if (src) body.style.fill = 'rgba(5, 7, 20, 0.30)';
      hitG.appendChild(body);
      bodies.push(body);

      const accent = document.createElementNS(SVG_NS, 'path');
      accent.setAttribute('class', 'ring-accent');
      accent.setAttribute('fill', 'none');
      accent.setAttribute('stroke', `url(#ring-accent-${i})`);
      accent.setAttribute('stroke-width', '1.5');
      accent.setAttribute('vector-effect', 'non-scaling-stroke');
      hitG.appendChild(accent);
      accents.push(accent);
      if (mark) hitG.appendChild(mark);

      // Hover and focus light the window's own path — the shape is not an ancestor of the
      // content, so the usual CSS hover has nothing to hang off.
      const hot = (on: boolean) => {
        body.classList.toggle('is-hot', on);
        accent.classList.toggle('is-hot', on);
        photo?.classList.toggle('is-hot', on);
      };
      const onEnter = () => { hot(true); hovered.current = i; };
      const onLeave = () => { hot(false); if (hovered.current === i) hovered.current = -1; };
      const onFocus = () => {
        hot(true);
        hovered.current = i;
        // Keyboard focus must be able to reach a window that is currently off the fan.
        const target = clamp(i * pitchRef.current - centreOffsetRef.current, 0, spanRef.current);
        list.scrollTo({ top: target, behavior: 'smooth' });
      };
      const onOpen = () => {
        const href = card.dataset.href;
        if (href) window.open(href, '_blank', 'noopener,noreferrer');
      };
      hitG.addEventListener('pointerenter', onEnter);
      hitG.addEventListener('pointerleave', onLeave);
      hitG.addEventListener('click', onOpen);
      card.addEventListener('focusin', onFocus);
      card.addEventListener('focusout', onLeave);
      unbind.push(() => {
        hitG.removeEventListener('pointerenter', onEnter);
        hitG.removeEventListener('pointerleave', onLeave);
        hitG.removeEventListener('click', onOpen);
        card.removeEventListener('focusin', onFocus);
        card.removeEventListener('focusout', onLeave);
      });
    });

    // The ring's own scrollbar (B8c): a rail concentric with the windows, outside them, so
    // "there are more of these" is said in the same geometry as the thing it describes.
    const railArc = document.createElementNS(SVG_NS, 'path');
    railArc.setAttribute('class', 'ring-rail');
    railArc.setAttribute('vector-effect', 'non-scaling-stroke');
    space.appendChild(railArc);
    const thumbArc = document.createElementNS(SVG_NS, 'path');
    thumbArc.setAttribute('class', 'ring-thumb');
    thumbArc.setAttribute('vector-effect', 'non-scaling-stroke');
    space.appendChild(thumbArc);

    /** Bounding box of the whole fan, sampled off the sector boundary so it is right for
     *  every locale and both orientations without four hand-written cases. */
    const fanBox = (m: RingMetrics) => {
      const up = m.fanUp + m.dHalf;
      const down = m.fanDown + m.dHalf;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let s = 0; s <= 24; s++) {
        const th = m.th0 + m.sweep * (-up + ((up + down) * s) / 24);
        for (const r of [m.r0, m.r1]) {
          const [x, y] = screenAt(m, r, th);
          if (x < x0) x0 = x;
          if (y < y0) y0 = y;
          if (x > x1) x1 = x;
          if (y > y1) y1 = y;
        }
      }
      return { x: x0 - 12, y: y0 - 12, w: x1 - x0 + 24, h: y1 - y0 + 24 };
    };

    // The ruling: the canonical paths do not change as the ring turns, so they must not be
    // rebuilt as it turns. A window at angle th is the window at angle 0 rotated by th, so
    // the sector path, its clip, the photo's box and the accent's gradient are all built
    // ONCE at angle 0, and the only per-frame writes are a rotation and an opacity. They
    // are rebuilt only when the ring's SHAPE changes - r0, r1 or the half-angle - which
    // happens on a resize, not on a scroll.
    let shapeSig = '';
    const rebuildShape = (m: RingMetrics) => {
      const next = `${m.r0.toFixed(1)}|${m.r1.toFixed(1)}|${m.dHalf.toFixed(4)}|${m.corner}`;
      if (next === shapeSig) return;
      shapeSig = next;
      const d = sectorPath(m, m.r0, m.r1, -m.dHalf, m.dHalf);
      const acc = innerArcPath(m, m.r0, -m.dHalf, m.dHalf);
      // The photo's box: the sector's bounding box at angle 0, in canonical space.
      let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
      for (let k = 0; k <= 8; k++) {
        const a2 = -m.dHalf + (2 * m.dHalf * k) / 8;
        for (const r of [m.r0, m.r1]) {
          const [px, py] = pointAt(m, r, a2);
          if (px < bx0) bx0 = px;
          if (py < by0) by0 = py;
          if (px > bx1) bx1 = px;
          if (py > by1) by1 = py;
        }
      }
      const [gx0, gy0] = pointAt(m, m.r0, -m.dHalf);
      const [gx1, gy1] = pointAt(m, m.r0, m.dHalf);
      for (let i = 0; i < n; i++) {
        bodies[i].setAttribute('d', d);
        accents[i].setAttribute('d', acc);
        clips[i]?.setAttribute('d', d);
        const photo = photos[i];
        if (photo) {
          photo.setAttribute('x', bx0.toFixed(1));
          photo.setAttribute('y', by0.toFixed(1));
          photo.setAttribute('width', (bx1 - bx0).toFixed(1));
          photo.setAttribute('height', (by1 - by0).toFixed(1));
        }
        const mark = marks[i];
        if (mark) {
          mark.setAttribute('x', m.rContent.toFixed(1));
          mark.setAttribute('y', '0');
          mark.setAttribute('font-size', Math.max(22, Math.min(64, m.contentHalf * 1.5)).toFixed(0));
        }
        const g = grads[i];
        g.setAttribute('x1', gx0.toFixed(1));
        g.setAttribute('y1', gy0.toFixed(1));
        g.setAttribute('x2', gx1.toFixed(1));
        g.setAttribute('y2', gy1.toFixed(1));
      }
    };

    let raf = 0;
    let sig = '';
    // B8c — the ring follows a DAMPED copy of scrollTop, not scrollTop itself. A wheel
    // notch is ~100px in one step, which at this radius is eleven degrees of rotation in
    // a single frame: the windows arrived in jumps however smooth the rest of the frame
    // was. The native scroll still owns the position (so the wheel, the trackpad, touch,
    // the keyboard and the departure gesture all keep working unchanged); only what the
    // ring DRAWS is eased toward it.
    const SCROLL_TAU = 0.085; // seconds to 1/e — quick enough not to feel like lag
    let shown = 0;
    let lastT = 0;
    const update = (force = false) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const m = ringMetrics(vw, vh, rtl, portrait);
      const now = performance.now();
      const dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0;
      lastT = now;
      const span0 = scrollSpan(n, m);
      const target = clamp(list.scrollTop, 0, span0);
      if (force || reduce) shown = target;
      else {
        shown += (target - shown) * (1 - Math.exp(-dt / SCROLL_TAU));
        if (Math.abs(target - shown) < 0.25) shown = target;
      }
      // The rig's pose has a live micro-drift, so the ring has to be rebuilt whenever the
      // limb moves — but only then. This guard is what keeps a 60Hz loop from doing 12
      // path rebuilds a frame while the planet is settled and nobody is scrolling.
      const next = `${vw}|${vh}|${m.cx.toFixed(1)}|${m.cy.toFixed(1)}|${m.R.toFixed(1)}|${shown.toFixed(1)}`;
      if (!force && next === sig) return;
      sig = next;
      const t0 = probe ? performance.now() : 0;
      pitchRef.current = m.pitch;
      centreOffsetRef.current = arcUp(m) - Math.min(m.pitch / 2, arcUp(m));

      svg.setAttribute('width', String(vw));
      svg.setAttribute('height', String(vh));
      space.setAttribute('transform', `matrix(${m.matrix.map((v) => v.toFixed(4)).join(' ')})`);

      const box = fanBox(m);
      const L = clamp(box.x, 0, vw);
      const T = clamp(box.y, 0, vh);
      list.style.insetInlineStart = '';
      list.style.left = `${L.toFixed(1)}px`;
      list.style.top = `${T.toFixed(1)}px`;
      list.style.width = `${Math.min(box.w, vw - L).toFixed(1)}px`;
      list.style.height = `${Math.min(box.h, vh - T).toFixed(1)}px`;

      const span = span0;
      spanRef.current = span;
      rail.style.height = `${(list.clientHeight + span).toFixed(1)}px`;
      const scroll = shown;

      const head = headerRef.current;
      if (head && !m.portrait) {
        // The header takes the strip the ring leaves free — which side that is comes off
        // the planet for the same reason the fan's side does.
        head.style.setProperty('--ring-header-w', `${m.headerW.toFixed(1)}px`);
        head.style.insetInlineStart = 'auto';
        head.style.left = m.th0 === 0 ? 'auto' : '0';
        head.style.right = m.th0 === 0 ? '0' : 'auto';
      }

      // Which window is nearest the fan's centre, computed before anything is drawn: it
      // is both what the panel describes when nothing is hovered and the guarantee that
      // SOMETHING is on screen when the clamp has left almost no fan at all.
      let centred = -1;
      let bestA = Infinity;
      for (let i = 0; i < n; i++) {
        const a = windowArc(i, n, scroll, m);
        if (Math.abs(a) < Math.abs(bestA)) { bestA = a; centred = i; }
      }
      rebuildShape(m);
      for (let i = 0; i < n; i++) {
        const a = windowArc(i, n, scroll, m);
        const th = m.th0 + (m.sweep * a) / m.rMid;
        const opacity = i === centred ? Math.max(fanOpacity(a, m), 1) : fanOpacity(a, m);
        const g = hits[i];
        if (opacity <= 0.004) {
          if (g.style.display !== 'none') g.style.display = 'none';
          continue;
        }
        if (g.style.display) g.style.display = '';
        // The only per-frame writes on a window: where it is on the ring, and how present
        // it is. Everything else was built at angle 0 and is carried by these two.
        // A window rises out of the ring rather than switching on where it stands: the
        // scale is about the ring's centre, so it travels along its own radius.
        const rise = i === centred ? 1 : fanRise(a, m);
        const k = 0.93 + 0.07 * rise;
        g.setAttribute(
          'transform',
          `rotate(${((th * 180) / Math.PI).toFixed(3)}) scale(${k.toFixed(4)})`
        );
        g.style.opacity = opacity.toFixed(3);
      }

      // The rail. It only exists when there is something to scroll, and the thumb's LENGTH
      // is the fraction of the ring currently on screen - the same information a scrollbar
      // gives, said as an arc.
      const rTrack = m.r1 + 16;
      if (span > 1) {
        const visible = arcUp(m) + arcDown(m);
        const frac = clamp(visible / (visible + span), 0.08, 1);
        const at = span > 0 ? clamp(shown / span, 0, 1) : 0;
        const a0 = m.th0 - m.sweep * m.fanUp;
        const a1 = m.th0 + m.sweep * m.fanDown;
        const t0a = a0 + (a1 - a0) * (at * (1 - frac));
        const t1a = a0 + (a1 - a0) * (at * (1 - frac) + frac);
        railArc.setAttribute('d', arcPath(m, rTrack, Math.min(a0, a1), Math.max(a0, a1)));
        thumbArc.setAttribute('d', arcPath(m, rTrack, Math.min(t0a, t1a), Math.max(t0a, t1a)));
      } else {
        railArc.setAttribute('d', '');
        thumbArc.setAttribute('d', '');
      }

      // B8d - the words live on the planet. Which project they describe is the hovered or
      // focused one when there is a pointer, and otherwise the one at the centre of the
      // fan: a phone has no hover, and twelve pictures with no way to learn what any of
      // them is would be the whole design's failure mode.
      const active = hovered.current >= 0 ? hovered.current : canHover ? -1 : centred;
      if (active !== shownActive.current) {
        shownActive.current = active;
        const src = active >= 0 ? cards[active] : null;
        panelTitle.textContent = src?.dataset.title ?? '';
        panelDesc.textContent = src?.dataset.desc ?? '';
        panelTech.textContent = src?.dataset.tech ?? '';
        panel.style.opacity = src ? '1' : '0';
      }
      // Over the disc, on the side of it the windows are not on, and never under the
      // navbar however the planet drifts.
      const pw = Math.min(360, Math.max(220, m.R * 1.15));
      const px = m.cx - m.sweep * (m.R * 0.30) - pw / 2;
      const py = m.cy - 60;
      panel.style.width = `${pw.toFixed(0)}px`;
      panel.style.left = `${clamp(px, 12, vw - pw - 12).toFixed(1)}px`;
      panel.style.top = `${clamp(py, 88, vh - 200).toFixed(1)}px`;

      list.dataset.ready = '1';
      if (probe) {
        svg.dataset.ring = JSON.stringify({
          cx: m.cx, cy: m.cy, R: m.R, r0: m.r0, r1: m.r1,
          rMid: m.rMid, dHalf: m.dHalf, fanUp: m.fanUp, fanDown: m.fanDown,
          th0: m.th0, sweep: m.sweep,
          contentDepth: m.contentDepth, contentHalf: m.contentHalf, scroll, span,
          costMs: +(performance.now() - t0).toFixed(3),
          plane: { ...livePlanetPlane },
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
      space.remove();
      defs.remove();
      railArc.remove();
      thumbArc.remove();

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

      {/* The project's words, on the planet. Styles are inline rather than in a class
          because globals.css belongs to the other session's lane this round. */}
      <div
        ref={panelRef}
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          opacity: 0,
          transition: 'opacity 0.25s ease',
          // A soft well of shadow rather than a panel: the words are meant to be ON the
          // planet, and the planet's lit half is bright enough that a text-shadow alone
          // left them barely legible in LTR, where the pose puts the copy over the disc's
          // brightest part. No edge, no border - it reads as the world darkening under
          // the text.
          padding: '22px 26px',
          margin: '-22px -26px',
          background:
            'radial-gradient(ellipse at 50% 45%, rgba(5,7,20,0.82) 0%, rgba(5,7,20,0.62) 48%, rgba(5,7,20,0.24) 72%, rgba(5,7,20,0) 100%)',
          textShadow: '0 2px 18px rgba(5,7,20,0.95), 0 0 40px rgba(5,7,20,0.8)',
        }}
      >
        <div
          data-panel-title
          className="text-[var(--color-star-white)]"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-display)', fontSize: '1.6rem', lineHeight: 1.25 }}
        />
        <div
          data-panel-desc
          className="mt-2 text-[var(--color-star-white)]/85"
          style={{ fontSize: '0.9375rem', lineHeight: 1.7 }}
        />
        <div
          data-panel-tech
          className="mt-2.5 text-[var(--color-core-gold)]/85"
          style={{ fontSize: '0.75rem', letterSpacing: '0.04em' }}
        />
      </div>

      <DepartureMeter value={meter} label={departureLabel} />
    </div>
  );
}
