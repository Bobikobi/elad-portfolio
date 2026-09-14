# P5 verify - the two blind criteria

Written 2026-09-14. Harness and documentation only: no product code, no pixels. P5 is the
one stage of [PHOTOMETRY-megaplan.md](PHOTOMETRY-megaplan.md) whose subject is the criteria
themselves.

| item | acceptance | verdict |
|---|---|---|
| **P5.1** | the annulus at 1.1-2.0 R, and the frame excluding the vignette's reach | **DONE** - one already existed, the other is new |
| **P5.2** | the threshold rule appears in `HANDOFF`'s standing rules | **DONE** - it is standing rule 6 |

---

## P5.1 - what was already there, and what was not

**The annulus at 1.1-2.0 sun-radii already existed.** P7 built it as S3 (`s3_corona`), which
takes the median luminance of that annulus against the sky beyond 3 R. P5 asked for it before
P7 was written and P7 delivered it without the connection being recorded. Nothing to add:
it reads corona 29.35, sky 9.93, ratio 2.955x.

**"The frame excluding the vignette's reach" did not exist**, and it is the half that
matters. R2.2 samples four 10-pixel blocks near the frame corners, which the vignette darkens
regardless of what the scene is doing - so the god-ray wash sat in the middle of the frame,
the corner metric passed, and the "milky halo" round chased the wrong source three times.

### How it is defined, and what it deliberately does not do

`sky_radial_profile()` in `scripts/harness/p7-sun.py` takes the sky's median luminance in
concentric bands measured from the **frame** centre, with the sun and its corona excluded
(> 2 R). The vignette's own falloff is then visible as the profile's shape, and a wash on top
of it is visible as the inner bands lifting.

**It does not consult the vignette's constants.** `Effects.tsx` sets the solar vignette to
`offset = 0.32 - 0.04 x coverage`, `darkness = 0.87 - 0.25 x coverage`, and the boundary of
its reach could be computed by inverting the library's shader. That was rejected: it would be
a threshold derived from a constant in the source under audit, which expires silently the
next time either the constant or the library's formula moves. **That is precisely what P5.2
adds a rule against, and P5.1 is not allowed to break it in the same commit.** The bands come
from the frame's geometry and the exclusion comes from the fitted disc.

### Measured, and the blindness is not theoretical

Tag `m4-lean2`, solar overview, real GPU:

    band (frame centre -> corner)   sky median %   pixels
      0.000 - 0.125                      -              0     the sun and its corona
      0.125 - 0.250                      -              0
      0.250 - 0.375                    8.211         12,863
      0.375 - 0.500                    8.184        821,588
      0.500 - 0.625                    6.392      1,027,988
      0.625 - 0.750                    5.076        874,872
      0.750 - 0.875                    3.391        788,880
      0.875 - 1.000                    0.337        229,272

    R2.2's corner blocks:  0.000%
    mid-frame sky:         8.211%      24.4x the corners

**The corner metric reads zero on a frame whose middle sits at 8.2%.** R2.2's bar is 10%, so
the mid-frame is inside it - but the metric that is supposed to watch for a wash is reading a
number 24 times smaller than the region the wash lives in, which is the defect P5 names,
demonstrated rather than argued.

The ratio is reported as a baseline, not as a pass/fail: the vignette pushes it up by
construction, so what it is FOR is comparison across builds. Setting a bar on it today would
be setting an absolute threshold on the quantity under test, which rule 6 now forbids.

It prints next to the corner number on purpose. The two disagreeing is the finding.

### It did not disturb P7

All six P7 criteria still pass with the metric in place, unchanged: S1, S2, S3 (2.955x),
S4 (0.743), S5 (5.156 s), S6 (calls 69/64, tris 167,134/146,549, medians 16.700).

---

## P5.2 - the rule

Added to [HANDOFF-2026-08-05.md](HANDOFF-2026-08-05.md) as **standing rule 6**, alongside
rule 5 ("check the instrument before believing the reading") as the plan asked. Rules 6-9
renumbered to 7-10; no document referenced them by number.

> **A threshold must never be an absolute value of the quantity under test.** Such a
> threshold expires the first time that quantity changes, and it fails in BOTH directions -
> it reports a real improvement as a failure and would report a real failure as progress.
> Derive it from the image (interior vs sky, the 50% crossing) or from the camera, never from
> a previous run and never from a constant in the source it is auditing.

The plan's wording is kept and two things are added to it. **"It fails in both directions"**
is the part that makes the rule worth obeying: a threshold that only ever cried wolf would be
noticed. SUN-3's did the opposite - it reported a real improvement as a failure, and the same
mechanism in the other direction reports a real failure as progress, silently.
**"Never from a constant in the source it is auditing"** is not in the plan's wording; it came
out of writing P5.1, where the tempting implementation was to read the vignette's own numbers.

The provenance travels with the rule, as everywhere else in this repo: SUN-3's disc finder
located the sun at a fixed luminance of 150, chosen when the disc measured 195. The stage's
own fix made the sun dimmer, 150 fell inside the disc, the fitted radius came back 6% small,
and C1 read 0.962 where the same frame against the true silhouette read 0.911.

`SUN-3-verify.md` said this was "proposed as a standing rule in P5"; that line now says it
is one.

---

## Not signed under rule 2

Every number here is from localhost. P5 adds no criterion that judges the scene, so there is
nothing for an alias run to confirm - the metric's own correctness does not depend on the
build. The first stage that uses it should take it to the alias.
