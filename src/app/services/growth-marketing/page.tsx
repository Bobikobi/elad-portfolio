import type { Metadata } from 'next';
import Link from 'next/link';
import { Filter, Mail, BarChart2, Sparkles, ArrowLeft } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import GradientBar from '@/components/ui/GradientBar';

export const metadata: Metadata = {
  title: 'אוטומציית שיווק וצמיחה דיגיטלית',
  description:
    'פיתוח תשתיות שיווק מדידות: אוטומציות לידים, תהליכי nurturing, דשבורדים ותסריטי המרה שמחברים בין מוצר, תוכן ותוצאות עסקיות.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/services/growth-marketing',
  },
};

const schemas = [
  {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Growth Marketing Automation Service',
    description: 'Automation-first growth marketing implementation for lead pipelines and measurable conversion workflows.',
    url: 'https://www.eladsaadon.dev/services/growth-marketing',
    provider: {
      '@type': 'Person',
      name: 'Elad Saadon',
      url: 'https://www.eladsaadon.dev',
    },
    serviceType: 'Growth Marketing Automation',
    areaServed: { '@type': 'Country', name: 'Israel' },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'מה כוללת תשתית שיווקית טובה לעסק דיגיטלי?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'תשתית טובה כוללת מדידה אחידה, ניהול מקור לידים, אוטומציית follow-up, ודשבורד ביצועים שמחבר בין קמפיינים, תוכן והמרות בפועל.',
        },
      },
      {
        '@type': 'Question',
        name: 'איך משלבים AI בתוך תהליך השיווק?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'משלבים AI בהפקת וריאציות תוכן, סיכום שיחות, דירוג לידים ואופטימיזציה של מסרים. המטרה היא לקצר זמן תגובה ולשפר יחס המרה.',
        },
      },
    ],
  },
];

const components = [
  {
    icon: Filter,
    title: 'קליטה וסינון לידים',
    desc: 'כל ליד שנכנס מסווג אוטומטית לפי מקור, איכות והתנהגות — הצוות מדבר רק עם מי שכדאי.',
  },
  {
    icon: Mail,
    title: 'מסרים שמגיעים בזמן הנכון',
    desc: 'סדרת הודעות שמתאימה את עצמה לשלב של כל ליד במשפך — לא blast חד-פעמי, אלא תקשורת שבונה אמון.',
  },
  {
    icon: BarChart2,
    title: 'דשבורד ביצועים',
    desc: 'מדדים שבועיים ברמת קמפיין, ערוץ ותוכן — מבינים מה עובד ומשפרים על בסיס נתונים, לא תחושות.',
  },
  {
    icon: Sparkles,
    title: 'AI בשירות השיווק',
    desc: 'AI שמדרג לידים, מייצר וריאציות מסרים ומסכם שיחות — פחות עבודה ידנית, יותר זמן לאסטרטגיה.',
  },
];

export default function GrowthMarketingPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
      <JsonLd data={schemas} />

      <GradientBar />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
        אוטומציית שיווק וצמיחה
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
        במקום לעקוב ידנית אחרי כל ליד, בונים מנוע שעושה את זה לבד — מהרגע שמישהו מגיע לאתר ועד לרגע שהוא הופך ללקוח.
      </p>

      {/* Component cards */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {components.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.title}
              className="flex flex-col gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5"
            >
              <div className="w-9 h-9 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                <Icon size={18} strokeWidth={1.5} className="text-[var(--color-accent)]" />
              </div>
              <h2 className="text-base font-medium text-[var(--color-text-primary)]">{c.title}</h2>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{c.desc}</p>
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <section className="mt-14 space-y-4">
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">שאלות נפוצות</h2>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">מה כוללת תשתית שיווקית טובה?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            מדידה אחידה, ניהול מקורות לידים, אוטומציית מעקב ודשבורד שמחבר בין קמפיינים, תוכן והמרות בפועל.
          </p>
        </article>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">האם זה מתאים לעסק קטן?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            כן. בעסק קטן יש פחות משאבים ידניים, אז אוטומציה חוסכת יחסית יותר. מתחילים בנקודה אחת ומרחיבים לפי הצורך.
          </p>
        </article>
      </section>

      {/* CTA */}
      <section className="mt-14 flex flex-col gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">רוצים מנוע צמיחה שרץ לבד?</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">ספרו לי על הערוצים שלכם ונתכנן יחד.</p>
        </div>
        <Link
          href="/#contact"
          className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          בואו נדבר <ArrowLeft size={14} />
        </Link>
      </section>
    </main>
  );
}
