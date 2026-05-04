'use client';

import { motion, useInView } from 'framer-motion';
import { useMemo, useRef } from 'react';
import { useI18n } from '@/lib/i18n';

const timeline = [
  {
    year: '2020',
    he: 'תואר ראשון בעבודה סוציאלית',
    en: "Bachelor's in Social Work",
    ru: 'Бакалавр социальной работы',
    sub_he: 'הבסיס להבנת משתמשים אמיתיים',
    sub_en: 'Foundation for understanding real users',
    sub_ru: 'База для понимания реальных пользователей',
  },
  {
    year: '2022',
    he: 'קוד ראשון',
    en: 'First code',
    ru: 'Первый код',
    sub_he: 'HTML, CSS, JS — אהבה ממבט ראשון',
    sub_en: 'HTML, CSS, JS — love at first sight',
    sub_ru: 'HTML, CSS, JS — любовь с первого взгляда',
  },
  {
    year: '2023',
    he: 'פיתוח פול-סטאק',
    en: 'Full-Stack Development',
    ru: 'Full-Stack разработка',
    sub_he: 'React, Next.js, TypeScript, Supabase',
    sub_en: 'React, Next.js, TypeScript, Supabase',
    sub_ru: 'React, Next.js, TypeScript, Supabase',
  },
  {
    year: '2024',
    he: 'OpenClaw',
    en: 'OpenClaw',
    ru: 'OpenClaw',
    sub_he: 'מערכת AI אוטונומית על Contabo VPS',
    sub_en: 'Autonomous AI system on Contabo VPS',
    sub_ru: 'Автономная AI система на Contabo VPS',
  },
  {
    year: '2025',
    he: 'פרויקטים ציבוריים',
    en: 'Civic projects',
    ru: 'Гражданские проекты',
    sub_he: 'מצפן פוליטי, חירום נתניה, SHAPERZ',
    sub_en: 'Political Compass, Netanya Emergency, SHAPERZ',
    sub_ru: 'Political Compass, Netanya Emergency, SHAPERZ',
  },
] as const;

export default function AboutTimeline() {
  const { locale, dir } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-120px' });

  const items = useMemo(
    () =>
      timeline.map((item) => ({
        year: item.year,
        title: item[locale],
        subtitle: item[`sub_${locale}` as 'sub_he' | 'sub_en' | 'sub_ru'],
      })),
    [locale]
  );

  return (
    <div ref={ref} className="relative ps-6 md:ps-10">
      <motion.div
        initial={{ scaleY: 0 }}
        animate={inView ? { scaleY: 1 } : {}}
        transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
        className="absolute start-0 top-0 h-full w-px origin-top bg-gradient-to-b from-[var(--color-gradient-start)] via-[var(--color-accent)] to-transparent"
      />

      <div className="space-y-8">
        {items.map((item, index) => {
          const rtlFlip = dir === 'rtl';
          const even = index % 2 === 0;
          const xFrom = rtlFlip ? (even ? 20 : -20) : even ? -20 : 20;

          return (
            <motion.article
              key={item.year}
              initial={{ opacity: 0, x: xFrom, y: 12 }}
              animate={inView ? { opacity: 1, x: 0, y: 0 } : {}}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="relative rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-4 card-glass"
            >
              <div className="absolute -start-[36px] top-4 flex h-8 min-w-8 items-center justify-center rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)] px-2 text-[11px] font-semibold text-[var(--color-text-secondary)]">
                {item.year}
              </div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{item.title}</h3>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{item.subtitle}</p>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
