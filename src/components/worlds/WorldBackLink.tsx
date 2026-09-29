'use client';
import Link from 'next/link';
import type { Locale } from '@/lib/translations';
import { translations } from '@/lib/translations';
import { homePath } from '@/lib/sections';

/**
 * The one back control, shared by all five worlds.
 *
 * It exists because there were two of them and they disagreed. `PlanetWorld` (about,
 * services, tech, contact) drew a lucide `ArrowLeft`... pointing RIGHT, because it was
 * actually `ArrowRight`; `ProjectsStage` drew a literal `↩` character. Two glyphs, both
 * facing the wrong way in LTR, and a bare arrow character in copy besides - which the copy
 * convention does not allow. Whichever world you left, the control was a different one.
 *
 * Text only, no arrow (Elad, 2026-09-27): the words say where it goes.
 *
 * `onBack` is the world's own exit (it clears the departure meter and lands on the overview
 * instead of re-diving). The element stays a real `<Link>` underneath so the route is
 * crawlable and middle-click still works.
 */
export default function WorldBackLink({
  locale,
  onBack,
  className = '',
}: {
  locale: Locale;
  onBack: () => void;
  className?: string;
}) {
  return (
    <Link
      href={homePath(locale)}
      data-world-back=""
      onClick={(e) => {
        e.preventDefault();
        onBack();
      }}
      className={
        'pointer-events-auto inline-flex shrink-0 items-center rounded-full border ' +
        'border-white/15 bg-[rgba(5,7,20,0.6)] px-3 py-1 text-[14px] md:text-xs text-[var(--color-star-white)]/75 ' +
        'transition-colors hover:border-[var(--color-core-gold)]/60 hover:text-[var(--color-core-gold)] ' +
        className
      }
    >
      {translations['contact.back'][locale]}
    </Link>
  );
}
