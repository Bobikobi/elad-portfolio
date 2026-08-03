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
 *  edge). B8c: the preview is no longer an element inside that box - a rectangle with its
 *  own background sitting inside a ring segment read as a window inside a window. It is
 *  published here as `data-preview` and painted by the stage INTO the sector itself,
 *  clipped to the shape, so the window has one outline and no inner one.
 *  Content is server-rendered here (crawlable) and passed in as the stage's children. */
export default function ProjectsWorld({ locale }: { locale: Locale }) {
  const ordered = [...projects].sort((a, b) => Number(b.featured) - Number(a.featured));
  return (
    <ProjectsStage locale={locale} title={t('nav.projects', locale)} tagline={t('world.tagline.projects', locale)}>
      {ordered.map((p) => {
        const body = (
          <>
            <h2 className="world-title line-clamp-2 text-[var(--color-star-white)]">
              {p.title[locale]}
            </h2>
            <p className="world-body line-clamp-2 text-[var(--color-star-white)]/70">
              {p.description[locale]}
            </p>
            <ul className="flex flex-nowrap items-center gap-x-2.5 overflow-hidden">
              {p.techStack.slice(0, 3).map((tech) => (
                <li key={tech} className="world-chip whitespace-nowrap text-[var(--color-core-gold)]/70">
                  {tech}
                </li>
              ))}
              {p.liveUrl && (
                <li className="ms-auto inline-flex shrink-0 items-center gap-1 text-xs text-[var(--color-core-gold)]/80">
                  {t('projects.visit', locale)} <ExternalLink size={12} aria-hidden />
                </li>
              )}
            </ul>
          </>
        );
        // The whole window opens the project. It is one anchor, not an anchor nested in a
        // card: the "visit" affordance above is a list item inside it, because an <a>
        // inside an <a> is invalid and browsers silently unnest it.
        return p.liveUrl ? (
          <a
            key={p.id}
            data-window
            data-preview={p.previewImage ?? undefined}
            href={p.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${p.title[locale]} - ${t('projects.visit', locale)}`}
            className="ring-card absolute left-0 top-0 flex cursor-pointer flex-col justify-center gap-1.5 overflow-hidden"
          >
            {body}
          </a>
        ) : (
          <article
            key={p.id}
            data-window
            data-preview={p.previewImage ?? undefined}
            className="ring-card absolute left-0 top-0 flex flex-col justify-center gap-1.5 overflow-hidden"
          >
            {body}
          </article>
        );
      })}
    </ProjectsStage>
  );
}
