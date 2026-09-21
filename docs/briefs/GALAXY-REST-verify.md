# GALAXY-REST - verify

Brief: [GALAXY-REST-brief.md](GALAXY-REST-brief.md). Branch `feat/galaxy-rest`.

Baseline: master `93c49c9`. Candidate: `v13`, the head of this branch. Both on deployed Vercel
previews, real GPU (ANGLE/Vulkan), 1440x900, and both measured by the **same** instrument - the
one described in the brief, six drift phases per build, worst of six. The candidate was captured
twice in two separate browser sessions and the two runs agree to the third decimal on every
criterion (largest difference: G5-left 2.60 vs 2.58).

Master needed a preview of its own twice over. Vercel had only ever built `93c49c9` for
production, where the HUD seam is gated off; and the exact deprojection needs the `__camera`
handle, which master's tree does not have. `baseline/galaxy-master-instr` (commit `9b37242`) is
master's scene with that one debug handle added and nothing else - 1 file, 28 insertions - so the
baseline column is master's picture read by the candidate's ruler.

## Result: G1-G5 PASS. G6 is the owner's eye and is open.

Worst of six phases (frames 1600 / 2600 / 3600 / 4600 / 5600 / 6600 - 27 to 110 seconds):

| criterion | bar | master | v13 | |
|---|---|---|---|---|
| G1 behind the name: share over +12 of its own row | <= 1.0% | 2.844% | **0.571%** | PASS |
| G1 behind the name: p99 over its own row | <= 25 | 46.2 | **7.1** | PASS |
| G2 top row of the galaxy body / frame height | >= 0.45 | 0.379 | **0.570** | PASS |
| G3 core half-width / projected disc axis | <= 0.15 | 0.266 | **0.1117** | PASS |
| G3 core area / axis squared | <= 0.025 | 0.0409 | **0.0161** | PASS |
| G3 core still exists | >= 2,000 px | 46,791 | **18,150** | PASS |
| G4 deprojected m2 | >= 0.40 | 0.2248 | **0.4839** | PASS |
| G4 m2 over m4 | >= 1.5 | 10.08 | **1.83** | PASS |
| G5 outer band, left | <= 4.0 | 11.82 | **2.60** | PASS |
| G5 outer band, right | <= 4.0 | 11.07 | **3.56** | PASS |
| G5 outer band, bottom | <= 6.0 | 20.04 | **5.40** | PASS |

Reported, not criteria: m4 0.0223 -> 0.448 (see the brief - on its own this one rewards a galaxy
with no structure, and master's 0.022 is what featureless rings score); sky floor 31.5 -> 33.3;
frame mean 77.6 -> 54.0; light below the midline 81.0% -> 83.2%; lane depth 0.669 -> 0.958;
projected disc axis ratio 0.34 -> 0.31.

**The solar act did not move.** `photometry-diff` on all six views, v13 against the master-instrument
preview: mean **0.0000**, max **0**, `>1 of 255` **0.00%**, on every one of the six. That is the
check the gold-anchor commit owed: the anchor is switched off in the galaxy act only, and the solar
act keeps it at exactly its old strength.

## What this round found, on builds that had already passed

Round 1 shipped a "G1-G5 PASS" read at one frozen frame. Re-running the **unchanged** shipped build
at other phases of the drift broke three of its claims.

- **The arms were winding themselves into rings.** The spin was differential - angular velocity
  proportional to 1/radius - which is the correct law for a single star and the wrong one for the
  arm pattern. Across the measured annulus it accumulates 9.70 radians of shear by 108 seconds.
  On the deployed pre-fix build, between 27 and 110 seconds the two-fold signal at radius 2.2-2.8
  fell 0.494 -> 0.286 while the FOUR-fold signal at radius 3.0-4.0 rose 0.024 -> 0.139: the two
  arms shearing into rings, visible in both numbers at once. Round 1 had fixed the first frame and
  nothing after it. The fix is a single pattern speed at every radius, which is how real spirals
  answer the same problem, and it holds m2 at 0.484 or better at every phase.
- **The left edge band was never the galaxy.** It is the gold "galaxy we dived out of" anchor
  sprite in the far sky - 10.3 of the left band's 10.3, in master as well. It is a story object and
  the story has not happened yet at the welcome frame, so it is switched off in the galaxy act and
  left untouched in the solar one.
- **The deprojection was measuring the sky.** Fitting the disc's tilt from the picture's second
  moments takes in stars and nebulae too: on three phases of one unchanged build it read axis ratio
  0.53 / 0.68 / 0.53 when the true projected value is about 0.31. Every G4 number this document
  carried before came from that fit. Corrected numbers: master's four-fold signature is 0.022, not
  the 0.132 round 1 reported, and it was never four arms on screen.

## What changed in the scene

Round 1 (`256b003`..`5d51e21`):

- **Galaxy.tsx.** Four branches at spin 1.1 became two at 0.42, with a per-point angular spread and
  a radial wobble so the arms are broad and irregular. A separate bulge population (14% of the
  points, radius^2.6 inside 0.85) makes the core a point instead of the inner half of the disc.
  A new `aDim` attribute carries three things into the shader: the disc dimmed to 0.58 and the
  bulge lifted to 2.1, so the arms read grey-blue and the core is the one thing allowed to
  saturate; one dust lane per arm, on the trailing side only; and a rim fade over the last half of
  the radius so the cloud dissolves instead of being cut off by the frame.
- **shaders.ts.** `aDim` multiplied into the point alpha.
- **CameraRig.tsx.** The look target y 0.5 -> 1.45, which is what puts the galaxy in the lower half.
- **Dust.tsx.** The 70 foreground motes were spread through the whole volume, so some always sat in
  the empty sky behind the name. Biased below the eye line now - most of G1's improvement.
- **GalaxyDetail.tsx / GalaxyNebulae.tsx.** Pockets and hero stars were still placed on the OLD
  four-branch radius-6 shape, so they sat over empty sky out to the frame edges. They follow the
  two-arm shape now, spread evenly in radius, with an angular scatter across the arm.

Round 2, after the owner's "the motion is too small to read as three-dimensional, and the galaxy is
too small" (`e3cd6b0`..`b5af074`):

- **CameraRig.tsx.** The welcome shot backs off to z 8 and sits lower, and the idle drift ORBITS
  the galaxy - the camera moves around it on periods of 70 to 101 seconds - instead of sliding past
  it. That orbit is why one frozen frame stopped being a measurement.
- **shaders.ts.** The differential spin replaced by one pattern speed (above).
- **SceneRoot.tsx / Nebula.tsx.** The gold anchor gated to the solar act (above).
- **DebugHud.tsx.** `window.__camera` publishes the camera's projection and world matrices at the
  frozen frame, under the same build-time gate as `__clock`. Read-only, never written.

## Dead ends, recorded

- **Shrinking the disc does not empty the bottom band.** Radius 5.4 -> 5.15 with a longer rim fade
  moved G5's bottom from 5.09 to 5.08. The band is the disc's own lower edge, and the only ways to
  clear it are to shrink the galaxy or to lift it out of the lower half - both against the
  direction. That is why the bottom has its own bar.
- **A dust lane on both sides of both arms is a four-fold signature.** One lane per arm, which is
  what a real trailing dust lane is, is the right answer for the shape as well as for the number.
- **Matching the detail sprites to two branches, by itself, clumped them.** Two branches plus the
  old radius^0.7 law piled all 22 pockets into two knots against the core: pink bokeh balls, not
  star-birth regions. An even radial spread from 2.2 outward plus an angular scatter fixed both.
- **A median-based robust angular estimator did not tame the phase swing** - it swung wider (m2
  0.027 to 0.52). That is what ruled out foreground sprites as the cause and pointed at the spin.
- **Bin count and saturation were both innocent.** 360 / 120 / 72 / 36 bins give identical numbers
  (the thinnest bin still holds 132 px), and the ring is 0.000% saturated at every phase.

## Open

- **G6, the owner's eye.** Does it read as one galaxy with an ivory core and grey-blue arms, and is
  the name comfortable to read on it.
- **G5-right at the widest phase.** 3.56 against a bar of 4.0 that was moved from 3.0 for this. The
  band is the arm itself tapering, not a hard cut; buying the last 0.6 would mean pulling the
  galaxy back in, which is the opposite of what was asked. Visible in the picture, his call.
- The warm nebula to the right of the core (`eagle`) is the one strongly non-blue thing left in the
  arms. Not touched - "how warm is too warm" is not measurable, it is G6's.
- **CROSSING's C4a re-baselines.** This stage changes the at-rest frame on purpose and changes the
  spin law, so the dive now passes through a differently-wound galaxy. PR #40 and PR #41 measured
  C4a against today's master; whichever lands second must re-measure it.
- Throwaway branches, master's tree only, safe to delete once this is merged:
  `baseline/solar-master-93c49c9`, `baseline/solar-master-2`, `baseline/galaxy-master-instr`.
