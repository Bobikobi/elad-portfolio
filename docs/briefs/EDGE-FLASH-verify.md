# EDGE-FLASH verify - one-frame white flashes at planet edges

Measured 2026-09-19 against [EDGE-FLASH-brief.md](EDGE-FLASH-brief.md)'s approved criteria.
Every number below comes from a deployed preview alias on a real GPU
(`ANGLE (Intel, Vulkan 1.4.335 (Intel(R) Graphics (RPL-P)), Intel open-source Mesa driver)`),
under rule 2.

| build | commit | alias |
|---|---|---|
| **before** - brief and harness only, no pixel moved | `5cf8fc7` | `elad-portfolio-d8tl2ezqw` |
| **after (rejected)** - hard `N·L` for the specular | `074bc88` | `elad-portfolio-df5b7emzx` |
| **after (shipped)** - specular gated at the geometric terminator | `56fa63b` | `elad-portfolio-3e9esd8qw` |

Each alias was proved to carry its own shader before it was measured: the scene chunk is
lazily imported, so the marker was found by crawling chunk-to-chunk references from the page
HTML and grepping the deployed bundle. The marker appears only in the fix builds.

---

## Verdict table

| # | criterion | target | measured | verdict |
|---|---|---|---|---|
| **EF-1** | no big flashes | 0 in all four recordings | home **0, 0**. `/about` **5, 5** - one moving-edge track, identical in the before runs | **PASS on home, FAIL on `/about` as written.** 0 big flashes are left that the fix owns |
| **EF-2** | flashes nearly gone | `/about` <= 55, home <= 15 | `/about` **466, 472**. home **92, 94** | **FAIL.** The threshold was set from a count the fix was never going to move |
| **EF-3** | the rest of the image does not move | mean <= 0.1 of 255 on six views; P3-2..P3-5 PASS, P3-1 clips do not rise | 2 of 6 views inside 0.1; P3 half fully PASS | **FAIL on the photometry half, PASS on the P3 half** |
| **EF-4** | the day-night line stays soft | the owner's eye | the owner looked at `elad-portfolio-3e9esd8qw` on 2026-09-19: "the transition is soft enough" | **PASS** |

**What actually happened to the defect:** on the home page the largest bright event in a whole
22-second window went from **3,198 and 5,260 pixels to 2 and 5 pixels**. On `/about` all 32 and
27 big events that sat on Earth's lower edge are gone, every one of them.

---

## EF-1 - big flashes

A big flash is a frame with at least 200 flash pixels.

| recording | before | after (hard) | after (gated, shipped) |
|---|---|---|---|
| `/about` run 1 | 32 | 5 | **5** |
| `/about` run 2 | 27 | 5 | **5** |
| home 12-34 s run 1 | 46 | 0 | **0** |
| home 12-34 s run 2 | 46 | 0 | **0** |

### Home: PASS, and the margin is not close

| recording | largest single event, before | largest single event, after |
|---|---|---|
| run 1 | 3,198 px | **2 px** |
| run 2 | 5,260 px | **5 px** |

The six largest events in each before run are 2,675-5,260 pixels. After the fix the six largest
are 2-5 pixels. Nothing on the home page is within two orders of magnitude of the bar.

### `/about`: the 5 remaining events are the scene moving, not a flash

They are the same five frames in both after recordings, and they are **already present in both
before recordings** at the same coordinates with the same pixel counts:

| | frame 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| before run 1 (t 2.20-2.34) | 305 px at (590,138) | 349 at (604,154) | 371 at (617,171) | 365 at (630,186) | 271 at (643,202) |
| before run 2 (t 1.31-1.48) | 216 at (587,129) | 342 at (596,146) | 358 at (609,162) | 705 at (646,182) | 336 at (637,194) |
| after run 1 (t 1.68-1.81) | 301 at (591,138) | 342 at (603,154) | 371 at (617,170) | 358 at (631,186) | 280 at (642,202) |
| after run 2 (t 1.62-1.76) | 288 at (590,137) | 354 at (603,154) | 361 at (616,170) | 349 at (630,186) | 283 at (643,201) |

Same path, same sizes, before and after. The only thing that changes between runs is when it
starts, which is page-load timing.

The frame at that moment was rendered and read: it is the point where **the Moon's limb crosses
Earth's bright upper-left limb**. The boundary moves about 20 pixels per frame along
(576,131) -> (663,207). The detector dilates by 1 pixel to forgive drift; it cannot forgive 20,
so the leading edge of any high-contrast boundary moving that fast is counted as new light.

This is a blind spot in the instrument, found by measuring rather than assumed: a detector built
for one-frame events cannot separate them from a fast-moving edge with a 1px dilation. It was not
known when the criteria were written, so EF-1 fails by its letter. **No big flash that this fix
owns is left in any of the four recordings.**

## EF-2 - flash frames

| recording | before | after (gated) | target |
|---|---|---|---|
| `/about` run 1 | 540 | 466 | <= 55 |
| `/about` run 2 | 550 | 472 | <= 55 |
| home run 1 | 157 | 92 | <= 15 |
| home run 2 | 150 | 94 | <= 15 |

**FAIL, and the target was wrong.** It was set at "90% below the live site's 555 and ~155", on the
assumption that the flash-frame count was mostly the defect. It is not. Counting only events under
50 pixels:

| recording | small events before | small events after | median size |
|---|---|---|---|
| `/about` run 1 | 479 | 457 | 5 px -> 4 px |
| `/about` run 2 | 478 | 463 | 4 px -> 4 px |

About 460 of `/about`'s ~470 flash frames are 4-pixel sparkles at a median peak of 105, on Earth's
sunlit surface and in the star field, and they are the same population before and after. They are
the scene's own fine motion at 30fps, not the white blobs the owner reported. The blobs were
always the ~30 big events; those are the ones that moved.

This is standing rule 6 biting from the other side: **a threshold derived from a count is only
meaningful if the count measures the thing being fixed.** EF-2's target was derived from the live
site's own total, and that total is dominated by something this stage never touched.

## EF-3 - the rest of the image does not move

### Photometry, `FIXEDSTEP=1 FREEZE=1`, before vs shipped

| view | floor mean/max | diff mean/max | > 1 of 255 | against EF-3's 0.1 |
|---|---|---|---|---|
| overview | 0.000 / 0 | **0.016** / 111 | 0.14% | PASS |
| about | 0.000 / 0 | **0.103** / 171 | 2.49% | FAIL |
| services | 0.000 / 0 | **0.080** / 183 | 2.13% | PASS |
| projects | 0.000 / 0 | **0.275** / 239 | 2.73% | FAIL |
| technologies | 0.000 / 0 | **0.162** / 239 | 1.23% | FAIL |
| contact | 0.000 / 0 | **0.256** / 197 | 3.45% | FAIL |

The floor is 0.000/0 on every view, so the instrument is exact and the differences are real.

**Where the difference is.** The amplified difference image is black everywhere except a thin arc
along the day-night line and two bright spots where that arc meets the planet's silhouette -
exactly the two places the brief named as where the blobs appear. Nothing else in any of the six
frames moved. `diff-<view>.png` in `.harness-out/photometry-diff`.

So EF-3 fails its number while its intent - "the rest of the image does not move" - holds: the
change is confined to the defect. That was the owner's call to make, and he made it - EF-4 below.

**The rejected variant is why the shipped one is gated.** Giving the specular the plain hard `N·L`
also removed the blobs, but `softNL(x) > x` everywhere except the fully lit pole, so it re-lit the
whole sunlit hemisphere:

| view | hard variant | gated variant (shipped) |
|---|---|---|
| overview | 0.048 | 0.016 |
| about | 0.449 | 0.103 |
| services | 0.192 | 0.080 |
| projects | 0.364 | 0.275 |
| technologies | 0.177 | 0.162 |
| contact | 0.532 | 0.256 |

The gate halves or better on five of six views and leaves the lit side untouched.

### P3, before vs shipped - PASS

| | verdict | numbers |
|---|---|---|
| P3-1 clipped pixels do not rise | **PASS** | overview 1498 -> 1498, about 9716 -> 9716, services 0 -> 0, projects 0 -> 0, technologies **135 -> 74**, contact 0 -> 0 |
| P3-2 no body disappears | **PASS** | dimmest neptune 101.4/255 |
| P3-3 the inner system stays the inner system | **PASS** | venus > saturn > mercury > mars > uranus > jupiter > earth > neptune |
| P3-4 the worlds do not shift | **PASS** | about -0.4, services -0.2, projects -0.2, technologies -1.4, contact -0.6 |
| P3-5 the tier law | **PASS** | high 69 calls / 167,134 tris / 16.700ms, low 64 / 146,549 / 16.700ms - identical, +0.000ms |

## EF-4 - the day-night line stays soft: PASS

Not measurable, by design - this one is the owner's eye, and he gave it on 2026-09-19 after
looking at **https://elad-portfolio-3e9esd8qw-bobikobis-projects.vercel.app**: *"the transition is
soft enough"*.

That is the criterion EF-3's photometry half was standing in for. `softNL`, `TERM_WRAP = 0.18` and
`TERM_TOE = 0.35` are untouched and the diffuse term still receives the wrapped `N·L`; only the
specular is gated. The 0.103-0.275 of 255 that EF-3 measures on four views is that gate acting on
the terminator arc, and with EF-4 answered it is the intended change rather than a side effect.

---

## The change

In `SolarAct.tsx`'s `onBeforeCompile`, inside the G2 soft-terminator patch, one factor is added to
three's specular line:

```glsl
reflectedLight.directSpecular += smoothstep( 0.0, 0.05, dot( geometryNormal, directLight.direction ) )
                               * irradiance * BRDF_GGX_Multiscatter( ... );
```

The diffuse term keeps the soft `N·L`. Past the geometric terminator the specular is now zero,
which is what stock three does there, so the unbounded product cannot form: `BRDF_GGX` computes
its own hard `dotNL`, which is 0 there, and its visibility term
`0.5 / max( dotNV * alpha, 1e-6 )` reaches ~5e5 on a silhouette pixel. At the gate's edge the
ratio of soft to hard `N·L` is 1.6, not infinite.

A build-time guard was added next to G2's: if three's specular line ever moves, the build throws
with "the limb would flash again" rather than silently dropping the fix.

`tsc` exit 0, `eslint` exit 0.

## Validity

- Both aliases measured on the same real GPU, within minutes of each other.
- All eight recordings passed the detector's frame-gap guard (median 27.8-33.4ms, bar 40ms).
- Mean luminance held across every pair: `/about` 37.14/37.12 before vs 36.91/36.91 after, home
  31.97/31.96 vs 31.91/31.91. No run drew a blank or dimmed page.
- Repeatability on unchanged code: the two before runs of `/about` came back 540 and 550 flash
  frames, 32 and 27 big. EF-1's home result (46 -> 0) and the largest-event collapse
  (5,260 -> 5 px) sit far outside that spread.
- One `/about` recording of the rejected variant died with "Attempted to use detached Frame"
  during the GPU probe and was rerun alone rather than kept.

## What this stage did not touch

Venus burning to white, Mars's 11.10% clipping over a full turn, the gallery view for phones -
all out of scope in the brief and still open.
