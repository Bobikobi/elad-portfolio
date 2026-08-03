# Brief / verify audit trail

One line per stage. A stage is not done until its verify artifact says PASS against the
deployed preview alias.

| stage | date | verdict | commit |
|---|---|---|---|
| [B8b](B8b-brief.md) - project windows as annular sectors ([verify](B8b-verify.md)) | 2026-08-03 | PASS - all 7 criteria on the preview alias, criterion 6 on a real GPU at both tiers | f11f3aa (+ harness follow-up) |
| [F2](F2-brief.md) - classic view toggle ([verify](F2-verify.md)) | 2026-08-03 | PASS - all 5 criteria on the preview alias; SSR asserted off the wire, 30/30 | 0d9150f |
| [B8c](B8c-verify.md) - owner corrections to the projects ring (no brief: five specified fixes) | 2026-08-03 | PASS - 3 windows, damped scroll, no inner box, whole window clickable, scroll rail; caught and fixed a 42fps mobile regression this round introduced | c25a13e |
| [B8d](B8d-brief.md) - previews in the ring plane, words on the planet ([verify](B8d-verify.md)) | 2026-08-03 | PARTIAL - redesign + navbar + header done and measured; 60fps fails at low tier (53.5-55.5) | ab1441f (lane `feat/b8c`) |
| scene mount ruling - canvas only on cosmic routes (verify inside B8d-verify) | 2026-08-03 | PASS - 20/20 route x mode combinations; service detail 660KB/391ms TBT -> 235KB/0ms | ab1441f (lane `feat/b8c`) |
| [SCENE-FLICKER](SCENE-FLICKER-verify.md) - twinkle / bloom / aliasing / occlusion / chromatic aberration | 2026-08-03 | PARTIAL - candidate 5 disproven with numbers, 1 and 3 real and fixed at one shared line, 2 untested, 4 no evidence; the artefact itself was not reproduced at 450ms sampling | 36a99fb (lane `feat/b8c`) |
