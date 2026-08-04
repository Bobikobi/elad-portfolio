# Privacy policy rewrite - DRAFT FOR APPROVAL

**This is a proposal, not live text.** The live page is
`src/app/privacy/PrivacyContent.tsx`, still carrying the false Supabase claim.

Status: **APPROVED - FINAL.** The three corrections were applied (attribution in section 1,
IP-hash storage in section 7, literal provider naming in section 6), as were two
recommended additions (24-month retention, controller + update notice) and, on the owner's
optional suggestion, a legal-basis sentence in section 2. Both earlier blanks were filled
by the owner's rulings (region eu-central-1, Turnstile and Upstash dropped). It ships WITH
M1, never before - see Sequencing.

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

## Binding constraints this text places on the code

The text is now precise enough that two implementation choices are no longer free. If the
code does something else, the page becomes false on the day it ships - the exact failure
mode this rewrite exists to correct.

1. **The rate-limit IP hash must live in its own short-lived table, pruned to the
   rate-limit window - NOT as an `ip_hash` column on the `leads` row.** Section 7 says the
   hash is stored *briefly* and *not alongside your message*. On the lead row it would
   survive for the full 24-month retention and sit literally beside the message, making
   both clauses false.
2. **That hash must be salted from a server-only secret** (the `sha256(ip|ua|day|SALT)`
   pattern M2 already specifies). IPv4 is a 2^32 space, so an unsalted SHA-256 of an IP is
   brute-forceable in seconds and is not anonymisation. Section 7 claims the hash "cannot
   be reversed"; unsalted, that claim is simply untrue.
3. **The 24-month deletion must be enforced by a mechanism, not by intention** (owner
   ruling, ships in M1). Section 3 states leads are deleted after 24 months and section 7
   states the IP hash is deleted once the rate-limit window has passed. Neither is true
   unless something actually deletes them. Two layers, both in M1: a daily Vercel Cron on a
   `CRON_SECRET`-protected route, plus an opportunistic prune on insert so the promise
   survives the cron being disabled. Spec and acceptance criteria live in
   `plans/admin-seo-leads-plan.md` M1.

## Mandatory amendment gates - the text expires unless these are honoured

Section 1 now makes two positive commitments that are true at M1 and become FALSE later.
Each must be amended **in the same PR** as the milestone that breaks it, never after.

| Gate | What breaks | Required amendment |
|---|---|---|
| **M2** | `pageviews` stores `path`, `referrer_host` and a daily `visitor_hash` per visitor - first-party data ABOUT the visitor, on our own DB. Breaks "nothing else about you is collected" (s1) and makes s5 incomplete, since s5 names only cookieless Vercel Analytics. | Extend s5 with the first-party cookieless measurement and its daily-rotating, salted visitor hash; relax s1's absolute. The plan already flags this at `plans/admin-seo-leads-plan.md:108`. |
| **M5** | `first_touch_path`, `referrer_host`, `utm_*` get populated from `sessionStorage` via `src/lib/attribution.ts`. Breaks "the site does not record how you reached it" (s1). | Replace that clause with "and, where present, how you reached the site - referrer and campaign tags". |

**Why the M5 fields are excluded now rather than pre-announced:** they are columns in the
M1 schema but stay NULL until `src/lib/attribution.ts` exists, which is an M5 file.
Describing collection that is not happening is the same fault as hiding collection that
is - it was the reason Turnstile and Upstash were deleted rather than hedged (ruling 4).

**Why `source_path` IS disclosed now:** M1 cannot work without it. The schema derives
`interest` from the source page and `source_form` distinguishes contact/chat/service_page
(`plans/admin-seo-leads-plan.md:81-83`), so the page a visitor submitted from is recorded
from day one. It is data about the visitor, not submitted by them, so section 1 says so.

---

# English

**Privacy Policy**

This site is a personal portfolio. It collects as little as possible, and this page
describes exactly what that is. Last updated: `<SET ON THE DAY IT SHIPS>`.

**1. Information collected**
Only what you submit yourself, plus the page you sent it from. The contact form asks for
your name, email address and message, and records which page of this site the form was
submitted from, so the enquiry can be answered in context. The chat widget receives
whatever you type into it. Nothing else about you is collected: there is no account, no
profile and no newsletter, and the site does not record how you reached it.

**2. How it is used**
Your details are used solely to read and answer your enquiry. They are never sold, rented
or shared for commercial purposes, and they are not used for advertising. The legal basis
is the legitimate interest in answering an enquiry you chose to send, and, where consent
applies, consent you can withdraw at any time.

**3. Where it is stored**
Contact form submissions are stored in a PostgreSQL database hosted by Neon in the
eu-central-1 (Frankfurt) region, and are transmitted over an encrypted connection. They
are kept for as long as needed to handle the enquiry and any work that follows from it,
and in any case no longer than 24 months, after which they are deleted. You can ask for
them to be deleted sooner at any time.

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
Messages you type are sent to an AI provider so that a reply can be generated. That
provider is currently Moonshot AI (Kimi); on any deployment of this site configured
without a Kimi key, Google Gemini is used instead. Conversations are not stored on this
site. To keep the widget from being abused, requests are rate limited.

**7. Who else processes data**
- Vercel - hosting and cookieless analytics
- Neon - database hosting
- Moonshot AI and Google - chat replies only

A one-way hash of your IP address is stored briefly, solely to rate limit abuse; the
address itself is never stored, and the hash cannot be reversed or used to identify you.
It is not kept alongside your message, and it is deleted once the rate-limiting window has
passed. Your IP address itself is used only in transit, for security.

**8. Your rights**
You can ask to see, correct or delete any personal data held about you, and you can
withdraw consent at any time. Write to eladeladsaa@gmail.com and it will be handled.

**9. Who operates this site**
This site is operated by Elad Saadon. This policy may be updated; the date above shows the
last change.

---

# עברית

**מדיניות פרטיות**

האתר הזה הוא תיק עבודות אישי. הוא אוסף כמה שפחות, והעמוד הזה מתאר בדיוק מה. עודכן
לאחרונה: `<SET ON THE DAY IT SHIPS>`.

**1. איזה מידע נאסף**
רק מה שנמסר ביוזמתך, בתוספת הדף שממנו נשלחה הפנייה. טופס יצירת הקשר מבקש שם, כתובת אימייל
והודעה, ומתעד מאיזה דף באתר נשלח הטופס, כדי שניתן יהיה להשיב בהקשר הנכון. ווידג'ט הצ'אט
מקבל את מה שנכתב בו. שום מידע אחר עליך אינו נאסף: אין באתר חשבון, פרופיל או רשימת דיוור,
והאתר אינו מתעד כיצד הגעת אליו.

**2. איך המידע משמש**
הפרטים משמשים אך ורק לקריאת הפנייה ולמענה עליה. הם לא נמכרים, לא מושכרים ולא משותפים
למטרות מסחריות, ולא נעשה בהם שימוש לפרסום. הבסיס החוקי לעיבוד הוא האינטרס הלגיטימי במענה
לפנייה שנשלחה ביוזמתך, ובמקרים שבהם נדרשת הסכמה - הסכמה שניתן לחזור ממנה בכל עת.

**3. היכן המידע נשמר**
פניות מטופס יצירת הקשר נשמרות במסד נתונים PostgreSQL המתארח אצל Neon באזור eu-central-1 (Frankfurt),
והעברת המידע מתבצעת בחיבור מוצפן. הן נשמרות למשך הזמן הדרוש לטיפול בפנייה ובעבודה
שנובעת ממנה, ובכל מקרה לא יותר מ-24 חודשים, ולאחר מכן הן נמחקות. ניתן לבקש את מחיקתן
מוקדם יותר בכל עת.

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
הודעות שנכתבות בצ'אט נשלחות לספק בינה מלאכותית כדי לייצר תשובה. כרגע הספק הוא
Moonshot AI (Kimi); בכל פריסה של האתר שאינה מוגדרת עם מפתח Kimi נעשה שימוש
ב-Google Gemini במקום. השיחות אינן נשמרות באתר הזה. כדי למנוע ניצול לרעה, הבקשות מוגבלות
בקצב.

**7. מי עוד מעבד מידע**
- Vercel - אחסון האתר ומדידה ללא עוגיות
- Neon - אחסון מסד הנתונים
- Moonshot AI ו-Google - יצירת תשובות בצ'אט בלבד

גיבוב (hash) חד-כיווני של כתובת ה-IP שלך נשמר לזמן קצר, אך ורק לצורך הגבלת קצב ומניעת
ניצול לרעה. הכתובת עצמה אינה נשמרת כלל, והגיבוב אינו ניתן להיפוך ואינו מאפשר לזהות אותך.
הוא אינו נשמר לצד ההודעה, והוא נמחק בתום חלון הגבלת הקצב. כתובת ה-IP עצמה משמשת רק בזמן
ההעברה, לצורכי אבטחה.

**8. הזכויות שלך**
ניתן לבקש עיון, תיקון או מחיקה של מידע אישי, ולחזור בך מהסכמה בכל עת. אפשר לכתוב לכתובת
eladeladsaa@gmail.com והבקשה תטופל.

**9. מי מפעיל את האתר**
האתר מופעל על ידי אלעד סעדון. המדיניות הזו עשויה להתעדכן; התאריך שלמעלה מציין את מועד
השינוי האחרון.

---

# Русский

**Политика конфиденциальности**

Этот сайт — личное портфолио. Он собирает минимум данных, и эта страница описывает, что
именно. Последнее обновление: `<SET ON THE DAY IT SHIPS>`.

**1. Какие данные собираются**
Только то, что вы отправляете сами, плюс страница, с которой вы это отправили. Форма
обратной связи запрашивает имя, адрес электронной почты и сообщение, а также фиксирует, с
какой страницы сайта форма была отправлена, чтобы ответить в нужном контексте. Виджет
чата получает то, что вы в нём пишете. Никакие другие данные о вас не собираются: здесь
нет аккаунтов, профилей и рассылок, и сайт не фиксирует, каким образом вы на него попали.

**2. Как данные используются**
Ваши данные используются исключительно для того, чтобы прочитать запрос и ответить на
него. Они не продаются, не сдаются в аренду и не передаются в коммерческих целях, а также
не используются для рекламы. Правовое основание — законный интерес в ответе на запрос,
который вы отправили сами, а там, где требуется согласие, — согласие, которое вы можете
отозвать в любой момент.

**3. Где данные хранятся**
Сообщения из формы обратной связи хранятся в базе данных PostgreSQL, размещённой в Neon в
регионе eu-central-1 (Frankfurt); передача выполняется по зашифрованному соединению. Они
хранятся столько, сколько нужно для обработки запроса и последующей работы, но в любом
случае не дольше 24 месяцев, после чего удаляются. Вы можете в любой момент попросить
удалить их раньше.

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
Сообщения отправляются провайдеру ИИ для формирования ответа. Сейчас это Moonshot AI
(Kimi); на любой копии сайта, развёрнутой без ключа Kimi, вместо него используется Google
Gemini. Переписка на этом сайте не сохраняется. Чтобы виджетом не злоупотребляли, запросы
ограничиваются по частоте.

**7. Кто ещё обрабатывает данные**
- Vercel — хостинг и аналитика без cookie
- Neon — хостинг базы данных
- Moonshot AI и Google — только формирование ответов в чате

Односторонний хеш вашего IP-адреса хранится кратковременно, исключительно для ограничения
частоты запросов и защиты от злоупотреблений; сам адрес не сохраняется никогда, а хеш
нельзя обратить или использовать для вашей идентификации. Он не хранится вместе с
сообщением и удаляется по истечении окна ограничения частоты. Сам IP-адрес используется
только при передаче, в целях безопасности.

**8. Ваши права**
Вы можете запросить доступ, исправление или удаление персональных данных и в любой момент
отозвать согласие. Напишите на eladeladsaa@gmail.com — запрос будет обработан.

**9. Кто управляет сайтом**
Сайтом управляет Элад Саадон. Политика может обновляться; дата выше указывает на
последнее изменение.

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
`operatorTitle/Text`, `updatedLabel`) rather than only edited strings. The component
already renders a per-locale content object, so the shape does not change - only its size.

## Loose ends found while checking the facts

1. ~~**Dead Google Analytics wiring.**~~ **RESOLVED.** The googletagmanager and
   google-analytics hosts are gone from the CSP, verified externally in the response
   headers; `next.config.ts:6` now carries an explicit comment recording that Google
   Analytics is not wired into the app at all.
2. `src/app/accessibility` makes a WCAG 2.1 AA conformance claim that has not been
   verified in this session. Not touched, but it is the same class of problem as the
   Supabase line: a factual claim in a legal-ish page that nobody has checked.
