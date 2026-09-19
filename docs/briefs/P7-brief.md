# P7 brief - richness: what the sun should look like

Written 2026-08-17, before any pixel moves, per standing rule 1.
Stage P7 of [PHOTOMETRY-megaplan.md](PHOTOMETRY-megaplan.md). Owner-facing: the criteria
below are approved, the conflict in them is the content of the stage.

---

## Why this stage exists

The owner looked at the post-SUN-3 sun on a preview alias and said it was bad. He is right,
and the reason is recorded in the plan: **every criterion in this project is a guard, not a
goal.** C1, C2, C3 and C5 all passed while the disc read as a matte salmon ball with cells
the size of continents. SUN-2's C1 asked for high-frequency energy at 2.5x production and
never asked what SIZE the grain should be, so a golf-ball texture passes a granulation test.

He supplied a reference - a NASA 4K solar photograph - and asked for it "but dynamic, not
static". Those references have since been measured, so this stage aims at numbers rather than
at an impression.

## What the real sun measures

From the approved sources in [refs/README.md](refs/README.md), measured 2026-08-17:

| quantity | real sun | ours today |
|---|---|---|
| granule diameter | **0.066-0.069% of the disc diameter** (~915-959 km), two independent methods on DKIST scaled by its own 500 km bar | Worley noise at frequency 12 over the unit sphere: about 24 cells across a diameter, so **~4% per cell**, roughly 60x too coarse |
| granulation contrast | **sd 22.0 of 255** on a mean of 173 (12.7% RMS), Hinode SOT G-band | not measured on our render yet - this stage measures it |
| centre-to-limb | **1.79** linear, u = 0.654, SDO/HMI | SUN-3 measured 0.804 as limb/centre luminance, i.e. 1.24 the other way round - far flatter than the reference |
| granulation lifetime | correlation **halves in 252 s** | not measured - the fixed-step clock now makes it measurable |

**The reference is a direction and a ceiling, not a target to copy.** 1450 cells across a
680px disc is half a pixel each: invisible, and expensive. The criteria below aim at the
finest grain that survives being drawn.

---

## Criteria

| # | criterion | how | target |
|---|---|---|---|
| **S1** | the grain is FINE | typical cell diameter from the rendered disc, as a fraction of the disc diameter, measured by autocorrelation and by power spectrum, both reported | **1-2% of the diameter**, i.e. 50-100 cells across. Today ~4% |
| **S2** | the core is HOT | peak channel inside r < 0.25 | **>= 240 of 255**, with pixels blown in all three channels staying under **1% of the disc** |
| **S3** | there is a corona | median luminance in the annulus 1.1-2.0 R against the sky median | **at least 2x the sky**, and R2.2's corner luminance must not rise |
| **S4** | the limb still falls away | limb/centre luminance on the TRUE silhouette, fitted from the image | **<= 0.75**. SUN-3 measured 0.804, so this stage tightens it |
| **S5** | it burns | frame-to-frame correlation of the granulation field on the fixed-step clock | correlation **halves within 6-20 s of scene time**. The real sun halves in 252 s; a site that made a visitor wait four minutes to see the surface move would be faithful and dead |
| **S6** | the tier law | calls, triangles, median frame time, both tiers | **unchanged**, per the standing law |

## The conflict, and it is the whole stage

**S2 and S4 pull against each other, and SUN-3 proved it with numbers.** Brightening the disc
pushes red into the ACES shoulder where a 10% brightness change moves the output 3 of 255 -
so a sun bright enough to have a hot core is a sun with no shading, and that is exactly the
trade SUN-3 took in the other direction when it dimmed the disc from sRGB (216,141,87) to
(186,124,89).

Therefore **exposure is not the lever.** The levers are the colour ramp's stops and the tone
response, and the fact that they are now in one module is what makes changing them as a group
possible at all. Any attempt to satisfy S2 by raising `SUN_EMISSIVE_EXPOSURE` will fail S4,
and doing it the other way round is what produced the sun the owner rejected.

## Risks

| risk | mitigation |
|---|---|
| **Aliasing.** Raising the Worley frequency from 12 to ~50 puts cell edges near the pixel grid; the shader's own comment already warns that further octaves would land finer than the surface can carry | measure shimmer explicitly: capture consecutive fixed-step frames and look at high-frequency energy between them, not just within one |
| **The tier law.** A finer grain must not cost a weaker machine its composition | S6, measured on both tiers, and the noise frequency is data rather than a tier-dependent branch |
| **S5 against SUN-2's C3.** C3 wanted a live limb; S5 wants a live surface. They can be satisfied by the same motion or fight for the same budget | measure both after the change; C3's numbers are recorded and must not regress |
| **Chasing the photograph.** DKIST's published JPEG is colourised and stretched; its 37% contrast is not a physical target | the contrast figure used here is Hinode's 12.7%, and the reference file records why |

## Out of scope

The other bodies. The owner asked for them too, and they need a reference each before they can
have criteria - none exists yet. Earth's cloud clipping and Venus's neutral over-exposure are
recorded in P4 and remain unassigned. Mobile startup is deferred by the owner.
