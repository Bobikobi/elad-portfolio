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

| | measured |
|---|---|
| behind the name (h1 rect + 12 px) | mean **44.77**, p99 **89.1** |
| share of the light below the midline | **80.22%** |
| core (15 px blur, luma >= 200) | **50,804 px**, box **41.39%** of the frame wide |
| four-fold angular component m4 / m2 / lane depth | **0.1819** / 0.5619 / 0.781 |
| galaxy light in the outer 40 px band | **13.79** of 255 |
| sky floor / frame mean | 31.48 / 77.863 |

## Instrument

`scripts/harness/galaxy-rest.mjs` (capture) + `galaxy-rest.py` (measure). Deployed Vercel preview,
ANGLE/Vulkan real GPU, 1440x900, `?hud=1&tier=high&fixedStep`, fixed-step clock frozen at frame
1600, act asserted to be `galaxy`, DOM hidden after the h1's rect is read. Every number above was
identical on two runs of unchanged code, to the last digit.

The m2 component is NOT an arm count: a tilted disc is an ellipse, which is itself an m=2 signal.
Only **m4** separates the four-branch signature from two arms, so only m4 carries a bar.

## Criteria (measured twice on a deployed preview)

- **G1 darkness behind the name.** Inside the visible h1 rect grown by 12 px: mean <= **20**
  and p99 <= **45** (today 44.77 / 89.1).
- **G2 the galaxy sits low.** Share of the frame's light below the midline >= **90%** (today 80.22%).
- **G3 a compact core.** The blurred core's bounding box <= **20%** of the frame width, and it still
  exists: >= 2,000 px over luma 200 (today 41.39%, 50,804 px).
- **G4 arms, not rings.** Four-fold angular component m4 <= **0.09** (today 0.1819) while the lane
  depth holds at >= **0.78** (today 0.781) - the four-branch signature halves and the structure stays.
- **G5 edges dissolve.** Galaxy light in the outer 40 px band <= **3.0** of 255 (today 13.79).
- **G6 the owner's eye** (not measurable): does it read as one galaxy with an ivory core and
  grey-blue arms, and is the name comfortable to read on it.

## Stated openly

- This stage changes the at-rest frame on purpose, so **CROSSING's C4a ("galaxy at rest
  byte-identical to master") re-baselines**. CROSSING v2 (PR #40) and v3 (PR #41) measured C4a
  against today's master; whichever lands second must re-measure it, and this brief is the reason.
- The solar act must not move: the six solar views stay byte-identical. Measured in the same PR.
- Labels on the solar side are deliberately out of scope until the composition settles (owner).
