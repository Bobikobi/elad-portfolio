import type { Metadata } from 'next';
import Link from 'next/link';
import { Globe, Bot, Workflow, TrendingUp, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import GradientBar from '@/components/ui/GradientBar';

export const metadata: Metadata = {
  title: 'שירותי פיתוח Next.js, AI ואוטומציה',
  description:
    'פיתוח Full-Stack, אינטגרציית AI ואוטומציה עסקית. קוד נקי, ביצועים גבוהים ופריסה מאובטחת לפרודקשן.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/services',
    languages: {
      'he-IL': 'https://www.eladsaadon.dev/services',
      'en-US': 'https://www.eladsaadon.dev/en/services',
      'ru-RU': 'https://www.eladsaadon.dev/ru/services',
      'x-default': 'https://www.eladsaadon.dev/services',
    },
  },
};

const serviceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Next.js, AI & Automation Development Services',
  description:
    'Full-stack web development, AI integration, and workflow automation delivered by Elad Saadon.',
  url: 'https://www.eladsaadon.dev/services',
  provider: {
    '@type': 'Person',
    name: 'Elad Saadon',
    url: 'https://www.eladsaadon.dev',
  },
  areaServed: { '@type': 'Country', name: 'Israel' },
  serviceType: 'Full-Stack Development and AI Integration',
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.eladsaadon.dev' },
    { '@type': 'ListItem', position: 2, name: 'Services', item: 'https://www.eladsaadon.dev/services' },
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'איזה שירותים אתה נותן לעסקים וסטארטאפים?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'פיתוח Full-Stack ב-Next.js, אינטגרציית AI עם Gemini ו-OpenAI, אוטומציות תהליכים, כלי פנים ארגוניים ופריסה מאובטחת לפרודקשן.',
      },
    },
    {
      '@type': 'Question',
      name: 'האם אפשר לשפר מערכת קיימת בלי לבנות הכול מחדש?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'כן. בדרך כלל מתחילים באבחון צווארי בקבוק, משפרים ביצועים וארכיטקטורה בהדרגה, ומטמיעים AI או אוטומציה בשלבים עם סיכון נמוך.',
      },
    },
    {
      '@type': 'Question',
      name: 'האם הפרויקט שלי מתאים לשירות הזה?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'אם יש לכם מוצר דיגיטלי, תהליך שחוזר שוב ושוב, או רעיון שצריך לממש — כנראה שכן. שלחו הודעה קצרה ואבדוק יחד איתכם.',
      },
    },
  ],
};

const services = [
  {
    icon: Globe,
    title: 'פיתוח Full-Stack',
    desc: 'מממשק משתמש מהיר ועד לוגיקת שרת ובסיס נתונים — מקבלים מוצר שלם, בטוח ומוכן לגדול.',
    href: '/services/nextjs-development',
  },
  {
    icon: Bot,
    title: 'אינטגרציית AI',
    desc: 'משלבים עוזרים חכמים, עיבוד מסמכים ואוטומציה חכמה ישירות בתוך המוצר שלכם.',
    href: '/services/ai-integration',
  },
  {
    icon: Workflow,
    title: 'אוטומציה עסקית',
    desc: 'מחברים מערכות, מבטלים עבודה ידנית חוזרת ומוסיפים שקיפות מלאה לתהליכים.',
    href: '/services/automation-workflows',
  },
  {
    icon: TrendingUp,
    title: 'שיווק וצמיחה',
    desc: 'תשתית שיווקית מדידה: קליטת לידים, תסריטי המרה ודשבורד ביצועים שרץ לבד.',
    href: '/services/growth-marketing',
  },
];

const highlights = [
  'קוד נקי ומתועד לתחזוקה ארוכת טווח',
  'SEO, נגישות ו-Core Web Vitals ירוקים',
  'פריסה מאובטחת עם ניטור פרודקשן',
];

export default function ServicesPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16 sm:px-8">
      <JsonLd data={[serviceSchema, breadcrumbSchema, faqSchema]} />

      <GradientBar />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
        שירותי פיתוח, AI ואוטומציה
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
        פותר בעיות דיגיטליות אמיתיות — מאתר שמושך תנועה, דרך מוצר עם AI פנימי, ועד תהליכים שרצים לבד ומשחררים את הצוות לעבודה חשובה יותר.
      </p>

      {/* Service cards */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {services.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className="group flex flex-col gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-6 hover:border-[var(--color-border-subtle)] hover:shadow-[0_0_0_1px_rgba(139,92,246,0.1),0_8px_40px_rgba(0,0,0,0.3)] transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center group-hover:bg-[var(--color-accent-glow)] transition-colors">
                <Icon size={20} strokeWidth={1.5} className="text-[var(--color-accent)]" />
              </div>
              <h2 className="text-lg font-medium text-[var(--color-text-primary)]">{s.title}</h2>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{s.desc}</p>
              <span className="mt-auto flex items-center gap-1 text-sm text-[var(--color-accent)] group-hover:gap-2 transition-all">
                פרטים נוספים <ArrowLeft size={14} />
              </span>
            </Link>
          );
        })}
      </div>

      {/* Highlights */}
      <ul className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {highlights.map((h) => (
          <li key={h} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <CheckCircle2 size={15} className="shrink-0 text-[var(--color-accent)]" />
            {h}
          </li>
        ))}
      </ul>

      {/* FAQ */}
      <section className="mt-14 space-y-4">
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">שאלות נפוצות</h2>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">אתה עובד גם על מערכות קיימות?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            כן. לעיתים השיפור המהיר ביותר מגיע משדרוג ארכיטקטורה, אופטימיזציית ביצועים והוספת שכבת אוטומציה, בלי שכתוב מלא.
          </p>
        </article>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">האם הפרויקט שלי מתאים?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            אם יש לכם מוצר דיגיטלי, תהליך חוזר שגוזל זמן, או רעיון שצריך לממש — כנראה שכן. שלחו הודעה קצרה ואבדוק יחד איתכם.
          </p>
        </article>
      </section>

      {/* CTA */}
      <section className="mt-14 flex flex-col gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">רוצים לדבר על הפרויקט שלכם?</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">מלאו טופס קצר ואחזור אליכם בהקדם.</p>
        </div>
        <Link
          href="/#contact"
          className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          בואו נדבר
        </Link>
      </section>
    </main>
  );
}
