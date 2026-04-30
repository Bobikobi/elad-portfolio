import type { Metadata } from 'next';
import Link from 'next/link';
import { Globe, ShieldCheck, Gauge, Database, ArrowLeft } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import GradientBar from '@/components/ui/GradientBar';

export const metadata: Metadata = {
  title: 'פיתוח Next.js לעסקים וסטארטאפים',
  description:
    'פיתוח מערכות Next.js מקצה לקצה: ארכיטקטורה, ביצועים, SEO, אינטגרציות API ופריסה מאובטחת לפרודקשן עם TypeScript ו-Supabase.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/services/nextjs-development',
  },
};

const schemas = [
  {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Next.js Development Service',
    description: 'Full-stack Next.js development for web apps, dashboards, and public-facing websites.',
    url: 'https://www.eladsaadon.dev/services/nextjs-development',
    provider: {
      '@type': 'Person',
      name: 'Elad Saadon',
      url: 'https://www.eladsaadon.dev',
    },
    areaServed: { '@type': 'Country', name: 'Israel' },
    serviceType: 'Next.js Development',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'מה כולל שירות פיתוח Next.js?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'תכנון ארכיטקטורה, פיתוח צד שרת וצד לקוח, אינטגרציות API, שיפור ביצועים, SEO טכני ופריסה מלאה לפרודקשן.',
        },
      },
      {
        '@type': 'Question',
        name: 'האם אפשר לשדרג מערכת Next.js קיימת?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'כן. מאבחנים צווארי בקבוק בביצועים, ארכיטקטורה או SEO, ומשפרים בשלבים — בלי לשבור מה שעובד.',
        },
      },
    ],
  },
];

const features = [
  {
    icon: Globe,
    title: 'ביצועים ו-SEO',
    desc: 'Core Web Vitals ירוקים, SSR/ISR לפי הצורך, metadata מדויק ו-schema שגוגל מבין.',
  },
  {
    icon: ShieldCheck,
    title: 'אבטחה מובנית',
    desc: 'הרשאות, headers, rate-limiting ו-OWASP Top 10 כחלק מהארכיטקטורה — לא תוספת אחרי.',
  },
  {
    icon: Database,
    title: 'שכבת נתונים',
    desc: 'Supabase, APIs חיצוניים, ניהול cache ומסד נתונים שמחזיק עומס ומסנכרן נכון.',
  },
  {
    icon: Gauge,
    title: 'מוכן לגדול',
    desc: 'קוד נקי, מתועד ומבודק — כדי שפיצ׳ר הבא יהיה מהיר להוסיף ולא כאב ראש.',
  },
];

export default function NextJsDevelopmentPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
      <JsonLd data={schemas} />

      <GradientBar />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
        פיתוח Next.js לעסקים וסטארטאפים
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
        מוצר Next.js שנבנה נכון — מהיר למשתמש, ידידותי לגוגל, בטוח בפרודקשן ונוח לתחזוקה. מאפס ועד פריסה מלאה.
      </p>

      {/* Feature cards */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="flex flex-col gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5"
            >
              <div className="w-9 h-9 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                <Icon size={18} strokeWidth={1.5} className="text-[var(--color-accent)]" />
              </div>
              <h2 className="text-base font-medium text-[var(--color-text-primary)]">{f.title}</h2>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{f.desc}</p>
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <section className="mt-14 space-y-4">
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">שאלות נפוצות</h2>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">מה כולל שירות פיתוח Next.js?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            תכנון ארכיטקטורה, ממשק משתמש, לוגיקת שרת, בסיס נתונים, אינטגרציות API, SEO טכני ופריסה מלאה לפרודקשן.
          </p>
        </article>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">אפשר לשדרג מה שיש בלי לבנות מחדש?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            כן. מאבחנים קודם: ביצועים, ארכיטקטורה, SEO. משפרים בשלבים ממוקדים שלא שוברים את מה שעובד.
          </p>
        </article>
      </section>

      {/* CTA */}
      <section className="mt-14 flex flex-col gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">יש לכם פרויקט Next.js?</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">שתפו אותי בפרטים ונראה יחד מה אפשר לעשות.</p>
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
