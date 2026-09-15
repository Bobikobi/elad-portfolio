# P4 brief - re-scope `highlightRolloff` to the case it was built for

Written 2026-09-14, before any change, per standing rule 1.
**Criteria PROPOSED, not approved. No pixel moves until the owner signs the table.**

P4 of [PHOTOMETRY-megaplan.md](PHOTOMETRY-megaplan.md). The plan's own P4 section was written
2026-08-17 and **two of the numbers it stands on have moved since.** Correcting them is the
first thing this brief does, because one of them changes what the stage is for.

---

## What the function is, and what it costs

`highlightRolloff` in `ExposureToneMap.tsx` exists to stop a lone channel clipping. It mixes
a bright, saturated colour toward its own luminance - toward white - at up to 68% strength,
and it runs on **every pixel in the site**, before the ACES curve.

    const float HL_KNEE  = 0.72;   // brightest channel below this is never touched
    const float HL_RANGE = 1.70;   // full strength this far past the knee
    const float HL_MAX   = 0.68;   // most saturation a lopsided highlight may give up

    if ( peak <= HL_KNEE ) return c;
    float over = smoothstep( 0.0, 1.0, ( peak - HL_KNEE ) / HL_RANGE );
    return mix( c, vec3( dot( c, LUMA ) ), HL_MAX * over * spread );

`spread` is the channel lopsidedness, so the effect is **gated on chroma by design**. That
gate is the whole reason P4 is small, and it is why P4 cannot fix the things it was expected
to - see "What P4 is not" below.

Measured cost, recorded in P0b: on the sun, **49% desaturation at the centre against 11% at
the limb** - it was actively cancelling the limb darkening SUN-2 and SUN-3 were producing.
The doc comment that claimed neutral highlights "pass through untouched" was false and is
corrected in place.

---

## Two numbers the plan states that are no longer true

### 1. Mars is not at 5.0%. It is at 0.08%.

> **CONTESTED 2026-09-14** - see "STEP 1 RESULT" below. `p3-albedo`'s capture of the same world
> reads 1.87% over 250 in some channel against this section's 0.08% from `sun-3.py`. Both agree
> Mars is far below 5.0%; they do not agree on where, and this section should not be read as
> settled.

> **CORRECTED 2026-09-15** - both figures were single longitudes, and so is "far below 5.0%".
> Mars keeps spinning in its focused world. Over a full turn the shipped scene clips its disc from
> 0.00% to **11.10%**. See "MARS OVER A FULL TURN".

The plan says: *"Mars's disc clipping stays at 0% (it is currently 5.0% and failing - so this
stage inherits a fix, not just a guard)."*

Measured 2026-09-14 on the deployed alias, `sun-3.py`, tag `sun3-alias`:

    REGRESSION mars   disc (759,441) R 387, 423,712 px
                      clipped >250   0.08%   (need <= 0.05)   FAIL
                      mean RGB 128 / 96 / 97, mean lum 103
                      fully-clipped px in the whole frame: 0

**P3 took Mars from 5.0% to 0.08%.** The remaining gap is 0.03 percentage points - about 127
pixels of a 423,712-pixel disc - and *zero* pixels are clipped in all three channels.

So P4 **inherits a guard and a 0.03pp gap, not a fix.** That is a materially smaller stage
than the plan describes, and the difference should be settled before criteria are set rather
than discovered during implementation.

### 2. The acceptance has no instrument

The plan's second acceptance clause is *"the mean chroma of every focused world's disc rises
or holds."* **No harness in this repository measures chroma on a planet disc.** The only
`chroma` function is in `flicker-analyse.py` and it measures the frame's edge sky.

A criterion with no instrument is not a criterion. Building it is step 1 below, and it has to
be validated on unchanged code before it is used to judge anything - standing rule 5, and the
practice that has caught something in this lane three times.

---

## What P4 is not, and this is already settled

> **CORRECTED 2026-09-14 - it was not settled.** See "STEP 1 RESULT" below: held off, Venus's
> all-channel clipping falls from 1,483 to 434 pixels and Earth's world from 9,712 to 7,786. The
> neutrality recorded here was measured after the function had already pushed those pixels
> toward white. The section is kept as written so the correction can be seen.

Measured 2026-08-17 and recorded in the plan: P3 left two clusters of burnt pixels - Earth's
cloud tops (9,716 px) and Venus on the overview (1,498 px). Both were expected to be P4's.
**They are not.** Those pixels are neutral white, channel spread 0.004-0.005 with 100% of
them under 0.02, and the rolloff is scaled multiplicatively **by** that spread. No value of
`HL_KNEE`, `HL_RANGE` or `HL_MAX` moves them.

Neutral over-exposure on a local peak is a different problem needing a spread-independent
answer - per-body trim, or a peak compressor that does not consult chroma. **Not P4, and not
designed here.**

### A body the plan's account does not mention

[P2-verify.md](P2-verify.md), measured on the alias, ranks the overview by each body's own
peak channel:

| body | % of disc blown |
|---|---|
| **saturn** | **51.45%** |
| jupiter | 12.85% |
| mars | 11.24% |
| mercury | 3.88% |
| earth | 1.19% |
| venus | 0.00% |

**Saturn is the worst body on the overview by a factor of four, and it appears nowhere in
P3's or P4's account of what is left.** It is also the Projects planet and the most prominent
body on the right of the frame, which is why RULING 3 exists.

Whether Saturn is P4's or belongs with Earth and Venus in the not-P4 bucket **depends
entirely on its channel spread**, which nobody has measured. That is the first question step 1
answers, and the answer decides how much of a stage P4 actually is.

---

## The work, in order

1. **Build the instrument, and validate it on unchanged code.** Per body, per view: mean
   chroma of the lit disc, channel spread distribution, and what fraction of the disc the
   rolloff can reach at all (`peak > HL_KNEE` and `spread` above the level where the mix is
   visible). Run it twice on unchanged code first; the numbers must repeat.
2. **Answer the Saturn question with that instrument** before choosing constants.
3. **Only then** re-scope the constants. The plan's suggestion, explicitly a starting point
   and not a decision: knee 0.72 -> ~0.90, range 1.70 -> ~0.35, max 0.68 -> ~0.30.
4. Measure, including the sun, which is what has been paying for this function.

---

## Criteria - PROPOSED

> **SUPERSEDED 2026-09-15** by "CRITERIA, REVISED" further down. This table was written before any
> measurement: it rests on the sun losing 49% (it loses 0.35%) and on "nothing clips anywhere"
> being reachable at all. Kept for the record.

| # | criterion | how | target |
|---|---|---|---|
| **P4-1** | the case it exists for still works | `sun-3.py`, Mars's focused world | **<= 0.05%** of the disc over 250 in any channel, from 0.08% |
| **P4-2** | nothing clips anywhere | six views, all three channels | **zero** pixels over 250 - the same corrected threshold as P3-1 |
| **P4-3** | the saturation comes back | new instrument, mean chroma of every focused world's disc | **rises or holds** on all five |
| **P4-4** | the sun stops paying for Mars | `p7-sun.py` S2/S4 plus disc chroma | S4 **holds <= 0.75**; the sun's disc chroma **rises** |
| **P4-5** | the tier law | `p7-sun.py` S6, both tiers | calls, triangles, median frame time unchanged |
| **P4-6** | the scene still reads as itself | six views, by eye against the before-frames | no body changes hue; the change reads as saturation returning, not as a different palette |

**P4-6 is the "what should be TRUE" criterion** the megaplan requires of every stage that
changes pixels, and P4 needs one more than most: it is a **site-wide** change - the function
runs on every pixel, including the galaxy act, the star field and the gold curtain, none of
which any of the numeric criteria above look at.

### What needs deciding before implementation

1. **Is P4 still worth its risk?** It inherits 0.03pp of clipping, not 5.0%. The real prize
   is the saturation the rolloff takes from the whole site - the sun's 49% - which is a
   **quality** goal, not a defect fix. That is the owner's call and the plan's framing no
   longer supports it on its own.

   > **CORRECTED 2026-09-14:** the sun's 49% does not exist on today's sun - the function takes
   > 0.35% of its core chroma. That figure predates P3 and P7 and was carried here unmeasured.
   > The case for P4 now rests on Saturn, on Venus and Earth's burnt white, and on the trade
   > against single-channel clipping - see "STEP 1 RESULT".
2. **Does Saturn belong here?** If its 51.45% is neutral, P4 cannot touch it and Saturn joins
   the not-P4 bucket, which should then become a stage of its own rather than staying an
   unowned note in three documents.
3. **P4-2 as written may be unreachable.** P3 could not clear Earth's clouds and Venus, and
   P4 provably cannot either. Either P4-2 is scoped to "no NEW clipping and no regression on
   the four views already at zero", or the stage is blocked on work that is not P4's.

I recommend deciding 2 and 3 **after step 1**, on the measurement, and deciding 1 now.

---

## STEP 1 RESULT - 2026-09-14 - VALID

**Valid.** One held pair, rolloff ON (`p4-on`) against OFF (`p4-off`, the `?noRolloff` seam, which
is byte-identical when absent), and the repeatability control that decides whether it means
anything: a second ON capture of the same build, `p4-on2`, compared against `p4-on`.

    control, p4-on vs p4-on2:  reach 0.00% on all 13 bodies and all 3 sun regions
                               chroma taken 0.00% everywhere, clipping identical everywhere
                               frame pixels changed 0.000% on all six views, largest delta 0

The capture is deterministic, so every difference in the table below is the function.

One thing not to misread: "chroma on" for the same body differs slightly between this table and
the control's (Venus 0.0126 here, 0.0131 there). `p4-chroma.py` takes the lit face from the SECOND
capture it is given, so the two runs average over slightly different pixel sets. Reach, clipping
and the frame figures do not use that mask and match exactly.

`scripts/harness/p4-chroma.py p4-on p4-off`. "Reach" is the share of a disc whose pixels differ
at all; "taken" is how much of the lit face's chroma the function removes.

    view         body     disc px   reach   chroma on   off    taken   clip any on/off   all on/off
    overview     mercury     1330   14.29%    0.0379  0.0411    7.74%        2/3              0/0
    overview     venus       2081   97.36%    0.0126  0.0702   82.07%     1714/1852        1483/434
    overview     earth      13140    0.57%    0.0388  0.0393    1.50%        0/0              0/0
    overview     mars        1999   68.38%    0.1106  0.2938   62.34%        0/1020           0/0
    overview     jupiter    23793   35.07%    0.0526  0.0690   23.74%        0/0              0/0
    overview     saturn      6622   97.19%    0.0388  0.0746   48.04%      481/1502           0/0
    overview     uranus      5236   94.81%    0.0290  0.0373   22.23%        0/0              0/0
    overview     neptune     5926  100.00%    0.0271  0.0480   43.55%        0/0              0/0
    about        earth     270482   50.22%    0.1096  0.1414   22.49%    21458/22966      9712/7786
    services     jupiter   279400   48.45%    0.0720  0.0971   25.89%       24/434            0/0
    projects     saturn    267230   76.99%    0.0744  0.1112   33.07%        0/0              0/0
    technologies jupiter    46300   48.83%    0.0576  0.0776   25.82%     1627/2909         107/82
    contact      mars      286936   75.38%    0.1348  0.3512   61.63%     5371/126345        0/0

    sun, overview    core r<0.25  reach 22.66%  taken 0.35%    mid-disc 0.13%    limb r .90-.96 0.14%
    frame pixels changed per view: overview 2.3%, about 12.3%, services 12.0%, projects 18.3%,
                                   technologies 1.8%, contact 18.8%

`technologies` tracks **Jupiter**, not the belt - that is the capture's own probe body.

### What it overturns in this brief

1. **The prize this brief named is gone.** It said the real reason to do P4 is the saturation
   the sun loses - *"49% at the centre against 11% at the limb"*. On today's sun the function
   takes **0.35% at the core and 0.14% at the limb.** That figure predates P3 and P7, which both
   moved the sun; it was carried forward without being re-measured, and it was pitched to the
   owner twice as the case for this stage. It should not have been.

2. **Saturn is P4's.** The rolloff reaches 97% of its disc on the overview and takes 48% of its
   chroma. Question 2 is answered: it belongs here.

3. **The plan's "not P4" bucket was measured wrong.** The megaplan (2026-08-17) recorded Earth's
   cloud tops and Venus as neutral white, spread 0.004-0.005, "so no choice of HL_KNEE, HL_RANGE
   or HL_MAX moves them." With the function held OFF, **Venus clips in all three channels on
   434 pixels instead of 1,483, and Earth's world on 7,786 instead of 9,712.** The rolloff mixes a
   bright colour toward its own luminance - toward white - so it is what turns a coloured
   highlight into the neutral burnt white. The spread was read off the output, after the function
   had already neutralised those pixels: an instrument measuring its own subject's result, which
   is standing rule 6's failure mode. Question 3 changes with it: P4-2 may be reachable.

4. **And the trade is real.** Off, single-channel clipping jumps where the function was guarding a
   channel - Mars's world goes from 5,371 to **126,345** pixels over 250 in some channel. Re-scoping
   exchanges one kind of clipping for another; it is not free saturation.

### Unresolved, and not to be papered over

**Two instruments disagree 23-fold on Mars's world.** `sun-3.py` reads 0.08% of the disc over 250
in any channel; this capture reads 5,371 of 286,936 disc pixels, 1.87%. They use different
captures and different disc radii. The "Mars is at 0.08%" correction earlier in this brief rests
on one of them. Which one is right is not known yet.

> **RESOLVED 2026-09-15** - neither was wrong. They measured different longitudes of a spinning
> planet. See "MARS OVER A FULL TURN".

---

## MARS OVER A FULL TURN - 2026-09-15

Replaces every single-frame Mars figure in this brief, and resolves the instrument disagreement.

### Why every earlier Mars number was one longitude

Mars keeps spinning inside its own focused world. `SolarAct.tsx` stops the heliocentric
revolution when a world is focused (line 767) but not the axial spin (line 826,
`rotation.y += dt * 0.3`, the last line of the planet's own frame loop). One turn is 20.9 s of scene
time. `sun-3` (live clock) and `p3-albedo` (frozen at frame 1601) each photographed whichever
longitude faced the camera at that moment.

`sun-3` was also measuring the wrong region - fitted from the frame centre with an absolute
threshold of 40, only 39% of it on Mars; fixed in `ad9b9fc`. That was **not** the cause: a 2x2 of
both regions on both images showed the same picture reads nearly the same in either region, and
the same region reads ~20x apart across the two pictures.

### The instrument

`scripts/harness/mars-turn.{mjs,py}`. One page load; the fixed-step clock frozen at frame 1601;
then stepped exactly 52 scene steps between 24 shots, 15 degrees of spin apart, plus a closing shot
one turn later. Geometry from each shot's own HUD disc. It refuses if the disc's centre moves (it
moved 0.00 px).

**Validated against an independent harness:** shot 1 is byte-identical to `p3-albedo`'s `p4-on`
contact capture at the same frame - mean 0.0000, max 0, the same 5,371 clipped pixels. Both turns
start at scene time 26.6667 s, so they pair longitude for longitude.

Two defects were found and fixed in the harness on its first runs, and are recorded because both
would have produced a plausible wrong answer: it froze the clock AFTER a 400 ms wall-clock wait, so
shot 1 landed 13 steps late and a different number of steps late on each run; and it refused on the
disc's size, which breathes by design, instead of on its centre.

### Result

| | rolloff ON (shipped) | rolloff OFF |
|---|---|---|
| worst longitude | **11.10%** at 297.9 deg | 44.83% at 342.6 deg |
| median over the turn | 0.20% | 30.87% |
| best | 0.00% - 7 of 24 longitudes clip nothing | 9.10% at 223.5 deg |
| clipped in all three channels | 0 at every longitude | - |
| chroma the function takes from Mars | 21-51%, by longitude | - |

All of Mars's clipping is single-channel - red.

### What it corrects

1. **"Mars is at 0.08%" and "P4 inherits a guard and a 0.03pp gap" were wrong.** At its worst
   longitude the shipped scene clips **11.10%** of Mars's disc: 222 times P4-1's 0.05%, and more
   than twice the 5.0% the plan recorded in August. **P4 inherits a real, failing criterion.**
2. **The rolloff is doing real work on Mars.** It holds the worst longitude at 11.10% where it
   would otherwise be 44.83%, and takes 21-51% of Mars's chroma to do it. Removing it is not on the
   table; re-scoping it is a trade on this planet.
3. **The instruments never disagreed.** 0.09% (`sun-3`, alias), 0.29% (`sun-3`, localhost) and 1.87%
   (`p3-albedo`) are three points on one curve that runs from 0.00% to 11.10%.
4. `ExposureToneMap.tsx` records its constants were "tightened until [the worst longitude] reached
   zero". Today the worst longitude is 11.10%. Those constants predate P3, which re-set the lamp,
   the falloff and Mars's aperture (`ORBIT_APERTURE` mars 0.72 -> 0.92). That is context for where
   to look, **not** a demonstrated cause.

### What one turn still does not cover

The ORBIT vantage's lit target wobbles on two slow cycles - `CameraRig.tsx`,
`sin(t * 0.055)` and `sin(t * 0.021 + 1.7)`, periods **114 s and 299 s** - so a 21 s turn sees one
slice of it, and 11.10% is the worst **of this turn**, not a proven absolute worst. The closing shot
shows the scene is not purely spin-periodic: one turn later clipping matched within 0.2 points
(1.69% against 1.87%), but 91% of the frame's pixels had changed (mean 8.9). Part of that is the
framing's size, which breathes on a ~30 s cycle (radius 306-318 px) from a source not yet identified
- it is **not** the lit wobble, whose periods do not match.

### P4-1, restated - PROPOSED, needs the owner

Because two clocks other than the spin move the result, P4-1 can only be judged fairly as a
**paired** comparison: before and after the change, over a full turn, at identical scene instants,
which holds every clock equal on both sides. Proposed: the worst-longitude clipping after the change
must not exceed the worst before it (11.10% today). The absolute 0.05% target has **never held over
a full turn on the current lighting**, so whether to keep it, and what it would take, is the owner's
call rather than something this stage should assume.

> **DECIDED BY THE OWNER, 2026-09-15.** P4-1 is judged as the paired no-regression rule above:
> over a full turn at identical scene instants, Mars's worst-longitude clipping after the change
> must not exceed the worst before it. Mars's 11.10% is recorded as a separate open defect, not as
> something P4 must fix. P4's gains are on Saturn, Venus and Earth; Mars's clipping is most likely a
> lighting question, and is not this function's to solve.

---

## CRITERIA, REVISED - 2026-09-15 - APPROVED

**APPROVED by the owner, 2026-09-15** ("מסכים"), after being asked in plain language: bring colour back to Saturn, Venus and Earth, on condition that Mars burns no worse than today.

Every target below is taken from measurements already in this brief, and the goals are set against
a named reference - **the same frame with the function switched off** (`?noRolloff`), which is the
upper bound of what re-scoping it can give back. "Halfway" means recovering at least half of the
distance between today and that reference.

### What should be TRUE afterwards

| # | criterion | how | today | reference, function off | target |
|---|---|---|---|---|---|
| **P4-1** | Mars does not clip worse | `mars-turn`, paired full turn at identical scene instants | worst **11.10%** | 44.83% | worst longitude **<= 11.10%** - **DECIDED** |
| **P4-2** | Saturn gets its colour back | `p4-chroma`, projects world, lit-face chroma | **0.0744** | 0.1112 | **>= 0.0928** (halfway) |
| **P4-3** | the burnt white turns back into colour | `p4-chroma`, pixels over 250 in all three channels | Venus (overview) **1,483** · Earth's world **9,712** | 434 · 7,786 | Venus **<= 958** · Earth **<= 8,749** (halfway) |

### Guards - nothing gets worse

| # | criterion | how | target |
|---|---|---|---|
| **P4-4** | no body loses colour | `p4-chroma`, all 13 body rows, before against after | lit-face chroma on every row **>= today's** |
| **P4-5** | nothing newly burns out | `p3-albedo`, six views | all-channel clipping **does not rise** in any view |
| **P4-6** | the sun is left alone | `p7-sun` S1-S6 | all six still pass; S4 **<= 0.75** |
| **P4-7** | it costs nothing | `p7-sun` S6, both tiers | calls, triangles, median frame time unchanged |

### Not measurable - the owner judges

| # | what | how |
|---|---|---|
| **P4-8** | the scene still reads as itself: saturation returning, not a different palette, no body changing hue | the six views **and one galaxy-act frame**, before and after side by side |

The galaxy frame is there because this function runs on every pixel in the site, and none of the
numeric views above look at the galaxy act.

### How honest each measurement is

- **P4-1 is the only criterion measured over a full turn**, because Mars is the only body where the
  function is guarding against a worst case. It holds both of the scene's other clocks equal by
  pairing, not by covering them.
- **P4-2 to P4-5 are paired at one frame** (fixed step, frozen at frame 1601). That is a fair
  before-and-after at one state of a spinning scene. It is not a worst case, and a body could look
  better at that frame and worse at another. If the owner wants P4-2/P4-3 over a full turn too, the
  `mars-turn` method extends to any focused world.
- `p4-chroma` takes the lit face from the second capture it is given. Before-and-after runs must use
  the same argument order every time, or chroma figures are averaged over slightly different pixels.

---

## SCREENING - 2026-09-15

### The candidate seam, validated before any result was believed

`?hl=knee,range,max[,power]` in HUD builds (`ExposureToneMap.tsx`) builds a candidate shader from the
shipped one. Two checks, both required and both passed:

- **without `?hl`** the scene is byte-identical to `m1-before` on all six views - the shipped path
  is untouched;
- **with today's values**, `?hl=0.72,1.70,0.68`, it reproduces `p4-on` exactly: 13 bodies, 3 sun
  regions, 6 frames, zero pixels different. The seam measures what it claims.

### Where each body's colour sits - an output-space estimate

From the function-OFF capture, lit face only, pixels with any channel at or above 250 excluded because
clipping destroys the ratio. The shader's own `spread` is computed before ACES, so this is a proxy.

| body (view) | spread of its brightest 5% of pixels, median |
|---|---|
| Earth (about) - the clouds | 0.036 |
| Jupiter (services) | 0.054 |
| Saturn (projects) | 0.097 |
| **Mars (contact)** | **0.669** |
| **Venus (overview)** | **0.770** - from only 18 unclipped pixels of 1,870 |

The pale bodies' highlights are near neutral and Mars's are strongly saturated, so the steepness of
the spread response is the lever that can tell them apart. **Venus's highlights look as saturated as
Mars's** - which predicts the function cannot help Venus without also releasing Mars. The Venus
figure rests on 18 pixels and was treated as a prediction to test, not a finding.

### Round 1 - both candidates fail

| # | criterion | c1 steep curve `0.72,1.70,0.68,2` | c2 the plan's `0.90,0.35,0.30` |
|---|---|---|---|
| P4-1 | Mars worst longitude <= 11.10% | **15.99%** FAIL | **38.41%** FAIL |
| P4-2 | Saturn chroma >= 0.0928 | 0.0861 FAIL | 0.0895 FAIL |
| P4-3 | Venus burnt white <= 958 | 1,468 FAIL | 995 FAIL |
| P4-3 | Earth burnt white <= 8,749 | 8,418 PASS | 8,544 PASS |
| P4-4 | no body loses chroma | PASS | PASS |
| P4-5 | no view burns more | PASS | PASS |
| - | sun chroma change, core | +0.08% | +0.20% |

**Every candidate that gave colour back made Mars worse.** Even c1, the gentlest, moved Mars's worst
longitude from 11.10% to 15.99%. **Venus did not respond to the steeper curve at all** (1,483 to
1,468), which is what the estimate above predicted: her highlights are as saturated as Mars's, so any
setting that spares her also spares Mars.

### Round 2 - raise the strength to offset the steeper curve

c1 lost Mars because a steeper curve lowers the effect everywhere, Mars included. Round 2 raises the
strength to offset that at Mars's saturation level while keeping the pale bodies spared: `0.72,1.70,
0.85,2`, `0.72,1.70,1.0,2.5`, `0.72,1.70,1.0,3` and `0.80,1.70,0.90,2`. Each is measured on Mars first,
and the six views are captured only for candidates that hold Mars.

| # | criterion | c4 `0.72,1.70,1.0,2.5` | c6 `0.72,1.70,1.0,3` | c5 `0.80,1.70,0.90,2` |
|---|---|---|---|---|
| P4-1 | Mars worst <= 11.10% | **0.74%** PASS | **1.28%** PASS | **1.70%** PASS |
| P4-2 | Saturn >= 0.0928 | 0.0823 FAIL | 0.0874 FAIL | 0.0802 FAIL |
| P4-3 | Venus <= 958 | 1,604 FAIL - worse | 1,597 FAIL - worse | 1,577 FAIL - worse |
| P4-3 | Earth <= 8,749 | 8,344 PASS | 8,112 PASS | 8,641 PASS |
| P4-4 | no body loses chroma | FAIL: Venus, Mars (both views), Neptune | FAIL: same four | FAIL: same four |
| P4-5 | no view burns more | FAIL: overview 1,498 -> 1,624 | FAIL: -> 1,616 | FAIL: -> 1,594 |
| - | sun chroma change, core | +0.01% | +0.05% | +0.24% |

`0.72,1.70,0.85,2` did not produce a comparable turn - the analyzer refused it as sampled at different
steps - and is rerun in round 3.

### What rounds 1 and 2 establish together

1. **The trade runs both ways.** Raising the strength nearly removes Mars's own clipping - 11.10% to
   **0.74%** at c4 - but takes a third of Mars's colour in its own world (0.133 to 0.088), burns Venus
   more (1,483 to ~1,600) and dims Neptune. Lowering it gives colour back and lets Mars burn more.
2. **Venus and Mars moved against each other in all five comparable candidates.** Whenever Venus
   improved Mars got worse, and whenever Mars improved Venus got worse. Their highlights are equally
   saturated, so this function cannot treat them differently. **Venus's goal and Mars's guard conflict
   inside this function** - that is structural, not a tuning miss, and no setting of these four values
   is expected to satisfy both.
3. **Earth passed in all five.** It is the one goal this function reaches easily.
4. **Saturn's halfway target was reached by none.** Best holding Mars: 0.0874 (c6). Best at all:
   0.0895 (c2, which let Mars reach 38%).

### Round 3 - the balance point

Between c1 (strength 0.68: Mars worse, no colour lost anywhere) and round 2 (0.90-1.0: Mars near 1%,
colour lost): same curve, strength 0.85, 0.80, 0.76, 0.72. Each capture is retried once on failure,
and every retry is logged.

---

## Out of scope

The neutral-peak problem (Earth's clouds, Venus, and possibly Saturn). Any change to
exposure, albedo or the lamp - those are P3's and are signed. The ACES curve itself.

## Risk

The rolloff runs on every pixel in the site, so the blast radius is larger than the criteria
look at. The six photometry views cover the solar act and the five worlds; **the galaxy act
is not covered by any of them**, and it has a bloom threshold of 0 by design. A frame from
the galaxy act belongs in P4-6's by-eye check.
