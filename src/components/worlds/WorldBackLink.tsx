'use client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
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
 * The icon is directional and MIRRORS WITH THE READING DIRECTION: "back" is left in LTR and
 * right in RTL, so Hebrew gets the arrow flipped rather than a second icon. The direction
 * comes off `locale`, the same source `lib/i18n` sets `document.dir` from, so the two can
 * never disagree.
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
  const rtl = locale === 'he';
  return (
    <Link
      href={homePath(locale)}
      data-world-back=""
      onClick={(e) => {
        e.preventDefault();
        onBack();
      }}
      className={
        'pointer-events-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border ' +
        'border-white/15 bg-[rgba(5,7,20,0.6)] px-3 py-1 text-xs text-[var(--color-star-white)]/75 ' +
        'transition-colors hover:border-[var(--color-core-gold)]/60 hover:text-[var(--color-core-gold)] ' +
        className
      }
    >
      <ArrowLeft size={13} aria-hidden style={rtl ? { transform: 'scaleX(-1)' } : undefined} />
      {translations['contact.back'][locale]}
    </Link>
  );
}
