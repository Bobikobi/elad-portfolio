import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'שירותי פיתוח Next.js, AI ואוטומציה',
  description:
    'שירותי Full-Stack, אינטגרציית AI ואוטומציה עסקית עם Next.js, React, TypeScript ו-Google Gemini. הקמה מהירה, קוד נקי ופריסה לפרודקשן.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/services',
    languages: {
      'he-IL': 'https://www.eladsaadon.dev/services',
      'en-US': 'https://www.eladsaadon.dev/en',
      'ru-RU': 'https://www.eladsaadon.dev/ru',
      'x-default': 'https://www.eladsaadon.dev/services',
    },
  },
};

const serviceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Next.js, AI & Automation Development Services',
  description:
    'Full-stack web development, AI integration, and workflow automation delivered by Elad Saadon.',
  url: 'https://www.eladsaadon.dev/services',
  provider: {
    '@type': 'Person',
    name: 'Elad Saadon',
    url: 'https://www.eladsaadon.dev',
  },
  areaServed: { '@type': 'Country', name: 'Israel' },
  serviceType: 'Full-Stack Development and AI Integration',
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.eladsaadon.dev' },
    { '@type': 'ListItem', position: 2, name: 'Services', item: 'https://www.eladsaadon.dev/services' },
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'כמה זמן לוקח לבנות מערכת Next.js עם אינטגרציית AI?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'ברוב הפרויקטים MVP עולה לאוויר תוך 4-8 שבועות, תלוי בהיקף הפיצ׳רים, באינטגרציות צד שלישי וברמת האוטומציה הנדרשת.',
      },
    },
    {
      '@type': 'Question',
      name: 'איזה שירותים אתה נותן לעסקים וסטארטאפים?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'פיתוח Full-Stack ב-Next.js, אינטגרציית AI עם Gemini/OpenAI, אוטומציות תהליכים, פיתוח כלי פנימי לצוותים, ופריסה מאובטחת לפרודקשן.',
      },
    },
    {
      '@type': 'Question',
      name: 'האם אפשר לשפר מערכת קיימת בלי לבנות הכול מחדש?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'כן. בדרך כלל מתחילים באבחון צווארי בקבוק, משפרים ביצועים וארכיטקטורה בהדרגה, ומטמיעים AI או אוטומציה בשלבים עם סיכון נמוך.',
      },
    },
  ],
};

export default function ServicesPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:px-8">
      <JsonLd data={[serviceSchema, breadcrumbSchema, faqSchema]} />

      <header className="space-y-6">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">שירותי פיתוח, AI ואוטומציה</h1>
        <p className="rounded-xl border border-white/15 bg-white/5 p-5 text-base leading-8 text-[var(--color-text-secondary)]">
          אלעד סעדון מפתח מערכות Next.js עם אינטגרציית AI ואוטומציה לעסקים, סטארטאפים וגופים ציבוריים. פרויקטים עולים לפרודקשן בדרך כלל תוך 4-8 שבועות,
          עם דגש על ביצועים, SEO, נגישות ותחזוקה ארוכת טווח.
        </p>
      </header>

      <section className="mt-10 overflow-x-auto">
        <table className="min-w-full border-collapse text-right text-sm">
          <thead>
            <tr className="border-b border-white/15 text-[var(--color-text-primary)]">
              <th className="px-4 py-3 font-semibold">שירות</th>
              <th className="px-4 py-3 font-semibold">מה מקבלים</th>
              <th className="px-4 py-3 font-semibold">טכנולוגיות</th>
              <th className="px-4 py-3 font-semibold">טווח זמן</th>
            </tr>
          </thead>
          <tbody className="text-[var(--color-text-secondary)]">
            <tr className="border-b border-white/10">
              <td className="px-4 py-3">Full-Stack Web</td>
              <td className="px-4 py-3">אפליקציה מקצה לקצה כולל auth, DB ו-dashboard</td>
              <td className="px-4 py-3">Next.js, React, TypeScript, Supabase</td>
              <td className="px-4 py-3">4-8 שבועות</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="px-4 py-3">AI Integration</td>
              <td className="px-4 py-3">יכולות LLM בתוך המוצר + תהליכי עבודה חכמים</td>
              <td className="px-4 py-3">Gemini, OpenAI, Node.js</td>
              <td className="px-4 py-3">2-6 שבועות</td>
            </tr>
            <tr>
              <td className="px-4 py-3">Automation</td>
              <td className="px-4 py-3">חיבור מערכות ואוטומציות שמקטינות עבודה ידנית</td>
              <td className="px-4 py-3">Python, APIs, Webhooks</td>
              <td className="px-4 py-3">2-5 שבועות</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mt-12 space-y-5">
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">שאלות נפוצות</h2>
        <article className="rounded-xl border border-white/15 bg-white/5 p-5">
          <h3 className="text-lg font-medium text-[var(--color-text-primary)]">כמה זמן לוקח לבנות מערכת Next.js עם AI?</h3>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            ברוב המקרים מערכת ראשונה עולה לאוויר תוך 4-8 שבועות. אם יש אינטגרציות מורכבות או תהליכים רגולטוריים, בונים Roadmap בשלבים.
          </p>
        </article>
        <article className="rounded-xl border border-white/15 bg-white/5 p-5">
          <h3 className="text-lg font-medium text-[var(--color-text-primary)]">אתה עובד גם על מערכות קיימות?</h3>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            כן. לעיתים השיפור המהיר ביותר מגיע משדרוג ארכיטקטורה, אופטימיזציית ביצועים והוספת שכבת אוטומציה, בלי שכתוב מלא.
          </p>
        </article>
      </section>

      <section className="mt-12 space-y-4 rounded-xl border border-white/15 bg-white/5 p-6">
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">יכולות שיווק וצמיחה שהוספנו</h2>
        <p className="text-[var(--color-text-secondary)] leading-8">
          מעבר לפיתוח הטכני, אפשר להקים שכבת שיווק מבוססת נתונים שמחברת בין כניסת לידים, תסריטי מסרים, מדדי המרה ואוטומציה של מעקב.
          כך תהליך המכירה עובד בצורה עקבית ולא תלוי בעבודה ידנית מתמשכת.
        </p>
        <a
          href="/services/growth-marketing"
          className="inline-flex rounded-lg border border-[var(--color-border-default)] px-4 py-2 text-sm text-[var(--color-accent)] hover:border-[var(--color-accent)]"
        >
          מעבר לעמוד אוטומציית שיווק וצמיחה
        </a>
      </section>
    </main>
  );
}
