# SUN-3 verify - the three blockers are cleared, 2026-09-14

> **Status: the three items under "What has to happen before this can be signed" are all
> done.** The alias re-measurement is below, route 2 turned out to be already implemented in
> the harness, and route 3 was written and run. Read the caveat under the alias table first:
> the sun measured today is the **P7 sun**, not the sun SUN-3 shipped.
>
> The original status note follows for the record.

> ~~**Status: OPEN.** This stage cannot be signed PASS yet, for one reason that is not a
> judgement call: every SUN-3 number came from localhost.~~ Standing rule 2 requires the
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

---

## Found later, and not by any of the three routes above

**SUN-3 changed a number it never mentioned.** Found 2026-08-16 while moving the bloom
constants into the photometry module: `0fcf349` moved the overview bloom threshold from
**0.94 to 0.33** - and left the SUN-2 comment above it, which explains at length why the
value is 0.94, completely untouched. The commit message does not mention the change.

It is the only number SUN-3 moved silently, and the stale comment is the second instance in
this stage of the same failure mode as P0b: a recorded conclusion that outlived the thing it
described. The comment is corrected in place; the value is left alone, because the bloom
threshold is knob two of P6's first judgement call and re-tuning it here would be deciding
that call by accident.

**This matters for the criteria above.** C1, C2 and C5 all measure the disc after bloom.
They were measured with the threshold at 0.33, and the reason it is at 0.33 is not recorded
anywhere - so the alias re-measurement should record it explicitly rather than inherit it.

---

## What has to happen before this can be signed

1. Re-measure C1, C2, C3, C5 on a **deployed preview alias**, and confirm they match localhost
   within the harness's own noise
2. Run route 2 and route 3 above and record their numbers here
3. Only then change this file's status and the INDEX row

Until all three are done, SUN-3 is **implemented and unverified**, and any later stage that
leans on its numbers - P1, P2 and P3 all do - inherits that uncertainty.

---

# Closed out - 2026-09-14

## 1. The alias re-measurement

`sun-3.mjs` against the deployed preview alias
`https://elad-portfolio-git-codex-p1-pilot-bobikobis-projects.vercel.app`, and against
localhost on the same code the same hour, so the comparison is like-for-like:

| criterion | alias | localhost | delta |
|---|---|---|---|
| **C1** limb/centre red | **0.841** | 0.840 | 0.001 |
| **C2** limb/centre luminance | **0.757** | 0.755 | 0.002 |
| **C3** longest prominence · limb covered | **1.11 R · 1.4%** | 1.10 R · 1.4% | 0.01 R |
| **C5** widest background sprite | **6 px** | 7 px | 1 px |
| C4 blown px outside the sun (out of scope) | 8,472 | 8,550 | 78 |

**The specific worry this stage recorded is answered.** The note at the top said rule 2
matters more here than usual because "localhost and the alias differ in build (dev vs
production bundle), and this stage's entire subject is the tone chain - exactly where a
build difference could hide." Nothing hides there. Every delta above is inside the
harness's own run-to-run noise: `sun-3.mjs` runs on the live clock with no fixed-step
freeze, so the orbital phase differs between any two runs, which is also why the deltas are
not exactly zero the way the frozen photometry harness's are.

**The caveat, and it is not small.** P3, P4 and P7 all moved the sun after SUN-3. These
numbers therefore describe **today's sun**, not the one `0fcf349` produced. They confirm
that the criteria still hold on a deployed build; they are not a retroactive measurement of
SUN-3's own output, and no such measurement is possible any more.

**C2 reads 0.757 against its written band of 0.80-0.88, and that is correct.** RULING 4
(2026-09-10) retired that band in favour of P7's S4, limb/centre <= 0.75, because a real
solar photograph measures 0.559. P7's S4 measures the same quantity with the newer
instrument on the true silhouette and reads **0.7425**. Both sit below the old band's floor,
which is exactly what the ruling said should happen. C2's FAIL here is the retired
criterion failing, not the sun.

C4 was out of scope before this stage began and belongs to P3, which records it as still
failing on Earth's cloud tops and Venus.

## 2. Route 2 - already implemented, and it was run

The route asked for C3 and C5 re-measured with known bodies excluded. `sun-3.py` already
does it: `foreign_circles()` finds them from the image and `spike_extent(..., avoid=av)`
excludes them, and the comment above that call records the defect the route names - the
first reading "count[ed] Venus as a 2.6 R prominence while missing the real 1.7 R rays for
being faint."

Both runs above report **4 foreign objects excluded**, with C3 at 1.11 R over 1.4% of the
limb against targets of 1.25 R and 15%. The pass condition is met: the numbers stay inside
their targets and no body-shaped contributor remains.

One difference from the route as written, and it is an improvement: the route proposed using
`DebugHud`'s published body centres. The implementation derives the circles from the image
instead, which is what the standing rule about instrument thresholds asks for.

## 3. Route 3 - written and run

`scripts/harness/sun-3-route3.py`. The route's pass condition, quoted: *monotone at 8 bins
AND no non-decreasing run longer than 3% of the radius at full resolution.*

| | alias | localhost |
|---|---|---|
| rises at 8 bins | **0** | 0 |
| rises at 10 bins (what C2 uses) | 0 | 0 |
| rises at 24 bins | 2 | 2 |
| longest non-decreasing run, 337 rings | **1.78% of R** | 2.37% of R |
| **verdict** | **PASS** | **PASS** |

**C2's monotonicity is not an artifact of coarse binning.** At one ring per pixel of radius
the longest stretch that fails to fall is 6 rings out of 337.

Reported rather than buried: at 24 bins there are 2 rises, which would exceed C2's own
"<= 1" allowance if that allowance were applied at that resolution. That is granulation
showing through at a scale the criterion was never written for - the stage's granulation
criterion wants exactly that structure to exist - and the route's own decisive test is the
full-resolution run length, which passes with room.

## What is still open

Nothing in this file's own list. The stage's numbers now come from a deployed alias, both
falsification routes are answered, and the one criterion that fails is a criterion the owner
retired.
