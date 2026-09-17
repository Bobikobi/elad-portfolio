# SUN-3 brief - the sun's red channel was a plateau

> **WRITTEN AFTER THE FACT, 2026-08-15.** This artifact did not exist when the work was
> done. SUN-3's criteria were written and approved in conversation before any pixel moved -
> the spirit of standing rule 1 was kept - but the reasoning was never committed to the repo,
> which is the letter of it. This document reconstructs the brief from primary sources only:
> the commit message of `0fcf349`, the harness it added (`scripts/harness/sun-3.{mjs,py}`),
> and the diff itself. **Nothing here is recalled from conversation.** Where the record does
> not settle a question, it says so instead of filling the gap.
>
> Required by P0a of [PHOTOMETRY-megaplan.md](PHOTOMETRY-megaplan.md).

---

## The complaint

"The sun looks clunky." Not a measurement - an impression, and the third round of trying to
fix it.

## What was actually wrong

The sun's red channel was flat: **225 of 255 across 100% of the disc, standard deviation
0.31**. Every bit of shading the shader computes - granulation, limb darkening, plasma flow -
was living in green and blue only. A sphere whose brightest channel is flat cannot read as a
sphere, no matter what the other two channels do.

Two causes, each set up by an earlier pass that was chasing a real problem:

1. **The ramp had no red left to give.** The mid and hot stops both sat at red 1.00, so above
   the mid stop there was no red gradient at all.
2. **What survived was spent in the shoulder.** That put exposed red at 1.16-1.85, deep in
   ACES's flat region, where a 10% brightness change moves the output **3 of 255**. The limb
   term really does cut linear red 37% from centre to limb. **37% arrived as 0.2%.**

And a third, which is the finding that outlived the stage:

3. **The limb darkening was being filled back in by GOD RAYS, not bloom.** The pass smears
   the source radially, so on a sun filling a third of the frame it paints the bright centre
   back out over the dim limb - measured at **~0.6 of linear red at the limb, against the
   surface's own 0.53 there**. With everything else held and the pass toggled, **bloom moved
   the ratio by 0.001**. Earlier rounds had the shader term chasing a number it could not
   reach, against the wrong culprit. This corrects SUN-2's recorded C2 verdict.

## Criteria

Set before the work. Numbers from a real-GPU capture, pinned tier, DOM hidden.

| criterion | before | target |
|---|---|---|
| **C1** limb/centre red | 1.000 | **<= 0.90** |
| **C2** limb/centre luminance | 0.920 | **0.80-0.88, and monotone centre to limb** |
| **C3** longest prominence | 1.76 R | **<= 1.25 R** |
| **C5** limb covered by spikes | 8.9% | **<= 15%** |

**C4 - planet clipping - was declared out of scope before the work started**, not after it
failed. Mars, Venus and Mercury clip their lit faces to white (12k blown pixels; Venus 77% of
its disc). That is planet albedo and lamp strength, not the sun: the textures carry no albedo,
so every body renders as a perfect white diffuser and the bright-textured ones blow out while
Earth and Saturn sit at 141 and 161. Fixing it means re-lighting the system and recalibrating
every world's exposure - which is now P3 of the photometry plan.

## The trade, stated up front

The sun ends up dimmer: disc mean sRGB **(216, 141, 87) -> (186, 124, 89)**. That is the
trade, not a side effect. On this pipeline a sun bright enough to sit in the ACES shoulder is
a sun with no shading, and the two cannot both be had.

**The criteria constrain the gradient, never the level.** The level is the owner's call and
is deliberately left open - it is carried forward as judgement call 1 of P6.

## Scope

| file | why |
|---|---|
| `solar/Sun.tsx` | the ramp stops and the limb term - the defect itself |
| `Effects.tsx` | the god-ray weight - the term that was cancelling the fix |
| `DebugHud.tsx` | publish each body's screen centre so the harness can find them |
| `scripts/harness/sun-3.mjs` + `.py` | new: measures all four criteria off a real-GPU capture, plus a Mars regression check |

## What this stage does not touch

Planet albedo, lamp strength, per-world exposure, `highlightRolloff`. All four are now
sequenced in the photometry plan, and three of them are why that plan exists.
