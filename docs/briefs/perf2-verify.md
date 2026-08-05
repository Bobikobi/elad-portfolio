# PERF-2 verify - inverting the governor's default

Branch: `feat/b8c` @ 56f1228 · alias `elad-portfolio-git-feat-b8c-bobikobis-projects.vercel.app`
Harness: [perf2-tier.mjs](../../scripts/harness/perf2-tier.mjs) — samples the live tier
every 500ms and records every transition, because a governor that promotes and demotes
twice ends on the same value as one that never moved, and only the transition list tells
them apart.

## What changed

The defect was **assignment, not cost**. A phone was classified low and ran fine; an
integrated-GPU desktop was classified HIGH and handed a profile built for a gaming GPU.

| | before | after |
|---|---|---|
| starting tier | `high` | **`low`** |
| promotion bar | 0.86 × target | 0.92 × target (55fps+ against 60) |
| promotion hold | 6s | 3s, inside a 25s window |
| demotion budget | `MAX_DOWNGRADES = 2` against a **binary** tier | one demotion latches low for the session |
| high tier: Bloom levels | 9 | 7 |
| high tier: god-ray samples | 60 | 32 |
| high tier: DPR ceiling | 1.5 | 1.25 |

## Results

| run | starts low | transitions | verdict |
|---|---|---|---|
| 4x throttled | yes | **none** | **PASS** — stayed low, no flapping |
| unthrottled, real target | yes | none | correct, and see below |
| unthrottled, `?fpsTarget=20` | yes | `low → high @ 10.9s`, held 24s | **PASS** — promotion fires and holds |
| repeat of the above | yes | `low → high @ 16.1s`, held 34s | **PASS** |

**The unthrottled run on this box does not promote, and that is the right answer.** It
renders the cosmic home at a steady 30fps against a 60 target — `idle=false`, so this is
the free-running rate, not the idle throttle. A 30fps machine has no headroom, so refusing
to promote it is the mechanism working. This box IS the class of machine the defect is
about.

That left "correctly never fires" and "cannot fire" producing identical evidence — the
exact ambiguity that lets a knob silently stop being wired, which this round has already
hit twice. Hence `?fpsTarget` (ignored in production, like `?hz` and `?tier`): it lowers
the bar so any machine has headroom for one run, and the promotion path can be watched
end to end. It fires, it holds, and it does not flap.

## NOT PROVEN: the demotion latch

The latch is what stops flapping, and I could not exercise it here.

The test promotes the page, then throttles hard mid-run to force a demotion, then releases.
At 8x the frame rate held 14-16fps against the lowered target of 20 — above the 12.4
demotion line, so **not demoting was correct** and nothing was learned. At 20x the readout
went stale instead: `fps` reported an identical 23.5 for eight consecutive seconds while
the squeeze was on.

A frozen number is not a measurement. `window.__perf` is published from inside the render
loop, so when frames stop the last value simply persists — and "the governor did not
demote" becomes indistinguishable from "the governor did not run". **The latch is
therefore unverified**, and the honest statement is that its logic is simple and reviewed
but has not been observed firing.

Fixing it properly means publishing the diagnostics from the pacer's own rAF loop, which
keeps running when the render loop does not. That is instrumentation work, not product,
and it is not on the critical path to the owner's desktop test.

## What actually closes this

The owner's own desktop, on production, after the merge. Everything above says the
mechanism behaves correctly on a box with no headroom; none of it can say whether a real
desktop with headroom is now assigned the right tier, because this machine cannot
impersonate one. That was true of the frame-rate work before it and it is true here.
