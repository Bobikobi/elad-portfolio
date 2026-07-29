import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { translations as tr } from '@/lib/translations';

const t = (k: string, l: Locale) => tr[k]?.[l] ?? k;

// The four services = Jupiter's Galilean moons; two link down to the kept marketing
// detail pages (the deeper /services/* routes stay as-is for SEO).
const SERVICES = [
  { key: 'web', detail: 'services/nextjs-development' },
  { key: 'ai', detail: 'services/ai-integration' },
  { key: 'desktop', detail: null },
  { key: 'civic', detail: null },
] as const;

export default function ServicesWorld({ locale }: { locale: Locale }) {
  const path = (s: string) => (locale === 'he' ? `/${s}` : `/${locale}/${s}`);
  const more = { he: 'פרטים נוספים', en: 'Learn more', ru: 'Подробнее' }[locale];
  return (
    <div className="text-start">
      <p className="world-body mb-5 text-[var(--color-star-white)]/70">{t('services.subtitle', locale)}</p>
      <div className="space-y-3">
        {SERVICES.map((s) => (
          <div key={s.key} className="rounded-2xl border border-white/8 p-4" style={{ background: 'rgba(238,241,255,0.02)' }}>
            <h2 className="world-title text-[var(--color-star-white)]">
              {t(`services.${s.key}.title`, locale)}
            </h2>
            <p className="world-body mt-2 text-[var(--color-star-white)]/65">{t(`services.${s.key}.desc`, locale)}</p>
            {s.detail && (
              <Link href={path(s.detail)} className="world-chip mt-3 inline-flex items-center gap-1 text-[var(--color-core-gold)]/80 transition-colors hover:text-[var(--color-core-gold)]">
                {more} <ArrowUpRight size={13} />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
