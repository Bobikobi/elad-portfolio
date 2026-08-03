# F3 verify - English-first entry

All numbers below were measured on the branch alias, never on localhost and never read
off a diff.

Alias: https://elad-portfolio-git-feat-f3-f4-bobikobis-projects.vercel.app
Commits: `9e9d0db` (F3), `8fe5770` and `27d180a` (two locale-sync defects this
verification found). Every result below was re-measured against the deployment of
`27d180a` after Vercel reported it green - including the screenshots, so no artifact
comes from a superseded build.
Harness: `_f3audit.mjs` (142 HTTP checks), `_f3persist.mjs` (21 browser checks),
`_f3shots.mjs` (6 frames), `_f3glyphs.mjs`, `_f3probe.mjs` - all gitignored (`/_*.mjs`).

> A note on method, because it changed the outcome. The first pass of the persistence
> run reported 20/21 and the failure was real: choosing English from `/ru/about` landed
> on `/about` with `<html lang="ru">` still on a fully English document. Nothing in the
> diff looked wrong, and the HTTP audit could not see it because a direct GET of
> `/about` is correct - the defect only exists on the client transition. It took an
> instrumented `MutationObserver` trail (`en@/ru/about` -> `ru@/ru/about` -> nothing) to
> show the mechanism. Commit message evidence would have shipped this.

## Gates

| Gate | Target | Measured | Result |
|---|---|---|---|
| `npx tsc --noEmit` | 0 errors | 0 errors | pass |
| `npm run build` | success | success, 49 routes, no `/en/*` | pass |
| `npm run lint` | 0 errors | 0 errors, 11 warnings | pass |

The 11 lint warnings are all pre-existing and outside this lane: 10 in the other
session's untracked `_*.mjs` harness files, 1 in `scene/acts/SolarAct.tsx`.

## Acceptance

| # | Criterion | Target | Measured | Result |
|---|---|---|---|---|
| 1 | `GET /` fresh session, no cookie/localStorage | 200, `lang="en" dir="ltr"` | 200, `lang="en" dir="ltr"` | pass |
| 2 | `GET /he` | 200, `lang="he" dir="rtl"` | 200, `lang="he" dir="rtl"` | pass |
| 3 | `GET /ru` | 200, `lang="ru" dir="ltr"` | 200, `lang="ru" dir="ltr"` | pass |
| 4 | `/en`, `/en/services`, `/en/about`, `/en/services/nextjs-development` | 308 to un-prefixed | 308 to `/`, `/services`, `/about`, `/services/nextjs-development` | pass |
| 5 | `/guides/*` stay Hebrew at their indexed URLs | 200, `lang="he" dir="rtl"` | 200, `lang="he" dir="rtl"` (2 sampled) | pass |
| 6 | hreflang per route group | 4 tags, reciprocal, `x-default` == `en-US` | 4 tags on all 12 pages checked, all reciprocal | pass |
| 7 | canonical per route | self-referential and absolute | self-referential on all 12 | pass |
| 8 | `sitemap.xml` | 0 URLs under `/en`; every URL 200 | 39 URLs, 0 under `/en`, 10 under `/he`, 10 under `/ru`, 120 alternates; 39/39 return 200 | pass |
| 9 | Locale choice persists across reload and navigation | see table below | 21/21 | pass |
| 10 | Screenshots, 3 locales x 2 viewports | 6 frames, inspected | 6 frames, inspected | pass |

Route coverage for criteria 1-3, 6, 7: `/`, `/he`, `/ru`, `/about`, `/he/about`,
`/ru/about`, `/services`, `/he/services`, `/ru/services`,
`/services/nextjs-development`, `/he/services/nextjs-development`,
`/ru/services/nextjs-development`, plus `/guides/nextjs-vs-wordpress` and
`/guides/website-cost-guide` for criterion 5.

## Criterion 9 in full (browser, clean profile)

| criterion | target | measured | result |
|---|---|---|---|
| fresh session path | `/` | `/` | pass |
| fresh session lang | en | en | pass |
| fresh session dir | ltr | ltr | pass |
| fresh session stored preference | null | null | pass |
| after switch to he: path | `/he` | `/he` | pass |
| after switch to he: lang | he | he | pass |
| after switch to he: dir | rtl | rtl | pass |
| after switch to he: stored | he | he | pass |
| he after reload: path | `/he` | `/he` | pass |
| he after reload: lang | he | he | pass |
| he after reload: dir | rtl | rtl | pass |
| he after nav to about: path | `/he/about` | `/he/about` | pass |
| he after nav to about: lang | he | he | pass |
| he after nav to about: dir | rtl | rtl | pass |
| he -> ru from `/he/about`: path | `/ru/about` | `/ru/about` | pass |
| he -> ru from `/he/about`: lang | ru | ru | pass |
| he -> ru from `/he/about`: dir | ltr | ltr | pass |
| he -> ru from `/he/about`: stored | ru | ru | pass |
| ru -> en from `/ru/about`: path | `/about` | `/about` | pass |
| ru -> en from `/ru/about`: lang | en | en | pass |
| ru -> en from `/ru/about`: dir | ltr | ltr | pass |

## Screenshots

| Frame | Viewport | What was checked in the image |
|---|---|---|
| `_f3-en-desktop.png` | 1440x900 | English hero, LTR nav, EN active in the switcher |
| `_f3-he-desktop.png` | 1440x900 | Hebrew hero, full RTL mirror: logo right, nav right-to-left, switcher and widgets swapped |
| `_f3-ru-desktop.png` | 1440x900 | Russian hero, LTR, RU active |
| `_f3-en-mobile.png` | 390x844 | English, hamburger left, logo left |
| `_f3-he-mobile.png` | 390x844 | Hebrew, hamburger left / logo right, widgets mirrored |
| `_f3-ru-mobile.png` | 390x844 | Russian, LTR |

## Defects found and fixed during verification

**1. Choosing English from a prefixed route left the stale `<html lang>`** (`8fe5770`).
`LocaleRouteSync` only recognised prefixed path segments, so it could correct the UI
language toward Hebrew or Russian but never back to the default. While Hebrew was the
un-prefixed default the hole was unreachable in practice; the moment English took that
space, `/about` produced no answer at all and the previous prefixed locale stuck.
`localeForPath()` now gives the un-prefixed space a real answer and returns null only
for routes that genuinely serve every language from one URL.

Measured `MutationObserver` trail for RU -> EN from `/ru/about`:

| Build | Trail | Final |
|---|---|---|
| before | `en@/ru/about`, `ru@/ru/about` | `ru` on `/about` - wrong |
| after | `en@/ru/about`, `en@/ru/about` | `en` on `/about` - correct |

**2. Every locale switch flipped the direction and back before settling** (`27d180a`).
Fixing defect 1 made the end state correct but left a transient the first fix could not
remove: the switcher sets the locale and then navigates, and `usePathname` still reports
the OLD route for the couple of hundred milliseconds a navigation takes. The effect ran
inside that window, read the route the user was leaving, and shoved the locale straight
back - so the choice only survived because the committed pathname re-corrected it a
moment later, and every switch into or out of Hebrew showed a visible ltr/rtl flip.
Syncing on a pathname change rather than on every locale change closes the window: the
trail above goes from two entries with a reversal to two identical entries.

**3. Switching language on a single-URL page pushed a 404** (`8fe5770`).
`switchLocalePath` sent a switch on `/privacy` to `/he/privacy`, which does not exist.
That line was always wrong - it 404'd on `/en/privacy` before - and was invisible only
because Hebrew, the primary audience, happened to be the un-prefixed default. Measured
before: `/privacy -> /he/privacy`. After: `/privacy -> /privacy`, `lang="he"`.

## Pre-existing issues found, NOT changed (need the owner's call)

The rendered-DOM scan flagged 8 of the 14 sampled routes carrying em-dashes, en-dashes
or arrows, against the project's "regular hyphens only" convention. **Every one predates
F3** - verified against `origin/feat/cosmic-r1-r2` - and none is a string this task
wrote, so none was touched.

Sampling 14 routes understated it. A source-level count puts the real scale at **18
files and ~138 occurrences**, spread across the entire marketing surface:

| Area | Files | Occurrences |
|---|---|---|
| `app/services/*` (English detail pages) | 4 | 21 |
| `app/he/services/*` (Hebrew detail pages) | 4 | 48 |
| `app/ru/services/*` (Russian detail pages) | 4 | 22 |
| `app/guides/*` (Hebrew articles) | 6 | 47 |
| `lib/sections.ts` `SECTION_META` | 1 | 2 (`Services — ...`, `Услуги — ...`) |
| `app/ru/page.tsx` meta description | 1 | 1 |

Representative examples, exactly as they render:

| Route | Rendered string |
|---|---|
| `/services` (title) | `Services — Next.js, AI & Automation` |
| `/ru/services` (title) | `Услуги — Next.js, AI и Автоматизация` |
| `/ru` (meta description) | `Элад Саадон — фулстек-разработчик ...` |
| `/services/nextjs-development` | `A Next.js product built right — fast for users ...` |
| `/he/services/nextjs-development` | `פרויקט ראשוני (MVP או אתר תדמית) לוקח 2–4 שבועות` (en-dash) |
| `/guides/website-cost-guide` | `אתר תדמית — 2-3 שבועות. אתר עסקי — 4-8 שבועות` |

This is a real convention violation but it is copy debt across three languages, not part
of English-first entry. It wants its own pass with the owner's approval on the wording,
not a silent find-and-replace folded into a routing change.

## Cross-lane blocker (unchanged, still open)

`src/components/worlds/ServicesWorld.tsx:18` re-implements the prefix rule inline and
now sends a Hebrew reader to the English `/services/nextjs-development`. It is a
one-line change to `localePath(...)`, but `components/worlds/**` belongs to the 3D
session, so this task did not touch it.
