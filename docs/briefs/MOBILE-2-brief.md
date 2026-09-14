# MOBILE-2 brief - the startup cost, aimed at where it actually is

Written 2026-09-14, before any change, per standing rule 1.
**Criteria PROPOSED, not approved. No code until the owner signs the table in "Criteria".**

Follows [MOBILE-1-brief.md](MOBILE-1-brief.md) / [MOBILE-1-verify.md](MOBILE-1-verify.md),
which did not close. MOBILE-1 shipped one thing - a loader correctness fix - and proved that
neither of the two changes it was allowed to make can reach its targets.

## Why MOBILE-1 did not close, in numbers

| | baseline | MOBILE-1 shipped | target |
|---|---|---|---|
| M1 total blocking time | 10,391 ms | 10,374 ms | 5,000 |
| M2 longest task | 1,773 ms | 1,793 ms | 600 |

Both changes were measured on their own. Spreading the build across frames moved the work
into half again as many tasks without reducing it, added ~10 s of busy main-thread time and
lifted the loader onto a galaxy that had not been built yet. Moving the decode off the main
thread landed inside the baseline's own run-to-run spread in both directions.

**MOBILE-1's allowance covered about 12% of the cost.** First-frame render (1,495 ms) plus
texture decode and upload (992 ms) is 2,487 ms of a 20,104 ms main thread. Removing both
entirely could not halve TBT.

## Where the time is, measured

Local production build, 20x CPU, slow 4G, Moto G Power profile, `mobile-startup.{mjs,py}`,
tag `base914-b`. Total main-thread time 20,104 ms:

| phase | ms | % |
|---|---|---|
| **unattributed** | **5,059** | **25.2%** |
| module evaluation | 2,675 | 13.3% |
| first-frame render | 1,495 | 7.4% |
| texture decode and upload | 992 | 4.9% |
| geometry and buffer construction | 78 | 0.4% |
| shader compile/link | 27 | 0.1% |
| everything else | 9,779 | 48.6% |

Named sources worth seeing, from the same run:

| source | ms |
|---|---|
| turbopack chunk loader `W` | 1,990 |
| `[browser] UpdateLayoutTree` | 979 |
| `[WebGL] texSubImage2D` | 864 |
| `[browser] Layerize` · `PrePaint` · `Layout` | 538 · 373 · 294 |

DOM layout and paint together are **2,184 ms, about 11%**, and none of it is the 3D scene.

### What the two tasks that own M2 actually contain

This is the part MOBILE-1 never had, and it is why its allowance was aimed wrong.

**Longest task, 1,642 ms - one animation frame.** Inside it:

    1,615 ms   FireAnimationFrame x3 -> FunctionCall x4
      217 ms   blocking waits on the GPU command buffer, x46
               (WaitForCmd / CommandBufferHelper::Finish / WaitForGetOffset are the same
                46 waits seen at three nesting levels, not three separate costs)
      127 ms   GLES2Implementation::GetProgramiv  x107
       82 ms   GLES2Implementation::GetShaderiv   x22

107 synchronous program-status queries and 46 command-buffer waits in a single frame is
`Warmup`'s `gl.compile(scene, camera)`. **The compile is not the cost - the project already
measured that at 6.5 ms, and this run's whole shader compile/link phase is 27 ms. The cost
is the synchronous round trip to the GPU process to ask whether each program linked.**
~426 ms of that frame is identified this way. The remaining ~1.2 s is JavaScript the profile
places inside the frame callbacks and the phase table cannot name - i.e. it is part of the
25% hole.

**Second task, 1,598 ms - not the scene at all.**

    1,592 ms   EvaluateScript
    1,541 ms     RunMicrotasks
       48 ms     v8.compile

Bundle evaluation and hydration.

## The first thing this stage does is not a fix

**A quarter of the main thread has no name.** `unattributed` at 5,059 ms is the single
largest item in the table, larger than any phase, and the harness is right to refuse to
donate it to one. Choosing a lever against a 75% picture is how the previous stage spent
itself on 12% of the cost.

So step one is instrument work with no pixels and no product change: attribute the 5,059 ms,
and attribute the ~1.2 s of unnamed JavaScript inside the longest frame. Only then is the
target in the criteria below defensible.

This is the same order the project already used once, in `MOBILE-STARTUP-open.md`: *"Measure
where the time actually goes ... and write it down before touching anything. Guessing between
them is how three rounds get spent on the wrong one."* That instruction was followed to the
attribution MOBILE-1 had; it now has to be followed one level deeper.

## Criteria - PROPOSED, and two of them need a decision before they mean anything

| # | criterion | how | target |
|---|---|---|---|
| **N0** | the thread is accounted for | `mobile-startup.py`, same run | **unattributed <= 10%** of total main-thread time, from 25.2% |
| **N1** | no single task owns the thread | longest top-level `CrRendererMain` task, 20x, local prod, median of 3 | **see "the M2 question" below** |
| **N2** | the main thread is given back | total blocking time, same runs | **see below** |
| **N3** | nothing about the settled scene changed | `photometry-diff.{mjs,py}`, `FIXEDSTEP=1 FREEZE=1`, six views | **mean 0.0000, max 0** - inherited from M3 unchanged |
| **N4** | the tier law | `p7-sun.py` S6, both tiers | calls, triangles, median frame time unchanged |
| **N5** | the scene is whole when it is revealed | `startup-filmstrip.mjs`, 6x, both builds | at the frame the loader lifts, **every body and the galaxy are present** - no frame between reveal and settle is missing an object that is present in the settled frame |

**N5 exists because MOBILE-1's numbers all passed while the hero frame lost its galaxy.**
Per the megaplan's own rule, a stage that changes pixels carries at least one criterion
saying what should be TRUE of the result rather than only what must not get worse. This is
that criterion, and it is the one MOBILE-1 failed by eye with four numbers green.

### The M2 question the owner has to answer

**600 ms may not be reachable inside the current scope.** The two largest tasks are ~1.6 s
each. The identified, removable part of the first is ~426 ms of GPU round-trips; the second
is bundle evaluation, which is not the scene. Getting any single task under 600 ms means
breaking up roughly 1.2 s of scene-construction JavaScript in one frame - and MOBILE-1 tried
exactly that, moved M2 by 8%, and broke the reveal.

Three honest options, and this stage needs one chosen rather than inherited:

1. **Keep 600 ms and widen the allowance** to include what is drawn at startup on a small
   screen - fewer stars, a smaller galaxy point count, deferring the solar act. MOBILE-1 put
   these out of scope as product decisions. They are the only levers with enough mass.
2. **Move the target** to something the current scope can reach - on the evidence above,
   ~1,200 ms for the longest task and ~8,000 ms TBT, and say out loud that the phone still
   loses a second and a bit to one frame.
3. **Declare the phone out of scope** for the 3D scene and serve it the classic view, which
   `F2` already built. This is the largest change and the only one that makes the numbers
   good rather than better.

I recommend deciding this **after N0**, not now - the 25% hole is big enough to change which
option is right.

## The allowance, if the criteria are approved

Wider than MOBILE-1's, and named rather than open:

1. **`gl.compile` -> `gl.compileAsync`.** three r185 ships it and `KHR_parallel_shader_compile`;
   both are present in the installed bundle. This is the one change the evidence already
   justifies without further measurement, and it targets the 426 ms directly.
2. **Instrumentation** anywhere, freely - N0 is the point of the stage.
3. **Bundle-level work** on the 1,592 ms evaluation task: splitting, deferring the scene
   import behind the first paint.
4. Anything the owner opens up by choosing option 1 above.

## Out of scope

Changing the composition, the tone chain, or any photometry constant. N3 is the guard and it
is exact. The galaxy act's slicing is not to be reintroduced without N5 measured on it.

## Risk

The failure mode this stage has to avoid is MOBILE-1's: a change that moves work around
rather than removing it, passes every guard, and costs something nobody measured. N0 and N5
are both there for that, and neither existed before.
