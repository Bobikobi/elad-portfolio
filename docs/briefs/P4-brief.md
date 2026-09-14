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

---

## Out of scope

The neutral-peak problem (Earth's clouds, Venus, and possibly Saturn). Any change to
exposure, albedo or the lamp - those are P3's and are signed. The ACES curve itself.

## Risk

The rolloff runs on every pixel in the site, so the blast radius is larger than the criteria
look at. The six photometry views cover the solar act and the five worlds; **the galaxy act
is not covered by any of them**, and it has a bloom threshold of 0 by design. A frame from
the galaxy act belongs in P4-6's by-eye check.
