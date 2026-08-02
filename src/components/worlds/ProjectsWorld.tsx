import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { translations as tr } from '@/lib/translations';
import { projects } from '@/lib/constants';
import ProjectsStage from './ProjectsStage';

const t = (k: string, l: Locale) => tr[k]?.[l] ?? k;

/** Projects = ringed Saturn, each project a "moon". NO outer container: each project is
 *  its OWN window, and since B8b each window is an annular sector fanned around Saturn —
 *  the shape, the fan and the scroll-along-the-ring live in ProjectsStage, which owns
 *  every window's size and transform from a per-frame layer.
 *
 *  What this file owns is only what goes INSIDE the sector's inscribed content box. That
 *  box is small and its height is set by the ring (the sector is narrowest at its inner
 *  edge), so the preview is a full-bleed backdrop under a scrim rather than a banner
 *  stacked above the text: it keeps the image and still gives the text the whole box.
 *  Content is server-rendered here (crawlable) and passed in as the stage's children. */
export default function ProjectsWorld({ locale }: { locale: Locale }) {
  const ordered = [...projects].sort((a, b) => Number(b.featured) - Number(a.featured));
  return (
    <ProjectsStage locale={locale} title={t('nav.projects', locale)} tagline={t('world.tagline.projects', locale)}>
      {ordered.map((p) => (
        <article
          key={p.id}
          data-window
          className="ring-card group absolute left-0 top-0 flex flex-col justify-end overflow-hidden rounded-[12px]"
        >
          {p.previewImage && (
            <Image
              src={p.previewImage}
              alt=""
              fill
              sizes="320px"
              aria-hidden
              className="pointer-events-none object-cover opacity-30 transition-opacity duration-300 group-hover:opacity-45"
            />
          )}
          <div className="ring-card-scrim pointer-events-none absolute inset-0" />
          <div className="relative flex flex-col gap-1.5 p-3.5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="world-title line-clamp-2 text-[var(--color-star-white)]">
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
            <p className="world-body line-clamp-2 text-[var(--color-star-white)]/70">{p.description[locale]}</p>
            <ul className="flex flex-nowrap gap-x-2.5 overflow-hidden">
              {p.techStack.slice(0, 3).map((tech) => (
                <li key={tech} className="world-chip whitespace-nowrap text-[var(--color-core-gold)]/70">
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
