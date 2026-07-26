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
          <h1 className="text-[clamp(2.5rem,6vw,5rem)] leading-[1.05] text-[var(--color-star-white)]" style={{ fontFamily: 'var(--font-display)', fontWeight: 300, letterSpacing: '0.04em' }}>
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
    // in-session return (flag already set) may skip to the overview.
    const fresh = !sessionEntered;
    sessionEntered = true;
    const seen = !fresh && sessionStorage.getItem('seen-intro') === '1';
    setSeenIntro(seen);
    const scene = useScene.getState();
    scene.setFocusedPlanet(null);
    if (seen) {
      scene.setAct('solar');
    } else {
      scene.setAct('galaxy');
      scene.setScrollProgress(0);
      window.scrollTo(0, 0);
    }
  }, []);

  // Feed raw scroll to the store; CameraRig owns the act swap + coverage (T1). The
  // crossover curtain is now the in-world SwapMask (T3, in SceneRoot) driven by the same
  // store.coverage — no DOM overlay, so the wash is a real bloomed glow, not a flat gradient.
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (seenIntro) return;
    setScrollProgress(v);
    welcomeOpacity.set(1 - clamp01(v / 0.12));
  });

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
            className="text-[clamp(3rem,8vw,6.5rem)] leading-[1.05] text-[var(--color-star-white)]"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 300, letterSpacing: '0.06em', textShadow: '0 2px 40px rgba(5,7,20,0.85), 0 0 28px rgba(255,201,120,0.28)' }}
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
