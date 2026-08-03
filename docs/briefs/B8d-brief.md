## BRIEF: B8d - projects windows as previews, labelled on the planet

> **Naming.** The external review assigned this as "B8c". That id is already taken: the
> owner's five corrections shipped as B8c in commits `7f60ca8`, `c25a13e`, `b8ab84b`. This
> is B8d so the audit trail stays unambiguous. The branch is still `feat/b8c` as assigned.

### THE CONFLICT THIS BRIEF RESOLVES

Two instructions arrived within the hour and they do not agree.

- **External review (B8c):** four readability defects in the text inside the windows -
  tilt too strong, truncation, navbar collision, header squeeze. Its fixes assume the
  windows keep their text.
- **Owner, after that:** the windows should carry the site preview **and no text at all**.
  Hovering a window shows the project's text **outside it, on the planet**. The windows'
  angle should match the angle of the planet's **rings**, and the camera may move if that
  helps, as long as the planet stays large.

The owner's direction removes the subject of defects 1 and 2: with no text in a window
there is no tilt to cap and nothing to truncate. Defects 3 and 4 are about where the fan
sits on the screen and survive unchanged. This brief therefore implements the owner's
design and carries defects 3 and 4 into it, and does not implement defects 1 and 2 as
written. The external reviewer should know that their (1) and (2) were superseded rather
than skipped.

### THE THREE B8b CRITERIA, AS REQUESTED

Measured on the preview alias at `b8ab84b`, six cases (he/en/ru at 1440x900, he at
1280x800, he/en at 390x844):

| criterion | target | measured |
|---|---|---|
| (a) inner-arc-to-limb gap constant | +/-4px | spread **0.00-0.01px** over 21 samples per arc |
| (b) extended top/bottom edges pass near the planet centre | within 2% of R | worst **0.007%** of R |
| (c) outer edge sagitta | > 3px | **7.45px** desktop, **31.91px** mobile |

Note on (a): it is constant *by construction* - the arc is emitted at r0 = R + gap. The
load-bearing part is that R is the RENDERED limb, fitted from 8 projected silhouette
points per frame, not the design constant. Design R is 306.0 at 1440x900; measured 334.4.

### CURRENT STATE (measured, preview alias, 1440x900, all three locales)

| defect | measured |
|---|---|
| 1 text tilt | **28.0deg** (he), **28.5deg** (en, ru) against a 12deg requirement |
| 2 truncation | **11 of 12** cards ellipse in he; **12 of 12** in en and ru |
| 3 navbar collision | navbar bottom is at y=64; the highest card reaches y=**22** during a scroll sweep, i.e. **40-42px underneath it** |
| 4 header squeeze | the page header sits in the strip the ring leaves free, currently `max(150, edge - r1 - 24)`; at this framing that floor is what is binding, and the title and back button are pressed to the viewport edge |

### DIAGNOSIS

Defects 3 and 4 have one cause: the fan is defined only by an angle (+/-35deg) and knows
nothing about the screen it lands on. A ring anchored to a planet whose centre sits at
y=393 will reach y=22 at that angle whatever is drawn there. The fix is to clamp the fan
by the obstacles that actually exist - the navbar strip above, the viewport below, the
header's reserved zone to the side - and to allow it to be ASYMMETRIC, because the space
above the planet's centre and below it is not the same.

Defect 1 and 2 disappear with the owner's design rather than being solved.

### RECIPE

**1. Ring plane instead of screen plane.** Everything needed is already published:
`planetRingNormal` (SolarAct writes the ring mesh's world normal every frame) and the
ring's own radii (inner `size * 1.35`, outer `size * 2.5`). `CameraRig.publishLimb`
already fits the limb; it gains a second job - projecting two orthonormal in-plane vectors
to screen space and publishing them as `U`, `V` (px per world unit). A circle of world
radius p in the ring plane then projects to `C + p*(U cos th + V sin th)`, an ellipse, and
every window path, content transform and the scroll rail follow from the same substitution
in `pointAt`. The windows become slices of an annulus **in Saturn's ring plane**, which is
what "the same angle as the rings" means geometrically.

**2. Windows carry the preview only.** The `<image>` already fills the sector and is
clipped to it (B8c). Its opacity goes up, and the text leaves the window.

**3. Text on the planet, on hover/focus.** One panel, positioned over the planet's disc on
the side away from the fan, fed from the hovered window's data. It is a DOM element in
`ProjectsStage`, placed per frame from the same rAF, and it fades rather than pops.

**4. Crawlability and screen readers.** The text does NOT leave the DOM - it becomes
`sr-only` inside each window. Crawlers get cosmic by default (no cookie, F2), so deleting
the copy outright would remove the project descriptions from the default `/projects` for
search engines and for anyone using a screen reader. Same markup, same source, not painted.

**5. Fan clamped by real obstacles (defects 3 and 4).** Per frame, from the measured
geometry: the topmost extent must clear the navbar strip plus a margin, the bottom must
stay inside the viewport, and the header keeps a reserved zone whose width is a floor, not
a leftover. The fan becomes two half-angles rather than one.

**Files (all inside my lane):** `src/lib/ringGeometry.ts`, `src/lib/orbitFraming.ts`,
`src/components/scene/CameraRig.tsx`, `src/components/worlds/ProjectsStage.tsx`,
`src/components/worlds/ProjectsWorld.tsx`.

**A file I will need and do not own:** `src/app/globals.css` holds every `.ring-*` rule.
The hover panel needs styling. I intend to keep its styles inline in `ProjectsStage.tsx`
rather than touch `app/**`; if that proves unworkable I will stop and report rather than
edit the other session's file.

### ACCEPTANCE

1. Window ring is co-planar with the projected ring plane: sampling the window ring's
   inner boundary and Saturn's outer ring edge, the two are concentric ellipses - the
   ratio of their semi-axes constant within 2%, and their major-axis directions within
   2deg of each other.
2. No text painted inside any window; the same text present in the DOM (`sr-only`) for
   every project, in all three locales.
3. Hover or keyboard focus on a window shows the panel over the planet within 200ms and
   removes it on exit; panel entirely inside the viewport and clear of the navbar.
4. No card's bounding box enters `y < navbar bottom + 8` at ANY scroll position, in all
   three locales, at 1440x900 and 1280x800.
5. Header zone: the title and back control have at least 260px of reserved width and do
   not overlap any window's bounding box at any scroll position.
6. 60fps while scrolling on both tiers, measured against a no-ring control route.
7. Screenshots at 1440x900 and 390x844 for he/en/ru, plus a hover state.

### RISKS / ROLLBACK

- The ellipse substitution touches every path in the layer. If the ring plane is close to
  edge-on the minor axis collapses and the windows would degenerate; the code must clamp
  the axis ratio and fall back to the circular ring below a threshold.
- The camera latitude the owner offered is NOT taken in this brief. Changing `ORBIT_FRAME`
  moves the composition on every planet world, not just projects, and the tier law makes
  composition a protected thing. If the ring plane turns out too closed to read at the
  current pose, that becomes a separate, measured proposal.
- Rollback: `feat/b8c` is a branch off `b8ab84b`; nothing is merged until approved.

### OPEN QUESTIONS FOR OWNER

1. **Touch devices have no hover.** On a phone the current design would show twelve
   pictures and no way to learn what any of them is without opening it. Options: (a) tap
   once to reveal the panel, tap again to open; (b) on portrait only, keep the title
   painted on the window and drop the description; (c) show the panel for whichever window
   is centred in the fan, no interaction needed. My recommendation is (c) - it needs no
   gesture and it matches "the text lives on the planet".
2. **What opens the project now** - the whole window, as it is today? Or does the panel
   carry the "visit" control and the window only selects?
3. The `feat/b8c` preview alias returns 404, so nothing on this branch can be verified
   yet. It may need one deploy before Vercel assigns the branch alias, or the CLI needs a
   login I cannot run non-interactively. Please confirm the alias exists.
