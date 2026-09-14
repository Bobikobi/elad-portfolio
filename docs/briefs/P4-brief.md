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
2. **Does Saturn belong here?** If its 51.45% is neutral, P4 cannot touch it and Saturn joins
   the not-P4 bucket, which should then become a stage of its own rather than staying an
   unowned note in three documents.
3. **P4-2 as written may be unreachable.** P3 could not clear Earth's clouds and Venus, and
   P4 provably cannot either. Either P4-2 is scoped to "no NEW clipping and no regression on
   the four views already at zero", or the stage is blocked on work that is not P4's.

I recommend deciding 2 and 3 **after step 1**, on the measurement, and deciding 1 now.

---

## Out of scope

The neutral-peak problem (Earth's clouds, Venus, and possibly Saturn). Any change to
exposure, albedo or the lamp - those are P3's and are signed. The ACES curve itself.

## Risk

The rolloff runs on every pixel in the site, so the blast radius is larger than the criteria
look at. The six photometry views cover the solar act and the five worlds; **the galaxy act
is not covered by any of them**, and it has a bloom threshold of 0 by design. A frame from
the galaxy act belongs in P4-6's by-eye check.
