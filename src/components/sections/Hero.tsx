'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, useScroll, useMotionValueEvent, useMotionValue } from 'framer-motion';
import Link from 'next/link';
import { Pointer } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useViewMode } from '@/lib/viewModeContext';
import { useScene } from '@/lib/sceneStore';
import { SWAP_V, COVER_PLATEAU, COVER_FALLOFF, coverageFor } from '@/lib/diveEnvelope';
import { scrollAt, timeAt } from '@/lib/passageProfile';
import { enteredOnAWorld } from '@/lib/entryRoute';
import { localePath } from '@/lib/sections';
import About from '@/components/sections/About';
import Services from '@/components/sections/Services';
import Projects from '@/components/sections/Projects';
import TechStack from '@/components/sections/TechStack';
import Contact from '@/components/sections/Contact';

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

const GALAXY_POSTER = '/images/galaxy/poster.webp';

/**
 * SSR'd semantic hero copy + links so crawlers/LLMs see the content even though the
 * visual layer is a client-only WebGL scene. Visually hidden, fully in the DOM.
 */
function SeoContent() {
  const { t, locale } = useI18n();
  const p = (s: string) => localePath(s, locale);
  return (
    <div className="sr-only">
      {/* A <p>, not an <h1>. The visible hero below is an h1 AND is server-rendered — it
          is in the raw HTML of production, checked with curl — so a crawler that runs no
          JavaScript already finds a real heading. This block's job is the copy and the
          links, not a second heading; as an h1 it only gave every locale of the home page
          two h1s carrying identical text. Invisible either way, so nothing moves. */}
      <p>{t('hero.name')}</p>
      <p>{t('hero.subtitle')}</p>
      <Link href={p('about')}>{t('nav.about')}</Link>
      <Link href={p('services')}>{t('nav.services')}</Link>
      <Link href={p('projects')}>{t('nav.projects')}</Link>
      <Link href={p('technologies')}>{t('nav.tech')}</Link>
      <Link href={p('contact')}>{t('nav.contact')}</Link>
    </div>
  );
}

/** Static fallback (reduced-motion / no-WebGL): the classic sectioned site, so those
 *  visitors and crawlers get the full content without any WebGL. */
function StaticHero() {
  const { t } = useI18n();
  return (
    <>
      <section className="relative min-h-dvh flex items-center overflow-hidden py-32 px-6">
        <Image src={GALAXY_POSTER} alt="" fill priority unoptimized className="object-cover -z-10" />
        <div className="absolute inset-0 -z-10" style={{ background: 'rgba(5,7,20,0.6)' }} />
        <div className="relative z-10 mx-auto w-full max-w-2xl text-center">
          <h1 className="type-hero text-[clamp(2.5rem,6vw,5rem)] leading-[1.05] tracking-[0.04em] text-[var(--color-star-white)]">
            {t('hero.name')}
          </h1>
          <p className="mt-6 text-base text-[var(--color-star-white)]/70">{t('hero.subtitle')}</p>
        </div>
      </section>
      <div className="relative z-10 bg-[var(--color-bg-primary)]">
        <About />
        <Services />
        <Projects />
        <TechStack />
        <Contact />
      </div>
    </>
  );
}

// Lives for the SPA session (survives client-side navigation, reset by a full page
// load / refresh). Lets us tell a fresh visit apart from an in-session return.
let sessionEntered = false;

/**
 * Home experience: a tall scroll driver whose progress (0..1) drives the persistent
 * WebGL camera on a dive into the galactic core, a warm dust-veil crossing, and —
 * behind that veil — the swap to the solar system. The canvas itself lives in the
 * root layout (CosmicStage); here we only own the DOM overlays (welcome + veil) and
 * feed scrollProgress to the store. A FRESH load / refresh always plays the galaxy
 * dive (the signature experience); only an in-session return from a world lands
 * straight in the solar overview (no jarring re-dive).
 */
function GalaxyHome() {
  const { t } = useI18n();
  const driverRef = useRef<HTMLDivElement>(null);
  const setScrollProgress = useScene((s) => s.setScrollProgress);
  const [seenIntro, setSeenIntro] = useState<boolean | null>(null);
  const { scrollYProgress } = useScroll({ target: driverRef, offset: ['start start', 'end end'] });

  const welcomeOpacity = useMotionValue(1);

  useEffect(() => {
    // Fresh load / refresh (module flag reset) → always the galaxy dive. Only an
    // in-session return may skip to the overview.
    //
    // B11: the module flag alone got this wrong for a deep link. Arriving straight at
    // /projects and pressing Escape mounts this component for the FIRST time in the
    // document, so `!sessionEntered` reported a fresh visit and replayed the whole dive —
    // ignoring the `seen-intro` that useWorldExit had just written for precisely the
    // opposite reason. A document that ENTERED on a world is never a fresh home arrival,
    // whatever this component has or has not mounted before.
    const fresh = !sessionEntered && !enteredOnAWorld();
    sessionEntered = true;
    const seen = !fresh && sessionStorage.getItem('seen-intro') === '1';
    // The one set-state-in-effect left in the codebase, and it is deliberate — everything else
    // that tripped this rule was a browser value being read a render too late, but this is the
    // case the rule cannot express. The decision needs `sessionEntered`, a module flag this
    // effect MUTATES, plus `sessionStorage`; neither is available during render, and doing it
    // in a lazy initialiser would flip the flag twice under StrictMode's double-invoke and
    // report a fresh visit as a return. The extra render is not a cost being overlooked, it is
    // the design: `seenIntro` starts as `null` — a real third state, "not yet decided" — and
    // that pass renders neither the dive driver nor the overview. Moving this would change
    // which act a visitor arrives in, which is B11's bug, and B11 took a round to find.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above; changing this changes arrival behaviour
    setSeenIntro(seen);
    const scene = useScene.getState();
    scene.setFocusedPlanet(null);
    if (seen) {
      scene.setAct('solar');
      // The driver IS mounted for a returning visitor, who simply starts at the END of it.
      // Not replaying the intro and not being able to go back are two different things,
      // and this was both: with no tall driver the document was exactly one viewport high,
      // so someone who came back from a world was parked in the solar overview with no way
      // to reach the galaxy again short of a reload. Starting at the bottom keeps the
      // intro unplayed - there is nothing below them to fall through - while the swap
      // machine, which is bidirectional, can still carry them back up.
      scene.setScrollDriven(true);
      // R5.1: park the dive progress at "fully arrived". A stale mid-dive value left the
      // arrival choreography half-played with no scroll left to finish it.
      scene.setScrollProgress(1);
    } else {
      scene.setAct('galaxy');
      scene.setScrollProgress(0);
      scene.setScrollDriven(true); // fresh dive: the 800vh driver is mounted (T7c reconciliation active)
      window.scrollTo(0, 0);
    }
    return () => { useScene.getState().setScrollDriven(false); };
  }, []);

  // A returning visitor starts at the END of the driver: already arrived, nothing below
  // them, and the whole runway above to scroll back up through. A layout effect, because
  // by the time a passive one ran the browser could have painted a frame at the top -
  // which is the intro's first frame, the one thing this arrival must never show.
  useLayoutEffect(() => {
    if (seenIntro !== true) return;
    // `behavior: 'instant'`, and the object form, because `html { scroll-behavior: smooth }`
    // is set globally in globals.css and the NUMERIC overload of scrollTo inherits it. The
    // first version of this used that overload and so ANIMATED from the top to the end -
    // scrolling the returning visitor through the intro's opening frames, which is the one
    // thing this effect exists to prevent. Caught in review; my own harness could not see
    // it, because it samples after a delay by which time a smooth scroll has also arrived.
    const toEnd = () =>
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    toEnd();
    // Once more after a frame: a browser restores its remembered scroll position after us.
    const raf = requestAnimationFrame(toEnd);
    return () => cancelAnimationFrame(raf);
  }, [seenIntro]);

  // Feed raw scroll to the store; CameraRig owns the act swap + coverage (T1). The
  // crossover curtain is now the in-world SwapMask (T3, in SceneRoot) driven by the same
  // store.coverage — no DOM overlay, so the wash is a real bloomed glow, not a flat gradient.
  const lastScrollTs = useRef(0);
  const lastDir = useRef(1);
  const prevV = useRef(0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    // Only while the decision is still pending. This used to bail for a RETURNING visitor
    // too, which was consistent with there being no driver to read - and wrong the moment
    // one is mounted for them, because then scrolling moved the page and nothing else.
    if (seenIntro === null) return;
    if (v !== prevV.current) {
      lastDir.current = v > prevV.current ? 1 : -1;
      prevV.current = v;
      lastScrollTs.current = performance.now();
    }
    setScrollProgress(v);
    welcomeOpacity.set(1 - clamp01(v / 0.12));
  });

  // R5.1 — crossover auto-commit. The swap curtain is a wide, symmetric envelope around
  // the crossover point, so a visitor who simply STOPS scrolling inside it is left staring
  // at a black curtain with no indication that anything more is expected of them: the one true
  // stuck position on the page. When scroll comes to rest while the curtain is meaningfully
  // up, finish the crossing for them — a short smooth scroll to just past the curtain, in
  // whichever direction they were already travelling. Never fires while they are still
  // scrolling, so it can never fight the gesture.
  useEffect(() => {
    // Any visitor with a driver under them can come to rest inside the curtain, so the
    // auto-commit belongs to both arrivals now, not only the fresh one.
    if (seenIntro === null) return;
    const REST_MS = 320;
    const COMMIT_COV = 0.45; // only while the curtain actually obscures the frame
    // Clear of the ENTIRE covered band: the plateau half-width AND the falloff, plus a
    // margin. Landing on `SWAP_V + COVER_FALLOFF` alone stops one plateau short and parks
    // the visitor at a permanent coverage of 0.25 — the same shut curtain this is meant to
    // clear, only now at a fixed depth instead of wherever they happened to stop.
    const PAST = COVER_PLATEAU + COVER_FALLOFF + 0.01;
    let raf = 0;
    let committing = false;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const s = useScene.getState();
      if (!s.scrollDriven || s.focusedPlanet) return;
      // Judge the SCROLL POSITION, not the live coverage. Coverage is driven by the damped
      // gate, which sweeps through the curtain whenever scroll jumps a long way at once
      // (End key, scrollbar, scroll restoration). Reading it here made a legitimate fast
      // transit look like a parked visitor, and the "help" yanked them BACKWARDS out of a
      // finished dive. Where the page is actually scrolled to is the only honest test of
      // "came to rest inside the curtain".
      const parkedCov = coverageFor(s.scrollProgress);
      if (committing) {
        if (parkedCov < COMMIT_COV) committing = false; // clear of the obscuring band → re-arm
        return;
      }
      if (parkedCov < COMMIT_COV) return;
      if (performance.now() - lastScrollTs.current < REST_MS) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const target = lastDir.current >= 0 ? SWAP_V + PAST : SWAP_V - PAST;
      committing = true;
      lastScrollTs.current = performance.now();
      window.scrollTo({ top: clamp01(target) * max, behavior: 'smooth' });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seenIntro]);

  // One gesture, whole passage (owner, 2026-09-28: "one swipe and it goes"). The 800vh
  // driver made the dive a long scroll - several wheel spins on a desktop, many swipes on a
  // phone. Now any scroll intent on the home scene - a wheel notch, a vertical swipe, a
  // paging key - plays the passage to the far end on its own, galaxy to solar or back, over
  // PASSAGE_MS. The driver stays the single source of truth: the passage is played by
  // scrolling it, one instant step per frame, so the camera, the swap curtain and the
  // arrival dolly run exactly the machinery a hand scroll runs, only on a fixed clock.
  // While it plays, further input is swallowed, so a second flick cannot stall it, reverse
  // it or park it inside the curtain; after it lands, the input stays swallowed until the
  // wheel has been quiet for a moment, so a trackpad's momentum tail cannot launch the
  // return trip.
  const [passage, setPassage] = useState(false);
  useEffect(() => {
    if (seenIntro === null) return;
    // The passage plays on ONE clock (#82): the scroll is a linear function of time per
    // segment (passageProfile), and the camera shapes its own speed on top of that - so it
    // accelerates through the galaxy, crosses the curtain at speed and brakes only as it
    // lands. The old per-leg eases stopped the camera dead at the curtain and crept after it.
    const QUIET_MS = 260;  // wheel silence that ends the post-arrival swallow
    const SETTLE_MS = 500; // minimum swallow after arrival, whatever the wheel does
    const SWIPE_PX = 12;
    const STEP_MAX_MS = 100;  // 10 fps still plays in real time; only a true stall is clipped
    const HOLD_MAX_MS = 2000;
    let raf = 0;
    let playing = false;
    let landedAt = -Infinity;
    let lastWheel = -Infinity;
    const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;
    const swallowing = (now: number) =>
      playing || now - landedAt < SETTLE_MS || (now - landedAt < 4000 && now - lastWheel < QUIET_MS && lastWheel > landedAt);
    // Leave native behaviour to anything that is not the scene: the nav drawer, the
    // accessibility panel, form fields.
    const foreign = (target: EventTarget | null) =>
      target instanceof Element &&
      !!target.closest('[role="dialog"], nav, input, textarea, select, [contenteditable="true"]');
    const eligible = () => {
      const s = useScene.getState();
      return s.scrollDriven && !s.focusedPlanet;
    };
    const play = (dir: 1 | -1) => {
      const max = maxScroll();
      if (max <= 0) return false;
      const from = window.scrollY / max;
      const to = dir > 0 ? 1 : 0;
      if (Math.abs(to - from) * max < 2) return false; // already at that end: nothing to play
      // Entered part-way (a hand-scrolled driver), the passage plays only what is left of it.
      const tFrom = timeAt(from);
      const span = Math.abs(timeAt(to) - tFrom);
      playing = true;
      setPassage(true);
      const t0 = performance.now();
      let prev = t0, elapsed = 0, held = 0;
      const step = () => {
        const now = performance.now();
        const dt = now - prev;
        prev = now;
        // The clock runs on capped frame steps: the first solar mount stalls a frame for most
        // of a second, and a wall clock would then jump the camera across the gap in one step.
        // It also waits while the curtain is shut behind the scroll - the swap's reveal hold -
        // so the arrival plays in view instead of finishing behind the curtain. Bounded, so a
        // curtain that never lifts cannot keep the passage (and the swallowed input) alive.
        const sc = useScene.getState();
        if (sc.coverage > coverageFor(sc.scrollProgress) + 0.3 && held < HOLD_MAX_MS) held += dt;
        else elapsed += Math.min(dt, STEP_MAX_MS);
        const x = Math.min(1, elapsed / span);
        window.scrollTo({ top: scrollAt(tFrom + dir * span * x) * max, behavior: 'instant' });
        if (x < 1) { raf = requestAnimationFrame(step); return; }
        playing = false;
        landedAt = performance.now();
        if (to === 0) setPassage(false); // back at the galaxy: the hint may show again
        if (process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production') (window as unknown as { __passage?: object }).__passage = { t0, t1: landedAt, dir }; // verification handle
      };
      raf = requestAnimationFrame(step);
      return true;
    };

    const onWheel = (e: WheelEvent) => {
      if (!eligible() || foreign(e.target) || e.ctrlKey) return; // ctrl+wheel is a pinch-zoom
      const now = performance.now();
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      e.preventDefault();
      const swallow = swallowing(now); // judged against the PREVIOUS wheel, before this one counts
      lastWheel = now;
      if (swallow || e.deltaY === 0) return;
      play(e.deltaY > 0 ? 1 : -1);
    };

    // Touch: every vertical move over the scene is taken from the browser from its first
    // pixel - a native pan that has already begun cannot be cancelled, and it would fight the
    // played passage frame by frame. Horizontal moves stay untouched (orbit, the mobile tour).
    let tx = 0, ty = 0, decided: 'v' | 'h' | null = null, fired = false, touchOk = false;
    const onTouchStart = (e: TouchEvent) => {
      const p = e.touches[0];
      touchOk = e.touches.length === 1 && eligible() && !foreign(e.target);
      tx = p?.clientX ?? 0; ty = p?.clientY ?? 0; decided = null; fired = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!touchOk) return;
      const p = e.touches[0];
      if (!p) return;
      const dx = p.clientX - tx, dy = p.clientY - ty;
      if (!decided && Math.max(Math.abs(dx), Math.abs(dy)) > 4) decided = Math.abs(dy) >= Math.abs(dx) ? 'v' : 'h';
      if (decided === 'h') return;
      if (e.cancelable) e.preventDefault();
      if (fired || swallowing(performance.now()) || Math.abs(dy) < SWIPE_PX) return;
      fired = true;
      play(dy < 0 ? 1 : -1); // finger up = page forward
    };

    const onKey = (e: KeyboardEvent) => {
      if (!eligible() || foreign(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      const fwd = e.key === 'PageDown' || e.key === 'ArrowDown' || e.key === 'End' || (e.key === ' ' && !e.shiftKey);
      const back = e.key === 'PageUp' || e.key === 'ArrowUp' || e.key === 'Home' || (e.key === ' ' && e.shiftKey);
      if (!fwd && !back) return;
      if (e.key === ' ' && (tag === 'BUTTON' || tag === 'A')) return; // Space activates those
      e.preventDefault();
      if (swallowing(performance.now())) return;
      play(fwd ? 1 : -1);
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKey);
    };
  }, [seenIntro]);

  // One render for both arrivals now. A repeat visitor gets the same driver and simply
  // starts at the end of it (see the layout effect above), so the runway back up to the
  // galaxy exists for them too.
  return (
    <section ref={driverRef} className="relative" style={{ height: '800vh' }}>
      <SeoContent />

      {/* Welcome - fixed, fades as the dive begins */}
      <motion.div
        style={{ opacity: welcomeOpacity }}
        className="pointer-events-none fixed inset-0 z-10 flex flex-col items-center px-6 pt-[16vh] text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 22, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1.2, ease: [0.25, 0.4, 0, 1] }}
        >
          {/* This stays an <h1>, and the duplicate is removed at the other end, in
              `SeoContent`. Demoting THIS one looked equivalent — the size is set by the
              class — and measurement said otherwise: `globals.css` gives `h1` the display
              font and the heading glow, and gives `p` `text-shadow: none`, so the tag
              swap quietly changed the typeface and switched the hero's bloom off. The name
              rendered 71px wider and 7px shorter at 1440x900. The tag is doing real work
              here; only the invisible copy of it is redundant. */}
          <h1
            className="type-hero text-[clamp(3rem,8vw,6.5rem)] leading-[1.05] tracking-[0.06em] text-[var(--color-star-white)]"
          >
            {t('hero.name')}
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.35, ease: 'easeOut' }}
            className="mt-6 text-base font-light tracking-[0.12em] text-[var(--color-star-white)]/60 md:text-lg"
          >
            {t('welcome.identity')}
          </motion.p>
        </motion.div>
        {/* The hint is a mime of the gesture, not a word: a mouse whose wheel rolls on a
            desktop, a finger swiping up on a touch screen. Server-rendered, with the device
            picked by a media query and the fade-in done in CSS, so it shows on first paint
            instead of waiting for hydration. It leaves the moment the passage starts
            rather than riding the welcome fade, which a played passage outruns. */}
        <div className="dive-hint-in absolute inset-x-0 bottom-10 flex justify-center">
          <motion.div
            initial={false}
            animate={{ opacity: passage ? 0 : 1 }}
            transition={{ duration: passage ? 0.15 : 0.4 }}
            data-dive-hint={passage ? 'hidden' : 'shown'}
          >
            <span className="sr-only">{t('welcome.hint')}</span>
            <span className="pointer-coarse:hidden"><WheelHint /></span>
            <span className="hidden pointer-coarse:block"><SwipeHint /></span>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

const HINT_GOLD = 'var(--color-core-gold)';

/** A mouse outline whose wheel dot rolls down and fades, on a loop. */
function WheelHint() {
  return (
    <svg width="26" height="40" viewBox="0 0 26 40" fill="none" aria-hidden="true" style={{ opacity: 0.85 }}>
      <rect x="1.5" y="1.5" width="23" height="37" rx="11.5" stroke={HINT_GOLD} strokeWidth="1.5" />
      <motion.circle
        cx="13" r="2.4" fill={HINT_GOLD}
        initial={{ cy: 10, opacity: 0 }}
        animate={{ cy: [10, 10, 20, 20], opacity: [0, 1, 0, 0] }}
        transition={{ duration: 1.6, times: [0, 0.15, 0.75, 1], repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  );
}

/** A pointing finger that travels up with a fading trail, on a loop. */
function SwipeHint() {
  return (
    <div className="relative h-14 w-10" aria-hidden="true">
      <motion.span
        className="absolute left-1/2 top-2 w-[2px] -translate-x-1/2 rounded-full"
        style={{ background: `linear-gradient(to top, transparent, ${HINT_GOLD})` }}
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: [0, 0, 26, 26], opacity: [0, 0.7, 0.4, 0] }}
        transition={{ duration: 1.6, times: [0, 0.15, 0.7, 1], repeat: Infinity, ease: 'easeOut' }}
      />
      <motion.span
        className="absolute bottom-0 left-1/2 -ml-[11px]"
        initial={{ y: 0, opacity: 0 }}
        animate={{ y: [0, 0, -26, -26], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.6, times: [0, 0.15, 0.7, 1], repeat: Infinity, ease: 'easeOut' }}
      >
        <Pointer size={22} strokeWidth={1.6} style={{ color: HINT_GOLD, opacity: 0.85 }} />
      </motion.span>
    </div>
  );
}

export default function Hero() {
  // Classic view already covers reduced motion and missing WebGL - the provider demotes
  // those visitors before this renders - so one question is enough here.
  const { mode } = useViewMode();
  return mode === 'classic' ? <StaticHero /> : <GalaxyHome />;
}
