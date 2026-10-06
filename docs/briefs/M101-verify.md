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

# Round 2 - M101 in motion (2026-10-05)

The owner on the round-1 preview: better, but missing detail, especially in motion - not rich and
alive enough; the tunnel's colours unrelated; the start of the path and its colours should match.
Answers: the location is both the dive target in the galaxy and where the tunnel opens on screen;
the tunnel enters in M101's colours and warms to the sun; the dive star takes M101's colour.

Numbers from the branch preview alias (deployment from 9792edd), desktop 1440x900, runs v-down,
v-down2, v-up..v-up3, v-worst (`?spin=1`: the full 0.5 rad turn, the longest possible rest),
von/voff (rest-life). "Before" is the round-1 build (b0-down, same localhost instrument).
Instruments: `m101-motion.py` (C1, C2, C4, C3), `richness.py` (T1-T4), `passage.py`.

| | bar | before | measured | |
|---|---|---|---|---|
| C1 tunnel colour, first half (B/R vs the last galaxy frame) | ±15% | +25% | -9.2% / -9.6% (worst-rest -6.4%) | PASS |
| C2 seam (max RGB jump, last galaxy -> first tunnel frame) | ≤ 10 levels | 95.6 / 97.2 | 6.0 / 5.5 (worst-rest 5.0) | PASS |
| C3 disc-body change at rest, life on vs off | ≥ 3x | 2.79 (spin only) | 3.23 = 1.16x · life alone, no spin: 1.08 vs 0.13 floor | FAIL - see below |
| C4 dive fine detail | ≥ 1.5x | 1.196 / 1.215 | 2.86 / 2.82 (2.4x) | PASS |
| GALAXY-REST, worst of 6 phases (localhost) | ≤ master | round 1 | G1 0.207% / p99 1.8 · G3 0.1135 · G5 right 1.28, bottom 25.23 · G4 m2/m4 1.41 | same as round 1 (G4 m2/m4 conflict stays) |
| M2 stars' share at rest (disc stars + new halo) | 5 ± 2% | 5.39% | 4.66% | PASS |
| T1 min change between tunnel frames | ≥ 3 | 3.67 | down 4.67 / 5.55 · up 2.91 / 3.46 / 3.53 | PASS down, 1 of 3 up runs 0.09 under |
| T2 tunnel detail | ≥ 45% | 48.8% | 53.3 / 49.8 · up 57.4 | PASS |
| T3 tunnel mean / over 200 | 20-80 / ≤ 8% | 62.0 | 52.5 / 53.5 · 1.3% | PASS |
| T4 visible, moving | 0.5-0.9 s | 0.65 | 0.63 / 0.66 / 0.68 | PASS |
| D1 velocity vs look, last 0.5 s | ≤ 8° | 2.7° | 2.84 / 2.86 · worst rest 6.5 | PASS |
| D2 / D3 star and tunnel centre | 0 | 0 | 0 (look locked on the knot, centre drawn at screen centre) | PASS |
| turn, both clocks | ≤ 1.5°/frame | 1.01 | 0.98 | PASS |
| no frame > 0.1 s | 0 | 56-74 ms | 45-61 ms | PASS |
| dark_ms | 0 | 1112 | 0 down and up | PASS (was the round-1 conflict) |
| up-run stall at solar 0.987 | - | 458-529 ms (master 313) | 541 / 850 / 917 ms (localhost 437-850) | FAIL - older than this round, wide spread run to run |

C3: today's change at rest is almost all the spin (camera held: life off 2.79, spin off 0.13).
The new life - the photo's knots scintillating, stars twinkling - is eight times its floor with
the spin stopped and adds 16% with it. Three times today would need ~8 levels of mean change over
the whole disc every half second, which only the smooth arm light moving can give (a faster spin
or a brightness wave over the arms), and a faster spin carries the dive target further. Left for
the owner's eye on the preview, not tuned past this. DECISIONS 2026-10-05.

The dive is now brighter than the rest pose near its end (mean ~41 just before the curtain
against ~21 at rest; over 200 at 1.3%) - that is the detail C4 asked for, and the reason the old
fade was 0.71 is gone with the procedural disc. The biggest frame-to-frame picture change while
visible went 3.8 -> 13.4: the old dive was too dark to count, and the new one is the star field
rushing past in the last 0.15 s before the curtain (a smooth rise 7 -> 13), not a cut.

Not measured this round: phone. For the owner's eye: the tunnel's colours and its warming, the
dive's star field fading in from the start, the life at rest, the halo's depth, the brighter dive.

# Round 3 - sparkles, a gradual dive, a bigger galaxy (2026-10-05)

The owner on the round-2 preview: the points that appear as the camera tilts are prettier than
the galaxy itself and pop in all at once, mostly on the right; can the galaxy be more alive, and
cover more of the screen. Approved: the dive's soft stars over the whole galaxy at rest, the
dive's own stars revealed one by one, and a bigger disc. M2 (stars' share 5 ± 2%) replaced by K1.

Numbers from the branch preview alias (deployment from d1a26ef), desktop 1440x900: galaxy-rest
pv / pvoff (`?spk=0`), 6 phases; passages pva-down, pvb-down, pvw-down (`?spin=1`), pvu-up.
"Before" is round 2 (k-rest, v-down; same instrument on localhost). Instrument: `sparkle.py`.

| | bar | before | measured | |
|---|---|---|---|---|
| K1 points picked out on the disc at rest, per phase | ≥ 2x | 2117-3428 | 5365-8434 = 2.38-2.53x | PASS |
| K2 largest rise in points between consecutive frames, scroll 0-0.45 | ≤ 10% | 26.6% | 6.7 / 7.5 · full turn 7.1 | PASS |
| K2 sky points past the galaxy's edge, max vs rest | ≤ 1.3x | 6.2x | whole sky 1.9-2.2x · 40 px edge band 54-73 points (before 265) | FAIL as written - the rise is the background stars at the frame's sides, present on round-2 code |
| K3 sparkles' light per cell vs the photo's luma | r ≥ 0.5 | - | 0.857 worst phase | PASS |
| K4 name box (G1), worst phase | ≤ before | 0.19% / p99 1.8 | 0.051% / p99 2.0 | PASS on rows, p99 0.2 higher |
| K4 fps, desktop | ≥ 38 | 39.6-40.3 | 39.6-40.0 (localhost 37.5-40.0, 1 run of 5 under) | PASS |
| K5 galaxy width, worst phase | ≥ 1.25x | 741 px | 973 px = 1.31x | PASS |
| K5 bottom band (G5 bottom) | ≤ 28.7 | 25.4 | 22.8 | PASS |
| K5 dive lands on the star | locked | 0.001 deg | 0.002 deg (at the run's spin) | PASS |
| C1 tunnel colour | ±15% | -9.2 / -9.6% | -9.3 / -9.4 · full turn -7.2 | PASS |
| C2 seam | ≤ 10 | 6.0 / 5.5 · full turn 5.0 | 3.5 / 5.8 · full turn 11.4 (localhost 10.4, 10.9) | PASS, full turn FAIL |
| C4 dive fine detail | ≥ 1.5x of 1.196 | 2.86 | 3.79-3.93 | PASS |
| T1 / T2 / T3 / T4 | ≥ 3 / ≥ 45% / 20-80, ≤ 8% / 0.5-0.9 s | 4.67 / 53 / 52 / 0.65 | down 5.36, 7.11, full turn 3.32, up 4.10 / 50-57% / 43-53, 1.3% / 0.63-0.65 | PASS |
| D1 velocity vs look, last 0.5 s | ≤ 8° | 2.85 · full turn 6.5 | 5.01 / 4.74 · full turn 6.02 | PASS |
| turn, both clocks | ≤ 1.5°/frame | 0.98 | 1.06-1.07 | PASS |
| no frame > 0.1 s · dark_ms | 0 · 0 | 0 · 0 | max 58 ms · 0 | PASS |

C2 at the full turn: a visitor who rests long enough for the disc to turn 0.5 rad (well over a
minute) ends the dive at a knot 2.2 units from where the path was designed, over brighter arm
light, and the last galaxy frame is ~10 levels brighter than the tunnel opens (51.6 vs 44.5). The
ordinary dive is 3.5-5.8. Not tuned; for the owner.

Not measured: phone. For the owner's eye: how much sparkle (`?spk=0.8,16000,1.2` is the 2x look,
`?spk=0` none), the bigger galaxy and its lower framing, the dive's stars coming in.
