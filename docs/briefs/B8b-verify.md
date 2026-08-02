## VERIFY: B8b - Project windows as annular sectors

### HARNESS

`scripts/harness/b8b-ring.mjs` - puppeteer-core against system Chromium, one isolated
browser context per case. Loads /projects with `?ringprobe=1`, waits 10.5s for the
entry flight to settle, then measures the rendered DOM: inner-arc distance to the
planet centre, perpendicular distance from that centre to each straight edge, outer-arc
sagitta, `isPointInFill` on the rotated corners of every content box, text overflow,
and the cost of one full ring rebuild. Screenshots before and after a scroll.
Output (gitignored): `.harness-out/b8b/`.

### RUNS

| run | status |
|---|---|
| desktop 1440x900, he/en/ru | done, local production build |
| laptop 1280x800, he | done, local production build |
| mobile 390x844, he/en | done, local production build |
| deployed preview alias | **NOT RUN** - no Vercel CLI on this machine |
| low tier / CPU throttle | **NOT RUN** |
| high tier on a real GPU | **NOT RUN** - headless here is SwiftShader |

### MEASURED (local `next build` + `next start`, not the preview alias)

| # | criterion | target | measured | verdict |
|---|---|---|---|---|
| 1 | gap inner arc to limb constant | +/-4px | spread 0.00-0.01px over 21 samples per arc | PASS* |
| 2 | side edges radial through centre | within 2% of R | worst 0.005% of R | PASS |
| 3 | outer edge sagitta | > 3px | 14.08-15.42px desktop, 31.81px mobile | PASS |
| 4 | hairline unbroken, corners rounded | all four sides | single closed subpath per window (one M, one Z), stroked; 14px quadratic corner joins on all four corners; portrait thickness clamped so the outer arc cannot cross the viewport edge | PASS, structural + screenshots |
| 5 | text fully inside, three locales | no collision | all four rotated corners + centre of every content box inside the fill; 0 text overflow, 0 clipped inline boxes, he/en/ru | PASS |
| 6 | 60fps while scrolling, both tiers | 60fps | **NOT MEASURED.** Headless is SwiftShader, so the frame rate measures software 3D, not this layer. What is measured: one full ring rebuild costs 0.6-1.8ms, and it only runs when the limb or the scroll actually moved | UNVERIFIED |
| 7 | he/en/ru + mobile screenshots | attached | 12 PNGs (6 cases, static + scrolled) in `.harness-out/b8b/` | PASS |

\* see the first adversarial item below - criterion 1 needs reading with care.

### ADVERSARIAL SELF-CHECK

1. **Criterion 1 is close to a tautology.** The arc is emitted at r0 = R + gap, so any
   probe that reads R from the same source will report a constant gap whatever R is.
   The independent claim is that R is the RENDERED limb: it comes from fitting a circle
   to 8 projected silhouette points of the actual camera, published per frame. Proof it
   is not the design constant: design R = 306.0 at 1440x900, measured R = 336.2. An
   earlier build of this stage measured spread 0.01px against the design circle and was
   30px off the planet - the pixel evidence for that is the difference between the two
   he-desktop screenshots taken during this stage. A stronger test would read the limb
   from canvas pixels; not done.
2. **Stale build / wrong page.** Tested by accident: the first harness run hit a server
   left over from an earlier build and returned `no ring probe data` for all six cases
   rather than passing quietly. The probe fails loudly.
3. **Rotated corners measured as an axis-aligned rect.** The first version of the probe
   used `getBoundingClientRect` and reported `inside=false` everywhere. A rect-based
   test would FALSELY pass for a window sitting at the fan centre, where rotation is
   near zero; the off-centre windows are the control, and they are the ones that failed
   before the matrix-based corners were used.
4. **Locale leak between cases.** With a shared browser profile, the he-laptop case
   rendered Russian copy with an LTR camera while the DOM still read `dir=rtl`, putting
   the windows on the wrong side of the planet - and every geometric criterion still
   passed, because the shape was internally consistent. Fixed with one browser context
   per case. This also produced a real code change: the fan's side is now derived from
   the planet's projected centre rather than from `document.dir`.
5. **A settle mistaken for correctness.** The 9s settle was raised from 4s after the
   he-desktop case caught the camera still flying in (R = 267.7 instead of 336.2). The
   numbers did not change, but the screenshot did.

### VERDICT

**PARTIAL.** Criteria 1-5 and 7 pass on a local production build. Criterion 6 is
unverified and cannot be verified on this machine's headless renderer. Nothing here is
measured on the preview alias, which PART 2 makes the only reportable source, so none
of these numbers are final under the plan's own rules.

### REMAINING

- Deploy the branch preview and re-run the harness with `BASE=<alias> BYPASS=<token>`.
- Measure criterion 6 on a real GPU, high tier and CPU-throttled low tier.
- Owner ruling on the two open questions in the brief.
