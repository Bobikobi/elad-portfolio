# F3.1 - a page must never be half-translated

Branch: `feat/f3-f4`. Alias:
https://elad-portfolio-git-feat-f3-f4-bobikobis-projects.vercel.app

Reported externally against the F3 build, and blocking F4. Written after the repro but
before the fix: the repro is what decided the design, so recording it first would have
recorded a guess.

## Goal

With any stored locale preference, an un-prefixed route renders ONE language across
chrome and content, matching `<html lang>`, in all three locales.

## Current state (measured on the alias, build `27d180a`)

Repro: visit `/he` or `/ru` (which persists the preference), then visit an un-prefixed
route in the same browser.

| stored | route | `<html lang>` | chrome | body content | verdict |
|---|---|---|---|---|---|
| ru | `/about` | ru | Russian (`Обо мне`) | **English** (`About`, `Full-Stack developer...`) | MIXED |
| ru | `/services` | ru | Russian | **English** (`Services`, `What I Offer`) | MIXED |
| ru | `/` | ru | Russian | Russian | one language, but at the URL hreflang calls English |
| he | `/about` | he | Hebrew (`אודות`) | **English** | MIXED |
| he | `/services` | he | Hebrew | **English** | MIXED |
| he | `/` | he | Hebrew | Hebrew | one language, at the English URL |

Two distinct mechanisms, both from one root cause:

* `resolveLocale` in `lib/i18n.tsx` reads `localStorage` BEFORE consulting the route, so
  the client store settles on the stored preference even where the URL declares a
  language.
* The home page's content comes from `useI18n()`, so it follows the store and the whole
  page turns Russian. The SECTION routes' content does not: `/about/page.tsx` renders
  `<SectionPage id="about" locale="en" />` - a literal chosen by the route file on the
  server. The preference repaints the chrome around content it cannot reach, and that
  gap is the half-translated page.

`LocaleRouteSync` was supposed to correct this and does not, because at the moment its
effect first runs the store still reports the SERVER snapshot ('en'), which already
matches the route - so it finds nothing to do, and the `syncedPath` one-shot guard added
in `27d180a` means it never re-checks once the store settles to 'ru'.

## Decision: the URL wins wherever the URL pins a language

The owner offered two rules. The measurement eliminates one of them:

* **Redirect the stored preference to its prefixed twin** (`/about` -> `/ru/about`)
  cannot be done well. `localStorage` is invisible to the server, so the redirect can
  only fire after hydration - a visible bounce on every un-prefixed landing, and on `/`
  that means tearing down the WebGL galaxy dive mid-flight. Doing it properly would mean
  moving persistence to a cookie the proxy can read, which is a different task and
  changes "persists exactly as today".
* **The route decides** costs nothing at runtime, needs no redirect, and is the only
  rule consistent with content the URL has ALREADY decided on the server.

So: a route that pins a language beats the stored preference. Routes that genuinely
serve every language from one URL keep following the preference, and there chrome and
content move together, so nothing is mixed either way.

| Route class | Examples | Language decided by |
|---|---|---|
| Prefixed | `/he/*`, `/ru/*` | the prefix |
| Un-prefixed localized | `/`, `/about`, `/services`, `/services/<slug>` | English |
| Hebrew-only articles | `/guides/*` | Hebrew |
| One URL, every language | `/privacy`, `/terms`, `/accessibility` | the stored preference |

## Recipe

1. `lib/sections.ts` - `localeForPath` becomes the single answer to "what language is
   this URL", including the `/guides` Hebrew pin; export `HEBREW_ONLY_PREFIXES`.
2. `src/proxy.ts` - import `localeForPath` instead of keeping a second copy of the rule.
3. `lib/i18n.tsx` - `resolveLocale` consults the route BEFORE storage. Fixing it at the
   read, not in an effect afterwards: an effect is a second render, and it is exactly
   what `LocaleRouteSync` was already failing to do.
4. `lib/i18n.tsx` - `setLocale(l, persist = true)`; route-forced changes pass false so
   navigating onto an English URL cannot silently overwrite someone's saved Hebrew.
5. `components/seo/LocaleRouteSync.tsx` - pass `persist: false`.
6. `components/worlds/ServicesWorld.tsx` - the inline prefix rule, under the owner's
   scoped cross-lane approval.

## Acceptance (numeric)

| # | Criterion | Target |
|---|---|---|
| 1 | For stored in {none, en, he, ru} x {`/`, `/about`, `/services`, `/services/nextjs-development`}: `<html lang>`, chrome script and content script | all three == `en`, for all 16 combinations |
| 2 | Same matrix: stored preference after the visit | unchanged from what was stored |
| 3 | `/guides/nextjs-vs-wordpress` under every stored preference | `lang="he" dir="rtl"`, content Hebrew |
| 4 | `/privacy` under every stored preference | `lang` == preference, chrome script == content script |
| 5 | F3 regressions | 21/21 persistence, 134/142 HTTP unchanged |
| 6 | Gates | `tsc` 0, `build` success, `eslint` 0 |

## Verification plan

`_f31verify.mjs` on the branch alias, in a clean profile, classifying content language by
SCRIPT (Hebrew / Cyrillic / Latin ranges) rather than by matching known strings - the
whole point is to catch a page that is half-translated, and a string match only confirms
what it was told to look for. Then re-run `_f3persist.mjs` and `_f3audit.mjs` unchanged
as regression.

## Risks and rollback

* A Russian-preferring visitor who follows a shared English link now sees English. That
  is the intended meaning of the URL, and hreflang points Russian searchers at
  `/ru/about`, but it is a deliberate behaviour change and worth stating plainly.
* The preference is still honoured on the legal pages, which is where it matters most:
  the Israeli accessibility statement stays available in Hebrew to a Hebrew visitor.
* Rollback is `git revert` of one commit. No production deploy is involved.

## Open questions

None.
