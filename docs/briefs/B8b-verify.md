## VERIFY: B8b - Project windows as annular sectors

### HARNESS

`scripts/harness/b8b-ring.mjs` - geometry. puppeteer-core against system Chromium, one
isolated browser context per case. Loads /projects with `?ringprobe=1`, waits 10.5s for
the entry flight to settle, then measures the rendered DOM: inner-arc distance to the
planet centre, perpendicular distance from that centre to each straight edge, outer-arc
sagitta, `isPointInFill` on the rotated corners of every content box, text overflow, and
the cost of one full ring rebuild. Screenshots before and after a scroll.

`scripts/harness/b8b-fps.mjs` - criterion 6. Same page on the REAL GPU
(`--use-gl=angle --use-angle=vulkan`, verified renderer string), 4s of continuous
ring scrolling per case, reporting the frame-interval distribution rather than an
average. Two tiers: untouched, and CDP `Emulation.setCPUThrottlingRate` 6x. Also
asserts the tier law by diffing the published ring geometry between tiers.

Output (gitignored): `.harness-out/b8b/`, `.harness-out/b8b-fps/`.

### RUNS

| run | status |
|---|---|
| desktop 1440x900, he/en/ru | preview alias |
| laptop 1280x800, he | preview alias |
| mobile 390x844, he/en | preview alias |
| criterion 6, desktop + mobile, high tier (Intel RPL-P) | preview alias |
| criterion 6, desktop + mobile, low tier (6x CPU throttle) | preview alias |

Alias: `elad-portfolio-git-feat-cosmic-r1-r2-bobikobis-projects.vercel.app`, commit
`f11f3aa`, reached with the protection-bypass header.

### MEASURED (deployed preview alias)

| # | criterion | target | measured | verdict |
|---|---|---|---|---|
| 1 | gap inner arc to limb constant | +/-4px | spread 0.00-0.01px over 21 samples per arc | PASS* |
| 2 | side edges radial through centre | within 2% of R | worst 0.006% of R | PASS |
| 3 | outer edge sagitta | > 3px | 14.16-15.51px desktop, 31.92px mobile | PASS |
| 4 | hairline unbroken, corners rounded | all four sides | single closed subpath per window (one M, one Z), stroked; 14px quadratic corner joins on all four corners; portrait thickness clamped so the outer arc cannot cross the viewport edge | PASS, structural + screenshots |
| 5 | text fully inside, three locales | no collision | all four rotated corners + centre of every content box inside the fill; 0 text overflow, 0 clipped inline boxes, he/en/ru | PASS |
| 6 | 60fps while scrolling, both tiers | 60fps | high tier 60.0 / 59.5 fps (desktop / mobile), low tier 59.8 / 60.0 fps. Worst single frame 33.4ms; frames over 33ms: 0%, 0.4%, 0.8%, 0%. One full ring rebuild costs 0.5-1.8ms | PASS |
| 7 | he/en/ru + mobile screenshots | attached | 12 PNGs in `.harness-out/b8b/`, 4 more in `.harness-out/b8b-fps/` | PASS |

Tier law (L2): ring geometry between high and low tier differs by 0.35px desktop and
3.60px mobile, and every difference is in R alone - r0, r1, rMid, dHalf, fan, th0 and the
content box all derive from it. That is the pose's own micro-drift sampled at two
different phases across two page loads, not a tier-dependent composition; it sits inside
the vantage breath the plan already lists as deferred (6.8px on Saturn).

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
6. **Criterion 6 measured on a page with no scene on it.** This one actually happened.
   The first GPU run used `--use-gl=angle --use-angle=gl-egl` and reported a flawless
   60fps, median 16.7ms and worst 16.8ms on all four cases INCLUDING 6x CPU throttling -
   an impossible result that looked like a clean pass. WebGL had failed to initialise, so
   the page was DOM only. Caught because the published ring R was exactly 306.0, the
   design constant to the decimal, which the live silhouette fit never returns. The
   harness now refuses to measure at all unless R differs from the design value, and the
   flag set is pinned with the probe results that justify it.
7. **CPU throttling that never applied.** Low tier is only meaningful if the throttle is
   live during the sample; it is sent over CDP before the run and the worst frame does
   move with it (16.8ms high vs 33.3ms low on desktop), so it is taking effect.

### VERDICT

**PASS.** All seven criteria measured on the deployed preview alias, criterion 6 on the
machine's real GPU at both tiers.

### REMAINING (owner decisions, not defects)

- Ruling on the two open questions in the brief: the read-only `publishLimb` addition to
  `CameraRig.tsx` under PART 5.2, and whether 2-3 windows on desktop / 1 on mobile at
  +/-35deg is accepted or the thickness and fan should be retuned.
