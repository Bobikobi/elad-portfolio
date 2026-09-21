"""GALAXY-REST measurement. usage:

    galaxy-rest.py <run-dir> <tag> [<tag> ...]
    galaxy-rest.py <run-dir> --worst <prefix>     # every <prefix>-f<frame> capture + the worst

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
                         indistinguishable. The deprojection uses the CAMERA'S OWN MATRICES: the
                         disc lies in world y = 0, so the two matrices give an exact homography from
                         that plane to the screen, and inverting it puts every pixel back where it
                         belongs in the disc. Fitting the tilt from the picture instead - second
                         moments of the light - takes in sky, stars and nebulae along with the disc,
                         and read 0.53 / 0.68 / 0.53 on three phases of ONE unchanged build. The
                         annulus is then in world units (1.5 to 4.2 of the disc's 5.15), fixed for
                         every build and every phase, rather than a fraction of a per-frame radius.
                         Captures with no camera block fall back to the old moment fit, marked
                         `deproj: moments`.
  G5 edges dissolve    - GALAXY light (luma above the sky floor) in the outer 40 px band, reported
                         per side. The sky's own level is excluded so this is about the galaxy
                         running off the frame, not about the sky. The sides carry the criterion;
                         the bottom gets a looser one, because a galaxy laid across the lower half
                         of the frame necessarily approaches the bottom edge, and the only ways to
                         empty that band are to shrink it or lift it out of the lower half.

The sky floor is the median luma of the top 60 rows, which no build puts galaxy light into.

ONE FRAME IS NOT A MEASUREMENT. The welcome shot orbits the galaxy on periods of 70 to 101
seconds, so a single frozen frame is a single pose. `--worst` reads every phase of a run and
reports, per criterion, the least flattering value across all of them - which is the only number
a criterion can honestly be checked against.
"""
import glob
import json
import os
import sys

import numpy as np
from PIL import Image

BORDER = 40
CORE_L = 200
# The annulus that holds the arms, in WORLD units: outside the bulge (0.85) and inside the rim
# fade (0.88 of the 5.15 radius). Fixed, so two builds and two phases are compared on the same
# piece of the disc.
RING_IN, RING_OUT = 1.5, 4.2


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


def plane_homography(cam: dict, w: int, h: int) -> np.ndarray:
    """Pixel <- disc-plane homography, from the camera's own matrices.

    The galaxy's points are generated with y = 0, so the disc IS the world plane y = 0. A point
    on it is (x, 0, z, 1); clip = projection @ inv(world) @ that. Dropping the y column leaves a
    3x3 map from (x, z, 1) to homogeneous pixel coordinates, which is exact - including the
    perspective, which an ellipse fit cannot represent at all.
    """
    # three stores matrices column-major in `.elements`.
    p = np.asarray(cam['projection'], dtype=float).reshape(4, 4).T
    world = np.asarray(cam['world'], dtype=float).reshape(4, 4).T
    m = p @ np.linalg.inv(world)
    col = m[:, [0, 2, 3]]  # x, z, 1
    return np.array([
        w / 2 * (col[0] + col[3]),
        h / 2 * (col[3] - col[1]),
        col[3],
    ])


def disc_coords(cam: dict, w: int, h: int):
    """Every pixel's position in the disc plane: (x, z, in front of the camera)."""
    inv = np.linalg.inv(plane_homography(cam, w, h))
    yy, xx = np.mgrid[0:h, 0:w]
    px = xx + 0.5
    py = yy + 0.5
    dx = inv[0, 0] * px + inv[0, 1] * py + inv[0, 2]
    dz = inv[1, 0] * px + inv[1, 1] * py + inv[1, 2]
    dw = inv[2, 0] * px + inv[2, 1] * py + inv[2, 2]
    ok = dw > 1e-9
    safe = np.where(ok, dw, 1.0)
    return dx / safe, dz / safe, ok


def projected_axis_ratio(cam: dict, w: int, h: int, radius: float = 3.0) -> float:
    """Minor / major of the screen ellipse that a disc circle of this radius projects to.

    Reported, not a criterion: it is what the tilt actually is at this phase, so a swing in it
    is the camera moving and a swing in m4 at a steady axis ratio is the galaxy.
    """
    a = np.linspace(0, 2 * np.pi, 361)[:-1]
    hm = plane_homography(cam, w, h)
    pts = hm @ np.stack([np.cos(a) * radius, np.sin(a) * radius, np.ones_like(a)])
    if np.any(np.abs(pts[2]) < 1e-9):
        return 0.0
    xy = pts[:2] / pts[2]
    xy = xy - xy.mean(axis=1, keepdims=True)
    ev = np.linalg.eigvalsh(np.cov(xy))
    return float(np.sqrt(max(ev[0], 1e-9) / max(ev[1], 1e-9)))


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

    cam = meta.get('camera')
    if cam:
        # Exact: every pixel is put back into the disc plane through the camera's own map, and
        # the annulus is a real annulus in the galaxy, at fixed world radii.
        dx, dz, ok = disc_coords(cam, w, h)
        r = np.hypot(dx, dz)
        th = np.arctan2(dz, dx)
        ring = ok & (r >= RING_IN) & (r <= RING_OUT)
        q = projected_axis_ratio(cam, w, h)
        deproj = 'camera'
    else:
        # Fallback for captures taken before the camera was published: fit the tilt from the
        # second moments of the light. Kept only so old runs still parse; it takes in sky,
        # stars and nebulae as well as the disc and is not stable across phases.
        rmax = min(cx, w - cx, cy, h - cy)
        yy, xx = np.mgrid[0:h, 0:w]
        ddx, ddy = xx - cx, yy - cy
        wgt = np.where(np.hypot(ddx, ddy) <= rmax, light, 0)
        sw = max(float(wgt.sum()), 1e-9)
        cov = np.array([[float((wgt * ddx * ddx).sum()) / sw, float((wgt * ddx * ddy).sum()) / sw],
                        [float((wgt * ddx * ddy).sum()) / sw, float((wgt * ddy * ddy).sum()) / sw]])
        ev, evec = np.linalg.eigh(cov)
        q = float(np.sqrt(max(ev[0], 1e-9) / max(ev[1], 1e-9)))
        phi = float(np.arctan2(evec[1, 1], evec[0, 1]))
        cs, sn = np.cos(-phi), np.sin(-phi)
        u = ddx * cs - ddy * sn
        v = (ddx * sn + ddy * cs) / max(q, 1e-6)
        r = np.hypot(u, v)
        th = np.arctan2(v, u)
        ring = (r >= 0.3 * rmax) & (r <= 0.9 * rmax)
        deproj = 'moments'

    bins = 360
    idx = ((th[ring] + np.pi) / (2 * np.pi) * bins).astype(int) % bins
    # SUM, not mean: equal-area sectors of the deprojected annulus, and perspective moves a
    # sector's flux between pixels without changing how much of it there is. A per-pixel mean
    # would hand the compressed far side more weight than the near side.
    prof = np.bincount(idx, weights=light[ring], minlength=bins).astype(float)
    mean = max(float(prof.mean()), 1e-6)
    f = np.abs(np.fft.rfft(prof - prof.mean())) / mean / (bins / 2)
    # Dust lanes: how deep the darkest angular sector runs under the ring's own mean.
    lane = float(1 - prof.min() / mean)

    return {
        'tag': tag,
        'frame': meta.get('frame'),
        'G1_name_box': {'over_row_pct': round(float((box_rel > 12).mean()) * 100, 3),
                        'p99_over_row': round(float(np.percentile(box_rel, 99)), 1)},
        'G2_body_top_row': round(top_row, 3),
        'G2_light_below_midline_pct': round(lower * 100, 2),
        'G3_core': {'area_pct': round(core_area, 3), 'fwhm_y_pct': round(core_fwhm, 2), 'px': int(core.sum())},
        'G4_arms': {'m2': round(float(f[2]), 4), 'm4': round(float(f[4]), 4), 'm2_over_m4': round(float(f[2] / max(f[4], 1e-9)), 2),
                    'lane_depth': round(lane, 3), 'axis_ratio': round(q, 3), 'deproj': deproj},
        'G5_edges': {'left': round(float(light[:, :BORDER].mean()), 2),
                     'right': round(float(light[:, -BORDER:].mean()), 2),
                     'bottom': round(float(light[-BORDER:, :].mean()), 2)},
        'sky_floor': round(floor, 2),
        'frame_mean': round(float(lum.mean()), 3),
        'centre': [round(cx, 1), round(cy, 1)],
    }


# path -> which end of the spread is the criterion's least flattering one.
WORST = {
    'G1_name_box.over_row_pct': max,
    'G1_name_box.p99_over_row': max,
    'G2_body_top_row': min,          # a smaller top row means the galaxy reaches higher
    'G3_core.area_pct': max,
    'G3_core.fwhm_y_pct': max,
    'G3_core.px': min,               # the core must still EXIST
    'G4_arms.m2': min,               # the arms must still be there
    'G4_arms.m4': max,
    'G5_edges.left': max,
    'G5_edges.right': max,
    'G5_edges.bottom': max,
}


def pick(row: dict, path: str):
    for k in path.split('.'):
        row = row[k]
    return row


if __name__ == '__main__':
    run = sys.argv[1]
    args = sys.argv[2:]
    if args and args[0] == '--worst':
        prefix = args[1]
        tags = sorted(
            (os.path.basename(p)[:-4] for p in glob.glob(f'{run}/{prefix}-f*.png')),
            key=lambda t: int(t.rsplit('-f', 1)[1]),
        )
        if not tags:
            sys.exit(f'no {prefix}-f<frame>.png in {run}')
        rows = [measure(run, t) for t in tags]
        for r in rows:
            print(json.dumps(r))
        worst = {p: round(float(fn(pick(r, p) for r in rows)), 4) for p, fn in WORST.items()}
        print(json.dumps({'WORST_OF': len(rows), 'frames': [r['frame'] for r in rows], **worst}))
    else:
        for t in args:
            print(json.dumps(measure(run, t)))
