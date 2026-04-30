import type { Metadata } from 'next';
import Link from 'next/link';
import { Search, Bot, FileCode2, Gauge, ArrowLeft } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import GradientBar from '@/components/ui/GradientBar';

export const metadata: Metadata = {
  title: 'מדריך Next.js SEO + GEO לשנת 2026',
  description:
    'מדריך מעשי לשיפור דירוג בגוגל ונראות בכלי AI בפרויקטי Next.js: metadata, schema, llms.txt, Core Web Vitals ותכנון תוכן שמקבל ציטוטים.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/guides/nextjs-seo-geo-2026',
  },
};

const schemas = [
  {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: 'מדריך Next.js SEO + GEO לשנת 2026',
    description:
      'Guide for combining classic SEO with AI-oriented GEO on Next.js projects.',
    url: 'https://www.eladsaadon.dev/guides/nextjs-seo-geo-2026',
    datePublished: '2026-04-28T00:00:00Z',
    dateModified: new Date().toISOString(),
    author: {
      '@type': 'Person',
      name: 'Elad Saadon',
      url: 'https://www.eladsaadon.dev',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Elad Saadon Portfolio',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.eladsaadon.dev/logo.png',
      },
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'מה ההבדל בין SEO ל-GEO?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'SEO מתמקד בדירוג בגוגל, ו-GEO מתמקד בכך שמנועי AI יבחרו לצטט אותך כתשובה אמינה. בפועל צריך את שניהם יחד.',
        },
      },
      {
        '@type': 'Question',
        name: 'מה השינוי הראשון שכדאי לעשות באתר Next.js?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'להבטיח metadata ייחודי לכל עמוד, schema תואם לסוג התוכן, ועמודי שירות ייעודיים עם תשובה ישירה בתחילת העמוד.',
        },
      },
    ],
  },
];

export default function NextJsSeoGeoGuidePage() {
  const pillars = [
    {
      icon: Search,
      title: 'Metadata מדויק',
      desc: 'כותרת ותיאור ייחודיים לכל עמוד. גוגל קורא כדי לדרג — המשתמש קורא כדי להחליט אם ללחוץ.',
    },
    {
      icon: FileCode2,
      title: 'Schema JSON-LD',
      desc: 'מסביר לגוגל ולמנועי AI מה בדיוק בכל עמוד: שירות, מאמר, FAQ, עסק. עוזר לקבל תוצאות עשירות ב-SERP.',
    },
    {
      icon: Bot,
      title: 'תוכן מוכן לציטוט',
      desc: 'כלי AI מחפשים תשובות ישירות. עמוד שמתחיל בתשובה ברורה — נצוטט יותר ב-ChatGPT, Gemini ו-Perplexity.',
    },
    {
      icon: Gauge,
      title: 'Core Web Vitals',
      desc: 'גוגל מדרג אתרים מהירים גבוה יותר. `next/image` עם priority, `next/font` ו-Server Components שומרים על ירוק.',
    },
  ];

  const tableRows = [
    { component: 'Metadata', action: 'כותרת ותיאור ייחודיים לכל עמוד', why: 'מעלה CTR ורלוונטיות לשאילתא' },
    { component: 'Schema', action: 'Service / FAQ / BlogPosting לפי סוג עמוד', why: 'עוזר למנועים להבין ישויות וכוונה' },
    { component: 'Answer Capsule', action: 'פסקת תשובה ישירה בתחילת כל עמוד', why: 'מגדיל סיכוי לציטוט בכלי AI' },
    { component: 'llms.txt', action: 'קובץ טקסט עם מבנה האתר ותיאורי תוכן', why: 'מאפשר ל-crawlers של AI לנווט נכון' },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
      <JsonLd data={schemas} />

      <GradientBar />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
        מדריך Next.js SEO + GEO לשנת 2026
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
        להופיע גבוה בגוגל זה לא מספיק — כלי AI כמו ChatGPT ו-Gemini הפכו לנקודת כניסה חדשה. המדריך מסביר מה צריך לעשות כדי שהאתר יהיה נראה גם לגוגל וגם ל-AI.
      </p>

      {/* Pillar cards */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {pillars.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.title}
              className="flex flex-col gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5"
            >
              <div className="w-9 h-9 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                <Icon size={18} strokeWidth={1.5} className="text-[var(--color-accent)]" />
              </div>
              <h2 className="text-base font-medium text-[var(--color-text-primary)]">{p.title}</h2>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{p.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Summary table */}
      <section className="mt-12">
        <h2 className="mb-4 text-xl font-semibold text-[var(--color-text-primary)]">סיכום — מה לעשות ולמה</h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border-default)]">
          <table className="min-w-full border-collapse text-right text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]">
                <th className="px-4 py-3 font-medium">מרכיב</th>
                <th className="px-4 py-3 font-medium">מה לבצע</th>
                <th className="px-4 py-3 font-medium">למה זה חשוב</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, i) => (
                <tr
                  key={row.component}
                  className={`border-b border-[var(--color-border-default)] text-[var(--color-text-secondary)] ${i % 2 === 0 ? 'bg-[var(--color-bg-primary)]' : 'bg-[var(--color-bg-secondary)]'}`}
                >
                  <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{row.component}</td>
                  <td className="px-4 py-3">{row.action}</td>
                  <td className="px-4 py-3">{row.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-14 flex flex-col gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">רוצים יישום בפועל?</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">ראו את שירותי ה-SEO וה-Next.js, או פנו ישירות.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-default)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            השירותים <ArrowLeft size={13} />
          </Link>
          <Link
            href="/#contact"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            יצירת קשר
          </Link>
        </div>
      </section>
    </main>
  );
}
