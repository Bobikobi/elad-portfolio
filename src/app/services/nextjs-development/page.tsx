import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';

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
          text: 'השירות כולל תכנון ארכיטקטורה, פיתוח צד שרת וצד לקוח, אינטגרציות API, שיפור ביצועים, SEO טכני ופריסה מלאה לפרודקשן.',
        },
      },
      {
        '@type': 'Question',
        name: 'כמה זמן לוקח לפתח מערכת?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'בדרך כלל 4-10 שבועות בהתאם להיקף הפיצ׳רים, דרישות אבטחה וחיבורי צד שלישי.',
        },
      },
    ],
  },
];

export default function NextJsDevelopmentPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
      <JsonLd data={schemas} />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">פיתוח Next.js לעסקים וסטארטאפים</h1>
      <p className="mt-6 rounded-xl border border-white/15 bg-white/5 p-5 text-[var(--color-text-secondary)] leading-8">
        פיתוח Next.js מקצועי שמחבר בין חוויית משתמש מהירה, קוד יציב ו-SEO טכני. ברוב הפרויקטים אפשר להרים MVP תוך 4-8 שבועות,
        כולל Backend, Authentication, Dashboard וניטור לפרודקשן.
      </p>

      <section className="mt-10 space-y-4 text-[var(--color-text-secondary)]">
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">מה מקבלים בפועל</h2>
        <ul className="list-disc space-y-2 pe-6">
          <li>ארכיטקטורה נקייה ל-Next.js App Router</li>
          <li>SSR/ISR לפי צורך עסקי ותנועת משתמשים</li>
          <li>שכבת נתונים עם Supabase או APIs חיצוניים</li>
          <li>Core Web Vitals ירוקים ומדידות ביצועים</li>
        </ul>
      </section>
    </main>
  );
}
