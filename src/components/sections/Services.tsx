'use client';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Globe, Bot, Monitor, Users } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { services } from '@/lib/constants';
import GradientBar from '@/components/ui/GradientBar';

const iconMap = { Globe, Bot, Monitor, Users } as const;

export default function Services() {
  const { t } = useI18n();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const serviceLinks = [
    { href: '/services/nextjs-development', label: 'פיתוח Next.js' },
    { href: '/services/ai-integration', label: 'אינטגרציית AI' },
    { href: '/services/automation-workflows', label: 'אוטומציה עסקית' },
    { href: '/services/growth-marketing', label: 'אוטומציית שיווק וצמיחה' },
  ];

  return (
    <section id="services" className="relative py-20 px-6" ref={ref}>
      <div className="mx-auto max-w-[1200px]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.25, 0.4, 0, 1] }}
        >
          <GradientBar />
          <h2 className="text-[clamp(2rem,3.5vw,3rem)] font-semibold text-[var(--color-text-primary)] mb-2">
            {t('services.title')}
          </h2>
          <p className="text-[var(--color-text-tertiary)] mb-12">{t('services.subtitle')}</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {services.map((s, i) => {
            const Icon = iconMap[s.icon];
            return (
              <motion.div
                key={s.key}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, ease: [0.25, 0.4, 0, 1], delay: 0.1 + i * 0.1 }}
                className="group p-6 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] hover:border-[var(--color-border-subtle)] hover:shadow-[0_0_0_1px_rgba(139,92,246,0.1),0_8px_40px_rgba(0,0,0,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-primary)] transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center mb-4 group-hover:bg-[var(--color-accent-glow)] transition-colors">
                  <Icon size={20} strokeWidth={1.5} className="text-[var(--color-accent)]" />
                </div>
                <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                  {t(`services.${s.key}.title`)}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {t(`services.${s.key}.desc`)}
                </p>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="mt-8 flex flex-wrap gap-3"
        >
          {serviceLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
