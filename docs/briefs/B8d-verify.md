## VERIFY: B8d - previews in the ring plane, words on the planet

Lane branch `feat/b8c`, preview alias
`elad-portfolio-git-feat-b8c-bobikobis-projects.vercel.app`, commit `ab1441f`.

### HARNESS

`scripts/harness/b8d-ring.mjs` - per locale and viewport: whether the ring's transform
matches the ring-plane basis the rig publishes, the navbar clamp across a full 24-step
scroll sweep, whether any text is painted inside a window and whether all of it is still
in the DOM, the panel's behaviour idle and on hover, and header overlap.
`scripts/harness/b8b-fps.mjs` for frame rate. `scripts/harness/scene-mount.mjs` for the
mount ruling. Output in `.harness-out/`.

### MEASURED

| what | result |
|---|---|
| ring lies in the planet's ring plane | the group's transform matches the published basis to 2dp in every desktop case: axis ratio 0.560/0.560 (he), 0.493/0.493 (en, ru), 0.557/0.557 (1280x800); major axis 8.70/8.70, -33.33/-33.33, 10.96/10.96 |
| no text painted inside a window | 0 painted text boxes, all 7 cases |
| the copy is still in the DOM | 12 of 12 projects, all three locales |
| navbar clearance, full scroll sweep | highest window y=205 (he), 425 (en, ru), 198 (1280x800), 370 (mobile) against a navbar ending at y=64 - was **y=22** before |
| header zone | 0 overlaps between any window box and the header, at any scroll position |
| windows in view | >=4 desktop and laptop, >=3 en/ru, 1 mobile |
| panel with no pointer | names the window at the centre of the fan, in all three locales |
| panel on hover | follows the hovered window, all 7 cases |
| 60fps, high tier | 58.0-60.0 fps, 0-3.5% of frames over 33ms |
| **60fps, low tier (6x CPU)** | **53.5-55.5 fps, 8-12% of frames over 33ms - FAIL** |

### THE THREE B8b CRITERIA THE REVIEW ASKED FOR

Measured before this stage, at `b8ab84b`: (a) gap constant, spread **0.00-0.01px** against
a +/-4px allowance; (b) extended side edges pass within **0.007%** of the projected centre
against a 2% allowance; (c) outer sagitta **7.45px** desktop, **31.91px** mobile against a
3px floor. Criterion (a) does not survive this stage and cannot: a ring lying in the
planet's ring plane is an ellipse and a sphere's limb is a circle, so a constant gap
between them is not a shape that exists. That is a consequence of the owner's direction,
not a regression, and it is recorded here so no one later reads its absence as a defect.

### THE FOUR REVIEW DEFECTS

1. **Text tilt 28.0-28.5deg against a 12deg requirement** - superseded. There is no text in
   a window to tilt.
2. **Truncation on 11/12 cards in he and 12/12 in en and ru** - superseded, same reason.
3. **Navbar collision** - fixed and measured above.
4. **Header squeeze** - its zone is a 300px reservation the ring gives up depth for, rather
   than a 150px floor on the leftovers.

### FRAME RATE: A REGRESSION THIS STAGE CAUSED AND ONLY PARTLY FIXED

Low tier on /projects measured 49.5-51fps against 57-59.5 on the build before this stage
and 60.0 on /about as a control, three runs each. Isolating one variable at a time found
no single hotspot - `vector-effect`, the window shadow, the scroll rail and the panel were
all inside noise - and only hiding the previews moved it, to 55.8. The cost is per-window
drawn work: a path, a clip path and a clipped bitmap rebuilt every frame the ring turns.
Window thickness had gone from 180 to 130 in this stage, which took the count from three
to five.

Raising it to 170 recovered part of it: **53.5-55.5fps**, 8-12% of frames over 33ms. That
is better than 49.5 and still short of 60, so this criterion is **FAILED**, not passed.
The lever is the window count, and trading it against how many previews are on screen is
the owner's call, not mine.

### ADVERSARIAL SELF-CHECK

1. **"It is in the ring plane" could be self-confirming.** The harness does not check the
   ring against itself: it reads the transform actually applied to the group out of
   `getComputedStyle` and compares it with the basis the RIG published from the ring
   mesh's world normal. Two independent producers, agreeing to 2dp.
2. **The frame-rate regression could have been the machine.** The first suspicion was
   sampling variance. Tested with a control route on the same alias in the same session -
   /about at the same throttle, 60/60/60 - and against the previous build on its own
   alias. Both said the same thing, so it was real and mine.
3. **The mount ruling could pass by accident on a page that failed to render.** Every
   non-cosmic route still transfers 235KB of JS and renders its content; what disappears
   is the 424KB chunk. And the first run FAILED loudly on one route, which is the
   evidence the check discriminates: `/services/nextjs-development` was still mounting the
   canvas because `sectionForPath` matches by first segment.
4. **"No painted text" could be true because the windows failed to render.** The same runs
   report 3-4 visible window paths and the screenshots show the previews.
5. **The panel could be showing stale text.** It is compared idle and after a hover in
   every case, and the two differ in all seven.

### SECOND ROUND - the caching ruling, and four owner corrections

The ruling said to cache before trading content, and it was right to ask. It was also,
measurably, not the cost.

**Caching, done as directed.** A window at angle th is the window at angle 0 rotated by
th, so the sector path, its clip path, the preview's box and the accent's gradient are now
built once at angle 0 and rebuilt only when the ring's shape changes. Per-frame writes on
a window are a transform and an opacity. Low tier before: 49.5-51.7. Low tier after:
49.5-51.7. **No change**, which rules out per-frame JS.

**Nor is it any one visual feature.** At the low tier, on the cached build: baseline 52.2,
shadow off 53.2, previews off 52.8, both off 54.0. All within each other.

**So the ceiling survived, and the count is what gives.** Thickness 230, three windows:
low tier 55.8 / 56.2, high tier 56.5 / 60.0, against a 60.0 no-ring control. One reading
of 40.7 at low tier and one of 40.4 at HIGH tier are in the set; an outlier that appears
at the unthrottled tier too is contention on this machine, not the page.

**The one sanctioned experiment.** The SVG layer was a full-viewport box, 1440x900, over
a live WebGL canvas - rasterized and composited at that size every frame whatever is drawn
inside it. It now follows the fan: 570x712, **69% less raster area**. Low tier measured
**56.0fps, 6.7% of frames over 33ms** - the same as before it, so the raster area was not
the residual either. The change stays because it is strictly less work, not because it
helped.

### ACCEPTED DEVIATION FROM THE 60FPS CRITERION - do not re-litigate

**Three windows at ~56fps on the low tier is the accepted result**, ruled by the owner
after the evidence below. It is not a regression and should not be reported as one.

What was eliminated, each by measurement rather than by argument:

| suspect | test | result |
|---|---|---|
| per-frame JS rebuilding paths | build everything once at angle 0, per-frame writes down to a transform and an opacity | 49.5-51.7 before, 49.5-51.7 after - **no change** |
| the window shadow | filter off | 53.2 against a 52.2 baseline |
| the previews | images hidden | 52.8 |
| both together | | 54.0 |
| the scroll rail, the panel | each hidden | inside noise |
| raster area of the vector layer | full viewport to the fan's box, -69% | 56.0, unchanged |
| the number of windows | five, four, three | 49.5 / 53.5-55.5 / **~56** |

What survives is the compositing and paint of an animated vector layer over a 3D canvas -
inherent to overlaying SVG on WebGL, and removable only by rendering the windows inside
the scene as textured planes, which is not worth a rewrite now. A steady 56 beats a peak
60 with jitter, and the tier law is intact: composition is identical at both tiers and
only cost differs.

**Four corrections, all verified on the alias:**

| ask | result |
|---|---|
| order: openable first, non-opening last | first five are all live-linked; the four with no site are at the tail |
| no empty panes | the four with neither a live site nor a screenshot carry a drawn monogram - AV, AS, AW, OA |
| words only on hover | with no pointer: the centred project. After a mouse moves off a window: empty. On a window: that project |
| scroll like the discs, not cells vanishing | windows rise along their own radius - a scale about the ring centre over a longer fade - instead of switching on where they stand |

**Preview images: assets missing, not a loading fault.** `openclaw`, `web-scraper`,
`ai-style` and `accessibility-widget` have neither `previewImage` nor `liveUrl` in
`lib/constants.ts`; the other eight load correctly. Real logos need an asset in `public/`
and a line in `lib/constants.ts`, both of which belong to the other lane, so the monogram
is the version that needs neither.

**Three things that were wrong on the way, and what caught them:**

1. The monograms rendered MIRRORED. The ring-plane matrix has a negative determinant at
   this pose - the plane is seen from below - and shapes survive that invisibly while
   letters do not.
2. Hover-only text did not take effect anywhere. The test was
   `(hover: hover) and (pointer: fine)`, which is false in a headless browser and wrong on
   hybrid laptops. It waits for a real `pointermove` from a mouse now.
3. A monogram came out as "Oמ" - two alphabets and two directions in a two-character mark,
   from titles that mix Hebrew and Latin. One script only now.
4. Two verification rounds read a STALE deploy and were nearly reported as failures. The
   poll now keys on a value the new build actually changes.

### VERDICT

**PARTIAL.** The redesign, both surviving review defects, the mount ruling and all four
owner corrections are done and measured. The 60fps criterion reads ~56fps at the low tier
with three windows - better than 49.5, short of 60, and not attributable to any removable
feature.

### NOT DONE

- SCENE-FLICKER (twinkle / bloom / aliasing / occlusion / chromatic aberration) has not
  been started.
