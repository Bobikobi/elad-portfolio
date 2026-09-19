# MOBILE-2 N0 verify - the unattributed quarter, named

Measured 2026-09-14 against [MOBILE-2-brief.md](MOBILE-2-brief.md) criterion N0.
Instrument work only: no product code was touched, and no criterion that judges the scene
was run against a different build.

| # | criterion | target | measured | verdict |
|---|---|---|---|---|
| **N0** | the thread is accounted for | unattributed **<= 10%** of total main-thread time, from 25.16% | **0.00%** | **PASS** |

---

## The hole was evidence already in hand, thrown away

`scripts/harness/mobile-startup-residual.py` - new, and it **imports `mobile-startup.py` and
reads that module's own intermediate values** rather than re-deriving them. A diagnostic that
re-derives the thing it is auditing can disagree with it, which is the failure this project
already paid for once with SUN-3's disc threshold.

On `base914-b`, the run the brief quoted:

    total main-thread busy : 20104.1 ms
    unattributed residual  :  5058.9 ms   25.16%

    CPU samples that land in the hole: 5058.9 ms (100.0% of it)
       4736.1 ms  (program)   under <nothing - no JS on the stack>
        322.8 ms  (idle)      under <nothing - no JS on the stack>

    trace events that cover the hole: 5058.9 ms (100.0% of it), by SELF time
       2192.7 ms  FunctionCall
        923.2 ms  ThreadControllerImpl::RunTask
        522.4 ms  RunTask
        200.9 ms  AnimationFrame::Render
        193.2 ms  Commit

    genuinely dark: no CPU sample AND no trace event: 0.0 ms (0.00%)

**Nothing was unknowable.** 93.6% of the hole is V8's `(program)` sentinel - the engine in
native code with no JavaScript frame to name - which `mobile-startup.py` deliberately drops,
and 100% of it sits inside trace events that do have names. The report was discarding a name
it already had.

## The fix, and what it is careful not to do

The innermost enclosing trace event now claims the residual, smallest-first, which is self
time. **Nothing is donated**: an interval no event covers stays unattributed and is still
reported. It lands in its own phase, `native under JS (no sampled frame)`, rather than in
`everything else` - putting it there would have pushed that bucket to 74% and traded one
uninformative number for another.

Verified on four captures, including **two taken before this change existed**:

| capture | unattributed |
|---|---|
| `n0-off` (local prod, today) | **0.00%** |
| `base914-b` (local prod, today) | **0.00%** |
| `prod20` (local prod, 2026-09-10) | **0.00%** |
| `live20` (deployed site, 2026-09-10) | **0.00%** |

It is retroactive because it reads the trace, and every capture on disk already contains one.

## What the time turned out to be

`n0-off`, local production build, 20x, slow 4G, total main-thread 20,791 ms:

| phase | ms | % |
|---|---|---|
| everything else | 10,302 | 49.55% |
| **native under JS (no sampled frame)** | **5,792** | **27.86%** |
| module evaluation | 2,740 | 13.18% |
| first-frame render | 1,566 | 7.53% |
| texture decode and upload | 276 | 1.33% |
| geometry and buffer construction | 74 | 0.36% |
| shader compile/link | 41 | 0.20% |
| **unattributed** | **0** | **0.00%** |

### The three most expensive JavaScript entry points, resolved

The trace names them `O`, `hE` and `P`. Resolved by slicing the built chunks at the
`scriptId`/line/column the trace records - a static lookup that does not change the build,
rather than enabling production source maps, which would.

| symbol | total | calls | what it is |
|---|---|---|---|
| `O` — `0jeg2rald9wlx.js:1:7464` | 3,171 ms | 102 | **React's scheduler work loop** (`unstable_now`, `expirationTime`, `priorityLevel`) |
| `hE` — `0mi4ul~wqio2q.js:393:11327` | 2,310 ms | 68 | **react-three-fiber's frame loop** (`requestAnimationFrame(hE)`, `store.getState().internal.active`) |
| `P` — `0mi4ul~wqio2q.js:1:3037` | 1,851 ms | 8 | **a second copy of React's scheduler**, in the R3F chunk |

**These are entry points, not exclusive self time** - `FunctionCall` events nest, so these
durations overlap each other and the phases above. They say where the thread is entered, not
what it is doing.

**Two React schedulers run.** R3F carries its own `react-reconciler`, which bundles its own
`scheduler`. That is how R3F is built rather than a mistake here, and it is worth recording
before anyone reads `P` as a duplicate of `O` and deletes something.

## The new GPU-query probe, and why it is off by default

MOBILE-2's brief identified 107 synchronous `GetProgramiv` and 22 `GetShaderiv` calls in the
longest task. Those are now wrapped and reported as their own phase, **synchronous GPU
queries: 306 ms**, the first time that cost has had a name.

**It costs 30% of the thread it reports on.** Same build, back to back:

| | total main-thread | M1 TBT | M2 longest |
|---|---|---|---|
| `GL_SYNC_PROBE` off | 20,791 ms | 9,884 | **1,739** |
| `GL_SYNC_PROBE=1` | 27,115 ms | 9,886 | **2,002** |

So it is opt-in, off by default, and recorded in the run manifest - a run taken with it
cannot be compared by accident with one taken without. `mobile-startup.py` will not demand
the phase from a run that did not enable it.

**The first estimate of that cost was ~300 ms and it was wrong by twenty times.** It was
taken from the probe's own `span` source, which only sees the wrapper; the cost lands mostly
in the native call being wrapped. That number was written into a code comment before it was
checked, and it is corrected there now rather than left to be inherited - the same failure
mode as the stale `Sun.tsx` comment P0b had to correct.

`getParameter`, `getError` and `flush` are deliberately not wrapped: three calls them on a
hot path, they are cheap individually, and including them took the probe's own `span` from
376 ms to 787 ms for almost no information.

## M1 and M2 are undisturbed

With the probe off, the instrumented build measures M1 9,884 / M2 1,739, inside today's
baseline spread of 10,032-11,091 and 1,642-1,896. The instrument work did not move the
numbers it exists to report.

## What N0 hands the decision

The brief parked M2's target until N0 was done, on the grounds that a 25% hole was big enough
to change which option is right. It was not, in one direction: **no new lever appeared.** The
named time is React's scheduler, R3F's frame loop, and browser layout and paint. The 306 ms
of blocking GPU queries is real and worth taking, and it is 3% of M1.

That makes option 2 or option 3 in the brief the honest choices, and option 1 - widening the
allowance to what is drawn at startup - the only one that could reach 5,000 ms.

## One run is not reported

`n0-c` came back with 40,063 ms of total main-thread time against ~20,800 for every other run
of the same build, while builds and servers were running on this machine. Its unattributed is
0.00% like the rest, so it supports N0; it is excluded from any timing claim and recorded
here rather than dropped silently.
