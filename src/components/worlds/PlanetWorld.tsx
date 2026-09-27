'use client';
import { useRef, type ReactNode } from 'react';
import type { Locale } from '@/lib/translations';
import { translations } from '@/lib/translations';
import { useWorldExit } from '@/hooks/useWorldExit';
import DepartureMeter from './DepartureMeter';
import WorldBackLink from './WorldBackLink';

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
  const departureLabel = translations['world.departure'][locale];

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-end justify-start md:items-stretch">
      {/* No box: the text floats on a scrim that darkens from the reading edge (bottom on a
          phone) and dissolves into the scene, the same language as the Projects world. */}
      <div
        ref={panelRef}
        data-chrome=""
        className="world-scrim pointer-events-auto flex max-h-[62dvh] w-full flex-col px-6 pt-14 md:max-h-none md:w-[38rem] md:px-12 md:pt-24"
      >
        <div className="flex shrink-0 items-center justify-between gap-4">
          <h1 className="text-3xl text-[var(--color-star-white)] md:text-4xl">
            {title}
          </h1>
          {/* The shared back control - see WorldBackLink for why there is exactly one. */}
          <WorldBackLink locale={locale} onBack={returnHome} />
        </div>
        {/* signature gold hairline, short and anchored to the reading edge */}
        <div className="mt-4 h-px w-16 shrink-0" style={{ background: 'linear-gradient(90deg, rgba(255,201,120,0.8), rgba(255,201,120,0))' }} />
        <div className="world-scroll min-h-0 overflow-y-auto overscroll-contain pt-6 pb-28 md:pe-10">{children}</div>
      </div>
      <DepartureMeter value={meter} label={departureLabel} />
    </div>
  );
}
