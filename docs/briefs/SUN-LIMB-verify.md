# SUN-LIMB verify - round 1 (two options for Elad)

Measured on the preview aliases on 2026-10-07, with a real GPU and `sun-limb.{mjs,py}`. The baseline is production (master 85ba2e6).
- A: `fix/sun-limb-desktop` 7b5f9e1. On a small sun the limb narrows back to the silhouette.
- B: `fix/sun-limb-desktop-b` 6988c22. Keeps the wide warm band from #79.

Both options carry the fibrils on an octave half as fine where the fine ones fade, and run their dark marks further toward the edge. Both apply only while the sun's radius is under 300-450 render px (`uSmall`). On a phone it read 522 px -> uSmall 0, and laptop 156 px -> 1; this was read live from a temporary probe that is not committed.

| criterion | today | A | B | verdict |
|---|---|---|---|---|
| L1 texture 0.90-0.95R >= 12 (1536x850@1.25 / 1440x900 / 1920x1080) | 5.2 / 6.4 / 5.4 | 20.0 / 24.2 / 21.8 | 14.5 / 17.6 / 14.9 | A PASS, B PASS |
| L2 edge 10-90% <= 4% R, as written | 7.1 / 10.7 / 6.9 | 12.1 / 16.0 / 11.4 | 9.1 / 13.6 / 7.3 | FAIL by its letter - instrument wrong, see below |
| L3 phone within ±5% (texture 0.90-0.95R) | 18.2 | 17.7 | 18.0 | PASS |
| L3 limb flicker (frame-to-frame high-pass change / texture, 0.9-0.97R, 25 fps) | 0.12 | 0.08 | 0.09 | PASS (no rise) |
| L3 fps | 60 | 60 | 60 | PASS (average only; frames over 0.1 s not measured) |

**L2's instrument measured the wrong thing.** It is the 10-90% fall of the R-B channel across the edge, and it starts inside the disc. So it reads the dark band and the texture next to the edge, not the silhouette. Measured as step height over the steepest slope, the silhouette is ~2 render px in every build (today 1.9-2.0, A 1.6-1.8, B 1.9-2.0). That means the edge itself was never blurred. The blur was the bare band, and L1 measures it. A and B leave texture at 0.92-1.06x the 0.4-0.5R ring out to 0.95R, against 0.34-0.39 today.

The phone numbers vary by up to 8% between runs of the same build (local runs 16.0-18.2), so ±5% sits at the noise floor. On the phone the shader path does not change, because `uSmall` = 0.

Video: `.harness-out/sunvid/sun-limb-options.mp4`, recorded at 1536x850@1.25. Each panel is cropped to the sun at the screen's physical scale.
The look is for Elad to judge.
