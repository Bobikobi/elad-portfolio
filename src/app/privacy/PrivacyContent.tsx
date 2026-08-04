'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useI18n } from '@/lib/i18n';

/**
 * The approved rewrite (docs/briefs/privacy-rewrite-draft.md), shipping with M1 and not
 * before: section 3 describes a database, and describing storage that does not exist is
 * the same fault as the Supabase claim this text replaces.
 *
 * Two amendment gates ride on this file. Both must be honoured in the SAME PR as the
 * milestone that breaks them, never afterwards:
 *   M2 - `pageviews` records first-party data about visitors, which breaks "nothing else
 *        about you is collected" in section 1 and makes section 5 incomplete.
 *   M5 - attribution populates referrer and utm_*, which breaks "the site does not record
 *        how you reached it" in section 1.
 */

const EMAIL = 'eladeladsaa@gmail.com';

interface Section {
  title: string;
  paragraphs: string[];
  bullets?: string[];
  /** Rendered after the bullets - section 7's IP-hash paragraph. */
  footnote?: string;
}

interface Copy {
  title: string;
  intro: string;
  updated: string;
  sections: Section[];
  back: string;
  pageTitle: string;
}

const content: Record<'he' | 'en' | 'ru', Copy> = {
  he: {
    title: 'מדיניות פרטיות',
    intro: 'האתר הזה הוא תיק עבודות אישי. הוא אוסף כמה שפחות, והעמוד הזה מתאר בדיוק מה.',
    updated: 'עודכן לאחרונה: 4 באוגוסט 2026',
    sections: [
      {
        title: '1. איזה מידע נאסף',
        paragraphs: [
          'רק מה שנמסר ביוזמתך, בתוספת הדף שממנו נשלחה הפנייה. טופס יצירת הקשר מבקש שם, כתובת אימייל והודעה, ומתעד מאיזה דף באתר נשלח הטופס, כדי שניתן יהיה להשיב בהקשר הנכון. ווידג\'ט הצ\'אט מקבל את מה שנכתב בו. שום מידע אחר עליך אינו נאסף: אין באתר חשבון, פרופיל או רשימת דיוור, והאתר אינו מתעד כיצד הגעת אליו.',
        ],
      },
      {
        title: '2. איך המידע משמש',
        paragraphs: [
          'הפרטים משמשים אך ורק לקריאת הפנייה ולמענה עליה. הם לא נמכרים, לא מושכרים ולא משותפים למטרות מסחריות, ולא נעשה בהם שימוש לפרסום. הבסיס החוקי לעיבוד הוא האינטרס הלגיטימי במענה לפנייה שנשלחה ביוזמתך, ובמקרים שבהם נדרשת הסכמה - הסכמה שניתן לחזור ממנה בכל עת.',
        ],
      },
      {
        title: '3. היכן המידע נשמר',
        paragraphs: [
          'פניות מטופס יצירת הקשר נשמרות במסד נתונים PostgreSQL המתארח אצל Neon באזור eu-central-1 (Frankfurt), והעברת המידע מתבצעת בחיבור מוצפן. הן נשמרות למשך הזמן הדרוש לטיפול בפנייה ובעבודה שנובעת ממנה, ובכל מקרה לא יותר מ-24 חודשים, ולאחר מכן הן נמחקות. ניתן לבקש את מחיקתן מוקדם יותר בכל עת.',
        ],
      },
      {
        title: '4. עוגיות',
        paragraphs: ['רק עוגיות פונקציונליות, ורק שתיים:'],
        bullets: [
          'locale - השפה שנבחרה, כדי שהעמוד ייטען מיד בשפה הנכונה.',
          'viewMode - האם נבחרה התצוגה האינטראקטיבית או הפשוטה.',
        ],
        footnote:
          'אף אחת מהן אינה נושאת מזהה, ואף אחת אינה מאפשרת לזהות אותך באתרים אחרים. אין עוגיות פרסום ואין עוגיות מעקב חוצות-אתרים מכל סוג. הדפדפן שומר גם את הגדרות התצוגה והנגישות שלך על המכשיר שלך בלבד, והן אינן נשלחות לשום מקום.',
      },
      {
        title: '5. מדידה ואנליטיקס',
        paragraphs: [
          'הביקורים נמדדים באמצעות Vercel Analytics ו-Vercel Speed Insights. שניהם פועלים ללא עוגיות וברמת נתונים מצטברת: הם מדווחים על כמות צפיות וזמני טעינה, לא על אנשים.',
        ],
      },
      {
        title: '6. ווידג\'ט הצ\'אט',
        paragraphs: [
          'הודעות שנכתבות בצ\'אט נשלחות לספק בינה מלאכותית כדי לייצר תשובה. כרגע הספק הוא Moonshot AI (Kimi); בכל פריסה של האתר שאינה מוגדרת עם מפתח Kimi נעשה שימוש ב-Google Gemini במקום. השיחות אינן נשמרות באתר הזה. כדי למנוע ניצול לרעה, הבקשות מוגבלות בקצב.',
        ],
      },
      {
        title: '7. מי עוד מעבד מידע',
        paragraphs: [],
        bullets: [
          'Vercel - אחסון האתר ומדידה ללא עוגיות',
          'Neon - אחסון מסד הנתונים',
          'Moonshot AI ו-Google - יצירת תשובות בצ\'אט בלבד',
        ],
        footnote:
          'גיבוב (hash) חד-כיווני של כתובת ה-IP שלך נשמר לזמן קצר, אך ורק לצורך הגבלת קצב ומניעת ניצול לרעה. הכתובת עצמה אינה נשמרת כלל, והגיבוב אינו ניתן להיפוך ואינו מאפשר לזהות אותך. הוא אינו נשמר לצד ההודעה, והוא נמחק בתום חלון הגבלת הקצב. כתובת ה-IP עצמה משמשת רק בזמן ההעברה, לצורכי אבטחה.',
      },
      {
        title: '8. הזכויות שלך',
        paragraphs: [
          `ניתן לבקש עיון, תיקון או מחיקה של מידע אישי, ולחזור בך מהסכמה בכל עת. אפשר לכתוב לכתובת ${EMAIL} והבקשה תטופל.`,
        ],
      },
      {
        title: '9. מי מפעיל את האתר',
        paragraphs: [
          'האתר מופעל על ידי אלעד סעדון. המדיניות הזו עשויה להתעדכן; התאריך שלמעלה מציין את מועד השינוי האחרון.',
        ],
      },
    ],
    back: 'חזרה לדף הבית',
    pageTitle: 'מדיניות פרטיות | אלעד סעדון',
  },
  en: {
    title: 'Privacy Policy',
    intro:
      'This site is a personal portfolio. It collects as little as possible, and this page describes exactly what that is.',
    updated: 'Last updated: 4 August 2026',
    sections: [
      {
        title: '1. Information collected',
        paragraphs: [
          'Only what you submit yourself, plus the page you sent it from. The contact form asks for your name, email address and message, and records which page of this site the form was submitted from, so the enquiry can be answered in context. The chat widget receives whatever you type into it. Nothing else about you is collected: there is no account, no profile and no newsletter, and the site does not record how you reached it.',
        ],
      },
      {
        title: '2. How it is used',
        paragraphs: [
          'Your details are used solely to read and answer your enquiry. They are never sold, rented or shared for commercial purposes, and they are not used for advertising. The legal basis is the legitimate interest in answering an enquiry you chose to send, and, where consent applies, consent you can withdraw at any time.',
        ],
      },
      {
        title: '3. Where it is stored',
        paragraphs: [
          'Contact form submissions are stored in a PostgreSQL database hosted by Neon in the eu-central-1 (Frankfurt) region, and are transmitted over an encrypted connection. They are kept for as long as needed to handle the enquiry and any work that follows from it, and in any case no longer than 24 months, after which they are deleted. You can ask for them to be deleted sooner at any time.',
        ],
      },
      {
        title: '4. Cookies',
        paragraphs: ['Only functional cookies, and only two of them:'],
        bullets: [
          'locale - the language you chose, so the correct language is served on the first load.',
          'viewMode - whether you chose the interactive view or the plain one.',
        ],
        footnote:
          'Neither carries an identifier, and neither can be used to recognise you elsewhere. There are no advertising cookies and no cross-site tracking cookies of any kind. Your browser also keeps your display and accessibility settings locally on your own device; those never leave it.',
      },
      {
        title: '5. Analytics',
        paragraphs: [
          'Visits are measured with Vercel Analytics and Vercel Speed Insights. Both are cookieless and aggregate: they report page counts and loading performance, not individuals.',
        ],
      },
      {
        title: '6. The chat widget',
        paragraphs: [
          'Messages you type are sent to an AI provider so that a reply can be generated. That provider is currently Moonshot AI (Kimi); on any deployment of this site configured without a Kimi key, Google Gemini is used instead. Conversations are not stored on this site. To keep the widget from being abused, requests are rate limited.',
        ],
      },
      {
        title: '7. Who else processes data',
        paragraphs: [],
        bullets: [
          'Vercel - hosting and cookieless analytics',
          'Neon - database hosting',
          'Moonshot AI and Google - chat replies only',
        ],
        footnote:
          'A one-way hash of your IP address is stored briefly, solely to rate limit abuse; the address itself is never stored, and the hash cannot be reversed or used to identify you. It is not kept alongside your message, and it is deleted once the rate-limiting window has passed. Your IP address itself is used only in transit, for security.',
      },
      {
        title: '8. Your rights',
        paragraphs: [
          `You can ask to see, correct or delete any personal data held about you, and you can withdraw consent at any time. Write to ${EMAIL} and it will be handled.`,
        ],
      },
      {
        title: '9. Who operates this site',
        paragraphs: [
          'This site is operated by Elad Saadon. This policy may be updated; the date above shows the last change.',
        ],
      },
    ],
    back: 'Back to Home',
    pageTitle: 'Privacy Policy | Elad Saadon',
  },
  ru: {
    title: 'Политика конфиденциальности',
    intro:
      'Этот сайт — личное портфолио. Он собирает минимум данных, и эта страница описывает, что именно.',
    updated: 'Последнее обновление: 4 августа 2026',
    sections: [
      {
        title: '1. Какие данные собираются',
        paragraphs: [
          'Только то, что вы отправляете сами, плюс страница, с которой вы это отправили. Форма обратной связи запрашивает имя, адрес электронной почты и сообщение, а также фиксирует, с какой страницы сайта форма была отправлена, чтобы ответить в нужном контексте. Виджет чата получает то, что вы в нём пишете. Никакие другие данные о вас не собираются: здесь нет аккаунтов, профилей и рассылок, и сайт не фиксирует, каким образом вы на него попали.',
        ],
      },
      {
        title: '2. Как данные используются',
        paragraphs: [
          'Ваши данные используются исключительно для того, чтобы прочитать запрос и ответить на него. Они не продаются, не сдаются в аренду и не передаются в коммерческих целях, а также не используются для рекламы. Правовое основание — законный интерес в ответе на запрос, который вы отправили сами, а там, где требуется согласие, — согласие, которое вы можете отозвать в любой момент.',
        ],
      },
      {
        title: '3. Где данные хранятся',
        paragraphs: [
          'Сообщения из формы обратной связи хранятся в базе данных PostgreSQL, размещённой в Neon в регионе eu-central-1 (Frankfurt); передача выполняется по зашифрованному соединению. Они хранятся столько, сколько нужно для обработки запроса и последующей работы, но в любом случае не дольше 24 месяцев, после чего удаляются. Вы можете в любой момент попросить удалить их раньше.',
        ],
      },
      {
        title: '4. Файлы cookie',
        paragraphs: ['Только функциональные — и всего два:'],
        bullets: [
          'locale — выбранный язык, чтобы страница сразу открывалась на нужном языке.',
          'viewMode — выбран ли интерактивный режим или обычный.',
        ],
        footnote:
          'Ни один из них не содержит идентификатора и не позволяет узнать вас на других сайтах. Рекламных cookie и межсайтового отслеживания нет вообще. Настройки отображения и доступности браузер хранит локально на вашем устройстве — они никуда не отправляются.',
      },
      {
        title: '5. Аналитика',
        paragraphs: [
          'Посещения измеряются с помощью Vercel Analytics и Vercel Speed Insights. Оба работают без cookie и в агрегированном виде: они показывают количество просмотров и скорость загрузки, а не отдельных людей.',
        ],
      },
      {
        title: '6. Виджет чата',
        paragraphs: [
          'Сообщения отправляются провайдеру ИИ для формирования ответа. Сейчас это Moonshot AI (Kimi); на любой копии сайта, развёрнутой без ключа Kimi, вместо него используется Google Gemini. Переписка на этом сайте не сохраняется. Чтобы виджетом не злоупотребляли, запросы ограничиваются по частоте.',
        ],
      },
      {
        title: '7. Кто ещё обрабатывает данные',
        paragraphs: [],
        bullets: [
          'Vercel — хостинг и аналитика без cookie',
          'Neon — хостинг базы данных',
          'Moonshot AI и Google — только формирование ответов в чате',
        ],
        footnote:
          'Односторонний хеш вашего IP-адреса хранится кратковременно, исключительно для ограничения частоты запросов и защиты от злоупотреблений; сам адрес не сохраняется никогда, а хеш нельзя обратить или использовать для вашей идентификации. Он не хранится вместе с сообщением и удаляется по истечении окна ограничения частоты. Сам IP-адрес используется только при передаче, в целях безопасности.',
      },
      {
        title: '8. Ваши права',
        paragraphs: [
          `Вы можете запросить доступ, исправление или удаление персональных данных и в любой момент отозвать согласие. Напишите на ${EMAIL} — запрос будет обработан.`,
        ],
      },
      {
        title: '9. Кто управляет сайтом',
        paragraphs: [
          'Сайтом управляет Элад Саадон. Политика может обновляться; дата выше указывает на последнее изменение.',
        ],
      },
    ],
    back: 'Вернуться на главную',
    pageTitle: 'Политика конфиденциальности | Elad Saadon',
  },
};

/** The address appears inside running text in section 8; keep it clickable there. */
function withEmailLink(text: string) {
  const parts = text.split(EMAIL);
  if (parts.length === 1) return text;

  return parts.flatMap((part, i) =>
    i === parts.length - 1
      ? [part]
      : [
          part,
          <a
            key={i}
            href={`mailto:${EMAIL}`}
            className="text-[var(--color-accent)] hover:underline"
          >
            {EMAIL}
          </a>,
        ]
  );
}

export default function PrivacyContent() {
  const { locale } = useI18n();
  const copy = content[locale];
  const homeHref = locale === 'he' ? '/' : `/${locale}`;

  useEffect(() => {
    document.title = copy.pageTitle;
  }, [copy.pageTitle]);

  return (
    <div className="mx-auto max-w-[800px] px-6 py-32">
      <h1 className="mb-4 text-3xl font-semibold text-[var(--color-text-primary)]">{copy.title}</h1>
      <div className="prose prose-invert prose-sm max-w-none space-y-4 text-[var(--color-text-secondary)]">
        <p>{copy.intro}</p>
        <p className="text-sm opacity-70">{copy.updated}</p>

        {copy.sections.map((section) => (
          <section key={section.title}>
            <h2 className="mt-8 mb-2 text-xl font-medium text-[var(--color-text-primary)]">
              {section.title}
            </h2>
            {section.paragraphs.map((text) => (
              <p key={text}>{withEmailLink(text)}</p>
            ))}
            {section.bullets && (
              <ul className="my-2 list-disc space-y-1 ps-6">
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {section.footnote && <p>{section.footnote}</p>}
          </section>
        ))}
      </div>
      <div className="mt-12">
        <Link href={homeHref} className="text-sm text-[var(--color-accent)] hover:underline">
          {copy.back}
        </Link>
      </div>
    </div>
  );
}
