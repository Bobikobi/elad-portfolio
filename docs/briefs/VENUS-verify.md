# VENUS burnt white (PR #44)

Spec: INDEX.md open item "Venus burns to white on the overview" and P4-brief P4-3 (burnt-in-all-channels pixels on the overview <= 958, from 1,483). Lever named there: her albedo multiplier.

Change: VENUS_ALBEDO_MULTIPLIER 2.76 -> 1.40 (src/lib/photometry.ts). It is no longer the measured real albedo; this is a deliberate visual trade.

Measured on deployed previews, real GPU (Intel RPL-P, Vulkan), p3-albedo + p4-chroma. Baseline = PR #43 preview (master's 2.76).

| Criterion | Result |
|---|---|
| V1 burnt pixels (all channels) on the overview <= 958 | PASS 855 (of 2,081 disc px), identical in two captures; local sweep: 2.2 -> 1,294, 1.8 -> 1,108, 1.4 -> 855 |
| V2 Venus still the brightest planet (P3-3) | PASS, order unchanged: venus > saturn > mercury > mars > uranus > jupiter > earth > neptune |
| V3 other worlds unchanged (P3-4) | PASS, +0.0 on all five focused worlds |
| V4 tier law (P3-5) | PASS, same calls and triangles |
| P3-1 aggregate | still FAIL by design, overview 1,498 -> 867; Earth's clouds (9,716) are a separate open item |

Not measurable, left to the eye: whether Venus at 1.40 still reads as the brilliant inner planet or looks dull.
