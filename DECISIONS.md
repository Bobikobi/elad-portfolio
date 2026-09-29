# Decisions log

## 2026-09-29 ❌ Phone-tilt parallax as camera turn + slide (orbit feel)
Tried: tilt slid the camera 0.0125/deg and turned it 0.06 deg/deg (PR #67). Result: the focused planet stayed pinned and the scene swung around it - read as an orbit; Elad rejected it on the phone. Why: rotating about the view keeps the look target fixed on screen (proven by geometry). Retry when: never for "window" feel; only if an orbit/360 look is wanted. Model: opus. Link: PR #67, replaced by PR #68.

## 2026-09-29 ✅ Window parallax: off-axis projection scaled by the focused body's depth
Chosen: camera slides (no rotation) + setViewOffset keeps a window at 0.6x the focused body's depth fixed. First scaling by the camera-to-look distance failed: bodies sit at 0.73x-1.48x of it, so Earth moved 0.3% of width and Saturn's stars/planet ratio fell to 1.44. Scaling by the body's own depth gives 5.4% width / 2.50x at all 5 stops. Gotcha: setViewOffset overwrites cam.aspect with fullWidth/fullHeight - pass (aspect, 1). Retry when: new tour poses change body depths (re-measure via window.__win). Model: opus. Link: PR #68.
