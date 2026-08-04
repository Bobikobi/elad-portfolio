# M1 verify - lead capture, the retention deleter, and the privacy text

Alias: https://elad-portfolio-git-feat-admin-leads-db-bobikobis-projects.vercel.app
Commit: e36b67f (`feat/admin-leads-db`), 2026-08-04
Harnesses: [m1-lead-capture.mjs](../../scripts/harness/m1-lead-capture.mjs) (browser → server
action → Neon), plus direct calls against the deployed cron route.

**Verdict: every criterion passes on the alias. NOT MERGEABLE - the database is in the
wrong region.** See "The blocker" at the end.

## 1. A real submission lands in the database

Filled the actual form on `/he/contact` in a real browser, clicked submit, then read the
row back out of Postgres:

```bash
hidden fields in the form: {"locale":"he","sourcePath":"/he/contact"}
rows found in the database: 1
id=3 locale=he source_path=/he/contact source_form=contact interest=other
success state shown to the visitor: true
```

The two context fields section 1 of the privacy policy discloses - which page the enquiry
came from, and which language it was written in - arrive as sent. The visitor sees the
success state, not the old `unconfigured` error. The test row was deleted by the harness.

## 2. The retention deleter - both acceptance criteria

| criterion | result |
|---|---|
| a row backdated past the window is gone after one cron run | **PASS** |
| an unauthenticated call is refused and deletes nothing | **PASS** |

```text
seeded backdated row: {"id":2,"created_at":"2024-07-04T07:40:25.137Z"}   (25 months old)
present before cron:  STILL PRESENT
cron run:             200 {"ok":true,"leadsDeleted":1,"hashesPruned":0,"ms":193}
after cron:           DELETED

no auth:       401 {"error":"unauthorized"}
wrong bearer:  401 {"error":"unauthorized"}
before CRON_SECRET existed: 503 {"error":"not_configured"}   (fail-closed, as specified)
```

Logging is counts only (`leadsDeleted`, `hashesPruned`, `ms`) - auditable without the log
becoming a copy of what it deleted.

## 3. The privacy text, server-rendered in all three languages

`/privacy` with each locale cookie, asserted off the wire:

| locale | http | `<html lang>` | old Supabase claim | section 7 present | eu-central-1 |
|---|---|---|---|---|---|
| en | 200 | en | gone | yes | yes |
| he | 200 | he | gone | yes | yes |
| ru | 200 | ru | gone | yes | yes |

Note: there is no `/he/privacy` or `/ru/privacy` route - both 404. The page lives at
`/privacy` only and renders per locale from the preference, which is how it was already
built. Worth knowing before anyone links to a localized privacy URL.

## 4. The chat widget actually answers now

Against the f3-f4 alias, off the wire:

```text
POST /api/chat -> 200 {"text":"Elad builds real, working web apps, AI-powered tools, ..."}
X-RateLimit-Remaining: 9
```

Before the fix this returned `captcha_missing` for every request and the send button was
disabled in the browser regardless.

## What the verification caught that reading the code did not

**`CREATE TABLE IF NOT EXISTS` is not a schema migration.** The database already held a
partial `leads` table from an earlier attempt - no `phone`, `interest`, `source_form`,
`first_touch_path`, `priority`, `consent_at`, `unsubscribed_at`. The create statement
reported success and changed nothing, and the first INSERT failed on a missing column. In
production that is a visitor being told their message could not be sent, with a green
deployment and a clean typecheck. Fixed in e36b67f: every column is also applied with
`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, for both tables, as the plan originally
specified. The failure was invisible until a row was actually inserted.

## The blocker

`DATABASE_URL` resolves to Neon project `shy-glitter-96697762` in **us-east-1**, shared by
Preview and Production. Privacy section 3 names eu-central-1 (Frankfurt) and `vercel.json`
pins functions to `fra1` to sit beside it. Shipping this way makes the page false on its
first day and the region pin pointless.

Owner ruling: recreate the Neon project in eu-central-1 with a separate branch for Preview.
Everything above then needs one re-run against the new database - the same two harnesses,
same criteria - and M1 can merge.
