"""
SCENE-FLICKER analysis. Reads a frame set from flicker-capture.mjs and answers the
acceptance questions with numbers.

    python3 scripts/harness/flicker-analyse.py .harness-out/flicker-high

What it measures, and why each is measured the way it is:

* Bright points are found with a TOP-HAT - the frame minus a blurred copy of itself - so a
  star is judged against its own local background rather than against a global threshold.
  A star sitting on a bright nebula and one on empty sky are then comparable.
* Points are collected from the UNION of all frames, not from the first one. Collecting
  from frame 0 would miss exactly the failure being investigated: a point that is not
  there in frame 0 and blazing in frame 1.
* The planet's disc is found from the image, not from a scene hook. `__labelProbe` returns
  a label ANCHOR - lifted above the body and flagged off-screen here - which is not the
  disc. A heavy blur separates the disc (large and smooth) from stars (small and sharp).
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".harness-out/flicker-high")
meta = json.loads((root / "meta.json").read_text())
files = sorted(root.glob("f*.png"))
if not files:
    sys.exit(f"no frames in {root}")

frames = [np.asarray(Image.open(f).convert("RGB"), dtype=np.float32) / 255.0 for f in files]
H, W, _ = frames[0].shape
grays = [f @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32) for f in frames]


def box_blur(a, r):
    """Mean over a (2r+1) square, via a summed-area table. No scipy in this repo.

    The SAT needs a leading zero row and column; without them every lookup is off by one
    and the result is garbage that still *looks* like an image. The first version of this
    had that bug and reported zero bright points on a frame full of stars."""
    n = 2 * r + 1
    pad = np.pad(a.astype(np.float64), r, mode="edge")
    s = np.zeros((pad.shape[0] + 1, pad.shape[1] + 1), dtype=np.float64)
    s[1:, 1:] = pad.cumsum(0).cumsum(1)
    y, x = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    total = s[y + n, x + n] - s[y, x + n] - s[y + n, x] + s[y, x]
    return (total / (n * n)).astype(np.float32)


# --- masks -----------------------------------------------------------------------
chrome = np.zeros((H, W), bool)
for x0, y0, x1, y1 in meta["chrome"]:
    # Skip the full-frame LAYERS. The capture collects every fixed element, and several of
    # them are transparent overlays the size of the viewport - the canvas wrapper, the
    # world chrome. Masking those masked the entire sky, and the analysis then reported
    # zero bright points and zero colour on a frame full of both.
    if (x1 - x0) * (y1 - y0) > 0.4 * W * H:
        continue
    chrome[max(0, y0):min(H, y1), max(0, x0):min(W, x1)] = True

smooth = box_blur(grays[0], 24)
disc = smooth > max(0.18, 0.45 * float(smooth.max()))
disc = box_blur(disc.astype(np.float32), 10) > 0.25  # dilate
sky = ~disc & ~chrome

# --- bright points ---------------------------------------------------------------
# A point must stand this far above its own surroundings AND sit on dark sky. Grain and
# nebula texture clear a low bar easily: at 0.055 with no background test this counted
# 33,000 "stars", most of them noise.
TOPHAT = 0.25
BG_MAX = 0.25
MIN_PEAK = 0.25


def points_of(g):
    bg = box_blur(g, 5)
    hat = g - bg
    m = (hat > TOPHAT) & (bg < BG_MAX) & (g > MIN_PEAK)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy == 0 and dx == 0:
                continue
            m &= hat >= np.roll(np.roll(hat, dy, 0), dx, 1)
    return m


union = np.zeros((H, W), bool)
for g in grays:
    union |= points_of(g)
sky_pts = np.argwhere(union & sky)
disc_pts = np.argwhere(union & disc & ~chrome)

# One sample per point per frame: the max of a 3x3 window, so a sub-pixel wobble is not
# read as a luminance change.
series = np.zeros((len(sky_pts), len(grays)), dtype=np.float32)
for j, g in enumerate(grays):
    for i, (y, x) in enumerate(sky_pts):
        # A 7x7 window, so a point that shifts a pixel or two is still the same point.
        series[i, j] = g[max(0, y - 3):y + 4, max(0, x - 3):x + 4].max()

peak = series.max(axis=1)
keep = peak > MIN_PEAK
series, peak, sky_pts = series[keep], peak[keep], sky_pts[keep]

step = np.abs(np.diff(series, axis=1))
rel = step / np.maximum(series[:, :-1], 0.02)
worst_rel = rel.max(axis=1) if rel.size else np.array([0.0])
# "Appears or disappears entirely": within one point's own life, dark in one frame and
# clearly lit in another.
vanishes = ((series.min(axis=1) < 0.15 * peak) & (peak > 0.12)).sum() if len(peak) else 0

# --- chroma at the frame edges ---------------------------------------------------
def chroma(f):
    mx = f.max(axis=2)
    mn = f.min(axis=2)
    return np.where(mx > 0.04, (mx - mn) / np.maximum(mx, 1e-5), 0.0)


ch = chroma(frames[0])
band = np.zeros((H, W), bool)
band[:70, :] = band[-70:, :] = True
band[:, :70] = band[:, -70:] = True
edge_sky = band & sky
inner_sky = ~band & sky
edge_chroma = float(np.percentile(ch[edge_sky], 99)) if edge_sky.any() else 0.0
inner_chroma = float(np.percentile(ch[inner_sky], 99)) if inner_sky.any() else 0.0

print(f"frames            {len(frames)} every {meta['EVERY']}ms  route={meta['ROUTE']} tier={meta['TIER']}")
print(f"disc              {int(disc.sum())} px masked ({100*disc.sum()/(H*W):.1f}% of frame)")
print(f"bright points     {len(sky_pts)} tracked in the sky")
if len(sky_pts):
    print(f"  luminance step between consecutive samples:")
    print(f"    median {np.median(worst_rel)*100:.1f}%   p90 {np.percentile(worst_rel,90)*100:.1f}%"
          f"   p99 {np.percentile(worst_rel,99)*100:.1f}%   max {worst_rel.max()*100:.1f}%")
    print(f"    points whose worst step exceeds 20%: {(worst_rel>0.20).sum()}"
          f" of {len(worst_rel)}  ({100*(worst_rel>0.20).mean():.1f}%)")
    print(f"  points that go dark at some sample:    {int(vanishes)}")
print(f"points over the disc  {len(disc_pts)}")
print(f"edge chroma p99   {edge_chroma:.3f}   interior {inner_chroma:.3f}"
      f"   ratio {edge_chroma/max(inner_chroma,1e-4):.2f}")

# Whole-frame churn, which is what the eye reads as flicker regardless of what a point
# detector decides is a point.
d01 = np.abs(grays[0] - grays[1])
sky_d = d01[sky]
print(f"sky churn 1 sample  mean {sky_d.mean()*255:.1f}/255   p99 {np.percentile(sky_d,99)*255:.0f}/255"
      f"   >4/255 on {100*(sky_d>4/255).mean():.1f}% of sky pixels")
