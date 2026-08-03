# F3.2 - the server paints the right direction on the first paint

Branch: `feat/f3-f4`. Alias:
https://elad-portfolio-git-feat-f3-f4-bobikobis-projects.vercel.app

Owner-approved fix for the S5 finding. Ruling: mirror the locale preference into a cookie
the proxy can read, so there is no post-hydration flip. Re-measure CLS after.

## Goal

`/privacy`, `/terms` and `/accessibility` render in the visitor's preferred language and
direction on the SERVER, so the document never flips LTR to RTL after hydration.
CLS on `/privacy` with a stored Hebrew preference and a cold cache drops from 0.279 to
under 0.1.

## Current state (measured, `docs/briefs/s5-cwv-verify.md`)

| stored preference | cache | `<html>` | CLS |
|---|---|---|---|
| none | cold | `lang=en dir=ltr` | 0.000 |
| **he** | **cold** | `lang=he dir=rtl` | **0.279** |
| ru | cold | `lang=ru dir=ltr` | 0.002 |
| he | warm | `lang=he dir=rtl` | 0.000 |

`localeForPath` returns null for those three routes, so the proxy falls back to `'en'` and
the server paints English LTR. The client then resolves the stored preference from
`localStorage` - which the server cannot see - and flips the whole document. Hebrew pays
0.279 for the direction change; Russian pays 0.002 because only its text changes.

## Recipe

This is not a new mechanism. `src/lib/viewMode.ts` already solves exactly this problem for
the cosmic/classic toggle, and its own comment names it: "A choice kept only in
localStorage would mean every reload paints the cosmic markup first and swaps after
hydration, which is the flash this stage exists to avoid. So the cookie is the source of
truth and localStorage is a mirror." The locale needs the same treatment, so it gets the
same shape rather than a second convention.

1. **`src/lib/localePref.ts`** (new, mirrors `viewMode.ts`): `LOCALE_COOKIE`,
   `LOCALE_MAX_AGE`, `parseLocale()`, `localeCookie()`. A plain module with no
   `'use client'`, because the proxy imports it too.
2. **`src/proxy.ts`**: when `localeForPath` returns null, read the cookie before falling
   back to English.
3. **`src/lib/i18n.tsx`**:
   - `setLocale(l, persist)` writes the cookie alongside `localStorage` when persisting.
   - `resolveLocale` reads the COOKIE first, then `localStorage`. The server decided from
     the cookie, so the client must consult the same source or it can disagree with the
     HTML it is hydrating.
   - Mount effect: if there is a stored preference but no cookie, write one. Without this
     migration step every existing visitor still flips once, because their preference
     lives only in `localStorage` today.

## Acceptance (numeric)

| # | Criterion | Target |
|---|---|---|
| 1 | `/privacy`, cold cache, stored he | CLS < 0.1 (from 0.279) |
| 2 | `/privacy`, cold cache, stored he | server-rendered `<html lang="he" dir="rtl">` before any client JS |
| 3 | `/privacy`, cold cache, stored ru / none | CLS < 0.1, `lang` matches the preference |
| 4 | Migration: localStorage set, no cookie | first visit writes the cookie; second visit is server-correct |
| 5 | F3.1 regression | 104/104 unchanged |
| 6 | F3 regression | 21/21 persistence, 134/142 HTTP |
| 7 | Gates | `pnpm typecheck` 0, `pnpm lint` 0, `pnpm repo:guard` pass, build success |

Criterion 2 is checked with JavaScript DISABLED, which is the only way to prove the
server sent it rather than the client corrected it quickly.

## Verification plan

`_f32cls.mjs` on the alias: cold cache per case, `PerformanceObserver` installed via
`evaluateOnNewDocument`, three stored preferences. Both of those details are load-bearing
and were learned the hard way in S5 - a warm cache reports a false 0.000, and an observer
installed after `domcontentloaded` misses shifts. Plus a JS-disabled fetch to prove the
server output. Then re-run `_f31verify.mjs`, `_f3persist.mjs`, `_f3audit.mjs` unchanged.

## Risks and rollback

* A third cookie-shaped preference on a site whose privacy page mentions no cookies at
  all. **Pre-existing and wider than this change** - the `viewMode` cookie already ships,
  and the privacy page still claims contact data is stored in "Supabase (PostgreSQL)"
  when there is no database at all. Raised separately; M1 forces a privacy rewrite anyway.
* The cookie is a functional language preference, not tracking: no identifier, no
  analytics value, `samesite=lax`, no `HttpOnly` because the client writes it.
* Responses on the three unpinned routes now vary by cookie. They are already dynamic
  (`ƒ` in the build output), so nothing that was cached stops being cached.
* Rollback is `git revert` of one commit.

## Open questions

None.
