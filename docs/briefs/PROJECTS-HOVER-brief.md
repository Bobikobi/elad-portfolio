## BRIEF: PROJECTS-HOVER - reconciling the queued item against what is already live

> Written 2026-08-05, before implementing. Not back-dated.

### THE HANDOFF IS STALE ON ITS CENTRAL PREMISE

`HANDOFF-2026-08-05.md` queues PROJECTS-HOVER as "this behaviour already exists, built as
B8d on `feat/b8c` - reconcile that work into the current live layout", and lists
"retarget PR #24" as an open item. Both were overtaken before this session started:

- **PR #24 is MERGED** into `feat/cosmic-r1-r2`, and **PR #30 merged that into `master`**.
- `git diff origin/master feat/b8c -- src scripts` is **empty**. The lane branch is three
  commits ahead of master and all three are docs or merges. There is nothing to port.
- Production confirms it: `https://www.eladsaadon.dev/he/projects` returns **12**
  `a.ring-card.sr-only` anchors, **24** `data-window` attributes and **8** `data-preview`
  values (the other four are the monogram fallback). B8d is live.

So PROJECTS-HOVER is not a port. It is a **gap audit against the stated acceptance**, and
the audit finds exactly one behaviour missing and one design disagreement.

### CURRENT STATE, against the acceptance as written in the handoff

Read off `src/components/worlds/ProjectsStage.tsx` and `ProjectsWorld.tsx` at `1d057ed`,
which is the commit production is serving.

| requirement | state | where |
|---|---|---|
| image fills the window, no text inside it | **met** - the `<image>` is painted into the sector and clipped to it; the only glyphs inside a window are the monogram for the four projects with no screenshot | `ProjectsStage.tsx:160-195` |
| description appears on hover (desktop) - title, description, tech chips, glass tokens | **met** | `ProjectsStage.tsx:513-524` |
| overlay **follows the hovered window** | **NOT met, and deliberately so** - see the open question | `ProjectsStage.tsx:526-539` |
| with no pointer, the centred window's text shows | **met** - `mouseSeen` gates it on a mouse actually moving, not on a media query | `ProjectsStage.tsx:108-117, 517` |
| full text in the DOM, visually hidden, for crawlers and screen readers | **met** - a real `<a>` per project with `h2` / `p` / `ul`, `sr-only`, all 12 present in the production HTML | `ProjectsWorld.tsx:64-86` |
| all three locales | **met** - copy comes from `constants.ts` per locale; the monogram picks one script so a mixed title cannot produce "Oמ" | `ProjectsWorld.tsx:14-29` |
| touch: **tap once shows the overlay, tap again enters** | **NOT met** - `click` opens the project on the first tap | `ProjectsStage.tsx:255-259` |

### DIAGNOSIS OF THE ONE REAL GAP

`hitG` has a single `click` listener that calls `window.open` unconditionally. On a phone
the first tap therefore leaves the site immediately, and the panel text - which on a
pointerless device names whichever window is *centred* - never gets a chance to describe
the window the visitor actually touched. The visitor is sent to a URL they were given no
description of. That is the failure the two-stage tap exists to prevent.

Why the panel does not already cover it: `pointerenter` does fire for a touch tap, so
`hovered.current` is set - but `pointerleave` fires on the same tap sequence and clears it
again, and the navigation has already begun. The hover path cannot carry touch state; it
needs a state that survives the tap.

### RECIPE

1. A `tapped` ref beside `hovered`, holding the index a coarse pointer has armed.
2. Record `e.pointerType` on `pointerdown` per window. A coarse pointer is `touch` or
   `pen`; anything else opens on the first click as it does today. Read from the event,
   not from a media query - the handoff's own note about `(hover: hover)` being wrong on
   hybrids and false in headless applies here for the same reason.
3. `click` handler: if the pointer was coarse and `tapped.current !== i`, arm this window
   (`tapped.current = i`), keep it lit, and return without opening. Otherwise open.
4. The active-panel line gains the armed window as the fallback ahead of the centred one:
   `hovered >= 0 ? hovered : mouseSeen ? -1 : tapped >= 0 ? tapped : centred`.
5. Scrolling the fan disarms (`tapped.current = -1`), so a swipe returns the panel to the
   centred window and a stale armed window cannot be entered by a tap meant for another.
6. `onLeave` must not un-light the armed window.

No change to the geometry, the layout pass, the framing, the governor or the camera rig.
No file outside `src/components/worlds/ProjectsStage.tsx`.

### NUMERIC ACCEPTANCE

Measured on a deployed preview alias, never on localhost, at 390x844 with a touch pointer:

1. First tap on window *i*: `window.location` unchanged, no new tab, and the panel's title
   equals project *i*'s title in the active locale. **12/12 windows.**
2. Second tap on the same window: the project's `liveUrl` opens. For the four projects
   with no `liveUrl` the anchor is the home path and the behaviour is unchanged from today.
3. Tap window *i*, then window *j*: panel shows *j*, nothing has opened. **3 pairs.**
4. Scroll the fan after arming: panel returns to the centred window within 500ms.
5. Desktop at 1440x900 with a mouse: first click still opens. **Zero** added latency -
   assert the click-to-navigation path has no new async step.
6. No regression to the ring: `?ringprobe=1` frame identical field-for-field before and
   after, same viewport, and `costMs` within noise.
7. All three locales for criteria 1 and 2.

### VERIFICATION PLAN

Extend `scripts/harness/b8d-ring.mjs` or add `projects-tap.mjs` driving Chromium with
`--use-gl=angle --use-angle=vulkan` and a real touch emulation (`Input.dispatchTouchEvent`
via CDP, not a synthesized `click` - a synthetic click has `pointerType: ''` and would
prove nothing about the branch under test). Assert the scene actually rendered before
believing any of it. Sample after `list.dataset.ready === '1'`, not on a timer.

### RISKS

- **A synthesized event proves the wrong branch.** A CDP `Input.dispatchMouseEvent` reports
  `pointerType: 'mouse'` and would pass criterion 5 while never touching the new path. The
  harness must use touch dispatch and must fail loudly if `pointerType` is empty.
- **Pen.** Treated as coarse. A stylus user gets the two-stage tap. This is the handoff's
  wording ("no pointer" / "touch"); if the owner wants pen to behave like a mouse it is a
  one-word change.
- **A hybrid laptop with both.** `mouseSeen` and the per-event `pointerType` disagree by
  design: the panel fallback follows the mouse once seen, the tap gate follows whatever
  device produced *this* tap. That is the correct pairing, but it means a hybrid user who
  has moved a mouse and then taps still gets the two-stage tap on that tap.
- **Preview deploy needed.** Rule 2 forbids reporting these numbers from localhost.

### OPEN QUESTION - needs the owner, blocks nothing else

The handoff asks for an overlay "**following the hovered window**", with acceptance "a
desktop hover recording showing the overlay following the pointer smoothly".

What is live does not do that, and not by omission: B8d parks the panel on the planet's
disc, on the side the windows are not on, clamped under the navbar and re-sized for
portrait (`ProjectsStage.tsx:526-539`). The B8d brief records that as the owner's own
direction - "hovering a window shows the project's text outside it, **on the planet**".

So the two instructions disagree, and the newer text is the one that was never built.
Reading them as one design: the panel is already "near the planet"; what it does not do is
move with the pointer. Three readings, and I am not guessing between them:

- **(a) Leave it.** The parked panel is the shipped design and it is stable, legible in
  portrait, and cannot collide with the navbar. Costs nothing.
- **(b) Track the window, stay on the planet.** The panel slides along the planet's disc
  toward the hovered window's angle, damped. Keeps every constraint B8d solved; adds motion
  that says which window is being described.
- **(c) Follow the pointer literally.** A floating card near the cursor. Fastest to read as
  "this window", but it re-opens the navbar collision, the portrait sizing and the
  text-over-photo legibility that B8d moved the panel to the planet to escape.

I recommend **(b)**. It satisfies "following the hovered window" without discarding the
corrections that put the panel where it is. **Not implementing any of them until the owner
rules** - the touch gap below is independent and does not wait on this.

---

## ADDENDUM, added after implementation began - a live defect the audit above missed

Everything above was written from the source. Building the harness turned up something the
reading did not: **the windows do not receive pointer input at all.**

Measured at 1440x900 on **production** (`www.eladsaadon.dev/projects?ringprobe=1`) and on a
local build of the same commit, hovering the centre of a drawn window and then clicking it:

| | measured |
|---|---|
| element under the window's centre | `div.ring-scroll` - the scroll container, every sample |
| panel text after hovering a window | `""` (the panel is hidden - `mouseSeen` is true and nothing is hovered) |
| `window.open` calls after clicking a window | **0** |
| pointer events reaching a hit group | **0** of 4 (`pointerover`, `pointerdown`, `click`, `pointerup` all landed on the container) |

The scroll container is sized to the fan's bounding box and comes after the `<svg>` in the
DOM, so it covers every window and takes the events. B8b and B8c verified "the whole window
is clickable" while the clickable thing was still the `.ring-card` anchor positioned over
the sector; B8d moved those anchors off-screen and made the SVG group the hit target, and
nothing re-checked that events still arrived. It has been live since PR #24 merged.

So on the live site today: a desktop visitor sees twelve pictures, **no description at all**,
and clicking one does nothing. That is a larger defect than the missing tap gate, and it
sits in this lane's file.

**Fix, in `ProjectsStage.tsx` only:** the container keeps receiving pointer events - that is
how the ring scrolls, and taking that away to un-cover the shapes would break the scroll -
so it hit-tests the shapes itself with `document.elementsFromPoint`, which returns the whole
stack rather than the top element. The sector remains the exact hit area it was drawn as.
A press that moves more than 10px before release is a scroll, not a choice, and is ignored.

**This also invalidates the "current state" table above** on two rows: "description appears
on hover" and "with no pointer, the centred window's text shows" were read from the source
and are true of the code, but were **not** true of the running page for a visitor with a
mouse. The table stands as a reading of the source; the numbers here are what the browser
did.

Added to the acceptance:

8. Hovering a window at 1440x900 puts **that project's** title in the panel. This is the
   check that would have caught it.
9. `elementsFromPoint` at a window's centre contains an element whose parent is that
   window's `<g>`. Asserting the panel alone would pass on a page where the hit-test is
   right and the panel is broken, and vice versa.
