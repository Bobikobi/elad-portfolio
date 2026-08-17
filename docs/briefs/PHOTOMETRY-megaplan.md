# MEGA PLAN: photometry - one model instead of 1,359 numbers

> Written 2026-08-15, after SUN-3 (`0fcf349`, lane `feat/sun-2`). Not back-dated.
> This is a **plan**, not a stage. Each stage below still needs its own
> `<id>-brief.md` before implementation and `<id>-verify.md` after, per standing rule 1.
> **Stages P3 and P6 change what a visitor sees and need the owner's approval on their
> criteria before any pixel moves.**

---

## Why this exists

SUN-3 was asked to fix "the sun looks clunky". It did - but the three rounds it took to
find the cause were not a shader problem. They were an ownership problem, and the same
ownership problem is now blocking the planet work.

**Six files decide how bright one pixel is, and none of them is the owner:**

| file | what it sets |
|---|---|
| `solar/Sun.tsx` | the sun's emissive level (`× 1.5`) **and** the system's lamp (`intensity 650, decay 2`) |
| `acts/SolarAct.tsx` | ambient fill (`0.06`), and every body's material |
| `CameraRig.tsx` | the per-world aperture (`ORBIT_EXPOSURE`), written to `gl.toneMappingExposure` |
| `ExposureToneMap.tsx` | the ACES curve, and `highlightRolloff` |
| `Effects.tsx` | bloom threshold + intensity, god-ray weight |
| `SceneRoot.tsx` | a second `intensity`, a second `toneMappingExposure` |

`src/components/scene/**` contains **1,359 hand-calibrated decimal constants**. Almost every
one is documented with its provenance - which is rare and genuinely good - but they are
calibrated *against each other*, never against a model. Pairwise calibration is correct on
the day it is made and expires the moment anything moves.

### The evidence that this is not a theoretical complaint

Three failures from the SUN-3 session, all the same root:

1. **A term in one file was being cancelled by a term in another, and a third was blamed for
   three consecutive rounds.** `Sun.tsx`'s limb darkening was filled back in by
   `Effects.tsx`'s god rays. Measured with the pass toggled and everything else held: god
   rays added ~0.6 of linear red at the limb against the surface's own 0.53; bloom, the
   accused, moved the ratio by 0.001. The comment that stood in `Sun.tsx` - *"the term has
   to be stronger than the result we want, because something downstream is subtracting from
   it"* - is the architecture confessing in writing.

2. **A fix scoped to one object silently taxes every object.** `highlightRolloff` was
   written for Mars's red channel. Its own doc comment asserts *"a neutral highlight - the
   sun's core ... - has its channels close together, so the spread term is ~0 and it is
   passed through untouched."* The sun's measured spread is **0.97**, and the rolloff was
   desaturating its centre by 49% and its limb by 11% - i.e. actively cancelling limb
   darkening. It also runs on every planet, every star and the gold curtain.

3. **An instrument calibrated against the thing it measures goes stale in one change.** The
   SUN-3 harness located the sun's disc at a fixed luminance threshold of 150, chosen when
   the disc measured 195. The moment the fix made the sun dimmer, 150 fell *inside* the disc,
   the fitted radius came back 6% small, and "the limb" was really the mid-disc: C1 read
   0.962 where the same frame against the true silhouette read 0.911. It reported a real
   improvement as a failure, and would have reported a real failure as progress.

### What is already right, and must survive this plan

This is not a rescue. The process discipline here is well above the genre and is the only
reason any of the above was findable:

- **32% of scene lines are comments**, nearly all recording *why a number is that number*.
- **32 brief/verify documents** and **22 measurement harnesses**.
- Seeded RNG down to closing a `Math.random()` inside `node_modules` (`SeededStars`).
- The **tier law**: a weaker machine gets a different cost, never a different composition.
- **One definition shared as a string** so two places cannot drift (`SOFT_NL`, `NOISE_GLSL`).

That last one is the correct instinct. This plan is the same instinct applied one level up:
the numbers that describe light should have one definition too.

---

## The order, and why it is this order

```bash
P0  SUN-3's paperwork + correct the trail      no code, no pixels
P1  the photometric module                     code, provably zero pixels
P2  measure every body's peak                  no code, no pixels
P3  albedo + falloff              <- OWNER     pixels change
P4  re-scope highlightRolloff                  pixels change, small
P5  close the holes in the criteria            harness only
P6  the two open judgement calls   <- OWNER    pixels change
P7  richness: what the bodies should LOOK like <- OWNER    pixels change
```

**P0 first** because SUN-3 is sitting in the lane unverified under rule 2, and every number
the later stages lean on came out of that same harness.

**P1 must precede P3.** P3's last step is "recalibrate `ORBIT_EXPOSURE` across five worlds".
Done without a single owner, that is another round of pairwise calibration, and in two
stages someone writes a comment saying *something downstream is subtracting from it*.

---

## P0 - correct the audit trail, and close SUN-3's own paperwork

No code. Two parts.

### P0a - SUN-3 broke two standing rules and must not be left that way

| rule | what happened |
|---|---|
| **1 - brief first** | SUN-3 has no `SUN-3-brief.md`. Its criteria were written and approved in conversation before any pixel moved, which is the *spirit* of the rule, but the artifact does not exist and the reasoning is not in the repo. Needs a brief written after the fact and **labelled as such**, plus a `SUN-3-verify.md` with the adversarial self-check - at least three ways the result could be falsely passing, each actually tested. Two are already known and should lead it: the disc-finding threshold that went stale, and the spike measurement that counted Venus as a prominence. |
| **2 - numbers only from a deployed preview alias** | **Every SUN-3 number is from localhost.** Real GPU, pinned tier, DOM hidden - but localhost. The stage is not verified under this project's own rules until it is re-measured on a preview alias. |

The second one matters more than it looks: localhost and the alias differ in build (dev vs
production bundle), and this stage's whole subject is the tone chain, which is exactly where
a build difference could hide.

### P0b - three recorded conclusions are now known to be wrong

Leaving them means the next person re-derives them.

| where | what it says | what is true |
|---|---|---|
| `INDEX.md`, SUN-2 row | *"C2 unreachable from the shader: 48% of limb darkening arrives as 8%, bloom fills it back in"* | Reachable. It was god rays, not bloom. SUN-3 measured C2 at 0.804 from the shader plus one constant in `Effects.tsx`. |
| `ExposureToneMap.tsx` doc | *"the sun's core ... is passed through untouched"* | The sun's spread is 0.97; it was being desaturated 49% at the centre. |
| nowhere | - | **Mars's own focused world clips 5.0% of its disc above 250, and did so before SUN-3.** The `ORBIT_EXPOSURE` calibration has aged out. This has never been recorded. |

**Acceptance:** `SUN-3-brief.md` (labelled after-the-fact) and `SUN-3-verify.md` exist; the
SUN-3 criteria are re-measured on a deployed preview alias and match localhost within the
harness's own noise; the three corrections above are in place. `INDEX.md` already carries a
SUN-3 row recording that the numbers are localhost-only.

---

## P1 - the photometric module

**One file owns the scene's light budget.** Everything else reads from it and sets nothing.

```text
src/lib/photometry.ts
```

It holds, and is the only place that holds:

| quantity | today |
|---|---|
| the usable range of the tone curve | undocumented. Measured in SUN-3: ACES has real slope below ~1.0 linear and is nearly flat past ~1.4. A 10% brightness change moves the output **7 of 255** at linear 0.6 and **3 of 255** at 1.5. **Every other number here is meaningful only relative to this.** |
| the sun's emissive level | `1.5` in a GLSL string in `Sun.tsx` |
| the lamp: intensity, decay, distance | `650 / 2 / 90`, in `Sun.tsx`, next to the sun's own emissive but unrelated to it |
| ambient fill | `0.06` in `SolarAct.tsx` |
| per-body albedo | **does not exist** - see P3 |
| per-world aperture | `ORBIT_EXPOSURE` in `CameraRig.tsx` |
| where bloom starts | `luminanceThreshold`, expressed in HDR luminance, in `Effects.tsx` - a number that only means anything relative to the sun's emissive level, in a different file |
| god-ray weight | `GODRAY_WEIGHT` in `Effects.tsx` |

The module exports values, not behaviour. No runtime cost, no new pass, no React.

### The acceptance that makes this safe

A refactor touching the numbers that decide every pixel is exactly the refactor that
quietly changes one. So the criterion is not "it still looks right":

| # | criterion | how | target |
|---|---|---|---|
| **P1-1** | the frame does not change | capture the solar overview and all five worlds before and after, same seed, same tier, real GPU, DOM hidden, **fixed-step clock and frame-anchored capture**; per-pixel absolute difference | **exactly zero** on every one of the six frames - mean 0.0000, max 0. TIGHTENED 2026-08-16, see below. |
| **P1-2** | nothing got more expensive | `renderer.info.render.calls` / `.triangles`, 120 frames, both tiers | **identical**, median frame time within 1ms |
| **P1-3** | no number was left behind | grep: no literal `intensity=`, `toneMappingExposure`, `luminanceThreshold`, or exposure constant outside the module | zero hits in `src/components/scene/**` |

**Risk, and how it was closed (2026-08-16).** P1-1 is only as good as the capture being
deterministic, and as written it was not meetable at all. Measured before anything was
built: two captures of the SAME build differ by mean 1.4-9.6 with up to 48% of pixels
moving, against a target of mean < 0.5 and max < 4. The tolerance was a guess, and it was a
guess about the thing under test - the same error as SUN-3's disc threshold.

Three things were needed, in this order:

1. **The DOM was leaking into every measured frame.** `hideDom` wrote inline styles, and
   React put them straight back on the next re-render, so `PlanetLabels`' pills stayed
   visible. Hidden by stylesheet with `!important` now, and asserted rather than assumed.
2. **A clock freeze** (debug-only, `HUD_AVAILABLE`, inside the Canvas). R3F calls
   `clock.getDelta()` once per frame before any subscriber, and three's `getDelta` both
   returns the delta and advances elapsed time - so wrapping that one method reaches both of
   this scene's animation laws. Two shots in one run then match byte for byte.
3. **A fixed step, armed at load** (`?fixedStep`), because two RUNS still froze at different
   instants - 11.480s against 11.381s - and pinning a clock VALUE cannot rewind accumulators
   that integrate delta. Same delta every frame, and the harness waits for a FRAME NUMBER
   rather than a wall-clock moment. Both anchors must sit past the settle wait: 14s is
   already ~840 frames, so an anchor at 300 anchors nothing.

**Result: two separate page loads are byte-identical on all six views.** The criterion above
is therefore exact, not a tolerance, and any non-zero difference is the code.

---

## P2 - measure every body's peak

No code change. The albedo numbers in P3 are currently derived from **disc averages**, and
clipping happens at the **sub-solar point**. Deriving a multiplier from a mean and applying
it to a peak is how you fix the number and not the picture.

`sun-3.py` already reports per-body lit-face RGB and % blown, and `DebugHud` now publishes
each body's screen centre. Extend to report, per body: peak channel value, the 99th
percentile, and the linear value both invert to.

**Acceptance:** a table of all eight bodies with peak linear radiance, at the current
lighting, on a real GPU, from the preview alias.

---

## P3 - albedo and falloff  *(owner approval required)*

### What is measured today

| body | texture mean (linear) | real geometric albedo | multiplier needed | now, vs earth | after, vs earth |
|---|---|---|---|---|---|
| mercury | 0.235 | 0.142 | ×0.60 | 3.47 | **0.97** |
| venus | 0.250 | 0.689 | ×2.76 | 2.15 | **2.74** |
| earth | 0.200 | 0.434 | ×2.17 | 1.00 | 1.00 |
| mars | 0.226 | 0.170 | ×0.75 | 0.70 | **0.24** |
| jupiter | 0.371 | 0.538 | ×1.45 | 0.52 | 0.35 |
| saturn | 0.553 | 0.499 | ×0.90 | 0.48 | **0.20** |
| uranus | 0.551 | 0.488 | ×0.89 | 0.39 | 0.16 |
| neptune | 0.101 | 0.442 | ×4.38 | 0.06 | **0.12** |

Current clipping, measured on the overview at DPR 2, real GPU:

| body | on-screen diameter | lit face sRGB | % of disc blown |
|---|---|---|---|
| mars | 54 px | 248, 238, 236 | **44%** |
| venus | 53 px | 254, 251, 250 | **77%** |
| mercury | 41 px | 218, 212, 206 | **19%** |
| earth | 120 px | 141, 139, 138 | 0% |
| saturn | 96 px | 161, 159, 156 | 0% |

**The textures carry no albedo.** Every body renders as a perfect white diffuser, so the
ones with bright maps blow out and the ones with dark maps are fine. Note that Mars is
*further* from the sun than Earth and clips harder - this is not distance, it is the map.

### Physical albedo alone does not solve it

The range narrows from 58:1 to 23:1, and Mercury and Mars come right for free. **Venus gets
worse** - 2.15 → 2.74. She really is 2.7× Earth's brightness. The cause is not the albedo,
it is that the orbits are compressed: Venus sits 2.55 units from a sun of radius 1.5, i.e.
**1.7 solar radii**, where the real value is 78. Inverse-square over orbits compressed 30:1
is not physics, it is a coincidence that happened to look plausible.

So P3 is two changes, and the second one is a deliberate departure from realism:

1. **Albedo per body.** A linear multiplier on each `MeshStandardMaterial.color`, equal to
   real geometric albedo ÷ the texture's own linear mean.
   > **Trap:** `color: '#808080'` is converted sRGB→linear by `THREE.Color` and lands at
   > **0.21, not 0.5**. Set it with `setScalar` on the working colour after construction, or
   > compute the hex backwards. This is precisely the class of error that yields a wrong
   > number in silence.

2. **Soften the distance falloff.** `decay` 2 → ~1.3, or an explicit per-orbit irradiance
   curve. This is what brings Venus down relative to the outer planets and is what saves
   Saturn.

3. **Re-set the lamp** so the brightest body sits just under the clip, then recalibrate
   `ORBIT_EXPOSURE` for all five worlds - reading the numbers from the module, not from
   each other.

### Proposed criteria - these need approval before implementation

| # | criterion | target |
|---|---|---|
| **P3-1** | no body clips | **zero** pixels with all three channels > 250, on the overview and in all five worlds. THRESHOLD CORRECTED 2026-08-17 from 235 - see below |
| **P3-2** | no body disappears | every body's lit face mean luminance **≥ 60 of 255** on the overview |
| **P3-3** | the inner system stays the inner system | Venus remains the brightest planet on the overview. AMENDED 2026-08-17: the original clause also required the ordering to be monotone with albedo × irradiance, which RULING 3 forbids - softening the falloff to keep Saturn prominent IS a departure from irradiance ordering, so the two could never both hold |
| **P3-4** | the worlds do not shift | each focused world's disc mean luminance within **±8** of its value before this stage |
| **P3-5** | the tier law | calls and triangles identical, median frame time within 1ms, both tiers |

### RULING 3 - appearance beats physical accuracy, 2026-08-17

Asked to choose between a physically faithful Saturn and a prominent one, the owner ruled:
**"keep it prominent and beautiful - physical accuracy is less critical than appearance."**

So P3 change 2 is approved: the falloff softens, `decay` moves off 2, and RULING 1's spirit
gives way where the two collide. This is not licence to invent numbers. It means:

- physical constants stay the DEFAULT and the starting point - albedo is still real albedo
- where a physical value produces something the owner does not want to look at, the
  departure is deliberate, named, and written down next to the number
- every departure is one line and reversible, per the risk table below - so a later stage
  can put realism back without archaeology

The reason this is defensible rather than sloppy: the orbits are already compressed 30:1.
Venus sits 1.7 solar radii out where the real value is 78. Inverse-square over a geometry
that was never real is not physics either - it is a coincidence that looked plausible. The
scene chose readability the first time anyone laid out those orbits; this only says so out
loud.

### The conflict this ruling settles

**Saturn drops from 0.48 to 0.20 relative** - it is the Projects planet and the most
prominent body on the right of the overview. Softening the falloff (change 2) is what
recovers it, and softening the falloff is a **deliberate break from RULING 1**, whose spirit
is real orbital elements. Realism and readability cannot both be had here.

### How this sits against the standing rules

| rule | verdict |
|---|---|
| **RULING 1** - real orbital elements | change 1 is the same family: real physical constants. **Change 2 breaks it on purpose** and needs the ruling above. |
| **the tier law** | albedo is data, not tier-dependent. Aligned. |
| **R2.2** - frame corners < 10% of 255 | measured after SUN-3: **3.1** (was 3.5). This work only lowers it. Aligned. |
| **the soft-terminator ruling** - one shading model for every body | albedo is per-body *data*, not per-body *physics*. The shading model stays one. Aligned. |
| **B3 tone discipline** - no lone channel clipping, no hue rotation | this *is* that rule, extended from Mars to every body. Aligned, and it is what unblocks P4. |

---

## P4 - re-scope `highlightRolloff`

Only possible after P3, and P3 is what makes it unnecessary.

`highlightRolloff` exists to stop a lone channel clipping. It does that by mixing a bright
saturated colour toward its own luminance - i.e. **toward white** - at up to 68% strength.
It runs on every pixel in the site. Measured costs:

- on the sun: 49% desaturation at the centre against 11% at the limb, which cancels limb
  darkening rather than protecting it;
- on the planets: it is part of what makes a blown lit face *featureless white* rather than
  merely bright.

Once P3 means nothing clips, the knee can move up and the strength down, and the saturation
it currently takes from everything comes back.

**MEASURED 2026-08-17, and it changes what this stage can claim.** P3 left two clusters of
burnt pixels: Earth's cloud tops (9,716 px) and Venus on the overview (1,498 px). Both were
expected to be P4's to fix. They are not. Those pixels are **neutral white** - measured
channel spread 0.004-0.005, with 100% of them under 0.02 - and `highlightRolloff` is scaled
multiplicatively BY that spread, by design, so it barely touches them at any setting. No
choice of HL_KNEE, HL_RANGE or HL_MAX moves them.

So P4 is now two separate things, and only the first is P4:

1. **Re-scoping the function to the case it was built for** - a lone channel clipping, Mars's
   0.34% red-only sliver. Suggested by measurement: knee 0.72 -> ~0.90, range 1.70 -> ~0.35,
   max 0.68 -> ~0.30. That narrows it so it stops desaturating neutral highlights across the
   whole site - the sun's core was losing 49% to it.
2. **Neutral over-exposure on a local peak** - Earth's clouds, Venus's disc. A different
   problem needing a spread-independent answer: per-body or per-material trim, or a peak
   compressor that does not consult chroma. Not designed here, and not P4.

**Acceptance:** Mars's disc clipping stays at 0% (it is currently 5.0% and failing - so this
stage inherits a fix, not just a guard), and the mean chroma of every focused world's disc
rises or holds. No frame goes over 250 in all three channels anywhere - the same corrected threshold as P3-1.

---

## P5 - close the holes in the criteria

Two of the project's own acceptance criteria are known to be blind. Harness-only.

1. **R2.2's corner luminance is blind to mid-frame haze.** The vignette darkens the corners
   regardless, so the god-ray wash lived in the middle of the frame and the corner metric
   read 3.5 and passed. This is part of why the "milky halo" round chased the wrong source
   three times. **Add:** median luminance of the annulus at 1.1-2.0 sun-radii, and of the
   frame excluding the vignette's reach.

2. **Instrument thresholds must not be calibrated against the thing they measure.** Add to
   the standing rules, alongside rule 5: *a threshold expressed as an absolute value of the
   quantity under test expires the first time that quantity changes. Derive it from the
   image (interior vs sky, 50% crossing) or from the camera, never from a previous run.*

**Acceptance:** both added; the second appears in `HANDOFF`'s standing rules.

---

## P6 - the two open judgement calls  *(owner)*

Neither is measurable. Both are recorded so they are not silently decided by whoever touches
the file next.

1. **How bright the sun should be.** SUN-3 moved the disc mean from sRGB (216, 141, 87) to
   (186, 124, 89). The dimming is not a side effect: on this pipeline a sun bright enough to
   sit in the ACES shoulder is a sun with no shading, and the two cannot both be had. The
   criteria constrain the *gradient*, never the *level*. Two knobs, both now in one place
   after P1: the sun's emissive level and the bloom threshold that follows it.

2. **How much should be happening on the limb.** The prominences went from reaching 1.76
   sun-radii over 8.9% of the silhouette to 1.09 R over 1.1%. That is inside the criterion
   with room to spare, and may be too subtle - SUN-2 explicitly wanted a limb that was not
   "a clean circle with nothing happening on it".

---

## The criteria in this plan are guards, not goals

Added 2026-08-16, after the owner looked at the post-SUN-3 sun on a preview alias and said
it was bad. It is worth writing down because it is not about the sun, and it will happen
again inside this plan if nothing changes.

**Read every acceptance criterion here and notice what shape they all have:**

| stage | its criteria say |
|---|---|
| P1 | the frame did not change |
| P3 | no body clips · no body disappears · the ordering does not invert · the worlds do not shift · cost is unchanged |
| P4 | clipping stays at zero · chroma does not fall |
| SUN-2, SUN-3 | grain EXISTS · the ratio is in a band · the spikes are not too long |

Every one is of the form *nothing got worse*. Not one says what the result should **be**. A
scene can satisfy the whole list and be correct, safe, cheap - and lifeless. That is exactly
what happened to the sun: C1, C2, C3 and C5 all passed, and the disc reads as a matte
salmon ball with cells the size of continents. SUN-2's C1 asked for high-frequency energy at
2.5x production and never asked what SIZE the grain should be, so a golf-ball texture passes
a granulation criterion.

**Where this bites next, and it is not hypothetical:**

- **P3** hands every body a physically correct albedo. Correct albedo on a flat white
  diffuser is a flat correctly-dimmed diffuser. Every P3 criterion would pass.
- **P4** raises the rolloff knee and its acceptance is "chroma rises or holds" - a number
  that goes up while the planet still reads as plastic.
- **P6** already admits this by parking two questions as unmeasurable. There are more than
  two.

**The rule this plan adopts from here:** every stage that changes pixels carries at least
one criterion that states what should be TRUE of the result, not only what must not get
worse - and it is measured against a named reference, not against the previous build. A
guard set alone is how a project measures its way to something nobody wants to look at.

---

## P7 - richness: what the bodies should look like  *(owner approval required)*

**Status: criteria PROPOSED, not approved. No pixel moves until they are.**
Raised by the owner on 2026-08-16 with a reference image (a NASA 4K solar photograph) and
one sentence that widens it past the sun: *the other objects should be rich like that too.*

### The sun

What is deliberate: SUN-3 dimmed the disc from sRGB (216,141,87) to (186,124,89), and that
is the recorded trade - on this pipeline a sun bright enough to sit in the ACES shoulder is
a sun with no shading. The LEVEL was always the owner's call and is P6's first judgement
call. He has now made it: too dim.

What was never deliberate, and never measured by anything:

| # | criterion | proposed target |
|---|---|---|
| **S1** | granulation is FINE - typical cell diameter against disc diameter | **1-2% of the diameter**, i.e. 50-100 cells across. See the measured reference below - the real value is 0.07%, and matching it would be invisible |
| **S2** | the core is HOT - peak channel inside r < 0.25 | **>= 240 of 255**, with blown pixels staying under 1% of the disc. The reference's own centre-to-limb ratio is **1.79** in linear luminance |
| **S3** | there is a corona - median luminance in the annulus 1.1-2.0 R against the sky | **at least 2x the sky**, without reviving R2.2's milky wash |
| **S4** | the limb still falls away - limb/centre on the TRUE silhouette | **<= 0.75** |

**S2 and S4 are in direct conflict, and that is the real content of this stage.** SUN-3
measured that brightening cannot buy both: exposure moves red hardly at all because red sits
in the shoulder, while crushing green and blue on the steep part. So a hot core with a dark
limb is not an exposure change - it is the colour ramp or the tone response. P1 is what makes
that tractable: those numbers now live together instead of being calibrated against each
other across six files.

### The reference, measured - 2026-08-17

Numbers extracted from the approved sources in `refs/README.md`, so S1-S4 are anchored to a
photograph rather than to an opinion. Method and provenance are in `/tmp/p7-refs/`.

| quantity | measured on the real sun | what it means here |
|---|---|---|
| granule diameter | **0.066-0.069% of the disc diameter** (~915-959 km), from DKIST scaled by its own published 500 km bar. Two independent methods agreed | **~1450 cells across a disc.** Ours read in the tens of percent - hundreds of times too coarse |
| granulation contrast | **sd 22.0 of 255** on a mean of 173, i.e. 12.7% RMS, from Hinode SOT G-band quiet sun | a target for how much the grain varies, not how large it is |
| centre-to-limb | **1.79** in linearised luminance, u = 0.654, from SDO/HMI with the disc fitted from the image's own statistics | S4's number, from a photograph |
| granulation lifetime | correlation **halves in 252 s**, e-folds in 553 s | this is the "burning" - it is a rate of CHANGE, not a brightness |

**Do not chase 0.07%.** At a 680px disc that is half a pixel per cell: invisible, and
expensive to render. The criterion is 1-2% because that is fine enough to read as texture
rather than as blobs, and coarse enough to survive being drawn. The reference sets the
DIRECTION and the ceiling on what is defensible, not a literal target.

**Could not be measured, and S3 needs it:** corona brightness above sky. Every accessible
source is an 8-bit JPEG with an unknown display stretch, so absolute photometry is not
available from them. S3's target stays a judgement until a calibrated source is found.

### The other bodies

Same question, unanswered, for every planet: what makes a body read as rock, gas or ice
rather than as a correctly-lit sphere. This needs its own reference per body before it can
have criteria. Not started.

### Sequencing

P7 sits after P3 and P4 on purpose. P3 decides how much light each body receives and P4
gives back the saturation the rolloff is taking; both change what "rich" even looks like.
Tuning appearance before them means tuning it twice.

---

## Risks across the whole plan

| risk | mitigation |
|---|---|
| P1 changes a pixel by accident | P1-1 is a per-pixel diff on six frames, not a look-over |
| P3 is approved on numbers and disliked on sight | build P3 behind the module so the falloff and lamp are one-line reversible; capture a side-by-side before asking |
| the five worlds' recalibration drifts again | after P1 the apertures are derived from the module's reference, not measured against each other |
| the whole plan is scope that was never asked for | P0, P2 and P5 cost nothing visual and are worth doing regardless. P1 pays for itself the first time anyone touches lighting again. P3 is the only large one, and it is the only one that fixes a defect a visitor can see. |

---

## What this plan does **not** cover

- The galaxy act. Its bloom threshold is 0 by design and it has no lamp; it should read from
  the module for consistency but nothing about it is broken.
- Anything in `HANDOFF-2026-08-05.md`'s open items: the PR/CODEOWNERS deadlock, the logos,
  the SCENE-FLICKER capture conditions, the knip deletions. Untouched by this.
- The accepted 56fps on three project windows at the low tier. Not to be re-litigated.
