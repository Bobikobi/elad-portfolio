'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, useScroll, useMotionValueEvent, useMotionValue } from 'framer-motion';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useMotionDisabled } from '@/hooks/useMotionDisabled';
import { useWebGLAvailable } from '@/hooks/useWebGLAvailable';
import { useScene } from '@/lib/sceneStore';
import { SWAP_V, COVER_PLATEAU, COVER_FALLOFF, coverageFor } from '@/lib/diveEnvelope';
import { enteredOnAWorld } from '@/lib/entryRoute';
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
  const p = (s: string) => (locale === 'he' ? `/${s}` : `/${locale}/${s}`);
  return (
    <div className="sr-only">
      <h1>{t('hero.name')}</h1>
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
      scene.setScrollDriven(false); // returning visit: no tall driver, scroll must not steer the act
      // R5.1: park the dive progress at "fully arrived". A stale mid-dive value left the
      // arrival choreography half-played with no scroll left to finish it.
      scene.setScrollProgress(1);
    } else {
      scene.setAct('galaxy');
      scene.setScrollProgress(0);
      scene.setScrollDriven(true); // fresh dive: the 500vh driver is mounted (T7c reconciliation active)
      window.scrollTo(0, 0);
    }
    return () => { useScene.getState().setScrollDriven(false); };
  }, []);

  // Feed raw scroll to the store; CameraRig owns the act swap + coverage (T1). The
  // crossover curtain is now the in-world SwapMask (T3, in SceneRoot) driven by the same
  // store.coverage — no DOM overlay, so the wash is a real bloomed glow, not a flat gradient.
  const lastScrollTs = useRef(0);
  const lastDir = useRef(1);
  const prevV = useRef(0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (seenIntro) return;
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
  // at a gold wash with no indication that anything more is expected of them: the one true
  // stuck position on the page. When scroll comes to rest while the curtain is meaningfully
  // up, finish the crossing for them — a short smooth scroll to just past the curtain, in
  // whichever direction they were already travelling. Never fires while they are still
  // scrolling, so it can never fight the gesture.
  useEffect(() => {
    if (seenIntro !== false) return;
    const REST_MS = 320;
    const COMMIT_COV = 0.45; // only while the curtain actually obscures the frame
    // Clear of the ENTIRE covered band: the plateau half-width AND the falloff, plus a
    // margin. Landing on `SWAP_V + COVER_FALLOFF` alone stops one plateau short and parks
    // the visitor at a permanent coverage of 0.25 — the same gold wash this is meant to
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

  // Repeat visit: no dive, no tall driver — the overview is already on screen. Give
  // a short crawlable hint to explore the planets.
  if (seenIntro) {
    return (
      <section className="relative min-h-dvh">
        <SeoContent />
        <div className="pointer-events-none fixed inset-x-0 bottom-10 z-10 flex justify-center">
          <span className="text-xs tracking-[0.2em] text-[var(--color-core-gold)]/70">{t('hero.galaxy.hint')}</span>
        </div>
      </section>
    );
  }

  return (
    <section ref={driverRef} className="relative" style={{ height: '500vh' }}>
      <SeoContent />

      {/* Welcome — fixed, fades as the dive begins */}
      <motion.div
        style={{ opacity: welcomeOpacity }}
        className="pointer-events-none fixed inset-0 z-10 flex flex-col items-center px-6 pt-[16vh] text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 22, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1.2, ease: [0.25, 0.4, 0, 1] }}
        >
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
        <div className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-2">
          <span className="text-xs tracking-[0.2em] text-[var(--color-core-gold)]/80">{t('welcome.hint')}</span>
          <motion.span
            animate={{ y: [0, 8, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown size={22} className="text-[var(--color-core-gold)]/80" />
          </motion.span>
        </div>
      </motion.div>
    </section>
  );
}

export default function Hero() {
  const motionDisabled = useMotionDisabled();
  const webgl = useWebGLAvailable();
  return motionDisabled || !webgl ? <StaticHero /> : <GalaxyHome />;
}
