# F5 verify - route gating and scene cost

Production baseline: `www.eladsaadon.dev` (master, 15025aa)
Branch: `chore/f4-closeout` @ 26067d5, alias
`elad-portfolio-git-chore-f4-closeout-bobikobis-projects.vercel.app`
Harness: [f5-route-cost.mjs](../../scripts/harness/f5-route-cost.mjs), headed Chrome on a
real GPU, CDP CPU throttle 4x, 6s settle + 6s sample per route, synthetic scroll and
pointer motion so the sample covers motion rather than an idle page.

## DEFECT 1 - the galaxy behind the legal text: FIXED

`/privacy` renders on solid `#0A0612` with no canvas anywhere in the document. Screenshot:
`.harness-out/f5-branch-gov/_privacy.png`. Body text is `#A1A1AA` on that background, ~8.8:1,
which is past AA for body copy with room to spare. No translucent panel was needed - once
the scene is not mounted, the page's own background is already solid.

## DEFECT 2, part one - route gating: FIXED, and it was total

Every route mounted a canvas in production. Not "the gating regressed" - there was no route
gating at all: `CosmicStage` checked the view mode only, and its own comment records the
route half being dropped when the two mount decisions were "unified".

| route | production (before) | branch (after) |
|---|---|---|
| `/`, `/he`, `/ru`, and the 5 world routes | 1 canvas | 1 canvas |
| `/privacy`, `/terms`, `/accessibility` | **1 canvas** | **0** |
| `/guides`, `/services/nextjs-development` | **1 canvas** | **0** |
| 404 | **1 canvas** | **0** |

The content routes went from ~40fps under a 4x throttle to a flat 56-60. That is the single
largest win in this round: those pages were spending a full WebGL frame budget to display
prose.

`sectionForPath()` was deliberately **not** reused for the predicate - it matches on the
first path segment alone, so it calls `/services/nextjs-development` a world. The new
`isImmersiveRoute()` requires exactly one segment and it must be a section.

## DEFECT 2, part two - the cosmic routes: implemented, NOT proven

All four cost items are in: dynamic resolution scaling, base DPR capped to 1.0 outside the
high tier (and the canvas now OPENS at 1 rather than 1.5), Bloom and God Rays at half
resolution, and a 30fps idle throttle. What cannot be claimed is that the acceptance
criterion is met, because **this machine cannot measure it reliably**. Two runs of the same
harness against the same commit, minutes apart:

| route | run A | run B |
|---|---|---|
| `/` | 25.8 | 8.1 |
| `/he` | 34.8 | 8.5 |
| `/contact` | 38.7 | 43.1 |
| `/services` | 49.6 | 40.4 |

The spread between identical runs is larger than any effect being tested. An 8GB box
running a headed GPU browser is the documented limit here, and it is being hit.

What the numbers do say, consistently: **the resolution scaler bottoms out at 0.6 on every
cosmic route and the frame rate does not respond.** If this were fill-bound, 36% of the
pixels would show up. It does not, so it is not fill-bound - which means item 1, the item
expected to be the biggest win, is the wrong lever for this scene.

## What the instrumentation found instead

Read from the live renderer (`?hud=1`, so the fps in that run is HUD-inflated by
`preserveDrawingBuffer` and is not quoted here - only the structure is):

| | `/` | `/about` |
|---|---|---|
| renderer passes per second | ~450 | ~200 |
| draw calls per pass | 4.5 | 2.0 |
| triangles per pass | 502 | 3,155 |
| shader programs | 24 | 50 |

Two to four draw calls per pass is nothing. **The cost is the number of passes**: at ~30fps
that is roughly 15 fullscreen passes per frame, which is the post chain - the Bloom
mipmapBlur chain (two passes per mip level), God Rays and its blur, SMAA, and the merged
tone-map/grade/noise/vignette pass. A V8 CPU profile agrees from the other side: 76% of
samples in `(program)` - browser C++, i.e. GL command submission - 7.5% garbage collector,
and under 4% in application JavaScript. Nothing in our own per-frame code is the problem.

**The next lever is pass count, and it needs a ruling** because the obvious knob touches the
look: Bloom's `levels` controls how many mip steps the glow is built from, so lowering it on
the low tier (say 9 → 6) removes ~6 passes per frame but also tightens the widest halo.
That is a per-tier cost knob of the same family as God Rays `samples` (60 vs 26), which this
codebase already treats as cost rather than composition - but it is a visible difference and
the tier law says the owner decides, not me.

## The two defects the measurement found in my own work

1. **The idle throttle was demoting the quality tier.** The governor reads fps from the
   frame delta, and a page paced to 30fps on purpose is indistinguishable from a machine
   failing to hold 60. Six of eight cosmic routes came back `low` purely for having been
   left alone for 2.5 seconds. The throttle and the tier decision now share one definition
   of idle.
2. **The governor never decided at all on a slow machine.** It waits for 96 frame deltas
   before estimating the refresh rate and governs nothing until then; at the 7-12fps this
   throttled run produced, that is 8-14 seconds away. It now also decides on a deadline,
   and a starved sample set assumes 60Hz rather than concluding "30Hz display" - a target
   a stuttering machine meets, which is how a governor talks itself out of demoting.

After the fix the governor does decide (`hz` comes back 60/72/75 across routes) and does
demote (`low` on several). Whether it demotes *correctly* is part of what the unreliable
frame numbers above cannot yet settle.

## Pass-count round (rulings 1-5), measured @ f95e2ac

Harness: [f5-pass-audit.mjs](../../scripts/harness/f5-pass-audit.mjs). It reads the pass
list off the composer itself (HUD builds publish it) and counts `renderer.render()` calls
against real animation frames. `?tier=low|high` pins the tier so a cost knob can be judged
by eye; ignored in production, like `?hz`.

### Ruling 2 - the reorder: NOTHING TO FIX, and that is the finding

The composer was already merging everything it could:

```text
RenderPass
EffectPass [GodRays + Bloom + ExposureToneMap + HueSaturation + Noise + Vignette]
EffectPass [SMAA]
```

Six effects in ONE pass. SMAA takes its own because it is the convolution effect in the
chain, and convolution effects cannot be merged - not an ordering mistake, a property of
the effect. There is no contiguity to restore and no free win to collect there.

**The cost was one level below the pass list.** Three passes, and yet 21 renders per frame
on home and 27.7 on a world: `mipmapBlur` runs a downsample AND an upsample per mip LEVEL,
inside its own EffectPass. No pass list would ever have shown that, which is exactly why
the audit was worth building before changing anything.

### Renders per frame, before and after

| route | before | after (low) | after (high) |
|---|---|---|---|
| `/` | 21.0 | **13.7** | 22.7 |
| `/about` | 27.7 | **21.0** | 29.1 |

The low tier now costs **35% fewer renders per frame** on home and 24% fewer on a world.
The high tier is deliberately unchanged - every reduction here is a low-tier knob.

Attribution, from the high/low difference of 9 renders on home: Bloom 9 → 6 levels is ~6 of
them (two renders per level), SMAA is ~3. **Bloom levels was two thirds of the win.**

### What landed

| ruling | done | note |
|---|---|---|
| 1. Bloom levels 9 → 6 on low | yes | **there is no mid tier** — `Quality` is `'high' \| 'low'`, so "7 on mid" has nothing to attach to. Implemented 9 / 6. `levels` is a mount-time option, so the tier is now part of the Bloom `key` or a demotion would never take effect. |
| 2. Reorder for contiguity | n/a | already optimal, see above |
| 3. SMAA off on low | yes | **provisional** — see below |
| 4. God rays 26 → 16 samples on low | yes | presence unchanged in every tier |
| 5. DRS floor 0.6 → 0.85, keep the DPR cap | yes | it sat at 0.6 across every cosmic route while the frame rate ignored it |

### Ruling 3 is PROVISIONAL - the crop is not frame-locked

The condition was "drop it if a side-by-side crop shows acceptable edges", and an honest
side-by-side is what could not be produced. The scene animates continuously, so two page
loads land at different camera phases: the before and after crops of `/about` show the same
world from slightly different angles, not the same pixels with and without SMAA. Neither
shows stair-stepping, and Earth's limb is a soft atmospheric gradient — close to the least
informative edge in the scene for this question.

So: no visible aliasing in what was captured, but **not a controlled comparison**. The cost
of being wrong is small and known — SMAA is ~3 renders per frame, about 18% of the low
tier's remaining cost, and Bloom levels already delivered the larger share. If the owner
would rather not spend the risk, putting SMAA back on the low tier costs ~18% and keeps
~80% of this round's win.

## Recommendation

The route gating and the legal-page fix are ready and are worth shipping on their own - they
close a legal-readability defect and remove a whole scene from every content page.

The cosmic-route frame rate needs a measurement environment this machine cannot provide.
Options, owner's call: measure on the owner's own average machine with the harness pointed
at the branch alias, or accept the structural evidence and rule on the Bloom `levels`
question so the pass count comes down before the next measurement.

**Update after the pass-count round.** The `levels` ruling landed and is measured above:
renders per frame are down 35% on the low tier. What is still true is that the *frame rate*
consequence cannot be measured here — the render count is a stable, repeatable number on
this machine and the fps is not. The remaining verification is one run of
[f5-route-cost.mjs](../../scripts/harness/f5-route-cost.mjs) from the owner's own machine
against the branch alias, which is also the machine that reported the stutter.
