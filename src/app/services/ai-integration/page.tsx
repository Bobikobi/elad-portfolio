import type { Metadata } from 'next';
import Link from 'next/link';
import { Bot, FileText, MessageSquare, Zap, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import GradientBar from '@/components/ui/GradientBar';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

export const metadata: Metadata = {
  title: 'אינטגרציית AI למערכות קיימות וחדשות',
  description:
    'הטמעת AI בתוך מוצרי Web: צ׳אט חכם, סיכום מסמכים, סיווג נתונים ואוטומציה עם Gemini ו-OpenAI בצורה מאובטחת.',
  alternates: {
    canonical: 'https://www.eladsaadon.dev/services/ai-integration',
    languages: {
      'he-IL': 'https://www.eladsaadon.dev/services/ai-integration',
      'en-US': 'https://www.eladsaadon.dev/en/services/ai-integration',
      'ru-RU': 'https://www.eladsaadon.dev/ru/services/ai-integration',
      'x-default': 'https://www.eladsaadon.dev/services/ai-integration',
    },
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

const deliverables = [
  'עוזר AI מותאם אישית — מוכן לאינטגרציה במוצר הקיים',
  'מערכת עיבוד מסמכים אוטומטית (PDF, טפסים, חוזים)',
  'מנוע סיווג ותיעדוף חכם ללידים, פניות ומשימות',
  'צ׳אט מוצרי עם RAG (שליפת מידע ממאגר ידע)',
  'שכבת אבטחה: הרשאות, סינון מידע, לוגים מבוקרים',
  'API endpoints מאובטחים לקריאות AI',
  'ניטור עלויות שימוש ב-API (OpenAI / Gemini)',
  'תיעוד מלא + קוד מקור בגישה פרטית',
];

const faqExtra = [
  {
    q: 'כמה עולה להרים אינטגרציית AI?',
    a: 'העלות תלויה במורכבות. אינטגרציה פשוטה (צ׳אט עם RAG) לוקחת 1–2 שבועות. מערכת מלאה עם עיבוד מסמכים, סיווג ואוטומציה — 3–6 שבועות. העלויות החוזרות הן עלויות ה-API של OpenAI/Gemini בלבד.',
  },
  {
    q: 'האם אפשר לשלב AI במערכת קיימת בלי לשכתב הכול?',
    a: 'בדרך כלל כן. מוסיפים שכבת API שמתחברת ל-LLM וממשק בצד הלקוח — בלי לגעת בלוגיקה הקיימת. מתחילים משימוש אחד קטן ומרחיבים לפי תוצאות.',
  },
  {
    q: 'איך מודדים ROI של אינטגרציית AI?',
    a: 'מודדים זמן שנחסך בעבודה ידנית, ירידה בכמות הפניות לתמיכה, שיפור בזמן תגובה ללידים, ושביעות רצון משתמשים לפני ואחרי ההטמעה.',
  },
];

export default function AiIntegrationPage() {
  const breadcrumbs = [
    { label: 'דף הבית', href: '/' },
    { label: 'שירותים', href: '/services' },
    { label: 'אינטגרציית AI', href: '/services/ai-integration' },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
      <JsonLd data={schemas} />

      <GradientBar />
      <Breadcrumbs items={breadcrumbs} locale="he" />
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
        אינטגרציית AI למוצרים דיגיטליים
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
        משלבים יכולות AI בתוך המוצר שלכם בצורה מאובטחת ומדידה — כך שהצוות חוסך זמן והמשתמש מקבל חוויה חכמה יותר.
      </p>

      {/* Direct answer for featured snippet */}
      <div className="mt-8 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-5">
        <p className="text-sm leading-7 text-[var(--color-text-secondary)]">
          <strong className="text-[var(--color-text-primary)]">תשובה קצרה:</strong>{' '}
          אינטגרציית AI למוצרים דיגיטליים — הטמעת צ׳אט חכם, עיבוד מסמכים אוטומטי, סיווג לידים ומשימות, ועוזרים מובנים בתוך הממשק. כל קריאה עוברת דרך השרת שלכם עם שכבת אבטחה מלאה. מתאים לעסקים שרוצים לחסוך זמן ידני ולתת חוויה חכמה יותר למשתמשים.
        </p>
      </div>

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
