import type { Metadata } from 'next';
import Link from 'next/link';
import { RefreshCw, Bell, BarChart2, Link2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import GradientBar from '@/components/ui/GradientBar';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

export const metadata: Metadata = {
  title: 'אוטומציה של תהליכים עסקיים',
  description:
    'תכנון ופיתוח אוטומציות שמקצרות עבודה ידנית: חיבור מערכות, טריגרים, עיבוד נתונים ודו"חות אוטומטיים עם Node.js, Python ו-APIs.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/services/automation-workflows',
    languages: {
      'he-IL': 'https://www.eladsaadon.dev/services/automation-workflows',
      'en-US': 'https://www.eladsaadon.dev/en/services/automation-workflows',
      'ru-RU': 'https://www.eladsaadon.dev/ru/services/automation-workflows',
      'x-default': 'https://www.eladsaadon.dev/services/automation-workflows',
    },
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

const deliverables = [
  'תהליך אוטומטי ראשון — מהגדרה ועד ריצה בפרודקשן',
  'חיבור מערכות: CRM, דוא"ל, גיליונות, APIs חיצוניים',
  'לוגים מלאים + התראות על שגיאות בזמן אמת',
  'דשבורד ניטור ביצועים ומדדי ROI',
  'תיעוד טכני מלא + קוד מקור בגישה פרטית',
  'תוכנית הרחבה: אוטומציות נוספות לפי סדר עדיפות',
  'גיבוי ושחזור אוטומטיים',
  'תמיכה ותחזוקה שוטפת לפי צורך',
];

const faqExtra = [
  {
    q: 'כמה זמן לוקח להקים אוטומציה עסקית?',
    a: 'אוטומציה פשוטה (חיבור בין שתי מערכות, טריגר לשליחת מייל) — 3–7 ימים. אוטומציה מורכבת (רב-שלבית עם עיבוד נתונים ותנאים) — 2–4 שבועות. תמיד מתחילים בתהליך הקטן ביותר שנותן ערך מיידי.',
  },
  {
    q: 'מה קורה אם האוטומציה נכשלת?',
    a: 'כל אוטומציה בנויה עם מנגנוני retry, התראות על כשל, ולוגים מפורטים. אם משהו לא עובד — מקבלים הודעה מיידית ויודעים בדיוק איפה לתקן. אין מצב של "שקט תעשייתי" שבו תהליך נופל בלי שאף אחד יודע.',
  },
  {
    q: 'האם האוטומציות עובדות עם מערכות קיימות כמו Monday, Salesforce או Shopify?',
    a: 'כן. רוב האוטומציות מתבססות על APIs ציבוריים או Webhooks. אם למערכת יש API — אפשר להתחבר. אם אין — אפשר דרך Zaps, גיליונות או קבצים. אין מערכת שאני לא יכול לחבר.',
  },
];

export default function AutomationWorkflowsPage() {
  const breadcrumbs = [
    { label: 'דף הבית', href: '/' },
    { label: 'שירותים', href: '/services' },
    { label: 'אוטומציה עסקית', href: '/services/automation-workflows' },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
      <JsonLd data={schemas} />

      <GradientBar />
      <Breadcrumbs items={breadcrumbs} locale="he" />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
        אוטומציה לתהליכים עסקיים
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
        כשתהליכים רצים לבד, הצוות מתפנה לעבודה שדורשת חשיבה אמיתית. בונים אוטומציות ממוקדות שמתחילות מה-bottleneck הכי כואב ומייצרות תוצאה מיידית.
      </p>

      {/* Direct answer for featured snippet */}
      <div className="mt-8 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
        <p className="text-sm leading-7 text-[var(--color-text-secondary)]">
          <strong className="text-[var(--color-text-primary)]">תשובה קצרה:</strong>{' '}
          אוטומציה של תהליכים עסקיים — חיבור מערכות, סנכרון נתונים אוטומטי, שליחת התראות בזמן אמת, ויצירת דו"חות ללא מגע יד אדם. מתחילים מהתהליך הכי חוזר וכואב, ומודדים הצלחה בזמן שנחסך, ירידה בטעויות ועלייה בתפוקה.
        </p>
      </div>

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

      {/* Deliverables */}
      <section className="mt-14">
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">מה אתם מקבלים</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {deliverables.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-4 text-sm text-[var(--color-text-secondary)]"
            >
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--color-accent)]" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Expanded FAQ */}
      <section className="mt-14 space-y-4">
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">שאלות נפוצות</h2>
        {faqExtra.map((item) => (
          <article
            key={item.q}
            className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5"
          >
            <h3 className="text-base font-medium text-[var(--color-text-primary)]">{item.q}</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">{item.a}</p>
          </article>
        ))}
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
