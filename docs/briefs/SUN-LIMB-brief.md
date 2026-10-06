# SUN-LIMB brief - the desktop sun's blurred edge (Task B)

Branch `fix/sun-limb-desktop`, from master `85ba2e6`. Measure-first: no shader change yet.

## The complaint

Elad, 2026-10-06, verbatim: "התיקון שעשית לשמש במובייל נראה טוב אבל הטשטוש גבולות בדסקטופ
מסתיר אותה, קבענו לתקן את זה וזה לא מופיע עוד בפרודקשן."
(The sun fix on mobile looks good, but the blurred edges on desktop hide the sun.)

The earlier agreement he refers to was not found in the record. This brief does not reconstruct it.

## Baseline (production = master 85ba2e6, solar overview, DOM hidden, real GPU)

Instrument: `scripts/harness/sun-limb.mjs` (capture) + `scripts/harness/sun-limb.py` (measure).
Texture = std of high-pass luma in a ring. Edge = 10-90% width of the orange-to-outside drop.

| view | sun R (render px) | texture 0.90-0.95R | same, / 0.4-0.5R ring | luma 0.90-0.95R | edge 10-90% |
|---|---|---|---|---|---|
| 1440x900 @1 | 175 | 6.4 | 0.39 | 90.5 | 10.7% R (18.6 px) |
| 1920x1080 @1 | 178 | 5.4 | 0.34 | 90.6 | 6.9% R (12.3 px) |
| 1536x850 @1.25 (Elad's laptop) | 177 | 5.2 | 0.34 | 90.6 | 7.1% R (12.6 px) |
| phone 390x844 @3, tour | 589 | 18.2 | - | 72.9 | 2.0% R (12.0 px) |

The instrument repeats: 1920x1080 and 1536x850 render the sun at the same 177-178 px and give
the same numbers to within 0.2 (two separate captures).

What the numbers say:
- On desktop the texture holds to 0.85R, then fades to a third by 0.90-0.95R. This leaves
  a smooth dark-orange band (luma 200 -> 90 from 0.7R to 0.95R) with nothing on it. The phone
  carries 3.5x more texture at the same fraction of the radius.
- The edge is ~12 render px wide everywhere. On the phone's sun (589 px) that is 2% of R and
  reads as crisp. On desktop (177 px) it is 7-11% of R and reads as a blur.

## Suspected causes (not yet tested)

1. `LIMB_REACH = 100` (PR #79, commit c5efffb) moved the limb darkening and the fibril fade
   inward to 0.73-0.91R on every far view. It was meant to copy the phone's edge. But the
   phone's tour is a close-up (R/d > 0.3), so it eases back to plain `ndv` and never shows
   this wide band. Desktop got the wide band, and the phone kept its sharp edge. This is the
   first suspect, because the complaint started after #79.
2. The fibril footprint fade (`fwidth`, DECISIONS 2026-10-01). At 177 px the foreshortened
   fibrils near the limb fall below ~2 px and fade to their mean.
3. The corona's inner glow (`amp`, decay 5.5% R) and the spicule fringe sit on top of the
   silhouette.

## Proposed criteria (awaiting Elad's approval)

All three measured at 1440x900, 1920x1080 and 1536x850@1.25 on the preview alias, with the same instrument:

- **L1 texture to the edge:** texture in the 0.90-0.95R ring is at least 12 at every desktop
  size (today 5.2-6.4; the phone has 18.2).
- **L2 sharp edge:** edge 10-90% width is at most 4% of R at every desktop size (today 6.9-10.7%;
  the phone has 2.0%).
- **L3 nothing else moves:**
  - The phone's numbers stay within ±5%.
  - Sun flicker at 0.9-0.97R (`p7-sun`, fixed-step) is no worse than today's.
  - Desktop fps stays at 38 or above, with no frame over 0.1 s.
- **Left for Elad's eye:** the look of the sun.

## Plan after approval

1. Test the cheapest suspect first: limit the wide reach to views where the sun is large in
   render px, so desktop falls back to the silhouette angle. Measure L1/L2.
2. Only if L1 still fails: keep a coarser fibril octave alive near the limb instead of fading
   to the mean (DECISIONS: finer than the render can carry flickers - stay coarse).
3. Only if L2 still fails: tighten the corona's inner glow on far views.
