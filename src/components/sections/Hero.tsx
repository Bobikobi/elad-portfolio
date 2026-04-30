'use client';
import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Mail, ChevronDown } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { GithubIcon, LinkedinIcon } from '@/components/ui/SocialIcons';

const titles = ['hero.title.0', 'hero.title.1', 'hero.title.2', 'hero.title.3'];

const socials = [
  { icon: GithubIcon, href: 'https://github.com/Bobikobi', label: 'GitHub' },
  { icon: LinkedinIcon, href: 'https://www.linkedin.com/in/elad-saadon-184809281/', label: 'LinkedIn' },
  { icon: Mail, href: 'mailto:eladeladsaa@gmail.com', label: 'Email' },
];

export default function Hero() {
  const { t, locale } = useI18n();
  const [titleIdx, setTitleIdx] = useState(0);
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTitleIdx((i) => (i + 1) % titles.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!spotlightRef.current) return;
    const rect = spotlightRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    spotlightRef.current.style.setProperty('--spotlight-x', `${x}px`);
    spotlightRef.current.style.setProperty('--spotlight-y', `${y}px`);
  }, []);

  return (
    <section
      ref={spotlightRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-dvh flex items-center overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at var(--spotlight-x, 50%) var(--spotlight-y, 50%), var(--color-accent-glow) 0%, transparent 60%)`,
      }}
    >
      {/* Glow orbs */}
      <div className="absolute top-1/4 start-1/4 w-[500px] h-[500px] rounded-full bg-[var(--color-gradient-start)] opacity-[0.07] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 end-1/3 w-[400px] h-[400px] rounded-full bg-[var(--color-gradient-end)] opacity-[0.05] blur-[120px] pointer-events-none" />

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--color-text-tertiary) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1200px] w-full px-6 py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.4, 0, 1] }}
          className="max-w-2xl"
        >
          {/* Greeting */}
          <p className="text-sm text-[var(--color-text-tertiary)] mb-4 font-mono">
            {t('hero.greeting')}
          </p>

          {/* Name */}
          <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-bold leading-tight tracking-tight">
            <span className="bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] bg-clip-text text-transparent">
              {t('hero.name')}
            </span>
          </h1>

          {/* Rotating titles */}
          <div className="h-12 mt-4 mb-8 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={titleIdx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="text-xl md:text-2xl text-[var(--color-text-secondary)] font-light"
              >
                {t(titles[titleIdx])}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* CTA */}
          <div className="flex flex-wrap gap-4 mb-10">
            <a
              href="#projects"
              className="px-6 py-3 rounded-lg bg-[var(--color-accent)] text-white font-medium text-sm hover:bg-[var(--color-accent-hover)] hover:shadow-[0_0_20px_var(--color-accent-glow)] hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-primary)] transition-all"
            >
              {t('hero.cta.work')}
            </a>
            <a
              href="#contact"
              className="px-6 py-3 rounded-lg border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] font-medium text-sm hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-primary)] transition-all"
            >
              {t('hero.cta.contact')}
            </a>
          </div>

          {/* Social icons */}
          <div className="flex items-center gap-5">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:rounded-md transition-all"
              >
                <s.icon size={20} strokeWidth={1.5} />
              </a>
            ))}
          </div>

          {/* Crawlable internal links for SEO/GEO — locale-aware text, Hebrew pages */}
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link
              href="/services"
              className="text-[var(--color-accent)] hover:underline"
            >
              {t('hero.links.services')}
            </Link>
            <Link
              href="/services/ai-integration"
              className="text-[var(--color-accent)] hover:underline"
            >
              {t('hero.links.ai')}
            </Link>
            {/* Guide page exists only in Hebrew */}
            {locale === 'he' && (
              <Link
                href="/guides/nextjs-seo-geo-2026"
                className="text-[var(--color-accent)] hover:underline"
              >
                {t('hero.links.guide')}
              </Link>
            )}
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ChevronDown size={20} className="text-[var(--color-text-tertiary)] opacity-30" />
      </motion.div>
    </section>
  );
}
