import type { Locale } from '@/lib/translations';
import { translations as tr } from '@/lib/translations';
import { techCategories } from '@/lib/constants';

const t = (k: string, l: Locale) => tr[k]?.[l] ?? k;

/** Technologies = the asteroid belt. Grouped tech badges (the "clusters"). */
export default function TechWorld({ locale }: { locale: Locale }) {
  return (
    <div className="text-start">
      <p className="world-body mb-5 text-[var(--color-star-white)]/70">{t('tech.subtitle', locale)}</p>
      <div className="space-y-5">
        {techCategories.map((cat) => (
          <div key={cat.key}>
            <h2 className="world-eyebrow mb-2 text-[var(--color-core-gold)]/80">{t(`tech.cat.${cat.key}`, locale)}</h2>
            <ul className="flex flex-wrap gap-2">
              {cat.items.map((item) => (
                <li key={item} className="world-chip rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[var(--color-star-white)]/80">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
