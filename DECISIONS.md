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

## 2026-10-02 ⏸ Galaxy dust is a normal-blended dark layer over the additive cloud (#82 stage 2)
Superseded 2026-10-04: the procedural disc and its dust layer were replaced by the M101 photo disc, whose lanes are the photograph's own (see "The galaxy disc is the Hubble M101 photograph").
Additive points cannot darken: removing or dimming points inside saturated arms left the lanes invisible, because overlapping points and the ~45 sky floor fill the gap. Chosen: a disc-sized plane under the cloud, normal blending, black with alpha from an arm-aligned periodic polar noise texture (big/fine/hair ridges x mottle), turning with the cloud (rotation.y = uTime*0.045, the vertex shader's spin), strength 1.15 (above 1 the filament cores go fully dark). The same noise also dims the points (dustDepth 1.0). The layer fades out with camera distance from the centre (smoothstep 6.5-9.2; the welcome shot sits at ~9.9): at full strength the dive sank below a mean of 20 for 312ms (dark_ms, f1-down), after 0. Result (localhost desktop down vs l0): fine 3.82→6.33, mid 5.68→13.8, lanes 8.1→27.7%, warm 1.4→20.9%, blue 58.4%, mean 68.2→55.7. Strength 0.9 left fine at 5.56 (target 5.73) and G5 bottom at 7.45. Retry when: n/a. Model: opus. Link: issue #82. Amended the same day: the layer now shows only against arm light, see "Dust only in silhouette against arm light".

## 2026-10-02 ❌ Galaxy dust by point removal, isotropic noise, or scatter added after the spin (#82 stage 2)
1) Point-only dimming inside saturated arms: invisible (see the dark-layer entry). 2) Isotropic cell noise for the filaments read as "ink marbling" across the arms; replaced by noise periodic in the arm's polar angle (turn = atan2 - r*spin). 3) Adding the random scatter in the vertex shader after the spin smeared any pattern baked by position; the scatter is now baked into x/z on the CPU and aRandomness carries only y. Retry when: n/a. Model: opus.


## 2026-10-02 ⏸ Dust only in silhouette against arm light, deep indigo instead of black (#82 stage 2)
Superseded 2026-10-04: the procedural disc and its dust layer were replaced by the M101 photo disc, whose lanes are the photograph's own (see "The galaxy disc is the Hubble M101 photograph").
The owner, on the preview: the black around the galaxy reads as something separate from space, the colour gaps. Measured on the frame-3600 rest shot (scratch gap metric: disc box pixels more than 8 levels under the sky median): master 4.6%, black full-disc dust 42.8% (15% under 60% of the sky). Chosen: the dust texture is multiplied by smoothstep(0.03, 0.15) of the disc's own starlight binned on a 128-cell grid (box-blurred, over its 95th percentile), and the dust colour is #0D0F33. Result: 10.2% under the sky, 2.1% deep. Cost (localhost desktop down, 44-frame mode): fine 4.65, mid 7.32, lane 9.6%, warm 9.5% - above master (3.82/5.68/8.1/1.4) but under the G1-G3 bars, because a good part of the earlier gain was the black itself (it shrank the measured body to the bright arms). GALAXY-REST G4 at frame 3600 0.74-0.82 (master 1.8). Neither dimmer inter-arm light (diffuseDim 0.1) nor narrower arms (armSpread 0.32) moved G4 or fine. Retry when: the owner wants more lanes - the next lever is structure inside the arms, never dust over the sky. Model: opus. Link: issue #82.

## 2026-10-02 ❌ Dust in the sky's own colour, or stronger gated dust (#82 stage 2)
Dust tinted to the sky (#23275B / #2E3263) over the whole disc flattened it: fine 3.19, lane 4.67%, G4 1.44, G5 bottom 10.37. #161946 still left a dark lens (25% under the sky) at fine 5.24. Gated dust at strength 1.6 / 2.2 went back to black where it counts: 16.5% / 23.2% under the sky, G4 0.3 / 0.24, and lanes only 12%. warmReach 0.8 / 0.95 lifted warm to 11.8% / 14.2% but turned the blue arms pink. Retry when: never for the sky-coloured layer; strength only together with a new under-the-sky check. Model: opus. Link: issue #82.
## 2026-10-02 ✅ richness.py: the stage-2 instrument, and its two frame modes (#82 stage 2)
scripts/harness/richness.py reads passage runs: galaxy at rest (down runs, frames before the gesture) - fine |L - blur1.5| and mid |blur1.5 - blur6| on the body, lane share, warm/blue share, mean; tunnel (frames at >= 0.95 coverage) - T1 frame-to-frame change, T2 detail share, T3 mean and >200 share, T4 visible time. A run captures either ~22 or ~44 rest frames, and the 22-frame mode reads fine lower for the same build (5.67 vs 6.55), likely the pixel-ratio scaler: compare like with like (l0 baseline is a 22-frame run). passage.mjs now takes EXTRA_QS like galaxy-rest. Model: opus.

## 2026-10-02 ✅ GALAXY-REST: master already fails G1 and G5 (read the bars with this)
Master (m0, localhost, worst of 6 phases): G1 name box 1.746% / p99 32.6 (bars 1.0 / 25), G3 fwhm 0.193 (bar 0.15), G5 right 6.72 (4.0) and bottom 28.67 (6.0). Stage 2 (f2): G1 1.743 / 33.1 (unchanged), G2 0.484, G3 fwhm 0.119, G4 m2/m4 1.60 (master 1.80, bar 1.5), G5 left 3.03 / right 3.79 / bottom 5.53. G1 is drift from before this branch and stays open. Model: opus.

## 2026-10-04 ✅ The galaxy disc is the Hubble M101 photograph (#82 stage 2)
After two rounds of procedural richness the owner still found the galaxy poor and asked for photographs; he liked the direction. Chosen: the ESA/Hubble M101 mosaic (CC BY 4.0, credited in the footer) baked to 4096/2048 webps and drawn as one disc, radius 5.0 (`?gr=` compares sizes), with the procedural GalaxyDetail and GalaxyNebulae removed and the sky made neutral charcoal. Rest (localhost, worst of 6 phases): S1 sky chroma 6 (bar 10), S2 ring vs edge 4 levels (bar 6), M3 tier difference 0.26 (bar 3), GALAXY-REST G1 name box 0.209% / p99 1.8 (master 1.746 / 32.6), G5 right 1.28 / bottom 25.2 (master 6.72 / 28.7). The photo measures darker and less coloured than the procedural disc: richness fine 3.81, mid 6.0, lanes 15.6%, warm 7.7%, blue 16.1% (bars 5.73 / 8.5 / 20 / 15 / 40) - a conflict between approved bars and the approved direction, left for the owner. Retry when: n/a. Model: opus. Link: issue #82, 354c576, 226108b, e0ee973.

## 2026-10-04 ⏸ A procedural disc baked to a texture (#82 stage 2)
Lab iterations v4 and v6 baked the point cloud and its dust to a disc texture, to get photo-like structure from the existing generator. Superseded by the photograph before it was wired in: the owner chose the photo direction, and the bake never matched it on the richness bars. Kept at tag `attempt/2026-10-galaxy-procedural-bake` (e29702a). Retry when: the photo has to go (licence, art direction) and a generated disc is wanted again. Model: opus.

## 2026-10-04 ✅ Photo disc tuning at rest: stars 0.019, bloom 0.8, dive-only motes (#82 stage 2)
Stars over the photo first took 7.1% of the disc's light (frame sums of `?gx=1,0` against `?gx=0,1`, sky taken off); REST_STARS 0.019 brings it to 5.4% (M2 bar 5 ± 2). The galaxy bloom rests at threshold 0.8 so only the photo's nucleus blooms, and blends back to 0 with the stars' handover or the curtain, because dim additive points flicker under a threshold. The dust motes read as a blue lens over the photo at rest: they now appear only during the dive, neutral grey, with one count for every tier (the per-tier count broke the tier law, quality tiers scale cost only). Brighter exposure did not buy richness: gain 1.5 gave fine 4.05 / mid 6.42 / lanes 21.1% but G5 bottom 34.8 (master 28.7); gain 1.667 gave 4.1 / 6.51 with bottom 37.3. Anisotropy 16 changed nothing measurable. Retry when: the owner wants a brighter photo - then G5 bottom has to be re-agreed. Model: opus. Link: 354c576.

## 2026-10-04 ✅ The photo's first frame: readiness waits for the disc, the 4096 map uploads later (#82 stage 2)
Production build, localhost: the loader lifted while the disc was still fading in, so the first revealed frame was 0.48 of the settled body mean; the race was the loader marking ready on the same frame Galaxy decided whether it arrived late. Now the fade runs only when the disc really arrives after the reveal, and `galaxyDiscReady` (Codex) holds the loader until the disc is on the GPU, 2.5s ceiling. First frame 0.967 of settled (M4 bar 0.8). The 4096 map's upload is an 80-180 ms frame wherever it lands; it now happens 1s after the reveal on a still view (72-101 ms measured), not at the reveal. M4b (no frame over 50 ms) still fails on that frame and on an unattributed 66-83 ms frame ~0.1s after ready with no JS in it. Retry when: the 4096 map can be uploaded in tiles (texSubImage2D across frames) or KTX2 is adopted. Model: opus. Link: 354c576, 226108b.

## 2026-10-04 ✅ Locked dive: the camera flies into a star and the curtain grows out of it (#82 stage 2)
The owner: the camera moves somewhere strange and then the animation starts. Measured before (s1-down): in the last 0.5s the camera travelled 32.9 deg off where it looked, the star target sat 23 deg off centre when the curtain began, and speed sagged from 9 to 2.2 units/s. Chosen: the path is walked by arc length (256-sample LUT), ends in a straight push at DIVE_STAR, and the look locks on the star by 62% of the dive; a DiveStar sprite (white core, amber halo, Hubble spikes) marks it, so the swap curtain's warm centre grows out of the star. After (s2-lock-a/b, localhost): D1 2.8 deg (bar 8), D2 0.0 deg, D3 0 px, turn 1.0 deg/frame on both clocks (bar 1.5), speed 7-9.5 units/s into the curtain, rest poses byte-identical. Deviation from the brief: the star is world-fixed, not in the spinning group - the spin eases to 0 in the first 15% of scroll, and a turning target would make the path depend on how long the visitor rested. Antigravity deep judged the lock "accidental"; not changed, the turn rate holds the bar. Retry when: the owner finds the push too direct. Model: opus. Link: 46bac8a, 6522589.

## 2026-10-04 ✅ Read dark_ms and the up-run stall with this (#82 stage 2)
dark_ms counts frames with a mean under 20. The photo galaxy rests at a mean of ~21 (the procedural disc: 57), so the dive passes under 20 for ~1.1s by design of the new look (s1-down-b 1070, s2-lock-b 1181); the bar was written for the old exposure and is now a conflict for the owner, not a regression of the dive. The up run's stall at solar scroll 0.987 is older than stage 2's dive: master l0-up 313 ms, this branch f2c-up 523, t4-up 463, s2-lock-up 529 - it grew with the stage-2 tunnel, not with the locked dive. Retry when: the stall is the next item on the passage. Model: opus.

## 2026-10-05 ✅ M101 in motion: the tunnel in the galaxy's colours, entered at the dive's own brightness (#82 stage 2)
The owner, on the preview: richer and more alive, especially in motion; the tunnel's colours unrelated; the path's start should match. Chosen: the dive target is the photo's brightest arm knot (DIVE_KNOT, core RGB 232,241,244), turning with the disc until the scroll leaves 0; the tunnel takes M101's palette (blue-black sky, blue-white arm light, brown dust, pink HII) and warms to the sun from its middle; DiveFade 0.71 -> 0.25; the tunnel's entry gain is split - the walls at 0.05, the streaks and specks floored at 0.6 (`?tun=0.05,0.5,0.6`), because a single gain could match the seam only by killing T2 (gain 0.15 -> seam 3.0 but T2 34.4%); the dive's star field fades in from scroll 0.15 (was 0.35). Localhost, 3 down runs: C1 tunnel B/R -9.2..-9.7% of the last galaxy frame (bar ±15, before +25), C2 seam 5.3-6.0 (bar 10, before 95.6), C4 dive fine 2.82-2.93 (2.4x the 1.196 before, bar 1.5x), T2 51-55%, dark_ms 0 (before 1112). Retry when: the owner finds the dive too bright before the curtain (mean ~41 at its peak against ~21 at rest). Model: opus. Link: 9792edd.

## 2026-10-05 ❌ Photo shimmer at a 2-mip grain and a 520-cell noise field (#82 stage 2)
First pick for "alive at rest": modulate the photo's grain above a 2-mip blur with noise at vUv*520. Measured nothing: life on vs off at a frozen camera differed by 0.11 levels mean, and the rest-life d30 change moved 2.791 -> 2.828. Why (proven by the fix): at the disc's on-screen size (~700 px for a 2048 map) both the 2-mip grain and the 520-cell field are under a pixel, so the screen's own minification averages them away. A 4-mip grain and a 140-cell field (~6 px) at depth 0.8 gave a spin-free d30 of 1.076 against a 0.13 floor. Retry when: never at sub-pixel scale. Model: opus. Link: 9792edd.

## 2026-10-05 ⏸ C3 "3x the change at rest" is out of reach for life alone: the spin is most of today's change (#82 stage 2)
rest-life, camera held, 3 phases: today's change is the spin's (d30 2.791 with life off); life on adds 0.44 (3.23 = 1.16x). Without the spin, life is 8x its floor (1.076 vs 0.13). Reaching 3x means ~8.4 levels of mean change across the disc every 0.5s; the grain and stars cannot carry it, only the smooth arm light moving - a faster spin or a wave over the arms - which would also carry the dive target further (see the adaptive leg). Not tuned past this; a conflict for the owner, judged live. Retry when: the owner wants more motion at rest - the levers are spin rate (moves D1's worst case) or an arm brightness wave. Model: opus.

## 2026-10-05 ✅ The dive's straight leg grows with how far the spin carried the knot (#82 stage 2)
The knot turns with the disc and the spin eases to 0.5 rad, so a visitor who rests long ends the dive up to 1.75 units from where the path was designed. With the 3-unit leg the worst case (`?spin=1`, full turn) flew the last 0.5s 9.3 deg off the look (D1 bar 8); 4.5 units -> 9.1, 6 units -> 6.3-6.8. Chosen: leg = 3 + 1.75 x the knot's travel, so the ordinary dive (spin ~0.13 after 12s) barely changes (D1 2.85, before 2.66) and the worst case reads 6.5. Rotating the push with the spin was not tried (it would change the approach for everyone). Retry when: the spin's limit changes. Model: opus. Link: 9792edd.

## 2026-10-05 ✅ Sparkles over the whole disc, placed steeper than the photo's light (#82 stage 2)
Owner: the dive's soft points "are prettier than the galaxy itself" - spread them over the galaxy at rest. Chosen: the dive's star becomes one material (spriteStars: own twinkle phase, own reveal threshold); Galaxy draws 12000 of them at opacity 0.5, placed with probability min(Y, p97)^1.5. Sweep at radius 5, worst of 3 phases, sparkles on vs `?spk=0`: 6000 / 0.5 -> 1.3x the points picked out at rest, 12000 / 0.5 -> 1.5x, 2x needed 16000-20000 at 0.8 and buried the dust lanes under equal points (side-by-side crop). Placement on the field's own Y^0.55 counted more points (1.6-1.9x) but sprinkled the dim gaps; gamma 1.0 -> light-follows-photo r 0.61, 1.5 -> 0.81-0.86. K1 (2x) is met by the bigger disc together with them (2.4-2.55x). Counting peaks cannot measure K3 (a point on a bright arm stands less far over its surroundings: r -0.23..-0.29 before any sparkle), so sparkle.py `light` correlates the sparkles' own added light per cell. Retry when: the owner wants more sparkle - `?spk=0.8,16000,1.2` on the preview is the 2x look. Model: opus. Link: d1a26ef.

## 2026-10-05 ✅ The dive's stars reveal one by one and stay on the disc (#82 stage 2)
Owner, on the slow-motion: points "pop out of nowhere", mostly on the right, all at once. They were one 7000-star cloud with one opacity ramp, centred on the knot near the right rim and spilling past it. Now each star has its own threshold spread over scroll 0.03-0.62 (0.12 soft), stars past 0.85 R are dropped and the last 1.2 units inside the rim settle onto the plane. Preview, 2 down runs: largest rise in visible points between two consecutive frames 6.7 / 7.5% (bar 10, before 26.6% at scroll ~0.3); points in the 40 px band just past the galaxy's edge 54-58 at most (before 265). The whole-sky count still rises 1.9x, from the background stars at the frame's sides, which rise on round-2 code too (6.2x). Retry when: the owner still sees a pop - the band is RIM/RIM_FLAT and the window REVEAL_FROM/TO. Model: opus. Link: d1a26ef.

## 2026-10-05 ✅ Disc radius 6.3 with the welcome look lowered to 0.1 (#82 stage 2)
Owner: "maybe make it cover more of the screen". The bottom band is the bound (G5 bottom, master 28.7): at the old look 1.5, radius 6.3 -> 41.4 and 6.6 -> 45.0, and look 1.1 / 0.8 barely moved the worst phase (the orbit's closest pose). Look 0.3 -> 30.4, 0.1 -> 23.5, -0.2 -> 15.7 but the disc reached the name box (5.5% of its rows over the bar). Chosen 6.3 / 0.1: 1.31x wider (worst phase 973 px against 741), bottom 22.8, name box 0.05% of rows (before 0.19%) though p99 2.0 against 1.8; the knot scales with the radius and the dive still locks on it (0.002 deg at the run's spin). Cost: D1 4.7-6.0 (before 2.85, bar 8) and C2's full-turn seam 10.4-11.4 (bar 10; ordinary dives 3.5-5.8). Retry when: the owner wants it bigger still - the welcome camera itself has to move back or up. Model: opus. Link: d1a26ef.

## 2026-10-06 ✅ Edge-on galaxy: thickness at the disc's height instead of limiting the drag (#82 stage 2)
The owner: dragged so the camera sits at the galaxy's height, it becomes too thin a line - up to 4x its height. Measured (drag sweep, `?camhold`, 1440x900): the band falls from 381 px at rest to 41 px at pitch 0.47 (elevation ~0); the dive never thins. The owner ruled out clamping the pitch ("add realism exactly at that height"). Chosen: near edge-on only (elevation 2-15 deg, scroll < 0.1) the field stars lift off the plane by a per-star gaussian (`?lift=0.6,2`: 0.6 units, less over bright knots, 0.35 at the rim, none in the bulge) and EdgeOnDisc draws the photo's ring profile integrated along the line of sight (sech^2, thin at the core, 0.42 in the disc) with a dust lane in its alpha. Tried and dropped on the way: a tall bulge (an orange vertical streak), sparkles after the card (a white line through the lane), equal lift for knots (vertical columns). Thinnest band 173 px (4.2x), rest 382 (unchanged), rest metrics identical to round 3. Retry when: the owner wants it thicker or dustier - `?eo=gain,height,dust` and `?lift`. Model: opus. Link: 446ff17, PR #86.

## 2026-10-06 ✅ The dive's stars in the photo's colour, revealed by closeness (#82 stage 2)
The owner: the dive's start still makes overly bright points on the right edge that feel on the screen, not in the galaxy. The approved luma bar (L2: p95 of new points ≤ the sparkles at rest) already passed on master (79 vs 152), so it does not see the complaint; L2b counts new points per 10k px over dim photo (under the body's 40th percentile) in the right third, scroll 0.2-0.35, against rest: master 3.12x, pre-round-3 1.26x. Chosen: DiveNeighbourhood stars take the photo's 7x7-cell colour, are kept with probability (light/p97)^0.3, start at the sparkles' brightness (uFar 0.12) and reach 3x by 1.5-6 units (`?dn=0.3,3,6,0.12`). Dimming alone dropped C2 to 14-19 (bar 10); the closeness ramp restored it (3.6-3.9). L2b 1.29 / 1.48x, K2 max rise 5.9 / 5.6%, rim max 41 / 38 (master 57). Retry when: the owner still sees points arriving - lower uFar or raise keepGamma. Model: opus. Link: 446ff17, PR #86.

## 2026-10-06 ✅ The dive's end: stars streak with the camera's motion, the tunnel's lines wait for half cover (#82 stage 2)
The owner: the lines in the first frames of the passage are not physical - the points should turn into streaks, lines should not just appear. Chosen: the dive's stars and the sparkles are instanced quads stretched along their own screen motion over a 0.05 s shutter (previous-frame MVP; `?streak=shutter,maxPx,spread`, default 0.05,260,1.8) that opens with the dive (scroll 0.02-0.1), so rest and drag are unchanged; SwapMask draws its own star lines only from coverage 0.5-0.75 (uLines). Spread 1.086 conserves light before the tone curve but read too bright (frame mean 90 vs 72 with streaks off at +100 ms); 1.8 matched (75/78 vs 72/79). With streaks off, elongation stays at the instrument's floor (1.19-1.34) up to cov 0.56, so the tunnel draws no line before half cover. With streaks on it rises 1.5 -> 3.2-3.5 by cov 0.5, steps ≤ 1.3x a frame; the approved ≥ 6 is not met as measured, and neither a 0.08 s shutter nor a 520 px cap moved it (3.3 / 3.4), so the reading is held by what does not streak (the photo itself, the bright core). C4 fine detail fell 3.78 -> 2.0-2.1 (bar 1.79): blur is less fine detail. Residual: the tunnel's wall specks are short radial dashes from cov 0.15, faint (opacity ≤ 0.1 below cov 0.3). Retry when: the owner wants longer streaks (the shutter) or the specks gated too (uLines). Model: opus. Link: a3b9e8f, PR #86. Superseded the same day by the owner (next entry): beside the path they read as floating outside the galaxy.

## 2026-10-06 ⏸ The cluster and the dying star's shell laid on the dive's own path (#82 stage 2)
The owner: "rings" in the passage's first part are beautiful but show for too short a frame, so they read as a flash - lengthen them naturally. They were DiveObjects' shell and cluster, placed off to the right against the old path: the shell crossed 1920x1080 in 0.13 s and never entered 1440x900, the cluster ~0.3 s. Chosen: each sits just off the camera's path where it passes it (CameraRig `diveFrameAt`; cluster at scroll 0.62, 0.5 left; shell 0.81, 0.4 right; both 0.3 under the sightline), in view from 0.55 of scroll earlier (fade-in 0.15), leaving through the lower corner while fully lit. The sideways offset narrows below 16:10; on an upright phone the look turns onto the path too late (shell 0.12 s), so the shell stays off there as it was. Seen that long they read as a white ball and a blue planet, so both are smaller and dimmer (spread 0.22 -> 0.15, shell 0.8 -> 0.5, halo 0.95 -> 0.6). Preview: cluster 0.58 / 0.55 / 0.55 s (1440 / 1920 / 390 wide), shell 0.58 / 0.58 s, worst size step 1.42x a frame (bar 1.5). The pillars only ever peek in at the bottom edge (centre below the frame at every aspect); not changed. Retry when: the owner wants the shell on phones - an object ahead on the sightline instead of beside the path stays ~1 s in a 390x844 frame (objsim). Model: opus. Link: a3b9e8f, PR #86.

## 2026-10-06 ✅ The cluster and the shell lie in the disc, near the knot (#82 stage 2)
The owner on the path placement: the objects sit outside the galaxy, and from the start of the scroll they should be seen inside it. Chosen: both lie on the disc plane (y 0.05) beside where the dive passes (`layOnDisc`: shell at dive 0.75, 2.0 ahead, 1.2 left; cluster at 0.84, 1.5 ahead), relaid when the spin moves the knot; fade in over scroll 0.05-0.2 so they are part of the galaxy from the first frames, the shell shown on phones again. Over the lit disc a 0.5 shell vanished, so it is 1.2 with stronger rings. First preview (def02b8) failed the seam: the objects lit the last galaxy frame (C2 12.6, bar 10); the dying star's halo 60 -> 24 px and the cluster 0.6 -> 0.4 fixed it. Preview (0b5aa41): shell 1.18 / 1.18 / 0.68 s, cluster 1.12 / 1.08 / 0.48 s (1440 / 1920 / 390), size step 1.23x, C2 7.1 / 8.8. Retry when: the owner wants the cluster longer on phones (0.48 s, it enters an upright frame late). Model: opus. Link: def02b8, 0b5aa41, PR #86.

## 2026-10-06 ✅ The cluster and the shell are in the galaxy at rest (#82 stage 2)
The owner on the in-disc objects: they still only appear once the scroll starts - they should be in the galaxy at rest, relatively small, and grow with the dive. Chosen: no scroll fade at all; they arrive with the disc's photo (Galaxy writes its fade-in to `galaxyFrame.load`) and their growth is the camera's approach, so it follows the dive's speed. Preview (25afb57): at rest in frame at 1440 and 1920, shell r 43 / 52 px, cluster 24 / 29 px; through the dive they grow to 135 / 170 and 89 / 115 px, never shrinking more than 0.5% a frame, worst step 1.16x; on an upright phone the knot is right of the frame at rest, so they enter during the dive as before. They are laid against the dive for the current spin, so while the disc still turns at rest they slide over the photo by up to ~1.7 px/s (measured 0.064 units per 0.044 rad), fading as the turn stops at its cap. G1 0.049% (bar 0.051), G5 bottom 24.6 (28.7), C2 8.8 / 8.8. Retry when: the slide shows - lay them rigid in the disc and re-plan the late path around them. Model: opus. Link: 25afb57, PR #86.

## 2026-10-06 ✅ The dying star's shell is tiny: 1.2 -> 0.3 (#82 stage 2)
The owner: the pink-green ring is too big, it should be tiny. Chosen: the shell sprite 1.2 -> 0.3 (at rest 86 -> 21 px across at 1440x900), its strokes drawn 3-9 px instead of 1-4 on the 256 texture, and a little stronger, so at a quarter the size they stay a ring and do not blur to a smudge (crops at scroll 0 / 0.4 / 0.7 / 0.85 checked by eye). Preview (b073c5b): shell r 10.7 / 12.8 px at rest (1440 / 1920), 35 / 42 px at its exit, phone 18 px; C2 8.8 / 9.0; G1 0.054% then 0.047% on a repeat of the same build (run-to-run; the shell is far from the name). Retry when: the owner wants it bigger again - SHELL_SIZE alone, the strokes hold down to 0.3. Model: opus. Link: b073c5b, PR #86.

## 2026-10-06 ✅ The edge-on texture is built over frames, not in one (#82 stage 2)
Codex review on PR #86 (P2, the thread that blocked the merge): EdgeOnDisc built its 256 x 128 texture - ~90 ms of sech^2 terms - inside one useFrame, a second after the photo, in the welcome view. Measured on the preview: that frame was 133-150 ms in 7/7 loads. Chosen: buildTexture is a generator stepped a column at a time inside 4 ms a frame (the field sampler's pattern); the texture is byte-identical (checksum) and lands ~0.4 s later, long before anyone can drag to edge-on. After: no frame over 17 ms while it builds (9 loads); a 50-100 ms frame ~0.8 s earlier shows in old loads too (the field's upload). Model: opus. Link: 71d8b7f, PR #86.

