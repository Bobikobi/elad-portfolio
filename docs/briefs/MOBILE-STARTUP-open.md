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
