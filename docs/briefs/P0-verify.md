# P0 verify - the audit trail, corrected

Written 2026-09-14, after the fact and labelled as such. P0 is the one stage of
[PHOTOMETRY-megaplan.md](PHOTOMETRY-megaplan.md) whose whole subject is the audit trail, and
it was itself missing from it. That is recorded here rather than quietly fixed.

P0 changes no code and no pixels. Its acceptance is a checklist, quoted from the plan:

> `SUN-3-brief.md` (labelled after-the-fact) and `SUN-3-verify.md` exist; the SUN-3 criteria
> are re-measured on a deployed preview alias and match localhost within the harness's own
> noise; the three corrections above are in place.

| item | status |
|---|---|
| **P0a-1** `SUN-3-brief.md` exists, labelled after-the-fact | **DONE** |
| **P0a-2** `SUN-3-verify.md` exists with the adversarial self-check | **DONE** |
| **P0a-3** SUN-3 re-measured on a deployed preview alias, matching localhost | **DONE 2026-09-14** |
| **P0b-1** `INDEX.md`'s SUN-2 row: the C2 conclusion was wrong | **DONE** |
| **P0b-2** `ExposureToneMap.tsx`: "passed through untouched" was false | **DONE** |
| **P0b-3** Mars's focused world clips 5.0%, never recorded anywhere | **DONE** |

**P0 is complete.** The last item closed today; everything else has been in place since
2026-08-15.

---

## P0a - the two artifacts

`SUN-3-brief.md` opens with the label the plan asked for, and is stronger than the plan
required. It names its sources - the commit message of `0fcf349`, the harness that commit
added, and the diff - and states **"Nothing here is recalled from conversation."** That is
the right discipline for an after-the-fact brief: a reconstruction from memory would read
identically and be worth nothing.

`SUN-3-verify.md` carries the adversarial self-check with three routes, which is what the
plan asked for ("at least three ways the result could be falsely passing, each actually
tested"). At the time only one was tested. **All three are answered now** - see
[SUN-3-verify.md](SUN-3-verify.md)'s closeout section, 2026-09-14: route 2 turned out to be
already implemented in the harness, and route 3 was written and run.

## P0a-3 - the alias re-measurement

The plan singles this out: *"localhost and the alias differ in build (dev vs production
bundle), and this stage's whole subject is the tone chain, which is exactly where a build
difference could hide."*

Measured 2026-09-14, alias against localhost on the same code the same hour:

| criterion | alias | localhost | delta |
|---|---|---|---|
| C1 limb/centre red | 0.841 | 0.840 | 0.001 |
| C2 limb/centre luminance | 0.757 | 0.755 | 0.002 |
| C3 longest prominence · limb covered | 1.11 R · 1.4% | 1.10 R · 1.4% | 0.01 R |
| C5 widest background sprite | 6 px | 7 px | 1 px |

**Nothing hides there.** Every delta is inside the harness's own run-to-run noise -
`sun-3.mjs` runs on the live clock with no fixed-step freeze, so two runs are never the same
orbital phase, which is why these are not exactly zero the way the frozen photometry
harness's are.

Carried forward from the SUN-3 verify because it qualifies the above: P3, P4 and P7 all moved
the sun after SUN-3, so these numbers describe **today's** sun. They confirm the criteria
still hold on a deployed build; they are not a retroactive measurement of SUN-3's own output,
and no such measurement is possible any more.

## P0b - the three wrong conclusions

All three are in place, and all three are **corrected in situ with a dated note** rather than
deleted, so the next person sees that the record moved and why.

1. **`INDEX.md`, SUN-2 row.** The struck-through claim that C2 was unreachable from the
   shader now carries: *"CORRECTED 2026-08-15 by SUN-3: C2 is reachable and was measured at
   0.804. The limb was being filled back in by GOD RAYS, not bloom - bloom moved the ratio by
   0.001."*

2. **`ExposureToneMap.tsx:51-58.`** The doc block now opens *"CORRECTED 2026-08-15 (SUN-3).
   This comment used to claim ... that is false, and it hid a real defect for two stages"*,
   and gives the measured spread of 0.97 with the 49% / 11% desaturation. It also names where
   the fix belongs (P4) and why it is not safe yet.

3. **Mars's focused world clips 5.0% of its disc, and did so before SUN-3.** Now an
   `INDEX.md` row of its own, marked OPEN, attributed away from SUN-3, and pointed at P4.

## A fourth wrong conclusion, found after the plan was written

Not in P0's list because it was not known when the list was made: commit `e57611e`, *"A
fourth wrong conclusion, found while preparing to move the bloom constants"* - `0fcf349`
moved the overview bloom threshold from **0.94 to 0.33** and left the SUN-2 comment above it,
which explains at length why the value is 0.94, untouched. The commit message does not
mention the change.

The comment is corrected in place; the value is deliberately left alone, because the bloom
threshold is the second knob of P6's first judgement call and re-tuning it there would decide
that call by accident. Recorded in [SUN-3-verify.md](SUN-3-verify.md).

That P0's own list was incomplete is the point of P0: this is the third instance in the same
lane of a recorded conclusion outliving the thing it described.
