"""GALAXY-REST measurement. usage: galaxy-rest.py <run-dir> <tag> [<tag> ...]

Five numbers per frame, all from the frozen at-rest galaxy capture:

  G1 behind the name   - light ABOVE THE SKY FLOOR inside the h1 rect grown by 12 px, mean and p99.
                         Measured above the floor because the sky itself sits at ~31 of 255 there,
                         so an absolute bar under that number could not be met by any galaxy change.
  G2 lower half        - share of the frame's light (luma above the sky floor) below the midline.
  G3 compact core      - the galaxy is a point cloud, so single points reach 255 all over the disc;
                         the core is measured on a 15 px box-blurred frame, which is what the eye
                         integrates: pixels at luma >= 200 and their bounding box as % of the frame.
  G4 arm structure     - angular Fourier magnitudes of the light in the galaxy annulus, m = 2 and m = 4,
                         each as a share of the ring's mean. Two arms read when |c2| > |c4|.
  G5 edges dissolve    - GALAXY light (luma above the sky floor) in the outer 40 px band,
                         left + right + bottom; the top is sky. The sky's own level is excluded so
                         this criterion is about the galaxy running off the frame, not about the sky.

The sky floor is the median luma of the top 60 rows, which no build puts galaxy light into.
"""
import json
import sys

import numpy as np
from PIL import Image

BORDER = 40
CORE_L = 200


def blur(a: np.ndarray, k: int) -> np.ndarray:
    """Separable box blur by summed-area table - the eye integrates the point cloud."""
    p = np.pad(a, k, mode='edge')
    c = p.cumsum(0).cumsum(1)
    c = np.pad(c, ((1, 0), (1, 0)))
    s = 2 * k + 1
    out = c[s:, s:] - c[:-s, s:] - c[s:, :-s] + c[:-s, :-s]
    return out[: a.shape[0], : a.shape[1]] / (s * s)


def measure(run: str, tag: str) -> dict:
    a = np.asarray(Image.open(f'{run}/{tag}.png').convert('RGB')).astype(float)
    meta = json.load(open(f'{run}/{tag}.json'))
    lum = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    h, w = lum.shape
    floor = float(np.median(lum[:60]))
    light = np.clip(lum - floor, 0, None)

    n = meta['name']
    x0, y0 = max(0, int(n['x']) - 12), max(0, int(n['y']) - 12)
    x1, y1 = min(w, int(n['x'] + n['w']) + 12), min(h, int(n['y'] + n['h']) + 12)
    box = light[y0:y1, x0:x1]

    tot = float(light.sum())
    lower = float(light[h // 2:].sum()) / tot if tot else 0.0

    core = blur(lum, 15) >= CORE_L
    if core.any():
        ys, xs = np.nonzero(core)
        core_w = float(xs.max() - xs.min() + 1) / w * 100
        core_h = float(ys.max() - ys.min() + 1) / h * 100
        cy, cx = float(ys.mean()), float(xs.mean())
    else:
        core_w = core_h = 0.0
        yy, xx = np.mgrid[0:h, 0:w]
        cy = float((yy * light).sum() / tot); cx = float((xx * light).sum() / tot)

    # Angular profile in the annulus that holds the arms: 0.25 to 0.75 of the distance from the
    # core to the nearest frame edge, so the ring is always inside the picture.
    rmax = min(cx, w - cx, cy, h - cy)
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.hypot(xx - cx, yy - cy)
    th = np.arctan2(yy - cy, xx - cx)
    ring = (r >= 0.25 * rmax) & (r <= 0.75 * rmax)
    bins = 360
    idx = ((th[ring] + np.pi) / (2 * np.pi) * bins).astype(int) % bins
    prof = np.bincount(idx, weights=light[ring], minlength=bins) / np.maximum(np.bincount(idx, minlength=bins), 1)
    f = np.abs(np.fft.rfft(prof - prof.mean())) / max(prof.mean(), 1e-6) / (bins / 2)
    # Dust lanes: how deep the darkest angular sector runs under the ring's own mean.
    lane = float(1 - prof.min() / max(prof.mean(), 1e-6))

    band = np.concatenate([light[:, :BORDER].ravel(), light[:, -BORDER:].ravel(), light[-BORDER:, :].ravel()])

    return {
        'tag': tag,
        'G1_name_box': {'mean': round(float(box.mean()), 2), 'p99': round(float(np.percentile(box, 99)), 1)},
        'G2_light_below_midline_pct': round(lower * 100, 2),
        'G3_core': {'px_over_200': int(core.sum()), 'box_w_pct': round(core_w, 2), 'box_h_pct': round(core_h, 2)},
        'G4_arms': {'m2': round(float(f[2]), 4), 'm4': round(float(f[4]), 4), 'm2_over_m4': round(float(f[2] / max(f[4], 1e-9)), 2),
                    'lane_depth': round(lane, 3)},
        'G5_edge_galaxy_light': round(float(band.mean()), 2),
        'sky_floor': round(floor, 2),
        'frame_mean': round(float(lum.mean()), 3),
        'centre': [round(cx, 1), round(cy, 1)],
    }


if __name__ == '__main__':
    run = sys.argv[1]
    for t in sys.argv[2:]:
        print(json.dumps(measure(run, t)))
