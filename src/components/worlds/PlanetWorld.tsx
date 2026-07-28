'use client';
import { useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { translations } from '@/lib/translations';
import { homePath } from '@/lib/sections';
import { useWorldExit } from '@/hooks/useWorldExit';
import DepartureMeter from './DepartureMeter';

/**
 * Dark-glass content world shown over the persistent cosmos when a planet is
 * focused. The content itself is still server-rendered (real crawlable markup passed
 * in as children); this shell is a client component only so the world answers the
 * three exits — Escape, scroll-away, and the visible back control (R5.1 / R5.10).
 * Sits in the reading column (inline-start: right in RTL, left in LTR) so the planet
 * fills the opposite side. NO backdrop-filter (expensive over the canvas) — a solid
 * rgba glass per the spec.
 */
export default function PlanetWorld({
  locale,
  title,
  children,
}: {
  locale: Locale;
  title: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { meter, returnHome } = useWorldExit(locale, panelRef);
  const back = translations['contact.back'][locale];
  const departureLabel = translations['world.departure'][locale];

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-end justify-start px-4 pt-20 pb-6 md:items-start md:px-8">
      <div
        ref={panelRef}
        className="pointer-events-auto flex max-h-[58dvh] w-full flex-col overflow-hidden rounded-2xl border md:max-h-[calc(100dvh-6.5rem)] md:w-[34rem]"
        style={{ background: 'rgba(5,7,20,0.82)', borderColor: 'rgba(238,241,255,0.14)', boxShadow: '0 24px 70px rgba(8,10,34,0.5)' }}
      >
        {/* signature gold top line */}
        <div className="h-px shrink-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,201,120,0.7), transparent)' }} />
        <div className="flex shrink-0 items-center justify-between gap-4 px-6 pt-5">
          <h1 className="text-2xl text-[var(--color-star-white)] md:text-3xl" style={{ fontFamily: 'var(--font-display)', fontWeight: 300, letterSpacing: '0.03em' }}>
            {title}
          </h1>
          {/* A real link home (crawlable), driven through returnHome so the departure
              meter is cleared and the overview — not a re-dive — is what we land in. */}
          <Link
            href={homePath(locale)}
            data-world-back=""
            onClick={(e) => { e.preventDefault(); returnHome(); }}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/15 px-3 py-1 text-xs text-[var(--color-star-white)]/70 transition-colors hover:border-[var(--color-core-gold)]/60 hover:text-[var(--color-core-gold)]"
          >
            <ArrowRight size={13} />
            {back}
          </Link>
        </div>
        <div className="overflow-y-auto overscroll-contain px-6 py-5">{children}</div>
      </div>
      <DepartureMeter value={meter} label={departureLabel} />
    </div>
  );
}
