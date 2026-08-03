# F4.1 - contact form delivery

Branch: `feat/f3-f4`. Alias:
https://elad-portfolio-git-feat-f3-f4-bobikobis-projects.vercel.app

## Goal

The contact form actually delivers to eladeladsaa@gmail.com, via Formspree, with the
provider secret in a server-side env var only. Validation, honeypot, rate-limit and
"no provider configured" paths all behave correctly and are proven without sending real
mail.

## Current state (read from the code, to be confirmed by measurement)

`src/app/actions/contact.ts` is already a proper server action and needs less work than
"TODO" suggests:

* trims and length-caps all three fields (80 / 120 / 2000)
* rejects `name < 2`, a non-matching email, `message < 10` -> `error: 'invalid'`
* honeypot field `company`: if filled, returns `success` and silently drops -> a bot is
  told nothing
* in-memory IP rate limit, 3 per 10 minutes -> `error: 'rate'`
* never echoes the message back to the client
* if `CONTACT_ENDPOINT` is unset in production it returns `error: 'unconfigured'` rather
  than pretending the message was delivered

So the only genuinely missing piece is the endpoint, plus two details the code cannot
know until a provider is chosen.

**Owner dependency:** the Formspree form and the `CONTACT_ENDPOINT` env var (Preview
AND Production) are created by the owner. Until that exists, no real send is possible
and none will be attempted.

## Recipe

1. **Formspree correctness (not a wording change).** Formspree returns a redirect to its
   HTML thank-you page unless the request asks for JSON. `fetch` follows redirects by
   default, so a failed submission could still surface as `res.ok` and the visitor would
   be told the message was sent when it was not. Add `Accept: application/json`, and read
   the JSON body so a Formspree-level rejection is treated as a failure.
2. **Test the four paths on the preview with no endpoint configured.** With
   `CONTACT_ENDPOINT` unset, a *valid* submission stops at `unconfigured` and never
   reaches a provider, so the rate limiter and validation can be exercised with zero real
   mail. Driven through the real form in a real browser, not by calling the action
   directly - a server action's identifier is an implementation detail and testing
   against it proves nothing about the form a visitor uses.
3. **Hold the single real end-to-end send** until the env var exists, then do exactly one,
   confirmed with the owner.

## Known defect to raise, not to fix unilaterally

The server distinguishes `invalid` / `rate` / `send` / `unconfigured`, and
`ContactForm.tsx` throws that away: every failure renders the same
`contact.error` string, "Sending failed. Try again or email directly." So a visitor who
mistyped an email, a visitor who hit the rate limit, and a visitor hitting an outage all
read the same sentence, and only one of them can act on it. Fixing it needs new strings
in three locales, which is a wording change - so it goes to the owner as a before/after
table first (standing rule 4) and is not pushed before approval.

## Acceptance (numeric)

| # | Criterion | Target |
|---|---|---|
| 1 | Submit name="a", bad email, message="hi" | form reports an error, stays on the form, no network call to any provider |
| 2 | Submit valid data with the honeypot `company` filled | success state shown, no provider call |
| 3 | Submit valid data, `CONTACT_ENDPOINT` unset | error state (`unconfigured`), no provider call |
| 4 | 4 valid submissions inside 10 minutes from one IP | the 4th is refused by the rate limiter |
| 5 | Message text never appears in any response body | 0 occurrences |
| 6 | After the env var exists: one real send | delivered to eladeladsaa@gmail.com, confirmed by the owner |
| 7 | Gates | `tsc` 0, `build` success, `eslint` 0 |

Criterion 4 carries a known caveat: the limiter is per serverless instance, in memory, so
consecutive requests may land on different instances and the 4th may be allowed. That is
a property of the current design, not a test failure - it will be reported as measured
either way, and there is an unmerged `security/hardening-may2026` branch that already
carries distributed rate limiting if the owner wants it.

## Verification plan

`_f41contact.mjs` drives the real form on the alias in a headed browser, with a request
interceptor recording every outbound request so "no provider call" is a measurement
rather than an assumption. Results to `docs/briefs/f4-1-verify.md`.

## Risks and rollback

* No production deploy is involved; the preview has no endpoint configured, so no mail
  can be sent by accident.
* The env var is owner-created and never enters git.
* Rollback is `git revert` of one commit.

## Open questions

1. The distinct-error wording above (blocking only that improvement, not the wiring).
2. Whether the owner wants the Formspree `_subject` line set, which is also new copy.
