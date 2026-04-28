import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'אוטומציה של תהליכים עסקיים',
  description:
    'תכנון ופיתוח אוטומציות שמקצרות עבודה ידנית: חיבור מערכות, טריגרים, עיבוד נתונים ודו"חות אוטומטיים עם Node.js, Python ו-APIs.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/services/automation-workflows',
  },
};

const schemas = [
  {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Business Workflow Automation Service',
    description: 'Automation pipelines for business operations, data handling, and reporting.',
    url: 'https://www.eladsaadon.dev/services/automation-workflows',
    provider: {
      '@type': 'Person',
      name: 'Elad Saadon',
      url: 'https://www.eladsaadon.dev',
    },
    areaServed: { '@type': 'Country', name: 'Israel' },
    serviceType: 'Automation Development',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'איזה תהליכים כדאי לאוטומט קודם?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'מתחילים בתהליכים שחוזרים הרבה פעמים בשבוע וגוזלים זמן ידני. בדרך כלל דיווחים, סנכרון נתונים ומשימות תפעוליות.',
        },
      },
      {
        '@type': 'Question',
        name: 'איך מודדים הצלחה באוטומציה?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'מודדים זמן שנחסך, ירידה בטעויות ידניות, קיצור זמני תגובה ותפוקה כוללת של הצוות לפני ואחרי ההטמעה.',
        },
      },
    ],
  },
];

export default function AutomationWorkflowsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
      <JsonLd data={schemas} />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">אוטומציה לתהליכים עסקיים</h1>
      <p className="mt-6 rounded-xl border border-white/15 bg-white/5 p-5 text-[var(--color-text-secondary)] leading-8">
        בונים אוטומציות שמורידות עומס תפעולי מהצוות ומייצרות עבודה עקבית. פרויקט טיפוסי מחזיר ערך מהר,
        כי מתמקדים בתהליכים שחוזרים הכי הרבה פעמים ויוצרים bottleneck אמיתי בעסק.
      </p>

      <section className="mt-10 space-y-4 text-[var(--color-text-secondary)]">
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">תוצאות שכדאי לצפות להן</h2>
        <ul className="list-disc space-y-2 pe-6">
          <li>קיצור זמני טיפול במשימות חוזרות</li>
          <li>פחות טעויות אנוש בתהליכי הזנה וסנכרון</li>
          <li>שקיפות גבוהה יותר עם לוגים והתראות</li>
          <li>סקייל פשוט יותר בלי להגדיל כוח אדם</li>
        </ul>
      </section>
    </main>
  );
}
