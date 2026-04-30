import type { Metadata } from 'next';
import Link from 'next/link';
import { RefreshCw, Bell, BarChart2, Link2, ArrowLeft } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import GradientBar from '@/components/ui/GradientBar';

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
          text: 'מתחילים בתהליכים שחוזרים הרבה פעמים בשבוע וגוזלים זמן ידני — בדרך כלל דיווחים, סנכרון נתונים ומשימות תפעוליות.',
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

const outcomes = [
  {
    icon: RefreshCw,
    title: 'פחות עבודה חוזרת',
    desc: 'משימות שחוזרות שוב ושוב — סנכרון נתונים, יצירת דו"חות, שליחת עדכונים — רצות לבד בלי מגע יד אדם.',
  },
  {
    icon: Bell,
    title: 'התראות בזמן אמת',
    desc: 'כשמשהו דורש תשומת לב, הצוות מקבל עדכון מיידי. לא מגלים בדיעבד — מגיבים לפני שזה הופך לבעיה.',
  },
  {
    icon: Link2,
    title: 'מערכות מחוברות',
    desc: 'CRM, דוא"ל, גיליונות, API — הכול מדבר אחד עם השני. מידע זורם אוטומטית ולא נופל בין הכיסאות.',
  },
  {
    icon: BarChart2,
    title: 'שקיפות ולוגים',
    desc: 'כל פעולה מתועדת. תמיד ברור מה רץ, מתי ועם איזה תוצאה — קל לאבחן ולשפר.',
  },
];

export default function AutomationWorkflowsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
      <JsonLd data={schemas} />

      <GradientBar />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
        אוטומציה לתהליכים עסקיים
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
        כשתהליכים רצים לבד, הצוות מתפנה לעבודה שדורשת חשיבה אמיתית. בונים אוטומציות ממוקדות שמתחילות מה-bottleneck הכי כואב ומייצרות תוצאה מיידית.
      </p>

      {/* Outcome cards */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {outcomes.map((o) => {
          const Icon = o.icon;
          return (
            <div
              key={o.title}
              className="flex flex-col gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5"
            >
              <div className="w-9 h-9 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                <Icon size={18} strokeWidth={1.5} className="text-[var(--color-accent)]" />
              </div>
              <h2 className="text-base font-medium text-[var(--color-text-primary)]">{o.title}</h2>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{o.desc}</p>
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <section className="mt-14 space-y-4">
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">שאלות נפוצות</h2>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">מאיפה מתחילים?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            מתחילים מהתהליך שחוזר הכי הרבה פעמים בשבוע וגוזל הכי הרבה זמן ידני. שם ה-ROI המהיר ביותר.
          </p>
        </article>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">איך יודעים שהאוטומציה עובדת?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            כל תהליך מגיע עם לוגים, התראות על שגיאות ומדדים ברורים — זמן שנחסך, ירידה בטעויות, עלייה בתפוקה.
          </p>
        </article>
      </section>

      {/* CTA */}
      <section className="mt-14 flex flex-col gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">יש תהליך שגוזל לכם זמן?</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">ספרו לי עליו ונבדוק יחד אם אפשר לאוטומט אותו.</p>
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
