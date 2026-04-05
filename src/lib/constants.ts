import { Locale } from './i18n';

export interface Project {
  id: string;
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  category: 'web-app' | 'desktop' | 'ai-bot' | 'civic-tech' | 'component';
  techStack: string[];
  liveUrl?: string;
  githubUrl?: string;
  featured: boolean;
}

export const projects: Project[] = [
  {
    id: 'openclaw',
    title: {
      he: 'OpenClaw — מערכת AI אוטונומית',
      en: 'OpenClaw — Autonomous AI System',
      ru: 'OpenClaw — Автономная AI Система',
    },
    description: {
      he: 'מערכת AI רב-צמתית על Contabo VPS, GCP ו-Oracle Cloud. 11+ שירותי systemd כולל Telegram interceptor עם Gemini function-calling, pipeline משימות מלא, מעבדת מסחר עם 5 אסטרטגיות Freqtrade מקביליות, ומנוע אבולוציה לאופטימיזציה.',
      en: 'Multi-node AI agent spanning Contabo VPS, GCP, and Oracle Cloud. Runs 11+ systemd services including Telegram interceptor with Gemini function-calling, full task pipeline, trading lab with 5 parallel Freqtrade strategies, and an evolution engine for optimization.',
      ru: 'Многоузловой AI-агент на Contabo VPS, GCP и Oracle Cloud. 11+ systemd сервисов включая Telegram interceptor с Gemini function-calling, полный конвейер задач, торговая лаборатория с 5 стратегиями Freqtrade.',
    },
    category: 'ai-bot',
    techStack: ['Node.js', 'Python', 'GCP', 'Docker', 'Telegram API', 'Gemini', 'Freqtrade'],
    featured: true,
  },
  {
    id: 'web-scraper',
    title: {
      he: 'AI Visual Web Scraper',
      en: 'AI Visual Web Scraper',
      ru: 'AI Visual Web Scraper',
    },
    description: {
      he: 'אפליקציית Desktop שמשלבת Puppeteer עם Google Gemini Vision AI. סורקת Facebook, Instagram ו-TikTok בגישה היברידית DOM + צילום מסך, עם סנכרון ל-Google Sheets.',
      en: 'Desktop app combining Puppeteer with Google Gemini\'s multimodal Vision AI. Scrapes Facebook, Instagram, and TikTok using hybrid DOM + screenshot analysis, syncing to Google Sheets.',
      ru: 'Desktop приложение сочетающее Puppeteer с мультимодальным Google Gemini Vision AI. Скрапинг Facebook, Instagram и TikTok с гибридным DOM + screenshot анализом.',
    },
    category: 'desktop',
    techStack: ['Electron', 'Puppeteer', 'Gemini 2.0', 'Sharp', 'Google Sheets API'],
    featured: true,
  },
  {
    id: 'ai-style',
    title: {
      he: 'AI Style App',
      en: 'AI Style App',
      ru: 'AI Style App',
    },
    description: {
      he: 'פלטפורמת ניתוח אופנה עם AI. ניתוח גוון עור (12 עונות), זיהוי מבנה גוף עם SVG אינטראקטיבי, חידון סגנון והצעות לבוש מ-AI.',
      en: 'AI-powered fashion analysis platform. Skin-tone analysis (12-season color theory), body shape detection via interactive SVG avatar, style quizzes, and AI-generated outfit suggestions.',
      ru: 'AI платформа анализа моды. Анализ тона кожи (12 сезонов), определение фигуры через SVG аватар, стилевые квизы и AI генерация нарядов.',
    },
    category: 'web-app',
    techStack: ['Next.js 14', 'TypeScript', 'Tailwind', 'Supabase', 'Pollinations.ai'],
    liveUrl: 'https://ai-style-app.vercel.app',
    featured: true,
  },
  {
    id: 'political-compass',
    title: {
      he: 'מצפן פוליטי ישראלי',
      en: 'Political Compass IL',
      ru: 'Политический Компас IL',
    },
    description: {
      he: 'מצפן פוליטי ישראלי עם אלגוריתם Bayesian, סיווג אזורים רך עם Mahalanobis distance, רווחי ביטחון וויזואליזציות Recharts אינטראקטיביות.',
      en: 'Israeli political compass with Bayesian scoring, soft zone classification using Mahalanobis distance, confidence intervals, and interactive Recharts visualizations.',
      ru: 'Израильский политический компас с байесовским скорингом, мягкой классификацией зон через расстояние Махаланобиса и визуализациями Recharts.',
    },
    category: 'civic-tech',
    techStack: ['Next.js', 'TypeScript', 'Supabase', 'Recharts', 'Framer Motion'],
    featured: true,
  },
  {
    id: 'emergency-teams',
    title: {
      he: 'צוותי חירום נתניה',
      en: 'Netanya Emergency Teams',
      ru: 'Команды ЧС Нетании',
    },
    description: {
      he: 'מערכת ניהול חירום עירונית לנתניה. דשבורד אירועים בזמן אמת, דיווח אירועים עם Zod validation, תרשימים ארגוניים ותמיכה תלת-שפתית.',
      en: 'Municipal emergency management system for Netanya. Real-time event dashboards, incident reporting with Zod validation, org charts, and full trilingual support.',
      ru: 'Городская система управления ЧС для Нетании. Дашборды в реальном времени, отчёты об инцидентах с Zod validation, оргструктуры и трёхъязычная поддержка.',
    },
    category: 'civic-tech',
    techStack: ['Next.js 14', 'TypeScript', 'Supabase', 'Zod', 'i18n'],
    liveUrl: 'https://netanya-civil.vercel.app',
    featured: true,
  },
  {
    id: 'honey-shor',
    title: {
      he: 'Honey Shor — אתר לקוח',
      en: 'Honey Shor — Client Portfolio',
      ru: 'Honey Shor — Портфолио клиента',
    },
    description: {
      he: 'אתר פורטפוליו למרצה. אנימציות scroll חלקות, SEO מובנה עם JSON-LD, הזמנת הרצאות ותאימות נגישות.',
      en: 'Portfolio website for a motivational speaker. Smooth scroll animations, SEO-optimized JSON-LD structured data, lecture booking, and accessibility compliance.',
      ru: 'Портфолио для мотивационного спикера. Плавные анимации, SEO с JSON-LD, бронирование лекций и соответствие требованиям доступности.',
    },
    category: 'web-app',
    techStack: ['Next.js', 'TypeScript', 'Tailwind', 'Framer Motion'],
    liveUrl: 'https://honey-site-seven.vercel.app',
    featured: false,
  },
  {
    id: 'accessibility-widget',
    title: {
      he: 'Accessibility Widget',
      en: 'Accessibility Widget',
      ru: 'Accessibility Widget',
    },
    description: {
      he: 'רכיב React מוכן לפרודקשן לנגישות: שינוי גודל טקסט, ניגודיות, הדגשת קישורים, עצירת אנימציות ו-greyscale. תומך 3 שפות עם localStorage.',
      en: 'Production-ready React component for accessibility: font scaling, contrast modes, link highlighting, animation toggle, and grayscale. Supports 3 languages with localStorage persistence.',
      ru: 'Production-ready React компонент доступности: масштабирование шрифта, контрастные режимы, выделение ссылок, остановка анимаций. 3 языка с localStorage.',
    },
    category: 'component',
    techStack: ['React', 'TypeScript', 'Tailwind', 'Lucide React'],
    featured: false,
  },
];

export const services = [
  { key: 'web', icon: 'Globe' as const },
  { key: 'ai', icon: 'Bot' as const },
  { key: 'desktop', icon: 'Monitor' as const },
  { key: 'civic', icon: 'Users' as const },
];

export const techCategories = [
  { key: 'frontend', items: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Framer Motion'] },
  { key: 'backend', items: ['Node.js', 'Supabase', 'PostgreSQL', 'REST APIs', 'Zod'] },
  { key: 'ai', items: ['Google Gemini 2.0', 'Pollinations.ai', 'Vision AI', 'Function Calling'] },
  { key: 'automation', items: ['Puppeteer', 'Playwright', 'Electron', 'Freqtrade', 'Cron'] },
  { key: 'cloud', items: ['GCP', 'Oracle Cloud', 'Contabo VPS', 'Vercel', 'Docker'] },
  { key: 'tools', items: ['Git', 'VS Code', 'GitHub Actions', 'Telegram Bot API', 'systemd'] },
];

export const metrics = [
  { value: 7, label: 'about.metric.projects' },
  { value: 12, label: 'about.metric.tech' },
  { value: 3, label: 'about.metric.languages' },
  { value: 3, label: 'about.metric.cloud' },
];

export const filterCategories = ['all', 'web-app', 'desktop', 'ai-bot', 'civic-tech'] as const;
export type FilterCategory = typeof filterCategories[number];

export const filterKeys: Record<FilterCategory, string> = {
  all: 'projects.filter.all',
  'web-app': 'projects.filter.web',
  desktop: 'projects.filter.desktop',
  'ai-bot': 'projects.filter.ai',
  'civic-tech': 'projects.filter.civic',
};
