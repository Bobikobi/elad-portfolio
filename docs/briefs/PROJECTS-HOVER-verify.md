## VERIFY: PROJECTS-HOVER - pointer input reaches the windows, and the two-stage tap

Measured 2026-08-05 on the deployed preview alias, never on localhost:

`https://elad-portfolio-git-feat-projects-hover-touch-bobikobis-projects.vercel.app`
(deployment `dpl_H7wtsJCsMZ1afwhyMe32DUzp9A1V`, branch `feat/projects-hover-touch`, commit
`4218278`).

Control for every number below: **the same harness, the same viewports, against
production** (`www.eladsaadon.dev`, commit `1d057ed`).

### Which deploy answered - checked by a value the build changes, not by elapsed time

`elementsFromPoint` appears in `_next/static/chunks/01dqfekl-n7on.js` on the alias, and in
**none** of production's chunks. The alias is serving this branch's code.

GPU, asserted before believing any frame rate: `ANGLE (Intel, Vulkan 1.4.305 (Intel(R) G…)`
- a real device, not SwiftShader.

### THE DEFECT, before and after

`scripts/harness/b8d-ring.mjs`, 7 cases (he/en/ru at 1440x900, he at 1280x800, he/en/ru at
390x844). The pointer is moved onto a project window and the panel is read.

| | production | this branch |
|---|---|---|
| panel text after hovering a window | `""` in **7 of 7** | the hovered project's title in **7 of 7** |
| he-desktop | `"OpenClaw…"` → `""` | `"OpenClaw…"` → **`"CEOS - CEOs Israel Website"`** |
| en-desktop | `"OpenClaw…"` → `""` | `"OpenClaw…"` → **`"CEOS - CEOs Israel Website"`** |
| ru-desktop | `"AI Visual Web Scraper"` → `""` | `"OpenClaw…"` → **`"CEOS - Сайт CEOs Israel"`** |
| he-laptop 1280x800 | `"OpenClaw…"` → `""` | `"OpenClaw…"` → **`"CEOS - CEOs Israel Website"`** |

On the three 390x844 cases the hovered window is also the centred one, so the panel text is
the same before and after by construction; those rows prove nothing either way and are not
counted above.

### THE ACCEPTANCE, criterion by criterion

`scripts/harness/projects-tap.mjs`, 5 cases. Every tap dispatched as a real touch through
`Input.dispatchTouchEvent`; every click as a real mouse press.

| # | criterion | verdict | measured |
|---|---|---|---|
| 1 | first tap arms, does not enter | **PASS** | 4/4 touch cases: `window.open` calls **0**, panel = the tapped project's title. On he-desktop-touch the panel moved from the centred `"CEOS…"` to the tapped `"Yaar Ad…"` - the arming is doing the work, not the centred fallback |
| 2 | second tap on the same window enters | **PASS** | 4/4: exactly **1** `window.open`, with that project's `liveUrl` |
| 3 | tap *i* then *j* shows *j* and enters nothing | **PASS at 1440x900 with touch**, **NOT RUNNABLE on a phone** | panel `"Yaar Ad…"` → `"CEOS…"`, `window.open` calls **0**. In portrait only **1** window is hit-testable, so the case cannot exist there - that is queue ruling #3, not a result |
| 4 | scrolling the fan gives up the armed window | **PASS** | 4/4 touch cases: after a 260px scroll the panel returns to the centred project (`"Yaar Ad…"` → `"CEOS…"`, and `"…"` → `"CEOS Method…"` on he-desktop-touch) |
| 5 | a mouse still opens on the first click | **PASS** | he-desktop: click 1 → 1 open, click 2 → 2 opens. Separately, 3 consecutive clicks on the alias → **3** opens |
| 6 | no regression to the ring geometry | **PASS** | same harness, production vs alias: `axisRatio` 0.498/0.498 both, `major` -34.4x both, `fan` 35/5.8 both, `painted text boxes` **0** both, `copy in DOM` **12** both. Differences are in the third decimal, which is the planet's live drift |
| 7 | all three locales | **PASS** | criteria 1, 2 and 4 measured in he, en and ru |
| 8 | hover puts *that* project in the panel | **PASS** | the table above, 4/4 desktop and laptop cases |
| 9 | the hit-test reaches the shape | **PASS** | `elementsFromPoint` at the sampled point contains a sibling of that window's body path in 5/5 cases; on production the stack's top element is `div.ring-scroll` and no hit group is in it |

Cost of the per-`pointermove` hit test, measured under continuous mouse motion across a
window for 3 seconds at 1440x900, on a real GPU:

| | frames | median frame | p95 | fps |
|---|---|---|---|---|
| production | 232 | 16.7ms | 25.8ms | 59.9 |
| this branch | 225 | 16.8ms | 26.2ms | 59.5 |

0.1ms of median frame time. `elementsFromPoint` forces a style/layout flush, which was the
reason to measure it rather than assume.

### ADVERSARIAL SELF-CHECK - six ways this could be falsely passing, each actually tested

1. **A synthesized mouse event would pass every assertion while never entering the touch
   branch.** The gate only runs for `pointerType` of `touch`/`pen`. The page records the
   `pointerType` of every press that reaches the stage, and the harness **fails the case**
   unless it is exactly `touch` on the touch cases and `mouse` on the mouse case. Output
   carries it per case: `ptr=touch`, `ptr=mouse`.
2. **The harness's own hit-test could be a false positive - and it was.** The first version
   accepted a point if `el.parentElement.contains(bodyPath)`, which is true for the scroll
   container, because the container and the `<svg>` share the layer wrapper. That defect is
   precisely what let the original source audit conclude "hover works". It now requires an
   element in the `elementsFromPoint` **stack** whose parent is that window's own `<g>`.
3. **`b8d-ring.mjs` had the same defect and would have kept reporting a working hover as
   broken and a broken one as working.** It hovered the *bounding-box centre* of the middle
   path in DOM order - a point that is usually in the annulus's hole, on a path that is
   often one of the eleven scrolled off the fan with a zero-size box. Fixed here: it filters
   to paths with a real box and scans for a point genuinely on the sector. Both fixes are in
   this commit, and the before/after table above is measured with the fixed instrument on
   **both** sides.
4. **"Nothing opened" could mean "the press missed the shape", not "the gate refused".**
   Every press now records which window was under the point **at the moment of dispatch**
   (`under`). First tap: `under=0`, opens `0`. Second tap: `under=0`, opens `1`. An earlier
   run showed a mouse's second click not opening; `under` was what proved it was a point on
   the sector's edge that the planet's drift had moved off, an instrument problem, and the
   sample point is now required to survive a ±8px cross before it is used. After that, 3
   clicks → 3 opens, repeatedly.
5. **The numbers could come from a stale deploy.** Checked by a string the build changes -
   see above - not by elapsed time.
6. **The panel could hold the right text while being invisible.** The reader returns `""`
   when the panel's computed `opacity` is below 0.5, which is exactly what it returns on
   production. A pass therefore cannot come from leftover text in a hidden element.

### WHAT IS NOT COVERED

- **Criterion 1 says "12/12 windows". It cannot be met and was not claimed.** Only **1**
  window is hit-testable at 390x844 and **2** at 1440x900. That is the standing ruling on
  window count (queue item 3), measured again here.
- **Pen is treated as coarse.** A stylus gets the two-stage tap. Untested - no pen device.
- **Keyboard and reduced-motion paths are unchanged** and were not re-measured: focus still
  goes through the off-screen anchors, which this commit does not touch.
- **A real phone.** Everything here is Chromium's touch emulation on a laptop. iOS Safari's
  synthetic-click behaviour after a `touchend` is not covered by any of it.
- **The overlay-follows-the-pointer question is still open** - see the end of the brief. What
  is measured here is the panel parked on the planet, which is what the site does today.
