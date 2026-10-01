# Decisions log

## 2026-09-29 ❌ Phone-tilt parallax as camera turn + slide (orbit feel)
Tried: tilt slid the camera 0.0125/deg and turned it 0.06 deg/deg (PR #67). Result: the focused planet stayed pinned and the scene swung around it - read as an orbit; Elad rejected it on the phone. Why: rotating about the view keeps the look target fixed on screen (proven by geometry). Retry when: never for "window" feel; only if an orbit/360 look is wanted. Model: opus. Link: PR #67, replaced by PR #68.

## 2026-09-29 ✅ Window parallax: off-axis projection scaled by the focused body's depth
Chosen: camera slides (no rotation) + setViewOffset keeps a window at 0.6x the focused body's depth fixed. First scaling by the camera-to-look distance failed: bodies sit at 0.73x-1.48x of it, so Earth moved 0.3% of width and Saturn's stars/planet ratio fell to 1.44. Scaling by the body's own depth gives 5.4% width / 2.50x at all 5 stops. Gotcha: setViewOffset overwrites cam.aspect with fullWidth/fullHeight - pass (aspect, 1). Retry when: new tour poses change body depths (re-measure via window.__win). Model: opus. Link: PR #68.

## 2026-10-01 ❌ Sun fibrils finer than the render can carry (scale 44 + a 1.7x octave)
Tried: H-alpha fibril layer at 44 cycles/radius plus a finer second octave (#73). Result: Elad saw "flickering dots" near the limb; high-pass frame diff at 0.8-0.9R went 2.47 -> 4.79, 0.9-0.97R 3.06 -> 5.34. Why (proven): the site renders at dpr=1, the sun is ~350 render px across, so those features are sub-pixel and alias as they move. A plain footprint fade at that scale killed the layer (fine contrast 0.041); scale 30 left the outer ring dead-smooth. Retry when: the render resolution of the sun roughly doubles (dpr>1 or a closer framing). Model: opus. Link: commit 094fe34.

## 2026-10-01 ✅ Sun fibrils at scale 36 with an fwidth footprint fade; breath x1.5
Chosen: each fibril/fire octave fades to its mean once its screen footprint drops under ~2 px; the flicker at 0.9-0.97R ended below baseline (3.07 -> 1.27). Two of the six added noise taps cut (core boost back on the shared fire term, fibril warp 2D) because desktop-high dropped frames went 2.8% -> 5.0%; after the cut 3.3% vs 3.2% baseline. The fine surface stopped pulsing the bloom, so the slow breath (disc + corona) was scaled 1.5x to restore halo motion (annulus diff f30 2.68 -> 2.82). Retry when: a GPU timer is available to cost each tap directly. Model: opus. Link: commit 3ea7e1d, issue #73.
