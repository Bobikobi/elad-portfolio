# GALAXY-REST - verify

Brief: [GALAXY-REST-brief.md](GALAXY-REST-brief.md). Branch `feat/galaxy-rest`.

Baseline: master `93c49c9`. Candidate: `v8`, the head of this branch, on the deployed preview
`elad-portfolio-p2045y6qo`. Real GPU (ANGLE/Vulkan), 1440x900, fixed-step clock frozen at frame
1600. **Two runs of the candidate came back byte-identical PNG to PNG**, so every digit here is the
code.

## Result: G1-G5 PASS. G6 is the owner's eye and is open.

| criterion | bar | master | v8 | |
|---|---|---|---|---|
| G1 behind the name: share over +12 of its own row | <= 1.0% | 2.844% | **0.000%** | PASS |
| G1 behind the name: p99 over its own row | <= 25 | 46.2 | **1.1** | PASS |
| G2 top row of the galaxy body / frame height | >= 0.45 | 0.38 | **0.48** | PASS |
| G3 core area | <= 2.0% | 3.745% | **1.445%** | PASS |
| G3 core vertical half-width | <= 18% | 29.89% | **14.67%** | PASS |
| G3 core still exists | >= 2,000 px | 48,533 | **18,731** | PASS |
| G4 deprojected m4 | <= 0.09 | 0.132 | **0.033** | PASS |
| G4 deprojected m2 | >= 0.30 | 0.422 | **0.376** | PASS |
| G5 outer band, left | <= 3.0 | 6.52 | **2.26** | PASS |
| G5 outer band, right | <= 3.0 | 11.07 | **2.53** | PASS |
| G5 outer band, bottom | <= 6.0 | 20.04 | **5.02** | PASS |

Reported, not criteria: sky floor 31.48 -> 32.38, frame mean 77.863 -> 53.329, light below the
midline 80.22% -> 80.55%, lane depth 0.711 -> 0.534 (see the brief on why this is not a criterion),
disc axis ratio 0.70 -> 0.60.

**The solar act did not move.** `photometry-diff` on all six views, candidate against a preview
build of master's own tree: mean **0.0000**, max **0**, on every one of the six. Master had to be
given a preview of its own - Vercel had only ever built that commit for production, where the HUD
seam is gated off, so an empty commit on master's tree was pushed as `baseline/solar-master-2`
purely to get one.

## What changed

- **Galaxy.tsx.** Four branches at spin 1.1 became two at 0.42, with a per-point angular spread and
  a radial wobble so the arms are broad and irregular. A separate bulge population (14% of the
  points, radius^2.6 inside 0.85) makes the core a point instead of the inner half of the disc.
  A new `aDim` attribute carries three things into the shader: the disc dimmed to 0.58 and the
  bulge lifted to 2.1, so the arms read grey-blue and the core is the one thing allowed to
  saturate; one dust lane per arm, on the trailing side only; and a rim fade over the last half of
  the radius so the cloud dissolves instead of being cut off by the frame.
- **shaders.ts.** `aDim` multiplied into the point alpha.
- **CameraRig.tsx.** The look target y 0.5 -> 1.45 (and `LOOK_START` with it, which must equal
  `LOOK` or the handover at scroll 0.015 jumps), which is what puts the galaxy in the lower half.
- **Dust.tsx.** The 70 foreground motes were spread through the whole volume, so some always sat in
  the empty sky behind the name and the slow rotation kept sending new ones through it. They are
  biased below the eye line now. This is the whole of G1's 2.844% -> 0.000%.
- **GalaxyDetail.tsx.** Its pockets and hero stars were placed on the galaxy's OLD shape - radius
  6, four branches, spin 1.1 - so they were scattered over empty sky, including out at the frame
  edges. They follow the two-arm shape now, spread evenly in radius from outside the core to 0.8 of
  it, with an angular scatter across the arm.
- **GalaxyNebulae.tsx.** The six HII pockets were seeded out to radius 4.6, where the point cloud
  now fades; a nebula that does not fade is what reaches the border. Pulled in to 0.76 of their
  radius, and the two outermost dimmed.

## Dead ends, recorded

- **Shrinking the disc does not empty the bottom band.** Radius 5.4 -> 5.15 with a longer rim fade
  moved G5's bottom from 5.09 to 5.08. The band is the disc's own lower edge, and the only ways to
  clear it are to shrink the galaxy until it no longer fills the lower half, or to lift it out of
  the lower half - both against the direction. That is why the bottom has its own bar.
- **A dust lane on both sides of both arms is a four-fold signature**, which is exactly what G4
  exists to remove: it took the deprojected m4 from 0.087 to 0.196. One lane per arm, which is what
  a real trailing dust lane is, took it to 0.033.
- **Matching the detail sprites to two branches, by itself, clumped them.** Two branches plus the
  old radius^0.7 law piled all 22 pockets into two knots against the core: pink bokeh balls, not
  star-birth regions, and the measured core swelled with them. An even radial spread from 2.2
  outward plus an angular scatter fixed both.

## Open

- **G6, the owner's eye.** Does it read as one galaxy with an ivory core and grey-blue arms, and is
  the name comfortable to read on it.
- The warm nebula to the right of the core (`eagle`) is the one strongly non-blue thing left in the
  arms. Not touched, because "how warm is too warm" is not measurable - it is G6's.
- `baseline/solar-master-2` and `baseline/solar-master-93c49c9` are throwaway branches pushed only
  to get master a preview build. Both hold master's tree exactly and can be deleted.
