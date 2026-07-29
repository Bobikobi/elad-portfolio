import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { translations as tr } from '@/lib/translations';
import { projects } from '@/lib/constants';
import ProjectsStage from './ProjectsStage';

const t = (k: string, l: Locale) => tr[k]?.[l] ?? k;

/** Projects = ringed Saturn, each project a "moon". NO outer container: each project
 *  is its OWN floating glass window, stacked vertically, its inner edge curving against
 *  Saturn's limb (the arc + scroll steering live in ProjectsStage). Content is
 *  server-rendered here (crawlable) and passed in as the stage's children. */
export default function ProjectsWorld({ locale }: { locale: Locale }) {
  const ordered = [...projects].sort((a, b) => Number(b.featured) - Number(a.featured));
  return (
    <ProjectsStage locale={locale} title={t('nav.projects', locale)} tagline={t('world.tagline.projects', locale)}>
      {ordered.map((p) => (
        <article
          key={p.id}
          data-window
          className="world-window window-enter overflow-hidden rounded-2xl border border-white/10 transition-[border-color,box-shadow] duration-300 hover:border-[var(--color-core-gold)]/45 hover:shadow-[0_10px_44px_rgba(8,10,34,0.6)]"
          style={{
            background: 'rgba(5,7,20,0.8)',
            boxShadow: '0 14px 50px rgba(8,10,34,0.42)',
            willChange: 'transform',
          }}
        >
          {/* signature gold top line (saturn-ring echo) */}
          <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,201,120,0.7), transparent)' }} />
          {p.previewImage && (
            <div className="relative aspect-[16/10] w-full overflow-hidden">
              <Image src={p.previewImage} alt={p.title[locale]} fill sizes="31rem" className="object-cover" />
            </div>
          )}
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="world-title text-[var(--color-star-white)]">
                {p.title[locale]}
              </h2>
              {p.liveUrl && (
                <a
                  href={p.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 text-xs text-[var(--color-core-gold)]/80 transition-colors hover:text-[var(--color-core-gold)]"
                >
                  {t('projects.visit', locale)} <ExternalLink size={12} />
                </a>
              )}
            </div>
            <p className="world-body mt-2 text-[var(--color-star-white)]/65">{p.description[locale]}</p>
            <ul className="mt-2.5 flex flex-wrap gap-x-2.5 gap-y-1">
              {p.techStack.slice(0, 5).map((tech) => (
                <li key={tech} className="world-chip text-[var(--color-core-gold)]/70">
                  {tech}
                </li>
              ))}
            </ul>
          </div>
        </article>
      ))}
    </ProjectsStage>
  );
}
