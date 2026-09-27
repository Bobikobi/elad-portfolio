# Mars aperture - verify record

Backlog item "Mars 11.10% clipping" (INDEX.md, P4-brief). Spec: over a full Mars turn the disc clips
0.00%-11.10% (worst at 297.9 deg, red channel only); P4 may only not make it worse.

Change: `ORBIT_APERTURE.mars` 0.92 -> 0.6 in `src/lib/photometry.ts`. One constant.

## Sweep (`mars-turn`, 24 longitudes, `?orbitexp=<v>`, preview of PR #43, real GPU)

| aperture | worst clip | median | longitudes clean | mean luminance min / avg / max |
|---|---|---|---|---|
| 0.92 | 11.103% at 297.9 | 0.196% | 7 of 24 | 115 / 138 / 164 |
| 0.75 | 3.552% at 297.9 | 0.000% | 14 of 24 | 106 / 130 / 157 |
| 0.6 | 0.001% at 283.0 | 0.000% | 23 of 24 | 96 / 121 / 148 |

## Shipped value, measured twice on this branch's own preview (no override)

Preview `elad-portfolio-3nnxtk8m4`, commit 6c95fce, tags mv-1 and mv-2: both WORST 0.001% at 283.0 deg,
23 of 24 clean, closing sample 0.000%, frame diff 7.555 - identical to the sweep row.

## Verdict

PASS: worst longitude 11.10% -> 0.001%; average mean luminance 121 sits inside the 90-135 band the other
worlds were held to. Mars is no worse anywhere. Not measurable: whether Mars still looks bright enough
- the minimum longitude reads 96 - is Elad's call on the live site.
