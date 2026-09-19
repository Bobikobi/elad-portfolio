# CROSSING brief - the passage from the galaxy into the solar system

Written 2026-09-19, before any pixel moves, per standing rule 1.
**Criteria PROPOSED, NOT APPROVED. No product code may change until the owner approves them.**

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

## Criteria - PROPOSED, for the owner to approve or change

All four are measured on a **deployed preview alias**, real GPU, **two runs**, on the same
fixed scroll ramp, against two runs of today's master as the control.

**C1 - the wash is gone.** Over the whole passage, no frame's mean luminance exceeds
**60** (today: 197.2), and no frame has more than **5%** of its pixels above level 200
(today: 66.75%).

*Where 60 and 5% come from:* the galaxy at rest measures 56.6 and 1.81%. The bar is the
brightest thing the visitor is already looking at before the passage begins, rounded up.
Neither number is taken from a constant in the code being changed.

**C2 - nothing jumps.** The largest frame-to-frame change in mean luminance anywhere in the
passage is at most **25** levels (today: about 185, on the 197 -> 12 step). The near-black
frame between two cream frames must not exist: no frame under mean 20 may have a neighbour
within 3 frames above mean 100.

*Where 25 comes from:* the settled solar system's own mean is 30.5, so a 25-level step is
still under one settled-scene's worth of brightness change in a frame. It is a bar on
violence, not on speed.

**C3 - no invented colour.** Over the whole passage, |mean R - mean G| stays at or below
**10** (today: 34.5). The galaxy reads 0.7 and the settled solar system 7.2, so 10 is the
looser of the two ends the passage is travelling between.

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
