# Privacy policy rewrite - DRAFT FOR APPROVAL

**This is a proposal, not live text.** The live page is
`src/app/privacy/PrivacyContent.tsx`, still carrying the false Supabase claim.

Status: text approved in substance by the owner; both blanks now filled by their rulings
(region eu-central-1, Turnstile and Upstash dropped). It ships WITH M1, never before -
see Sequencing.

Conventions applied: hyphens only in Hebrew and English; Russian keeps its normal
punctuation, including the em-dash.

## What is actually true, established by reading the code

Everything below was verified in the source, not assumed - the current page's biggest
problem is that it describes a system that does not exist.

| Claim | Reality | Where |
|---|---|---|
| Contact messages stored in Supabase | **False.** No database exists. The form has no endpoint and returns `unconfigured` in production | `src/app/actions/contact.ts` |
| (after M1) | Neon Postgres | plan M1 |
| Cookies | `locale` and `viewMode`, both functional | `lib/localePref.ts`, `lib/viewMode.ts` |
| Local browser storage | `locale`, `viewMode` mirrors, plus `a11y-settings` | `AccessibilityWidget.tsx:97` |
| Analytics | Vercel Analytics + Speed Insights, cookieless | `layout.tsx` |
| Google Analytics | **Not wired in.** `NEXT_PUBLIC_GA_ID` is a dead env var and the CSP still allows googletagmanager for nothing | see "loose ends" |
| Chat model | Kimi (Moonshot AI) primary, Google Gemini fallback | `api/chat/route.ts:278,322` |
| Chat storage | Nothing is stored today | M6 would change this |
| Anti-abuse | IP-based rate limiting. Cloudflare Turnstile and Upstash Redis exist in the code but are env-gated and **will not be live at launch** (ruling 4), so neither is described | `api/chat/route.ts:172,235` |

## Blanks, now filled by the owner

1. **Neon region: `eu-central-1` (Frankfurt).** Vercel functions are pinned to `fra1` in
   `vercel.json` to match, so an EU function queries an EU database and the data stays in
   the EU. They were serving from `iad1` (US East).
2. **Turnstile and Upstash are NOT live at launch** (ruling 4). Both mentions are deleted
   rather than hedged: the honeypot plus the DB-backed rate limit are what will actually
   be running, and a privacy page must not describe services that are switched off.

The only remaining placeholder is the "last updated" date, which is set on the day it
ships.

**Sequencing:** section 3 describes database storage, which is only true once M1 ships.
This text must land WITH M1 or after it - never before, or it describes something that is
not live, which is the exact fault being corrected.

---

# English

**Privacy Policy**

This site is a personal portfolio. It collects as little as possible, and this page
describes exactly what that is. Last updated: `<SET ON THE DAY IT SHIPS>`.

**1. Information collected**
Only what you submit yourself. The contact form asks for your name, email address and
message. The chat widget receives whatever you type into it. Nothing else about you is
requested, and there is no account, no profile and no newsletter.

**2. How it is used**
Your details are used solely to read and answer your enquiry. They are never sold, rented
or shared for commercial purposes, and they are not used for advertising.

**3. Where it is stored**
Contact form submissions are stored in a PostgreSQL database hosted by Neon in the
eu-central-1 (Frankfurt) region, and are transmitted over an encrypted connection. They are kept for as
long as needed to handle the enquiry and any work that follows from it, and you can ask
for them to be deleted at any time.

**4. Cookies**
Only functional cookies, and only two of them:
- `locale` - the language you chose, so the correct language is served on the first load.
- `viewMode` - whether you chose the interactive view or the plain one.

Neither carries an identifier, and neither can be used to recognise you elsewhere. There
are no advertising cookies and no cross-site tracking cookies of any kind. Your browser
also keeps your display and accessibility settings locally on your own device; those never
leave it.

**5. Analytics**
Visits are measured with Vercel Analytics and Vercel Speed Insights. Both are cookieless
and aggregate: they report page counts and loading performance, not individuals.

**6. The chat widget**
Messages you type are sent to an AI provider so that a reply can be generated - currently
Moonshot AI (Kimi), with Google Gemini as a fallback. Conversations are not stored on this
site. To keep the widget from being abused, requests are rate limited.

**7. Who else processes data**
- Vercel - hosting and cookieless analytics
- Neon - database hosting
- Moonshot AI and Google - chat replies only

Your IP address is processed transiently for security and rate limiting. It is not stored
alongside your message and is not used to profile you.

**8. Your rights**
You can ask to see, correct or delete any personal data held about you, and you can
withdraw consent at any time. Write to eladeladsaa@gmail.com and it will be handled.

---

# עברית

**מדיניות פרטיות**

האתר הזה הוא תיק עבודות אישי. הוא אוסף כמה שפחות, והעמוד הזה מתאר בדיוק מה. עודכן
לאחרונה: `<SET ON THE DAY IT SHIPS>`.

**1. איזה מידע נאסף**
רק מה שנמסר ביוזמתך. טופס יצירת הקשר מבקש שם, כתובת אימייל והודעה. ווידג'ט הצ'אט מקבל את
מה שנכתב בו. שום מידע אחר עליך אינו נאסף, ואין באתר חשבון, פרופיל או רשימת דיוור.

**2. איך המידע משמש**
הפרטים משמשים אך ורק לקריאת הפנייה ולמענה עליה. הם לא נמכרים, לא מושכרים ולא משותפים
למטרות מסחריות, ולא נעשה בהם שימוש לפרסום.

**3. היכן המידע נשמר**
פניות מטופס יצירת הקשר נשמרות במסד נתונים PostgreSQL המתארח אצל Neon באזור eu-central-1 (Frankfurt),
והעברת המידע מתבצעת בחיבור מוצפן. הן נשמרות למשך הזמן הדרוש לטיפול בפנייה ובעבודה
שנובעת ממנה, וניתן לבקש את מחיקתן בכל עת.

**4. עוגיות**
רק עוגיות פונקציונליות, ורק שתיים:
- `locale` - השפה שנבחרה, כדי שהעמוד ייטען מיד בשפה הנכונה.
- `viewMode` - האם נבחרה התצוגה האינטראקטיבית או הפשוטה.

אף אחת מהן אינה נושאת מזהה, ואף אחת אינה מאפשרת לזהות אותך באתרים אחרים. אין עוגיות
פרסום ואין עוגיות מעקב חוצות-אתרים מכל סוג. הדפדפן שומר גם את הגדרות התצוגה והנגישות
שלך על המכשיר שלך בלבד, והן אינן נשלחות לשום מקום.

**5. מדידה ואנליטיקס**
הביקורים נמדדים באמצעות Vercel Analytics ו-Vercel Speed Insights. שניהם פועלים ללא
עוגיות וברמת נתונים מצטברת: הם מדווחים על כמות צפיות וזמני טעינה, לא על אנשים.

**6. ווידג'ט הצ'אט**
הודעות שנכתבות בצ'אט נשלחות לספק בינה מלאכותית כדי לייצר תשובה - כרגע Moonshot AI (Kimi),
עם Google Gemini כגיבוי. השיחות אינן נשמרות באתר הזה. כדי למנוע ניצול לרעה, הבקשות מוגבלות בקצב.

**7. מי עוד מעבד מידע**
- Vercel - אחסון האתר ומדידה ללא עוגיות
- Neon - אחסון מסד הנתונים
- Moonshot AI ו-Google - יצירת תשובות בצ'אט בלבד

כתובת ה-IP שלך מעובדת באופן זמני לצורכי אבטחה והגבלת קצב. היא אינה נשמרת לצד ההודעה
ואינה משמשת לפרופיל משתמש.

**8. הזכויות שלך**
ניתן לבקש עיון, תיקון או מחיקה של מידע אישי, ולחזור בך מהסכמה בכל עת. אפשר לכתוב לכתובת
eladeladsaa@gmail.com והבקשה תטופל.

---

# Русский

**Политика конфиденциальности**

Этот сайт — личное портфолио. Он собирает минимум данных, и эта страница описывает, что
именно. Последнее обновление: `<SET ON THE DAY IT SHIPS>`.

**1. Какие данные собираются**
Только то, что вы отправляете сами. Форма обратной связи запрашивает имя, адрес
электронной почты и сообщение. Виджет чата получает то, что вы в нём пишете. Никакие
другие данные о вас не собираются: здесь нет аккаунтов, профилей и рассылок.

**2. Как данные используются**
Ваши данные используются исключительно для того, чтобы прочитать запрос и ответить на
него. Они не продаются, не сдаются в аренду и не передаются в коммерческих целях, а также
не используются для рекламы.

**3. Где данные хранятся**
Сообщения из формы обратной связи хранятся в базе данных PostgreSQL, размещённой в Neon в
регионе eu-central-1 (Frankfurt); передача выполняется по зашифрованному соединению. Они хранятся
столько, сколько нужно для обработки запроса и последующей работы, и вы можете в любой
момент попросить их удалить.

**4. Файлы cookie**
Только функциональные — и всего два:
- `locale` — выбранный язык, чтобы страница сразу открывалась на нужном языке.
- `viewMode` — выбран ли интерактивный режим или обычный.

Ни один из них не содержит идентификатора и не позволяет узнать вас на других сайтах.
Рекламных cookie и межсайтового отслеживания нет вообще. Настройки отображения и
доступности браузер хранит локально на вашем устройстве — они никуда не отправляются.

**5. Аналитика**
Посещения измеряются с помощью Vercel Analytics и Vercel Speed Insights. Оба работают без
cookie и в агрегированном виде: они показывают количество просмотров и скорость загрузки,
а не отдельных людей.

**6. Виджет чата**
Сообщения отправляются провайдеру ИИ для формирования ответа — сейчас это Moonshot AI
(Kimi), с Google Gemini в качестве резервного варианта. Переписка на этом сайте не
сохраняется. Чтобы виджетом не злоупотребляли, запросы ограничиваются по частоте.

**7. Кто ещё обрабатывает данные**
- Vercel — хостинг и аналитика без cookie
- Neon — хостинг базы данных
- Moonshot AI и Google — только формирование ответов в чате

Ваш IP-адрес обрабатывается временно, для безопасности и ограничения частоты запросов. Он
не сохраняется вместе с сообщением и не используется для профилирования.

**8. Ваши права**
Вы можете запросить доступ, исправление или удаление персональных данных и в любой момент
отозвать согласие. Напишите на eladeladsaa@gmail.com — запрос будет обработан.

---

## Where this is also disclosed

Section 6 is not the only place the AI processing is stated. Ruling 6 put a one-line
notice inside the chat widget itself, above the input:

| locale | string |
|---|---|
| en | Messages are processed by an AI provider to generate replies. |
| he | ההודעות מעובדות אצל ספק בינה מלאכותית כדי לייצר תשובה. |
| ru | Сообщения обрабатываются провайдером ИИ для формирования ответа. |

Disclosure at the point of use rather than only in a legal page: whatever someone types
leaves for a third-party model, and they should be able to know that before typing it
rather than by going looking.

## Implementation note

This is more sections than the page currently has, so `PrivacyContent.tsx` needs new keys
(`cookiesTitle/Text`, `analyticsTitle/Text`, `chatTitle/Text`, `processorsTitle/Text`,
`updatedLabel`) rather than only edited strings. The component already renders a
per-locale content object, so the shape does not change - only its size.

## Loose ends found while checking the facts

1. **Dead Google Analytics wiring.** `NEXT_PUBLIC_GA_ID` sits in `.env.example` and the
   CSP allows `https://www.googletagmanager.com` in `script-src` and
   `google-analytics.com` in `connect-src`, but nothing in `src/` references any of it.
   The privacy claim "no tracking cookies" is therefore true - but the CSP is wider than
   the site needs, which is a small security cost for nothing. Worth removing.
2. `src/app/accessibility` makes a WCAG 2.1 AA conformance claim that has not been
   verified in this session. Not touched, but it is the same class of problem as the
   Supabase line: a factual claim in a legal-ish page that nobody has checked.
