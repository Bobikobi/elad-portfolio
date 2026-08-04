## VERIFY: F2 - Classic view toggle

### HARNESS

`scripts/harness/f2-viewmode.mjs`. Two different instruments, deliberately:

- **Raw HTTP.** 30 `fetch` calls (5 section routes x 3 locales x 2 cookie values), each
  carrying a `viewMode` cookie, asserting which markup came back. No JavaScript runs on
  this path at all, which is the only way to tell a page that was *server-rendered* in a
  mode from one that was *corrected during hydration* - and that difference is the whole
  stage.
- **Browser.** puppeteer-core on the real GPU (`--use-gl=angle --use-angle=vulkan`),
  isolated context per case: total JS transfer from the Performance API, canvas presence,
  cookie round-trip across a reload, reduced-motion adoption, and screenshots.

Output (gitignored): `.harness-out/f2-preview/`.

### RUNS

Preview alias `elad-portfolio-git-feat-cosmic-r1-r2-bobikobis-projects.vercel.app`,
commit `0d9150f`, bypass header. Viewports 1440x900 and 390x844, locales he/en/ru.

### MEASURED (deployed preview alias)

| # | criterion | target | measured | verdict |
|---|---|---|---|---|
| 1 | toggle works both directions, every route, all locales | 15/15 | 15/15 route x locale combinations toggled and stayed toggled | PASS |
| 2 | survives reload and navigation | cookie + mode persist | cookie `classic` after click, after reload, and no canvas in either | PASS |
| 3 | zero WebGL chunks in classic | under 260 KB | classic 255 KB, largest chunk 71 KB; cosmic 680 KB, largest chunk 424 KB | PASS |
| 4 | SSR renders the correct mode, no flash | correct markup off the wire | 30/30 raw fetches returned the cookie's markup, all 200 | PASS |
| 5 | screenshots, classic + cosmic, both viewports, three locales | 12 | 12 in `.harness-out/f2-preview/`, plus the reduced-motion adoption shot | PASS |

Reduced-motion visitor with no cookie: `cookie=classic`, `canvas=false`,
`data-view=classic`. The plan asked for a *link* to classic here; the owner chose
adoption instead, so the requirement is met by the stronger behaviour and the toggle
hides itself when cosmic cannot be honoured.

### ADVERSARIAL SELF-CHECK

1. **"Classic" could just be a broken page.** A 404 or an error boundary also has no
   canvas and little JS. Tested: all 30 SSR fetches returned 200, and the classic
   screenshots at both viewports show the real section - heading, filter chips, project
   cards with images and live links.
2. **"No flash" could be an artifact of screenshotting after hydration.** This is exactly
   why criterion 4 is measured with `fetch` and a cookie header rather than in a browser.
   Nothing executes on that path, so the branch can only have happened on the server.
3. **The cookie could be read on the client and corrected.** Same test settles it, from
   the other direction: a client-side correction cannot change bytes that were already
   sent.
4. **The toggle could flip local state and nothing else.** The round-trip includes a full
   `reload()`, after which both the cookie and the absence of a canvas are re-checked.
   15/15. Before the `router.refresh()` was added this failed exactly here - a classic
   navbar over a cosmic page.
5. **The reduced-motion run could be a browser with no WebGL at all**, which would make
   the adoption trivially true. The same browser, same flags, renders cosmic with a live
   canvas in the cost run; only the emulated media feature differs.
6. **The 424 KB chunk could be missing from the classic number because it was cached.**
   Every case runs in its own browser context with its own cache, and the cosmic case in
   the same run downloads it.

### NOT MEASURED

- Lighthouse and CLS. F4 owns those; no number is claimed here.
- Classic view of the HOME route reuses the existing `StaticHero`, which keeps the galaxy
  poster as its background. Unchanged by this stage, and a design call rather than a
  defect.

### OBSERVATION FOR THE OWNER (not a defect, needs a ruling)

The classic sections use `--color-accent: #D946EF`, the pre-cosmic magenta, not the gold
in PART 2's token list. That is consistent with the rest of the non-cosmic site - the same
token is used by 28 files including every `/services/*` and `/guides/*` page already in
production - so classic view currently matches those pages rather than the cosmic palette.
Retargeting the token in `globals.css` is one line and would recolour all 28 at once.
Left alone deliberately: it is a visible design change nobody asked for.

### VERDICT

**PASS.** All five acceptance criteria measured on the preview alias.

### REMAINING

- The plan's follow-on ("append one clause about the classic view to the portfolio project
  copy, all three locales") is a copy change and needs owner-approved wording first.
