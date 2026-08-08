## VERIFY: SUN-2 - three of five criteria, and the reason the other two cannot be met here

Measured 2026-08-08 on the branch preview, `feat/sun-2`, with the debug hooks - they are
stripped from the production bundle, so **SUN-2 cannot be measured on production at all**.
1440x900, the solar overview, a real GPU asserted every run
(`ANGLE ... Vulkan`, never SwiftShader), the disc's position and size taken **from the
camera** rather than from the pixels.

Three builds, same instrument, same viewport:

| | **A** baseline (shader untouched) | **B** the four SUN-2 changes | **C** B, plus emissive 2.2 -> 1.4 (an experiment, reverted) |
|---|---|---|---|
| high-frequency energy `highFreqSd` | 1.316 | 1.811 | **2.446** |
| large-structure energy `lowFreqSd` | 6.480 | 5.983 | 5.049 |
| limb / centre luminance | 1.0059 | 0.9804 | 0.9773 |
| radial profile, 8 bins, centre -> limb | 228.7 … 208.2 | 230.7 … 205.3 | 207.6 … 182.3 |
| silhouette radius sd, share of radius | 0.0117 | 0.0117 | **0.0155** |
| angles whose radius moves between frames | 279 / 323 | 276 / 320 | 284 / 324 |
| draw calls per frame | 67 | 67 | 70 |
| triangles per frame | 148,059 | 148,059 | 149,021 |
| median frame | 16.5ms | 16.6ms | 14.9ms |
| clipped pixels | 0 | 0 | 0 |
| mid tone (median R,G,B on the disc) | 236, 224, 214 | 237, 225, 215 | **225, 201, 179** |

### PASS / FAIL, criterion by criterion

- **C1 granulation - FAIL as written, real progress measured.** The target was 2.5x the
  baseline's high-frequency energy (3.29). Build B reaches **1.38x** (1.811). The detail
  octave is unquestionably there - the large-structure statistic moved only -7.7%, so this
  is added grain and not repainted shapes, exactly as the criterion demanded - but most of
  it is not surviving to the screen. Build C, which changes nothing about the noise and only
  lowers exposure, reaches **1.86x** from the same octave. The grain is being made and then
  compressed away.
- **C2 sphericity - FAIL, and the shader is not where it can be fixed.** Target 0.65-0.75.
  Baseline 1.006, i.e. the rendered limb was as bright as the centre and the term bought
  nothing. After raising the exponent to 0.6 and the depth to 32%: **0.980**. Lowering
  exposure as well: **0.977**. A 32% darkening at the limb is arriving as a 2% one. The
  profile is also not monotone in any build - it dips around `r=0.25` and rises again at
  `r=0.6`, which is not a shape any limb-darkening function has.
- **C3 live edge - PASS at the lower exposure, FAIL at the current one.** Target: radius sd
  >= 1.5% and >= 40 angles moving. Angles moving: **276-284 of ~320** in every build, far
  past the threshold, so the edge was already alive. The sd is **1.17%** at the current
  exposure and **1.55%** at the lower one - the same geometry, differently visible.
- **C4 tier law - PASS.** One mesh, one pass, no new texture. Draw calls **67, 67, 70** and
  triangles **148,059 / 148,059 / 149,021** across the three builds; the differences appear
  between runs of *identical* geometry too, so the honest statement is "no systematic
  change", not "identical to the unit". Median frame time 16.5 / 16.6 / 14.9ms.
- **C5 no clipping - PASS. Its stated reference was wrong, and that matters more than the
  criterion.** No build clips a single pixel of the disc. But the brief said the mid tone
  should stay within ±6 of "production's (254, 218, 124)", the gold B3 measured and locked.
  **Production does not measure that.** It measures **(236, 224, 214)** - a red-to-blue gap
  of 22 where B3's gold had 130. The star is white on screen today.

### WHAT THE MEASUREMENTS SAY IS ACTUALLY WRONG

Every radial bin of the disc measures between **205 and 230 of 255**. The whole surface sits
in the top fifth of the range, where the ACES curve compresses hardest and, as B3 recorded
in this very file, desaturates highlights toward white on the way up.

That single fact explains all three failures at once, and it is why they cannot be fixed
where the queue assumed:

- detail cannot exist in a blown-out region - the octave is drawn and then flattened;
- a 32% darkening at the limb compresses to 2% for the same reason, and what little is left
  is filled back in by the bloom skirt spilling outward off the bright interior;
- the gold desaturates to white on the way up the curve, which is precisely the failure mode
  B3 fixed once by pushing the source colours far more saturated. The source is still that
  saturated; the exposure has since risen past where it works.

The experiment is the evidence, not the argument: **changing nothing but the multiplier**,
high-frequency energy went 1.81 -> 2.45, the edge's variation 1.17% -> 1.55%, and the mid
tone's red-to-blue gap 22 -> 46. Same noise, same limb term, same geometry.

### THE DECISION THIS NEEDS - it is the owner's, and it is outside SUN-2 as queued

Getting C1 and C2 means changing how bright the star is, or how much bloom is laid over it.
Both are load-bearing elsewhere: the emissive magnitude is what Bloom and God Rays read, and
the bloom settings were tuned in R2.2 to kill the milky halo on arrival - a defect that was
worst on mobile. **Nothing here should be changed on a hunch.**

Three ways forward, in the order I would take them:

1. **Lower the sun's emissive multiplier** (the experiment: 2.2 -> 1.4, or a value between).
   Measured to buy back the grain, the live edge and some of the gold. Costs: the star reads
   dimmer, and Bloom and God Rays are fed less - the halo and ray strength would need
   re-measuring against the R2.2 acceptances.
2. **Raise the bloom threshold** instead, so the surface's own structure is not smeared.
   Untested; it targets the limb specifically, which lowering exposure did not fix.
3. **Accept the disc as it is** and keep only what this branch already has - the octave, the
   deeper lanes, the honest limb term and the visible prominences - which cost nothing and
   are in place the moment the exposure question is ever settled.

### WHAT IS NOT COVERED

- **The reference imagery the acceptance names is still missing.** Every number here is
  absolute, or against the baseline. Whether the result reads like the intended photograph
  is not something this instrument can answer.
- **How much grain is the right amount** remains the owner's call on a preview, as the brief
  said before any of this was measured.
- **Only the solar overview at 1440x900.** The arrival framing and the mobile viewport are
  not measured, and the disc is far smaller in both.
- **The low tier** is not separately measured; the frame time above is one machine at one
  quality level.
