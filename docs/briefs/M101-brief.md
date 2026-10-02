# M101 - #82 stage 2: the photographed galaxy, the locked dive, the body audit

**Written 2026-10-02, after part of the work.** The disc bake (`e0ee973`) and the new disc/star
shaders (uncommitted at the time of writing) came before this brief. Its sources are the repo,
the issue and the saved consult answers named below.

## What the owner asked (2026-10-02)

- The purple background is too extreme. He preferred the earlier smeared black dust lanes.
- The galaxy-to-tunnel hand-off is not cinematic: "the camera moves to some strange place, and
  then the animation starts". The tunnel itself is better now.
- Shown photographs of real galaxies: "I liked the direction". So the disc becomes the Hubble
  photograph of M101.
- Standing order: audit every body against references and run an improvement round toward a
  more realistic, richer experience. Split the work with GPT and Antigravity. Run the R&D without
  waiting for approvals. Production deploys and merges still need his word.

## Streams

1. **Galaxy (M101).** The disc is the photograph (ESA/Hubble heic0602, CC BY 4.0, credited in
   the footer), under a neutral dark sky. A star field drawn from the same photograph takes its
   light over as the camera goes down.
2. **Locked dive.** The last 0.5 s before the tunnel is a straight push into one amber star at
   frame centre. The tunnel's warm centre grows out of that star.
3. **Body audit.** Research only in this PR: every finding is mapped to its code lever, with a
   measurable criterion. Implementation is the next PR (WIP cap 1+1).

Streams 1 and 2 ship as **one PR**: the dive's target star lives in the galaxy, and the preview
the owner judges is the one that merges.

## Stream 1 design

- **Disc.** `PlaneGeometry(2R)` in y = 0, R = 6.3, `m101-disc-2048.webp`. On the high tier the
  4096 replaces it once uploaded, and it never goes back down. Drawn additively, through the ACES
  fit run backwards: the photo is display-referred and this act ends in ACES at exposure 1, so
  its values map back to the light that displays as the photo (arms about 0.12, nucleus about
  5.5). The disc fades out at grazing view angles, where the stars carry the picture.
- **Stars.** Up to 200,000 points, sampled once from a 512x512 readback of the 2048 image.
  - Position probability goes as Y^0.55, and each star carries Y^0.45 times a lognormal grain.
    Density times light therefore goes as Y, which avoids brightness squared.
  - Colour is the photo's own chromaticity (rgb/Y), with about 15% nudged blue-white and 15%
    amber.
  - Thickness is a Gaussian in y with sigma 0.03 + 0.35·exp(-(r/0.9)²).
  - The low tier draws the first 40,000 of the same list. Tiers scale cost, never composition.
- **Energy law** (`galaxy/shaders.ts`). Each star is a Gaussian at least 0.5 px wide whose summed
  light follows 1/z², the same law a patch of the photo follows. Its peak is capped, and past the
  cap the star grows instead. Its size is capped at 3 px times DPR.
- **Handover.** k = 1 - smoothstep(0.5, 2.5, camera height over the disc). The stars' share of
  the disc's light is 0.05 + 0.95k, and the photo gets the rest. That gives 95/5 at rest (GPT's
  starting budget, 13:59 consult), and the stars carry everything at the bottom of the dive.
- **Spin.** One shared group turns the photo, the stars and the dive's target star at 0.01 rad/s.
  The spin eases to 0 over the first 15% of scroll.
- **Loading.** The loader waits for the disc (store flag `galaxyDiscReady`) up to 2.5 s after the
  first frame. A disc that arrives later fades in over 0.6 s.
- **Sky.** The galaxy colours in `GradientSky` become neutral charcoal, displayed at about
  (8,10,13) at the bottom and (10,13,17) at the top. `Nebula` in the galaxy act drops to about 0.2
  of today.
- **Bloom.** At rest in the galaxy act the threshold is about 0.8, so only the nucleus blooms. It
  blends back to today's 0 threshold with tunnel coverage.
- **Removed:**
  - `GalaxyDetail` and `GalaxyNebulae`.
  - `discBake.ts`, the procedural bake, kept at tag `attempt/2026-10-galaxy-procedural-bake`.
  - The dust layer.
  - The `Dust` motes are re-judged on the first capture.
- **Knobs** (HUD builds only): `?gx=photo,stars`, `?spin=`, `?gbloom=`.

## Stream 2 design

This comes from GPT's 12:32 consult (answer B, ship-first), cut to what one stage can measure:

- One explicit amber star, world-fixed inside the spinning group, sits in a dark notch beside the
  arm the dive approaches. It is the dive's destination.
- In the last 0.5 s before the curtain, the path straightens toward it: the final Bezier control
  point is at E - k·normalize(T - E). The look also locks on it. Changing the aim alone would
  leave the sideways slide, and that slide is the "strange place".
- `SwapMask`'s warm centre sits at the star's projected position, which is about frame centre by
  then, and grows from there.
- Not in this stage, and worth retrying once the locked push is judged:
  - Carrying 64 stretched stars through the swap.
  - Dust becoming the tunnel walls.

## Criteria

**Approved by the owner for stage 2 (before the photo direction). Kept:**
- **G1:** fine ≥ 5.73 and mid ≥ 8.5. That is 1.5x master's 3.82 / 5.66, measured with
  `richness.py` on desktop in the 22-frame mode.
- **G2:** dust lanes cover ≥ 20% of the body.
- **G3:** warm ≥ 15% and blue ≥ 40%.
- **G4 (guard):**
  - No brighter than today.
  - The name area stays dark.
  - GALAXY-REST G1-G5 no worse than master. Master already fails G1 and G5; see DECISIONS
    2026-10-02.
  - fps not lower.
- **T1:** every tunnel frame differs from the previous one by ≥ 3 levels mean.
- **T2:** ≥ 45% of the frame has visible detail.
- **T3:** mean 20-80, with ≤ 8% of pixels > 200.
- **T4:** the tunnel is visible 0.5-0.9 s and moving the whole time.
- **Stage 1 passage criteria hold:**
  - No stall, and no frame > 0.1 s.
  - Speed just before and just after the tunnel ≥ 50% of peak.
  - Turn ≤ 1.5°/frame, 60 fps-normalised.
  - dark_ms 0.

**New for the new direction (proposed; the owner said not to wait):**
- **S1 neutral sky:** the galaxy-act sky's median chroma (max - min of RGB) is ≤ 10 levels.
  Today the sky near the galaxy is about (29,36,86), a chroma of 57.
- **S2 no lens:** sky in a ring just outside the disc, against sky at the frame edge. The median
  per channel, star-masked, differs by ≤ 6 levels.
- **M1 the photo survives the pipeline:** take the deprojected disc against the photo, normalised
  at 0.3R.
  - Radial luminance profile in 12 bins from 0.05R to 0.85R: every bin within ±25%.
  - Arm colour B/R within ±15%.
- **M2 stars' share at rest:** 5 ± 2% of the disc's light, from frame sums of `?gx=1,0` against
  `?gx=0,1`, sky subtracted.
- **M3 tier law:** low and high rest frames, blurred 6 px, differ by a mean of ≤ 3 levels.
- **M4 load:**
  - The first revealed frame has the galaxy: body mean ≥ 80% of the settled rest mean.
  - No frame > 50 ms from the 4096 swap.
- **D1:** in the last 0.5 s before the curtain, the angle between camera velocity and look is ≤ 8°.
- **D2:** at the curtain's start, the amber star is within 5% of the frame diagonal from centre.
- **D3:** the tunnel's warm centre is within 2% of frame width of the star's projected position.

If the photograph fails G3 (M101 may simply not be 40% blue by that measure), it is reported as a
conflict between an approved bar and the approved direction. The owner decides. The bar is not
moved quietly.

**For the owner's eye only:** the photo's look and colour, the spin speed, the stars' share, the
sky's shade, and whether the dive feels cinematic.

## Work split

| work | who | files (only these) | proof |
|---|---|---|---|
| this brief, criteria, split | me | this file | - |
| `Galaxy.tsx` (disc, stars, spin, load), `GalaxyAct`, deleting `GalaxyDetail`, `GalaxyNebulae`, `discBake`, galaxy bloom | me | `scene/galaxy/*`, `acts/GalaxyAct.tsx`, `Effects.tsx` | tsc, captures, `richness.py`, S/M criteria |
| footer credit, `galaxyDiscReady` flag and loader gate, neutral sky colours, Nebula galaxy intensity | **Codex**, own worktree and branch `feat/galaxy-richness-codex` | `Footer.tsx`, `sceneStore.ts`, `SceneRoot.tsx`, `GradientSky.tsx` | tsc + eslint + diff limited to those 4 files; I read every line (first of its kind) |
| "what breaks" on the stream 1 design | **Antigravity** deep, read-only | - | I weigh it |
| stream 3 code map: each audit finding to file:line, current value, change, measurement, risk to other bodies | **Antigravity** high, read-only | - | I check 3 rows against the code |
| first captures judged against M101 | **GPT**, with images | - | - |
| dive camera, target star, tunnel centre | me | `CameraRig.tsx`, `SwapMask.tsx`, `DiveFade.tsx`, `scene/galaxy/*` | D1-D3, T1-T4, passage |
| poster regenerated from the final rest frame | **Codex**, after stream 1 is tuned | `public/images/galaxy/poster.webp` | dimensions + my eye |
| preview deploy, alias numbers, PR, report | me | - | - |

No two workers write the same file at the same time. Codex's branch merges into
`feat/galaxy-richness` after my review.

**Inputs already in hand:**
- GPT 12:32: the sky and dive direction.
- GPT 13:07 and Antigravity deep 13:02: the per-body audits.
- Antigravity deep 13:40: the colour pipeline. Tone mapping happens once. `earth_clouds.webp`, a
  data mask, is loaded as sRGB (`SolarAct.tsx:555`).
- GPT 13:59: photo against points.

## Order

1. This brief, committed. Codex and the two Antigravity runs are dispatched in the background.
2. `Galaxy.tsx`, then tsc, then local captures, then the first numbers.
3. Codex's branch merged in, then tsc and captures again.
4. Tuning to S1, S2, M1-M4 and G1-G4. GPT judges the captures against M101.
5. Stream 2, measured on D1-D3, T1-T4 and the passage.
6. Branch preview. Every reported number comes from the alias. PR (what and why), then the
   owner's eye.
7. Stream 3 implementation as the next PR, built from the code map.

**Records:**
- DECISIONS entries:
  - Photo disc ✅.
  - Procedural bake ⏸, with its tag.
  - Star-fill attempts ❌/✅.
  - The 2026-10-02 dust entries marked ⏸ superseded.
- An `M101-verify.md` with PASS/FAIL per criterion.
