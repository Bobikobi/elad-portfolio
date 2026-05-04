'use client';
import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { projects, filterCategories, filterKeys, type FilterCategory } from '@/lib/constants';
import GradientBar from '@/components/ui/GradientBar';
import { GithubIcon } from '@/components/ui/SocialIcons';

function getProjectPreviewSrc(project: typeof projects[0]) {
  return project.previewImage ?? null;
}

export default function Projects() {
  const { t, locale } = useI18n();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const [filter, setFilter] = useState<FilterCategory>('web-app');

  const filtered = projects.filter((p) => p.category === filter);
  const featuredProject = filtered.find((p) => p.id === 'openclaw') ?? filtered[0];
  const regularProjects = filtered.filter((p) => p.id !== featuredProject?.id);
  const sideStack = regularProjects.slice(0, 2);
  const bottomRow = regularProjects.slice(2, 5);

  return (
    <section id="projects" className="relative py-20 px-6" ref={ref}>
      <div className="mx-auto max-w-[1200px]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.25, 0.4, 0, 1] }}
        >
          <GradientBar />
          <h2 className="text-[clamp(2rem,3.5vw,3rem)] font-semibold text-[var(--color-text-primary)] mb-2">
            {t('projects.title')}
          </h2>
          <p className="text-[var(--color-text-tertiary)] mb-8">{t('projects.subtitle')}</p>
        </motion.div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 mb-10">
          {filterCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === cat
                  ? 'text-white'
                  : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)]'
              }`}
            >
              {filter === cat && (
                <motion.div
                  layoutId="filter-active"
                  className="absolute inset-0 rounded-lg bg-[var(--color-accent)]"
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                />
              )}
              <span className="relative z-10">{t(filterKeys[cat])}</span>
            </button>
          ))}
        </div>

        {/* Bento grid */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={filter}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[220px]"
          >
            {featuredProject && (
              <ProjectCardFeatured
                project={featuredProject}
                locale={locale}
                className="md:col-span-2 md:row-span-2"
              />
            )}

            {sideStack.map((project) => (
              <ProjectCardSmall key={project.id} project={project} locale={locale} className="md:col-span-1" />
            ))}

            {bottomRow.map((project) => (
              <ProjectCardSmall key={project.id} project={project} locale={locale} className="md:col-span-1" />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function getCaseStudy(locale: 'he' | 'en' | 'ru') {
  return {
    challenge:
      locale === 'he'
        ? 'לבנות סוכן אוטונומי שמנהל תהליכי AI ומסחר מקצה לקצה.'
        : locale === 'ru'
          ? 'Построить автономного агента для полного цикла AI и торговли.'
          : 'Build an autonomous agent that manages AI and trading flows end-to-end.',
    result:
      locale === 'he'
        ? 'מערכת ייצור חיה עם 11+ שירותים פעילים ו-5 אסטרטגיות במקביל.'
        : locale === 'ru'
          ? 'Production-система: 11+ сервисов и 5 параллельных стратегий.'
          : 'Production-grade system with 11+ services and 5 parallel strategies.',
  };
}

function ProjectCardFeatured({
  project,
  locale,
  className,
}: {
  project: typeof projects[0];
  locale: 'he' | 'en' | 'ru';
  className?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const previewSrc = getProjectPreviewSrc(project);
  const [previewUnavailable, setPreviewUnavailable] = useState(false);
  const { challenge, result } = getCaseStudy(locale);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -18, scale: 0.97 }}
      transition={{ duration: 0.45, ease: [0.25, 0.4, 0, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={`group relative overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] gradient-border shimmer-hover ${className ?? ''}`}
    >
      <div className="absolute inset-0">
        {previewSrc && !previewUnavailable ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewSrc}
            alt={project.title[locale]}
            className="h-full w-full object-cover object-top"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setPreviewUnavailable(true)}
          />
        ) : (
          <div className="h-full w-full bg-[linear-gradient(135deg,rgba(139,92,246,0.28),rgba(6,182,212,0.18))]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(9,9,11,0.92)_0%,rgba(9,9,11,0.58)_45%,rgba(9,9,11,0.2)_100%)]" />
      </div>

      <div className="relative z-10 flex h-full flex-col justify-end p-6 text-start">
        <span className="mb-3 w-fit rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
          Featured
        </span>
        <h3 className="text-2xl font-semibold text-[var(--color-text-primary)]">{project.title[locale]}</h3>
        <p className="mt-2 max-w-xl text-sm text-[var(--color-text-secondary)] line-clamp-2">{project.description[locale]}</p>

        <motion.div
          className="absolute inset-x-0 bottom-0 bg-[color:rgba(9,9,11,0.95)] p-6 flex flex-col gap-3"
          initial={{ y: '100%' }}
          animate={{ y: hovered ? 0 : '100%' }}
          transition={{ type: 'spring', damping: 20, stiffness: 220 }}
        >
          <div className="flex flex-wrap gap-2">
            {project.techStack.slice(0, 5).map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-bg-tertiary)] px-2.5 py-1 text-[10px] text-[var(--color-text-secondary)]"
              >
                {tech}
              </span>
            ))}
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            <span className="font-semibold text-[var(--color-text-primary)]">Challenge:</span> {challenge}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            <span className="font-semibold text-[var(--color-text-primary)]">Result:</span> {result}
          </p>

          <div className="mt-1 flex flex-wrap gap-2">
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-2 text-xs font-medium text-white"
              >
                <ExternalLink size={14} /> Live
              </a>
            )}
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-subtle)] px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)]"
              >
                <GithubIcon size={14} /> GitHub
              </a>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function ProjectCardSmall({
  project,
  locale,
  className,
}: {
  project: typeof projects[0];
  locale: 'he' | 'en' | 'ru';
  className?: string;
}) {
  const previewSrc = getProjectPreviewSrc(project);
  const [previewUnavailable, setPreviewUnavailable] = useState(false);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ duration: 0.35 }}
      className={`group relative overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-4 gradient-border shimmer-hover ${className ?? ''}`}
    >
      <div className="mb-3 h-24 overflow-hidden rounded-lg bg-[var(--color-bg-tertiary)]">
        {previewSrc && !previewUnavailable ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewSrc}
            alt={project.title[locale]}
            className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setPreviewUnavailable(true)}
          />
        ) : (
          <div className="h-full w-full bg-[linear-gradient(135deg,rgba(139,92,246,0.2),rgba(6,182,212,0.14))]" />
        )}
      </div>

      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] text-start line-clamp-1">{project.title[locale]}</h3>
      <p className="mt-1 text-xs text-[var(--color-text-secondary)] line-clamp-2 text-start">{project.description[locale]}</p>

      <div className="mt-3 flex items-center justify-between">
        <span className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-bg-tertiary)] px-2 py-1 text-[10px] text-[var(--color-text-tertiary)]">
          {project.category}
        </span>
        <div className="flex items-center gap-2">
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
              aria-label={`Open ${project.title[locale]}`}
            >
              <ExternalLink size={14} />
            </a>
          )}
          {project.githubUrl && (
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
              className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
              aria-label={`Open GitHub for ${project.title[locale]}`}
          >
              <GithubIcon size={14} />
          </a>
          )}
        </div>
      </div>
    </motion.article>
  );
}


