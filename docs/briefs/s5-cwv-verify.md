# S5 - Core Web Vitals per route (measured)

Measured on the branch alias, real GPU Chrome (`--use-angle=d3d11`), 1440x900, cold
browser cache before every route, two full samples. Harness: `_s5cwv.mjs`, `_s5cls.mjs`,
`_s5cls2.mjs` (gitignored).

**This is LAB data.** One machine, one network, a preview deployment, and a box with
~2-3 GB of commit headroom. Speed Insights is the field answer and needs production
traffic. What lab data can settle is the question actually asked - whether a WebGL
homepage is quietly terrible - and it does.

## Results (sample 2; sample 1 in the notes below)

| route | kind | LCP | CLS | TBT | FCP | TTFB | transfer |
|---|---|---|---|---|---|---|---|
| `/` | home, WebGL galaxy | 1004ms good | 0.000 good | 1123ms POOR | 840ms | 100ms | 284KB |
| `/he` | home he, RTL + WebGL | 3356ms **needs work** | 0.000 good | 1117ms POOR | 1456ms | 736ms | 1035KB |
| `/about` | section, WebGL world | 1000ms good | 0.000 good | 3510ms POOR | 1000ms | 477ms | 7052KB |
| `/services` | section, WebGL world | 1976ms good | 0.002 good | 3192ms POOR | 1976ms | 888ms | 5979KB |
| `/services/nextjs-development` | classic marketing page | 984ms good | 0.000 good | 2991ms POOR | 984ms | 200ms | 5957KB |
| `/guides/nextjs-vs-wordpress` | classic article | 1920ms good | 0.000 good | 1220ms POOR | 1920ms | 1174ms | 1023KB |
| `/privacy` | classic legal page | 1012ms good | **0.279 POOR*** | 547ms needs work | 1012ms | 205ms | 1028KB |

\* conditional - see the finding below. Thresholds: LCP 2500/4000ms, CLS 0.1/0.25,
TBT 200/600ms.

## The headline

**LCP is not the problem, and the WebGL homepage is not the villain.** `/` reaches LCP in
about a second. The two real findings are elsewhere.

### Finding 1 - TBT is POOR on every route, including pages with no 3D content

1.1s to 3.5s of main-thread blocking, reproducible across both samples. Note `/privacy`
and `/services/nextjs-development` are ordinary content pages, and
`/services/nextjs-development` still transfers ~6 MB and blocks for ~3s. The cause is
structural: `CosmicStage` is mounted in `ClientProviders`, so the persistent WebGL canvas
loads on *every* route, and a visitor who arrives on a marketing page from Google pays
the full 3D cost to read text.

TBT is not itself a Core Web Vital, but it is the lab proxy for INP, and numbers this
size predict a poor INP. This is the single largest performance item on the site.

**It is scene-lane territory** (`components/scene/**`, `ClientProviders`), so this is a
measurement handed over, not a change made. The obvious lever is not loading the canvas
on routes that never show it.

### Finding 2 - CLS 0.279 on the legal pages, but only in Hebrew and only on a cold cache

Reproduced twice, then isolated:

| stored preference | cache | `<html>` | CLS |
|---|---|---|---|
| none | cold | `lang=en dir=ltr` | 0.000 |
| **he** | **cold** | `lang=he dir=rtl` | **0.279** |
| ru | cold | `lang=ru dir=ltr` | 0.002 |
| he | warm | `lang=he dir=rtl` | 0.000 |

Shift sources: the navbar control row (`div.flex.items-center`, the view/language
switcher) and a body heading (`h2 "הזכויות שלך"`).

The mechanism is a direct and honest cost of the F3.1 rule. `/privacy`, `/terms` and
`/accessibility` are the "one URL, every language" routes, so they follow the visitor's
stored preference - but the SERVER cannot see `localStorage`, so it renders English LTR,
and the client then flips the entire document to RTL after hydration. Russian scores
0.002 by the same path because its text swaps without the direction changing; Hebrew pays
0.279 for the LTR to RTL reflow. Every other route is pinned by its URL and is unaffected
- the guides measured 0 shifts because the proxy already pins them to Hebrew.

Two false starts are worth recording, because each looked like an answer:
* Measuring with the observer installed after `domcontentloaded` was blamed first. It was
  not the cause; installing it via `evaluateOnNewDocument` reported 0.000 - because that
  run also happened to have a warm cache.
* "The order of routes stored a Hebrew preference" was the second guess, and only half
  right. A stored Hebrew preference is necessary but not sufficient: with a warm cache
  the same visit measures 0.000. It needs the cold cache too.

**Recommended fix (not applied - not on the before-launch list):** write the locale to a
COOKIE alongside `localStorage`. The proxy already resolves the locale server-side via
`localeForPath`; when that returns null it could read the cookie instead of defaulting to
English, and the legal pages would render in the right language and direction on the
first paint. No URL changes, no new routes, and it removes the flip for all three pages
at once. It is also the mechanism the original F3 brief assumed when it said "a
first-time visitor with no cookie".

### Non-findings, so they are not chased later

* `/services` measured TTFB 2608ms / LCP 3904ms in sample 1 and 888ms / 1976ms in sample
  2. That was a cold serverless start, not a property of the page.
* `/he` LCP is consistently ~3.1-3.4s against ~1.0s for `/`. Both samples agree, so this
  one is real and worth a look: the Hebrew home is the only route whose LCP is outside
  "good". Likely the Hebrew display font on the largest text element.

## Sample 1 (for variance)

| route | LCP | CLS | TBT | TTFB |
|---|---|---|---|---|
| `/` | 1012ms | 0.000 | 1727ms | 66ms |
| `/he` | 3096ms | 0.000 | 1345ms | 158ms |
| `/about` | 896ms | 0.000 | 3737ms | 139ms |
| `/services` | 3904ms | 0.002 | 2712ms | 2608ms |
| `/services/nextjs-development` | 948ms | 0.000 | 2761ms | 178ms |
| `/guides/nextjs-vs-wordpress` | 940ms | 0.000 | 507ms | 147ms |
| `/privacy` | 1356ms | 0.279 | 380ms | 460ms |
