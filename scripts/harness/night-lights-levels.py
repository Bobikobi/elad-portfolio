"""
Region LEVELS over a FULL rotation - criteria 3 and 4, measured so that rotation phase
cannot fake the answer.

    python3 scripts/harness/night-lights-levels.py before-long after-long

The 90-frame runs cannot answer "did the day side change". Earth spins at 0.3 rad/s, so 90
frames is about a sixth of a turn, and two runs that start at different moments are looking
at different continents. The control proves it: deleting the night lights outright - an edit
that provably cannot touch the lit hemisphere, its alpha is zero there and it is additive -
moved the measured day mean by 3.9%. That is the noise floor of a short run, and it is
twice the 2% the criterion allows.

One full rotation is 2*pi/0.3 = 20.9s. Averaged over that, every longitude has faced the
sun for the same length of time in both runs and the phase cancels. Frames are streamed one
at a time rather than stacked - 600 frames of 1440x900 will not fit in memory as float32,
and the first version of this quietly tried.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

LUM = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)


def box_blur(a, r):
    n = 2 * r + 1
    pad = np.pad(a.astype(np.float64), r, mode="edge")
    s = np.zeros((pad.shape[0] + 1, pad.shape[1] + 1), dtype=np.float64)
    s[1:, 1:] = pad.cumsum(0).cumsum(1)
    y, x = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    return ((s[y + n, x + n] - s[y, x + n] - s[y + n, x] + s[y, x]) / (n * n)).astype(np.float32)


def gray(path):
    return (np.asarray(Image.open(path).convert("RGB"), dtype=np.float32) @ LUM) / 255.0


def measure(label):
    root = Path(".harness-out") / f"night-{label}"
    meta = json.loads((root / "meta.json").read_text())
    files = sorted(root.glob("f*.png"))
    if not files:
        sys.exit(f"no frames in {root}")

    # A running mean, built one frame at a time.
    acc = None
    for f in files:
        g = gray(f)
        acc = g.astype(np.float64) if acc is None else acc + g
    mean_gray = (acc / len(files)).astype(np.float32)

    H, W = mean_gray.shape
    cx, cy, R = meta["planet"]["x"], meta["planet"]["y"], meta["planet"]["rPx"]
    yy, xx = np.mgrid[0:H, 0:W]
    dx, dy = (xx - cx) / R, (yy - cy) / R
    rr = np.hypot(dx, dy)
    w = np.clip(mean_gray, 0, None) * (rr < 0.95)
    sx = float((w * dx).sum() / w.sum()); sy = float((w * dy).sum() / w.sum())
    n = np.hypot(sx, sy); sx, sy = sx / n, sy / n
    along = dx * sx + dy * sy
    night = (rr < 0.99) & (along < -0.40) & (box_blur(mean_gray, 6) < 0.06)
    day = (rr < 0.85) & (along > 0.30)
    haze = (rr > 1.02) & (rr < 1.10)

    fps = float(meta.get("captureFps", 0)) or 1.0
    return {
        "label": label,
        "frames": len(files),
        "seconds": len(files) / fps,
        "turns": len(files) / fps * 0.3 / (2 * np.pi),
        "night_sum": float(mean_gray[night].sum()),
        "night_mean": float(mean_gray[night].mean()),
        "day_mean": float(mean_gray[day].mean()),
        "haze_mean": float(mean_gray[haze].mean()),
        "night_px": int(night.sum()),
    }


rows = [measure(l) for l in (sys.argv[1:] or ["before-long", "after-long"])]
print(f"{'run':14} {'frames':>7} {'sec':>6} {'turns':>6} {'nightSum':>10} {'nightMean':>10} {'dayMean':>9} {'hazeMean':>9}")
for r in rows:
    print(f"{r['label']:14} {r['frames']:7} {r['seconds']:6.1f} {r['turns']:6.2f} "
          f"{r['night_sum']:10.1f} {r['night_mean']:10.5f} {r['day_mean']:9.5f} {r['haze_mean']:9.5f}")
if len(rows) > 1:
    a = rows[0]
    print()
    for b in rows[1:]:
        for k, name in (("night_sum", "night sum"), ("day_mean", "day mean"), ("haze_mean", "haze mean")):
            print(f"{b['label']:14} {name:11} {a[k]:.5g} -> {b[k]:.5g}   ({(b[k] - a[k]) / a[k] * 100:+.1f}%)")
