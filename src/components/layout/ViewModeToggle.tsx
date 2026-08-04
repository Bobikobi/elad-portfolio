'use client';
import { Orbit, LayoutList } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useViewMode } from '@/lib/viewModeContext';

/**
 * The classic/cosmic switch (F2). Hidden entirely when the browser cannot render the
 * cosmos - offering a way back to a view that would immediately be taken away again is
 * worse than not offering it.
 */
export default function ViewModeToggle({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const { mode, setMode, cosmicUnavailable } = useViewMode();
  if (cosmicUnavailable) return null;

  const next = mode === 'cosmic' ? 'classic' : 'cosmic';
  const label = t(next === 'classic' ? 'view.classic' : 'view.cosmic');
  const Icon = next === 'classic' ? LayoutList : Orbit;

  return (
    <button
      type="button"
      onClick={() => setMode(next)}
      aria-label={label}
      title={label}
      className={
        compact
          ? 'chrome-surface flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-core-gold)]'
          : 'chrome-surface hidden items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-core-gold)] md:flex'
      }
    >
      <Icon size={14} aria-hidden />
      <span className={compact ? '' : 'hidden lg:inline'}>{label}</span>
    </button>
  );
}
