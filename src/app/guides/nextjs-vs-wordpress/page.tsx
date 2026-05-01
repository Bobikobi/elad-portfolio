import type { Metadata } from 'next';
import Link from 'next/link';
import { Zap, Shield, DollarSign, Gauge, ArrowLeft, Search } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import GradientBar from '@/components/ui/GradientBar';

export const metadata: Metadata = {
  title: 'Next.js vs וורדפרס: מה עדיף לבניית אתרים ב-2026?',
  description:
    'השוואה מקיפה בין Next.js לוורדפרס: ביצועים, SEO, אבטחה, תחזוקה ועלויות. מדוע יותר עסקים עוברים ל-Next.js בשנת 2026.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/guides/nextjs-vs-wordpress',
  },
};

const schemas = [
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Next.js vs וורדפרס: מה עדיף לבניית אתרים ב-2026?',
    description:
      'השוואה מקיפה בין Next.js לוורדפרס: ביצועים, SEO, אבטחה, תחזוקה ועלויות.',
    url: 'https://www.eladsaadon.dev/guides/nextjs-vs-wordpress',
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
        name: 'האם Next.js מתאים לאתר תדמית פשוט?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'כן, אבל אם צריך רק דף נחיתה סטטי — וורדפרס או אפילו Builder.io עשויים להתאים יותר. Next.js מצטיין כשצריך ביצועים, אבטחה וסקיילביליות.',
        },
      },
      {
        '@type': 'Question',
        name: 'האם אפשר להעביר אתר וורדפרס ל-Next.js?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'כן, בתהליך הדרגתי. שומרים את וורדפרס כ-headless CMS (מערכת ניהול תוכן) ומחליפים את הפרונט-אנד ל-Next.js. כך מקבלים ביצועים גבוהים בלי לאבד תוכן קיים.',
        },
      },
      {
        '@type': 'Question',
        name: 'מה זול יותר בטווח הארוך — Next.js או וורדפרס?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Next.js. וורדפרס דורשת תוספים בתשלום, אחסון יקר יותר ככל שהתנועה גדלה, ועדכוני אבטחה תכופים. Next.js על Vercel או Cloudflare עולה פחות ומתרחב אוטומטית.',
        },
      },
    ],
  },
];

export default function NextJsVsWordPressPage() {
  const comparisons = [
    {
      icon: Gauge,
      title: 'ביצועים ומהירות',
      nextjs: 'דפים סטטיים + SSR — Core Web Vitals ירוקים כברירת מחדל. LCP מתחת ל-1.5 שניות.',
      wp: 'תלוי בתוספים ובאחסון. לרוב LCP מעל 3 שניות, צורך תוספי caching ומטמון.',
    },
    {
      icon: Shield,
      title: 'אבטחה',
      nextjs: 'ליבת קוד מינימלית, אין מסד נתונים בצד הלקוח. CSP ו-security headers מובנים.',
      wp: 'יעד מרכזי להתקפות. דורש עדכונים שוטפים, תוספי אבטחה, וניטור תמידי.',
    },
    {
      icon: Search,
      title: 'SEO',
      nextjs: 'SSR ו-SSG מובנים, metadata דינמי, schema JSON-LD, תמיכה מלאה ב-hreflang.',
      wp: 'תלוי בתוסף Yoast/RankMath. עובד, אבל דורש הגדרות נוספות לכל עמוד.',
    },
    {
      icon: DollarSign,
      title: 'עלות תחזוקה שנתית',
      nextjs: 'אחסון מ-Vercel/Cloudflare ~$20-50/חודש. אין תוספים. תחזוקה מינימלית.',
      wp: 'אחסון + תוספים ~$40-100/חודש. עדכונים שוטפים, גיבויים, ניטור אבטחה.',
    },
  ];

  const faqExtra = [
    {
      q: 'למה עסקים עוברים מוורדפרס ל-Next.js?',
      a: 'בעיקר בגלל ביצועים, אבטחה ועלויות תחזוקה. וורדפרס דורשת ערימת תוספים שמאטה את האתר ופוגעת ב-SEO. Next.js נותן שליטה מלאה על הקוד, ביצועים גבוהים כברירת מחדל, ועלויות נמוכות יותר לאורך זמן.',
    },
    {
      q: 'האם Next.js מתאים לחנות מסחר?',
      a: 'בהחלט. Shopify, Medusa ו-Saleor משתלבים נהדר עם Next.js. מקבלים חוויית קנייה מהירה, SEO מעולה לעמודי מוצר, ותמיכה ב-i18n לחנות רב-לשונית.',
    },
    {
      q: 'מה קורה עם תוכן דינמי — בלוגים, מאמרים, עדכונים?',
      a: 'Next.js תומך ב-Incremental Static Regeneration (ISR) — תוכן דינמי שמתעדכן ברקע בלי לבנות מחדש את כל האתר. אפשר לשלב עם CMS קיים כמו Sanity, Contentful או אפילו וורדפרס כ-headless.',
    },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
      <JsonLd data={schemas} />

      <GradientBar />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
        Next.js vs וורדפרס: מה עדיף לבניית אתרים ב-2026?
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
        וורדפרס שולטת בכ-40% מהאתרים בעולם, אבל Next.js צומח בקצב מהיר ומשמש כבר חברות כמו TikTok, 
        Notion ו-Hulu. ההבדל האמיתי הוא לא טכנולוגי — אלא כלכלי. המדריך הזה משווה מחיר, ביצועים, 
        אבטחה ו-SEO כדי לעזור לכם להחליט.
      </p>

      {/* Comparison cards */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {comparisons.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.title}
              className="flex flex-col gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5"
            >
              <div className="w-9 h-9 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                <Icon size={18} strokeWidth={1.5} className="text-[var(--color-accent)]" />
              </div>
              <h2 className="text-base font-medium text-[var(--color-text-primary)]">{c.title}</h2>
              <div className="space-y-2 text-sm leading-relaxed">
                <p>
                  <span className="font-medium text-[var(--color-text-primary)]">Next.js:</span>{' '}
                  <span className="text-[var(--color-text-secondary)]">{c.nextjs}</span>
                </p>
                <p>
                  <span className="font-medium text-[var(--color-text-primary)]">וורדפרס:</span>{' '}
                  <span className="text-[var(--color-text-secondary)]">{c.wp}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary table */}
      <section className="mt-12">
        <h2 className="mb-4 text-xl font-semibold text-[var(--color-text-primary)]">טבלת השוואה מהירה</h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border-default)]">
          <table className="min-w-full border-collapse text-right text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]">
                <th className="px-4 py-3 font-medium">קטגוריה</th>
                <th className="px-4 py-3 font-medium">Next.js</th>
                <th className="px-4 py-3 font-medium">וורדפרס</th>
              </tr>
            </thead>
            <tbody>
              {[
                { cat: 'מהירות טעינה', next: '0.5-1.5s LCP', wp: '2-5s LCP' },
                { cat: 'אבטחה', next: 'מובנית, מינימום וקטורי תקיפה', wp: 'דורשת תוספים ועדכונים שוטפים' },
                { cat: 'SEO בסיסי', next: 'מובנה (SSR/SSG)', wp: 'תלוי בתוסף Yoast/RankMath' },
                { cat: 'עלות חודשית', next: '~$20-50', wp: '~$40-100' },
                { cat: 'התאמה למובייל', next: 'Responsive כברירת מחדל', wp: 'תלוי בתבנית' },
                { cat: 'תחזוקה שוטפת', next: 'מינימלית (עדכוני תלויות)', wp: 'גבוהה (תוספים, גיבויים, אבטחה)' },
              ].map((row, i) => (
                <tr
                  key={row.cat}
                  className={`border-b border-[var(--color-border-default)] text-[var(--color-text-secondary)] ${i % 2 === 0 ? 'bg-[var(--color-bg-primary)]' : 'bg-[var(--color-bg-secondary)]'}`}
                >
                  <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{row.cat}</td>
                  <td className="px-4 py-3">{row.next}</td>
                  <td className="px-4 py-3">{row.wp}</td>
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
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">רוצים לעבור ל-Next.js?</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">בואו נבנה יחד אתר מהיר, מאובטח וחסכוני.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Link
            href="/services/nextjs-development"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-default)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            פיתוח Next.js <ArrowLeft size={13} />
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
