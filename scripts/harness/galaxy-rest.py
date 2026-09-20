"""GALAXY-REST measurement. usage: galaxy-rest.py <run-dir> <tag> [<tag> ...]

Five numbers per frame, all from the frozen at-rest galaxy capture:

  G1 behind the name   - STRUCTURE inside the h1 rect grown by 12 px: each pixel against its own
                         row's median, so the sky's smooth vertical gradient cancels and only things
                         that read as objects - stars, bokeh, an arm - are counted. Reported as the
                         share of the box more than 12 levels over its row, and the p99 over the row.
                         Neither an absolute bar nor one over the sky floor works here: the gradient
                         alone is ~9.5 levels brighter at the name than at the top of the frame.
  G2 sits low          - the top row of the galaxy BODY, as a fraction of frame height. The body is
                         the 15 px blurred frame over luma 120, which is the galaxy's own disc and
                         not its faint outskirts; 100 is polluted by the elliptical-galaxy sprite
                         near the top-left corner. The share of light below the midline is kept as
                         context: it moves by a few points for a change the eye reads as large,
                         because the sky itself carries most of the frame's light.
  G3 compact core      - the galaxy is a point cloud, so single points reach 255 all over the disc;
                         the core is measured on a 15 px box-blurred frame, which is what the eye
                         integrates. It is the BLOB CONNECTED TO THE BRIGHTEST PIXEL, reported as
                         its AREA and as the vertical half-width through the peak. Its bounding box
                         is not reported as a criterion: one bright nebula touching the blob drags
                         the box across the frame while the core itself has not moved (two builds
                         with an identical core measured 18.3% and 25.8% wide).
  G4 arm structure     - angular Fourier magnitudes, m = 2 and m = 4, of the light in the galaxy
                         annulus, DEPROJECTED first: the disc is tilted, so a circle on screen cuts
                         an ellipse and the ellipse's own harmonics land on m4. Measured flat, the
                         four-branch master (m4 0.193) and a clean two-arm build (m4 0.184) are
                         indistinguishable; deprojected they are 0.132 and 0.028. The frame is
                         circularised from the second moments of the light inside the disc.
  G5 edges dissolve    - GALAXY light (luma above the sky floor) in the outer 40 px band, reported
                         per side. The sky's own level is excluded so this is about the galaxy
                         running off the frame, not about the sky. The sides carry the criterion;
                         the bottom gets a looser one, because a galaxy laid across the lower half
                         of the frame necessarily approaches the bottom edge, and the only ways to
                         empty that band are to shrink it or lift it out of the lower half.

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


def component(mask: np.ndarray, weight: np.ndarray) -> np.ndarray:
    """The connected blob (4-neighbour) that holds the brightest pixel of the mask."""
    if not mask.any():
        return mask
    seed = np.unravel_index(int(np.argmax(np.where(mask, weight, -1))), mask.shape)
    out = np.zeros_like(mask)
    stack = [seed]
    out[seed] = True
    h, w = mask.shape
    while stack:
        y, x = stack.pop()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not out[ny, nx]:
                out[ny, nx] = True
                stack.append((ny, nx))
    return out


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
    box = lum[y0:y1, x0:x1]
    box_rel = box - np.median(box, axis=1, keepdims=True)

    tot = float(light.sum())
    lower = float(light[h // 2:].sum()) / tot if tot else 0.0
    body = blur(lum, 15) >= 120
    rows = np.nonzero(body.any(axis=1))[0]
    top_row = float(rows.min()) / h if rows.size else 1.0

    bl = blur(lum, 15)
    core = component(bl >= CORE_L, bl)
    if core.any():
        ys, xs = np.nonzero(core)
        core_area = float(core.sum()) / (w * h) * 100
        cy, cx = float(ys.mean()), float(xs.mean())
        # Vertical half-width through the brightest pixel: the core's own size, across the disc
        # rather than along the arms, so a bright ridge leaving the core cannot inflate it.
        py, px = np.unravel_index(int(bl.argmax()), bl.shape)
        col, half = bl[:, px], bl[py, px] / 2
        y0 = y1 = py
        while y0 > 0 and col[y0 - 1] >= half:
            y0 -= 1
        while y1 < h - 1 and col[y1 + 1] >= half:
            y1 += 1
        core_fwhm = float(y1 - y0 + 1) / h * 100
    else:
        core_area = core_fwhm = 0.0
        yy, xx = np.mgrid[0:h, 0:w]
        cy = float((yy * light).sum() / tot); cx = float((xx * light).sum() / tot)

    # Angular profile in the annulus that holds the arms, out to the distance from the core to the
    # nearest frame edge so the ring is always inside the picture. The disc is deprojected first:
    # its second moments give the tilt, the frame is rotated and stretched back to circular, and
    # only then is the angular profile taken.
    rmax = min(cx, w - cx, cy, h - cy)
    yy, xx = np.mgrid[0:h, 0:w]
    dx, dy = xx - cx, yy - cy
    wgt = np.where(np.hypot(dx, dy) <= rmax, light, 0)
    sw = max(float(wgt.sum()), 1e-9)
    cov = np.array([[float((wgt * dx * dx).sum()) / sw, float((wgt * dx * dy).sum()) / sw],
                    [float((wgt * dx * dy).sum()) / sw, float((wgt * dy * dy).sum()) / sw]])
    ev, evec = np.linalg.eigh(cov)
    q = float(np.sqrt(max(ev[0], 1e-9) / max(ev[1], 1e-9)))  # minor / major
    phi = float(np.arctan2(evec[1, 1], evec[0, 1]))
    cs, sn = np.cos(-phi), np.sin(-phi)
    u = dx * cs - dy * sn
    v = (dx * sn + dy * cs) / max(q, 1e-6)
    r = np.hypot(u, v)
    th = np.arctan2(v, u)
    ring = (r >= 0.3 * rmax) & (r <= 0.9 * rmax)
    bins = 360
    idx = ((th[ring] + np.pi) / (2 * np.pi) * bins).astype(int) % bins
    prof = np.bincount(idx, weights=light[ring], minlength=bins) / np.maximum(np.bincount(idx, minlength=bins), 1)
    f = np.abs(np.fft.rfft(prof - prof.mean())) / max(prof.mean(), 1e-6) / (bins / 2)
    # Dust lanes: how deep the darkest angular sector runs under the ring's own mean.
    lane = float(1 - prof.min() / max(prof.mean(), 1e-6))

    return {
        'tag': tag,
        'G1_name_box': {'over_row_pct': round(float((box_rel > 12).mean()) * 100, 3),
                        'p99_over_row': round(float(np.percentile(box_rel, 99)), 1)},
        'G2_body_top_row': round(top_row, 3),
        'G2_light_below_midline_pct': round(lower * 100, 2),
        'G3_core': {'area_pct': round(core_area, 3), 'fwhm_y_pct': round(core_fwhm, 2), 'px': int(core.sum())},
        'G4_arms': {'m2': round(float(f[2]), 4), 'm4': round(float(f[4]), 4), 'm2_over_m4': round(float(f[2] / max(f[4], 1e-9)), 2),
                    'lane_depth': round(lane, 3), 'axis_ratio': round(q, 3)},
        'G5_edges': {'left': round(float(light[:, :BORDER].mean()), 2),
                     'right': round(float(light[:, -BORDER:].mean()), 2),
                     'bottom': round(float(light[-BORDER:, :].mean()), 2)},
        'sky_floor': round(floor, 2),
        'frame_mean': round(float(lum.mean()), 3),
        'centre': [round(cx, 1), round(cy, 1)],
    }


if __name__ == '__main__':
    run = sys.argv[1]
    for t in sys.argv[2:]:
        print(json.dumps(measure(run, t)))
