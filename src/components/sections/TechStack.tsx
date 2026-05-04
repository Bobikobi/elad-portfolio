'use client';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useI18n } from '@/lib/i18n';
import { techCategories } from '@/lib/constants';
import GradientBar from '@/components/ui/GradientBar';

export default function TechStack() {
  const { t } = useI18n();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="tech" className="relative py-20 px-6" ref={ref}>
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
          <p className="text-[var(--color-text-tertiary)] mb-12">{t('tech.subtitle')}</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {techCategories.map((cat, catIdx) => (
            <motion.div
              key={cat.key}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, ease: [0.25, 0.4, 0, 1], delay: 0.1 + catIdx * 0.1 }}
              className="p-6 rounded-2xl card-glass gradient-border hover:shadow-[0_4px_40px_rgba(0,0,0,0.5)] hover:border-transparent transition-all duration-400"
            >
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)', boxShadow: '0 0 8px rgba(139,92,246,0.7)' }}
                />
                {t(`tech.cat.${cat.key}`)}
              </h3>
              <div className="flex flex-wrap gap-2">
                {cat.items.map((item, itemIdx) => (
                  <motion.span
                    key={item}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={inView ? { opacity: 1, scale: 1 } : {}}
                    transition={{
                      type: 'spring',
                      stiffness: 80,
                      damping: 10,
                      delay: 0.3 + catIdx * 0.1 + itemIdx * 0.03,
                    }}
                    className="text-xs font-mono px-3 py-1.5 rounded-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:bg-[rgba(139,92,246,0.08)] hover:shadow-[0_0_12px_rgba(139,92,246,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] transition-all duration-200 cursor-default"
                  >
                    {item}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
