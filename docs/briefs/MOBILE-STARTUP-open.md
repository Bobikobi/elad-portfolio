# Open, deferred by the owner: the live site is barely usable on a phone

Recorded 2026-08-17 from a PageSpeed Insights run on **production**
(`https://www.eladsaadon.dev/`), not on any working branch. Deferred the same day: the
owner ruled that reaching the visual target comes first and speed after it. This file
exists so the finding is not rediscovered from scratch later.

## What was measured

| metric | mobile |
|---|---|
| Performance score | **32** / 100 |
| Total Blocking Time | **29,260 ms** |
| Main-thread work | 39.3 s |
| Time to Interactive | 42.0 s |
| First Contentful Paint | 4.4 s |
| Largest Contentful Paint | 5.9 s |
| Speed Index | 9.3 s |
| Long tasks | 20 |
| Accessibility · Best Practices · SEO | **100 · 100 · 100** |

Emulated Moto G Power, slow 4G throttling, Lighthouse 13.4.1, single cold page load.

## What it means in one line

Something appears after 4.4 seconds, and then the page ignores the visitor for about half
a minute. Everything that is not the 3D scene is already perfect, so the whole cost is the
scene's startup: building the bodies, compiling shaders, decoding textures - all on the
same thread that would otherwise answer a tap.

## The blind spot this exposes in the photometry plan

The plan's **tier law** checks the cost of ONE FRAME once everything is already running -
draw calls, triangles, median frame time. Nothing in this project has ever measured what
STARTUP costs. A scene can satisfy the tier law completely and still block a phone for
thirty seconds before the first frame the law is measuring.

That is the same shape as the plan's other finding about criteria being guards rather than
goals: the instrument answers a real question, and it is not the question a visitor cares
about.

---

## MEASURED 2026-09-10 - the attribution exists now, and the first finding is about the instrument

**PageSpeed's number cannot be reproduced on this machine at Lighthouse's own settings.**
Measured with a local harness (`scripts/harness/mobile-startup.{mjs,py}`) emulating a Moto G
Power at 412x915 DPR 2.6, CPU throttled 4x, slow 4G:

| what was measured | total blocking time |
|---|---|
| PageSpeed, deployed site | **29,260 ms** |
| this harness, deployed site, 4x | **1,248 ms** |
| this harness, local production build, 4x | 1,385 ms |
| this harness, local dev build, 4x | 2,054 ms |

The deployed site and a local production build measure the same, so **the deployment is not
the problem**. The 23x gap is the hardware: PageSpeed throttles 4x on top of its own slow
machine, while 4x on an i5-13420H is still a fast device. Reproducing the failure needs a
harsher rate, and at **20x** the deployed site gives **9,949 ms** of blocking with 42 tasks
over 50 ms, the longest 1,710 ms. That is the reproduction to work against.

### Where the time actually goes

From the 20x trace of the live site, the six longest main-thread tasks and the whole-trace
totals both point at the same thing - **synchronous JavaScript in animation frames and in
script evaluation**, not at shader compilation, which barely registers.

| the longest tasks | what is inside |
|---|---|
| **1,710 ms** | one `FireAnimationFrame` -> `FunctionCall`, including 214 ms blocked on the GPU command buffer |
| **1,661 ms** | one `FunctionCall`, with a major GC inside it |
| **1,556 ms** | `EvaluateScript`, of which 1,495 ms is microtasks |
| **953 ms** | `EvaluateScript` again, 917 ms of microtasks |
| **935 ms** | a frame callback containing **548 ms of image decoding** |

Whole-trace totals: `FunctionCall` 11.0 s, `FireAnimationFrame` 6.0 s, `EvaluateScript`
2.7 s, `RunMicrotasks` 2.8 s, `UpdateLayoutTree` 970 ms, `Decode Image` 566 ms.

### Two things that are specific enough to act on

1. **One animation frame costs 1.7 seconds.** The scene builds in a single frame instead of
   spreading the work, so the main thread is unavailable for that entire time.
2. **Image decoding runs inside a frame callback** - 548 ms of it. Decoding belongs off the
   main thread, before the texture is needed.

Shader compilation, the obvious suspect, measured **6.5 ms**. It is not the problem, and
guessing would have sent the first round at it.

## What to do when this is picked up - do not start by fixing

1. Measure where the 39 seconds actually go, on a throttled profile, and write it down
   before touching anything. The candidates are shader compilation, geometry generation,
   texture decode, and first-frame composition - and guessing between them is how three
   rounds get spent on the wrong one.
2. Only then decide. The interesting questions are whether the scene should start at all
   before the visitor asks for it on a small screen, and whether the work can be moved off
   the main thread or spread across frames.
3. Lighthouse's mobile profile is deliberately harsher than a real phone. Real devices will
   be better - but 29 seconds is extreme even after that discount, so it is not an artifact.
