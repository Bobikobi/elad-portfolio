# CROSSING brief - the passage from the galaxy into the solar system

> ## v2, 2026-09-19 - the fade became an ember
>
> **v1 shipped and was wrong.** It is in production (master `93c49c9`, PR #39). It removed the
> white wash exactly as this brief asked, passed every criterion below, and the owner's eye
> then failed it in one sentence: *"flies into it and it goes off in the middle; scrolling back
> does not work and sticks somewhere in the middle."*
>
> Measured after the fact, the frame sits under mean 20 of 255 across **0.444 of the whole
> scroll**, in both directions, and nothing inside that stretch changes. The scroll works
> (recorded with a real wheel from five parking points, both builds, always reaching the top);
> it is the picture that stops answering. The cause is in this brief's own logic: C3 allowed a
> red-green split of only 10, the galaxy's gold core fills the view from ~0.6 to the swap at
> 0.93, so obeying C3 meant blacking the core out.
>
> **What this stage got wrong, and the rule that follows.** Every criterion here measured a
> single frame - how bright, how sudden, how coloured - and none measured **how long** a state
> lasts, or the **return direction** at all. Both are now criteria, C5 and a second run of
> everything with `DIR=up`. Any future passage gets them from the start.
>
> ### v2 criteria
>
> | # | criterion | bar | why this number |
> |---|---|---|---|
> | C1 | the wash is gone | max mean <= 80, max %>200 <= 8 | unchanged: the galaxy's own resting 76.0 / 7.30% rounded up |
> | C2 | nothing jumps | max frame step <= 25, no near-black frame beside a bright one | unchanged |
> | C3 | no invented colour | max abs(mean R - mean G) <= **20** | **relaxed from 10.** The colour is the galaxy's own core, not an invention, and 10 is what forced v1 to black it out. 20 is where a warm frame starts to read as a tint over the picture rather than as a lit object; the ember measures 16.7, and the bar is not a target to touch |
> | C4a | the endpoints are untouched | mean abs pixel difference <= 0.1 of 255 | unchanged: galaxy at rest and all six solar views |
> | C5 | **no dead stretch** | frames under mean 20 span <= **0.15** of scroll AND start no earlier than **0.84** | **new.** The draft bar of 0.10 is not reachable: the swap curtain alone holds the frame under 20 across 0.111 of the scroll, which follows from COVER_PLATEAU + COVER_FALLOFF and IS the crossover. 0.15 is that geometry plus room; 0.84 is where coverage first leaves zero, so anything dark before it is the dive going dark on its own - v1's defect, which began at 0.556 |
> | C6 | **the return works** | `return-trip.mjs` reaches the top in act `galaxy` from parking points 0.5 / 0.85 / 0.92 / 0.97 | **new.** v1 was reported as sticking on the way back and nobody had recorded it |
> | C7 | **a scroll teleport is survivable** | max frame step <= 25 with the scroll jumped to mid-dive in one frame | **new**, from the Codex review of PR #39: v1 cut the frame by 52.2 levels on a scrollbar drag |
> | C4b | it still reads as arrival | the owner's eye | not measurable, and this is the criterion v1 actually failed |
>
> ### The change
>
> The plane stops being a blackout and becomes a dimmer: 0.06 -> 0.55 of scroll, to a maximum
> opacity of **0.74**, so a quarter of the frame reaches the visitor for the whole approach and
> the galaxy's core burns down to an ember instead of being switched off. Darkness belongs to
> the swap curtain, which already owns 0.11 of the scroll. Swept on a preview with a `?fade`
> knob; the frontier is in `DiveFade.tsx`, which records what each setting measured.
>
> Everything below is v1 and is kept as written, including the numbers it got wrong.

Written 2026-09-19, before any pixel moves, per standing rule 1.
**Criteria APPROVED by the owner 2026-09-19** ("approved, per your recommendation"), with
one number re-derived after step 0 - see "Step 0 - result", which is the authority on the
bars. The C1 numbers written further down are the pre-step-0 draft and are superseded there.

Scope approved by the owner 2026-09-19: **the passage only.** The galaxy at rest is a
separate, later stage - the owner said so in the same breath ("the galaxy itself will need
it later too"), so nothing in this brief is allowed to change how the galaxy looks while it
is sitting still.

---

## Why this stage exists

The owner, 2026-09-19: *"the galaxy view and the passage into the solar system are still
terrible."* He asked for a clean-eyes visual judgement before any code was read.

That judgement was obtained from GPT-6 Astra, shown two labelled contact sheets of a real
13-second recording and told nothing about the code. Its verdict, in its own order:

- **Worst:** at 3.4 s the thick white spokes sit on top of a galaxy that is still visible,
  so the passage reads as fireworks laid over a picture rather than as flight.
- **Why it reads cheap:** blue dots extend past the spiral arms into a carpet of glitter;
  pink, blue and cream compete for emphasis in one frame; the convergence point near the
  bottom edge reads as an explosion rather than as forward motion; and the cream wash at
  ~4.5 s swallows the planets' silhouettes and the labels.
- **Cheapest win:** replace the whole 2-5 s streak-and-flash passage with a short fade
  through near-black into the solar system that already exists.
- **Keep:** the name and the space around it, the inclined orbital composition, and the
  distinct silhouettes of Earth and the ringed planet.

The owner approved the cheapest win. This brief is that, and only that.

---

## What is actually on screen, measured

Four recordings already on disk were re-measured: `ef-after2-home-1`, `ef-after2-home-2`
(build `56fa63b`, now master), `ef-after-home-1` (`074bc88`) and `ef-before-home-1`
(`5cf8fc7`). 1280x720 jpeg screencast, real GPU, deployed previews. Every number below
reproduces in all four, across three different builds.

Per-frame mean luminance of the whole frame, 0-255:

| moment | mean | 99th pct | % of pixels > 200 | mean R / G / B |
|---|---|---|---|---|
| galaxy at rest, 0.5 s | 56.6 | 230 | 1.81 | 53.4 / 52.7 / 104.8 |
| streaks, 3.4 s | 109.6 | 236 | 11.33 | 123.6 / 103.5 / 128.4 |
| streaks, 3.61 s | 112.0 | 235 | 9.53 | 137.5 / 103.0 / 125.5 |
| **crossover peak, 4.35-4.42 s** | **197.2** | 240 | **66.75** | 202.1 / 196.6 / 189.1 |
| **the hole inside the peak** | **12.1** | 23 | 0.20 | 13.6 / 10.7 / 21.2 |
| settled solar system, 13 s | 30.5 | 185 | 0.70 | 35.4 / 28.2 / 38.1 |

Three separate defects come out of that table.

**1. The crossover is a full-frame cream wash.** `SwapMask` draws a plane one unit in front
of the camera in `CORE_GOLD` at up to 0.96 opacity, plus an additive centre glow. At the
peak **two thirds of the frame sits above level 200** and the frame's mean is 197 against a
settled scene of 30.5 - about **6.5x**. Its 99th percentile (240) is barely above its mean
(197), which is the numeric form of what Astra called the value range: there is almost no
tonal range left in the frame. It lasts about 0.6 s (frames with mean > 150 span
3.93-4.53 s in run 1 and 4.06-4.68 s in the before run).

**2. There is a black hole in the middle of the wash, and nobody knew.** In **every one of
the four runs**, between two frames at mean 197.0 and 197.1, there is a frame at mean
**12.6** - near black. In run 1 that frame is delivered twice, byte-identical
(`md5 991361...` on both `f00192.jpg` and `f00193.jpg`), and the next frame arrives 0.29 s
later, so the screen is held on it. The curtain exists to hide the act swap; instead the
sequence a visitor gets is **197 -> 12 -> 197 -> 30** with a stall in the middle. This is a
new finding of this stage; it is not in any earlier brief.

**3. The passage invents a colour that exists nowhere else on the site.** Red minus green
is 0.7 at the galaxy (the scene is blue), 7.2 at the settled solar system - and **34.5 at
3.61 s**. That red-green split is the salmon Astra saw fighting the blue and the cream.

---

## What is drawn, and by what

- `SwapMask.tsx` - the gold curtain: full-frame fill, additive centre glow, one waypoint star.
  Owns defect 1 and part of defect 2.
- `CameraRig.tsx` + `lib/diveEnvelope.ts` - `coverageFor(gate)`, a symmetric plateau around
  `SWAP_V = 0.9`, and the act swap that fires only while coverage > 0.95. Owns the stall
  inside defect 2.
- `DiveField.tsx` - 4,200 billboarded stars stretched along their own screen velocity
  (`uStretchK = 15`). The white spokes.
- `TransitVeils.tsx` - photographic Hubble nebula stills flown through additively. The salmon.

---

## Step 0 - the instrument, before any pixel moves

Standing rule 6 and `measure-the-instrument-first`: the numbers above come from recordings
made for a different purpose, in which the dive was driven by whatever the page did on load
rather than by a controlled scroll. The brightness and colour numbers are properties of the
crossover envelope and hold either way. **The durations are not** - they are the damped
gate's answer to one particular scroll.

So step 0 is a recorder, `scripts/harness/crossing.mjs`, that:

1. loads the home page on a deployed preview, waits for settle;
2. drives the scroll from 0 to past the swap on a **fixed ramp of a stated duration**, the
   same ramp every run;
3. screencasts every frame with its timestamp, exactly as `edge-flash.mjs` does;
4. refuses to report on a software GPU, same guard as `edge-flash.mjs`.

And `scripts/harness/crossing.py`, which reports per frame: mean luminance, 99th percentile,
fraction above 200, mean R/G/B, and the largest frame-to-frame jump in mean luminance.

**The instrument is validated the way this repo requires: two runs on the unchanged build
must agree before any candidate is measured.** If they do not, the criteria below get
tolerances from that spread rather than from a guess.

---

## Step 0 - result

Built as `scripts/harness/crossing.mjs` + `crossing.py`, commit `caa4215`. The ramp is
indexed by **rendered frame** under `?fixedStep`, not by wall clock, which is what makes two
runs comparable at all. The DOM is hidden, so the numbers describe the canvas.

Control: two runs against the preview of `ce2c11d`, whose tree hash
`fabdbc777c3748fe148a4f0467cd9e90a4ab8fe2` is **identical to master's at `8d8d1be`** - the
same bytes as production, on a build where the debug clock exists. Real Intel GPU through
ANGLE/Vulkan both times, 1280x720, ~46 fps, median frame gap 17.4 ms, 180/181 rendered ramp
frames, scroll span 2880 px, galaxy -> solar both times.

**The two runs agree to the decimal on every judged metric.**

| metric | master-1 | master-2 |
|---|---|---|
| max mean luminance | 210.8 | 210.8 |
| ...at t | 4.046 s | 4.036 s |
| max % of pixels > 200 | 70.18 | 70.18 |
| max frame-to-frame jump | 29.9 | 29.9 |
| max abs(R - G) | 28.2 | 28.2 |
| settled mean | 30.6 | 30.6 |
| dark holes | none | none |
| act swap at ramp fraction | 0.9333 | 0.9333 |
| C1 / C2 / C3 | FAIL / FAIL / FAIL | FAIL / FAIL / FAIL |

The instrument repeats. Step 0's requirement is met and candidates may now be measured.

### Two honest corrections this forced

**a. The two instruments are not comparable, so the bars had to be re-derived.** The table
further up came from the edge-flash recordings, which kept the DOM on screen and drove the
scroll differently. On this instrument the same untouched build reads 210.8 rather than
197.2, 70.18% rather than 66.75%, and 28.2 rather than 34.5. The defects are the same and
bigger once the navbar and the HUD stop diluting the average. **Never compare a number in
the old table to a number from `crossing.py`.** Reference points on this instrument, stable
to a tenth across both runs:

| moment | mean | % > 200 | max abs(R - G) |
|---|---|---|---|
| galaxy at rest (pre-ramp, 35 frames) | 75.7 - 76.1 | 7.23 - 7.30 | 1.4 |
| settled solar system (last 3 s, 137 frames) | 30.6 - 31.6 | 0.47 - 0.51 | 7.8 |

**C1's draft bars of 60 and 5% are therefore impossible and are replaced.** They were derived
from the galaxy's 56.6 / 1.81% on the old instrument; on this one the untouched galaxy itself
reads 76.1 and 7.30%, and the recording necessarily starts there. The approved principle is
unchanged - *the passage may not be brighter than what the visitor is already looking at
before it begins, rounded up* - so, on the instrument that will do the judging:

> **C1 (binding): no frame's mean luminance exceeds 80, and no frame has more than 8% of its
> pixels above level 200.** Today: 210.8 and 70.18%.

C2 (jump <= 25, no near-black frame with a bright neighbour within 3 frames) and C3
(abs(R - G) <= 10) are unchanged; 25 still sits under one settled scene's worth of change,
and 10 still sits between the galaxy's 1.4 and the settled system's 7.8.

**b. The near-black frame does not reproduce here, and I am not going to pretend it does.**
Defect 2 above is real in all four edge-flash recordings. Under this instrument
`dark_holes` is empty in both runs and the largest jump is 29.9, not ~185. The stall is
still there - one 397 ms gap at t = 4.05 s, against a 17.4 ms median - but the frame the
screen is held on during it is the bright one (210.8), not a black one.

So the black frame is a property of a capture with the DOM live and a wheel-driven scroll,
which is closer to what a visitor does than this ramp is. **This instrument is blind to
defect 2.** C2's near-black clause stays in force as a guard, and it will pass on master
too, so it proves nothing on its own. The claim that defect 2 is fixed will be made from a
fresh pair of `edge-flash.mjs` recordings of the passage, or not made at all.

---

## Criteria - PROPOSED, for the owner to approve or change

All four are measured on a **deployed preview alias**, real GPU, **two runs**, on the same
fixed scroll ramp, against two runs of today's master as the control.

**C1 - the wash is gone.** Over the whole passage, no frame's mean luminance exceeds
**80**, and no frame has more than **8%** of its pixels above level 200. Today, on the
instrument that judges this: 210.8 and 70.18%.

*Where 80 and 8% come from:* the galaxy at rest measures 76.1 and 7.30% on that same
instrument. The bar is the brightest thing the visitor is already looking at before the
passage begins, rounded up. Neither number is taken from a constant in the code being
changed. The draft of this brief said 60 and 5% from the old recordings' 56.6 / 1.81%;
step 0 showed those two instruments do not share a scale, and the replacement is derived
the same way on the new one.

**C2 - nothing jumps.** The largest frame-to-frame change in mean luminance anywhere in the
passage is at most **25** levels (today, on this instrument: 29.9). The near-black frame
between two cream frames must not exist: no frame under mean 20 may have a neighbour within
3 frames above mean 100 - a clause master already satisfies here, so it is a guard rather
than a proof. See step 0, correction b.

*Where 25 comes from:* the settled solar system's own mean is 30.5, so a 25-level step is
still under one settled-scene's worth of brightness change in a frame. It is a bar on
violence, not on speed.

**C3 - no invented colour.** Over the whole passage, |mean R - mean G| stays at or below
**10** (today, on this instrument: 28.2). The galaxy reads 1.4 and the settled solar system
7.8, so 10 is just past the looser of the two ends the passage is travelling between.

**C4 - the passage still reads as arrival, and the endpoints are untouched.**
Two parts, both required:

- a. *Measured:* the galaxy at rest (before the scroll starts) and the settled solar system
  (3 s after the passage ends) are **unchanged against master** - mean absolute pixel
  difference at most **0.1 of 255** on both, which is the bar EDGE-FLASH used for the same
  question. This is what keeps the stage inside its approved scope.
- b. *For the owner's eye, on the preview, not measured:* the passage still reads as
  travelling to a destination rather than as a cut. Per the standing rule, this one is
  stated as the owner's judgement and is not guessed here.

---

## What this stage deliberately does NOT do

- It does not change the galaxy at rest. That is the owner's next stage, and C4a enforces it.
- It does not change the solar system's composition, the sun's size, or the labels. Astra
  recommended a smaller sun and later labels; both are outside the approved scope and are
  recorded here so the next stage has them.
- It does not touch the photometry constants. P3's apertures, P7's sun and the EDGE-FLASH
  gate stay exactly where they are.

---

## Rollback

One branch, `feat/crossing`, off master at `8d8d1be`. Nothing merges without a separate
approval; master deploys to production.
