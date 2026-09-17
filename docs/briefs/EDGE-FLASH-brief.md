# EDGE-FLASH brief - one-frame white flashes at planet edges

Written 2026-09-17, before any pixel moves, per standing rule 1. Criteria approved by the
owner 2026-09-17.

---

## Why this stage exists

The owner reported a white light flickering "on the horizon line, near the poles" on
2026-08-11, and said to leave it. On 2026-09-17, right after PR #37 shipped (`34cdc74`), he
reported "a few flashes of light" again and asked for a video.

SCENE-FLICKER (2026-08-03) looked for flicker and never reproduced it. It sampled one
screenshot every 450ms. These flashes last **one frame**, so that sampling had about one
chance in thirteen of catching any one of them, and none were caught.

## What the video shows

The live site was recorded with a screencast. An idle page renders at 30fps and the
screencast delivers every frame (median gap 33ms). On a single frame, a white blob about
40px across appears at a planet's edge. It is gone on the next frame. It appears in three
places:

- the lower edge of Earth on `/about`;
- the crescent horns of the small planet beside the sun on the home page;
- the dark edge of Mars on the home page.

In every case the blob sits where the planet's **day-night line meets its silhouette**.
Frame sheets and slow-motion clips were sent to the owner.

**Counts, 2026-09-17, live site, real GPU.** The detector is `edge-flash.py`; the
definitions are below. PR #37 is the build that just shipped (`34cdc74`); the previous
production build is `a5a9985`.

| page, window | previous production | after PR #37 |
|---|---|---|
| `/about`, 25 s: flash frames / frames | 589 / 746 | 555 / 747 |
| `/about`, 25 s: big flashes | 39 | 30 |
| home after scroll, 12-34 s: flash frames (2 runs) | 72, 78 | 160, 149 |
| home after scroll, 12-34 s: big flashes (2 runs) | 43, 45 | 55, 36 |

The defect predates PR #37. PR #37 roughly doubled the small flashes on the home page,
mostly at Mars's edge. It did not clearly change the big ones.

## The cause (read in code, supported by where the flashes sit)

G2 softened the terminator by rewriting one line of three's `RE_Direct_Physical`, inlined
in `SolarAct.tsx`:

```glsl
float dotNL = softNL( dot( geometryNormal, directLight.direction ) );   // was saturate(...)
vec3 irradiance = dotNL * directLight.color;
...
reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
```

`softNL` stays above zero until N·L = -0.18, so there is irradiance slightly past the
terminator. `BRDF_GGX` computes its own `dotNL = saturate(...)`, which is 0 there. Its
visibility term then becomes (three r185, `lights_physical_pars_fragment`):

```glsl
float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );   // 0
float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );   // dotNV * alpha
return 0.5 / max( gv + gl, EPSILON );                           // EPSILON = 1e-6
```

On a silhouette pixel, the interpolated normal can face slightly away from the camera. There
`dotNV` saturates to 0 and the term reaches 0.5 / 1e-6 = 500,000. The specular comes out
hundreds of times brighter than the lamp. Bloom spreads that single pixel into the blob.
The condition needs a pixel centre that is both on the silhouette and inside the soft band,
so it holds on one frame and not the next.

In stock three, the same geometry has `irradiance = 0`, so the specular is zero there.
G2's own comment scopes the patch to **"soften the diffuse terminator"**. Applying it to the
specular was a side effect.

The atmosphere rim shader, suspected in August, is bounded. Its colour is at most
`uColor + 0.5` and its alpha at most `1.35 * uIntensity`, so it cannot produce these
values.

## The change

Keep `softNL` for the diffuse term. Give the specular term the hard `saturate(N·L)` that
`BRDF_GGX` already assumes, so the two agree again. The shader is then numerically sound
everywhere: `dotNL * V <= 0.5 / alpha`.

The lit side's specular also returns to stock three's. On these rough (0.9) dielectric
surfaces that term is a few percent of the diffuse, and EF-3 measures whether anything
visible moved.

**If EF-3 fails**, the measured fallback is to leave the specular irradiance as it is and
raise the visibility term's floor from `EPSILON` to a value that only silhouette pixels can
reach.

---

## Criteria

**Before** is the first deployment of this branch, which contains this brief and the
harness and changes nothing on the site. **After** is the deployment carrying the fix.
Numbers come from the deployed preview alias on a real GPU (rule 2).

| # | criterion | how | target |
|---|---|---|---|
| **EF-1** | no big flashes | `edge-flash.mjs` + `edge-flash.py`: `/about` over the whole 25 s, and the home page with `SCROLL=1` over 12-34 s. Two recordings of each | **0 big flashes** in all four recordings |
| **EF-2** | flashes nearly gone | same recordings, flash frames | **`/about` <= 55 and home <= 15 in each recording.** That is at least 90% below the live site's 555 and ~155 on 2026-09-17. The before-alias counts are reported next to them |
| **EF-3** | the rest of the image does not move | `FIXEDSTEP=1 FREEZE=1 photometry-diff`, before against after, six views. `p3-albedo`, before and after | **mean difference <= 0.1 of 255 on each of the six views.** P3-2 to P3-5 still PASS, and P3-1's clipped-pixel counts do not rise |
| **EF-4** | the day-night line stays soft | the owner's eye on the preview alias | **not measured** - the owner judges |

### Definitions and validity

- **Flash pixel:** a pixel more than 80 levels brighter in frame t than every pixel within
  1px of it in frames t-2, t-1, t+1 and t+2.
- **Flash frame:** a frame with at least one flash pixel.
- **Big flash:** a frame with at least 200 flash pixels.
- **Guards:**
  - The recorder refuses a software GPU and a page without the scene canvas. A blank page
    also has zero flashes.
  - The detector refuses a run whose median frame gap exceeds 40ms, because dropped frames
    hide one-frame events.
  - The mean frame luminance is reported for every run. A run far below its pair means the
    scene did not draw.
- **Repeatability on unchanged code:** the two home recordings of the live site came back
  7% apart (160 vs 149). The two before-alias recordings are reported in the verify. EF-1
  and EF-2 sit far outside that spread.

## Out of scope

- Venus burning to white. It is a recorded defect with a separate stage to follow.
- Mars clipping 11.10% in its own world.
- The planned gallery view for phones.
