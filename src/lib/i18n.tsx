'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Locale = 'he' | 'en' | 'ru';

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  dir: 'rtl' | 'ltr';
}

const I18nContext = createContext<I18nContextType | null>(null);

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('he');

  useEffect(() => {
    const saved = localStorage.getItem('locale') as Locale | null;
    if (saved && ['he', 'en', 'ru'].includes(saved)) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('locale', l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'he' ? 'rtl' : 'ltr';
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'he' ? 'rtl' : 'ltr';
  }, [locale]);

  const dir = locale === 'he' ? 'rtl' : 'ltr';

  const t = useCallback((key: string): string => {
    return translations[key]?.[locale] ?? key;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export const translations: Record<string, Record<Locale, string>> = {
  // Nav
  'nav.about': { he: 'אודות', en: 'About', ru: 'Обо мне' },
  'nav.services': { he: 'שירותים', en: 'Services', ru: 'Услуги' },
  'nav.projects': { he: 'פרויקטים', en: 'Projects', ru: 'Проекты' },
  'nav.tech': { he: 'טכנולוגיות', en: 'Tech Stack', ru: 'Технологии' },
  'nav.contact': { he: 'צור קשר', en: 'Contact', ru: 'Контакт' },

  // Hero
  'hero.greeting': { he: 'היי, אני', en: "Hi, I'm", ru: 'Привет, я' },
  'hero.name': { he: 'אלעד סעדון', en: 'Elad Saadon', ru: 'Элад Саадон' },
  'hero.cta.work': { he: 'הפרויקטים שלי', en: 'View My Work', ru: 'Мои проекты' },
  'hero.cta.contact': { he: 'צור קשר', en: 'Get in Touch', ru: 'Связаться' },
  'hero.title.0': { he: 'מפתח Full-Stack', en: 'Full-Stack Developer', ru: 'Full-Stack Разработчик' },
  'hero.title.1': { he: 'ארכיטקט מערכות AI', en: 'AI Systems Architect', ru: 'Архитектор AI Систем' },
  'hero.title.2': { he: 'מהנדס אוטומציה', en: 'Automation Engineer', ru: 'Инженер Автоматизации' },
  'hero.title.3': { he: 'בונה Civic-Tech', en: 'Civic-Tech Builder', ru: 'Civic-Tech Разработчик' },

  // About
  'about.title': { he: 'אודות', en: 'About Me', ru: 'Обо мне' },
  'about.bio': {
    he: 'מפתח צעיר עם תשוקה לטכנולוגיה, AI ופתרונות חכמים. מתמחה בבניית מערכות מורכבות מקצה לקצה — מאפליקציות ווב מודרניות, דרך בוטים אוטונומיים בענן, ועד כלי אוטומציה מתקדמים עם בינה מלאכותית. בונה פתרונות אמיתיים שעושים שינוי.',
    en: 'Young developer passionate about technology, AI, and smart solutions. I specialize in building complex end-to-end systems — from modern web applications and autonomous cloud bots to advanced AI-powered automation tools. I build real solutions that make a difference.',
    ru: 'Молодой разработчик, увлечённый технологиями, ИИ и умными решениями. Специализируюсь на создании сложных систем от начала до конца — от современных веб-приложений и автономных облачных ботов до продвинутых инструментов автоматизации с ИИ.',
  },
  'about.metric.projects': { he: 'פרויקטים', en: 'Projects', ru: 'Проектов' },
  'about.metric.tech': { he: 'טכנולוגיות', en: 'Technologies', ru: 'Технологий' },
  'about.metric.languages': { he: 'שפות', en: 'Languages', ru: 'Языков' },
  'about.metric.cloud': { he: 'פלטפורמות ענן', en: 'Cloud Platforms', ru: 'Облачных платформ' },

  // Services
  'services.title': { he: 'שירותים', en: 'Services', ru: 'Услуги' },
  'services.subtitle': { he: 'מה אני מציע', en: 'What I Offer', ru: 'Что я предлагаю' },
  'services.web.title': { he: 'פיתוח Full-Stack', en: 'Full-Stack Web Dev', ru: 'Full-Stack Разработка' },
  'services.web.desc': {
    he: 'אפליקציות ווב מקצה לקצה — HTML/CSS/JS/TS, React, Next.js, Tailwind, Supabase, REST APIs ו-OAuth. מעיצוב ועד deploy בVercel.',
    en: 'End-to-end web apps in HTML, CSS, JavaScript & TypeScript — React, Next.js, Tailwind CSS, Supabase, REST APIs, and OAuth flows. From design to Vercel.',
    ru: 'Веб-приложения на HTML/CSS/JS/TS — React, Next.js, Tailwind, Supabase, REST API и OAuth. От дизайна до деплоя.',
  },
  'services.ai.title': { he: 'AI ואוטומציה', en: 'AI & Automation', ru: 'ИИ и Автоматизация' },
  'services.ai.desc': {
    he: 'פתרונות מותאמים עם Google Gemini, בוטים אוטונומיים ו-pipelines חכמים.',
    en: 'Custom AI-powered solutions using Google Gemini, autonomous bots, and intelligent pipelines.',
    ru: 'Решения на базе Google Gemini, автономные боты и интеллектуальные конвейеры.',
  },
  'services.desktop.title': { he: 'אפליקציות Desktop', en: 'Desktop Applications', ru: 'Desktop Приложения' },
  'services.desktop.desc': {
    he: 'אפליקציות Electron עם Puppeteer, AI Vision ואינטגרציות נייטיב.',
    en: 'Cross-platform Electron apps with Puppeteer automation, AI vision, and native integrations.',
    ru: 'Кроссплатформенные Electron приложения с Puppeteer, AI vision и нативными интеграциями.',
  },
  'services.civic.title': { he: 'Civic & Community Tech', en: 'Civic & Community Tech', ru: 'Civic & Community Tech' },
  'services.civic.desc': {
    he: 'פלטפורמות לסקטור הציבורי: ניהול חירום, כלי מעורבות אזרחית ונגישות.',
    en: 'Public-sector platforms: emergency management, civic engagement tools, accessibility-first design.',
    ru: 'Платформы для госсектора: управление ЧС, гражданское участие, доступный дизайн.',
  },

  // Projects
  'projects.title': { he: 'פרויקטים', en: 'Projects', ru: 'Проекты' },
  'projects.subtitle': { he: 'עבודות נבחרות', en: 'Selected Work', ru: 'Избранные работы' },
  'projects.filter.all': { he: 'הכל', en: 'All', ru: 'Все' },
  'projects.filter.web': { he: 'אפליקציות ווב', en: 'Web Apps', ru: 'Веб-приложения' },
  'projects.filter.desktop': { he: 'Desktop', en: 'Desktop', ru: 'Desktop' },
  'projects.filter.ai': { he: 'AI ואוטומציה', en: 'AI & Automation', ru: 'ИИ и Автоматизация' },
  'projects.filter.civic': { he: 'Civic-Tech', en: 'Civic-Tech', ru: 'Civic-Tech' },

  // Tech
  'tech.title': { he: 'טכנולוגיות', en: 'Tech Stack', ru: 'Технологии' },
  'tech.subtitle': { he: 'שפות, ממשקים וכלים שאני עובד איתם', en: 'Languages, interfaces & tools I work with', ru: 'Языки, интерфейсы и инструменты' },
  'tech.cat.languages': { he: 'שפות תכנות', en: 'Languages', ru: 'Языки' },
  'tech.cat.frontend': { he: 'Frontend', en: 'Frontend', ru: 'Frontend' },
  'tech.cat.backend': { he: 'Backend', en: 'Backend', ru: 'Backend' },
  'tech.cat.ai': { he: 'AI & ML', en: 'AI & ML', ru: 'AI & ML' },
  'tech.cat.automation': { he: 'Desktop & אוטומציה', en: 'Desktop & Automation', ru: 'Desktop и Автоматизация' },
  'tech.cat.cloud': { he: 'ענן, DevOps & APIs', en: 'Cloud, DevOps & APIs', ru: 'Облако, DevOps и API' },

  // Contact
  'contact.title': { he: 'צור קשר', en: 'Get in Touch', ru: 'Связаться' },
  'contact.subtitle': { he: 'יש לך פרויקט? בוא נדבר.', en: 'Have a project? Let\'s talk.', ru: 'Есть проект? Давайте поговорим.' },
  'contact.name': { he: 'שם', en: 'Name', ru: 'Имя' },
  'contact.email': { he: 'אימייל', en: 'Email', ru: 'Эл. почта' },
  'contact.subject': { he: 'נושא', en: 'Subject', ru: 'Тема' },
  'contact.subject.general': { he: 'פנייה כללית', en: 'General Inquiry', ru: 'Общий вопрос' },
  'contact.subject.project': { he: 'בקשת פרויקט', en: 'Project Request', ru: 'Запрос проекта' },
  'contact.subject.collab': { he: 'שיתוף פעולה', en: 'Collaboration', ru: 'Сотрудничество' },
  'contact.subject.other': { he: 'אחר', en: 'Other', ru: 'Другое' },
  'contact.message': { he: 'הודעה', en: 'Message', ru: 'Сообщение' },
  'contact.send': { he: 'שלח הודעה', en: 'Send Message', ru: 'Отправить' },
  'contact.sent': { he: 'ההודעה נשלחה!', en: 'Message sent!', ru: 'Сообщение отправлено!' },

  // Footer
  'footer.rights': { he: 'כל הזכויות שמורות.', en: 'All rights reserved.', ru: 'Все права защищены.' },
  'footer.accessibility': { he: 'הצהרת נגישות', en: 'Accessibility', ru: 'Доступность' },
  'footer.privacy': { he: 'פרטיות', en: 'Privacy', ru: 'Конфиденциальность' },
  'footer.terms': { he: 'תנאי שימוש', en: 'Terms', ru: 'Условия' },
};
