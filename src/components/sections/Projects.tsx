'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ExternalLink, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { projects, filterCategories, filterKeys, type FilterCategory } from '@/lib/constants';
import GradientBar from '@/components/ui/GradientBar';

export default function Projects() {
  const { t, locale } = useI18n();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const [filter, setFilter] = useState<FilterCategory>('web-app');
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(null);

  const filtered = projects.filter((p) => p.category === filter);

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

        {/* Grid */}
        <motion.div layout className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filtered.map((project, i) => (
              <ProjectCard key={project.id} project={project} locale={locale} index={i} onPreview={setPreview} />
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
      {preview && (
        <PreviewModal url={preview.url} title={preview.title} onClose={() => setPreview(null)} />
      )}
    </section>
  );
}

function ProjectCard({ project, locale, index, onPreview }: { project: typeof projects[0]; locale: 'he' | 'en' | 'ru'; index: number; onPreview: (p: { url: string; title: string }) => void }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty('--card-x', `${x}px`);
    cardRef.current.style.setProperty('--card-y', `${y}px`);
  }, []);

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 40, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, ease: [0.25, 0.4, 0, 1], delay: index * 0.08 }}
      onMouseMove={handleMouseMove}
      className="group relative p-6 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] hover:border-[var(--color-border-subtle)] hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(139,92,246,0.1),0_8px_40px_rgba(0,0,0,0.3)] transition-all duration-300 overflow-hidden"
    >
      {/* Hover spotlight */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: 'radial-gradient(300px circle at var(--card-x, 50%) var(--card-y, 50%), var(--color-accent-glow), transparent 60%)',
        }}
      />

      <div className="relative z-10">
        {/* Category + live indicator */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono text-[var(--color-text-tertiary)] px-2.5 py-1 rounded-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)]">
            {project.category}
          </span>
          {project.liveUrl && (
            <span className="flex items-center gap-1.5 text-xs text-[var(--color-success)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-success)]" />
              </span>
              Live
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
          {project.title[locale]}
        </h3>

        {/* Description */}
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-5 line-clamp-3">
          {project.description[locale]}
        </p>

        {/* Tech badges */}
        <div className="flex flex-wrap gap-2 mb-5">
          {project.techStack.map((tech) => (
            <span
              key={tech}
              className="text-xs font-mono px-2.5 py-1 rounded-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)] text-[var(--color-text-tertiary)]"
            >
              {tech}
            </span>
          ))}
        </div>

        {/* Links */}
        <div className="flex items-center gap-4">
          {project.liveUrl && (
            <button
              onClick={() => onPreview({ url: project.liveUrl!, title: project.title[locale] })}
              className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              Preview
            </button>
          )}
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
            >
              <ExternalLink size={14} strokeWidth={1.5} />
              Visit
            </a>
          )}
          {project.githubUrl && (
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              GitHub
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function PreviewModal({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-5xl h-[88vh] bg-[var(--color-bg-secondary)] rounded-2xl overflow-hidden border border-[var(--color-border-default)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border-default)] shrink-0">
          <span className="text-sm font-medium text-[var(--color-text-primary)] truncate max-w-[60%]">{title}</span>
          <div className="flex items-center gap-3">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
            >
              <ExternalLink size={12} strokeWidth={1.5} />
              Open
            </a>
            <button
              onClick={onClose}
              aria-label="Close preview"
              className="p-1 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <iframe
          src={url}
          title={title}
          className="w-full flex-1 border-0"
        />
      </div>
    </div>
  );
}
