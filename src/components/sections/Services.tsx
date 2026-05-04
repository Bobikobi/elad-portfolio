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
                className="group relative p-7 rounded-2xl card-glass gradient-border shimmer-hover overflow-hidden transition-all duration-400 cursor-default"
              >
                {/* Corner number */}
                <span className="absolute top-5 end-5 text-[10px] font-mono text-[var(--color-text-tertiary)] opacity-40 group-hover:opacity-70 transition-opacity">
                  0{i + 1}
                </span>

                {/* Icon with halo */}
                <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center mb-5">
                  <div className="absolute inset-0 rounded-2xl bg-[var(--color-accent)] opacity-10 group-hover:opacity-20 transition-opacity duration-400" />
                  <div
                    className="absolute inset-0 rounded-2xl group-hover:opacity-100 opacity-0 transition-opacity duration-400"
                    style={{ boxShadow: '0 0 24px rgba(139,92,246,0.5) inset' }}
                  />
                  <Icon
                    size={24}
                    strokeWidth={1.5}
                    className="relative text-[var(--color-accent)] group-hover:drop-shadow-[0_0_8px_rgba(139,92,246,0.8)] transition-all duration-400"
                  />
                </div>

                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2 group-hover:text-white transition-colors">
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
