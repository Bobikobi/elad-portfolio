# MOBILE-1 brief - stop the scene blocking the main thread at startup

Written 2026-09-10, before any change, per standing rule 1.
Follows the attribution in [MOBILE-STARTUP-open.md](MOBILE-STARTUP-open.md).

## The reproduction, and it is faithful

| what | TBT at 20x CPU throttle | longest task |
|---|---|---|
| deployed site `www.eladsaadon.dev` | 9,949 ms | 1,710 ms |
| **local production build** | **9,824 ms** | **1,660 ms** |

Within 2% of each other, so the work can be done and measured locally without touching
production. 20x is used rather than Lighthouse's 4x because 4x on this laptop gives 1,248 ms
and does not reproduce the failure at all - PageSpeed throttles 4x on top of its own slow
hardware.

## What is actually costing the time

From the trace, not from a guess:

- **one animation frame of 1.66 s**, containing a single `FunctionCall` and 214 ms blocked on
  the GPU command buffer. The scene builds and first-draws in one frame.
- **a second frame of 0.94 s containing 548 ms of image decode.** Textures are decoded on the
  main thread, inside a frame callback.
- two script-evaluation tasks of 1.57 s and 0.96 s, almost entirely microtasks.
- shader compilation: **6.5 ms**. Not the problem, and the obvious first guess.

## Criteria

| # | criterion | how | target |
|---|---|---|---|
| **M1** | the main thread is given back | total blocking time, local production build, 20x, slow 4G | **<= 5,000 ms**, from 9,824 |
| **M2** | no single task owns the thread | longest main-thread task, same run | **<= 600 ms**, from 1,660 |
| **M3** | nothing about the scene changed | `photometry-diff.{mjs,py}` with `FIXEDSTEP=1 FREEZE=1`, six views, before against after | **byte-identical**, mean 0.0000 and max 0 |
| **M4** | the tier law holds | `p7-sun.py` S6: calls, triangles, median frame time, both tiers | unchanged |

M3 is the one that makes this safe. Startup can be restructured freely as long as the settled
frame is the same pixel for pixel, and that instrument already exists and is exact.

## The two changes this stage is allowed to make

1. **Spread the build across frames.** The scene currently constructs and first-draws inside
   one callback. Nothing about the composition requires that.
2. **Move image decode off the main thread.** `createImageBitmap` decodes on a worker thread;
   `Image.decode()` at least keeps it out of the frame callback.

## Out of scope

Not loading the scene at all on small screens, changing what is drawn, reducing quality per
tier, or touching the composition. Those are product decisions and this stage is a
performance repair with a byte-identical acceptance test.

## Risk

The obvious failure is a visible regression that the numbers miss - a flash of empty scene, a
different first paint, an ordering change that leaves a body missing for a second. M3 proves
only the SETTLED frame. Whoever runs this must also look at the first two seconds by eye and
say so.
