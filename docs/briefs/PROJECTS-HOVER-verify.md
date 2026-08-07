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

---

## ROUND 2 - the review's two findings, and the owner's ruling on the panel

Re-measured 2026-08-07 on the same branch alias, now serving deployment
`elad-portfolio-cvgfr3v7z`, built from commit `060fc61` - confirmed by asking Vercel for the
deployment whose `githubCommitSha` is that commit, rather than by matching a string in a
chunk. (The first attempt watched for a local variable name; minification renames those, so
the watcher would have waited forever on a build that had already shipped.)

`060fc61` is the merge of `origin/master` into this branch - master had moved on with PR #32
(PERF-2 and the em-dash pass). One conflict, in a comment line, resolved by keeping both
sides' meaning.

### The two P2s from the code review, both correct, both fixed

| finding | measured before | after |
|---|---|---|
| **hover goes stale when the ring scrolls under a parked cursor** - `hovered` was only recomputed on `pointermove` | cursor parked on a window, fan scrolled 220px: panel still named `"Yaar Ad…"` while `"CEOS…"` was under the cursor | panel names `"CEOS…"` - the window actually under the cursor. `rehover=true` |
| **the armed tap lost to the mouse fallback on a hybrid** - `mouseSeen` was tested before `tapped` | a real mouse move, then a touch tap: panel empty, first tap gave no feedback at all | panel names the tapped project. `hybrid=true arm=true` at 1440x900 with both inputs |

The re-hit-test runs against the **damped** ring position, not the container's `scrollTop`.
The raw value jumps in a single frame while the windows are still travelling, so testing it
ran the hit test once, before anything had moved, and found the same window - measured that
way first, and it read as a pass.

A mouse that MOVES now also gives the panel back from an armed tap, so on a hybrid the two
inputs cannot both hold it.

### The owner's ruling: the panel travels along the disc

The words stay on the planet and slide along it toward the window they describe, damped at
`SLIDE_TAU = 0.16s` against the ring's `0.085s` - they are read while they move.

| | measured, 1440x900 |
|---|---|
| travel between the centred window and a hovered one | **162.1px** on the alias (168.7 local, 170.8 on an earlier build - it tracks the live limb, so it is not a fixed number) |
| still on the disc | **true** - within `0.45R` of the planet's centre plus the panel's own half-height |
| the panel clears the navbar | **true**, 7/7 cases |
| inside the viewport | **true**, 7/7 cases |

Bounded by the window's position **within the fan**, not by its distance from the disc's
centre: at 1440x900 the whole fan hangs below the centre, so clamping the raw distance
pinned every window to the same bound and the panel travelled **0.8px** between two windows
130px apart. That was the first implementation, and the harness caught it.

### Ring geometry, unchanged by any of it

Same harness, same 7 cases, alias at `060fc61`: `axisRatio` **0.498/0.498**, `major`
**-34.4x**, `fan` **35/5.8** landscape and **20.8/20.8** portrait, painted text boxes **0**,
copy in DOM **12**. Identical to the production control.

### A third instrument defect, found and fixed this round

`b8d-ring.mjs` chose its hover point **immediately after the scroll sweep**, while the ring
was still damped and travelling. The cursor landed where a window had been a moment earlier,
and the panel - which now correctly re-hit-tests under a parked cursor - showed nothing. The
harness reported `panel -> ""` on three desktop cases and it looked exactly like a broken
hover. It now lets the ring settle first, **and records which window is under the cursor at
read time**, so a pass cannot be claimed for a pointer sitting over empty space:
`follows=true` in **7 of 7** cases, each against the window actually under the cursor.

That is the third harness defect in this stage, after the `parentElement.contains` false
positive and the bounding-box-centre sample. All three reported confidently.

### Still not covered

Everything listed at the end of round 1 stands. Added: **how far the panel should travel is
a judgement, not a measurement.** 162px between two windows is what the current bound gives;
whether that reads as "following the window" or as "too much movement" is for the owner to
say on the live preview.
