import type { Metadata } from 'next';
import Link from 'next/link';
import { Calculator, Globe, Bot, Workflow, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import GradientBar from '@/components/ui/GradientBar';

export const metadata: Metadata = {
  title: 'כמה עולה לבנות אתר ב-Next.js? מדריך מחירים 2026',
  description:
    'פירוט עלויות מלא לבניית אתר Next.js: אתר תדמית, חנות מסחר, פורטל עם AI. טווחי מחירים, דוגמאות אמיתיות וטיפים לחיסכון מבלי להתפשר על איכות.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/guides/website-cost-guide',
  },
};

const schemas = [
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'כמה עולה לבנות אתר ב-Next.js? מדריך מחירים 2026',
    description:
      'פירוט עלויות מלא לבניית אתר Next.js: אתר תדמית, חנות מסחר, פורטל עם AI.',
    url: 'https://www.eladsaadon.dev/guides/website-cost-guide',
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
        name: 'למה Next.js יקר יותר מוורדפרס בהקמה?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'כי Next.js דורש פיתוח מותאם אישית במקום תבנית מוכנה. המחיר הגבוה בהקמה מתקזז בעלויות תחזוקה נמוכות יותר לאורך זמן — אין תוספים בתשלום, אחסון זול יותר, ואבטחה מובנית.',
        },
      },
      {
        '@type': 'Question',
        name: 'האם כדאי להשקיע באתר יקר יותר כבר מההתחלה?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'תלוי בצרכים. אם אתם מצפים לגדול — כן. בנייה נכונה ב-Next.js חוסכת שכתובים יקרים אחרי שנה. לעסק קטן שמתחיל, אפשר להתחיל באתר תדמית פשוט ולהרחיב בהדרגה.',
        },
      },
      {
        '@type': 'Question',
        name: 'מה המחיר החודשי לאחסון אתר Next.js?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Vercel Pro עולה $20/חודש ומספיק לרוב האתרים העסקיים. Cloudflare Pages בחינם לאתרים סטטיים. אתר עם AI או עיבוד תמונות כבד עשוי לעלות $50-100/חודש.',
        },
      },
    ],
  },
];

export default function WebsiteCostGuidePage() {
  const tiers = [
    {
      icon: Globe,
      title: 'אתר תדמית / לידים',
      price: '₪5,000-10,000',
      desc: 'עד 5 עמודים, טופס יצירת קשר, SEO בסיסי, analytics, עיצוב רספונסיבי.',
      features: [
        'דף בית + אודות + שירותים + צור קשר',
        'טופס לידים עם אימות Cloudflare Turnstile',
        'SEO metadata + Open Graph',
        'מהירות טעינה מתחת לשנייה',
        'אחסון Vercel בחינם',
      ],
    },
    {
      icon: Workflow,
      title: 'אתר עסקי + אוטומציה',
      price: '₪12,000-25,000',
      desc: 'עד 15 עמודים, מערכת ניהול תוכן, אוטומציות, רב-לשוני, אינטגרציות.',
      features: [
        'כל מה שבחבילת תדמית',
        'מערכת ניהול תוכן (Sanity / Contentful)',
        'תמיכה ב-2-3 שפות (i18n)',
        'אוטומציות תהליכים פנימיות',
        'דשבורד ניהול לידים',
      ],
    },
    {
      icon: Bot,
      title: 'פורטל + AI',
      price: '₪25,000-50,000+',
      desc: "מערכת מורכבת עם AI, צ'אט חכם, עיבוד מסמכים, התאמה אישית.",
      features: [
        'כל מה שבחבילה העסקית',
        'צ\'אט AI מותאם אישית',
        'עיבוד מסמכים אוטומטי',
        'התאמה אישית למשתמש',
        'אחסון Vercel Pro + API',
      ],
    },
  ];

  const faqExtra = [
    {
      q: 'האם המחיר כולל עיצוב גרפי?',
      a: 'המחירים מתייחסים לפיתוח טכנולוגי. עיצוב גרפי מקצועי (UI/UX) מתומחר בנפרד,通常在 ₪3,000-8,000 תלוי במורכבות. אפשר גם לעבוד עם עיצוב קיים שאתם מביאים.',
    },
    {
      q: 'כמה זמן לוקח לבנות אתר Next.js?',
      a: 'אתר תדמית — 2-3 שבועות. אתר עסקי — 4-8 שבועות. פורטל עם AI — 8-16 שבועות. לוחות זמנים מדויקים נקבעים אחרי שיחת אפיון ראשונית.',
    },
    {
      q: 'מה קורה אחרי שהאתר עולה לאוויר?',
      a: 'אתם מקבלים גיבוי מלא לקוד, תיעוד תפעול, ואחריות חודש על תקלות. תחזוקה שוטפת (עדכוני תלויות, גיבויים, ניטור) אפשר להוסיף בחבילת תחזוקה חודשית מ-₪500/חודש.',
    },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
      <JsonLd data={schemas} />

      <GradientBar />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
        כמה עולה לבנות אתר ב-Next.js? מדריך מחירים 2026
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
        המחיר של אתר Next.js נע בין ₪5,000 לאתר תדמית פשוט ועד ₪50,000+ לפורטל עם AI מותאם אישית. 
        ההבדל הגדול מול וורדפרס הוא שעלות הפיתוח הגבוהה יותר מתקזזת בתחזוקה שוטפת נמוכה משמעותית. 
        המדריך מפרט בדיוק מה מקבלים בכל טווח מחירים.
      </p>

      {/* Tier cards */}
      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {tiers.map((tier) => {
          const Icon = tier.icon;
          return (
            <div
              key={tier.title}
              className="flex flex-col gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                <Icon size={20} strokeWidth={1.5} className="text-[var(--color-accent)]" />
              </div>
              <div>
                <h2 className="text-base font-medium text-[var(--color-text-primary)]">{tier.title}</h2>
                <p className="mt-1 text-lg font-bold text-[var(--color-accent)]">{tier.price}</p>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{tier.desc}</p>
              <ul className="mt-auto space-y-2">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                    <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-[var(--color-accent)]" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Cost breakdown table */}
      <section className="mt-12">
        <h2 className="mb-4 text-xl font-semibold text-[var(--color-text-primary)]">פירוט עלויות חודשיות</h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border-default)]">
          <table className="min-w-full border-collapse text-right text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]">
                <th className="px-4 py-3 font-medium">רכיב</th>
                <th className="px-4 py-3 font-medium">Next.js</th>
                <th className="px-4 py-3 font-medium">וורדפרס</th>
              </tr>
            </thead>
            <tbody>
              {[
                { item: 'אחסון', next: '$20 (Vercel Pro)', wp: '$10-30 (שרת מותאם)' },
                { item: 'תוספים/חבילות', next: '$0 (מובנים)', wp: '$20-60 (Yoast, אבטחה, caching)' },
                { item: 'SSL / CDN', next: '$0 (מובנים)', wp: '$5-15 (תלוי באחסון)' },
                { item: 'גיבויים', next: '$0 (Git)', wp: '$5-10 (תוסף)' },
                { item: 'ניטור', next: '$0 (Vercel Analytics)', wp: '$5-15 (תוסף)' },
                { item: 'סה"כ לחודש', next: '~$20', wp: '~$45-130' },
              ].map((row, i) => (
                <tr
                  key={row.item}
                  className={`border-b border-[var(--color-border-default)] text-[var(--color-text-secondary)] ${i % 2 === 0 ? 'bg-[var(--color-bg-primary)]' : 'bg-[var(--color-bg-secondary)]'}`}
                >
                  <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{row.item}</td>
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
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">רוצים הצעת מחיר מדויקת?</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">ספרו לי מה אתם צריכים ואחזור עם הערכה תוך יום עסקים.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-default)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            כל השירותים <ArrowLeft size={13} />
          </Link>
          <Link
            href="/#contact"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            קבלו הצעת מחיר
          </Link>
        </div>
      </section>
    </main>
  );
}
