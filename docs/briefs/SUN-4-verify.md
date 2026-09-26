# SUN-4 - the sun as a star (verify record)

Owner: "the sun itself is not beautiful yet" (2026-09-20): an orange-brown ball, a grainy cobblestone
texture, detached bright blobs beside it. Concept from Astra (answers/2026-09-20T12-58-49.md), every number
checked against this pipeline before use; her critique of the first build is answers/2026-09-20T13-15-50.md.

## What changed (`Sun.tsx`, `spaceMaterials.ts`)

- Broad warm patches lead, granules become texture inside them (weights: patches 0.18 -> 0.36, cells 0.28 -> 0.09).
- Ramp brown -> amber-gold, limb turns amber (blue and green fall faster than red; red untouched).
- Two sunspots (penumbra + umbra) attached to the sphere.
- Prominences: 5 one-rooted flame sprites -> 3 two-rooted 3D loops attached to the sun's rotating frame (plasma fills from the feet up and drains from the crest, 18-26 s).
  Final build (b002956): the loops run on their own monotonic clock, because `state.clock.elapsedTime` reset from 2.49 to 0 when the solar scene mounted and made them jump; an 8 s fade-in; a loop starts behind the limb by spin direction; a loop fades out before it crosses the face of the disc.
- New attached inner corona to 1.45 R (two exponentials + three drifting wisps). Faces the camera position, sits 0.35 R
  behind the centre; the first two builds painted a crescent over the disc / sat off-centre (both seen in captures, fixed).
- Vertex wobble 0.13 -> 0.08 (the outline read scalloped).

## Measurement (p7-sun, 1440x900 DPR 2, real GPU, deployed preview of b002956 (`elad-portfolio-3qwteqtqy`), run twice, identical)

| # | criterion | before (P7 signed) | now | verdict |
|---|---|---|---|---|
| S2 | core peak >= 215, blown < 1%, core/limb >= 1.5 | 224, 0%, 2.16x | 228, 0.0000%, 1.77x (unchanged by the loops) | PASS |
| S3 | corona >= 2x sky, corners <= 3.1% | 2.955x, 0.000% | 3.26x, 0.000% | PASS |
| S4 | limb/centre <= 0.75 | 0.743 | 0.701 | PASS |
| S5 | half-life 4-20 s | 5.16 s | 7.75 s | PASS |
| S1 | spectrum grain 1-2% of the disc diameter | 1.943% | NOT MEASURED: the autocorrelation finds no zero crossing (the broad patches dominate); 2.02% on the last build where it could run | see below |
| S6 | tier law: calls, triangles, median | 69/64, 167,134/146,549, 16.700 ms | 66 calls (3D loops draw fewer objects than the sprites), median 16.700 ms | flagged only because the counts DROPPED by one call (3 loops + 1 corona instead of 5 flames); median unchanged |

S1 is superseded on purpose: it asked for 50-100 granules across the diameter, which is what drew the cobblestone
the owner rejected. The granules are still there (grain octave kept); their share of the picture is what changed.
Not measurable and left to the owner: whether it now looks like a star, the sun's brightness level against the planets
(Astra: the sun should be the brightest thing in the frame; today Venus's lit face is hotter - that is the P6 question),
the outline, the loops' look.

Open (owner's eye, 2026-09-20): whether the loops move smoothly and endlessly with no jump, and the report that the sun looks slightly transparent with the beam visible through it. The transparency cause is NOT proven. If it persists: ask which area, then test the god rays over the disc (weight 0 against current).
