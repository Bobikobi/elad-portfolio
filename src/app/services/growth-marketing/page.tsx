import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';

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

export default function GrowthMarketingPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
      <JsonLd data={schemas} />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">אוטומציית שיווק וצמיחה</h1>
      <p className="mt-6 rounded-xl border border-white/15 bg-white/5 p-5 text-[var(--color-text-secondary)] leading-8">
        בונים מנוע צמיחה דיגיטלי שמחבר בין ערוץ שיווק, מוצר ותהליך מכירה. במקום עבודה ידנית מפוזרת,
        מקבלים תהליך ברור: קליטת לידים, דירוג, nurture, ותסריטי המרה מבוססי נתונים.
      </p>

      <section className="mt-10 overflow-x-auto">
        <table className="min-w-full border-collapse text-right text-sm">
          <thead>
            <tr className="border-b border-white/15 text-[var(--color-text-primary)]">
              <th className="px-4 py-3 font-semibold">רכיב</th>
              <th className="px-4 py-3 font-semibold">יישום</th>
              <th className="px-4 py-3 font-semibold">תוצאה צפויה</th>
            </tr>
          </thead>
          <tbody className="text-[var(--color-text-secondary)]">
            <tr className="border-b border-white/10">
              <td className="px-4 py-3">Lead Flow</td>
              <td className="px-4 py-3">קליטה ומיון אוטומטי לפי מקור ואיכות</td>
              <td className="px-4 py-3">תגובה מהירה יותר ולידים איכותיים יותר</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="px-4 py-3">Message Engine</td>
              <td className="px-4 py-3">מסרים מותאמים למסע לקוח ושלב משפך</td>
              <td className="px-4 py-3">עלייה בהמרות וירידה בנטישה</td>
            </tr>
            <tr>
              <td className="px-4 py-3">Performance Dashboard</td>
              <td className="px-4 py-3">מדדים שבועיים ברמת קמפיין ותוכן</td>
              <td className="px-4 py-3">שיפור החלטות וסקייל מדויק יותר</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  );
}
