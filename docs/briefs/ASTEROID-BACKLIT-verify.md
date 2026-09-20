# ASTEROID-BACKLIT - verify

Instrument: `scripts/harness/belt-backlit.mjs` + `belt-backlit.py`, deployed Vercel preview, real GPU
(ANGLE/Vulkan Intel RPL-P), home overview, fixed-step clock frozen at frame 1601, 1440x900. One frozen
frame, one switch per screenshot. Every number below was identical on two runs of unchanged code.
The pose has 36 isolated backlit rocks (cosPhase < -0.5, >= 6 px, 12-16 px wide), 43 side-lit and only 1 front-lit.

## Attribution (B2), stock build, backlit rocks, share of footprint pixels > 48/255

| switched off | rocks with bright pixels (of 36) | pixel share |
|---|---|---|
| nothing (stock) | 13-14 | 2.9-3.0% |
| dust points | 13 | 2.9% |
| glow band | 14 | 3.0% |
| dust + band | 14 | 2.9% |
| rock apparent-size dither | 14 | 3.4% |
| **rock specular** | **0** | **0.0%** |

The cause is the rock's specular. Both my inspection (suspect 1 "unlikely, the stock hard N.L") and the
brief's suspect 4 (additive dust) were wrong or irrelevant: the dust and band only lift the background
(footprint mean 4.1 -> 9.5). Bloom and an emissive value were not the cause (the bright pixels survive
with dust and band off, and the material has no emissive/map). Why: on the lit rim of a backlit rock the
light opposes the view, so Fresnel is ~1 and the GGX specular of a light with irradiance ~25 lands at up to
89/255 on a rock whose diffuse is ~10.

Gates tried on the rock specular (backlit rocks with bright pixels, of 36): N.L x N.V 8, V.H 13,
**phase gate 0** (smoothstep(-0.6, -0.2, dot(L,V)) 0). N.L and V.H gates do nothing; N.V helps a little at
a cost to side-lit rocks. Removing the specular outright also gives 0 but darkens side-lit rocks by 7.8/255
and the single front-lit one by 14.4/255, so it was rejected.

## Criteria after the fix (base = fix, stock = seam `__beltDebug.stock`, same frame)

- B1 PASS: backlit rocks with any pixel > 48: 13 -> 0; share 2.90% -> 0.00%.
- B3 PASS: side-lit rocks' footprint mean -0.26 (bar 2); front-lit -0.00 (n = 1, weak coverage, see below);
  whole-frame mean +0.185 (bar 0.5). The +0.185 is deterministic (identical on both runs) and I have not
  explained it; the fix can only remove light, so it comes from something else that differs between the
  first and last screenshot of the run (the seam order), not from the shader.
- B4 PASS: two runs identical to the last digit.
- B5 open, owner's eye: does the belt still read as lit rocks in a glowing band, and are the rim
  highlights gone where he saw the speckles. The pose measured has the rocks at the bottom of the frame,
  not in front of the sun disc, so his exact view may differ.

## Limits, said plainly

- One pose. Rocks in front of the sun disc did not occur at any of three overview pitches (0.06 / 0.14 / 0.30).
- Only 1 front-lit isolated rock, so "front-lit rocks unchanged" rests mostly on the shader's own gate (1.0 above dot(L,V) = -0.2) and the 43 side-lit rocks.
- Left in the code: the HUD-only seams `__beltDebug` (dust, band, dither, spec, stock) and `__beltBacklit`.

## Round 2 (owner: "not gone, seen from below at any angle")

The first pose (yaw 0, pitch 0.30) had no rock in front of the sun disc. Yaw +-1.0 / pitch 0.4 has 280-310
backlit rocks, 25-27 isolated ones measured. There the specular fix (round 1) is real but the visible speckle is
another mechanism: the apparent-size dissolve (10-18 px) is a per-pixel hash discard; over the sun disc every hole
shows a bright granule, so the rock face reads as speckled. Evidence, one frozen frame, yaw 1.0 / pitch 0.4:
`nodither` turns the rock into a solid silhouette; `stock` also shows a bright specular fleck.

Fix: the big-rock dissolve term is skipped inside the sun's screen disc (uniform `uSun`, disc radius 1.5 world
units; near-camera dissolve unchanged). Preview of 22e5d7c, two runs identical:
backlit rocks with bright pixels 17 -> 12 (of 27), pixel share 25.43% -> 17.57%. What remains equals the
`nodither` figure (16.0% / 11) within the dust and glow band that lift the footprint; crops show solid dark
silhouettes. Yaw -1.0 / pitch 0.4 and pitch < 0 not re-run after the fix (before it: 9 -> 4 with fix 1).
Open, owner's eye: rocks just outside the disc are lifted to grey by the additive glow band.
