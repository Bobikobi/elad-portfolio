# ASTEROID-BACKLIT - bright speckles on the faces of rocks seen against the sun

Branch `fix/asteroid-backlit` off master 93c49c9. Reported by the owner 2026-09-20: asteroids
that are lit from behind (the sun is behind the rock as the camera sees it) show bright,
unclear speckles on their faces, where they should be only shadowed.

## Suspects, and what inspection already says (before any pixel)

1. Specular with no terminator gate (the EDGE-FLASH mechanism, PR #38). **CONFIRMED BY MEASUREMENT (the inspection call below was wrong,
   see ASTEROID-BACKLIT-verify.md).** Original inspection note: unlikely - That patch lives in `Planet`'s own `onBeforeCompile` (SolarAct.tsx) and rewrites
   three's `lights_physical_pars_fragment` for that material only. The rocks use a stock
   `meshStandardMaterial`, whose `dotNL` is the hard `saturate(N.L)`. The blow-up needed a soft
   irradiance times a hard-zero BRDF dotNL, and the rocks have no soft irradiance. Still to be
   confirmed by a single change, not by reading.
2. Bloom lifting bright pixels (sun glow bleeding into the rock footprint).
3. An emissive value in the asteroid texture. **Ruled out by inspection**: the rock material has
   no `map`, no `emissive`, only a per-instance `instanceColor` (AsteroidBelt.tsx, `<meshStandardMaterial roughness=0.95 metalness=0 flatShading>`).
4. NEW, not on the owner's list: the two additive layers drawn over the rocks, the dust points
   and the glow band. Both use a forward-scatter term that is at its MAXIMUM exactly when the
   sun is behind the grain (`dot(toEye, lightDir) -> 1`), i.e. in precisely the backlit case, and
   both are additive with depth-test only, so a grain in front of a rock adds light onto its face.

## Instrument

`scripts/harness/belt-backlit.mjs` (+ `belt-backlit.py`). Home overview, fixed-step clock frozen,
DOM hidden. The HUD-only seam `__beltBacklit(minPx)` returns every rock on screen with its
projected size, screen position and phase (`cosPhase < -0.5` = seen against the sun).
`__beltDebug = {dust, band}` switches one additive layer off. All four configurations
(base / no dust / no band / both off) are screenshots of the SAME frozen frame, so a difference
between them is the layer and nothing else.

## Criteria (provisional, owner may veto)

- **B1 (the defect)**: for every rock with `cosPhase < -0.5` and projected diameter >= 6 px, inside
  the disc of 0.6 x its radius around its centre, the share of pixels with luma > 48/255 is **0**
  in the shipped configuration (`base`) after the fix. 48 is above what a rock of the belt's palette
  (max sRGB #544738) reaches under ambient alone.
- **B2 (attribution)**: one layer switched off at a time, the B1 share in the same frame; the
  layer whose removal takes it to 0 is the cause. Recorded for the base build BEFORE the fix.
- **B3 (no collateral)**: rocks that are NOT backlit (`cosPhase > 0.5`) and the dust band's overall
  look are unchanged: mean luma of the whole frame within 0.5/255 of the pre-fix frame, and the
  non-backlit rocks' footprint mean within 2/255. Six solar views' byte-identity is NOT claimed:
  the belt is in the overview and `/technologies`.
- **B4 (repeat)**: B2's numbers identical on two runs of unchanged code (measure the instrument first).
- **B5, owner's eye**: the belt still reads as a glowing dust band with lit rocks. Not measurable.

If B1's 48 turns out to sit inside what the bare rocks reach (sun bloom leaking into the footprint),
the threshold is revised against the bare configuration and the reason recorded here, one line.
