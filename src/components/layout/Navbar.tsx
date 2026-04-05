'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useI18n, Locale } from '@/lib/i18n';

const navItems = ['about', 'services', 'projects', 'tech', 'contact'] as const;
const locales: { code: Locale; label: string }[] = [
  { code: 'he', label: 'עב' },
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
];

export default function Navbar() {
  const { t, locale, setLocale } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
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
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="opacity-90 hover:opacity-100 transition-opacity"
            aria-label="Back to top"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="ES Logo"
              className="h-14 w-auto object-contain"
            />
          </button>

          {/* Desktop links */}
          <ul className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <li key={item}>
                <button
                  onClick={() => scrollTo(item)}
                  className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
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
                  onClick={() => setLocale(l.code)}
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
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 end-0 z-50 h-full w-72 bg-[var(--color-bg-secondary)] border-s border-[var(--color-border-default)] p-6 flex flex-col"
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
                      onClick={() => scrollTo(item)}
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
                    onClick={() => { setLocale(l.code); setMobileOpen(false); }}
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
    </>
  );
}
