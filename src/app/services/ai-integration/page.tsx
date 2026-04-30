import type { Metadata } from 'next';
import Link from 'next/link';
import { Bot, FileText, MessageSquare, Zap, ArrowLeft } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import GradientBar from '@/components/ui/GradientBar';

export const metadata: Metadata = {
  title: 'אינטגרציית AI למערכות קיימות וחדשות',
  description:
    'הטמעת AI בתוך מוצרי Web: צ׳אט חכם, סיכום מסמכים, סיווג נתונים ואוטומציה עם Gemini ו-OpenAI בצורה מאובטחת.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/services/ai-integration',
  },
};

const schemas = [
  {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'AI Integration Service',
    description: 'LLM integration, AI-assisted workflows, and automation features for business applications.',
    url: 'https://www.eladsaadon.dev/services/ai-integration',
    provider: {
      '@type': 'Person',
      name: 'Elad Saadon',
      url: 'https://www.eladsaadon.dev',
    },
    areaServed: { '@type': 'Country', name: 'Israel' },
    serviceType: 'AI Integration and Automation',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'איך משלבים AI בלי לסכן מידע רגיש?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'מגדירים שכבת הרשאות, סינון מידע ולוגים מבוקרים. קריאות ה-AI עוברות דרך השרת בלבד — מפתחות וסודות לא נחשפים לדפדפן.',
        },
      },
      {
        '@type': 'Question',
        name: 'איזה תהליכים אפשר לאוטומט עם AI?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'תיעוד, סיכום פניות, יצירת תוכן ראשוני, סיווג ותיעדוף משימות, וחילוץ מידע ממסמכים וטפסים.',
        },
      },
    ],
  },
];

const useCases = [
  {
    icon: MessageSquare,
    title: 'עוזר פנימי חכם',
    desc: 'צוות שמוצא תשובות מיידיות במקום לחפש שעות בתיעוד. AI שמכיר את המוצר, הנהלים והידע הארגוני.',
  },
  {
    icon: FileText,
    title: 'עיבוד מסמכים אוטומטי',
    desc: 'חוזים, טפסים ודו"חות שמעובדים ומסוכמים אוטומטית. חיסכון של עבודה ידנית חוזרת ומקטינת טעויות.',
  },
  {
    icon: Zap,
    title: 'סיווג ותיעדוף חכם',
    desc: 'פניות, לידים ומשימות שמדורגות אוטומטית לפי חשיבות ודחיפות — הצוות מתמקד במה שבאמת חשוב.',
  },
  {
    icon: Bot,
    title: 'צ׳אט מוצרי',
    desc: 'עוזר AI מובנה בתוך הממשק שלכם שעונה על שאלות, מדריך משתמשים ומפחית עומס על התמיכה.',
  },
];

export default function AiIntegrationPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
      <JsonLd data={schemas} />

      <GradientBar />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
        אינטגרציית AI למוצרים דיגיטליים
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
        משלבים יכולות AI בתוך המוצר שלכם בצורה מאובטחת ומדידה — כך שהצוות חוסך זמן והמשתמש מקבל חוויה חכמה יותר.
      </p>

      {/* Use case cards */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {useCases.map((u) => {
          const Icon = u.icon;
          return (
            <div
              key={u.title}
              className="flex flex-col gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5"
            >
              <div className="w-9 h-9 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                <Icon size={18} strokeWidth={1.5} className="text-[var(--color-accent)]" />
              </div>
              <h2 className="text-base font-medium text-[var(--color-text-primary)]">{u.title}</h2>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{u.desc}</p>
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <section className="mt-14 space-y-4">
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">שאלות נפוצות</h2>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">איך שומרים על אבטחת המידע?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            כל קריאה ל-AI עוברת דרך השרת — מפתחות ומידע רגיש אף פעם לא נחשפים לדפדפן. מוסיפים הרשאות, סינון ולוגים מבוקרים.
          </p>
        </article>
        <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
          <h3 className="text-base font-medium text-[var(--color-text-primary)]">על איזה תהליכים AI עובד הכי טוב?</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
            תהליכים שחוזרים שוב ושוב: תיעוד, סיכום פניות, סיווג, חילוץ מידע מטפסים. שם ה-ROI הכי ברור וניתן למדידה.
          </p>
        </article>
      </section>

      {/* CTA */}
      <section className="mt-14 flex flex-col gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">רוצים AI במוצר שלכם?</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">נגדיר יחד איפה AI נותן הכי הרבה ערך.</p>
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
