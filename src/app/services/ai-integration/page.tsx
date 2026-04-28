import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'אינטגרציית AI למערכות קיימות וחדשות',
  description:
    'הטמעת AI בתוך מוצרי Web: צ׳אט חכם, סיכום מסמכים, סיווג נתונים, agent workflows ואוטומציה עם Gemini/OpenAI בצורה מאובטחת ומדידה.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/services/ai-integration',
  },
};

const schemas = [
  {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'AI Integration Service',
    description: 'LLM integration, AI-assisted workflows, and automation features for business applications.',
    url: 'https://www.eladsaadon.dev/services/ai-integration',
    provider: {
      '@type': 'Person',
      name: 'Elad Saadon',
      url: 'https://www.eladsaadon.dev',
    },
    areaServed: { '@type': 'Country', name: 'Israel' },
    serviceType: 'AI Integration and Automation',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'איך משלבים AI בלי לסכן מידע רגיש?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'מגדירים שכבת הרשאות, סינון מידע, לוגים מבוקרים וקריאות שרת מאובטחות כך שמפתחות וסודות לא נחשפים ללקוח.',
        },
      },
      {
        '@type': 'Question',
        name: 'איזה תהליכים אפשר לאוטומט עם AI?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'תיעוד, סיכום פניות, יצירת תוכן ראשוני, סיווג ותיעדוף משימות, וחילוץ מידע ממסמכים וטפסים.',
        },
      },
    ],
  },
];

export default function AiIntegrationPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
      <JsonLd data={schemas} />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">אינטגרציית AI למוצרים דיגיטליים</h1>
      <p className="mt-6 rounded-xl border border-white/15 bg-white/5 p-5 text-[var(--color-text-secondary)] leading-8">
        משלבים יכולות AI בתוך מוצר קיים או חדש כך שהצוות חוסך זמן והמשתמש מקבל ערך ברור. תהליך טיפוסי לוקח 2-6 שבועות
        וכולל הגדרת use-cases, PoC, מדדי הצלחה, והטמעה לפרודקשן עם ניטור איכות.
      </p>

      <section className="mt-10 overflow-x-auto">
        <table className="min-w-full border-collapse text-right text-sm">
          <thead>
            <tr className="border-b border-white/15 text-[var(--color-text-primary)]">
              <th className="px-4 py-3">Use Case</th>
              <th className="px-4 py-3">תוצאה עסקית</th>
              <th className="px-4 py-3">זמן יישום</th>
            </tr>
          </thead>
          <tbody className="text-[var(--color-text-secondary)]">
            <tr className="border-b border-white/10">
              <td className="px-4 py-3">Internal AI Assistant</td>
              <td className="px-4 py-3">קיצור זמן חיפוש מידע והדרכות</td>
              <td className="px-4 py-3">2-4 שבועות</td>
            </tr>
            <tr>
              <td className="px-4 py-3">Document Processing</td>
              <td className="px-4 py-3">חיסכון ידני בתיעוד וסיכום</td>
              <td className="px-4 py-3">3-6 שבועות</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  );
}
