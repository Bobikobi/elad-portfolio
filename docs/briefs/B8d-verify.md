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

### VERDICT

**PARTIAL.** The redesign and defects 3 and 4 are done and measured. The 60fps criterion
passes at high tier and fails at low tier (53.5-55.5). Nothing else outstanding.

### NOT DONE

- SCENE-FLICKER (the twinkle / bloom / aliasing / occlusion / chromatic-aberration task)
  has not been started.
