'use client';
import { useScene } from '@/lib/sceneStore';
import { SECTIONS } from '@/lib/sections';
import { useI18n } from '@/lib/i18n';

/**
 * T7b: mobile-tour pagination. A glass strip of one dot per tour stop (the 5 sections),
 * the active stop elongated + gold. Portrait / coarse-pointer only, and only while the
 * overview tour is live (solar act, no world focused). Tapping a dot flies straight to
 * that stop — a shortcut alongside the horizontal swipe. Hidden on desktop and inside a
 * focused world.
 */
export default function TourDots() {
  const { t } = useI18n();
  const tourMode = useScene((s) => s.tourMode);
  const act = useScene((s) => s.act);
  const focused = useScene((s) => s.focusedPlanet);
  const stop = useScene((s) => s.tourStop);
  const setTourStop = useScene((s) => s.setTourStop);

  if (!tourMode || act !== 'solar' || focused) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-9 z-20 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/12 bg-[rgba(5,7,20,0.45)] px-4 py-2.5 shadow-[0_6px_24px_rgba(5,7,20,0.5)] backdrop-blur-md">
        {SECTIONS.map((s, i) => {
          const active = i === stop;
          return (
            <button
              key={s.id}
              type="button"
              aria-label={t(s.navKey)}
              aria-current={active ? 'true' : undefined}
              onClick={() => setTourStop(i)}
              className={`h-2.5 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-core-gold)] ${
                active ? 'w-6 bg-[var(--color-core-gold)]' : 'w-2.5 bg-white/35 hover:bg-white/60'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
