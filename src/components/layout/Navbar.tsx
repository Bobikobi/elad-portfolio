'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useI18n, Locale } from '@/lib/i18n';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navItems = ['about', 'services', 'projects', 'tech', 'contact'] as const;
const locales: { code: Locale; label: string }[] = [
  { code: 'he', label: 'עב' },
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
];

export default function Navbar() {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const homePath = locale === 'he' ? '/' : `/${locale}`;
  const isOnHome = pathname === homePath;

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

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

  const goToSection = (id: string) => {
    setMobileOpen(false);
    if (isOnHome) {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    router.push(`${homePath}#${id}`);
  };

  const goToHome = () => {
    if (isOnHome) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    router.push(homePath);
  };

  const changeLocale = (newLocale: Locale) => {
    // Extract current locale prefix from pathname
    const pathSegments = pathname.split('/').filter(Boolean);
    const currentPrefix = (pathSegments[0] === 'en' || pathSegments[0] === 'ru') ? pathSegments[0] : null;
    
    // Remove current locale prefix if exists
    const pathWithoutLocale = currentPrefix 
      ? '/' + pathSegments.slice(1).join('/')
      : pathname;
    
    // Build new path with new locale prefix
    const newPath = newLocale === 'he' 
      ? pathWithoutLocale 
      : `/${newLocale}${pathWithoutLocale}`;
    
    setLocale(newLocale);
    router.push(newPath);
  };

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[var(--color-surface-glass)] backdrop-blur-2xl border-b border-[var(--color-border-default)]'
            : 'bg-transparent'
        }`}
      >
        <nav className="mx-auto max-w-[1200px] px-6 flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={goToHome}
            className="flex items-center opacity-90 hover:opacity-100 transition-opacity"
            aria-label="Back to top"
          >
            <span
              className="text-3xl font-bold tracking-wide text-[var(--color-text-primary)]"
              style={{ fontFamily: "'Glamora', serif" }}
            >
              E.S
            </span>
          </button>

          {/* Desktop links */}
          <ul className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <li key={item}>
                <button
                  onClick={() => goToSection(item)}
                  className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:rounded-md transition-colors"
                >
                  {t(`nav.${item}`)}
                </button>
              </li>
            ))}
          </ul>

          {/* Language + mobile toggle */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1 bg-[var(--color-bg-tertiary)] rounded-lg p-0.5">
              {locales.map((l) => (
                <button
                  key={l.code}
                  onClick={() => changeLocale(l.code)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    locale === l.code
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
                  }`}
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
              className="fixed top-0 end-0 z-50 h-full w-72 bg-[var(--color-bg-secondary)] border-s border-[var(--color-border-default)] p-6 flex flex-col"
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
                {navItems.map((item) => (
                  <li key={item}>
                    <button
                      onClick={() => goToSection(item)}
                      className="text-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      {t(`nav.${item}`)}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex items-center gap-1 bg-[var(--color-bg-tertiary)] rounded-lg p-0.5">
                {locales.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      changeLocale(l.code);
                      setMobileOpen(false);
                    }}
                    className={`flex-1 px-2.5 py-2 rounded-md text-xs font-medium transition-all ${
                      locale === l.code
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
                    }`}
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
        <Link href="/">Home</Link>
        <Link href="/en">English Home</Link>
        <Link href="/ru">Russian Home</Link>
      </div>
    </>
  );
}
