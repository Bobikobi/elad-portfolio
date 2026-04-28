'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useI18n } from '@/lib/i18n';

const content = {
  he: {
    title: 'תנאי שימוש',
    effective: 'תאריך תחילה: אפריל 2026',
    useTitle: 'שימוש באתר',
    useText:
      'אתר זה הוא אתר פורטפוליו ופרופיל עסקי אישי. שימוש באתר מהווה הסכמה לשימוש בהתאם לדין החל ולתנאים אלה.',
    ipTitle: 'קניין רוחני',
    ipText:
      'כל התוכן באתר, לרבות טקסט, עיצוב, קוד וגרפיקה, שייך לאלעד סעדון אלא אם צוין אחרת. אין להעתיק, להפיץ או ליצור יצירות נגזרות ללא אישור מפורש.',
    liabilityTitle: 'הגבלת אחריות',
    liabilityText:
      'האתר מסופק כפי שהוא, ללא אחריות מכל סוג. אלעד סעדון לא יישא באחריות לנזקים ישירים או עקיפים הנובעים מהשימוש באתר.',
    contactTitle: 'יצירת קשר',
    contactText: 'לשאלות בנושא תנאי השימוש ניתן לפנות לכתובת',
    back: 'חזרה לדף הבית',
    pageTitle: 'תנאי שימוש | אלעד סעדון',
  },
  en: {
    title: 'Terms of Service',
    effective: 'Effective date: April 2026',
    useTitle: 'Use of This Website',
    useText:
      'This website is a personal portfolio and business profile. By using this website, you agree to these terms and all applicable laws.',
    ipTitle: 'Intellectual Property',
    ipText:
      'All content on this website, including text, design, code, and graphics, belongs to Elad Saadon unless stated otherwise. Reproduction or redistribution requires explicit permission.',
    liabilityTitle: 'Limitation of Liability',
    liabilityText:
      'This website is provided "as is" without warranties of any kind. Elad Saadon is not liable for damages resulting from use of this website.',
    contactTitle: 'Contact',
    contactText: 'For questions regarding these terms, contact',
    back: 'Back to Home',
    pageTitle: 'Terms of Service | Elad Saadon',
  },
  ru: {
    title: 'Условия использования',
    effective: 'Дата вступления в силу: апрель 2026',
    useTitle: 'Использование сайта',
    useText:
      'Этот сайт является персональным портфолио и бизнес-профилем. Используя сайт, вы соглашаетесь с этими условиями и применимым законодательством.',
    ipTitle: 'Интеллектуальная собственность',
    ipText:
      'Весь контент сайта, включая текст, дизайн, код и графику, принадлежит Elad Saadon, если не указано иное. Копирование и распространение без разрешения запрещены.',
    liabilityTitle: 'Ограничение ответственности',
    liabilityText:
      'Сайт предоставляется «как есть» без каких-либо гарантий. Elad Saadon не несет ответственности за убытки, связанные с использованием сайта.',
    contactTitle: 'Контакты',
    contactText: 'По вопросам условий использования пишите на',
    back: 'Вернуться на главную',
    pageTitle: 'Условия использования | Elad Saadon',
  },
} as const;

export default function TermsContent() {
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
        <p>
          <strong>{copy.effective}</strong>
        </p>
        <h2 className="mt-8 text-xl font-medium text-[var(--color-text-primary)]">{copy.useTitle}</h2>
        <p>{copy.useText}</p>
        <h2 className="mt-8 text-xl font-medium text-[var(--color-text-primary)]">{copy.ipTitle}</h2>
        <p>{copy.ipText}</p>
        <h2 className="mt-8 text-xl font-medium text-[var(--color-text-primary)]">{copy.liabilityTitle}</h2>
        <p>{copy.liabilityText}</p>
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
