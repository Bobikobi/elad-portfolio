'use client';
import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
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
  const { t, locale, dir } = useI18n();
  const [titleIdx, setTitleIdx] = useState(0);
  const [hideScrollCue, setHideScrollCue] = useState(false);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (value) => {
    setHideScrollCue(value > 100);
  });

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
      className="relative min-h-dvh flex items-center overflow-hidden has-scan"
      style={{
        background: `radial-gradient(ellipse at var(--spotlight-x, 50%) var(--spotlight-y, 50%), var(--color-accent-glow) 0%, transparent 60%)`,
      }}
    >
      {/* Animated aurora orbs */}
      <div className="animate-aurora absolute top-1/4 start-1/4 w-[600px] h-[600px] rounded-full bg-[var(--color-gradient-start)] blur-[140px] pointer-events-none" />
      <div className="animate-aurora-b absolute bottom-1/4 end-1/3 w-[480px] h-[480px] rounded-full bg-[var(--color-gradient-end)] blur-[130px] pointer-events-none" />
      <div className="animate-aurora absolute top-3/4 start-2/3 w-[300px] h-[300px] rounded-full bg-[var(--color-accent)] opacity-[0.04] blur-[100px] pointer-events-none" />

      {/* Line grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      {/* Horizon line glow */}
      <div className="absolute top-1/2 left-0 right-0 h-px pointer-events-none animate-glow-pulse"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.25) 30%, rgba(6,182,212,0.25) 70%, transparent)' }}
      />

      <div className="relative z-10 mx-auto max-w-[1200px] w-full px-6 py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.4, 0, 1] }}
          className="max-w-2xl"
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-bg-secondary)] mb-6 text-xs font-medium text-[var(--color-text-secondary)] animate-badge"
          >
            {t('hero.available')}
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="text-sm text-[var(--color-text-tertiary)] mb-3"
          >
            {t('hero.greeting')}
          </motion.p>

          {/* Name */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24 }}
            className="text-[clamp(3.5rem,8vw,7rem)] font-bold leading-[0.9] tracking-tighter mb-4"
          >
            <span
              className="bg-gradient-to-r from-[var(--color-gradient-start)] via-[var(--color-accent-hover)] to-[var(--color-gradient-end)] bg-clip-text text-transparent"
              style={{
                backgroundSize: '200% 200%',
                animation: 'gradient-rotate 8s ease infinite',
                filter: 'drop-shadow(0 0 40px rgba(139,92,246,0.35)) drop-shadow(0 0 80px rgba(139,92,246,0.12))',
              }}
            >
              {t('hero.name')}
            </span>
          </motion.h1>

          {/* Rotating titles */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.36 }}
            className="h-14 mb-5 overflow-hidden"
          >
            <AnimatePresence mode="wait">
              <motion.p
                key={titleIdx}
                initial={{ opacity: 0, y: dir === 'rtl' ? -18 : 18, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: dir === 'rtl' ? 18 : -18, filter: 'blur(4px)' }}
                transition={{ duration: 0.5, ease: [0.25, 0.4, 0, 1] }}
                className="text-2xl md:text-3xl text-[var(--color-text-secondary)] font-light"
              >
                {t(titles[titleIdx])}
              </motion.p>
            </AnimatePresence>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.48 }}
            className="text-base md:text-lg text-[var(--color-text-tertiary)] mb-10 max-w-xl"
          >
            {t('hero.subtitle')}
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-wrap gap-4 mb-10"
          >
            <a
              href="#projects"
              className="relative px-7 py-3.5 rounded-xl font-semibold text-sm text-white overflow-hidden shimmer-hover"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)',
                boxShadow: '0 0 24px rgba(139,92,246,0.35), 0 4px 20px rgba(0,0,0,0.3)',
              }}
            >
              {t('hero.cta.work')}
            </a>
            <a
              href="#contact"
              className="px-7 py-3.5 rounded-xl border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] font-semibold text-sm glow-border hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-primary)] transition-all duration-300"
            >
              {t('hero.cta.contact')}
            </a>
          </motion.div>

          {/* Social icons */}
          <div className="flex items-center gap-5 mb-12">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:scale-110 hover:drop-shadow-[0_0_8px_rgba(139,92,246,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:rounded-md transition-all duration-300"
              >
                <s.icon size={20} strokeWidth={1.5} />
              </a>
            ))}
          </div>

          {/* Stats strip */}
          <div className="flex items-center gap-0 border border-[var(--color-border-default)] rounded-xl overflow-hidden w-fit">
            {[
              { num: '10+', key: 'about.metric.projects' },
              { num: '3', key: 'about.metric.languages' },
              { num: '5+', key: 'about.metric.cloud' },
            ].map(({ num, key }, i) => (
              <div
                key={key}
                className={`flex flex-col items-center px-6 py-3 ${
                  i > 0 ? 'border-s border-[var(--color-border-default)]' : ''
                } bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors cursor-default`}
              >
                <span className="text-xl font-bold bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] bg-clip-text text-transparent leading-none">{num}</span>
                <span className="text-[10px] text-[var(--color-text-tertiary)] mt-1 whitespace-nowrap">{t(key)}</span>
              </div>
            ))}
          </div>

          {/* Crawlable internal links for SEO/GEO — locale-aware text and hrefs */}
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link
              href={locale === 'he' ? '/services' : `/${locale}/services`}
              className="text-[var(--color-accent)] hover:underline"
            >
              {t('hero.links.services')}
            </Link>
            <Link
              href={locale === 'he' ? '/services/ai-integration' : `/${locale}/services/ai-integration`}
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
      <AnimatePresence>
        {!hideScrollCue && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 0.7, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.35 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className="flex flex-col items-center gap-1"
            >
              <ChevronDown size={20} className="text-[var(--color-text-tertiary)]" />
              <span className="w-px h-5 bg-gradient-to-b from-[var(--color-text-tertiary)] to-transparent" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
