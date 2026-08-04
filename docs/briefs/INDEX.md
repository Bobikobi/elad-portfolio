# Brief / verify audit trail

One line per stage. A stage is not done until its verify artifact says PASS against the
deployed preview alias.

| stage | date | verdict | commit |
|---|---|---|---|
| [B8b](B8b-brief.md) - project windows as annular sectors ([verify](B8b-verify.md)) | 2026-08-03 | PASS - all 7 criteria on the preview alias, criterion 6 on a real GPU at both tiers | f11f3aa (+ harness follow-up) |
| [F2](F2-brief.md) - classic view toggle ([verify](F2-verify.md)) | 2026-08-03 | PASS - all 5 criteria on the preview alias; SSR asserted off the wire, 30/30 | 0d9150f |
| [B8c](B8c-verify.md) - owner corrections to the projects ring (no brief: five specified fixes) | 2026-08-03 | PASS - 3 windows, damped scroll, no inner box, whole window clickable, scroll rail; caught and fixed a 42fps mobile regression this round introduced | c25a13e |
