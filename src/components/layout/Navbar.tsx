'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring, useMotionValueEvent } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useI18n, Locale } from '@/lib/i18n';
import Link from 'next/link';
import ViewModeToggle from './ViewModeToggle';
import Wordmark from './Wordmark';
import { usePathname, useRouter } from 'next/navigation';
import { sectionPath, sectionForPath, homePath, switchLocalePath, type SectionId } from '@/lib/sections';

const navItems = ['about', 'services', 'projects', 'tech', 'contact'] as const;
const sectionIds: Record<typeof navItems[number], SectionId> = {
  about: 'about',
  services: 'services',
  projects: 'projects',
  tech: 'technologies',
  contact: 'contact',
};
// section id → nav item (technologies surfaces as "tech").
const SECTION_TO_ITEM: Record<SectionId, typeof navItems[number]> = {
  about: 'about', services: 'services', projects: 'projects', technologies: 'tech', contact: 'contact',
};
const locales: { code: Locale; label: string }[] = [
  { code: 'he', label: 'עב' },
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
];

export default function Navbar() {
  const { t, locale, setLocale, dir } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const { scrollY, scrollYProgress } = useScroll();
  const progressScale = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.2 });

  const home = homePath(locale);
  // Active nav item derives from the current route (each section is its own page now).
  const activeSectionId = sectionForPath(pathname)?.id;
  const activeSection = activeSectionId ? SECTION_TO_ITEM[activeSectionId] : null;

  useMotionValueEvent(scrollY, 'change', (value) => {
    setScrolled(value > 80);
  });

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Focus trap + Escape key for mobile drawer
  useEffect(() => {
    if (!mobileOpen) return;
    const drawer = drawerRef.current;
    if (!drawer) return;

    const focusableEls = drawer.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusableEls[0];
    const last = focusableEls[focusableEls.length - 1];
    first?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMobileOpen(false); return; }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  // R5.2 — nav items and the logo are REAL anchors (crawlable, middle-clickable,
  // "open in new tab"-able) that still behave like the old buttons: next/link keeps the
  // navigation client-side, so the persistent canvas is never torn down and the camera
  // flies to the new world instead of the page reloading.
  const closeMenu = () => setMobileOpen(false);
  const goHome = () => {
    setMobileOpen(false);
    // The home route's scroll position is the dive driver — always start it at the top.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const changeLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    router.push(switchLocalePath(pathname, newLocale));
  };

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] z-[9999] bg-gradient-to-r from-transparent via-[var(--color-core-gold)] to-[var(--color-core-gold)]"
        style={{
          scaleX: progressScale,
          transformOrigin: dir === 'rtl' ? 'right center' : 'left center',
        }}
        aria-hidden="true"
      />
      <header
        data-chrome=""
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[color:rgba(9,9,11,0.68)] backdrop-blur-xl border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.22)]'
            : 'bg-transparent'
        }`}
      >
        {/* Legibility scrim: a dark top-down fade sits behind the links while the
            header is transparent, so text stays readable over the bright hero. */}
        {!scrolled && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/55 via-black/25 to-transparent"
          />
        )}
        <nav className="relative mx-auto max-w-[1200px] w-full px-4 sm:px-6 flex items-center justify-between h-16 [text-shadow:0_1px_10px_rgba(0,0,0,0.55)]">
          {/* Logo — a real link home (the galaxy / solar overview), not a button. */}
          <Link
            href={home}
            onClick={goHome}
            className="flex items-center opacity-90 hover:opacity-100 transition-opacity"
            aria-label={t('nav.home')}
          >
            {/* Outline, not a webfont — see Wordmark. `tracking-wide` is baked into the
                path, so the class is gone rather than doubled. */}
            <Wordmark className="text-3xl text-[var(--color-text-primary)]" />
          </Link>

          {/* Desktop links */}
          <ul className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <li key={item}>
                <Link
                  href={sectionPath(sectionIds[item], locale)}
                  onClick={closeMenu}
                  aria-current={activeSection === item ? 'page' : undefined}
                  className={`relative block text-sm px-1 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-core-gold)] focus-visible:rounded-md transition-colors ${
                    activeSection === item
                      ? 'text-[var(--color-core-gold)]'
                      : 'text-[var(--color-star-white)]/75 hover:text-[var(--color-star-white)]'
                  }`}
                >
                  {t(`nav.${item}`)}
                  {activeSection === item && (
                    <motion.span
                      layoutId="nav-indicator"
                      className="absolute inset-x-0 -bottom-[2px] h-[2px] rounded-full bg-[var(--color-core-gold)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {/* View mode + language + mobile toggle */}
          <div className="flex items-center gap-3">
            <ViewModeToggle />
            <div className="chrome-surface hidden md:flex items-center gap-1 rounded-lg p-0.5">
              {locales.map((l) => (
                <button
                  key={l.code}
                  onClick={() => changeLocale(l.code)}
                  data-active={locale === l.code ? 'true' : 'false'}
                  aria-current={locale === l.code ? 'true' : undefined}
                  className="chrome-btn px-2.5 py-1 rounded-md text-xs font-medium"
                >
                  {l.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden text-[var(--color-text-secondary)] p-2"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              ref={drawerRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 end-0 z-50 h-full w-full max-w-[320px] bg-[var(--color-bg-secondary)] border-s border-[var(--color-border-default)] p-6 flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="flex justify-end mb-8">
                <button onClick={() => setMobileOpen(false)} className="text-[var(--color-text-secondary)]">
                  <X size={20} />
                </button>
              </div>
              <ul className="flex flex-col gap-6">
                <li>
                  <Link
                    href={home}
                    onClick={goHome}
                    className="text-lg text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
                  >
                    {t('nav.home')}
                  </Link>
                </li>
                {navItems.map((item) => (
                  <li key={item}>
                    <Link
                      href={sectionPath(sectionIds[item], locale)}
                      onClick={closeMenu}
                      aria-current={activeSection === item ? 'page' : undefined}
                      className={`block text-lg transition-colors ${
                        activeSection === item
                          ? 'text-[var(--color-text-primary)]'
                          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                      }`}
                    >
                      {t(`nav.${item}`)}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-auto mb-3" onClick={() => setMobileOpen(false)}>
                <ViewModeToggle compact />
              </div>
              <div className="chrome-surface flex items-center gap-1 rounded-lg p-0.5">
                {locales.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      changeLocale(l.code);
                      setMobileOpen(false);
                    }}
                    data-active={locale === l.code ? 'true' : 'false'}
                    aria-current={locale === l.code ? 'true' : undefined}
                    className="chrome-btn flex-1 px-2.5 py-2 rounded-md text-xs font-medium"
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="sr-only">
        <Link href="/">English Home</Link>
        <Link href="/he">Hebrew Home</Link>
        <Link href="/ru">Russian Home</Link>
      </div>
    </>
  );
}
