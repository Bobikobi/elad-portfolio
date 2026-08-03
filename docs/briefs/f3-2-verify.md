# F3.2 verify - the server paints the right direction on the first paint

Measured on the branch alias against the deployment of `aaf3875`, after Vercel reported
it green. Harness: `_f32cls.mjs` (30 checks), plus the three F3/F3.1 suites unchanged.

## Gates

| Gate | Target | Measured | Result |
|---|---|---|---|
| `pnpm typecheck` | 0 errors | 0 errors | pass |
| `pnpm lint` | 0 errors | 0 errors, 11 pre-existing warnings | pass |
| `pnpm repo:guard` | pass | pass | pass |
| `pnpm build` | success | success | pass |

## Acceptance

| # | Criterion | Target | Measured | Result |
|---|---|---|---|---|
| 1 | `/privacy` cold cache, stored he | CLS < 0.1 | **0.000** (was 0.279) | pass |
| 2 | Server output with JS never involved | `lang="he" dir="rtl"` | see table below | pass |
| 3 | All three routes x three preferences | CLS < 0.1, lang matches | 27/27 | pass |
| 4 | Migration (localStorage only, no cookie) | cookie minted, next visit server-correct | minted `he`, second visit CLS 0.000 `dir=rtl` | pass |
| 5 | F3.1 regression | 104/104 | 104/104 | pass |
| 6 | F3 persistence regression | 21/21 | 21/21 | pass |
| 7 | F3 HTTP regression | 134/142 (8 known) | 134/142, same 8 | pass |

**30 checks in `_f32cls.mjs`, 30 pass, 0 fail.**

### Criterion 2 - proved with curl, not with a browser

A browser cannot distinguish "the server sent it" from "the client fixed it in 4ms". Raw
requests can:

| Cookie sent | Server response |
|---|---|
| *(none)* | `<html lang="en" dir="ltr"` |
| `locale=he` | `<html lang="he" dir="rtl"` |
| `locale=ru` | `<html lang="ru" dir="ltr"` |
| `locale=bogus` | `<html lang="en" dir="ltr"` |

The last row matters as much as the others: an untrusted cookie value is narrowed by
`parseLocale` and falls back to English rather than reaching `<html lang>`.

### Before and after

| route | stored | before (`27d180a`) | after (`aaf3875`) |
|---|---|---|---|
| `/privacy` | he | CLS **0.279**, English LTR then flipped to Hebrew RTL | CLS 0.000, Hebrew RTL from the server |
| `/privacy` | ru | CLS 0.002 | CLS 0.000 |
| `/privacy` | none | CLS 0.000 | CLS 0.000 |
| `/terms`, `/accessibility` | he | same mechanism | CLS 0.000 |

## A harness bug found and fixed, NOT a product regression

The first regression run reported F3.1 at 100/104, failing on `/privacy` serving Hebrew
when the test had asked for Russian and for English. That was `_f31verify.mjs` being
stale: it sets a preference by writing `localStorage` and clearing `localStorage`, which
was the whole story before this change. It now has to clear the COOKIE too - otherwise
the previous loop iteration's `locale=he` survived, and the server honoured it exactly as
designed.

Worth stating plainly because the failure looked like the product breaking and was not:
the harness was asserting against a world that stopped existing one commit earlier. The
fix is in the harness; re-run reports 104/104.

## Note for whoever ships M1

`/privacy` now describes storage that does not exist, and will shortly describe the wrong
storage. All three locales currently say contact messages are kept in **Supabase
(PostgreSQL)**:

| locale | current text |
|---|---|
| he | `הודעות נשמרות בצורה מאובטחת בתשתית Supabase (PostgreSQL) עם שכבות אבטחה מתאימות.` |
| en | `Contact messages are stored securely using Supabase (PostgreSQL) with appropriate safeguards.` |
| ru | `Сообщения хранятся в защищенной инфраструктуре Supabase (PostgreSQL).` |

There is no database at all today, and M1 introduces **Neon**, not Supabase. The page also
mentions no cookies, while the site already ships a `viewMode` cookie and now a `locale`
one. Both are functional preferences rather than tracking, but the document should say so.
This is copy in three languages, so it needs the owner's approval rather than a silent
edit - and M1 forces the rewrite anyway.
