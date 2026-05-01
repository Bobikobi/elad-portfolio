import type { Metadata } from 'next';
import Link from 'next/link';
import { Search, FileText, Link2, Smartphone, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import GradientBar from '@/components/ui/GradientBar';

export const metadata: Metadata = {
  title: 'מדריך SEO לעסקים קטנים: איך להגיע ראשון בגוגל בלי תשלום',
  description:
    'מדריך SEO מעשי לעסקים קטנים: איך לבחור מילות מפתח, לבנות תוכן מנצח, להשיג קישורים איכותיים ולהופיע בעמוד הראשון של גוגל — בלי לשלם על פרסום.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/guides/seo-for-small-business',
  },
};

const schemas = [
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'מדריך SEO לעסקים קטנים: איך להגיע ראשון בגוגל בלי תשלום',
    description:
      'מדריך SEO מעשי לעסקים קטנים: מילות מפתח, תוכן מנצח, קישורים איכותיים והופעה בעמוד הראשון של גוגל.',
    url: 'https://www.eladsaadon.dev/guides/seo-for-small-business',
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
        name: 'כמה זמן לוקח לראות תוצאות מ-SEO?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'בדרך כלל 3-6 חודשים עד לשיפור ניכר בדירוג. תוצאות ראשונות (עלייה בתנועה לעמודי תוכן חדשים) אפשר לראות תוך 2-4 שבועות.',
        },
      },
      {
        '@type': 'Question',
        name: 'האם SEO באמת עובד בלי תשלום?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'כן, אבל דורש השקעה של זמן וידע. בניגוד לפרסום ממומן (Google Ads), SEO אורגני לא עולה כסף לקליק — אבל צריך לייצר תוכן איכותי, לבנות קישורים ולוודא טכניקה נכונה.',
        },
      },
      {
        '@type': 'Question',
        name: 'מה ההבדל בין SEO לפרסום ממומן?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'SEO מביא תנועה אורגנית בחינם לאורך זמן, אבל לוקח חודשים להגיע לתוצאות. פרסום ממומן נותן תוצאות מיידיות אבל עולה כסף לכל קליק. השילוב של שניהם הוא האסטרטגיה החזקה ביותר.',
        },
      },
    ],
  },
];

export default function SeoForSmallBusinessPage() {
  const steps = [
    {
      icon: Search,
      title: 'מחקר מילות מפתח',
      desc: 'מזהים מה הלקוחות שלכם מחפשים בגוגל. משתמשים בכלים חינמיים כמו Google Keyword Planner, AnswerThePublic ו-Ubersuggest.',
      tips: [
        'חפשו מילות מפתח עם נפח חיפוש 100-1,000/חודש — תחרות נמוכה יותר',
        'התמקדו ב-long-tail keywords: "מעצבת גרפית בתל אביב" במקום "מעצבת גרפית"',
        'בדקו מה המתחרים מדרגים עליו עם כלי כמו SEO Minion',
      ],
    },
    {
      icon: FileText,
      title: 'תוכן איכותי וממוקד',
      desc: 'גוגל מדרג תוכן שעונה על כוונת החיפוש. כותבים עמודי שירות, מדריכים ומאמרים שעונים על שאלות אמיתיות של לקוחות.',
      tips: [
        'כל עמוד צריך מילת מפתח מרכזית אחת — אל תדחסו מילים',
        'כתבו תשובה ישירה בפסקה הראשונה (featured snippet)',
        'הוסיפו תמונות מקוריות עם טקסט חלופי (alt text)',
      ],
    },
    {
      icon: Link2,
      title: 'בניית קישורים (Backlinks)',
      desc: 'קישורים מאתרים אחרים מאותתים לגוגל שהתוכן שלכם אמין. מתחילים ממקורות קטנים ובונים בהדרגה.',
      tips: [
        'כתבו פוסטים אורחים בבלוגים בתעשייה שלכם',
        'צרו תוכן ששווה לקשר אליו — מדריכים, מחקרים, אינפוגרפיקות',
        'רשמו את העסק שלכם בגוגל מיפוי עסקי (Google Business Profile)',
      ],
    },
    {
      icon: Smartphone,
      title: 'אופטימיזציה טכנית',
      desc: 'גוגל מעדיף אתרים מהירים, מאובטחים ומותאמים למובייל. בלי טכניקה טובה — התוכן הטוב ביותר לא ידורג.',
      tips: [
        'וודאו מהירות טעינה מתחת ל-2.5 שניות (LCP)',
        'השתמשו ב-HTTPS (SSL) — חובה מ-2018',
        'התאימו את האתר למובייל — מעל 60% מהחיפושים מגיעים מנייד',
      ],
    },
  ];

  const faqExtra = [
    {
      q: 'האם כדאי להשקיע ב-SEO או בפרסום ממומן קודם?',
      a: "אם התקציב מוגבל — התחילו מ-SEO בסיסי (מילות מפתח, תוכן, טכניקה) ופרסום ממומן משלים. SEO הוא נכס לטווח ארוך, פרסום ממומן נותן תוצאות מיידיות. השילוב של שניהם מנצח.",
    },
    {
      q: 'האם אפשר לעשות SEO לבד בלי מקצוען?',
      a: 'בהחלט. הרבה עסקים קטנים מתחילים לבד עם מדריכים וכלים חינמיים. השלבים הבסיסיים — מילות מפתח, תוכן איכותי, אופטימיזציה טכנית — נגישים לכל אחד. כשיש תקציב, כדאי להיעזר במקצוען לאסטרטגיה מתקדמת ובניית קישורים.',
    },
    {
      q: 'מה קורה אם אני מפסיק לעשות SEO?',
      a: 'SEO הוא לא "קבע ושכח" — המתחרים ממשיכים לייצר תוכן ולבנות קישורים. אם תפסיקו, הדירוג שלכם עלול לרדת בהדרגה. מומלץ לפרסם תוכן חדש לפחות פעם בחודש ולעדכן עמודים קיימים.',
    },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
      <JsonLd data={schemas} />

      <GradientBar />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
        מדריך SEO לעסקים קטנים: איך להגיע ראשון בגוגל בלי תשלום
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
        SEO אורגני הוא הערוץ הכי משתלם לעסק קטן — תנועה איכותית בחינם, לאורך זמן, בלי לשלם על קליקים. 
        אבל איך מתחילים? המדריך הזה מפרק SEO לארבעה שלבים מעשיים שאפשר ליישם לבד, עם כלים חינמיים, 
        בלי ידע טכני מוקדם.
      </p>

      {/* Step cards */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.title}
              className="flex flex-col gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5"
            >
              <div className="w-9 h-9 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                <Icon size={18} strokeWidth={1.5} className="text-[var(--color-accent)]" />
              </div>
              <h2 className="text-base font-medium text-[var(--color-text-primary)]">{step.title}</h2>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{step.desc}</p>
              <ul className="mt-auto space-y-1.5">
                {step.tips.map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                    <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-[var(--color-accent)]" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Quick checklist table */}
      <section className="mt-12">
        <h2 className="mb-4 text-xl font-semibold text-[var(--color-text-primary)]">צ\'קליסט SEO מהיר</h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border-default)]">
          <table className="min-w-full border-collapse text-right text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]">
                <th className="px-4 py-3 font-medium">מה לבדוק</th>
                <th className="px-4 py-3 font-medium">איך לבדוק</th>
                <th className="px-4 py-3 font-medium">כלי חינמי</th>
              </tr>
            </thead>
            <tbody>
              {[
                { check: 'מילות מפתח', how: 'Google Keyword Planner', tool: 'חינמי עם חשבון Google' },
                { check: 'מהירות טעינה', how: 'PageSpeed Insights', tool: 'pagespeed.web.dev' },
                { check: 'תגיות כותרת', how: 'סריקת אתר עם Screaming Frog', tool: 'גרסה חינמית (עד 500 URLs)' },
                { check: 'קישורים שבורים', how: 'בדיקת 404', tool: 'Google Search Console' },
                { check: 'התאמה למובייל', how: 'Mobile-Friendly Test', tool: 'search.google.com/test/mobile-friendly' },
              ].map((row, i) => (
                <tr
                  key={row.check}
                  className={`border-b border-[var(--color-border-default)] text-[var(--color-text-secondary)] ${i % 2 === 0 ? 'bg-[var(--color-bg-primary)]' : 'bg-[var(--color-bg-secondary)]'}`}
                >
                  <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{row.check}</td>
                  <td className="px-4 py-3">{row.how}</td>
                  <td className="px-4 py-3">{row.tool}</td>
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
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">רוצים יישום SEO מקצועי?</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">בואו נבנה אסטרטגיית SEO מותאמת לעסק שלכם.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Link
            href="/services/growth-marketing"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-default)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            שיווק וצמיחה <ArrowLeft size={13} />
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
