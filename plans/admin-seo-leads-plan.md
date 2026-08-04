# אזור אישי — SEO ומעקב לידים ל-eladsaadon.dev

תוכנית יישום. המודל: האזור האישי של `yaar-ad.org.il` (`/admin`), מותאם למה שכבר קיים כאן ולעובדה שהריפו הזה **ציבורי**.

---

## 1. מצב פתיחה

### מה כבר קיים באתר

| נכס | סטטוס | קובץ |
|---|---|---|
| `proxy.ts` (middleware של Next 16) | ✅ קיים — redirect apex→www + `x-locale` | [src/proxy.ts](src/proxy.ts) |
| sitemap מחולל אוטומטית + hreflang | ✅ | [src/app/sitemap.ts](src/app/sitemap.ts) |
| robots | ✅ | [src/app/robots.ts](src/app/robots.ts) |
| JSON-LD (Person/Org/Article/FAQ/Breadcrumb) | ✅ | layout + guides + services |
| llms.txt / llms-full.txt | ✅ | [src/app/llms.txt](src/app/llms.txt) |
| Vercel Analytics + Speed Insights | ✅ | [src/app/layout.tsx:350](src/app/layout.tsx#L350) |
| אימות Bing | ✅ | [public/BingSiteAuth.xml](public/BingSiteAuth.xml) |
| 6 מדריכים + 13 דפי שירות ב-3 שפות | ✅ | `src/app/guides`, `src/app/{he,ru}/services` |
| טופס יצירת קשר | ⚠️ שולח ל-`CONTACT_ENDPOINT` שלא מוגדר | [src/app/actions/contact.ts:41](src/app/actions/contact.ts#L41) |
| ווידג'ט צ'אט AI | ✅ אבל לא נשמר כלום | [src/app/api/chat/route.ts](src/app/api/chat/route.ts) |
| בסיס נתונים | ❌ אין | — |
| אזור אישי | ❌ אין | — |
| Google Search Console | ❌ לא אומת (שלב 6 ב-[plans/seo-geo-improvement-plan.md](plans/seo-geo-improvement-plan.md)) | — |

### הפער האמיתי

**כרגע אין לך שום דרך לדעת מי פנה, מאיפה הוא הגיע, ומאיזה מדריך.** הטופס נופל ל-`unconfigured` בפרודקשן, והצ'אט — שהוא מנוע הלידים החזק ביותר באתר — לא משאיר עקבות. זו הבעיה שהתוכנית פותרת; פאנל ה-SEO הוא השכבה השנייה.

---

## 2. החלטות ארכיטקטורה

| נושא | החלטה | למה לא כמו ביער עד |
|---|---|---|
| DB | **Neon Postgres** דרך Vercel Marketplace | יער עד משתמש ב-`pg` + `Pool`. כאן `@neondatabase/serverless` — דרייבר HTTP, בלי pool, מתאים ל-Fluid Compute |
| Auth | HTTP Basic ב-`proxy.ts` | זהה ליער עד. מספיק למשתמש יחיד; ראה "החלטות פתוחות" |
| מיקום | `/admin` (ללא prefix שפה) | `localeForPath` מחזיר `null` ל-`/admin` → `'en'`. צריך לעקוף במפורש |
| נתוני SEO | Google Search Console API + Bing Webmaster API | זהה |
| אנליטיקס | טבלת `pageviews` עצמאית, ללא עוגיות | Vercel Analytics לא נותן API לשליפה — בלי טבלה משלך אין פאנל |
| ייחוס | UTM + referrer נשמרים בליד | יער עד עושה זאת. כאן זה **העיקר** — לקשור מדריך → ליד |

---

## 3. תוכנית הבנייה

### שלב 0 — תשתית (חסם לכל השאר)

סטטוס 2026-08-04: **חלקית.** ה-CLI מותקן (58.4.4) והפרויקט מקושר (`bobikobis-projects` / `elad-portfolio`). Neon חובר — אבל דרך חשבון Vercel שגוי, ולכן `DATABASE_URL` טרם אומת. ראה "חסם פתוח" למטה.

1. ~~התקנת Vercel CLI~~ ✅ `vercel 58.4.4`. **אין credentials מקומיים** — `vercel whoami` פותח device-login. חייב `vercel login` ידני של הבעלים, בחשבון הנכון.
2. `vercel link` ✅ (`.vercel/project.json`: `team_QnwoArVgWTT3HNfv41Rt8oPc` / `prj_yBdre0rqnnOmPb7XdeVM6vjJ1RbM`) → `vercel integration add neon` — **צריך חזרה**, ראה החסם.
3. `pnpm add @neondatabase/serverless`
4. `vercel env pull .env.local --yes`
5. עדכון `.env.example` בשמות (בלי ערכים) + הוספת `/admin` ל-`disallow` ב-`robots.ts`.

**חסם פתוח — Neon חובר בחשבון הלא נכון.** אינטגרציה שנוספת בחשבון/טים אחר לא מזריקה `DATABASE_URL` לפרויקט הזה, וגם אם ידחפו מחרוזת חיבור ידנית — מסד הנתונים יישב תחת חשבון שאינו הבעלים של האתר. הרצף הנכון: להסיר את החיבור מהחשבון השגוי, להתחבר כ-`bobikobis-projects`, ולהוסיף את Neon **מתוך הפרויקט `elad-portfolio`** דרך ה-Marketplace (לא `vercel env add` ידני — רק אינטגרציה מזריקה אוטומטית לשלוש הסביבות).

**שער חובה לפני מיזוג M1:** `vercel env ls` מראה `DATABASE_URL` גם ב-Preview וגם ב-Production, וה-host במחרוזת מכיל `eu-central-1`. אזור אחר = סעיף 3 בדף הפרטיות שקרי, והפונקציות מוצמדות ל-`fra1` לחינם.

**קבצים:** `.env.example`, [src/app/robots.ts](src/app/robots.ts), `package.json`

---

### M1 — לכידת לידים ל-DB

**`src/lib/db.ts`** — לקוח Neon עם init עצל (חובה: `neon()` ברמת המודול קורס ב-`next build` כשאין `DATABASE_URL`).

```sql
isDbConfigured()
ensureLeadsTable()     // CREATE TABLE IF NOT EXISTS + ALTER ADD COLUMN IF NOT EXISTS
insertLead()
getLeads(limit)
getLeadStats()
updateLeadManagement(id, {status, notes, markContacted})
```

**סכימת `leads`** (מותאמת לפורטפוליו, לא לעמותה):

| עמודה | טיפוס | הערה |
|---|---|---|
| `id` | SERIAL PK | |
| `name`, `email`, `phone`, `company` | text | `email` NOT NULL |
| `message` | text | |
| `locale` | varchar(5) | he / en / ru |
| `interest` | varchar(50) | `nextjs` / `ai` / `automation` / `growth` / `other` — נגזר מדף המקור |
| `source_form` | varchar(50) | `contact` / `chat` / `service_page` |
| `source_path` | text | הדף שממנו נשלח |
| `referrer_host`, `utm_source`, `utm_medium`, `utm_campaign` | text | ייחוס |
| `first_touch_path` | text | הדף הראשון בביקור (ראה M5) |
| `status` | varchar(30) | `new`/`reviewed`/`contacted`/`quoted`/`won`/`lost` |
| `priority`, `internal_notes`, `last_contacted_at` | | ניהול |
| `consent_at`, `unsubscribed_at`, `created_at` | timestamptz | |

**אין עמודת `ip_hash` על `leads` — בכוונה.** גיבוב ה-IP של הגבלת הקצב יושב בטבלה נפרדת וקצרת-חיים (`rate_limit_hits`), מגובב עם salt מסוד שרת בלבד. שני האילוצים מגיעים מדף הפרטיות: על שורת הליד הגיבוב היה שורד 24 חודשים ויושב פשוטו כמשמעו לצד ההודעה, ושתי הטענות בסעיף 7 היו נעשות שקריות. ראה "Binding constraints" ב-[docs/briefs/privacy-rewrite-draft.md](docs/briefs/privacy-rewrite-draft.md).

**שינוי ב-[src/app/actions/contact.ts](src/app/actions/contact.ts):** אחרי הוולידציה והרייט-לימיט — `insertLead()` **ראשון**, ורק אז `CONTACT_ENDPOINT` (אם מוגדר). ה-DB הוא מקור האמת; ה-webhook נעשה best-effort ולא מפיל את הבקשה. נופל התנאי של `unconfigured` בפרודקשן.

**קבצים:** `src/lib/db.ts` (חדש), [src/app/actions/contact.ts](src/app/actions/contact.ts)

#### M1.2 — אכיפת מחיקה אחרי 24 חודשים (החלטה מחייבת)

דף הפרטיות ([docs/briefs/privacy-rewrite-draft.md](docs/briefs/privacy-rewrite-draft.md)) מתחייב בסעיף 3 שלידים נמחקים אחרי 24 חודשים, ובסעיף 7 שגיבוב ה-IP נמחק בתום חלון הגבלת הקצב. **התחייבות בלי מנגנון היא טקסט שקרי** — בדיוק התקלה שהשכתוב הזה בא לתקן. לכן המנגנון נכנס ב-M1, יחד עם הטקסט שהוא אוכף, ולא אחריו.

שתי שכבות, שתיהן זולות:

1. **Vercel Cron יומי → נתיב מוגן.** `src/app/api/cron/retention/route.ts`:
   - מאמת `Authorization: Bearer $CRON_SECRET` **לפני כל דבר אחר**; כל בקשה אחרת → 401, ללא תופעות לוואי. fail-closed: אין `CRON_SECRET` ב-env → 503.
   - `DELETE FROM leads WHERE created_at < now() - interval '24 months'`
   - `DELETE FROM rate_limit_hits WHERE created_at < now() - interval '<חלון>'` (הטבלה הנפרדת מאילוץ 1 של הבריף — הגיבוב לא יושב על שורת הליד)
   - יומן: **ספירות בלבד** (`{leads_deleted, hashes_pruned, ms}`), אפס תוכן. כך הפעולה ניתנת לביקורת בלי לדלוף את מה שנמחק.
   - `export const dynamic = 'force-dynamic'`, אין קאשינג.
   - הרשמה ב-`vercel.json`: `"crons": [{ "path": "/api/cron/retention", "schedule": "0 3 * * *" }]`. יומי — בתוך מגבלת ה-cron של התוכנית החינמית.
2. **גיזום אופורטוניסטי ב-`insertLead()`** — אותם שני `DELETE` אחרי ההוספה (best-effort, כישלון לא מפיל את שמירת הליד). חגורה ושתי כתפיים: ההבטחה מחזיקה גם אם ה-cron מבוטל אי-פעם.

**קריטריוני קבלה (שניהם, אחרת M1 לא נסגר):**
- שורת בדיקה עם `created_at` שתוארך אחורה מעבר לחלון — נעלמת אחרי הרצת cron אחת.
- קריאה לנתיב ללא ה-header (או עם ערך שגוי) מוחזרת 401 ולא מוחקת דבר.

**קבצים:** `src/app/api/cron/retention/route.ts` (חדש), `src/lib/db.ts`, `vercel.json`

---

### M2 — אנליטיקס עצמאי, ללא עוגיות

טבלת `pageviews` (`path`, `referrer_host`, `visitor_hash`, `created_at`) + `POST /api/pageview`.

עקרונות מיער עד שנשמרים כי הם נכונים:
- `visitor_hash = sha256(ip|ua|day|SALT)` — חד-כיווני, מתאפס יומית, אין PII. `PAGEVIEW_SALT` מה-env; ברירת מחדל = salt אקראי לכל deployment.
- סינון בוטים ב-User-Agent, rate-limit 60/דקה לכל IP.
- **תמיד מחזיר 200** — אנליטיקס לא מפיל טעינת דף.
- מסנן `/admin`, `/api`, `/_next`.

`src/components/PageViewTracker.tsx` — קליינט, שולח על כל שינוי pathname, נטען ב-[layout.tsx](src/app/layout.tsx) ליד `<Analytics />`.

⚠️ **דגל נגישות/פרטיות:** יש דף פרטיות. צריך להוסיף בו פסקה על מדידה ללא עוגיות — אחרת יש פער בין המסמך למציאות.

**קבצים:** `src/app/api/pageview/route.ts`, `src/components/PageViewTracker.tsx`, `src/lib/db.ts`, [src/app/privacy](src/app/privacy)

---

### M3 — האזור האישי עצמו

**Auth — ב-[src/proxy.ts](src/proxy.ts), לפני כל השאר:**

```ts
if (pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/')) {
  return requireAdminAuth(request) ?? NextResponse.next()
}
```

- `ADMIN_USER` + `ADMIN_PASSWORD` מה-env, **fail-closed**: אין סיסמה → 503, לא "פתוח".
- **סיסמה אקראית ארוכה** (`openssl rand -base64 32`) — לא סיסמה שנבחרה ביד (החלטה 1, סעיף 7).
- **הגבלת קצב על ניסיונות כושלים** (החלטה 1, סעיף 7): מעל ~10 כשלונות בחלון לכל גיבוב-IP → 429, דרך טבלת `rate_limit_hits` של M1.2. בלי זה Basic Auth הוא ניחוש סיסמאות ללא עלות.
- השוואה בזמן קבוע (אין `crypto.timingSafeEqual` ב-runtime הזה).
- ה-matcher הקיים כבר תופס `/admin`; צריך להוסיף `/api/admin/:path*` במפורש.

**`src/app/admin/layout.tsx`** — layout נפרד, `robots: { index: false, follow: false }`, RTL, ללא סצנת ה-WebGL (האזור האישי חייב להיות מהיר וכבד-נתונים, לא חוויתי).

**`src/app/admin/page.tsx`** — `export const dynamic = 'force-dynamic'`. סדר הפאנלים:
1. תנועה באתר (M2) — מבקרים / צפיות / עמודים מובילים / מקורות + פילטר 7/28/90 יום
2. ביצועים בגוגל (M4)
3. סטטוס אינדוקס לפי עמוד (M4)
4. לידים — אריחי סטטיסטיקה + טבלה מלאה + עריכת סטטוס/הערות

**`src/app/api/admin/leads/[id]/route.ts`** + `src/components/admin/LeadManagementForm.tsx` — עדכון סטטוס/הערות/"סומן כנוצר קשר".

**עיצוב:** להשתמש ב-`var(--color-*)` הקיימים של האתר (כלל 1 בתוכנית ה-SEO הקיימת), לא בסטיילים inline מקומיים כמו ביער עד.

**קבצים:** `src/app/admin/{layout,page}.tsx`, `src/app/api/admin/leads/[id]/route.ts`, `src/components/admin/*`, [src/proxy.ts](src/proxy.ts)

---

### M4 — פאנל SEO

**`src/lib/gsc.ts`** — `google-auth-library` + Service Account:
- `searchAnalytics/query` → סה"כ קליקים/חשיפות/CTR/מיקום, top queries, top pages, מגמה יומית
- `sitemaps` → כמה עמודים מה-sitemap מאונדקסים + שגיאות
- `urlInspection/index:inspect` → סטטוס אינדוקס לכל עמוד מנוטר
- חלון הזמן מסתיים לפני יומיים (GSC בפיגור 2-3 ימים), `next: { revalidate: 3600 }`

**`src/lib/bing.ts`** — `GetUrlInfo` + `GetUrlSubmissionQuota` עם `BING_WEBMASTER_API_KEY`.

**`MONITORED_PAGES`** — הבית ב-3 שפות, 4 דפי שירות, 6 המדריכים, `/projects`. ~14 URL.

כל פאנל נבנה כך שאם ה-env חסר הוא פשוט **לא מוצג** — האזור האישי חייב לעבוד גם עם DB בלבד.

**קבצים:** `src/lib/gsc.ts`, `src/lib/bing.ts`, `src/app/admin/page.tsx`

---

### M5 — ייחוס: לקשור SEO ← ליד

זה הדבר שיער עד לא עושה במלואו, וכאן הוא שווה הכי הרבה.

1. **First-touch** — בביקור ראשון נשמרים ב-`sessionStorage`: `first_path`, `referrer`, `utm_*`.
2. הטופס והצ'אט שולחים אותם יחד עם הליד.
3. פאנל חדש באזור האישי: **"מאיפה מגיעים לידים"** — פילוח לפי `first_touch_path` ו-`utm_campaign`.

התוצאה: השאלה "האם המדריכים מייצרים עבודה?" מקבלת תשובה מספרית במקום תחושה.

**קבצים:** `src/lib/attribution.ts` (חדש), `src/components/worlds/ContactForm.tsx`, `src/app/actions/contact.ts`

---

### M6 — לידים מהצ'אט

[api/chat/route.ts](src/app/api/chat/route.ts) כבר מנחה מבקרים ל"פנייה לאלעד". נוסיף:
- טבלת `chat_sessions` (session_id, locale, first_seen, messages_count) + `chat_messages`
- כשמופיעה כתובת מייל בשיחה → `insertLead({source_form: 'chat'})`
- פאנל "שיחות" באזור האישי, עם קישור מהליד לשיחה שהולידה אותו

⚠️ **פרטיות:** שמירת תמלילי שיחות היא איסוף מידע. חייב עדכון בדף הפרטיות + שורה בווידג'ט הצ'אט. אפשר להתחיל בגרסה מצומצמת: לשמור **רק** שיחות שהניבו כתובת מייל.

**קבצים:** `src/app/api/chat/route.ts`, `src/lib/db.ts`, `src/app/admin/*`, [src/app/privacy](src/app/privacy)

---

### M7 — התראות: טלגרם בוטל

**החלטת הבעלים (2026-08-04): אין ערוץ טלגרם.** הסקירה נעשית בדשבורד הפרטי (M3), ובוט טלגרם היה מוסיף עוד שירות חיצוני שמקבל את תוכן הליד — בדיוק ההפך מהכיוון של דף הפרטיות, שמונה שלושה מעבדים בלבד.

מה כן נשאר: **נקודת חיבור נקייה.** ב-`insertLead()`, אחרי ההוספה, קריאה יחידה `notifyNewLead(lead)` שהמימוש שלה כרגע no-op מתועד. כך הוספת התראת מייל בעתיד היא שינוי בקובץ אחד ולא ניתוח מחדש של נתיב השמירה. אין תלות, אין env, אין מעבד נוסף בדף הפרטיות.

**טרם הוכרע:** האם להוסיף התראת מייל פשוטה. החלטה של הבעלים. אם וכאשר — היא מוסיפה מעבד לסעיף 7 בדף הפרטיות, ולכן חלה עליה אותה חובת תיקון-באותו-PR כמו שערי M2/M5.

---

## 4. חלק SEO — מה לתקן באתר עצמו

מעבר לדשבורד. ממוין לפי החזר-מאמץ.

### חובה (חוסם את הדשבורד)

**S1 — לאמת את הנכס ב-Google Search Console.** ידני, פעם אחת, ובלעדיו **פאנל ה-SEO ריק**:
1. הוספת נכס `sc-domain:eladsaadon.dev` (Domain property — תופס www ו-apex וגם http/https)
2. אימות ברשומת TXT ב-DNS
3. הגשת `https://www.eladsaadon.dev/sitemap.xml`
4. יצירת Service Account ב-Google Cloud, הפעלת Search Console API, והוספת המייל שלו כמשתמש **Full** בנכס
5. ה-JSON של המפתח → `GSC_SERVICE_ACCOUNT_JSON` ב-Vercel (שורה אחת). **לא לקובץ בריפו** — הריפו ציבורי.

**S2 — מפתח Bing Webmaster API.** האתר כבר מאומת ב-Bing; צריך רק להוציא API key מההגדרות → `BING_WEBMASTER_API_KEY`.

### תיקונים אמיתיים שמצאתי בקוד

**S3 — `robots.ts` חוסם את `/llms.txt` ו-`/llms-full.txt`.**
[src/app/robots.ts:8](src/app/robots.ts#L8) — הקבצים האלה נוצרו כדי ש-LLM-ים יקראו אותם, ואז נאסרו בפני הזוחלים. סתירה. להסיר אותם מ-`disallow`, ולהוסיף במקומם `/admin`.

**S4 — `lastModified: new Date()` על כל ה-sitemap.**
[src/app/sitemap.ts:52](src/app/sitemap.ts#L52) — כל 40+ העמודים מצהירים שהשתנו היום, בכל בנייה. גוגל מזהה את הדפוס ומתעלם מהשדה לגמרי. לתת תאריך אמיתי לכל קבוצה (קבוע במודול, או `git log -1` בזמן בנייה).

**S5 — לא נמדדו Core Web Vitals.** האתר מריץ WebGL כבד בדף הבית. Speed Insights כבר מותקן — לקרוא את המספרים לפני שמניחים שהם ירוקים. אם ה-LCP בבית גרוע, זה גובר בחשיבות על כל השאר בתוכנית הזאת.

### תוכן (מנוע הלידים)

**S6 — המדריכים קיימים בעברית בלבד.** 6 מדריכים על URL לא-מתחילים-בשפה; `localeForPath` מטפל בהם דרך `HEBREW_ONLY_PREFIXES`, אז ה-`lang` נכון. אבל השוק דובר האנגלית לא רואה תוכן בכלל. אחרי M5 תדע אילו מדריכים באמת מייצרים לידים — **לתרגם רק אותם**, לא את כולם.

**S7 — קצב פרסום.** מדריך חדש כל 3-4 שבועות, נבחר לפי ה-queries שיופיעו בפאנל "מונחי חיפוש מובילים" בעמדה 8-20 (שם נמצאת התנועה שקרובה לקפוץ).

**S8 — Backlinks** (שלב 7 בתוכנית הקודמת, עדיין פתוח): GitHub bio, LinkedIn Featured, פוסט על מדריך.

---

## 5. אבטחה ומגבלת הריפו הציבורי

הריפו הזה ציבורי ([PUBLIC_REPO_POLICY.md](PUBLIC_REPO_POLICY.md)), עם `pnpm repo:guard` ב-CI. משמעויות מחייבות:

- **קוד ה-`/admin` יהיה גלוי לכולם.** מקובל — הסוד הוא הסיסמה, לא המבנה. אבל שום ערך אמיתי לא נכנס לקוד: לא סיסמה, לא connection string, לא ה-Service Account JSON.
- `GSC_SERVICE_ACCOUNT_JSON` **לא** כקובץ בריפו — ה-guard חוסם `service-account*.json` וגם את כותרת ה-PEM של מפתח פרטי. env בלבד. (הכותרת עצמה לא נכתבת כאן כלשונה — ה-guard תופס גם את המסמך שמצטט אותה.)
- כל ה-env החדשים נכנסים ל-`.env.example` עם `REPLACE_WITH_*` בלבד.
- `/admin` → `noindex` בדף **וגם** `disallow` ב-robots.
- הסיסמאות עצמן: `~/.claude/secrets/`, לא בריפו.

### env חדשים

| שם | מקור | חוסם מה |
|---|---|---|
| `DATABASE_URL` | Neon (אוטומטי מה-Marketplace) | M1, M2 |
| `CRON_SECRET` | `openssl rand -hex 32` | M1 (נתיב מחיקת ההיסטוריה — fail-closed בלעדיו) |
| `ADMIN_USER`, `ADMIN_PASSWORD` | ידני | M3 |
| `PAGEVIEW_SALT` | `openssl rand -hex 32` | M2 (יציבות ה-hash בין deployments) |
| `GSC_SERVICE_ACCOUNT_JSON` | Google Cloud | M4 |
| `BING_WEBMASTER_API_KEY` | Bing Webmaster | M4 |

---

## 6. סדר ביצוע

| # | משימה | תלות | PR |
|---|---|---|---|
| 0 | Vercel CLI + Neon + env | — | — (הגדרות) |
| S1/S2 | GSC + Bing API keys | — | — (ידני, אפשר במקביל) |
| S3/S4 | תיקוני robots + sitemap | — | `fix/seo-robots-sitemap` |
| M1 | `db.ts` + לידים מהטופס | 0 | `feat/admin-leads-db` |
| M2 | pageviews + tracker | M1 | `feat/self-hosted-analytics` |
| M3 | `/admin` + auth + פאנל לידים | M1, M2 | `feat/admin-area` |
| M4 | פאנל GSC + Bing | M3, S1, S2 | `feat/admin-seo-panel` |
| M5 | ייחוס | M3 | `feat/lead-attribution` |
| M6 | לידים מהצ'אט | M3 | `feat/chat-leads` |
| M7 | ~~התראות טלגרם~~ **בוטל** — נשארת רק נקודת חיבור no-op ב-M1 | — | — |

**נתיב מהיר לערך:** 0 → M1 → M3. אחרי שלושה אלה כבר יש טופס עובד ולוח שרואים בו לידים. כל השאר מצטבר.

### כללי עבודה לתוכנית הזו

- ענף לכל שלב, PR, אימות ב-branch preview של Vercel. `master` מוגן — push ישיר נדחה.
- `pnpm typecheck` + `pnpm repo:guard` לפני כל push.
- **בלי dev server מקומי לאימות** — האימות הוא על ה-branch alias. המכונה 7.8GB, והאתר הזה מריץ WebGL.
- מצב נוכחי (2026-08-04): `feat/f3-f4` דחוף ומעודכן, כל הבריפים שלו מעוקבים. M1 יוצא לענף `feat/admin-leads-db`, ודף הפרטיות המאושר נוסע באותו PR (סעיף Sequencing בבריף).

---

## 7. החלטות — הוכרעו (2026-08-04)

ארבע ההחלטות שהיו פתוחות הוכרעו על ידי הבעלים. **אין לפתוח אותן מחדש** בלי החלטה חדשה ומפורשת; הן מתועדות כאן כדי שסשן עתידי לא ישאל שוב.

1. **Auth: Basic Auth — אושר.** משתמש יחיד, לא Clerk. שני תנאים נלווים שהם חלק מההחלטה, לא המלצה:
   - סיסמה אקראית ארוכה (`openssl rand -base64 32`), ב-env ו-ב-`~/.claude/secrets/` בלבד.
   - הגבלת קצב על ניסיונות כושלים — Basic Auth בלי זה הוא ניחוש סיסמאות חופשי. אותה טבלת `rate_limit_hits` של M1.2 משמשת גם כאן.
2. **תמלילי צ'אט: רק שיחות שהניבו ליד — אושר.** שיחה בלי כתובת מייל לא נשמרת כלל. זה גם מה שמצמצם את עדכון הפרטיות ב-M6 לגזרה צרה.
3. **M7 — טלגרם בוטל.** לידים נסקרים בדשבורד הפרטי (M3), וזה מספיק; אין צורך בערוץ התראות חיצוני. יש להשאיר את נקודת החיבור להתראה נקייה (קריאה אחת אחרי `insertLead()` שכרגע אינה עושה דבר), כדי שהוספת התראת מייל פשוטה בעתיד תהיה שינוי של קובץ אחד. **האם להוסיף התראת מייל — החלטה של הבעלים, טרם הוכרעה.**
4. **תרגום מדריכים: להמתין לנתוני M5 — אושר.** לא מתרגמים דבר לפני שידוע אילו מדריכים מייצרים לידים.
