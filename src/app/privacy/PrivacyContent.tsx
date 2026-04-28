'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useI18n } from '@/lib/i18n';

const content = {
  he: {
    title: 'מדיניות פרטיות',
    effective: 'תאריך תחילה: אפריל 2026',
    collectTitle: 'איזה מידע נאסף',
    collectText:
      'נאסף רק מידע שאתה מזין מרצונך בטופס יצירת קשר: שם, כתובת אימייל ותוכן ההודעה. אין שימוש בקובצי מעקב פולשניים לצורך איסוף מידע אישי.',
    usageTitle: 'איך המידע משמש אותנו',
    usageText:
      'המידע משמש למענה לפנייה שלך בלבד. אנחנו לא מוכרים, מעבירים או משתפים מידע אישי עם צד שלישי למטרות מסחריות.',
    storageTitle: 'שמירת מידע',
    storageText:
      'הודעות נשמרות בצורה מאובטחת בתשתית Supabase (PostgreSQL) עם שכבות אבטחה מתאימות. העברת הנתונים מתבצעת בפרוטוקול מוצפן.',
    rightsTitle: 'הזכויות שלך',
    rightsText: 'ניתן לבקש עיון, תיקון או מחיקה של המידע האישי שלך דרך כתובת',
    back: 'חזרה לדף הבית',
    pageTitle: 'מדיניות פרטיות | אלעד סעדון',
  },
  en: {
    title: 'Privacy Policy',
    effective: 'Effective date: April 2026',
    collectTitle: 'Information We Collect',
    collectText:
      'We only collect data you voluntarily submit through the contact form: your name, email address, and message content.',
    usageTitle: 'How We Use Information',
    usageText:
      'Your information is used only to respond to your inquiry. We do not sell, rent, or share personal data for commercial purposes.',
    storageTitle: 'Data Storage',
    storageText:
      'Contact messages are stored securely using Supabase (PostgreSQL) with appropriate safeguards. Data transfer is encrypted.',
    rightsTitle: 'Your Rights',
    rightsText: 'You may request access, correction, or deletion of your personal data by contacting',
    back: 'Back to Home',
    pageTitle: 'Privacy Policy | Elad Saadon',
  },
  ru: {
    title: 'Политика конфиденциальности',
    effective: 'Дата вступления в силу: апрель 2026',
    collectTitle: 'Какие данные собираются',
    collectText:
      'Мы собираем только данные, которые вы добровольно отправляете через форму: имя, email и текст сообщения.',
    usageTitle: 'Как используются данные',
    usageText:
      'Данные используются только для ответа на ваш запрос. Мы не продаем и не передаем персональные данные в коммерческих целях.',
    storageTitle: 'Хранение данных',
    storageText:
      'Сообщения хранятся в защищенной инфраструктуре Supabase (PostgreSQL). Передача данных выполняется по защищенному каналу.',
    rightsTitle: 'Ваши права',
    rightsText: 'Вы можете запросить доступ, исправление или удаление ваших данных по адресу',
    back: 'Вернуться на главную',
    pageTitle: 'Политика конфиденциальности | Elad Saadon',
  },
} as const;

export default function PrivacyContent() {
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
        <h2 className="mt-8 text-xl font-medium text-[var(--color-text-primary)]">{copy.collectTitle}</h2>
        <p>{copy.collectText}</p>
        <h2 className="mt-8 text-xl font-medium text-[var(--color-text-primary)]">{copy.usageTitle}</h2>
        <p>{copy.usageText}</p>
        <h2 className="mt-8 text-xl font-medium text-[var(--color-text-primary)]">{copy.storageTitle}</h2>
        <p>{copy.storageText}</p>
        <h2 className="mt-8 text-xl font-medium text-[var(--color-text-primary)]">{copy.rightsTitle}</h2>
        <p>
          {copy.rightsText}{' '}
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
