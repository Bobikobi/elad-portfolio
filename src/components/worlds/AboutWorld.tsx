import type { Locale } from '@/lib/translations';
import { translations as tr } from '@/lib/translations';
import { projects, techCategories } from '@/lib/constants';

const t = (k: string, l: Locale) => tr[k]?.[l] ?? k;

/** About = Earth. Bio + a few grounding metrics. */
export default function AboutWorld({ locale }: { locale: Locale }) {
  const techCount = techCategories.reduce((n, c) => n + c.items.length, 0);
  const metrics = [
    { v: `${projects.length}+`, k: 'about.metric.projects' },
    { v: `${techCount}+`, k: 'about.metric.tech' },
    { v: '3', k: 'about.metric.languages' },
    { v: '3', k: 'about.metric.cloud' },
  ];
  return (
    <div className="text-start">
      <p className="world-body text-[0.9375rem] text-[var(--color-star-white)]/85">{t('about.bio', locale)}</p>
      <dl className="mt-6 grid grid-cols-2 gap-3">
        {metrics.map((m) => (
          <div key={m.k} className="rounded-xl border border-white/8 px-4 py-3">
            <dt className="text-2xl text-[var(--color-core-gold)]" style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>{m.v}</dt>
            <dd className="world-chip mt-1 text-[var(--color-star-white)]/60">{t(m.k, locale)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
