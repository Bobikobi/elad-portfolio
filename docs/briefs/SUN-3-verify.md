# SUN-3 verify - NOT SIGNED

> **Status: OPEN.** This stage cannot be signed PASS yet, for one reason that is not a
> judgement call: **every SUN-3 number came from localhost.** Standing rule 2 requires the
> numbers to come from a deployed preview alias. Real GPU, pinned tier, DOM hidden - but
> localhost. Written 2026-08-15 alongside the after-the-fact
> [brief](SUN-3-brief.md), per P0a of [PHOTOMETRY-megaplan.md](PHOTOMETRY-megaplan.md).
>
> Why it matters more here than usual: localhost and the alias differ in build (dev vs
> production bundle), and this stage's entire subject is the tone chain - exactly where a
> build difference could hide.

---

## Measured result, localhost, real GPU

| criterion | before | after | target | verdict |
|---|---|---|---|---|
| **C1** limb/centre red | 1.000 | **0.873** | <= 0.90 | PASS (localhost) |
| **C2** limb/centre luminance | 0.920 | **0.804** | 0.80-0.88, monotone | PASS (localhost) |
| **C3** longest prominence | 1.76 R | **1.09 R** | <= 1.25 R | PASS (localhost) |
| **C5** limb covered by spikes | 8.9% | **1.1%** | <= 15% | PASS (localhost) |

C4 (planet clipping) was out of scope before the work began - see the brief. It fails, it is
recorded as failing, and it is now P3 of the photometry plan.

Side effect, accepted and owner-facing: disc mean sRGB (216, 141, 87) -> (186, 124, 89).

---

## Adversarial self-check - how this result could be falsely passing

Three routes. **One is tested and was a real defect. Two are specified and not yet run.**

### Route 1 - the instrument was calibrated against the thing it measures  ·  TESTED, WAS REAL

The harness located the disc at a **fixed luminance threshold of 150**, chosen when the disc
measured 195. The moment the fix made the sun dimmer, **150 fell inside the disc**: the fitted
radius came back **6% small**, and what the harness called "the limb" was really the mid-disc.

Measured both ways on the same frame:

| | C1 (limb/centre red) |
|---|---|
| threshold-fitted radius | 0.962 |
| true silhouette | **0.911** |

It reported a real improvement as a failure. Symmetrically, it would have reported a real
failure as progress. **This is the reason the correct number above is 0.873 and not a number
derived from the stale radius.**

The general form of this defect is now proposed as a standing rule in P5: *a threshold
expressed as an absolute value of the quantity under test expires the first time that quantity
changes. Derive it from the image or from the camera, never from a previous run.*

### Route 2 - the spike measurement counted a planet as a prominence  ·  NOT YET RUN

C3 and C5 measure structure outside the silhouette. **Venus was being counted as a
prominence.** The record names the defect but no corrected C3/C5 number exists, so the
1.09 R / 1.1% above must be treated as **unconfirmed** until this is re-run.

**Test:** re-measure C3 and C5 with the known body positions excluded - `DebugHud` already
publishes every body's screen centre, which is what that change was for. A prominence is
attached to the silhouette; a planet is not. Pass condition: the corrected numbers stay inside
their targets, and any body-shaped contributor is gone from the spike list.

### Route 3 - monotonicity is an artifact of coarse binning  ·  NOT YET RUN

C2 requires the radial profile to be **monotone over 8 radial bins**. Eight bins is coarse
enough to average out a plateau: a profile that is flat across two adjacent sample rings can
still produce eight decreasing bin means. Given that the defect this whole stage fixed **was a
plateau**, a monotonicity check that cannot see plateaus is the wrong instrument.

**Test:** re-run the C2 profile at 24 bins and at raw per-ring resolution. Pass condition:
monotone at 8 bins **and** no non-decreasing run longer than 3% of the radius at full
resolution.

---

## What has to happen before this can be signed

1. Re-measure C1, C2, C3, C5 on a **deployed preview alias**, and confirm they match localhost
   within the harness's own noise
2. Run route 2 and route 3 above and record their numbers here
3. Only then change this file's status and the INDEX row

Until all three are done, SUN-3 is **implemented and unverified**, and any later stage that
leans on its numbers - P1, P2 and P3 all do - inherits that uncertainty.
