'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useI18n } from '@/lib/i18n';

const content = {
  he: {
    title: 'הצהרת נגישות',
    intro:
      'אתר זה מחויב להנגשה דיגיטלית לאנשים עם מוגבלויות. אנו פועלים באופן רציף לשיפור חוויית השימוש וליישום הנחיות נגישות עדכניות.',
    standardsTitle: 'תקנים',
    standardsText: 'האתר שואף לעמידה בהנחיות WCAG 2.1 ברמת AA.',
    featuresTitle: 'יכולות נגישות באתר',
    features: [
      'ניווט מלא באמצעות מקלדת',
      'תאימות לקוראי מסך',
      'ווידג׳ט נגישות מובנה: הגדלת טקסט, ניגודיות, הדגשת קישורים, עצירת אנימציות וגווני אפור',
      'קישור דילוג לתוכן הראשי',
      'מבנה HTML סמנטי',
      'יחסי ניגודיות תקינים',
      'התאמה להעדפת Reduced Motion',
    ],
    contactTitle: 'יצירת קשר בנושא נגישות',
    contactText: 'אם נתקלת בבעיה, אפשר לפנות אלינו בכתובת',
    back: 'חזרה לדף הבית',
    pageTitle: 'הצהרת נגישות | אלעד סעדון',
  },
  en: {
    title: 'Accessibility Statement',
    intro:
      'This website is committed to digital accessibility for people with disabilities. We continuously improve usability and implement relevant accessibility standards.',
    standardsTitle: 'Standards',
    standardsText: 'This website aims to conform to WCAG 2.1 Level AA.',
    featuresTitle: 'Accessibility Features',
    features: [
      'Keyboard navigation support',
      'Screen reader compatibility',
      'Built-in accessibility widget for font scale, contrast, link highlighting, animation control, and grayscale',
      'Skip-to-content link',
      'Semantic HTML structure',
      'Sufficient color contrast',
      'Reduced motion support',
    ],
    contactTitle: 'Accessibility Contact',
    contactText: 'If you encounter an accessibility issue, contact us at',
    back: 'Back to Home',
    pageTitle: 'Accessibility Statement | Elad Saadon',
  },
  ru: {
    title: 'Заявление о доступности',
    intro:
      'Сайт ориентирован на цифровую доступность для людей с ограниченными возможностями. Мы постоянно улучшаем удобство использования и внедряем актуальные стандарты.',
    standardsTitle: 'Стандарты',
    standardsText: 'Сайт стремится соответствовать WCAG 2.1 уровня AA.',
    featuresTitle: 'Функции доступности',
    features: [
      'Навигация с клавиатуры',
      'Совместимость со screen reader',
      'Встроенный виджет доступности: масштаб шрифта, контраст, подсветка ссылок, управление анимацией, grayscale',
      'Ссылка пропуска к основному контенту',
      'Семантическая HTML-структура',
      'Достаточный цветовой контраст',
      'Поддержка reduced motion',
    ],
    contactTitle: 'Контакт по вопросам доступности',
    contactText: 'Если вы обнаружили проблему доступности, напишите на',
    back: 'Вернуться на главную',
    pageTitle: 'Доступность | Elad Saadon',
  },
} as const;

export default function AccessibilityContent() {
  const { locale } = useI18n();
  const copy = content[locale];
  const homeHref = locale === 'he' ? '/' : `/${locale}`;

  useEffect(() => {
    document.title = copy.pageTitle;
  }, [copy.pageTitle]);

  return (
    <div className="mx-auto max-w-[800px] px-6 py-32">
      <h1 className="mb-8 text-3xl font-semibold text-[var(--color-text-primary)]">{copy.title}</h1>
      <div className="prose prose-invert prose-sm max-w-none space-y-4 text-[var(--color-text-secondary)]">
        <p>{copy.intro}</p>
        <h2 className="mt-8 text-xl font-medium text-[var(--color-text-primary)]">{copy.standardsTitle}</h2>
        <p>{copy.standardsText}</p>
        <h2 className="mt-8 text-xl font-medium text-[var(--color-text-primary)]">{copy.featuresTitle}</h2>
        <ul className="list-inside list-disc space-y-1">
          {copy.features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
        <h2 className="mt-8 text-xl font-medium text-[var(--color-text-primary)]">{copy.contactTitle}</h2>
        <p>
          {copy.contactText}{' '}
          <a href="mailto:eladeladsaa@gmail.com" className="text-[var(--color-accent)] hover:underline">
            eladeladsaa@gmail.com
          </a>
        </p>
      </div>
      <div className="mt-12">
        <Link href={homeHref} className="text-sm text-[var(--color-accent)] hover:underline">
          {copy.back}
        </Link>
      </div>
    </div>
  );
}
