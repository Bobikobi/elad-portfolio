# GALAXY-REST - the galaxy at rest

The first frame a visitor sees, before any scroll. CROSSING fixed the passage out of it; nobody
has yet looked at the picture itself.

## Direction

- **Owner, via Astra, 2026-09-19.** A tilted galaxy across the lower half, a compact ivory core,
  two broad irregular grey-blue arms, dark dust lanes, edges dissolving into black, uninterrupted
  darkness behind the name.
- **Owner, direct, round 2.** The idle motion is too small to read as three-dimensional, and the
  galaxy is too small - spread it wider across the screen. This one arrived after the criteria were
  written and it contradicts part of them; see "Stated openly".

## What is there today (master 93c49c9)

A four-branch point cloud, 200,000 points, gold core (`#FFC978`) to cosmic blue to indigo, drawn
additively with no dust lanes. It fills the frame edge to edge and runs off the left, right and
bottom borders. The core is a broad smear rather than a point, and the name sits on top of the
upper arms.

It has almost **no angular structure at all**: measured on the disc's own plane, its two-fold
component is 0.225 - and most of that is the near-side / far-side brightness gradient, not arms -
while its four-fold component is 0.022. Even one second after load. The four branches are wound so
tightly that they were never four arms on screen; they were always concentric rings. That is worth
saying plainly, because the first version of this brief claimed master's four-fold signature was
0.132 and the fix took it to 0.033. Both numbers came from an instrument that fitted the disc's
tilt out of the picture, sky and stars and nebulae included, and neither is real.

| worst of six drift phases | master |
|---|---|
| G1 structure behind the name (share over +12 of its own row / p99) | **2.844%** / **46.2** |
| G2 top row of the galaxy body, as a fraction of frame height | **0.379** |
| G3 core half-width / area, in units of the projected disc | **0.266** / **0.0409** |
| G4 two-fold m2 / m2 over m4 | **0.2248** / 10.08 |
| G5 outer 40 px band, left / right / bottom | **11.82** / **11.07** / **20.04** |

## Instrument

`scripts/harness/galaxy-rest.mjs` (capture) + `galaxy-rest.py` (measure). Deployed Vercel preview,
ANGLE/Vulkan real GPU, 1440x900, `?hud=1&tier=high&fixedStep`, act asserted to be `galaxy`, DOM
hidden after the h1's rect is read.

**Six frames, not one.** 1600 / 2600 / 3600 / 4600 / 5600 / 6600 of the fixed-step clock - 27 to
108 seconds - captured in a single browser from a single load, freezing and unfreezing between
them. Every criterion is checked against the WORST of the six. Two full runs of the same build
agree to the third decimal on every number.

**The disc is deprojected with the camera's own matrices.** The point cloud is generated in world
y = 0, so the disc IS that plane, and the camera's projection and world matrices give an exact
homography from it to the screen - perspective included. Verified against the full projection
pipeline to 1e-13 px. `window.__camera` is published by `DebugHud` beside `__clock` and `__scene`,
under the same gate, read-only.

## Criteria (worst of six phases, on a deployed preview, measured twice)

- **G1 darkness behind the name.** Inside the visible h1 rect grown by 12 px, measured against each
  pixel's own row median: share more than 12 levels over its row <= **1.0%** and p99 over the row
  <= **25** (master 2.844% / 46.2).
- **G2 the galaxy sits low.** The top row of the galaxy body - the 15 px blurred frame over luma
  120 - at or below **0.45** of the frame height (master 0.379).
- **G3 a compact core.** The blurred core blob, measured against the GALAXY and not the frame: its
  vertical half-width <= **0.15** of the projected disc's major axis, and its area <= **0.025** of
  that axis squared. And it still exists: >= 2,000 px over luma 200 (master 0.266 / 0.0409).
- **G4 arms, not rings.** On the deprojected disc, the two-fold component m2 >= **0.40**, and m2 at
  least **1.5x** m4 so a four-fold pattern cannot pass (master 0.225 / 10.1).
- **G5 edges dissolve.** Galaxy light in the outer 40 px band: left and right <= **4.0** of 255
  each, bottom <= **6.0** (master 11.82 / 11.07 / 20.04).
- **G6 the owner's eye** (not measurable): does it read as one galaxy with an ivory core and
  grey-blue arms, and is the name comfortable to read on it.

## Instrument corrections made while measuring

Every criterion was written before the first measurement and corrected by one. The rule is the
goal file's: when a measurement shows a criterion conflicts with the goal, change it and record
why here. The last four were found by re-running an **unchanged** build.

- **G1, twice.** Written as "mean <= 20 inside the name box". The sky at that height is already
  31.5 of 255, so no build could meet it; rewritten as light above the sky floor. That was still
  wrong: the sky's own vertical gradient is ~9.5 levels brighter at the name than at the top of the
  frame, so a flat floor charges the criterion for the sky. Final form measures each pixel against
  its own row's median, which cancels a smooth vertical gradient and leaves only things that read
  as objects.
- **G2.** Written as "share of the frame's light below the midline >= 90%". The sky carries most of
  the frame's light, so the number moves by a few points for a change the eye reads as large.
  Replaced by where the galaxy's body starts. Threshold 120 and not 100, because at 100 the gold
  anchor sprite near the left edge is picked up instead. The old number is still reported.
- **G3, three times.** Written as "pixels over luma 200" - but the galaxy is a point cloud and
  single points hit 255 all over the disc, so that measured the disc. Changed to a 15 px blur and
  to the blob CONNECTED to the brightest pixel. Its bounding box was then dropped: one bright
  nebula touching the blob drags the box across the frame while the core has not moved (two builds
  with an identical core measured 18.3% and 25.8% wide). And finally the frame was dropped as the
  yardstick altogether. A share of the FRAME is a fact about the camera: the owner asked for a
  bigger galaxy, the camera went from z 9 to z 8, and the core's share of the frame went 1.66% to
  2.90% with the core itself untouched. It is now measured against a ruler - a known radius in the
  galaxy, projected through the real camera - and reads 0.252 and 0.257 on those same two frames.
- **G4, twice.** Written as a flat angular Fourier transform. The disc is tilted, so a circle on
  screen cuts an ellipse and the ellipse's harmonics land on m4. Deprojecting it from the picture's
  own second moments was the first fix and was itself wrong: those moments include the sky, the
  stars and the nebulae, and on three phases of ONE unchanged build the fitted axis ratio read 0.53
  / 0.68 / 0.53 when the true projected value is about 0.26. It is now taken from the camera. Then
  **m4 as a criterion had to go.** A bar of "m4 <= 0.09" rewards a galaxy with no structure at all,
  and master passes it at 0.022 by being featureless rings; a crisp two-arm pattern has real power
  at every even harmonic. The criterion is now m2 - the arms exist and are two - guarded by m2/m4
  so four branches cannot pass. m4 is still reported.
- **G5, twice.** Written as one number over the whole outer band at <= 3.0. The bottom band does
  not respond to anything this stage can do: a galaxy laid across the lower half necessarily
  approaches the bottom edge, so the bottom got its own bar of 6.0. The sides were then found to be
  measuring the wrong object entirely - see the verify doc - and after that the side bar moved from
  3.0 to **4.0**, because the owner asked for a wider galaxy after the bar was written. At the
  widest phase the right band is the arm itself tapering, at 3.56 against master's 11.07. Winning
  the last 0.6 would mean pulling the galaxy back in, which is the opposite of what was asked.
- **One frozen frame is one pose.** The biggest of them. The welcome shot orbits the galaxy on
  periods of 70 to 101 seconds, and every number this brief carried before was read at frame 1600
  of that cycle. Re-measured at 1600 / 2400 / 3200, the shipped build swung its m4 from 0.033 to
  0.190 and its left edge from 2.26 to 5.43 - so the G1-G5 PASS it reported was one lucky phase.
  Six phases now, worst of six.

## Stated openly

- **The owner's round-2 note contradicts G5.** "Spread it wider across the screen" and "edges
  dissolving into black" pull in opposite directions; the owner's word wins and the side bar moved
  to 4.0, which is still a third of master's. The galaxy reaching the right border at one phase of
  the orbit is the remaining cost, and it is visible in the picture, not only in the number.
- This stage changes the at-rest frame on purpose, so **CROSSING's C4a ("galaxy at rest
  byte-identical to master") re-baselines**. CROSSING v2 (PR #40) and v3 (PR #41) measured C4a
  against today's master; whichever lands second must re-measure it, and this brief is the reason.
  The spin law changed too, so the dive passes through a differently-wound galaxy.
- The solar act must not move: the six solar views stay byte-identical. Measured in the same PR.
- Labels on the solar side are deliberately out of scope until the composition settles (owner).
- The faint pink above the name is the far sky's two upper veils, placed there deliberately so no
  screen region is dead black. It is left alone: the owner did not notice it and said it is not
  critical, the far sky is shared with the solar act so touching it would move the six solar views,
  and G1 measures 0.571% at its worst phase with a bar of 1.0%.
