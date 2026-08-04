# F4.2 verify - the chat AI-processing notice, and two things found next to it

Alias: https://elad-portfolio-git-feat-f3-f4-bobikobis-projects.vercel.app
Commit: ac15381 (`feat/f3-f4`), 2026-08-04
Harness: [scripts/harness/f4-chat-notice.mjs](../../scripts/harness/f4-chat-notice.mjs) -
headed Chrome on a real GPU, one page per locale, screenshots in `.harness-out/f4-chat-notice/`.

## The claim under test

The notice is absent from the initial page source. That is expected - the widget renders it
when the panel opens - but "expected" is not evidence, so it was opened the way a visitor
opens it and read off the screen.

## Result: PASS in all three locales

| locale | route | http | in initial source | notice found | visible | box | position |
|---|---|---|---|---|---|---|---|
| he | `/he` | 200 | no | yes | yes | 294x15 @ (37,726) | below the input |
| en | `/` | 200 | no | yes | yes | 294x30 @ (943,695) | below the input |
| ru | `/ru` | 200 | no | yes | yes | 294x30 @ (943,695) | below the input |

Visible means: non-zero box, `display`/`visibility` not hiding it, opacity 1, and the whole
element inside the viewport - not merely present in the DOM. Each string matched the
approved wording exactly. The Hebrew panel renders at the left edge (x=37) because the
widget flips with `dir=rtl`; English and Russian sit right (x=943). 11px, opacity 1.

**One correction to the request:** the notice sits *below* the input, not above it - it is
in the panel footer, between the input row and the Turnstile slot. It is adjacent to the
input, on screen, without scrolling, in all three locales, which is what "at the point of
use" requires. Reported rather than silently moved, since the placement was specified.

Route note: the root serves **English**; Hebrew is `/he`. The first harness run mapped
Hebrew to `/` (copied from the F2 harness) and produced a false FAIL. Fixed, re-run, and
recorded here because the corrected map is what the next harness should copy.

## Finding 1 - the chat widget is switched off, in every environment

`sendDisabled=true` and the "chat is switched off" line render in all three locales.
The cause is in the component, not the deployment:

- [ChatWidget.tsx:264](../../src/components/ui/ChatWidget.tsx#L264) gates the send button on
  `!turnstileToken`, and a token can only ever be set by the Turnstile callback at
  [:125](../../src/components/ui/ChatWidget.tsx#L125), which only runs when
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` exists.
- That key is **absent from both Preview and Production**. So the button is permanently
  disabled and the panel shows `errOffline` to every visitor.

This collides with the privacy rewrite. Section 6 describes a working widget ("messages you
type are sent to an AI provider"), and ruling 4 established that Turnstile is *not* live at
launch. Both cannot be true: with no site key there is no chat at all. Either the widget
gets a no-Turnstile path (send enabled, server-side rate limit doing the work), or the key
goes live, or section 6 stops describing a feature that cannot run. **Owner decision.**

`GEMINI_API_KEY` is present and no Kimi/Moonshot key is set, so section 6's fallback clause
("on any deployment configured without a Kimi key, Google Gemini is used instead") is
literally true today - that wording holds up.

## Finding 2 - the Neon database is in the wrong region

Read from the project's own environment (`vercel env pull`, both scopes):

| | Preview | Production |
|---|---|---|
| `DATABASE_URL` | present | present |
| Neon project | `shy-glitter-96697762` | `shy-glitter-96697762` (the same one) |
| region | **us-east-1** | **us-east-1** |

The gate for M1 was eu-central-1. It is not met:

1. Privacy section 3 names eu-central-1 (Frankfurt) as where enquiries are stored. Shipping
   it against a us-east-1 database makes the page false on its first day - the exact fault
   the rewrite exists to correct.
2. `vercel.json` pins functions to `fra1` specifically to sit next to that database. Against
   us-east-1 the pin buys a transatlantic round trip per query instead of saving one.

Preview and Production also share one database, so preview writes land in production data -
including the M1.2 acceptance test, which backdates and deletes a row.

Nothing is stored yet, so recreating the Neon project in eu-central-1 costs nothing today
and is a migration later. **M1 is blocked on this**, by the owner's own gate.
