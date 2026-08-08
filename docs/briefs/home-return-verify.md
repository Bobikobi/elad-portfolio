## VERIFY: the returning visitor can scroll back to the galaxy (PR #27), on PRODUCTION

Measured 2026-08-08 on `https://www.eladsaadon.dev`, after PR #27 merged as `bbd4261` and
production deployment `elad-portfolio-qkuu9ygum` reported Ready.
Harness: `scripts/harness/home-return.mjs`. Three cases: he and en at 1440x900, he at
390x844, each in its own browser context so a stored locale or a leftover `seen-intro`
cannot decide the branch under test.

| criterion | he-desktop | en-desktop | he-mobile |
|---|---|---|---|
| a real GPU answered (never SwiftShader) | true | true | true |
| fresh arrival still starts at the top | true (y<=8) | true | true |
| after returning from a world the document is scrollable | **4500 vs 900** | **4500 vs 900** | **4220 vs 844** |
| the visitor is parked at the END of the driver | **3600 / 3600** | **3600 / 3600** | **3376 / 3376** |
| they were not ANIMATED there | **0** mid-frames of 526 | **0** of 534 | **0** of 531 |
| scrolling up from there reaches the galaxy | y = 0 | y = 0 | y = 0 |

The original defect was a document exactly as tall as the viewport - 900 against 900, not
scrollable in either direction. It is now 5x the viewport in landscape.

### The two ways this could have been falsely passing

1. **A delayed sample cannot tell an instant jump from a smooth one** - by the time it
   reads, a smooth scroll has arrived at the same place. That is exactly how the first
   version of this fix passed its own verification while animating the visitor through the
   intro's opening frames. So the position is sampled **every frame** from before the
   transition starts, and the criterion is the number of frames spent neither at the top nor
   at the end: **0 of ~530** in all three cases. A smooth scroll would have to pass through
   them.
2. **Coming home by a second `page.goto` is not the path under test.** Measured that way
   first, it reported the visitor at the top of the page (`y=0/3600`) and would have read as
   a failed fix. A hard load takes the fresh-arrival branch; a visitor uses the back control,
   which is a client-side transition in the same document. The harness now clicks
   `[data-world-back]`, and the same build reports `3600/3600`.

### Not covered

- **Escape and the scroll-away gesture** as return paths - only the back control is driven.
- **A real phone.** Chromium's emulation at 390x844, not iOS Safari.
