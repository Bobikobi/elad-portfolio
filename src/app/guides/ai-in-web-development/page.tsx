import type { Metadata } from 'next';
import Link from 'next/link';
import { Bot, Code2, Sparkles, Workflow, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import GradientBar from '@/components/ui/GradientBar';

export const metadata: Metadata = {
  title: 'איך AI משנה את עולם פיתוח האתרים ב-2026',
  description:
    'כיצד בינה מלאכותית משנה פיתוח אתרים: קוד אוטומטי, עיצוב מונע AI, צ\'אטבוטים חכמים, אופטימיזציית SEO ואוטומציה של תהליכי פיתוח שלמים.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/guides/ai-in-web-development',
  },
};

const schemas = [
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'איך AI משנה את עולם פיתוח האתרים ב-2026',
    description:
      'כיצד בינה מלאכותית משנה פיתוח אתרים: קוד אוטומטי, עיצוב מונע AI, צ\'אטבוטים חכמים ואופטימיזציית SEO.',
    url: 'https://www.eladsaadon.dev/guides/ai-in-web-development',
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
        name: 'האם AI יחליף מפתחי אתרים?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'AI לא מחליף מפתחים — הוא משנה את העבודה. מפתחים שמשתמשים ב-AI מייצרים יותר ערך, מהר יותר. הביקוש למפתחים שיודעים לשלב AI במוצרים רק עולה.',
        },
      },
      {
        '@type': 'Question',
        name: 'איך AI משפר SEO של אתרים?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'AI מנתח כוונת חיפוש, מייצר metadata אופטימלי, ממליץ על מילות מפתח, ובונה schema JSON-LD מותאם. כלי AI כמו ChatGPT ו-Gemini גם מצטטים אתרים בתשובות שלהם — GEO (Generative Engine Optimization).',
        },
      },
      {
        '@type': 'Question',
        name: 'מה זה GEO ולמה זה חשוב?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'GEO (Generative Engine Optimization) היא אופטימיזציה למנועי AI — ChatGPT, Gemini, Perplexity. במקום לדרג בתוצאות חיפוש, המטרה היא שהאתר שלכם יצוטט כתשובה בשאילתות AI. זה דורש תוכן מובנה, תשובות ישירות ו-schema עשיר.',
        },
      },
    ],
  },
];

export default function AiInWebDevelopmentPage() {
  const areas = [
    {
      icon: Code2,
      title: 'כתיבת קוד אוטומטית',
      desc: 'כלי AI כמו Claude, Copilot ו-Cursor כותבים קוד ישירות מתיאור טקסטואלי. מפתחים מתמקדים בארכיטקטורה ובבדיקות במקום בכתיבה חוזרת.',
      examples: [
        'יצירת קומפוננטות React מותאמות אישית מתיאור',
        'כתיבת טסטים אוטומטית לכל פונקציה',
        'תיקון באגים על ידי תיאור הבעיה בעברית',
      ],
    },
    {
      icon: Bot,
      title: 'צ\'אטבוטים ועוזרים חכמים',
      desc: 'AI משולב ישירות באתרים — עונים על שאלות לקוחות, מבצעים פעולות ומנתחים נתונים בזמן אמת.',
      examples: [
        'צ\'אט תמיכה שעונה על 80% מהשאלות אוטומטית',
        'עוזר רכישה שממליץ מוצרים לפי העדפות',
        'מערכת ניתוח מסמכים שמחלצת נתונים אוטומטית',
      ],
    },
    {
      icon: Sparkles,
      title: 'עיצוב מונע AI',
      desc: 'AI מייצר עיצובים, וריאציות ואנימציות ישירות מהתיאור. חוסך שעות של כיוונונים ידניים.',
      examples: [
        'יצירת ערכות צבעים וטיפוגרפיה מותאמות למותג',
        'הפקת תמונות ואיורים ייחודיים לאתר',
        'התאמה אוטומטית של עיצוב למובייל',
      ],
    },
    {
      icon: Workflow,
      title: 'אוטומציית תהליכי פיתוח',
      desc: 'AI משתלב ב-CI/CD, בודק קוד, מייצר תיעוד ומנהל גרסאות — כל התשתית רצה אוטומטית.',
      examples: [
        'Code review אוטומטי עם המלצות לשיפור',
        'תיעוד אוטומטי של API וקומפוננטות',
        'זיהוי בעיות אבטחה לפני דיפלוי',
      ],
    },
  ];

  const faqExtra = [
    {
      q: 'האם AI באמת מבין את ההקשר העסקי של האתר?',
      a: 'AI לא מבין הקשר עסקי כמו בן אדם, אבל הוא מצטיין בזיהוי דפוסים. השילוב המנצח הוא: אתם מגדירים את האסטרטגיה וה-AI מבצע. ככל שתספקו הקשר טוב יותר — התוצאות יהיו מדויקות יותר.',
    },
    {
      q: 'מה העלות של שילוב AI באתר קיים?',
      a: 'תלוי במורכבות. צ\'אטבוט פשוט עם API של OpenAI או Gemini מתחיל מ-₪3,000-8,000. מערכת AI מלאה עם עיבוד מסמכים והתאמה אישית — ₪15,000-40,000. עלות ה-API החודשית נעה בין $5 ל-$100 תלוי בנפח השימוש.',
    },
    {
      q: 'איך מתחילים עם AI באתר? בלי לשבור כלום?',
      a: 'הגישה הבטוחה: מתחילים בפיצ\'ר קטן ולא קריטי — צ\'אט עזרה עצמית, חיפוש חכם, או המלצות תוכן. מודדים, לומדים, ומרחיבים. כך אין סיכון למערכת הראשית.',
    },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
      <JsonLd data={schemas} />

      <GradientBar />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
        איך AI משנה את עולם פיתוח האתרים ב-2026
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
        בינה מלאכותית כבר לא רק עוזרת לכתוב קוד — היא משנה את האופן שבו אתרים נבנים, מאובטחים, 
        מדורגים ומשרתים משתמשים. מ-GEO (Generative Engine Optimization) ועד צ\'אטבוטים חכמים 
        שעונים על שאלות בזמן אמת — AI הופך מחלק אופציונלי לחלק בלתי נפרד מפיתוח אתרים מודרני.
      </p>

      {/* Area cards */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {areas.map((area) => {
          const Icon = area.icon;
          return (
            <div
              key={area.title}
              className="flex flex-col gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5"
            >
              <div className="w-9 h-9 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                <Icon size={18} strokeWidth={1.5} className="text-[var(--color-accent)]" />
              </div>
              <h2 className="text-base font-medium text-[var(--color-text-primary)]">{area.title}</h2>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{area.desc}</p>
              <ul className="mt-auto space-y-1.5">
                {area.examples.map((ex) => (
                  <li key={ex} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                    <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-[var(--color-accent)]" />
                    {ex}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* GEO section */}
      <section className="mt-12 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-6">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
          GEO — הדבר הגדול הבא ב-SEO
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
          GEO (Generative Engine Optimization) היא אופטימיזציה למנועי AI כמו ChatGPT, Gemini ו-Perplexity. 
          במקום לדרג בתוצאות חיפוש קלאסיות, המטרה היא שהאתר שלכם יצוטט כתשובה בשאילתות AI. 
          זה דורש תוכן מובנה עם תשובות ישירות, schema עשיר (JSON-LD), וקובץ llms.txt שמנחה את 
          מנועי ה-AI אילו דפים לצטט.
        </p>
        <Link
          href="/guides/nextjs-seo-geo-2026"
          className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--color-accent)] hover:underline"
        >
          קראו את המדריך המלא ל-SEO + GEO <ArrowLeft size={13} />
        </Link>
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
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">רוצים לשלב AI באתר שלכם?</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">בואו נבנה יחד פתרון AI מותאם אישית.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Link
            href="/services/ai-integration"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-default)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            אינטגרציית AI <ArrowLeft size={13} />
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
