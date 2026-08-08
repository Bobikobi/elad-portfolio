## BRIEF: SUN-2 - the sun reads as a photographed star, not a smooth disc

> Written 2026-08-07, before implementing. Not back-dated.
> **Criteria below need the owner's approval before any pixel changes** - this is a visual
> change, and "it looks better" is not a result.

### CURRENT STATE, read off `src/components/scene/solar/Sun.tsx` at `e033bba`

| | what is there now |
|---|---|
| noise | one `fbm`, **4 octaves** of value noise, used twice: `slow` at `vPos*2.4` drifting on Y, and `fast` at `vPos*2.6` (so ~6.2 in object space) drifting faster. Mixed `0.6/0.4` |
| highest frequency actually present | the 4th octave of `fast`: `6.2 x 2^3 = ~50` cycles across the sphere's diameter of 3 units, i.e. **~17 cycles per radius** |
| limb darkening | **present but nearly flat**: `pow(N·V, 0.35)` mixed `0.75 -> 1.0`. The exponent is the problem, not the amount - `0.35` keeps the term above 0.9 for most of the disc and then falls off a cliff in the last few percent of the radius |
| limb activity | the vertex shader displaces the silhouette by `(fbm-0.5)*0.09` on a radius of 1.5, i.e. **±3%**; 7 billboarded prominences ride the limb on 10-25s cycles |
| contrast inside the disc | three-stop ramp `dark(0.60,0.13,0.015) -> mid -> hot`, with the dark stop entered at `smoothstep(0.28,0.6,n)` |
| passes per frame | the sun is **one mesh, one shader, no pass of its own**. Tone mapping is ACES downstream; the material is `toneMapped={false}` and outputs HDR for Bloom and God Rays |

So the queue's reading is right: **the large blotches exist, the fine grain does not**, and
the sphericity that limb darkening buys is being given away by the exponent.

### WHAT I PROPOSE TO CHANGE - shader maths only, no new pass, no new texture

1. **Granulation.** A third sample of the existing `fbm` at **10x** the `fast` frequency,
   low amplitude, drifting slowly and in a different direction from the other two so it
   does not read as one sheet sliding. Folded into `n` at an amplitude small enough that the
   large structure still dominates.
2. **Limb darkening.** Keep the 25-35% depth, fix the falloff: exponent from `0.35` to
   about `0.55-0.7` so the darkening is *distributed* across the disc rather than crushed
   into the last few percent. This is the term that makes a flat disc read as a ball.
3. **Limb activity.** Keep the ±3% displacement. Raise the prominences' presence against
   dark space at the silhouette - they currently sit at `opacity 0.05-0.25` on additive
   blending, which against the bloom-lit rim is close to invisible.
4. **Contrast in the dark lanes.** Deepen the dark stop slightly and widen the `smoothstep`
   window so the lanes between cells read, **without moving the hot stop** - the tone-map
   discipline from B3 stands, and the mid tone must stay at its measured sRGB.

### MEASURABLE CRITERIA - these are what I will report PASS/FAIL against

All measured from a **screenshot of the deployed preview alias**, the sun disc cropped by
its own silhouette, compared against the same crop from production. Not from localhost.

| # | criterion | how it is measured | target |
|---|---|---|---|
| **C1** | **Granulation exists** | high-frequency energy: the crop minus a 4px-blurred copy of itself, standard deviation over the inner 80% of the disc, in luminance units 0-255 | **at least 2.5x** production's value, and the large-scale structure (the same statistic at 24px blur) changes by **less than 15%** - fine grain added, big shapes not repainted |
| **C2** | **The disc reads as a ball** | mean luminance in an annulus at `r = 0.90-0.97` of the radius, against mean luminance inside `r < 0.25` | production's ratio is the baseline; target **0.65-0.75** (i.e. 25-35% darker at the limb), and the profile must be **monotone** from centre to limb over 8 radial bins |
| **C3** | **The edge is not a clean circle** | radius of the silhouette sampled at 360 angles, over 3 frames 2s apart: standard deviation of the radius, and the count of angles whose radius changes by more than 0.5% between frames | radius sd **>= 1.5%** of the mean radius, and **>= 40** of 360 angles moving between frames |
| **C4** | **Nothing else got more expensive** | `renderer.info.render.calls` and `.triangles` per frame, sampled over 120 frames on the low and high tiers, alias vs production | calls **identical**, triangles **identical**, median frame time within **1ms** |
| **C5** | **No clipping, and the colour identity holds** | share of disc pixels at 255 in any channel; and the mid-tone sRGB of the disc | clipped pixels **<= production's**, and the mid tone stays within **±6** per channel of production's (254, 218, 124) |

C1 and C2 are the two the queue actually asks for; C3 is "the limb is alive"; C4 is the tier
law; C5 is the guard on the tone-map work B3 paid for.

### WHAT IS NOT MEASURABLE, AND STAYS FOR THE OWNER TO JUDGE

**How much grain is the right amount.** C1 fixes a floor, not a look. The side-by-side crop
against the reference imagery is the artefact I will produce; whether it reads as *boiling*
is Elad's call on the live preview, and I will not decide it silently. Same for how far the
prominences should lick out.

### RISKS

- **Bloom eats the grain.** The surface is HDR and the bloom threshold sits below the hot
  stop, so fine detail in the bright regions may be bloomed flat and never reach the
  screenshot. If C1 fails while the shader demonstrably has the octave, the honest answer is
  that the grain has to live in the *darker* part of the ramp, not that the octave is absent.
- **A 5th octave costs fill rate on the low tier.** It is one more `noise()` call, three
  more taps - measured under C4, not assumed. If the low tier moves, the octave gets gated
  behind the existing quality tier and the "identical composition on all tiers" law is then
  broken deliberately and reported, not quietly.
- **The screenshot instrument is the usual danger.** The sun must actually be on screen and
  the scene actually rendered: the harness will assert a real GPU (`ANGLE ... Vulkan`, never
  SwiftShader), assert the sun mesh is in the frame and larger than a stated pixel count,
  and refuse to report anything if either check fails. Three harness defects were caught in
  PROJECTS-HOVER by exactly this kind of assertion being missing.

### OPEN QUESTION

The queue says the acceptance is "an overview sun crop side by side with the **reference**".
**I do not have the reference imagery.** If there is a specific photograph this is being
matched to, it should be in the repo or pasted; without it, C1-C5 are absolute measurements
against production rather than a match to a target image, and the "does it read like the
reference" judgement is Elad's on the preview.
