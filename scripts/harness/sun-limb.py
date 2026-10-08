#!/usr/bin/env python3
"""Sun limb (Task B) - how far the surface texture reaches and how soft the edge is.

    python3 scripts/harness/sun-limb.py d1440 d1920 elad phone      (needs numpy, pillow, scipy)

Reads .harness-out/sunlimb/<tag>.png/.json from sun-limb.mjs. Tags starting with "phone" are
the mobile tour, where the sun's centre is off screen: the circle is fitted to the orange limb
line row by row. Elsewhere it is fitted to the boundary of the warm disc mask.

  texture(r) = std of the high-pass luma (Gaussian sigma 1.5% R) in the ring, / the 0.4-0.5R ring
  edge       = median 10-90% width of the orange->outside drop (R-B channel) across the
               silhouette, along rays, in % of R and in render px
"""
import json
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as nd

D = '.harness-out/sunlimb/'
LUMA = [0.2126, 0.7152, 0.0722]


def bil(a, x, y):
    x0 = np.clip(np.floor(x).astype(int), 0, a.shape[1] - 2); y0 = np.clip(np.floor(y).astype(int), 0, a.shape[0] - 2)
    fx = x - x0; fy = y - y0
    return a[y0, x0] * (1 - fx) * (1 - fy) + a[y0, x0 + 1] * fx * (1 - fy) + a[y0 + 1, x0] * (1 - fx) * fy + a[y0 + 1, x0 + 1] * fx * fy


def circle(xs, ys):
    for _ in range(3):
        A = np.c_[2 * xs, 2 * ys, np.ones_like(xs)]
        s, *_ = np.linalg.lstsq(A, xs ** 2 + ys ** 2, rcond=None)
        cx, cy = s[0], s[1]; R = np.sqrt(s[2] + cx ** 2 + cy ** 2)
        d = np.abs(np.hypot(xs - cx, ys - cy) - R); g = d < max(3, np.percentile(d, 70)); xs, ys = xs[g], ys[g]
    return cx, cy, R


for t in sys.argv[1:]:
    a = np.asarray(Image.open(D + t + '.png').convert('RGB'), float); L = a @ LUMA; H, W = L.shape
    meta = json.load(open(D + t + '.json')); k = meta['perf']['dpr'] / meta['dev']
    phone = t.startswith('phone')
    if phone:
        y0, y1 = int(H * 0.57), int(H * 0.97)
        pts = [(np.nonzero((a[y, :W // 3, 0] - a[y, :W // 3, 2]) > 60)[0].max(), y)
               for y in range(y0, y1, 5) if ((a[y, :W // 3, 0] - a[y, :W // 3, 2]) > 60).any()]
        xs, ys = np.array(pts, float).T
        cx, cy, R = circle(xs, ys)
        half = np.arcsin(min(1, (y1 - y0) / 2 / R)); angs = np.linspace(-half, half, 120)
        rowsel = lambda Y: (Y >= y0) & (Y < y1)
    else:
        m = ((a[..., 0] > 120) & (a[..., 0] - a[..., 2] > 40)) | (L > 170)
        m = nd.binary_opening(m, iterations=2); lab, n = nd.label(m)
        m = nd.binary_fill_holes(lab == 1 + np.argmax(nd.sum(m, lab, range(1, n + 1))))
        ys, xs = np.nonzero(m & ~nd.binary_erosion(m)); kk = (xs > 2) & (xs < W - 3) & (ys > 2) & (ys < H - 3)
        cx, cy, R = circle(xs[kk].astype(float), ys[kk].astype(float))
        angs = np.linspace(0, 2 * np.pi, 360, endpoint=False)
        rowsel = lambda Y: np.ones_like(Y, bool)
    Y, X = np.mgrid[0:H, 0:W]; rr = np.hypot(X - cx, Y - cy) / R; ok = rowsel(Y)
    hp = L - nd.gaussian_filter(L, min(0.015 * R, 20))
    def ring(r0, r1):
        s = (rr >= r0) & (rr < r1) & ok
        return (hp[s].std(), L[s].mean()) if s.sum() > 200 else (np.nan, np.nan)
    base = ring(0.4, 0.5)[0]
    o = a[..., 0] - a[..., 2]; rs = np.arange(R - 60, R + 60, 0.25); wid = []
    for q in angs:
        x = cx + rs * np.cos(q); y = cy + rs * np.sin(q)
        if x.min() < 0 or y.min() < 0 or x.max() >= W - 1 or y.max() >= H - 1: continue
        p = bil(o, x, y); hi = np.percentile(p[rs < R - 10], 80); lo = np.median(p[rs > R + 25])
        if hi - lo < 40: continue
        wid.append(rs[np.nonzero(p >= lo + 0.1 * (hi - lo))[0].max()] - rs[np.nonzero(p >= lo + 0.9 * (hi - lo))[0].max()])
    e = np.median(wid)
    print(f"{t}: R {R:.0f} screen px = {R * k:.0f} render px (render/screen {k:.2f})  edge 10-90% {e / R * 100:.1f}% R = {e * k:.1f} render px ({len(wid)} rays)")
    for r0 in (0.80, 0.85, 0.90, 0.95):
        s, l = ring(r0, r0 + 0.05)
        print(f"   {r0:.2f}-{r0 + 0.05:.2f}R  texture abs {s:5.1f}" + (f"  rel 0.4-0.5R {s / base:4.2f}" if base == base else '') + f"  luma {l:5.1f}")
