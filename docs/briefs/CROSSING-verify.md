# CROSSING verify - the passage from the galaxy into the solar system

Measured 2026-09-19 against [CROSSING-brief.md](CROSSING-brief.md)'s approved criteria, with
C1's bars re-derived after step 0 (the brief records why). Every number comes from a deployed
preview on a real GPU (`ANGLE (Intel, Vulkan 1.4.335 (Intel(R) Graphics (RPL-P)), Intel
open-source Mesa driver)`), 1280x720, under rule 2.

| build | commit | alias |
|---|---|---|
| **control** - master, byte-identical tree | `8d8d1be` (tree of `ce2c11d`) | `elad-portfolio-bk0ktnan7` |
| **candidate** | `aa6854d` | `elad-portfolio-izpla41mp` |

Instrument: `scripts/harness/crossing.mjs` + `crossing.py` - scroll driven on a ramp indexed by
rendered frame under `?fixedStep`, DOM hidden. Two runs per build.

## Verdict table

| # | criterion | bar | master (2 runs) | candidate (2 runs) | verdict |
|---|---|---|---|---|---|
| **C1** | the wash is gone | mean <= 80 and <= 8% of pixels > 200, every frame | 210.8 / 210.8 and 70.18% / 70.18% | **78.9 / 79.0** and **7.87% / 7.87%** | **PASS** |
| **C2** | nothing jumps | max frame-to-frame mean change <= 25; no near-black frame beside a bright one | 29.9 / 29.9 | **3.3 / 2.8**; no dark holes | **PASS** |
| **C3** | no invented colour | abs(mean R - mean G) <= 10 | 28.2 / 28.2 | **7.8 / 7.8** | **PASS** |
| **C4a** | the endpoints are untouched | mean abs pixel difference <= 0.1 of 255 | - | galaxy at rest **0.0000 / max 0**, both pairs; all six solar views **0.000 / max 0** | **PASS** |
| **C4b** | the passage still reads as arrival | the owner's eye | - | not measured | **OPEN - for the owner, on `elad-portfolio-izpla41mp`** |

Candidate runs on the deployed preview: ~45 fps, swap at ramp fraction 0.9333 in both, galaxy
-> solar in both, settled mean 30.6 in both (master 30.6).

C1 has 1.0-1.1 levels of headroom on the mean and 0.13 points on the bright fraction. It passes,
and it is thin: the bar is the galaxy's own resting brightness (76.0 / 7.30%) rounded up, and the
candidate's dive peaks 3 levels above rest. That peak is the untouched galaxy brightening as the
camera flies into it, which this stage is not allowed to change.

## Defect 2 - the black frame - checked on the instrument that can see it

Step 0 found `crossing.py` blind to it. The claim is therefore made from `edge-flash.mjs`, the
recorder that first found it: DOM live, wheel-driven scroll, 35 s of home page, screencast.
Same detector rule as C2 (a frame under mean 20 with a neighbour within 3 frames above 100).

| build | run | frames | max mean | max jump | dark holes |
|---|---|---|---|---|---|
| master | 1 | 1374 | 197.3 | **184.9** | **1** (frame 202) |
| master | 2 | 1364 | 197.0 | **184.9** | **1** (frame 199) |
| candidate | 1 | 1368 | 57.6 | 10.3 | **0** |
| candidate | 2 | 1981 | 57.7 | 19.7 | **0** |

**Defect 2 is fixed**, in both runs of each. Master reproduces the hole and the 184.9 jump
identically twice; the candidate has neither. Candidate run 2's jump of 19.7 is inside C2's 25
but not by much. That recording also holds 1,981 frames in the same 35 s against ~1,370 in the
other three, so its frame pacing differed; I did not investigate whether the larger jump comes
from that, and it is not a repeated measurement.

## What was measured about the cause, on the way

Local production build, real GPU, `crossing.py`'s rest / dive / curtain split (each frame filed
under the store state live when it was captured):

| build | rest | dive (curtain not yet up) | curtain |
|---|---|---|---|
| master | 75.7 | **148.7** mean, 30% > 200, abs(R-G) 27.6 | **210.0**, 69.8% > 200 |
| stars + veils removed, curtain unchanged | 75.5 | 87.0, 11.7% > 200, abs(R-G) 36.0 | 210.0, 69.8% > 200 |
| candidate | 75.6 | 78.6 | 31.7 |

The two halves fail separately. The curtain alone produces the 210; the stars and veils alone
produce the climb from 76 to 148. Removing only the stars and veils left the colour split at
36 (the galaxy's own gold core fills the view as the camera arrives) and left the wash
untouched, which is why the change is both parts and why the fade's end is set by colour, not by
light.

## What changed

- `DiveFade.tsx` (new): one black plane, opacity ramped on `scrollProgress` from 0.10 to 0.64.
  Start is set by the light (the galaxy brightens 76 -> 87 as the camera flies in, so it must be
  closing early); end is set by the colour (the gold core carries a red-green split of up to 83
  under any partial fade, so it must be essentially closed by 0.64).
- `SwapMask.tsx`: keeps its coverage contract and its swap window; is now a single black plane.
  No gold fill, no additive glow, no waypoint star.
- `DiveField.tsx` and `TransitVeils.tsx`: deleted. Both existed only during the dive and were
  invisible at rest, which C4a confirms.
- `CameraRig.tsx`, `diveEnvelope.ts`, the swap machine and the camera path are untouched.

## Not done, on purpose

- The galaxy at rest (the owner's next stage), the solar composition, the sun's size and the
  labels.
- The reverse direction (solar -> galaxy) was not recorded. `SwapMask` serves both directions and
  its coverage contract is unchanged, so the swap window is the same; the visual of the
  return has not been looked at.
- Phones, and the low quality tier, were not measured. `DiveFade` and `SwapMask` have no tier
  branch, and the removed components were the only tier-dependent part of the passage.

## Instrument notes recorded for the next stage

- `crossing.mjs` now stamps each rendered frame with the wall clock, and `crossing.py` files each
  screencast frame under the store state live when it was captured. Aligning by ramp position
  misfiles the curtain's frames as the dive, because the act swap stalls for hundreds of ms.
- `p4-galaxy.mjs` gained the Vercel bypass block `photometry-diff.mjs` already had, so it can
  reach a deployed preview. Before this it could only ever measure localhost.
