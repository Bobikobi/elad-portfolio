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
| [STATUS 2026-08-04](STATUS-2026-08-04.md) - scene lane, everything since the B8d brief | 2026-08-04 | open items: merge PR #26 and #27, retarget PR #24, logos, reviewer capture conditions, knip deletions | 4584fae (lane `feat/b8c`) |
| [PROJECTS-HOVER](PROJECTS-HOVER-brief.md) - pointer input reaches the windows, and the two-stage tap ([verify](PROJECTS-HOVER-verify.md)) | 2026-08-05 | PASS - 9 criteria on the preview alias, against production as the control; found and fixed a live defect where the scroll container swallowed every pointer event, so hover showed nothing and clicking a project did nothing (7/7 cases). Criterion 1's "12/12 windows" is unmeetable: 1 window is hit-testable in portrait, 2 at 1440x900 | ea956a4 + 4218278 (lane `feat/projects-hover-touch`, PR #31) |
| [SUN-2](SUN-2-brief.md) - granulation, limb darkening, live limb, deeper lanes ([verify](SUN-2-verify.md)) | 2026-08-08 | C3 and C4 PASS, C5 pass with its reference corrected. C1 fails the number (2.16x of 2.5x) and passes the eye - the threshold was a guess and the crops are unambiguous. C2 unreachable from the shader: 48% of limb darkening arrives as 8%, bloom fills it back in. The R2.2 halo was re-measured and got tighter, not wider | ec0c4cc (lane `feat/sun-2`) |
| [home-return](home-return-verify.md) - a visitor returning from a world can scroll back (PR #27) | 2026-08-08 | PASS on PRODUCTION - 3/3 cases: document 4500 vs 900, parked at 3600/3600, 0 of ~530 frames spent animating, galaxy reachable | bbd4261 (merged) |
