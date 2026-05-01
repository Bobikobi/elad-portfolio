# תוכנית שיפור SEO/GEO — eladsaadon.dev

## מצב נוכחי (מה כבר קיים)

| נכס | סטטוס | הערות |
|------|--------|--------|
| metadata (title, description) | ✅ קיים | כל דף, כולל hreflang alternates |
| JSON-LD structured data | ✅ קיים | Person, Organization, WebSite, ProfilePage, Service, Speakable, BreadcrumbList |
| Open Graph / Twitter | ✅ קיים | og-image.png, summary_large_image |
| robots.txt | ✅ קיים | חוסם /api/, /_next/, /llms.txt |
| sitemap.xml | ✅ קיים | כולל alternates.languages + 5 מדריכים חדשים |
| Core Web Vitals | ✅ Tailwind v4, preconnect, cache headers | אבל לא נמדד |
| llms.txt / llms-full.txt | ✅ קיים | GEO-ready |
| RTL/LTR | ✅ קיים | he/rtl, en/ltr, ru/ltr |
| i18n (he/en/ru) | ✅ קיים | תרגום תוכן דינמי |
| canonical URLs | ✅ קיים | hreflang מלא |
| security headers | ✅ קיים | CSP, HSTS, X-Frame-Options וכו' |
| accessibility | ✅ קיים | דף הצהרת נגישות + AccessibilityWidget |
| BingSiteAuth.xml | ✅ קיים | אימות Bing Webmaster Tools |
| Breadcrumbs | ✅ נוסף | Schema.org BreadcrumbList + UI ב-13 דפי שירות |
| Guides | ✅ 6 מדריכים | nextjs-seo-geo-2026, nextjs-vs-wordpress, website-cost-guide, seo-for-small-business, ai-in-web-development, business-automation-guide |

---

## משימות מפורטות לביצוע

### שלב 1: תרגום כל דפי השירות לאנגלית ורוסית ✅

**סטטוס:** הושלם — 6 דפים חדשים נוצרו (3 EN + 3 RU), נדחפו ומוזגו ל-master.

**קבצים שנוצרו:**
- [`src/app/en/services/nextjs-development/page.tsx`](src/app/en/services/nextjs-development/page.tsx)
- [`src/app/en/services/automation-workflows/page.tsx`](src/app/en/services/automation-workflows/page.tsx)
- [`src/app/en/services/growth-marketing/page.tsx`](src/app/en/services/growth-marketing/page.tsx)
- [`src/app/ru/services/nextjs-development/page.tsx`](src/app/ru/services/nextjs-development/page.tsx)
- [`src/app/ru/services/automation-workflows/page.tsx`](src/app/ru/services/automation-workflows/page.tsx)
- [`src/app/ru/services/growth-marketing/page.tsx`](src/app/ru/services/growth-marketing/page.tsx)

---

### שלב 2: תיקון sitemap alternates + הוספת דפים מתורגמים ✅

**סטטוס:** הושלם — alternates תוקנו, 18 entries נוספו ל-sitemap (6 EN + 6 RU + 6 HE service pages).

**קובץ:** [`src/app/sitemap.ts`](src/app/sitemap.ts)

**תיקון:** alternates לדף `/services` שונה מ-`/en`/`/ru` ל-`/en/services`/`/ru/services`.

---

### שלב 3: הוספת תשובות ישירות + deliverables + FAQ מורחב (עברית) ✅

**סטטוס:** הושלם — 4 דפי שירות בעברית קיבלו תשובה ישירה, 8 deliverables כל אחד, ו-3 שאלות FAQ במקום 2.

**קבצים שעודכנו:**
- [`src/app/services/nextjs-development/page.tsx`](src/app/services/nextjs-development/page.tsx)
- [`src/app/services/ai-integration/page.tsx`](src/app/services/ai-integration/page.tsx)
- [`src/app/services/automation-workflows/page.tsx`](src/app/services/automation-workflows/page.tsx)
- [`src/app/services/growth-marketing/page.tsx`](src/app/services/growth-marketing/page.tsx)

---

### שלב 4: Breadcrumbs UI בדפי שירות ✅

**סטטוס:** הושלם — קומפוננטת Breadcrumbs נוצרה ונוספה לכל 13 דפי השירות (4 HE + 4 EN + 4 RU + 1 HE overview).

**קובץ חדש:** [`src/components/ui/Breadcrumbs.tsx`](src/components/ui/Breadcrumbs.tsx)
- Schema.org BreadcrumbList JSON-LD
- RTL/LTR support (ChevronLeft ל-RTL, ChevronRight ל-LTR)
- `aria-current="page"` לעמוד נוכחי
- `itemProp`, `itemScope`, `itemType` לתמיכה ב-structured data

---

### שלב 5: יצירת מדריכים חדשים ✅

**סטטוס:** הושלם — 5 מדריכים חדשים נוצרו, נוספו ל-sitemap, קומפילציה עברה בהצלחה.

**קבצים שנוצרו:**
1. [`src/app/guides/nextjs-vs-wordpress/page.tsx`](src/app/guides/nextjs-vs-wordpress/page.tsx) — "Next.js vs וורדפרס: מה עדיף לבניית אתרים ב-2026?"
2. [`src/app/guides/website-cost-guide/page.tsx`](src/app/guides/website-cost-guide/page.tsx) — "כמה עולה לבנות אתר ב-Next.js? מדריך מחירים 2026"
3. [`src/app/guides/seo-for-small-business/page.tsx`](src/app/guides/seo-for-small-business/page.tsx) — "מדריך SEO לעסקים קטנים: איך להגיע ראשון בגוגל בלי תשלום"
4. [`src/app/guides/ai-in-web-development/page.tsx`](src/app/guides/ai-in-web-development/page.tsx) — "איך AI משנה את עולם פיתוח האתרים ב-2026"
5. [`src/app/guides/business-automation-guide/page.tsx`](src/app/guides/business-automation-guide/page.tsx) — "אוטומציה עסקית לעסקים קטנים: איפה מתחילים?"

**מבנה כל מדריך:**
- Article schema + FAQPage schema ב-JSON-LD
- GradientBar → h1 → direct answer paragraph → cards/tables → FAQ → CTA
- קישורים פנימיים לדפי שירות רלוונטיים
- טבלת השוואה או ROI
- CTA עם 2 כפתורים (שירות + יצירת קשר)

---

### שלב 6: Google Search Console ⏳

**סטטוס:** ממתין לביצוע ידני.

**צריך לעשות (פעם אחת):**
1. להיכנס ל-[Google Search Console](https://search.google.com/search-console)
2. להוסיף את `https://www.eladsaadon.dev` כנכס
3. לאמת בעלות — דרך DNS (TXT record) או דרך קובץ HTML
4. לשלוח `sitemap.xml` (https://www.eladsaadon.dev/sitemap.xml)
5. לבדוק את הטאב "Pages" לראות אילו עמודים באינדקס
6. לבדוק Core Web Vitals בדוח "Core Web Vitals"
7. לבדוק בעיות מובייל בדוח "Mobile Usability"

**מה לבדוק אחרי אימות:**
- האם כל 30+ העמודים ב-sitemap מופיעים באינדקס
- האם יש שגיאות סריקה (404, 500)
- האם ה-Core Web Vitals ירוקים (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- האם יש בעיות מובייל

---

### שלב 7: Backlinks ⏳

**סטטוס:** ממתין לביצוע ידני.

**מה לעשות (ידני, פעם אחת):**
1. **GitHub profile** ([`github.com/Bobikobi`](https://github.com/Bobikobi)) — לוודא שיש לינק לאתר ב-bio וב-pinned repos
2. **LinkedIn profile** — להוסיף לינק לאתר ב-"Featured" section + לפרסם פוסט על המדריכים החדשים
3. **פוסט בלינקדאין** — לפרסם תוכן על אחד המדריכים (למשל "Next.js vs וורדפרס") עם לינק לאתר
4. **פורומים מקצועיים** — Stack Overflow, Reddit r/nextjs, r/webdev (לענות על שאלות עם לינק למדריך רלוונטי)
5. **Google Business Profile** — אם רלוונטי, להוסיף לינק לאתר

---

## סדר ביצוע מומלץ

| שלב | משימה | קבצים | תלות | סטטוס |
|-----|--------|--------|------|-------|
| 1 | תרגום 6 דפי שירות (EN/RU) | 6 קבצים חדשים | — | ✅ |
| 2 | תיקון sitemap alternates + הוספת דפים מתורגמים | [`sitemap.ts`](src/app/sitemap.ts) | שלב 1 | ✅ |
| 3 | תשובות ישירות + deliverables + FAQ מורחב (עברית) | 5 דפי שירות | — | ✅ |
| 4 | Breadcrumbs UI בכל דפי השירות | 15 דפים (he/en/ru) | שלב 1 | ✅ |
| 5 | 5 מדריכים חדשים | 5 קבצים חדשים | — | ✅ |
| 6 | Google Search Console | פעולה ידנית | — | ⏳ |
| 7 | Backlinks | פעולה ידנית | — | ⏳ |

---

## עקרונות עיצוב לשמירה לאורך כל השינויים

1. **צבעים**: להשתמש תמיד ב-`var(--color-*)` tokens, לא צבעים hardcoded
2. **כפתורים**: `rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] transition-colors`
3. **קישורים**: `text-[var(--color-accent)] hover:underline`
4. **כרטיסיות**: `rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-6`
5. **RTL**: כל התוכן בעברית ב-direction: rtl (אוטומטי מה-html dir)
6. **תגי JSON-LD**: תמיד דרך קומפוננטת `JsonLd`
7. **CTA**: תמיד מפנה ל-`/#contact` (לא משתנה בין שפות)
8. **תפקוד כפתורים**: locale switcher ב-Navbar אמור לעבוד גם בדפי השירות המתורגמים (כבר עובד)
9. **קישורים פנימיים**: תמיד תלויי-שפה (e.g. `/${locale}/services/nextjs-development`)
