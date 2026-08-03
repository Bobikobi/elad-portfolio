// Plain (server-safe) translation data + Locale type. Kept out of the 'use client'
// i18n module so Server Components (route pages, metadata) can import the strings
// directly. i18n.tsx re-exports both for existing client call-sites.
export type Locale = 'he' | 'en' | 'ru';

export const translations: Record<string, Record<Locale, string>> = {
  // Nav
  'nav.about': { he: 'אודות', en: 'About', ru: 'Обо мне' },
  'nav.services': { he: 'שירותים', en: 'Services', ru: 'Услуги' },
  'nav.projects': { he: 'פרויקטים', en: 'Projects', ru: 'Проекты' },
  'nav.tech': { he: 'טכנולוגיות', en: 'Tech Stack', ru: 'Технологии' },
  'nav.contact': { he: 'צור קשר', en: 'Contact', ru: 'Контакт' },
  'nav.home': { he: 'לדף הבית', en: 'Home', ru: 'Главная' },
  // F2 - the view toggle. The label names the view you are switching TO, so the button
  // reads as an action rather than as a status.
  'view.classic': { he: 'תצוגה קלאסית', en: 'Classic view', ru: 'Классический вид' },
  'view.cosmic': { he: 'תצוגה קוסמית', en: 'Cosmic view', ru: 'Космический вид' },

  // Hero
  'hero.greeting': { he: 'היי, אני', en: "Hi, I'm", ru: 'Привет, я' },
  'hero.name': { he: 'אלעד סעדון', en: 'Elad Saadon', ru: 'Элад Саадон' },
  'hero.available': { he: 'זמין לפרויקטים חדשים', en: 'Available for new projects', ru: 'Открыт для новых проектов' },
  'hero.subtitle': {
    he: 'אני בונה מוצרי Web ו-AI מהירים, נגישים ויציבים לפרודקשן, עם דגש על תוצאות עסקיות אמיתיות.',
    en: 'I build fast, accessible, production-grade Web and AI products with a sharp focus on business outcomes.',
    ru: 'Я создаю быстрые, доступные и production-ready Web и AI продукты с фокусом на реальный бизнес-результат.',
  },
  'hero.cta.work': { he: 'הפרויקטים שלי', en: 'View My Work', ru: 'Мои проекты' },
  'hero.cta.contact': { he: 'צור קשר', en: 'Get in Touch', ru: 'Связаться' },
  'hero.links.services': { he: 'שירותי פיתוח', en: 'Development Services', ru: 'Услуги разработки' },
  'hero.links.ai': { he: 'אינטגרציית AI', en: 'AI Integration', ru: 'Интеграция ИИ' },
  'hero.links.guide': { he: 'מדריך SEO + GEO 2026', en: 'SEO + GEO Guide 2026', ru: 'Руководство SEO + GEO 2026' },
  'hero.title.0': { he: 'מפתח פול-סטאק', en: 'Full-Stack Developer', ru: 'Full-Stack Разработчик' },
  'hero.title.1': { he: 'בונה עם בינה מלאכותית', en: 'Builds with AI', ru: 'Разрабатывает с AI' },
  'hero.title.2': { he: 'אוטומציה וכלים', en: 'Automation & Tools', ru: 'Автоматизация и Инструменты' },
  'hero.title.3': { he: 'פרויקטים שעושים הבדל', en: 'Projects That Matter', ru: 'Проекты Которые Важны' },
  'hero.galaxy.hint': { he: 'רחפו על הכוכבים כדי לחקור', en: 'Hover the stars to explore', ru: 'Наведите на звёзды' },
  'welcome.title': { he: 'ברוכים הבאים', en: 'Welcome', ru: 'Добро пожаловать' },
  'welcome.identity': {
    he: 'מפתח פול-סטאק שבונה מוצרי ווב ו-AI',
    en: 'Full-stack developer building web and AI products',
    ru: 'Full-stack разработчик веб и AI продуктов',
  },
  'welcome.hint': { he: 'גלול כדי לצלול', en: 'Scroll to dive in', ru: 'Прокрутите, чтобы нырнуть' },
  'welcome.dragHint': { he: 'גררו כדי לסובב את המערכת', en: 'Drag to rotate the system', ru: 'Потяните, чтобы вращать систему' },
  'welcome.swipeHint': { he: 'החליקו לכוכב הבא', en: 'Swipe to the next planet', ru: 'Свайп к следующей планете' },

  // About
  'about.title': { he: 'אודות', en: 'About Me', ru: 'Обо мне' },
  'about.bio': {
    he: 'מפתח פול-סטאק עם רקע קצת שונה - תואר ראשון בעבודה סוציאלית ואהבה אמיתית לבנות דברים עם קוד. נהנה מבניית אפליקציות ווב, אוטומציה של תהליכים וניסויים עם בינה מלאכותית. הרקע החברתי עוזר לי להישאר ממוקד בלבנות דברים שבאמת שימושיים.',
    en: 'Full-Stack developer with an uncommon background - B.A. in Social Work and a genuine love for building things with code. I enjoy creating web apps, automating workflows, and experimenting with AI. The social work side keeps me grounded in building things that are actually useful.',
    ru: 'Full-Stack разработчик с нестандартным бэкграундом - бакалавр социальной работы и искренний интерес к программированию. Люблю создавать веб-приложения, автоматизировать процессы и экспериментировать с AI. Социальный фон помогает строить вещи, которые действительно полезны.',
  },
  'about.metric.projects': { he: 'פרויקטים', en: 'Projects', ru: 'Проектов' },
  'about.metric.tech': { he: 'טכנולוגיות', en: 'Technologies', ru: 'Технологий' },
  'about.metric.languages': { he: 'שפות', en: 'Languages', ru: 'Языков' },
  'about.metric.cloud': { he: 'פלטפורמות ענן', en: 'Cloud Platforms', ru: 'Облачных платформ' },

  // Services
  'services.title': { he: 'שירותים', en: 'Services', ru: 'Услуги' },
  'services.subtitle': { he: 'מה אני מציע', en: 'What I Offer', ru: 'Что я предлагаю' },
  'services.web.title': { he: 'פיתוח פול-סטאק', en: 'Full-Stack Web Dev', ru: 'Full-Stack Разработка' },
  'services.web.desc': {
    he: 'אפליקציות ווב מקצה לקצה - React, Next.js, Tailwind, Supabase, ממשקי API ואימות משתמשים. משלב תכנון ועד פריסה מלאה לפרודקשן.',
    en: 'End-to-end web apps in HTML, CSS, JavaScript & TypeScript - React, Next.js, Tailwind CSS, Supabase, REST APIs, and OAuth flows. From design to Vercel.',
    ru: 'Веб-приложения на HTML/CSS/JS/TS - React, Next.js, Tailwind, Supabase, REST API и OAuth. От дизайна до деплоя.',
  },
  'services.ai.title': { he: 'בינה מלאכותית ואוטומציה', en: 'AI & Automation', ru: 'ИИ и Автоматизация' },
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
  'projects.filter.web': { he: 'אתרים ואפליקציות', en: 'Websites & Apps', ru: 'Сайты и приложения' },
  'projects.filter.desktop': { he: 'Desktop', en: 'Desktop', ru: 'Desktop' },
  'projects.filter.ai': { he: 'AI ואוטומציה', en: 'AI & Automation', ru: 'ИИ и Автоматизация' },
  'projects.filter.civic': { he: 'Civic-Tech', en: 'Civic-Tech', ru: 'Civic-Tech' },
  'projects.visit': { he: 'לאתר', en: 'Visit', ru: 'Открыть' },

  // Tech
  'tech.title': { he: 'טכנולוגיות', en: 'Tech Stack', ru: 'Технологии' },
  'tech.subtitle': { he: 'שפות, ממשקים וכלים שאני עובד איתם - מקוד שרת ועד ה-GPU', en: 'Languages, interfaces and tools I work with - from server code to the GPU', ru: 'Языки, интерфейсы и инструменты - от серверного кода до GPU' },
  'tech.cat.languages': { he: 'שפות תכנות', en: 'Languages', ru: 'Языки' },
  'tech.cat.frontend': { he: 'Frontend', en: 'Frontend', ru: 'Frontend' },
  'tech.cat.realtime': { he: 'גרפיקה ותלת-ממד בזמן אמת', en: 'Real-Time 3D & Graphics', ru: '3D-графика в реальном времени' },
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
  'contact.sending': { he: 'שולח...', en: 'Sending...', ru: 'Отправка...' },
  'contact.sent': { he: 'ההודעה נשלחה! אחזור אליך בהקדם.', en: 'Message sent! I’ll get back to you soon.', ru: 'Сообщение отправлено! Скоро отвечу.' },
  'contact.error': { he: 'שליחה נכשלה. נסה שוב או שלח מייל ישירות.', en: 'Sending failed. Try again or email directly.', ru: 'Ошибка отправки. Попробуйте снова или напишите на почту.' },
  'contact.back': { he: 'חזרה למערכת', en: 'Back to system', ru: 'Назад к системе' },

  // World identity taglines (one line under each world title — the narrative "why")
  'world.tagline.about': { he: 'נקודת הבית - מאיפה שהכל מתחיל', en: 'Home base - where it all begins', ru: 'Точка дома - откуда всё начинается' },
  'world.tagline.services': { he: 'הענק עם ארבעת הירחים הגדולים - ארבעה שירותים', en: 'The giant with four great moons - four services', ru: 'Гигант с четырьмя большими лунами - четыре услуги' },
  'world.tagline.projects': { he: 'המערכת העשירה - כל ירח הוא פרויקט', en: 'The rich system - every moon is a project', ru: 'Богатая система - каждая луна это проект' },
  'world.tagline.technologies': { he: 'אלפי אבני הבניין של המסע', en: 'Thousands of building blocks of the journey', ru: 'Тысячи строительных блоков путешествия' },
  'world.tagline.contact': { he: 'היעד הבא - בואו נבנה אותו יחד', en: 'The next destination - let us build it together', ru: 'Следующая цель - построим её вместе' },
  // Departure gesture indicator (over the planet / open space)
  'world.departure': { he: 'המשך לגלול לחזרה למערכת', en: 'Keep scrolling to return to the system', ru: 'Продолжайте прокручивать, чтобы вернуться' },

  // Footer
  'footer.rights': { he: 'כל הזכויות שמורות.', en: 'All rights reserved.', ru: 'Все права защищены.' },
  'footer.accessibility': { he: 'הצהרת נגישות', en: 'Accessibility', ru: 'Доступность' },
  'footer.privacy': { he: 'פרטיות', en: 'Privacy', ru: 'Конфиденциальность' },
  'footer.terms': { he: 'תנאי שימוש', en: 'Terms', ru: 'Условия' },
};
