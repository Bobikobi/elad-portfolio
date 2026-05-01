import type { Metadata } from 'next';
import Link from 'next/link';
import { Workflow, Clock, FileText, TrendingUp, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import GradientBar from '@/components/ui/GradientBar';

export const metadata: Metadata = {
  title: 'אוטומציה עסקית לעסקים קטנים: איפה מתחילים?',
  description:
    'מדריך מעשי לאוטומציה עסקית לעסקים קטנים: איך לחסוך שעות עבודה בשבוע, להפחית טעויות אנוש ולשחרר את הצוות לעבודה חשובה יותר — בלי תקציב של תאגיד.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/guides/business-automation-guide',
  },
};

const schemas = [
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'אוטומציה עסקית לעסקים קטנים: איפה מתחילים?',
    description:
      'מדריך מעשי לאוטומציה עסקית לעסקים קטנים: חיסכון בזמן, הפחתת טעויות ושחרור הצוות לעבודה חשובה יותר.',
    url: 'https://www.eladsaadon.dev/guides/business-automation-guide',
    datePublished: '2026-05-01T00:00:00Z',
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
        name: 'כמה עולה אוטומציה לעסק קטן?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'אוטומציה פשוטה (דיוור, תזכורות, גיבויים) מתחילה מ-₪2,000-5,000. אוטומציה מלאה (CRM, חשבוניות, דשבורד) — ₪8,000-20,000. ההחזר על ההשקעה (ROI) מגיע תוך 3-6 חודשים.',
        },
      },
      {
        '@type': 'Question',
        name: 'האם אוטומציה מתאימה גם לעסק מאוד קטן?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'בהחלט. דווקא עסקים קטנים מרוויחים הכי הרבה מאוטומציה כי שעות העבודה יקרות יותר יחסית. אפילו אוטומציה פשוטה של שליחת תזכורות או הפקת חשבוניות חוסכת 5-10 שעות בחודש.',
        },
      },
      {
        '@type': 'Question',
        name: 'האם אוטומציה תחליף עובדים?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'אוטומציה לא מחליפה עובדים — היא משחררת אותם מעבודה חוזרת ומשעממת. העובדים שלכם יעסקו בעבודה חשובה יותר: שירות לקוחות, אסטרטגיה, יצירתיות. כולם מרוויחים.',
        },
      },
    ],
  },
];

export default function BusinessAutomationGuidePage() {
  const processes = [
    {
      icon: FileText,
      title: 'דיוור וחשבוניות',
      time: 'חוסך ~8 שעות בחודש',
      desc: 'הפקה אוטומטית של חשבוניות, שליחת תזכורות תשלום, ומעקב אחר לקוחות שלא שילמו.',
      steps: [
        'חיבור למערכת החשבונית הקיימת (REST API)',
        'הגדרת תבניות חשבוניות מותאמות אישית',
        'שליחה אוטומטית במייל עם קישור לתשלום',
        'תזכורות אוטומטיות אחרי 7, 14, 30 יום',
      ],
    },
    {
      icon: Clock,
      title: 'תזכורות ומעקב לקוחות',
      time: 'חוסך ~6 שעות בחודש',
      desc: 'תזכורות אוטומטיות לפגישות, שירות תקופתי, ומעקב אחרי לידים שלא נסגרו.',
      steps: [
        'הגדרת טריגרים לפי פעולת לקוח (הרשמה, רכישה, פגישה)',
        'שליחת וואטסאפ/מייל/ SMS אוטומטי',
        'מעקב אחרי לידים שלא חזרו תוך 7 ימים',
        'דשבורד עם סטטוס כל הלקוחות בזמן אמת',
      ],
    },
    {
      icon: Workflow,
      title: 'ניהול פרויקטים ומשימות',
      time: 'חוסך ~10 שעות בחודש',
      desc: 'יצירה אוטומטית של משימות, עדכון סטטוסים, ודיווח שבועי לצוות.',
      steps: [
        'חיבור ל- Slack / Teams / WhatsApp',
        'יצירת משימה אוטומטית ממייל או טופס',
        'עדכון סטטוס אוטומטי לפי פעולות',
        'דוח שבועי שנשלח אוטומטית במייל',
      ],
    },
    {
      icon: TrendingUp,
      title: 'דשבורד ודיווחים',
      time: 'חוסך ~5 שעות בחודש',
      desc: 'דשבורד עסקי שמתעדכן אוטומטית — בלי גיליונות אקסל ידניים.',
      steps: [
        'חיבור למקורות נתונים (CRM, חשבונית, גוגל אנליטיקס)',
        'הגדרת מדדי KPI מרכזיים',
        'דשבורד בזמן אמת נגיש מהנייד',
        'התראות אוטומטיות כשמדד חורג',
      ],
    },
  ];

  const faqExtra = [
    {
      q: 'איך יודעים איזה תהליך כדאי לבצע אוטומציה קודם?',
      a: 'חפשו תהליכים ש: (1) חוזרים על עצמם לפחות פעם בשבוע, (2) לוקחים יותר מ-30 דקות בכל פעם, (3) תלויים בפעולה ידנית של אדם אחד. אלה התהליכים עם ההחזר הגבוה ביותר על ההשקעה.',
    },
    {
      q: 'מה קורה אם האוטומציה נכשלת?',
      a: 'אוטומציה טובה בנויה עם טיפול בשגיאות: לוג מפורט, התראות בזמן אמת, ומנגנון fallback ידני. אם משהו נכשל — אתם מקבלים הודעה מיידית ויכולים להתערב. התכנון הנכון מונע מצבים שבהם האוטומציה "שותקת" בלי ששמתם לב.',
    },
    {
      q: 'האם אפשר לשלב אוטומציה עם מערכות קיימות?',
      a: 'ברוב המקרים — כן. דרך REST API, Webhooks, או כלי עזר כמו Zapier ו-Make. אם למערכת אין API, אפשר לבנות ממשק מותאם או להשתמש בכלי RPA (Robotic Process Automation) שמחקה פעולות משתמש.',
    },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
      <JsonLd data={schemas} />

      <GradientBar />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
        אוטומציה עסקית לעסקים קטנים: איפה מתחילים?
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
        עסקים קטנים מבזבזים בממוצע 20-30 שעות בחודש על עבודה ידנית חוזרת: חשבוניות, תזכורות, 
        מעקב לקוחות ודיווחים. אוטומציה לא דורשת תקציב של תאגיד — אפשר להתחיל בקטן, עם תהליך אחד, 
        ולחסוך שעות כבר בשבוע הראשון. המדריך מראה בדיוק איפה כדאי להתחיל.
      </p>

      {/* Process cards */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {processes.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.title}
              className="flex flex-col gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5"
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                  <Icon size={18} strokeWidth={1.5} className="text-[var(--color-accent)]" />
                </div>
                <span className="text-xs font-medium text-[var(--color-success)]">{p.time}</span>
              </div>
              <h2 className="text-base font-medium text-[var(--color-text-primary)]">{p.title}</h2>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{p.desc}</p>
              <ol className="mt-auto space-y-1.5">
                {p.steps.map((step, i) => (
                  <li key={step} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center text-xs font-medium text-[var(--color-accent)]">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>

      {/* ROI section */}
      <section className="mt-12 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-6">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
          ROI צפוי — חיסכון שנתי
        </h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--color-border-default)]">
          <table className="min-w-full border-collapse text-right text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]">
                <th className="px-4 py-3 font-medium">תהליך</th>
                <th className="px-4 py-3 font-medium">חיסכון חודשי</th>
                <th className="px-4 py-3 font-medium">חיסכון שנתי (₪)</th>
                <th className="px-4 py-3 font-medium">החזר השקעה</th>
              </tr>
            </thead>
            <tbody>
              {[
                { proc: 'דיוור וחשבוניות', save: '8 שעות', yearly: '₪6,000-12,000', roi: '1-2 חודשים' },
                { proc: 'תזכורות ומעקב', save: '6 שעות', yearly: '₪4,500-9,000', roi: '1-3 חודשים' },
                { proc: 'ניהול משימות', save: '10 שעות', yearly: '₪7,500-15,000', roi: '2-4 חודשים' },
                { proc: 'דשבורד ודיווחים', save: '5 שעות', yearly: '₪3,750-7,500', roi: '1-2 חודשים' },
              ].map((row, i) => (
                <tr
                  key={row.proc}
                  className={`border-b border-[var(--color-border-default)] text-[var(--color-text-secondary)] ${i % 2 === 0 ? 'bg-[var(--color-bg-primary)]' : 'bg-[var(--color-bg-secondary)]'}`}
                >
                  <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{row.proc}</td>
                  <td className="px-4 py-3">{row.save}</td>
                  <td className="px-4 py-3">{row.yearly}</td>
                  <td className="px-4 py-3">{row.roi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
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
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">רוצים להתחיל לחסוך שעות?</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">בואו נבנה יחד אוטומציה שמתאימה בדיוק לעסק שלכם.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Link
            href="/services/automation-workflows"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-default)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            אוטומציה עסקית <ArrowLeft size={13} />
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
