# GALAXY-REST - the galaxy at rest

The first frame a visitor sees, before any scroll. CROSSING fixed the passage out of it; nobody
has yet looked at the picture itself.

## Direction (owner, via Astra, 2026-09-19)

A tilted galaxy across the lower half, a compact ivory core, two broad irregular grey-blue arms,
dark dust lanes, edges dissolving into black, uninterrupted darkness behind the name.

## What is there today (master 93c49c9, deployed preview, real GPU, two runs identical)

A four-branch point cloud, 200,000 points, gold core (`#FFC978`) to cosmic blue to indigo, drawn
additively with no dust lanes. It fills the frame edge to edge and runs off the left, right and
bottom borders. The arms wind tightly enough to read as concentric rings rather than arms, and the
core is a broad smear rather than a point. The name sits on top of the upper arms.

| | master |
|---|---|
| G1 structure behind the name (share over +12 of its own row / p99) | **2.844%** / **46.2** |
| G2 top row of the galaxy body, as a fraction of frame height | **0.38** |
| G3 core area / vertical half-width | **3.745%** / **29.89%** |
| G4 deprojected m4 / m2 | **0.132** / 0.422 |
| G5 outer 40 px band, left / right / bottom | **6.52** / **11.07** / **20.04** |
| sky floor / frame mean | 31.48 / 77.863 |

## Instrument

`scripts/harness/galaxy-rest.mjs` (capture) + `galaxy-rest.py` (measure). Deployed Vercel preview,
ANGLE/Vulkan real GPU, 1440x900, `?hud=1&tier=high&fixedStep`, fixed-step clock frozen at frame
1600, act asserted to be `galaxy`, DOM hidden after the h1's rect is read. Two runs of the same
build come back BYTE-IDENTICAL, PNG to PNG, so every digit below is the code and nothing else.

## Criteria (measured twice on a deployed preview)

- **G1 darkness behind the name.** Inside the visible h1 rect grown by 12 px, measured against each
  pixel's own row median: share more than 12 levels over its row <= **1.0%** and p99 over the row
  <= **25** (master 2.844% / 46.2).
- **G2 the galaxy sits low.** The top row of the galaxy body - the 15 px blurred frame over luma
  120 - at or below **0.45** of the frame height (master 0.38).
- **G3 a compact core.** The blurred core blob's area <= **2.0%** of the frame and its vertical
  half-width <= **18%** of the frame height, and it still exists: >= 2,000 px over luma 200
  (master 3.745% / 29.89%).
- **G4 arms, not rings.** On the deprojected disc, the four-fold component m4 <= **0.09** while the
  two-fold m2 stays >= **0.30**, so the four-branch signature goes and the arms are still there
  (master 0.132 / 0.422).
- **G5 edges dissolve.** Galaxy light in the outer 40 px band: left and right <= **3.0** of 255
  each, bottom <= **6.0** (master 6.52 / 11.07 / 20.04).
- **G6 the owner's eye** (not measurable): does it read as one galaxy with an ivory core and
  grey-blue arms, and is the name comfortable to read on it.

## Instrument corrections made while measuring

Every criterion below was written before the first measurement and corrected by one. The rule is
the goal file's: when a measurement shows a criterion conflicts with the goal, change it and record
why here.

- **G1, twice.** Written as "mean <= 20 inside the name box". The sky at that height is already
  31.5 of 255, so no build this stage can produce could meet it; rewritten as light above the sky
  floor. That was still wrong: the sky's own vertical gradient is ~9.5 levels brighter at the name
  than at the top of the frame, so a flat floor charges the criterion for the sky. Final form
  measures each pixel against its own row's median, which cancels a smooth vertical gradient and
  leaves only things that read as objects.
- **G2.** Written as "share of the frame's light below the midline >= 90%". The sky carries most of
  the frame's light, so the number moves by a few points for a change the eye reads as large
  (master 80.22%, the shipped build 80.55%). Replaced by where the galaxy's body starts: the top
  row of the 15 px blurred frame over luma 120. Threshold 120 and not 100, because at 100 the
  elliptical-galaxy sprite near the top-left corner is picked up instead. The old number is still
  reported, as context only.
- **G3, twice.** Written as "pixels over luma 200". The galaxy is a point cloud and single points
  hit 255 all over the disc, so that measured the disc, not the core; changed to a 15 px blur,
  which is what the eye integrates, and to the blob CONNECTED to the brightest pixel, because
  bright arms also cross 200. The bounding box of that blob was then dropped too: one bright nebula
  touching the blob drags the box across the frame while the core itself has not moved - two builds
  with an identical core measured 18.3% and 25.8% wide. Final form is the blob's AREA plus its
  vertical half-width through the peak, which is the core's own size across the disc rather than
  along the arms.
- **G4.** Written as a flat angular Fourier transform. The disc is tilted, so a circle on screen
  cuts an ellipse, and the ellipse's own harmonics land on m4: measured flat, the four-branch
  master (m4 0.193) and a clean two-arm build (m4 0.184) are indistinguishable. Deprojecting the
  disc first - second moments of the light give the tilt, the frame is rotated and stretched back
  to circular - separates them: 0.132 against 0.028. The guard clause "lane depth holds at >= 0.78"
  was replaced by "m2 stays >= 0.30". Lane depth is the ring's darkest angular sector, which is the
  inter-arm gap and not the dust lane, and a bright star-birth pocket landing in that gap moves it
  by 0.15 while nothing about the lane changed. It is still reported.
- **G5.** Written as one number over the whole outer band, at <= 3.0. The bottom band does not
  respond to anything this stage can do: shrinking the disc by 5% and moving every detail sprite
  inward left it at 5.09 -> 5.02, because a galaxy laid across the lower half of the frame
  necessarily approaches the bottom edge. The sides carry the criterion at 3.0 each; the bottom
  gets its own looser bar of 6.0 against master's 20.04.

## Stated openly

- This stage changes the at-rest frame on purpose, so **CROSSING's C4a ("galaxy at rest
  byte-identical to master") re-baselines**. CROSSING v2 (PR #40) and v3 (PR #41) measured C4a
  against today's master; whichever lands second must re-measure it, and this brief is the reason.
- The solar act must not move: the six solar views stay byte-identical. Measured in the same PR.
- Labels on the solar side are deliberately out of scope until the composition settles (owner).
