'use client';

import { useMemo, useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useI18n, type Locale } from '@/lib/i18n';
import GradientBar from '@/components/ui/GradientBar';

type SkillLevel = 'expert' | 'advanced' | 'intermediate';
type SkillCategory = 'Frontend' | 'Backend' | 'AI & ML' | 'Desktop' | 'DevOps';

interface Skill {
  name: string;
  level: SkillLevel;
  years: number;
  projects: number;
  category: SkillCategory;
}

const skills: Skill[] = [
  { name: 'TypeScript', level: 'expert', years: 3, projects: 8, category: 'Frontend' },
  { name: 'Next.js', level: 'expert', years: 3, projects: 8, category: 'Frontend' },
  { name: 'React', level: 'expert', years: 3, projects: 9, category: 'Frontend' },
  { name: 'Tailwind CSS', level: 'expert', years: 3, projects: 8, category: 'Frontend' },
  { name: 'Framer Motion', level: 'advanced', years: 2, projects: 6, category: 'Frontend' },
  { name: 'Python', level: 'advanced', years: 3, projects: 7, category: 'Backend' },
  { name: 'Supabase', level: 'advanced', years: 2, projects: 6, category: 'Backend' },
  { name: 'Node.js', level: 'advanced', years: 2, projects: 7, category: 'Backend' },
  { name: 'Google Gemini', level: 'expert', years: 2, projects: 6, category: 'AI & ML' },
  { name: 'Prompt Engineering', level: 'expert', years: 2, projects: 9, category: 'AI & ML' },
  { name: 'React Hook Form', level: 'advanced', years: 2, projects: 2, category: 'Frontend' },
  { name: 'Recharts', level: 'intermediate', years: 1, projects: 2, category: 'Frontend' },
  { name: 'Vitest', level: 'advanced', years: 1, projects: 3, category: 'Frontend' },
  { name: 'Zod', level: 'advanced', years: 2, projects: 3, category: 'Backend' },
  { name: 'Electron', level: 'advanced', years: 1, projects: 2, category: 'Desktop' },
  { name: 'Puppeteer', level: 'advanced', years: 2, projects: 2, category: 'Desktop' },
  { name: 'Docker', level: 'intermediate', years: 1, projects: 3, category: 'DevOps' },
  { name: 'Vercel', level: 'expert', years: 3, projects: 10, category: 'DevOps' },
];

const categories: Array<'all' | SkillCategory> = ['all', 'Frontend', 'Backend', 'AI & ML', 'Desktop', 'DevOps'];

const tabLabels: Record<Locale, Record<'all' | SkillCategory, string>> = {
  he: {
    all: 'הכל',
    Frontend: 'Frontend',
    Backend: 'Backend',
    'AI & ML': 'AI & ML',
    Desktop: 'Desktop',
    DevOps: 'DevOps',
  },
  en: {
    all: 'All',
    Frontend: 'Frontend',
    Backend: 'Backend',
    'AI & ML': 'AI & ML',
    Desktop: 'Desktop',
    DevOps: 'DevOps',
  },
  ru: {
    all: 'Все',
    Frontend: 'Frontend',
    Backend: 'Backend',
    'AI & ML': 'AI & ML',
    Desktop: 'Desktop',
    DevOps: 'DevOps',
  },
};

const levelLabels: Record<Locale, Record<SkillLevel, string>> = {
  he: { expert: 'מומחה', advanced: 'מתקדם', intermediate: 'ביניים' },
  en: { expert: 'Expert', advanced: 'Advanced', intermediate: 'Intermediate' },
  ru: { expert: 'Эксперт', advanced: 'Продвинутый', intermediate: 'Средний' },
};

function levelWidth(level: SkillLevel) {
  if (level === 'expert') return '100%';
  if (level === 'advanced') return '75%';
  return '50%';
}

export default function TechStack() {
  const { t, locale } = useI18n();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const [activeCategory, setActiveCategory] = useState<'all' | SkillCategory>('all');

  const filteredSkills = useMemo(() => {
    if (activeCategory === 'all') return skills;
    return skills.filter((skill) => skill.category === activeCategory);
  }, [activeCategory]);

  return (
    <section id="technologies" className="relative py-20 px-6" ref={ref}>
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
          <p className="text-[var(--color-text-tertiary)] mb-8">{t('tech.subtitle')}</p>
        </motion.div>

        <div className="mb-8 flex flex-wrap gap-2">
          {categories.map((category) => {
            const count = category === 'all' ? skills.length : skills.filter((s) => s.category === category).length;
            const active = activeCategory === category;

            return (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`relative rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'text-white'
                    : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="skill-tab-indicator"
                    className="absolute inset-0 rounded-lg bg-[var(--color-accent)]"
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <span>{tabLabels[locale][category]}</span>
                  <span className="text-[10px] opacity-75">{count}</span>
                </span>
              </button>
            );
          })}
        </div>

        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredSkills.map((skill) => (
              <motion.article
                key={skill.name}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="group relative rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-4 card-glass"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium text-[var(--color-text-primary)]">{skill.name}</h3>
                  <span className="text-[10px] text-[var(--color-text-tertiary)]">{skill.category}</span>
                </div>

                <div className="h-1.5 rounded-full bg-[var(--color-bg-tertiary)] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: inView ? levelWidth(skill.level) : 0 }}
                    transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                    className="h-full rounded-full bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-gradient-end)]"
                  />
                </div>

                <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">{levelLabels[locale][skill.level]}</p>

                <div className="pointer-events-none absolute -top-2 start-1/2 z-20 w-[170px] -translate-x-1/2 rounded-lg border border-[var(--color-border-subtle)] bg-[color:rgba(9,9,11,0.96)] p-3 opacity-0 shadow-xl transition-opacity duration-200 group-hover:opacity-100">
                  <div className="text-xs font-medium text-[var(--color-text-primary)]">{skill.name}</div>
                  <div className="my-1 h-px bg-[var(--color-border-default)]" />
                  <div className="text-[11px] text-[var(--color-text-secondary)]">
                    {levelLabels[locale][skill.level]} · {skill.years}y
                  </div>
                  <div className="text-[11px] text-[var(--color-text-secondary)]">{skill.projects} projects</div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
