# F3 - English-first entry

Branch: `feat/f3-f4` (off `feat/cosmic-r1-r2` @ `b8ab84b`)
Preview alias: https://elad-portfolio-git-feat-f3-f4-bobikobis-projects.vercel.app

## Goal

A first-time visitor with no stored preference lands on the **English** galaxy welcome at
`/`. Hebrew and Russian stay complete and switchable, the choice persists exactly as it
does today (localStorage + a locale-prefixed URL), and hreflang / canonical / sitemap /
per-route metadata all describe English as the default. Hebrew RTL stays perfect when
selected.

## Current state (measured, not assumed)

Locale is resolved in one place: `src/proxy.ts` reads the first path segment, and when it
is `en` or `ru` it sets an `x-locale` request header; anything else falls through to `he`.
`src/app/layout.tsx` reads that header for `<html lang>`/`dir` and hands it to the client
provider. So **the un-prefixed URL space is Hebrew** and the two prefixed trees are
`/en` and `/ru`.

Measured on production (`https://www.eladsaadon.dev`, 2026-08-03):

| URL | status | `<html>` |
|---|---|---|
| `/` | 200 | `lang="he" dir="rtl"` |
| `/en` | 200 | `lang="en" dir="ltr"` |
| `/ru` | 200 | `lang="ru" dir="ltr"` |
| `/services` | 200 | `lang="he" dir="rtl"` |
| `/services/nextjs-development` | 200 | `lang="he" dir="rtl"` |
| `/guides/nextjs-vs-wordpress` | 200 | (Hebrew-only, hand-written) |
| `/privacy` | 200 | client-locale driven |
| `/about`, `/projects`, `/technologies`, `/contact` | **404** | do not exist in production |
| `/en/about` | **404** | does not exist in production |

Production hreflang on `/`:
`he-IL -> /`, `en-US -> /en`, `ru-RU -> /ru`, `x-default -> /`, canonical `-> /`.

That 404 row is the important measurement: the section routes are new on
`feat/cosmic-r1-r2` and have never been indexed. **The Hebrew URLs that actually carry
search equity today are only six**: `/`, `/services`, and the four
`/services/<slug>` detail pages.

Two shapes of route exist, and they cost very different amounts to move:

* **Thin routes** - `about`, `contact`, `projects`, `technologies`, `services` (the
  section page) and the home page are 6-to-9 line files that pass a `locale` string to a
  shared component (`SectionPage`) and call `sectionMetadata(id, locale)`. Flipping their
  locale is a one-word edit.
* **Thick routes** - the four `services/<slug>` marketing pages are hand-written per
  locale (full JSX + JSON-LD + hard-coded canonical strings), one copy per language. These
  have to physically move.

## Decision: default locale un-prefixed

`/` = English, `/he/*` = Hebrew, `/ru/*` = Russian, and `/en/*` 308-redirects onto the
un-prefixed equivalent. This is the only arrangement in which every locale keeps one
stable indexable URL, which is what makes the hreflang/canonical/sitemap audit clean -
and the task explicitly asks for those to be "updated to the new default", which only has
meaning if the URLs move.

Two subtrees are deliberately **exempt**, and both exemptions preserve SEO equity at zero
cost:

* `/guides/*` - six hand-written Hebrew-only articles with no English or Russian version.
  The proxy pins these to `he`, so they keep their URLs, their `lang="he" dir="rtl"`, and
  their canonicals. Moving them to `/he/guides/*` would forfeit real indexed equity to buy
  nothing.
* `/privacy`, `/terms`, `/accessibility` - already client-locale driven with a single URL
  each. Only their SSR fallback changes he -> en; a visitor whose stored preference is
  Hebrew still gets Hebrew after hydration, as today.

## Recipe

**Locale resolution**
1. `src/proxy.ts` - `PREFIXED_LOCALES = ['he','ru']`, default `en`; pin `/guides` to `he`.
2. `src/lib/getLocale.ts` - fallback `he` -> `en`.
3. `src/lib/i18n.tsx` - `initialLocale` default `he` -> `en`.
4. `src/components/layout/ClientProviders.tsx` - same default.
5. `src/lib/sections.ts` - invert `sectionPath` / `homePath` (en un-prefixed, he
   prefixed); `sectionForPath` drops a leading `he`/`ru`; `x-default` -> the en URL. Add
   one exported `localizePath(pathname, locale)` so the prefix rule lives in exactly one
   place instead of being re-implemented per component.
6. `src/components/layout/Navbar.tsx` - `changeLocale` uses `localizePath`.
7. `src/components/sections/Hero.tsx` - SSR link helper uses `localizePath`.

**Routes**
8. `git mv` each `src/app/en/<x>` to `src/app/<x>` and each current un-prefixed Hebrew
   route to `src/app/he/<x>`, for: `page.tsx`, `about`, `contact`, `projects`,
   `technologies`, `services` (including the four detail pages). Delete `src/app/en`.
9. `next.config.ts` - add 308s: `/en` -> `/` and `/en/:path*` -> `/:path*`.

**Metadata / SEO**
10. `src/app/layout.tsx` - English default title/description/OG/Twitter, `locale: 'en_US'`
    with `alternateLocale: ['he_IL','ru_RU']`, hreflang map `en-US` + `x-default` -> base,
    `he-IL` -> `/he`.
11. `src/lib/seo.ts` - `siteConfig` English defaults.
12. `src/app/sitemap.ts` - rewrite the URL set and every alternates block.
13. `src/app/manifest.ts` - `lang: 'en'`, `dir: 'ltr'`.
14. The 12 service-detail files (he/en/ru) - fix hard-coded canonical + hreflang strings.
15. `src/app/ru/*` - fix hreflang maps to the new he/en URLs.

## Acceptance (numeric)

| # | Criterion | Target |
|---|---|---|
| 1 | `GET /` with no cookie/localStorage | 200, `<html lang="en" dir="ltr">` |
| 2 | `GET /he` | 200, `<html lang="he" dir="rtl">` |
| 3 | `GET /ru` | 200, `<html lang="ru" dir="ltr">` |
| 4 | `GET /en`, `GET /en/services` | 308 to `/` and `/services` |
| 5 | `GET /guides/nextjs-vs-wordpress` | 200, `<html lang="he" dir="rtl">`, canonical unchanged |
| 6 | hreflang on `/`, `/he`, `/ru` | 4 tags each; `x-default` == `en-US` == base; reciprocal |
| 7 | canonical on every route | self-referential, absolute, matches the served URL |
| 8 | `sitemap.xml` | 0 URLs containing `/en/`; every listed URL returns 200 |
| 9 | Locale switch he -> reload -> navigate | stays he; `<html dir>` == `rtl` throughout |
| 10 | Screenshots | 3 locales x {1440x900, 390x844} = 6 frames, inspected |
| 11 | Gates | `tsc --noEmit` 0 errors, `next build` success, `eslint` 0 errors |

## Verification plan

Every number comes from the branch alias, never from localhost and never from a diff.
HTTP-level checks (status, `<html>`, canonical, hreflang, sitemap) by direct request with
a fresh session and no cookie jar. The six screenshots via the existing headed-Chrome
harness, torn down immediately after (8 GB box - no dev server or build running at the
same time). Rendered-DOM check for stray em/en-dashes and arrow glyphs in all three
locales, on the DOM and not on the diff. Results go to `docs/briefs/f3-verify.md` as a
criterion -> target -> measured -> pass/fail table.

## Risks and rollback

* **Six indexed Hebrew URLs change language** (`/`, `/services`, 4x
  `/services/<slug>`). Inherent to "English becomes the default" - it cannot be avoided,
  only declared. Mitigation: the Hebrew content survives byte-for-byte at `/he/...`, and
  hreflang plus the sitemap declare the mapping so Google can re-associate. Expect a
  re-crawl settling period.
* **`/en/*` 308s** consolidate rather than lose - old links keep working.
* **Rollback** is `git revert` of one commit; no data migration, no production deploy is
  involved at any point in this task.
* **RAM**: the route move is compile-heavy. One build at a time, no dev server running,
  headroom checked before each `next build` (commit-free was 3.25 GB at start).

## Open questions

**BLOCKER (cross-lane, needs the owner):** `src/components/worlds/ServicesWorld.tsx:18`
re-implements the prefix rule inline:
`const path = (s) => (locale === 'he' ? '/'+s : '/'+locale+'/'+s)`.
Under the new scheme that line sends a Hebrew reader to the now-English
`/services/nextjs-development` instead of `/he/services/nextjs-development`. It is a
one-line change to `localizePath(...)`, but `components/worlds/**` belongs to the 3D
session, so this brief does **not** touch it. Either the owner approves the one line here,
or session 2 applies it. Everything else in F3 proceeds regardless; the symptom until then
is a wrong-language landing (not a 404) from two "Learn more" links in the Hebrew
Services world.
