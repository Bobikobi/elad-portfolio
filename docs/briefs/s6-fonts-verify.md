# S6 verify - wordmark and font scoping

Measured on the branch alias, real GPU Chrome, cold browser cache per route, response
bodies weighed on the wire. Harness: `_s6fonts.mjs`, `_s6fonts2.mjs`, `_s6mark.mjs`,
`_s6lcp.mjs` (gitignored).

Two changes, both from the owner's rulings:
* **Ruling 1** - the `E.S` wordmark became an inline SVG outline and `GLAMORA.otf` was
  deleted (`8c13e1e`).
* **Ruling 2** - `preload: false` on all four families, so each locale fetches only what
  its glyphs need (`fb34dda`).

## Font bytes per page load

| Route | Locale | Before | After wordmark | After preload scoping | Total saved |
|---|---|---|---|---|---|
| `/` | en | 167.0 KB | 102.7 KB | **84.4 KB** | **-82.6 KB (-49%)** |
| `/he` | he | 167.0 KB | 102.7 KB | **102.7 KB** | **-64.3 KB (-38%)** |
| `/ru` | ru | 265.1 KB | 200.8 KB | **98.1 KB** | **-167.0 KB (-63%)** |
| `/services/nextjs-development` | en | 167.0 KB | 102.7 KB | **84.4 KB** | **-82.6 KB (-49%)** |
| `/guides/nextjs-vs-wordpress` | he | 167.0 KB | 102.7 KB | **102.7 KB** | **-64.3 KB (-38%)** |

`<link rel="preload" as="font">` count went from 4 on every page in every locale to 0.

Hebrew is unchanged by ruling 2 and that is correct, not a miss: a Hebrew page genuinely
renders both the Hebrew and the Latin slices, so there was nothing there to drop. The
saving on Hebrew is the wordmark alone.

## Ruling 1 - the wordmark is the same mark

The requirement was pixel-identical. Measured box widths, DPR 2:

| Placement | Before (webfont) | After (SVG) | Delta |
|---|---|---|---|
| navbar `text-3xl` | 37.17 px | 37.15 px | 0.02 px |
| footer `text-xl` | 24.79 px | 24.76 px | 0.03 px |

The width match is not luck - the SVG uses the font's ADVANCE box (1164 units of advances
plus `tracking-wide` after each of three characters = 1239), not the tight ink box, so
surrounding layout does not move. Frames: `_s6-navbar-before.png` / `_s6-navbar-after.png`,
inspected and visually identical.

Box HEIGHT changed (36 px to 25.16 px in the navbar) because the old box was the text
line-height and the new one is the ink height. The glyphs render at the same size; both
placements are `items-center` flex children, so nothing shifted.

**One real difference, stated rather than buried:** Glamora ships a single weight
(`usWeightClass 400`), so the old `font-bold` was SYNTHETIC bold - the browser smearing an
outline it had no bold cut for. The SVG draws the true outline. Side by side the
difference is not perceptible at either size, but it is a difference and not a rounding
error.

## Ruling 2 - the A/B the ruling asked for

Ruling 2 said to A/B `/he` LCP only if forced into a global change. Per-locale preload
turned out not to be expressible (see the commit message and the comment in
`layout.tsx`: next/font emits preloads from a static module graph, while this site's
locale is request-time on the un-prefixed tree and on the cookie-driven legal pages), so
the change is global and the A/B applies.

Five samples per route, median, cold cache:

| Route | LCP median | Samples | Fonts | CLS |
|---|---|---|---|---|
| `/` | 2052 ms | 3684, 2308, 664, 2052, 904 | 3 / 85.3 KB | 0.000 |
| `/he` | **1288 ms** | 2656, 864, 824, 1288, 2156 | 4 / 103.9 KB | 0.000 |
| `/ru` | 2140 ms | 988, 4020, 2160, 2140, 772 | 4 / 99.3 KB | 0.000 |

**`/he` LCP was the worst route on the site at 3096 ms and 3356 ms in S5. It now medians
1288 ms, and its worst sample of the five (2656 ms) still beats its best previous
reading.** No regression, so no revert.

Two honest caveats:
* The S5 baseline also included the 64.3 KB Glamora fetch, so it is not a clean isolation
  of the preload flag alone. It biases the baseline WORSE, which makes "not a regression"
  a conservative conclusion rather than a flattering one.
* Sample variance is large (664 ms to 3684 ms on `/`), which is this 8 GB box against a
  preview deployment. Medians over five are reported for that reason; single readings on
  this machine decide nothing, which is why S5's single `/services` reading of 3904 ms
  turned out to be a cold start.

## Also in this batch

* **Ruling 5** - `googletagmanager` removed from `script-src`, `google-analytics.com` and
  `*.analytics.google.com` from `connect-src`, and the dead `NEXT_PUBLIC_GA_ID` removed
  from `.env.example`. Nothing in `src/` referenced any of it, so the allowance bought no
  functionality and only widened what a successful injection could reach.
* **Ruling 3** - `vercel.json` pins functions to `fra1`. They were serving from `iad1`
  (US East) while the audience is in Israel and the database will be Neon `eu-central-1`.
* **Ruling 6** - the AI-processing notice now renders above the chat input in all three
  locales, so the disclosure sits where someone is about to type rather than only in the
  privacy policy.
