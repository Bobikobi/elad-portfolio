# OVERVIEW lamp (PR #45, stacked on #44)

Owner report 2026-09-20: all planets a bit too bright, Venus and Mercury blazing with nothing visible, the sun not beautiful yet.

Finding: exposure is not the lever. An aperture of 0.6 moved overview lit faces only ~9 levels (ACES shoulder). The light itself is the lever: SUN_LAMP_OVERVIEW_SCALE 0.25 while no world is focused (Sun.tsx, eased); focused worlds keep the full lamp their apertures were calibrated against.

Measured on the deployed preview, real GPU, p3-albedo + overview-detail.py, two captures, identical:

| Criterion | Before (#44) | After | Verdict |
|---|---|---|---|
| L1 overview lit-face mean, non-Venus bodies <= 205 | mercury 223, mars 222, uranus 212, saturn 239, jupiter 205 | 189, 127, 133, 203, 157 | PASS |
| L2 nothing disappears (>= 60, P3-2) | neptune 101 | 68 | PASS |
| L3 Venus burnt pixels (all channels) and detail (lit std) | 855 px, 11.5 | 4 px, 18.6 | PASS (no bar set for detail; it rose) |
| L4 Venus still brightest, focused worlds unchanged (P3-3, P3-4) | | order venus > saturn > mercury > jupiter > uranus > mars > earth > neptune, worlds +0.0 | PASS |

Judgement left to the eye: the overall level (Earth 136 -> 76 may now read dark), the sun (not touched here; concept from Astra pending), Mercury (still 189).
