"""
NIGHT-LIGHTS before/after comparison at a FIXED displacement.

    python3 scripts/harness/night-lights-compare.py before after strong ablate

Why this exists rather than just diffing two night-metrics.json files: the screencast does
not run at a fixed rate. Across four runs of the same page it came back at 21.9, 26.3, 27.4
and 29.8 fps, so consecutive captured frames are between 2.0 and 2.7 rendered frames apart
and the globe turns between 3.2 and 4.4 px between them. Every per-frame flicker number
rises with that distance, so two runs sampled at different rates cannot be compared - the
first before/after pair here looked like a 12-point improvement that was entirely the
capture rate, and normalising by dividing through by the displacement is not good enough
either, because the relationship is not linear.

So each run is measured at STRIDE 1, 2, 3 and 4 - pairs one, two, three and four captured
frames apart - which traces that run's own curve of instability against distance travelled.
The curves are then all read at one common displacement. That number is comparable across
runs whatever rate they happened to be captured at, and it is the only number here that
should be quoted in a before/after sentence.
"""
import json
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image

REF_DISP = float(os.environ.get("REF_DISP", 8.0))  # px of travel to report everyone at
SPIN = float(os.environ.get("SPIN", 0.3))          # rad/s, SolarAct Planet useFrame
TOPHAT, BG_MAX, MIN_PEAK = 0.040, 0.06, 0.06
STRIDES = (1, 2, 3, 4)


def box_blur(a, r):
    n = 2 * r + 1
    pad = np.pad(a.astype(np.float64), r, mode="edge")
    s = np.zeros((pad.shape[0] + 1, pad.shape[1] + 1), dtype=np.float64)
    s[1:, 1:] = pad.cumsum(0).cumsum(1)
    y, x = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    return ((s[y + n, x + n] - s[y, x + n] - s[y + n, x] + s[y, x]) / (n * n)).astype(np.float32)


def load(label):
    root = Path(".harness-out") / f"night-{label}"
    meta = json.loads((root / "meta.json").read_text())
    files = sorted(root.glob("f*.png"))
    grays = [np.asarray(Image.open(f).convert("RGB"), dtype=np.float32) @ np.array([0.2126, 0.7152, 0.0722], np.float32) / 255.0
             for f in files]
    return meta, grays


def measure(label):
    meta, grays = load(label)
    H, W = grays[0].shape
    cx, cy, R = meta["planet"]["x"], meta["planet"]["y"], meta["planet"]["rPx"]
    yy, xx = np.mgrid[0:H, 0:W]
    dx, dy = (xx - cx) / R, (yy - cy) / R
    rr = np.hypot(dx, dy)
    mean_gray = np.mean(grays, axis=0)
    w = np.clip(mean_gray, 0, None) * (rr < 0.95)
    sx = float((w * dx).sum() / w.sum()); sy = float((w * dy).sum() / w.sum())
    n = np.hypot(sx, sy); sx, sy = sx / n, sy / n
    night = (rr < 0.99) & (dx * sx + dy * sy < -0.40) & (box_blur(mean_gray, 6) < 0.06)

    ratio = float(meta.get("sampleRatio", 1.0)) or 1.0
    fps = float(meta.get("realFps", 60.0)) or 60.0
    disp1 = SPIN / fps * R * ratio  # px between two CAPTURED frames

    def points_of(g):
        bg = box_blur(g, 4); hat = g - bg
        m = (hat > TOPHAT) & (bg < BG_MAX) & (g > MIN_PEAK) & night
        for ddy in (-1, 0, 1):
            for ddx in (-1, 0, 1):
                if ddy or ddx:
                    m &= hat >= np.roll(np.roll(hat, ddy, 0), ddx, 1)
        return np.argwhere(m)

    def peaks(g, pts):
        return np.array([g[max(0, y - 1):y + 2, max(0, x - 1):x + 2].max() for y, x in pts], np.float32)

    def widths(g, pts):
        out = []
        for y, x in pts:
            win = g[max(0, y - 5):y + 6, max(0, x - 5):x + 6]
            pk = win.max()
            if pk > 0:
                out.append(2.0 * np.sqrt(float((win >= 0.5 * pk).sum()) / np.pi))
        return out

    P = [points_of(g) for g in grays]
    L = [peaks(g, p) for g, p in zip(grays, P)]

    curve = {}
    for k in STRIDES:
        d = disp1 * k
        mr = max(4.0, 2.5 * d)
        st, van, tot = [], 0, 0
        for i in range(len(grays) - k):
            a, b, la, lb = P[i], P[i + k], L[i], L[i + k]
            if len(a) == 0:
                continue
            tot += len(a)
            if len(b) == 0:
                van += len(a); continue
            dist = np.sqrt(((a[:, None, :].astype(np.float32) - b[None, :, :].astype(np.float32)) ** 2).sum(2))
            j = dist.argmin(1)
            ok = dist[np.arange(len(a)), j] <= mr
            van += int((~ok).sum())
            if ok.any():
                st.append(np.abs(lb[j[ok]] - la[ok]) / np.maximum(la[ok], 0.02))
        st = np.concatenate(st) if st else np.zeros(1)
        curve[d] = {
            "p90": float(np.percentile(st, 90)) * 100,
            "over20": float((st > 0.20).mean()) * 100,
            "vanished": 100 * van / max(tot, 1),
        }

    ws = [v for g, p in zip(grays, P) if len(p) for v in widths(g, p)]
    return {
        "label": label,
        "capture_fps": round(float(meta.get("captureFps", 0)), 1),
        "disp1": disp1,
        "curve": curve,
        "width": float(np.median(ws)) if ws else 0.0,
        "night_sum": float(np.mean([g[night].sum() for g in grays])),
        "day_mean": float(np.mean([g[(rr < 0.85) & (dx * sx + dy * sy > 0.30)].mean() for g in grays])),
        "haze_mean": float(np.mean([g[(rr > 1.02) & (rr < 1.10)].mean() for g in grays])),
        "points": float(np.mean([len(p) for p in P])),
    }


def at_ref(curve, key):
    xs = np.array(sorted(curve))
    ys = np.array([curve[x][key] for x in xs])
    if REF_DISP < xs[0] or REF_DISP > xs[-1]:
        return None
    return float(np.interp(REF_DISP, xs, ys))


labels = sys.argv[1:] or ["before", "after"]
rows = [measure(l) for l in labels]

print(f"All runs read at a common {REF_DISP:.1f} px of travel (each run's own stride curve, interpolated).\n")
print(f"{'run':10} {'capFPS':>7} {'px/frame':>9} {'p90 step':>9} {'>20%':>7} {'vanish':>7} "
      f"{'width':>7} {'nightSum':>9} {'day':>8} {'haze':>8}")
for r in rows:
    p90, o20, van = at_ref(r["curve"], "p90"), at_ref(r["curve"], "over20"), at_ref(r["curve"], "vanished")
    fmt = lambda v, s: (f"{v:{s}.1f}" if v is not None else "  n/a")
    print(f"{r['label']:10} {r['capture_fps']:7.1f} {r['disp1']:9.2f} {fmt(p90,8)}% {fmt(o20,6)}% {fmt(van,6)}% "
          f"{r['width']:7.2f} {r['night_sum']:9.1f} {r['day_mean']:8.5f} {r['haze_mean']:8.5f}")

base = rows[0]
print()
for r in rows[1:]:
    for key, name in (("p90", "p90 step"), ("over20", "steps over 20%"), ("vanished", "vanished")):
        a, b = at_ref(base["curve"], key), at_ref(r["curve"], key)
        if a and b:
            print(f"{r['label']:10} {name:16} {a:6.1f}% -> {b:6.1f}%   ({(b - a) / a * 100:+.0f}% relative)")
    print(f"{r['label']:10} {'blob width':16} {base['width']:6.2f}  -> {r['width']:6.2f} px")
    print(f"{r['label']:10} {'night sum':16} {base['night_sum']:6.0f}  -> {r['night_sum']:6.0f}"
          f"   ({(r['night_sum'] - base['night_sum']) / base['night_sum'] * 100:+.1f}%)")
    print(f"{r['label']:10} {'day mean':16} {base['day_mean']:.5f} -> {r['day_mean']:.5f}"
          f"   ({(r['day_mean'] - base['day_mean']) / base['day_mean'] * 100:+.1f}%)")
    print(f"{r['label']:10} {'haze mean':16} {base['haze_mean']:.5f} -> {r['haze_mean']:.5f}"
          f"   ({(r['haze_mean'] - base['haze_mean']) / base['haze_mean'] * 100:+.1f}%)")
    print()
