# Decisions log

What was tried on this site, what was chosen, what failed and why - so the same
mistake is not made twice, by a person or by any model working on the repo.

**Read this before proposing an approach.** If a heading matches what you are about
to try, read the entry first.

Format: `## YYYY-MM-DD <status> <title>`, status ✅ chosen · ❌ failed · ⏸ superseded ·
🔁 worth retrying. Body: what was tried · result with evidence · why (proven /
hypothesis) · **retry when** · link. An abandoned branch is tagged
`attempt/<yyyy-mm>-<topic>` before deletion and the entry points to it. Newest last.

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

## 2026-07-29 ❌ Orbital inclination alone to make eclipses rarer
- Result: duty cycle 45.9% → 38.3% only.
- Why (proven): the centrality gate was wider than the vertical spread the tilt buys.
- Instead: inclination 1.5-4° plus a gate of `0.28·rA + 0.09·rB` → 8.8% any body.

## 2026-07-29 ❌ Compressing Uranus/Neptune orbits to keep them in frame
- Result: 34.4% → 35.6% - barely moved.
- Why (proven): the overview camera sits inside the system.
- Instead: an off-frame world leaves a hoverable rim marker (`reachable()`).

## 2026-07-29 ❌ Side-effect-only `import` to capture the entry route
- Result: four worlds worked, the fifth replayed the dive, from identical code.
- Why: a bundler may drop or defer a side-effect import.
- Instead: an explicit call from an effect in CosmicStage (`lib/entryRoute`).

## 2026-07-30 ❌ Raising the lit-fraction target on every world
- Result: Mars frame clipping 0.32% → 4.19%, red channel only.
- Why (proven): more lit pulls the sub-solar point into open view. Exposure is the wrong
  lever (a 14% cut moved it 14%).
- Instead: scope a vantage ruling to the world it names (Saturn only).

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

## 2026-09-26 ❌ Stacking PRs of unapproved visual tuning
- Result: 12 open, stacked PRs; the 37% black stretch sat in production for 7 days
  while its fixes waited among them.
- Instead: production repair first; at most one change awaiting review and one in
  progress; the preview reviewed is exactly what merges.
