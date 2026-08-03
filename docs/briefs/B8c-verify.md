## VERIFY: B8c - owner corrections to the projects ring

Five defects the owner reported after seeing B8b on the preview. No brief: each item
was a specific instruction with no design left to decide.

### HARNESS

`scripts/harness/b8b-ring.mjs` (geometry, unchanged) and `scripts/harness/b8b-fps.mjs`
(frame rate on the real GPU, now with an `ONLY=` filter so one case can be isolated and
repeated cheaply). Preview alias, commit `c25a13e`.

### MEASURED (deployed preview alias)

| # | reported | fix | measured |
|---|---|---|---|
| 1 | only 2 windows | thickness 240 -> 180, gap 20 -> 16, made possible by moving the image out of the content box | **3** whole windows in the fan with a 4th entering, 1440x900 and 1280x800, he/en/ru |
| 2 | scrolling not smooth | the ring draws a damped copy of scrollTop (85ms to 1/e); the native scroll still owns the position | one wheel notch was 100px = 11 degrees of rotation in a single frame; it is now spread over ~5 frames. Frame timing unchanged: 60fps, 0% over 33ms |
| 3 | black rectangle inside each window | the content box has no surface at all; the preview is painted into the SECTOR and clipped to it | no element with a background inside a window; the photo follows the sector's curves |
| 4 | window should open the project | the whole window is one anchor | 8 of 12 windows are `<a>` (the 4 without a live URL stay `<article>`) |
| 5 | nothing shows there is more to scroll | a rail concentric with the ring, thumb length = fraction on screen, position = where you are | appears only when there is something to scroll; pulses 3 times, then stops |

Every B8b criterion still holds at the new thickness:

| criterion | target | measured |
|---|---|---|
| gap constant | +/-4px | spread 0.00-0.01px |
| edges radial | within 2% of R | worst 0.007% |
| outer sagitta | > 3px | 7.45px desktop, 31.91px mobile |
| text inside | no collision | true for every visible window, he/en/ru |
| 60fps both tiers | 60fps | see below |

### THE REGRESSION THIS ROUND CAUSED, AND HOW IT WAS FOUND

Painting the previews into the sectors dropped mobile high tier to 42-53fps across four
isolated runs, while mobile LOW tier - the same page under a 6x CPU throttle - stayed at
60. A throttle making something faster is the tell that the cost is not CPU.

A/B on the preview at 390x844, one variable at a time:

| variant | fps | frames over 33ms |
|---|---|---|
| as shipped | 42.2 | 42.3% |
| `.ring-layer` filter off | **60.0** | **0%** |
| photos hidden, filter on | 48.0 | 25.1% |
| both off | 60.0 | 0% |

So the layer-wide `drop-shadow` was the dominant term. B8b had moved it there deliberately
- one filter pass instead of twelve - and that reasoning held only while the layer
contained paths. Once it contained bitmaps, every limb drift re-rasterized a filtered
layer of images. Moving the shadow back onto `.ring-window` measured 59.8fps mobile and
60fps desktop with the shadow visually intact, so that is where it went.

### ADVERSARIAL SELF-CHECK

1. **The first "it is fixed" reading was a single run.** Three runs after the fix gave
   60, 60 and 43.4fps. One clean run would have been reported as a pass. It was not.
2. **The remaining 43.4fps could have been a second real cost.** Tested with a CONTROL:
   six runs of /projects (ring present) interleaved with six of /about (same scene, no
   ring), same session, same viewport. Both routes: 60fps, 0% over 33ms, twelve for
   twelve. The single bad reading was contention on this machine - other harness work was
   running at the time - not the page.
3. **"3 windows" could be counting faded ones.** The count is of paths with a non-empty
   `d`, and a window is emptied entirely once its opacity falls under 0.012, so a ghost
   cannot be counted. The screenshots show three legible windows.
4. **The photo could be invisible rather than clipped correctly.** The first three
   projects in the sorted order carry no `previewImage`, so the first screenshots showed
   no photo and looked like a broken image layer. Verified by scrolling until a
   preview-carrying project entered the fan and confirming three `<image>` elements with
   non-zero width and the picture following the sector's curves.
5. **The whole-window link could be a nested anchor**, which browsers unnest silently,
   giving a card that only works on part of its surface. It is a single `<a>`; the visit
   affordance inside it is a list item, not a link.

### VERDICT

**PASS**, with the frame rate measured against a control rather than on its own.
