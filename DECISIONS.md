# Decisions log

What was tried on this site, what was chosen, what failed and why - so the same
mistake is not made twice, by a person or by any model working on the repo.

**Read this before proposing an approach.** If a heading matches what you are about
to try, read the entry first.

Format: `## YYYY-MM-DD <status> <title>`, status ✅ chosen · ❌ failed · ⏸ superseded ·
🔁 worth retrying. Body: what was tried · result with evidence · why (proven /
hypothesis) · **retry when** · link. An abandoned branch is tagged
`attempt/<yyyy-mm>-<topic>` before deletion and the entry points to it. Newest last.

`Retry when` is written for abandoned approaches; an entry that records a defect does
not need one. A ❌ entry whose defect reached production gets a `Shipped:` line - live
from/to, what visitors saw, and the check that now catches it (`unknown` is allowed,
blank is not). Entries up to 2026-09-29 were backfilled from working notes and do not
name the model; later entries do.

---

## 2026-07-21 ⏸ Scroll-scrubbed image-sequence tunnel as the homepage
- Tried: canvas frame sequence (frames from a generated video) flying forward on
  scroll, sections revealed in clip-path windows.
- Superseded the same week by a live React Three Fiber solar system, then by the
  full cosmic WebGL scene. Kept: the idea that the site is an experience, not a
  one-pager.

## 2026-07-21 ❌ backdrop-filter / animated blur over the repainting canvas
- Result: visible lag ("LAGGY") on every frame the canvas repaints.
- Why (proven): the blur re-samples the canvas each frame.
- Instead: crossfade with opacity/transform only.
- Retry when: never over a live canvas.

## 2026-07-21 ❌ framer-motion `useTransform` off `useScroll({ target })`
- Result: the `change` event fired but the DOM did not re-render (framer-motion 12 +
  Next 16 + React 19). `position: sticky` is also broken by the global
  `body { overflow-x: hidden }`.
- Instead: `useMotionValue` + `.set()` inside `useMotionValueEvent`; stage pinned
  manually (`usePinMode`).
- Retry when: framer-motion major upgrade - re-test in isolation first.

## 2026-07-26 ❌ Clamping the frame delta in CameraRig to 1/30
- Result: slow clients (software renderer, ~1fps) saw a different composition - far
  framing, sun 14-18% of frame instead of ~38%.
- Why (proven): every `damp()` converged per frame instead of per second, so the
  arrival dolly took about a minute.
- Instead: real delta; quality tiers scale cost only, never composition. Commit ae550a4.
- Lesson: throttling the CPU from DevTools does not slow the GPU render loop; force
  low FPS with a busy-looping rAF.
- Retry when: never. Any per-frame easing uses real delta.

## 2026-07-28 ❌ Treating a commit message as proof that an item is done
- Result: round R5 was reported complete; verifying on the deployed preview found five
  live defects, four in the features it claimed to fix: a new component imported under
  the old path (two files with the same name in sibling folders), an auto-scroll that
  parked visitors at 0.25 coverage, a counter-rotation that cancelled the Moon's tidal
  lock, chat returning 403 on every preview host, and hover hysteresis released by
  `pointerout` with no `pointermove`.
- Why: every one type-checks and reads correctly; none is wired to reality.
- Instead: an item is done only when measured on the deployed preview (runtime probes
  under the HUD gate). Fixes: de38fcc, 6056db6, e725377, 13c6dbc.
- Shipped: unknown - found on the branch preview and fixed the same day; whether it
  reached production first is not recorded.

## 2026-07-29 ❌ Tone mapping set on the renderer while EffectComposer is active
- Result: tone mapping never ran for the whole cosmic build. Sweeping exposure
  1.0 → 0.12 moved Jupiter's luminance by under 6%, in the wrong direction.
- Why (proven): the composer sets `NoToneMapping`, and three applies material tone
  mapping only when drawing to the default framebuffer.
- Instead: `scene/ExposureToneMap.tsx`, an ACES effect after bloom that reads
  `renderer.toneMappingExposure`.
- Consequence: every constant tuned before this was tuned against a clipped image.

## 2026-07-29 ❌ `onBeforeCompile` without `customProgramCacheKey`
- Result: the sprite feather was dead code for a whole deploy.
- Why (proven): three caches programs by material parameters; an identical sibling
  material won the cache.
- Instead: always ship the pair (`featherSpriteProps`).

## 2026-07-29 ❌ Measuring instruments that measured something else
- HUD corner luminance: a 4×4 scratch canvas read as 10×10 - 84% of pixels were
  transparent black. Every corner number it printed was fiction.
- Eclipse rate sampled from a damped value - 3-5× too high. Publish the raw per-frame
  value for rates.
- Seam detector on row/column brightness means flagged the sun's limb. Use the fraction
  of sky columns sharing a gradient.
- Lesson: prove the instrument on unchanged code before trusting a delta.

## 2026-07-29 ❌ `gl.compile()` right after the act swap to pre-warm shaders
- Result: the stall doubled, 984 → 1926ms. Reverted.
- Instead: the curtain holds for REVEAL_FRAMES drawn frames after the swap.
- Retry when: shaders can compile without blocking the frame (three's `compileAsync`
  with KHR_parallel_shader_compile) - measure the stall again before keeping it.

## 2026-07-29 ❌ Orbital inclination alone to make eclipses rarer
- Result: duty cycle 45.9% → 38.3% only.
- Why (proven): the centrality gate was wider than the vertical spread the tilt buys.
- Instead: inclination 1.5-4° plus a gate of `0.28·rA + 0.09·rB` → 8.8% any body.

## 2026-07-29 ❌ Compressing Uranus/Neptune orbits to keep them in frame
- Result: 34.4% → 35.6% - barely moved.
- Why (proven): the overview camera sits inside the system.
- Instead: an off-frame world left a hoverable rim marker (`reachable()`). ⏸ Superseded 2026-09-27: Elad removed the marker (an unlabeled dot pinned in a corner read as a bug). Now the pointer reaches a body only while part of its disc is in frame, and the keyboard keeps a visually hidden button per body (`PlanetLabels.tsx`). Do not bring the rim marker back.
- Retry when: the overview camera moves outside the system (a composition change).

## 2026-07-29 ❌ Side-effect-only `import` to capture the entry route
- Result: four worlds worked, the fifth replayed the dive, from identical code.
- Why: a bundler may drop or defer a side-effect import.
- Instead: an explicit call from an effect in CosmicStage (`lib/entryRoute`).

## 2026-07-30 ❌ Raising the lit-fraction target on every world
- Result: Mars frame clipping 0.32% → 4.19%, red channel only.
- Why (proven): more lit pulls the sub-solar point into open view. Exposure is the wrong
  lever (a 14% cut moved it 14%).
- Instead: scope a vantage ruling to the world it names (Saturn only).
- Retry when: never globally; per world, with clipping measured per channel.

## 2026-07-30 ❌ Saturn vantage: pick the higher solution each frame
- Result: 106° camera teleport when the two solutions cross; letting the solve pick the
  ring-plane side cost another 76° jump twice a revolution.
- Instead: track the branch and fix the side; simulate a full revolution, not a still.
  Final worst camera step 0.3°.

## 2026-07-30 ❌ Checks expressed in the wrong unit
- Result: three checks accused correct code - a per-sample coverage delta (a frame-rate
  test), a frame floor counting sampler samples instead of drawn frames, and settle
  times in ms for things counted in frames.
- Also: the reported cause of the curtain bug (the fall-rate limiter) was wrong; the
  real one was the REVEAL_FRAMES hold (133ms at 60fps, ~19s under SwiftShader), found
  only by reproducing at 0.6fps first.
- Also tried: an asymmetric EMA to detect a slow client - needed ~150 frames (~19s).
  Instead: median of the last 12 frames.
- Lesson: a reported diagnosis is a hypothesis. A/B against the previous deployment
  before blaming the change (the sweep showed 6 failures; the old build showed 9).

## 2026-07-30 ❌ Seeding our own `Math.random()` calls for reproducible scenes
- Result: drei `<Stars>` (13000 points) still rolled fresh on every load.
- Why: third-party randomness is invisible to lint and review; only measuring the
  output found it.

## 2026-09-19 ❌ Hard N·L for the specular to kill limb flashes
- Result: the white blobs went away but the whole sunlit hemisphere re-lit.
- Why (proven): the soft N·L patch keeps irradiance past the terminator while GGX's
  visibility term explodes on silhouette pixels (~5e5).
- Instead: gate the specular with `smoothstep(0, 0.05, dot(N, L))`, keep soft N·L for
  diffuse. Big flashes 46 → 0. PR #38.
- Retry when: never - hard N·L re-lights the sunlit hemisphere by construction.
- Shipped: the white blobs were live from at least 2026-08-11 (first report) to
  2026-09-19 (PR #38). Missed because the flicker check sampled every 450 ms and never
  saw a one-frame event. Caught now by `scripts/harness/edge-flash.mjs` (real-time
  screencast), run by hand - not in CI.
- Lesson: the first acceptance bar was derived from a flash count that was mostly
  4-pixel star sparkles - the same before and after.

## 2026-09-19 ❌ Passage criteria without duration or direction (CROSSING v1)
- Result: shipped with 37% of the scroll near-black and a stuck return path. PR #39.
- Why: criteria measured brightness, jumps and colour - never duration, both
  directions, or one-frame blanks. The fixed-step harness could not see a canvas blank
  from a resize on idle.
- Instead: v2 #40 (gate re-snap guard), v3 #41 (camera a pure function of scroll,
  star-streak curtain). Passage briefs now require duration + both directions + a
  real-time wheel run + a down/up contact sheet.
- Shipped: live 2026-09-19 (PR #39) to 2026-09-26 (#40/#41) - 7 days of a black
  stretch for every visitor who scrolled. Caught now by the brief requirements above,
  by hand - no script yet.

## 2026-09-26 ❌ Stacking PRs of unapproved visual tuning
- Result: 12 open, stacked PRs; the 37% black stretch sat in production for 7 days
  while its fixes waited among them.
- Instead: production repair first; at most one change awaiting review and one in
  progress; the preview reviewed is exactly what merges.

## 2026-09-29 ❌ Phone-tilt parallax as camera turn + slide (orbit feel)
Tried: tilt slid the camera 0.0125/deg and turned it 0.06 deg/deg (PR #67). Result: the focused planet stayed pinned and the scene swung around it - read as an orbit; Elad rejected it on the phone. Why: rotating about the view keeps the look target fixed on screen (proven by geometry). Retry when: never for "window" feel; only if an orbit/360 look is wanted. Model: opus. Link: PR #67, replaced by PR #68.

## 2026-09-29 ✅ Window parallax: off-axis projection scaled by the focused body's depth
Chosen: camera slides (no rotation) + setViewOffset keeps a window at 0.6x the focused body's depth fixed. First scaling by the camera-to-look distance failed: bodies sit at 0.73x-1.48x of it, so Earth moved 0.3% of width and Saturn's stars/planet ratio fell to 1.44. Scaling by the body's own depth gives 5.4% width / 2.50x at all 5 stops. Gotcha: setViewOffset overwrites cam.aspect with fullWidth/fullHeight - pass (aspect, 1). Retry when: new tour poses change body depths (re-measure via window.__win). Model: opus. Link: PR #68.

## 2026-10-01 ❌ Sun fibrils finer than the render can carry (scale 44 + a 1.7x octave)
Tried: H-alpha fibril layer at 44 cycles/radius plus a finer second octave (#73). Result: Elad saw "flickering dots" near the limb; high-pass frame diff at 0.8-0.9R went 2.47 -> 4.79, 0.9-0.97R 3.06 -> 5.34. Why (proven): the scene was drawing at dpr 1 (the Canvas-prop reset below kept every page at 1 after its first act change), the sun is ~350 render px across, so those features are sub-pixel and alias as they move. A plain footprint fade at that scale killed the layer (fine contrast 0.041); scale 30 left the outer ring dead-smooth. Retry when: the render resolution of the sun roughly doubles (dpr>1 or a closer framing). Model: opus. Link: commit 094fe34.

## 2026-10-01 ✅ Sun fibrils at scale 36 with an fwidth footprint fade; breath x1.5
Chosen: each fibril/fire octave fades to its mean once its screen footprint drops under ~2 px; the flicker at 0.9-0.97R ended below baseline (3.07 -> 1.27). Two of the six added noise taps cut (core boost back on the shared fire term, fibril warp 2D) because desktop-high dropped frames went 2.8% -> 5.0%; after the cut 3.3% vs 3.2% baseline. The fine surface stopped pulsing the bloom, so the slow breath (disc + corona) was scaled 1.5x to restore halo motion (annulus diff f30 2.68 -> 2.82). Retry when: a GPU timer is available to cost each tap directly. Model: opus. Link: commit 3ea7e1d, issue #73.

## 2026-10-01 ❌ Phone-only fine fibril octave gated on its own footprint (FIB_FINE 2.9)
Tried: a third ridged octave (2.9x) that takes over where `2.9*fwidth(fbq)` < 0.3-0.5, meant to fire only on phones. Result: mobile metrics identical to before to three digits (spectrum peak 2.65 %D, fine contrast 0.126). Why (proven): the phone was drawing at 1x (canvas 390x844 with __perf.dpr 2, see next entry), so its footprint matched a laptop's and the gate never opened; it was also set too tight even for 2x (needs fw < 0.1). Retry when: n/a - replaced by a gate on the base footprint (on below fw 0.17, off above 0.27). Model: opus. Link: commits 028b319, c1fcefb.

## 2026-10-01 ✅ The pixel ratio follows the scaler, not a constant `<Canvas dpr={1}>`
Found: R3F 9.6.1 re-applies the Canvas `dpr` prop on every render of SceneRoot (act or tier change). With a constant 1 there, every page dropped to dpr 1 at its first act change and stayed there; the scaler only re-applied on a scale step and __perf reported its own last value. Measured on the preview at 390x844: canvas 390x844 while __perf.dpr = 2 (PR #67's "sharp mobile" never held past the galaxy). Fix: Canvas gets the scaler's live ratio, the scaler compares to the live viewport dpr and re-asserts each eval, __perf reports the live value. After: mobile 780x1688, autocorr half-width 1.11 -> 0.69 %D; mobile dropped frames 9.5% -> 7.7% (laptop emulation, noise); desktop 4.2% -> 4.5%. Retry when: n/a. Model: opus. Link: commit a9213b6, PR #79.

## 2026-10-01 ✅ Sun limb measured on the sun-to-camera axis, with a wider reach (LIMB_REACH 100)
Found: limb used ndv against the view axis (0,0,1), so the sun reshaded as the camera turned. In the mobile tour (camera 2R away, turned from the sun) the sliver at the screen edge read ndv -0.2..0.1 (geometry probe) and drew as the darkest, fibril-free limb ("that side looks sparse"); the phone's sun view sat below mid-screen, which swung its top limb ~19 deg wider - the edge Elad preferred over the laptop's. Chosen: ndv on the sun-to-camera axis, limb = cos(t * 100 deg) with t the fraction of the way to the silhouette, easing to plain ndv when R/d > 0.3-0.45 (close-up). Local build: tour sliver mean luma 13 -> 79, texture amplitude 6.3 -> 13.2; desktop disc mean 185.7 -> 167.1 (intended, wider dark band), flicker 0.8-0.9R 2.83 -> 3.06, 0.9-0.97R 1.90 -> 1.71. Tried first: a footprint gate letting fibrils run to 0.99R - no effect (tour sliver texture 0.281 -> 0.273), because the foreshortened footprint at the limb is large even on a huge sun. Retry when: n/a. Model: opus. Link: PR #79.

## 2026-10-01 ✅ Both acts and the post chain stay resident across the galaxy→solar swap (#82)
Measured (preview, desktop): the swap frame mounted the solar act and rebuilt the composer - frames of 111ms (React mount, no GL), 194ms (127ms shader compile), 63ms, 63ms. Chosen: both acts mounted behind visibility groups; Warmup compiles the whole scene with both acts shown (compiling a group plus the scene counts its lights twice - r185 source, GPT flagged it too) and draws them once behind the loader; God Rays stay mounted at zero weight; Bloom values through live setters. Hidden planets still catch the raycaster, so their handlers check the act. Cost: the solar textures now download at load. Retry when: n/a. Model: opus. Link: commit f37918a, issue #82.

## 2026-10-01 ✅ Streamed-in textures upload one a frame before first use (#82)
After resident acts, every forward run still spent ~118-130ms uploading solar maps on the swap frame: they finish downloading after the warm draw and three uploads at first bind. Chosen: after the ready signal Warmup rescans every 30 frames for textures whose GPU version lags (`properties.__version !== version`) and calls initTexture on one per frame. After: swap frame 43ms, 0 upload. Retry when: textures move to KTX2/compressed (upload cost changes). Model: opus. Link: commit 107d73d.

## 2026-10-01 ✅ Curtain reveal hold 8→2 frames, fade 0.25→0.2s, passage hold margin 0.3→0.5 (#82)
With the swap stall gone, the reveal latch (8 drawn frames + 0.25s fade) lagged the envelope by up to ~0.4 coverage, and the passage player held the scroll at a 0.3 lag: the camera stood ~200ms at scroll 0.944 while the curtain went 0.93→0.33 (preview c3). After: no hold while the curtain lifts. Why (proven by the rec rows): the hold only needs to prove one frame drew. Retry when: the swap frame gets slow again (the 8-frame hold was cover for it). Model: opus. Link: commit 0ab6373.

## 2026-10-01 ✅ Arrival starts at 60% curtain, zooms geometrically, ease power from the zoom depth (#82)
Started at the swap, a third of the arrival ran behind the shut curtain; the visible part began at 0.28-0.38 of the dive's peak (desktop). Starting at 60% shut + cubic ease-out fixed desktop (0.49-0.58), but the phone's arrival is a 7.5x zoom (22.5→3 units from the sun; desktop 2x), so a linear lerp sped up halfway and peaked at 2x the dive, leaving the galaxy side at 0.48-0.52 of peak. Chosen: distance shrinks geometrically and the ease is a cubic Hermite that leaves at speed k and lands at rest, k = clamp(2.3/|ln ratio|, 1.5, 3) - k 3 (cubic ease-out) on desktop, the 1.5 floor on the phone. A quadratic floor (k 2) still left the phone's galaxy side at 0.45-0.54 of peak (6abf7f3); k 1.5 gives 0.53-0.62 and stays monotone. Rejected: a farther solar entry pose - the reveal must start at a legible scale (CameraRig comment). Retry when: the overview poses change distance. Model: opus. Link: commits 0ab6373, 6abf7f3, d3a87ed.

## 2026-10-01 ✅ Scrolling up from an overview reached without a dive plays the arrival backwards (#82)
A returning visitor (entered on a world, Escape home) and a reconciled swap land in the overview with `arrivedViaDive` false, and scrolling up held the overview pose until the curtain closed: c6 preview, desktop, 1.2s at speed 0.00 on the solar side; it also hit 1 of 25 normal phone-up runs (c5-m-up-1, a reconcile in the setup pass). Chosen: leaving the bottom of the scroll while resting in the solar act (scroll-driven, no reconcile pending) sets `arrivedViaDive`, so the arrival plays backwards as it does after a dive. Harness: `SEEN=1` enters on /about and presses Escape - setting `seen-intro` and reloading / is always a fresh visit (Hero's module flag). Retry when: n/a. Model: opus. Link: the commit adding SEEN mode.

## 2026-10-01 ✅ The positional reconcile waits for 0.2s of rest, not one slow frame (#82)
The T7c reconcile (for End/Home and scrollbar jumps) fired on a single frame under 0.05 scroll/s. The played passage crosses the curtain at ~0.2/s, so one short scroll step (0.0008 instead of ~0.0033, c7-down-1) reconciled a normal dive: the curtain fell at the reconcile's dt/0.3 rate, `arrivedViaDive` stayed false and the arrival crept at 0.2 of peak instead of braking from speed. Likely also the frozen phone-up departure in c5-m-up-1. Chosen: rest must last 0.2s. Retry when: a jump needs to reconcile faster than 0.2s. Model: opus. Link: the commit adding `restFor`.

## 2026-10-01 ✅ Harness instrument changes during #82 (read old numbers with this)
1) Turn rate is timed by the scroll each pose was drawn at and normalized to 60fps; frames under the full curtain skipped. 2) Until e6a8b1e `frames_over_50ms` counted gaps between distinct poses (includes scroll holds) - now real recorder frames, pose gaps reported separately. 3) The puppeteer screencast itself causes periodic 45-68ms frames: a probe without it saw no frame over 33.4ms in either viewport, and the one turn sample over 1.5°/frame (phone, 5.56° in 8.9ms) sat right after a 58ms screencast frame (1.38°/frame over the combined interval). 4) The scroll clock over-reads too: the camera's damps run on wall time, so a long wall frame over a short scroll step turns the pose more than the scroll accounts for (phone: 1.83 for a 1.38° step over 27ms). `max_turn_deg_per_60fps_frame_both_clocks` times each step by the longer clock; the old metrics stay printed beside it. 5) A swap that went through the T7c reconcile is visible in rec.json: the curtain lifts at a constant dt/0.3. Retry when: n/a. Model: opus. Link: commits e6a8b1e, the commit adding both_clocks.

## 2026-10-01 ✅ Flights into a world are planned by flying them first: swings x vias x duration (#70)
Each world-to-world shot is simulated at 60fps before its first frame (simulate) over SWINGS (when the swing round the destination runs) x vias (bows) x durations, and the first that brings the planet into frame by FLIGHT_IN_FRAME, keeps Saturn's ring plane RING_CLEAR radii away and fits FLIGHT_MAX wins (shotScore). Before: one fixed swing - jupiter>saturn 53%, mars>jupiter 47%, belt>earth 73% before the planet entered the frame. After (5 desktop runs): 27-36% on every leg, and it stays in frame once in. Planned against 33% with 38% as second best, because the run drifts a few percent from the plan and 38% landed at 41%. Planning cost: a candidate that fails at FLIGHT_MAX is dropped after one simulation, not a sweep (saturn>mars 176 -> 6-18ms, jupiter>saturn 86 -> 27-34ms). Retry when: frame timing changes the plan-vs-run drift. Model: opus. Link: issue #70, PR (this branch).

## 2026-10-01 ✅ Saturn's rings: a per-frame governor plus bows out of the ring plane (#70 crit 5)
governedPoint holds the camera back so the rings open or close by at most RING_STEP 0.9 deg a frame (measured 0.90-0.91 on every Saturn leg). Leaving Saturn the swing bows round the destination's far side and/or along the ring normal on the camera's side (RING_VIAS pairs); out to the overview the crane bows along the normal (CRANE_VIAS). Before: saturn>mars crossed the plane at 3.8R, saturn>overview at 5.0R. Far-side bows alone reached 6.2-6.3R at one orbital phase and 5.77R at another (new13-a); mixed pairs give 6.5-6.9R, crane 7.9-8.0R. Retry when: Saturn's poses or ring geometry change. Model: opus. Link: issue #70.

## 2026-10-01 ✅ Turn cap on the client's own cadence, and the clock tied to the turn (#70)
The 1.4 deg/frame turn cap is per frame of the client's median frame time, not of this frame: a 6ms frame after a 30ms one lost turn it never got back (jupiter>saturn in-frame 53% -> 43% from this alone). Into a world, while the view is still turning at its cap, flight time advances by at most one such frame: two ~150ms hitches 0.5s into belt>earth carried the camera 2.5 frames along the path per frame while the view turned one, the view lagged ~9 deg and the planet came in at 73%. After: 13-17%. Model: opus. Link: issue #70.

## 2026-10-01 ✅ A planet's 8K map uploads 0.6s after the landing, not at focus (#70)
Proven by a probe with the hi-res upgrade off: the two ~150ms frames inside the flights into Earth and Mars were the 8K upload, and they stretched those flights by 0.3s. At `worldSettled` it still landed in the camera's last easing (two 53-60ms frames 117ms after landing on Jupiter); 0.6s later the camera is at rest. Retry when: textures move to KTX2 (upload cost changes). Model: opus. Link: issue #70.

## 2026-10-01 ✅ Harness instrument changes during #70 (read old numbers with this)
1) Ring elevation change is measured per render frame (the page's frame counter), not per recorder sample. 2) flight.py rotation and speed rates are taken over at least ~one frame: a sample 3-6ms after a long frame carries that frame's whole move, and a resting camera's 0.7 deg/s drift read 4-9 deg/s and stretched mars>jupiter's measured duration to 2.66s against a 2.40s flight. 3) On the phone tour, legs whose camera barely moves (earth>jupiter) have a tiny peak speed, so the 2%-of-peak motion threshold catches the carousel drift: their `dur_s` (~5s) is not the flight (2.37s wall). Model: opus. Link: issue #70.

## 2026-10-01 ⏸ Bound: phone world-to-world dives cannot meet crit 4, and jupiter>saturn sits at the 2.5s edge (#70)
Phone tour dives between worlds are straight lines whose view must turn ~140 deg at <= 1.4 deg/frame: ~100 frames, more than 40% of any flight under 2.5s. Measured: jupiter>saturn 76%, saturn>mars 54% (before the branch: 78%, 71%). Crit 6 (back to overview) passes. Desktop jupiter>saturn: getting the planet in by 38% at the arrival phase costs 2.31s plan + 0.12-0.17s ring governor = 2.44-2.50s measured over 5 runs. Retry when: the phone tour gets an arc (pull back, then dive) or the criteria change. Model: opus. Link: issue #70.

## 2026-10-01 ✅ The phone tour's overview-to-world dive stays ~1.1s (#70)
The 1.5-2.5s duration guard covers desktop flights and the phone's world-to-world and back-to-overview legs; the phone tour's straight dive from the overview into a world measures 1.08-1.09s (FLIGHT_DIVE_MIN 0.9 + the eased tail). Elad's call on 2026-10-01: keep it. Retry when: Elad asks for a slower phone dive. Model: opus. Link: PR #84.

## 2026-10-02 ✅ The swap tunnel is a living shader whose warm centre grows into the sun (#82 stage 2)
Before (l0, desktop down): the curtain was a near-static wash - T1 frame-to-frame change min 1.04 (0.11 going up), detail on 20% of the frame, visible 0.31s. Chosen: SwapMask draws a moving tunnel (no fixed rng seed) whose warm centre widens into the sun as the curtain lifts; TUNNEL_MS 1100 and the dive runs on to T_SHUT under it. After (localhost, desktop and phone, both directions): T1 min 3.1-11.9, detail 53-55%, mean 47-70 with under 1% of pixels over 200, visible 0.64-0.70s and moving the whole time. Rejected earlier on looks: "fireworks" (mean 148) and the gold flash (mean 211). Retry when: Elad judges the look. Model: opus. Link: issue #82, branch feat/galaxy-richness.

## 2026-10-02 ✅ Galaxy dust is a normal-blended dark layer over the additive cloud (#82 stage 2)
Additive points cannot darken: removing or dimming points inside saturated arms left the lanes invisible, because overlapping points and the ~45 sky floor fill the gap. Chosen: a disc-sized plane under the cloud, normal blending, black with alpha from an arm-aligned periodic polar noise texture (big/fine/hair ridges x mottle), turning with the cloud (rotation.y = uTime*0.045, the vertex shader's spin), strength 1.15 (above 1 the filament cores go fully dark). The same noise also dims the points (dustDepth 1.0). The layer fades out with camera distance from the centre (smoothstep 6.5-9.2; the welcome shot sits at ~9.9): at full strength the dive sank below a mean of 20 for 312ms (dark_ms, f1-down), after 0. Result (localhost desktop down vs l0): fine 3.82→6.33, mid 5.68→13.8, lanes 8.1→27.7%, warm 1.4→20.9%, blue 58.4%, mean 68.2→55.7. Strength 0.9 left fine at 5.56 (target 5.73) and G5 bottom at 7.45. Retry when: n/a. Model: opus. Link: issue #82.

## 2026-10-02 ❌ Galaxy dust by point removal, isotropic noise, or scatter added after the spin (#82 stage 2)
1) Point-only dimming inside saturated arms: invisible (see the dark-layer entry). 2) Isotropic cell noise for the filaments read as "ink marbling" across the arms; replaced by noise periodic in the arm's polar angle (turn = atan2 - r*spin). 3) Adding the random scatter in the vertex shader after the spin smeared any pattern baked by position; the scatter is now baked into x/z on the CPU and aRandomness carries only y. Retry when: n/a. Model: opus.

## 2026-10-02 ✅ richness.py: the stage-2 instrument, and its two frame modes (#82 stage 2)
scripts/harness/richness.py reads passage runs: galaxy at rest (down runs, frames before the gesture) - fine |L - blur1.5| and mid |blur1.5 - blur6| on the body, lane share, warm/blue share, mean; tunnel (frames at >= 0.95 coverage) - T1 frame-to-frame change, T2 detail share, T3 mean and >200 share, T4 visible time. A run captures either ~22 or ~44 rest frames, and the 22-frame mode reads fine lower for the same build (5.67 vs 6.55), likely the pixel-ratio scaler: compare like with like (l0 baseline is a 22-frame run). passage.mjs now takes EXTRA_QS like galaxy-rest. Model: opus.

## 2026-10-02 ✅ GALAXY-REST: master already fails G1 and G5 (read the bars with this)
Master (m0, localhost, worst of 6 phases): G1 name box 1.746% / p99 32.6 (bars 1.0 / 25), G3 fwhm 0.193 (bar 0.15), G5 right 6.72 (4.0) and bottom 28.67 (6.0). Stage 2 (f2): G1 1.743 / 33.1 (unchanged), G2 0.484, G3 fwhm 0.119, G4 m2/m4 1.60 (master 1.80, bar 1.5), G5 left 3.03 / right 3.79 / bottom 5.53. G1 is drift from before this branch and stays open. Model: opus.
