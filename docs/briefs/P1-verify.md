# P1 verify - the photometric module

Written 2026-09-14, **four weeks after the stage shipped**, and labelled as such. P1 was
implemented across `0ae9a49..24b936c` on lane `codex/p1-pilot` and had no verify artifact and
no `INDEX.md` row. This closes that gap with measurements taken now, not with a reconstruction
of what was claimed then.

Criteria are P1-1/2/3 as written in [PHOTOMETRY-megaplan.md](PHOTOMETRY-megaplan.md).

| # | criterion | target | measured | verdict |
|---|---|---|---|---|
| **P1-1** | the frame does not change | exactly zero on all six frames, mean 0.0000 and max 0 | **0.0000 / 0 on all six** | **PASS** |
| **P1-2** | nothing got more expensive | calls and triangles identical, median frame time within 1ms, both tiers | **identical; +0.1ms high, +0.7ms low** | **PASS** |
| **P1-3** | no number was left behind | zero literal constants outside the module | **zero numeric literals**; criterion corrected, see below | **PASS** |
| — | every constant kept its value | not in the plan; added here | **16 of 16 identical** | **PASS** |

Range measured: `11ac5f9` (the commit before P1's first) against `24b936c` (P1 complete).

---

## P1-1 - and the reason it could not simply be re-run

**The instrument that makes P1-1 exact was built inside P1.** The fixed-step clock and the
freeze seam are commits `6031745`, `1012281` and `118179a`, which sit in the middle of the P1
range. The pre-P1 tree has no `installFixedStepClock` and no `__clock`, so
`photometry-diff.mjs` refuses to measure it - correctly.

The captures taken at the time cannot stand in. `clean-a` against `clean-b` - **two captures
of the same build** - reads mean 0.410 and max 175 on projects, and up to 1.010 / 239 on
contact. P1 step 4's own commit message works through the full pairwise matrix and concludes
the same thing: at that noise floor the diff could not tell a real change from nothing.

So the baseline was made measurable by adding **only the instrument**, and nothing else:

    git checkout 11ac5f9 -- src/                                   # the pre-P1 tree
    git checkout 24b936c -- src/components/scene/DebugHud.tsx      # the clock seam
    + 3 lines in SceneRoot.tsx: the import, installFixedStepClock(clock), <ClockFreezeProbe />

`gl.toneMappingExposure` was **left at the pre-P1 literal `1`** - substituting
`NEUTRAL_APERTURE` there is part of what is under test. Confirmed before capture: this tree
imports `@/lib/photometry` in zero files.

This is legitimate because the clock is present on **both** sides and both runs use
`?fixedStep`. It is part of the instrument, not part of the subject.

### Result

    view            floor mean/max     diff mean/max   >1 of 255  verdict
    overview               0.000/0           0.000/0       0.00%  PASS
    about                  0.000/0           0.000/0       0.00%  PASS
    services               0.000/0           0.000/0       0.00%  PASS
    projects               0.000/0           0.000/0       0.00%  PASS
    technologies           0.000/0           0.000/0       0.00%  PASS
    contact                0.000/0           0.000/0       0.00%  PASS

Exactly zero, in the criterion's exact form.

### A latent harness bug, found by this run and fixed

The pre-P1 tree failed `assertCanvasOnly` on the header. The header markup is **byte-identical
between the two trees**, so it was never about P1.

`visibility` is a **discrete** CSS property, and the site header carries
`transition: all 0.3s`. Under a transition a discrete property does not flip until the
midpoint, so `visibility: hidden` arrives ~150 ms late - and later still while the main thread
is busy settling the scene. `hideDom` waited 400 ms and asserted. That was enough by luck on
every run taken before today and not enough on a tree whose first paint was slower.

The stylesheet now also sets `transition: none !important; animation: none !important` on
everything it hides. That removes the race rather than widening the wait, which would only
have made it rarer.

**Proven not to move the measurement**: `m1-before` against a fresh capture with the fixed
harness, same code - mean 0.0000, max 0 on all six views. Every number in this repository
taken with the old stylesheet remains comparable.

---

## P1-2 - measured with a harness written for it

`p7-sun.mjs` carries the cost sample, but it anchors on the fixed-step clock and therefore
cannot run against the pre-P1 tree either. `scripts/harness/p1-cost.mjs` reads the same two
counters off `window.__hud`, which **predates P1**, and anchors on frame count.

Mode over 119 frames, both tiers, real GPU (ANGLE / Vulkan / Intel), solar overview:

| | pre-P1 `11ac5f9` | P1 complete `24b936c` |
|---|---|---|
| high: calls | **73** [70, 73] | **73** [70, 73] |
| high: triangles | **170,080** [168,640, 170,080] | **170,080** [168,640, 170,080] |
| high: median frame | 16.5 ms | 16.6 ms (**+0.1**) |
| low: calls | **68** [67, 69] | **68** [67, 69] |
| low: triangles | **149,495** [149,015, 149,975] | **149,495** [149,015, 149,975] |
| low: median frame | 13.7 ms | 14.4 ms (**+0.7**) |

Calls, triangles and both ranges are identical. Medians are inside the criterion's 1 ms.

---

## P1-3 - and the criterion is unmeetable as written

The plan asks for *"no literal `intensity=`, `toneMappingExposure`, `luminanceThreshold`, or
exposure constant outside the module - zero hits in `src/components/scene/**`"*.

Grepping those four strings returns **6 hits**, and it always will: you cannot set exposure
without naming `toneMappingExposure`, and `ExposureToneMap.tsx` has to read it back off the
renderer every frame. **A criterion that forbids naming a property forbids using it.** This is
the same class of defect as P3-1's threshold and P3-3's monotonicity clause, and it is
corrected the same way.

**Corrected P1-3: zero NUMERIC LITERALS assigned to the owned quantities.**

    grep -rnE "(toneMappingExposure|luminanceThreshold)\s*[=:]\s*[0-9]|intensity=\{?[0-9.]+\}?" src/components/scene
    -> 0 hits

All six original hits are a named constant from the module (`NEUTRAL_APERTURE`, the three
`BLOOM_*_LUMINANCE_THRESHOLD`s), a value damped toward one (`expoTarget`, derived from
`ORBIT_APERTURE`), or a comment.

---

## The check the plan did not ask for, and should have

P1-1 proves no pixel moved **in six views**. It cannot prove a constant kept its value: a
number that only matters in a state those views do not cover would pass. P1 step 4's own
commit message is titled *"what the pixel diff cannot tell us"*.

So every constant the module owns was compared against its pre-P1 literal, statically. This
is exact and has no noise floor.

| constant | P1 value | pre-P1 literal at `11ac5f9` | |
|---|---|---|---|
| `AMBIENT_FILL_INTENSITY` | 0.06 | `SolarAct.tsx:871 <ambientLight intensity={0.06} />` | same |
| `SUN_LAMP_INTENSITY` / `DISTANCE` / `DECAY` | 650 / 90 / 2 | `Sun.tsx:382 intensity={650} distance={90} decay={2}` | same |
| `SUN_EMISSIVE_EXPOSURE` | 1.5 | `Sun.tsx:223 col *= (1.5 + uPulse) * ...` | same |
| `GODRAY_WEIGHT` | 0.05 | `Effects.tsx:64 const GODRAY_WEIGHT = 0.05` | same |
| `BLOOM_*_INTENSITY` | 0.34 / 0.5 / 0.5 | `Effects.tsx:277 intensity={solar ? (focused ? 0.34 : 0.5) : 0.5}` | same |
| `BLOOM_*_LUMINANCE_THRESHOLD` | 0.86 / 0.33 / 0 | `Effects.tsx:278 luminanceThreshold={solar ? (focused ? 0.86 : 0.33) : 0}` | same |
| `BLOOM_*_LUMINANCE_SMOOTHING` | 0.22 / 0 | `Effects.tsx:279 luminanceSmoothing={solar ? 0.22 : 0}` | same |
| `ORBIT_APERTURE` | earth .62, mars .72, jupiter .85, saturn 1.0, belt 1.0 | `CameraRig.tsx:38 const ORBIT_EXPOSURE = { earth: 0.62, mars: 0.72, jupiter: 0.85, saturn: 1.0, belt: 1.0 }` | same |
| `NEUTRAL_APERTURE` | 1 | `SceneRoot.tsx:92 gl.toneMappingExposure = 1` | same |

**16 of 16 identical.**

The one that could have gone wrong silently is `SUN_EMISSIVE_EXPOSURE`, because it is
interpolated into a GLSL string where `1` and `1.5` are different types and `"1"` would not
even compile as a float. `glslFloat = v => Number.isInteger(v) ? v.toFixed(1) : String(v)`
emits `"1.5"`. Identical to the literal it replaced.

Worth recording as a sign the refactor did not over-collapse: `SUN_R = 1.5` in the same file
is a **different** 1.5 - the sun's radius - and was correctly left where it was.

---

## What this does not cover

The six views. The galaxy act reads none of these constants today and was out of P1's scope
by the plan's own note. P1-1 is a statement about the solar act and the five worlds.
