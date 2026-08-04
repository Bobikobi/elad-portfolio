import type { Locale } from '@/lib/translations';
import { translations as tr } from '@/lib/translations';
import { projects } from '@/lib/constants';
import { homePath } from '@/lib/sections';
import ProjectsStage from './ProjectsStage';

const t = (k: string, l: Locale) => tr[k]?.[l] ?? k;

/** Up to two initials from a project's name, for the windows with no screenshot behind
 *  them. Four projects have neither a live site nor a preview image - they are tools and
 *  private work, so there is nothing to photograph - and an empty pane is worse than no
 *  window at all. Drawn, not fetched: a real logo needs an asset and a line in
 *  lib/constants.ts, and both belong to the other lane. */
function monogram(title: string): string {
  const words = title
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/[\s-]+/)
    .filter(Boolean);
  if (!words.length) return '?';
  // One script only. These titles mix Hebrew and Latin freely ("OpenClaw - מערכת AI
  // אוטונומית"), and taking the first letter of the first two words gave "Oמ" - two
  // alphabets, two directions, in a two-character mark. Keep the words that match the
  // first one's script and drop the rest.
  const hebrew = (w: string) => /\p{Script=Hebrew}/u.test(w);
  const first = hebrew(words[0]);
  const same = words.filter((w) => hebrew(w) === first);
  const letters = same.slice(0, 2).map((w) => [...w][0] ?? '');
  return letters.join('').toUpperCase() || '?';
}

/** Projects = ringed Saturn, each project a "moon".
 *
 *  B8d: a window carries the site PREVIEW and no painted text. The stage draws the image
 *  into the annular sector and clips it to the shape; the words appear on the planet
 *  itself for whichever project is hovered, focused, or - with no pointer, which is every
 *  phone - sitting at the centre of the fan.
 *
 *  This file therefore emits data, not layout: the preview path and the copy the panel
 *  will show, on an element that is off-screen but real. See the note on the anchor for
 *  why it is off-screen rather than absent.
 */
export default function ProjectsWorld({ locale }: { locale: Locale }) {
  // Order: the things you can OPEN first, the ones that only describe themselves last.
  // Featured still decides within each group. A window whose project has no live URL is
  // also the one with no site to photograph, so this puts every empty-preview window at
  // the far end of the ring instead of at the start of it.
  const ordered = [...projects].sort(
    (a, b) =>
      Number(Boolean(b.liveUrl)) - Number(Boolean(a.liveUrl)) ||
      Number(b.featured) - Number(a.featured)
  );
  return (
    <ProjectsStage locale={locale} title={t('nav.projects', locale)} tagline={t('world.tagline.projects', locale)}>
      {ordered.map((p) => (
        // B8d: the window shows the PREVIEW and nothing else - the stage paints the image
        // into the sector and the words live on the planet. This element is what carries
        // them: it is the accessible and crawlable copy of the same project, positioned
        // off-screen rather than deleted.
        //
        // Deleting it would have been the obvious reading of "no text at all", and it
        // would have taken the project descriptions out of /projects for search engines
        // and screen readers both - crawlers get the cosmic view by default (F2 leaves
        // the cookie unset), so this page IS the indexed one.
        <a
          key={p.id}
          data-window
          data-preview={p.previewImage ?? undefined}
          data-title={p.title[locale]}
          data-desc={p.description[locale]}
          data-tech={p.techStack.slice(0, 3).join(' \u00b7 ')}
          data-mark={monogram(p.title[locale])}
          data-href={p.liveUrl ?? undefined}
          href={p.liveUrl ?? homePath(locale)}
          target={p.liveUrl ? '_blank' : undefined}
          rel={p.liveUrl ? 'noopener noreferrer' : undefined}
          className="ring-card sr-only"
        >
          <h2>{p.title[locale]}</h2>
          <p>{p.description[locale]}</p>
          <ul>
            {p.techStack.slice(0, 3).map((tech) => (
              <li key={tech}>{tech}</li>
            ))}
          </ul>
          {p.liveUrl && <span>{t('projects.visit', locale)}</span>}
        </a>
      ))}
    </ProjectsStage>
  );
}
