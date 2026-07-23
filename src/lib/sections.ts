import type { Locale } from './i18n';

/**
 * The cosmic sections — each is a real crawlable route AND a planet/target the
 * camera flies to. Server-safe (no 'use client'): route pages import this to
 * render SSG content + metadata, and the client SceneBridge maps pathname → focus.
 *
 * Planet mapping (spec): About=Earth, Services=Jupiter, Projects=Saturn,
 * Technologies=asteroid belt, Contact=Mars.
 */
export type SectionId = 'about' | 'services' | 'projects' | 'technologies' | 'contact';

export interface Section {
  id: SectionId;
  /** camera focus key: a planet in planetPositions, or 'belt' for technologies. */
  focus: string;
  navKey: string; // i18n nav.* key
  slug: string; // he path segment (also the en/ru segment)
}

export const SECTIONS: Section[] = [
  { id: 'about', focus: 'earth', navKey: 'nav.about', slug: 'about' },
  { id: 'services', focus: 'jupiter', navKey: 'nav.services', slug: 'services' },
  { id: 'projects', focus: 'saturn', navKey: 'nav.projects', slug: 'projects' },
  { id: 'technologies', focus: 'belt', navKey: 'nav.tech', slug: 'technologies' },
  { id: 'contact', focus: 'mars', navKey: 'nav.contact', slug: 'contact' },
];

const BY_SLUG = new Map(SECTIONS.map((s) => [s.slug, s]));

/** Reverse map: which section route a clicked planet opens. */
export const PLANET_SECTION: Record<string, SectionId> = {
  earth: 'about',
  jupiter: 'services',
  saturn: 'projects',
  mars: 'contact',
};

/** Locale-aware path for a section ('/about' for he, '/en/about' for en/ru). */
export function sectionPath(section: SectionId, locale: Locale): string {
  return locale === 'he' ? `/${section}` : `/${locale}/${section}`;
}

/** Home path per locale. */
export function homePath(locale: Locale): string {
  return locale === 'he' ? '/' : `/${locale}`;
}

/** Map a pathname to the focused section (or null for home / unknown routes). */
export function sectionForPath(pathname: string): Section | null {
  const parts = pathname.split('/').filter(Boolean);
  // Drop a leading locale segment.
  const seg = parts[0] === 'en' || parts[0] === 'ru' ? parts[1] : parts[0];
  if (!seg) return null;
  return BY_SLUG.get(seg) ?? null;
}

/** Per-section, per-locale SEO title + description (Hebrew is primary). */
export const SECTION_META: Record<SectionId, Record<Locale, { title: string; description: string }>> = {
  about: {
    he: { title: 'אודות', description: 'מפתח פול-סטאק וארכיטקט מערכות AI מישראל, עם תואר בעבודה סוציאלית ואהבה לבנות מוצרים שימושיים בקוד.' },
    en: { title: 'About', description: 'Full-stack developer and AI systems architect from Israel, with a B.A. in Social Work and a love for building genuinely useful products.' },
    ru: { title: 'Обо мне', description: 'Full-stack разработчик и архитектор AI-систем из Израиля с дипломом социальной работы и любовью к созданию полезных продуктов.' },
  },
  services: {
    he: { title: 'שירותי פיתוח Next.js, AI ואוטומציה', description: 'פיתוח Full-Stack, אינטגרציית AI ואוטומציה עסקית. קוד נקי, ביצועים גבוהים ופריסה מאובטחת לפרודקשן.' },
    en: { title: 'Services — Next.js, AI & Automation', description: 'Full-stack web development, AI integration, and business automation. Clean code, high performance, secure production deployment.' },
    ru: { title: 'Услуги — Next.js, AI и Автоматизация', description: 'Full-stack разработка, интеграция AI и бизнес-автоматизация. Чистый код, высокая производительность, безопасный деплой.' },
  },
  projects: {
    he: { title: 'פרויקטים', description: 'עבודות נבחרות בפרודקשן: מערכות AI אוטונומיות, ניהול חירום עירוני, כלים אזרחיים ופלטפורמות עסקיות.' },
    en: { title: 'Projects', description: 'Selected production work: autonomous AI systems, municipal emergency management, civic-tech tools, and business platforms.' },
    ru: { title: 'Проекты', description: 'Избранные проекты в проде: автономные AI-системы, управление ЧС, civic-tech инструменты и бизнес-платформы.' },
  },
  technologies: {
    he: { title: 'טכנולוגיות', description: 'שפות, ממשקים וכלים בפרודקשן: React, Next.js, TypeScript, Python, Django, Supabase, Gemini, Docker וענן.' },
    en: { title: 'Tech Stack', description: 'Production languages, frameworks and tools: React, Next.js, TypeScript, Python, Django, Supabase, Gemini, Docker, and cloud.' },
    ru: { title: 'Технологии', description: 'Языки, фреймворки и инструменты в проде: React, Next.js, TypeScript, Python, Django, Supabase, Gemini, Docker и облако.' },
  },
  contact: {
    he: { title: 'צור קשר', description: 'יש לך פרויקט או רעיון? שלח הודעה ונדבר על פיתוח Web, AI ואוטומציה.' },
    en: { title: 'Contact', description: 'Have a project or an idea? Send a message and let’s talk about Web, AI, and automation.' },
    ru: { title: 'Контакт', description: 'Есть проект или идея? Напишите — обсудим Web, AI и автоматизацию.' },
  },
};

const BASE = 'https://www.eladsaadon.dev';

/** Full metadata (title, description, canonical + hreflang alternates) for a section. */
export function sectionMetadata(id: SectionId, locale: Locale) {
  const m = SECTION_META[id][locale];
  return {
    title: m.title,
    description: m.description,
    alternates: {
      canonical: `${BASE}${sectionPath(id, locale)}`,
      languages: {
        'he-IL': `${BASE}${sectionPath(id, 'he')}`,
        'en-US': `${BASE}${sectionPath(id, 'en')}`,
        'ru-RU': `${BASE}${sectionPath(id, 'ru')}`,
        'x-default': `${BASE}${sectionPath(id, 'he')}`,
      },
    },
  };
}
