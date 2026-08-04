## VERIFY: SCENE-FLICKER - per-candidate findings

Lane `feat/b8c`. Harness: `scripts/harness/flicker-capture.mjs` (22 frames, 450ms apart,
10s, DOM hidden so only the scene is in frame) and `scripts/harness/flicker-analyse.py`.
Captured at `/about` on the preview alias, high tier, 1440x900.

### THE HEADLINE: I COULD NOT REPRODUCE THE REPORTED JUMPING

Between consecutive 450ms samples, in the sky away from the planet:

| region | mean change | pixels over 8/255 |
|---|---|---|
| **right sky (starfield)** | **1.02/255** | **0.90%** |
| the planet's disc | 11.96/255 | 20.6% |
| bottom nebula band | 3.90/255 | 5.88% |
| top-left (debris stream) | 4.24/255 | 9.77% |

The difference image (`.harness-out/flicker-diff.png`) shows where the change is, and it is
not the stars: Earth's clouds, city lights and terminator, the asteroid debris crossing the
frame, and two moons. All three are meant to move - SPARKLE-2 deliberately kept the world
breathing. The background starfield is essentially static at this sampling rate.

So either the external capture was taken under different conditions, or the artefact is
something a 450ms sample does not show. That second possibility is real and is discussed
under candidate 3.

### PER CANDIDATE

**1. Twinkle amplitude - REAL IN THE CODE, FIXED.** drei's `StarfieldMaterial`, which
`SeededStars` wraps, contains:

```glsl
gl_PointSize = size * (30.0 / -mvPosition.z) * (3.0 + sin(time + 100.0));
```

The multiplier swings 2.0 to 4.0 - a factor of two in point DIAMETER - and the phase is
`time + 100.0`, identical for all 13,000 stars, so the whole field breathes as one body.
Fixed: each star takes a phase from its own position, and the swing is +/-8% of diameter
around a high base, about 17% of flux, inside the 20% the acceptance allows.

What the measurement adds, and it matters: at `speed={0.5}` that pulse has a period of
about 12.6 seconds, so between two 450ms samples the multiplier moves by roughly 7%. The
amplitude is wrong in the code and worth fixing, but on its own it is not a between-frames
jump.

**2. Bloom threshold - PRESENT, NOT ISOLATED, NOT CHANGED.** `Effects.tsx` runs
`luminanceThreshold` 0.86 with `luminanceSmoothing` 0.22 on a focused world. That is a real
knee for a point to cross, and the file's own comment already records that thresholding a
dim point cloud flickers. It was not isolated in this round and nothing was changed: doing
so needs its own before/after, and with the starfield measuring 1/255 of change there was
nothing to attribute to it yet.

**3. Sub-pixel aliasing - THE LIKELY MECHANISM, FIXED.** This is the candidate that
survives the measurement above. A size pulse that is SMOOTH and slow still produces a
sudden appearance when it carries a point across the one-pixel boundary: the underlying
change is gradual, the rendered result is binary. That is exactly "a faint dot becomes a
full-brightness diffraction star", and it is also why a 450ms sample of a 12.6s pulse can
look like a jump. Fixed at the same line: below a 2px floor the size is held and the
difference comes out of alpha, so a point that is losing brightness now dims instead of
switching off.

**4. Occlusion at the limb - NO EVIDENCE FOUND.** The frame-to-frame change concentrated on
the disc is the disc's own content - clouds, the terminator, city lights - not points
showing through it. The difference image shows the change following the coastlines and the
night side, which is the texture, and the starfield behind the planet contributes about
1/255. Nothing was changed.

**5. Chromatic aberration - DISPROVEN.** There is no `ChromaticAberration` effect in the
composer at all; it runs Bloom, Vignette, Noise, GodRays, HueSaturation and SMAA. The
coloured edges are real but they are the nebula backdrop's own colour:

| band | R peak | G peak | B peak | saturation p95 |
|---|---|---|---|---|
| top 40px | x=442 | x=424 | x=297 | 0.94 |
| bottom 40px | x=507 | x=625 | x=738 | 0.92 |
| **middle row (control)** | **x=388** | **x=388** | **x=388** | 0.71 |

The channels peak 145-240px apart in the edge bands and at the SAME pixel in the middle -
but the largest step between adjacent columns in the top band is 1.0/255. That is a smooth
gradient hundreds of pixels wide, which is a coloured backdrop; chromatic aberration is a
channel offset of a few pixels at a high-contrast edge. Nothing to reduce or fade.

### WHAT THE MEASUREMENT COST TO GET RIGHT

Three wrong versions of this harness, each of which would have produced a confident and
false report:

1. A summed-area table without its leading zero row and column. Every lookup was off by
   one, and it reported **zero bright points on a frame full of stars**.
2. Masking every fixed DOM element, several of which are transparent layers the size of the
   viewport. That masked the entire sky and reported zero points and zero colour again.
3. Tracking points at fixed coordinates. The asteroid debris and the moons move, so a
   particle passing through a pixel reads as that pixel's star switching on: it reported
   99.8% of points swinging by more than 20%, with a median worst step of 1210%. Filtering
   to points that stay put for 10s returned **zero static points** above the threshold -
   every one of them was traffic.

The number that survived all three is the regional difference table at the top, which
assumes nothing about what a point is.

### VERDICT

**PARTIAL.** Candidate 5 is disproven with numbers. Candidates 1 and 3 are real in the code
and fixed at their single shared line. Candidate 2 is present and untested. Candidate 4
shows no evidence. The reported artefact itself was not reproduced at this sampling rate,
and the honest reading is that the fix addresses the mechanism that best explains it rather
than one I was able to film.

### WHAT WOULD SETTLE IT

The external reviewer's capture conditions - route, tier, viewport, and the interval
between their two frames. If they sampled during the entry flight, or on the galaxy act
rather than a world, the population in frame is different from the one measured here.
