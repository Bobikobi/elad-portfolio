# MOBILE-1 verify - M3 and M4 pass, M1 and M2 do not, and the eye finds a regression

> **CLOSED 2026-09-15 as PARTIAL - owner decision.**
>
> **What this stage leaves in the code:** the bitmap texture loader, which decodes images off the main
> thread and carries the fix for the black-planet bug found here. The settled scene is byte-identical to
> before on all six views, on localhost and on the deployed alias (M3, signed), and it costs nothing (M4).
>
> **What it did not achieve:** M1 (total blocking time) and M2 (longest task). Measured on the local
> production build and on the alias, neither lever this stage was allowed moves them. Spreading the build
> across frames was reverted after it lifted the loader onto a sky with no galaxy and added about 10 s of
> busy main-thread time; the decode move on its own landed inside the baseline's own run-to-run spread.
> MOBILE-2's N0 then named where the time actually goes - React's scheduler, react-three-fiber's frame loop,
> and layout - and found no cheap lever there either.
>
> **The answer to M1 and M2 is not more tuning of this stage.** It is the owner's direction for phones,
> recorded in [MOBILE-2-brief.md](MOBILE-2-brief.md): a newly designed gallery-style view - one planet at a
> time, a swipe to the next, no free camera - to be designed after the current work, with its own brief.

Measured 2026-09-11 against [MOBILE-1-brief.md](MOBILE-1-brief.md), on branch
`mobile-1-wip` at `e8c7a74`, baseline `codex/p1-pilot` at `64f4efd`.
**Re-measured 2026-09-14 on the deployed preview aliases, so rule 2 is satisfied** - see
"On the alias" at the end.

> `codex/p1-pilot@64f4efd` differs from `fb7d269` - the commit the brief's baseline numbers
> came from - only in `docs/` and `scripts/harness/`. No `src/` change, so the bundle under
> test is the same one the brief measured.

## Verdict

| # | criterion | target | measured | verdict |
|---|---|---|---|---|
| **M1** | total blocking time | <= 5,000 ms | **10,114 ms** local (baseline 10,188) · **10,797** alias (baseline 10,816) | **FAIL** |
| **M2** | longest main-thread task | <= 600 ms | **1,600 ms** local (baseline 1,734) · **1,664** alias (baseline 1,765) | **FAIL** |
| **M3** | the settled scene is byte-identical | mean 0.0000, max 0, six views | **0.0000 / 0 on all six** - localhost AND alias-to-alias | **PASS, signed** |
| **M4** | the tier law | calls, triangles, medians unchanged | calls 69/64, tris 167,134/146,549, medians 16.700/16.700 - **identical to P7** | **PASS** |
| risk clause | look at the first two seconds by eye | no visible regression | **the loader lifts before the galaxy exists** | **REGRESSION** |

The stage does not close. M3 was the blocker and is now fixed; M1 and M2 are the point of
the stage and are untouched by the work done so far.

---

## M3 - what was actually wrong, and the two rounds it took to stop bisecting

The previous commit recorded six different changes that all produced the identical failing
number (mean 2.115, max 248 on the overview, five views already at zero) and correctly
concluded that the variable being changed was not in the causal path. It localised the cause
to `SolarAct.tsx` and ruled out the base texture loader's options.

**The cause is in `src/lib/bitmapTexture.ts`, which `SolarAct.tsx` calls** - so the bisect
pointed at the right call site and the wrong file, and "not the loader options" was true
while "not the loader" was not.

### The symptom was misread as darkening

The recorded symptom was "darker in 88,727 pixels". Looking at the frames rather than the
scalar: the planets are not dimmer, they are **untextured**. Saturn's globe is black inside
intact rings, Earth is a black disc behind its atmosphere rim, Mars is a dark teal ball. The
albedo map never arrives, `texture2D(map, uv)` returns black, and `diffuseColor *= 0`.

Confirmed directly rather than inferred - `window.__three`, overview, after the scroll:

    11 of 11 planet/cloud/night maps:  image = null, version = 0
    every /textures/*.jpg|webp request: issued twice, one of each pair net::ERR_ABORTED

### Why the five worlds passed and the overview did not

`uHiMix` crossfades the focused world's hi-res map over the base one in the same UV space.
In all five worlds the black base map is covered. On the overview nothing covers it. That is
also the explanation for the previous commit's most confusing observation - *"the same
planets in their own focused worlds are byte-identical, where the hi-res map replaces the
base one."* It was the answer, written down as a puzzle.

### The mechanism

The loader shell is built in a `useMemo` and released in a `useEffect` cleanup, and React
does not pair those one-for-one. Traced on the overview: two shells exist per URL and
`Planet.useEffect`'s cleanup disposes **the one the material is holding**.

`dispose()` was terminal - it aborted the fetch, closed the bitmap, and gated the upload
behind a `disposed` flag - so that shell could never come back.

`TextureLoader.load()`, which it replaced, has the opposite property: `Texture.dispose()`
frees the GPU copy and nothing else, and the next draw re-uploads from `texture.image`.
**That property is what let the old code survive React's scheduling.** The loader now keeps
it: the fetch always finishes, the decode always lands in the shell, and `dispose()` frees
the GPU copy without making the shell unusable.

### The instrument, first

Per the standing rule, before judging anything: `m1-before` vs `m1-repro` on **unchanged**
code reproduced the failure to the last decimal - overview 2.115/248, floor 0.000/0, the
other five views 0.000/0. So the instrument was sound and the branch state matched.

After the fix, `m1-before` vs `m1-fix5`:

    view            floor mean/max     diff mean/max   >1 of 255  verdict
    overview               0.000/0           0.000/0       0.00%  PASS
    about                  0.000/0           0.000/0       0.00%  PASS
    services               0.000/0           0.000/0       0.00%  PASS
    projects               0.000/0           0.000/0       0.00%  PASS
    technologies           0.000/0           0.000/0       0.00%  PASS
    contact                0.000/0           0.000/0       0.00%  PASS

---

## M1 and M2 - the instrument was rebuilt first, and then the answer was no

### The brief's numbers could not be recomputed from the run manifest

The manifest's `longTasks` come from the `longtask` PerformanceObserver and give 8,659 ms
for the deployed run the brief records as 9,949 ms - and 35 tasks where the brief says 42.
The brief's numbers come from the **top-level `CrRendererMain` tasks in the trace**, the
same denominator `mobile-startup.py` uses. Recomputed that way:

| run | tasks >= 50 ms | TBT | longest | brief says |
|---|---|---|---|---|
| `prod20` (local prod, `fb7d269`) | 46 | **9,824** | **1,660** | 9,824 / 1,660 |
| `live20` (deployed site) | 42 | **9,949** | **1,710** | 9,949 / 1,710 |

Exact on both. The definition is settled and is written down here because it was not
written down anywhere before.

### Three runs of each build, so the spread is measured and not assumed

Local production build, `NEXT_PUBLIC_VERCEL_ENV=production`, 20x CPU, slow 4G, Moto G Power
profile, same machine, same session:

| build | TBT (3 runs) | longest task (3 runs) | tasks >= 50 ms |
|---|---|---|---|
| baseline `64f4efd` | 9,978 · 10,188 · 10,366 | 1,651 · 1,734 · 1,795 | 46 · 52 · 53 |
| `mobile-1-wip` `e8c7a74` | 10,050 · 10,249 · 10,114 | 1,599 · 1,600 · 1,643 | 99 · 70 · 75 |

**M1: no movement.** Medians 10,188 -> 10,114, well inside a spread of ~390 ms on the
baseline alone. The target is 5,000.

**M2: 1,734 -> 1,600**, an 8% improvement against a 144 ms spread on the baseline. Real but
marginal, and the target is 600.

### And one number got materially worse

Total main-thread time, same runs: **20,341 ms -> 30,946 ms**. The work was sliced into
roughly half again as many tasks (46-53 -> 70-99) without being reduced, and the page stays
busy about ten seconds longer. Spreading the build across frames did what it says; it did
not make the build cheaper, and the criterion is about how long the thread is unavailable.

The attribution says the same thing - the two things the stage was allowed to change did
move, and they are not where the time is:

| phase | baseline | wip |
|---|---|---|
| first-frame render | 1,562 ms | **1,020 ms** |
| texture decode and upload | 955 ms | **805 ms** |
| module evaluation | 2,740 ms | 2,773 ms |
| everything else | 9,960 ms | **16,175 ms** |
| unattributed | 4,992 ms | **10,025 ms** |

Between them the two intended wins are worth ~690 ms against a 10,000 ms criterion.

---

## The risk clause, answered by eye

The brief: *"M3 proves only the SETTLED frame. Whoever runs this must also look at the first
two seconds by eye and say so."*

Looked at, both builds, 6x CPU, filmstrip every 250 ms from navigation
(`scripts/harness/startup-filmstrip.mjs`, artifacts in `.harness-out/startup-filmstrip`).

**There is a regression, and it is the exact shape the brief predicted.** The baseline lifts
its loader onto a finished spiral galaxy. The branch lifts it earlier, onto a sky with
nebulae and stars and **no galaxy at all**; the spiral appears a second or more later.

The cause is structural, not a tuning miss. `Warmup` now signals ready at frame 32, while
`Galaxy` builds its 200,000 points in 20 slices of 10,000, one per `requestAnimationFrame`,
and only attaches its attributes on the last slice. Those two counters are independent, the
galaxy's frames are much more expensive than Warmup's, and nothing makes the reveal wait for
the galaxy. The scene reveals on a frame count that no longer corresponds to the scene being
built.

M3 cannot see this: none of its six views is the galaxy act.

---

## What this leaves

1. **M3's fix is a keeper and is independent of the rest.** It is a correctness fix to a
   loader that would have shipped black planets on the home page.
2. **M1 and M2 need a different lever.** 10,000 ms of blocking is not in first-frame render
   or texture decode - together those are ~2,500 ms and the stage has already taken ~690 ms
   out of them. The brief's two allowed changes cannot reach the target, so either the stage
   gets a new allowance or the target moves. That is the owner's call, not this stage's.
3. **The reveal gate needs to depend on the galaxy**, or the galaxy must not be sliced.
4. **Rule 2 is satisfied for M1, M2 and M3** (see below). M4 remains localhost: `p7-sun`
   needs the debug HUD and the same numbers were signed under P7.

---

## On the alias - 2026-09-14

`mobile-1-wip` was pushed and Vercel built it. Both lanes have a branch alias, so the
before/after pair is alias-to-alias rather than alias-against-localhost:

    baseline  https://elad-portfolio-git-codex-p1-pilot-bobikobis-projects.vercel.app
    after     https://elad-portfolio-git-mobile-1-wip-bobikobis-projects.vercel.app

### M3, signed

    view            floor mean/max     diff mean/max   >1 of 255  verdict
    overview               0.000/0           0.000/0       0.00%  PASS
    about                  0.000/0           0.000/0       0.00%  PASS
    services               0.000/0           0.000/0       0.00%  PASS
    projects               0.000/0           0.000/0       0.00%  PASS
    technologies           0.000/0           0.000/0       0.00%  PASS
    contact                0.000/0           0.000/0       0.00%  PASS

**And the localhost dev capture is byte-identical to the alias capture.** `m1-before`
against `alias-before` - two different machines' worth of difference between them, a dev
bundle against a production one - comes back mean 0.0000, max 0 on all six views. P3 and P7
each reported alias numbers matching localhost; this is the third stage to find it, and the
first to find it at zero rather than at the harness's resolution.

That is worth keeping, because it means the photometry harness can be iterated on localhost
without the alias round trip, and rule 2 costs one confirming run rather than every run.

### M1 and M2, signed and still failing

Preview aliases, 20x CPU, slow 4G, two runs each:

| build | TBT | longest task | tasks >= 50 ms |
|---|---|---|---|
| baseline alias | 10,789 · 10,843 | 1,732 · 1,798 | 59 · 62 |
| wip alias | 11,078 · 10,515 | 1,696 · 1,631 | 88 · 66 |

Medians 10,816 -> 10,797 and 1,765 -> 1,664. The same verdict the local production build
gave, against targets of 5,000 and 600. The deployed numbers also sit within ~6% of the
local production build's, which is the brief's local-equals-deployed claim holding a second
time.

### One harness bug, found by being the first run to point at a vercel.app URL

`mobile-startup.mjs` called `applyBypass(page)` on the guard page, where `page` is assigned
twenty lines later and is `undefined`. Added in `64f4efd` with the bypass support and never
exercised, because until now every run had been against localhost. Fixed in this lane.

Also noted, not fixed: the harness records `build.revision` from the local working tree, so
a run against a remote URL stamps the manifest with whatever is checked out here. The four
alias runs above all say `c168582`. The `base` field is what distinguishes them.

---

## The revert - 2026-09-14, owner approved

Owner approved the recommendation: keep the loader fix, revert the frame-spreading, and
re-brief M1/M2 with a wider allowance.

**Reverted:** `StartupReveal.tsx` (deleted) and every use of it in `SceneRoot` and
`SolarAct`; `Warmup`'s ready signal back from frame 32 to frame 3, and its `useFrame`
priority back to the default; `Galaxy`'s 20-slice construction back to a single `useMemo`.

**Kept:** the bitmap loader and the four call sites that decode off the main thread -
`SolarAct`, `GalaxyNebulae`, `TransitVeils`, `WorldBackdrop`.

### The galaxy comes back, and the reveal is EARLIER than the baseline

Same filmstrip, 6x CPU. The baseline reveals a finished spiral at 7,571 ms; the branch used
to reveal a galaxy-less sky at 5,897 ms; the reverted build reveals **a finished spiral at
5,603 ms**. Better than both on this measure, which is a side effect of the loader and not
of anything aimed at it.

### The loader had its own startup regression, and it was the pre-upload

The first measurement of the reverted build came back WORSE than the baseline recorded three
days earlier. Rather than attribute that, the baseline was rebuilt and re-measured the same
day, on the same machine, in the same session - machine state three days apart is not a
control.

Local production build, 20x, slow 4G, three runs each, all on 2026-09-14:

| build | TBT | longest task |
|---|---|---|
| baseline `64f4efd` | 10,391 · 10,032 · 11,091 | 1,773 · 1,642 · 1,896 |
| loader **with** `gl.initTexture` on every map | 11,201 · 10,979 · 11,820 | **1,943 · 2,007 · 1,942** |
| loader **without** it (shipped) | 10,844 · 10,374 · 10,168 | 1,832 · 1,770 · 1,793 |

The middle row's three runs all sit **above** all three baseline runs on the longest task -
no overlap, which is what makes it a finding rather than noise. `gl.initTexture` forces the
GPU upload synchronously on the main thread for every texture whether or not anything is
about to draw it. Three uploads lazily at first bind, which is what `TextureLoader` did
here before.

Pre-upload is now opt-in and off by default. The one caller that keeps it is `loadHiRes`,
which swaps a map into a live material mid-flight and must not stall - and which
pre-uploaded before this module existed. Every base map did not.

### Where that leaves the shipped branch

| | baseline | shipped | target |
|---|---|---|---|
| M1 TBT (median of 3) | 10,391 | **10,374** | 5,000 |
| M2 longest (median of 3) | 1,773 | **1,793** | 600 |
| M3 | - | **0.0000 / 0, six views** | byte-identical |
| M4 | - | **calls 69/64, tris 167,134/146,549, medians 16.700** | unchanged |

**Moving the decode off the main thread bought nothing measurable.** M1 and M2 are inside
the run-to-run spread of the baseline in both directions. That is the honest result of the
brief's second allowed change, measured on its own with the first one removed, and it is
what the re-brief should start from: neither of the two permitted levers moves this number.

What the branch is now worth is the M3 fix - a loader that would otherwise have shipped
black planets on the home page - at no startup cost.
