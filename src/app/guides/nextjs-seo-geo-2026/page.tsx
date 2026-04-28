import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';

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
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
      <JsonLd data={schemas} />

      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">מדריך Next.js SEO + GEO לשנת 2026</h1>
      <p className="mt-6 rounded-xl border border-white/15 bg-white/5 p-5 text-[var(--color-text-secondary)] leading-8">
        כדי להופיע גבוה בגוגל וגם בתשובות AI, אתר Next.js צריך לשלב SEO קלאסי עם GEO: metadata מדויק, סכמות JSON-LD,
        עמודי שירות ממוקדי intent, ותוכן שנכתב כתשובות ישירות עם נתונים מדידים. זה השילוב שמגדיל גם חשיפות וגם המרות.
      </p>

      <section className="mt-10 overflow-x-auto">
        <table className="min-w-full border-collapse text-right text-sm">
          <thead>
            <tr className="border-b border-white/15 text-[var(--color-text-primary)]">
              <th className="px-4 py-3">מרכיב</th>
              <th className="px-4 py-3">מה לבצע</th>
              <th className="px-4 py-3">למה זה חשוב</th>
            </tr>
          </thead>
          <tbody className="text-[var(--color-text-secondary)]">
            <tr className="border-b border-white/10">
              <td className="px-4 py-3">Metadata</td>
              <td className="px-4 py-3">כותרת ותיאור ייחודיים לכל עמוד</td>
              <td className="px-4 py-3">מעלה CTR ורלוונטיות לשאילתא</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="px-4 py-3">Schema</td>
              <td className="px-4 py-3">Service/FAQ/BlogPosting לפי סוג עמוד</td>
              <td className="px-4 py-3">עוזר למנועים להבין ישויות וכוונה</td>
            </tr>
            <tr>
              <td className="px-4 py-3">Answer Capsule</td>
              <td className="px-4 py-3">פסקת תשובה ישירה בתחילת עמוד</td>
              <td className="px-4 py-3">מגדיל סיכוי לציטוט בכלי AI</td>
            </tr>
          </tbody>
        </table>
      </section>

      <p className="mt-10 text-[var(--color-text-secondary)]">
        לשירותי יישום בפועל אפשר לראות את עמוד <Link className="text-[var(--color-accent)] hover:underline" href="/services">השירותים</Link> או
        לפנות דרך <Link className="text-[var(--color-accent)] hover:underline" href="/#contact">טופס יצירת קשר</Link>.
      </p>
    </main>
  );
}
