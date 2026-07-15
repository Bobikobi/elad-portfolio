'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useI18n } from '@/lib/i18n';
import { techCategories } from '@/lib/constants';
import GradientBar from '@/components/ui/GradientBar';

/**
 * Tech stack as grouped badges — deliberately no skill bars, levels, or
 * percentages. Self-assigned meters read as amateur; the tools themselves
 * grouped by domain say more.
 */
export default function TechStack() {
  const { t } = useI18n();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="technologies" className="relative py-14 md:py-20 px-6" ref={ref}>
      <div className="mx-auto max-w-[1200px]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.25, 0.4, 0, 1] }}
        >
          <GradientBar />
          <h2 className="text-[clamp(2rem,3.5vw,3rem)] font-semibold text-[var(--color-text-primary)] mb-2">
            {t('tech.title')}
          </h2>
          <p className="text-[var(--color-text-tertiary)] mb-10">{t('tech.subtitle')}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {techCategories.map((category, i) => (
            <motion.article
              key={category.key}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, ease: [0.25, 0.4, 0, 1], delay: 0.08 * i }}
              className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5"
            >
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">
                {t(`tech.cat.${category.key}`)}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {category.items.map((item) => (
                  <li
                    key={item}
                    className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-tertiary)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
