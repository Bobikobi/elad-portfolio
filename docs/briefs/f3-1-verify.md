# F3.1 verify - a page must never be half-translated

All numbers measured on the branch alias against the deployment of `2bee4ce`, after
Vercel reported it green.

Alias: https://elad-portfolio-git-feat-f3-f4-bobikobis-projects.vercel.app
Harness: `_f31repro.mjs` (repro), `_f31verify.mjs` (104 acceptance checks),
`_f3persist.mjs` + `_f3audit.mjs` (F3 regression). All gitignored via `/_*.mjs`.

## Gates

| Gate | Target | Measured | Result |
|---|---|---|---|
| `npx tsc --noEmit` | 0 errors | 0 errors | pass |
| `npm run build` | success | success | pass |
| `npm run lint` | 0 errors | 0 errors, 11 pre-existing warnings | pass |

## Acceptance

| # | Criterion | Target | Measured | Result |
|---|---|---|---|---|
| 1 | 16 combinations of stored preference x un-prefixed localized route: `<html lang>`, `dir`, chrome script, content script | all `en` / `ltr` | all `en` / `ltr` | pass |
| 2 | Stored preference after visiting a pinned route | unchanged | unchanged in all 16 | pass |
| 3 | `/guides/nextjs-vs-wordpress` under each stored preference | `lang="he" dir="rtl"`, content Hebrew | as targeted, 4/4 | pass |
| 4 | `/privacy` under each stored preference | `lang` == preference, chrome == content | as targeted, 4/4 | pass |
| 5 | F3 persistence regression | 21/21 | 21/21 | pass |
| 6 | F3 HTTP regression | 134/142 (8 known copy-debt failures) | 134/142, same 8 | pass |

**104 acceptance checks, 104 pass, 0 fail.**

## Before and after, on the rows that were broken

| stored | route | before (`27d180a`) | after (`2bee4ce`) |
|---|---|---|---|
| ru | `/about` | `lang=ru`, chrome Russian, content **English** | `lang=en`, chrome en, content en |
| ru | `/services` | `lang=ru`, chrome Russian, content **English** | `lang=en`, chrome en, content en |
| ru | `/` | `lang=ru`, all Russian at the English URL | `lang=en`, all English |
| he | `/about` | `lang=he`, chrome Hebrew, content **English** | `lang=en`, chrome en, content en |
| he | `/services` | `lang=he`, chrome Hebrew, content **English** | `lang=en`, chrome en, content en |
| ru | `/guides/nextjs-vs-wordpress` | Russian chrome over a Hebrew article | `lang=he`, all Hebrew |
| ru | `/privacy` | Russian | Russian (unchanged - correct, this route follows the preference) |
| he | `/about`, preference afterwards | n/a | still `he` - not clobbered |

Content language is classified by SCRIPT (Hebrew / Cyrillic / Latin character ranges),
not by matching known strings. A string match can only confirm what it was told to look
for, and the defect under test is precisely a page carrying two languages at once.

## Cross-lane change (owner-approved scoped exemption)

`src/components/worlds/ServicesWorld.tsx`, exact diff:

```diff
+import { localePath } from '@/lib/sections';
...
-  const path = (s: string) => (locale === 'he' ? `/${s}` : `/${locale}/${s}`);
+  const path = (s: string) => localePath(s, locale);
```

Verified in the rendered DOM, not in the diff:

| Route | Detail links served |
|---|---|
| `/he/services` | `/he/services/ai-integration`, `/he/services/nextjs-development` |
| `/services` | `/services/ai-integration`, `/services/nextjs-development` |
| `/ru/services` | `/ru/services/ai-integration`, `/ru/services/nextjs-development` |

Nothing else under `components/worlds/**` was touched.

## Note for the next task

`localeForPath` is now the single answer to "what language is this URL", consumed by
`proxy.ts` (server), `i18n.resolveLocale` (client first render) and `LocaleRouteSync`
(client navigation). Adding a route that exists in more than one language means adding
its root to `LOCALIZED_ROOTS`; adding a Hebrew-only subtree means adding it to
`HEBREW_ONLY_PREFIXES`. There is no second copy of the rule to keep in step.
