# M101 - verify (#82 stage 2)

Criteria from [M101-brief.md](M101-brief.md). Every number below comes from the branch preview
alias (`elad-portfolio-git-feat-galaxy-richness-…vercel.app`, deployment from 0db3db7, 2026-10-04),
desktop 1440x900, unless a row says otherwise. The rest frame on the alias is byte-identical to the
local one, so the localhost tuning numbers in DECISIONS carry over.

Runs: `galaxy-rest` a-rest (6 phases) + gxP / gxS / gx00 / tLow / tHigh · `passage` a-down,
a-down2, a-up · M4 probe a1-a3 (scratch, not committed) · master = production deployment
b09koph80 for the load baseline, l0 / m0 runs from DECISIONS 2026-10-02 for the rest.

## Sky and photo

| | bar | measured | |
|---|---|---|---|
| S1 sky chroma | ≤ 10 | 6 | PASS |
| S2 ring vs frame edge | ≤ 6 levels | 4 (ring 7,9,13 · edge 5,7,9) | PASS |
| M1 radial profile, 12 bins | each within ±25% | bins 1-11: 0.95-1.22 · bin 12 (0.78-0.85R): 1.44 | FAIL (last bin) |
| M1 arm colour B/R | ±15% | +6.7% | PASS |
| M2 stars' share at rest | 5 ± 2% | 5.39% | PASS |
| M3 tier law (low vs high, 6 px blur) | ≤ 3 levels | 0.25 | PASS |
| M4a first revealed frame | ≥ 80% of settled | 0.95-0.97 (3 runs) | PASS |
| M4b no frame > 50 ms from the 4096 swap | 0 | one 67-83 ms frame ~1.07 s after the reveal, on a still view | FAIL |

M1's last bin is the dim rim, where the render runs 44% brighter than the photo relative to 0.3R.
Hypothesis, not proven: the star field and the rim fade add light the photograph does not have
there. It is reported, not tuned away.

M4b: the 4096 upload is one frame wherever it lands. It was moved off the reveal to 1 s later on
a still view. Production today, same probe: 183-200 ms frame ~5.9 s after the reveal, plus 50-67 ms
frames at 0.1-0.17 s. The branch's worst is 100 ms (a frame at the reveal with no JS in it, also
seen on production). The loader is up ~0.3 s longer than production (ready at 2.54-2.62 s against
2.05-2.49 s) because it now waits for the disc.

## Galaxy richness and guard

| | bar | measured (a-down / a-down2) | |
|---|---|---|---|
| G1 fine / mid | ≥ 5.73 / ≥ 8.5 | 3.81 / 5.99 | FAIL - conflict |
| G2 lanes | ≥ 20% | 15.5% | FAIL - conflict |
| G3 warm / blue | ≥ 15% / ≥ 40% | 7.8% / 16.2% | FAIL - conflict |
| G4 no brighter than today | ≤ master | frame mean 21.6 (master 68.2) | PASS |
| G4 name area dark | ≤ master | GALAXY-REST G1 0.191% / p99 1.8 (master 1.746 / 32.6) | PASS |
| G4 GALAXY-REST no worse than master | ≤ master | G3 fwhm 0.1145 (0.193) · G5 right 1.28 (6.72), bottom 25.37 (28.67) · **G4 m2/m4 1.42 (master 1.80, bar 1.5)** | FAIL on G4 m2/m4 |
| G4 fps not lower | ≥ master | 38.1 / 39.6 fps down (master l0 34.0) | PASS |

G1-G3 were set for the procedural disc before the photo direction. The photograph is what M101
looks like, and it measures darker, less coloured and with fewer lanes by these instruments. A
brighter photo was tried: gain 1.5 lifted fine to 4.05 and lanes to 21.1% but pushed GALAXY-REST
G5 bottom to 34.8, past master. The brief says the bar is not moved quietly: **the owner decides**.

G4 m2/m4 (two-arm against four-arm power) reads 1.42 at the worst phase: M101 is a many-armed
galaxy, so the photo is honestly less two-armed than the procedural disc. Same: the owner decides.

## Tunnel

| | bar | a-down | a-down2 | a-up | |
|---|---|---|---|---|---|
| T1 min frame-to-frame change | ≥ 3 | 5.75 | 4.11 | 5.86 | PASS |
| T2 detail | ≥ 45% | 54.0% | 52.8% | 54.8% | PASS |
| T3 mean / over 200 | 20-80 / ≤ 8% | 62.2 / 0.73% | 48.5 / 0.68% | 47.4 / 0.55% | PASS |
| T4 visible, moving | 0.5-0.9 s | 0.65 s | 0.65 s | 0.67 s | PASS |

## Dive

| | bar | a-down | a-down2 | |
|---|---|---|---|---|
| D1 velocity vs look, last 0.5 s | ≤ 8° | 1.5° | 2.7° | PASS (before: 32.9°) |
| D2 star from centre at curtain start | ≤ 5% of the diagonal | 0.0° | 0.0° | PASS (before: 23°) |
| D3 tunnel's warm centre on the star | ≤ 2% of width | 0 px | 0 px | PASS (by construction: look locked, centre drawn at screen centre) |

## Stage 1 passage

| | bar | measured | |
|---|---|---|---|
| no frame > 0.1 s | 0 | down 74 / 56 ms max · up none over 50 | PASS |
| no stall, down | - | 175 / 186 ms at solar 0.96-0.98 (master l0 233 ms) | PASS against master |
| no stall, up | - | 458 ms at solar 0.987→0.962 (master l0 313 ms) | FAIL - older than this change, grew with the stage-2 tunnel (f2c-up 523) |
| speed before / after the tunnel | ≥ 50% of peak | 8.6-9.4 of peak 9.8-10.1 into the curtain | PASS |
| turn, 60 fps both clocks | ≤ 1.5°/frame | 1.01 / 1.00 / 1.01 | PASS |
| dark_ms | 0 | 1173 / 1141 down, 782 up | FAIL - conflict |

dark_ms counts frames with a mean under 20, and the photo galaxy rests at a mean of ~21 (the
procedural disc: 57), so the dive passes under 20 by the look the owner chose. See DECISIONS
2026-10-04 "Read dark_ms and the up-run stall with this".

## For the owner's eye

- The photo's look and colour, and its size (`?gr=` compares radii).
- The spin speed and the stars' share at rest.
- The sky's shade (now neutral charcoal).
- Whether the dive into the star feels cinematic, and the star's own look.
- Antigravity's critique that the star field reads as a flat, uniform set of fuzzy dots.
- The four conflicts above: G1-G3, GALAXY-REST G4 m2/m4, dark_ms, M1's last bin.
