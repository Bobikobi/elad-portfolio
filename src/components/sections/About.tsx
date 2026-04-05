'use client';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useI18n } from '@/lib/i18n';
import { metrics } from '@/lib/constants';
import Counter from '@/components/ui/Counter';
import GradientBar from '@/components/ui/GradientBar';

export default function About() {
  const { t } = useI18n();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="about" className="relative py-32 px-6" ref={ref}>
      <div className="mx-auto max-w-[1200px]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.25, 0.4, 0, 1] }}
        >
          <GradientBar />
          <h2 className="text-[clamp(2rem,3.5vw,3rem)] font-semibold text-[var(--color-text-primary)] mb-6">
            {t('about.title')}
          </h2>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.25, 0.4, 0, 1], delay: 0.1 }}
          className="text-lg text-[var(--color-text-secondary)] leading-relaxed max-w-2xl mb-16"
        >
          {t('about.bio')}
        </motion.p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, ease: [0.25, 0.4, 0, 1], delay: 0.2 + i * 0.1 }}
              className="p-6 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)]"
            >
              <div className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] mb-1">
                <Counter target={m.value} inView={inView} />+
              </div>
              <div className="text-sm text-[var(--color-text-tertiary)]">{t(m.label)}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
