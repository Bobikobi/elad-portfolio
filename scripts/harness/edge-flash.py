"""EDGE-FLASH detector. Counts one-frame flashes in a run recorded by edge-flash.mjs.

    python3 scripts/harness/edge-flash.py <run-dir> [from_s] [to_s]

A flash pixel is one that is more than THRESHOLD levels brighter in frame t than every pixel
within 1px of it in the two frames before and the two frames after. The 1px dilation keeps a
body that drifts by a pixel from counting; the two-frame reach keeps a slow brightening from
counting. A frame with any flash pixel is a "flash frame"; a frame with at least BIG_PX flash
pixels is a "big flash" - the white blob bloom makes out of one runaway pixel.

The window is in seconds from the first recorded frame. Writes <run-dir>/events.json.
Needs PIL and numpy (/usr/bin/python3 on this machine).
"""
import bisect
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

THRESHOLD = 80
BIG_PX = 200
MAX_MEDIAN_GAP_MS = 40  # an idle page renders at 30fps; a wider gap means frames were dropped


def lum(path):
    return np.asarray(Image.open(path).convert("L"), dtype=np.int16)


def dilate(a):
    return np.asarray(Image.fromarray(a.astype(np.uint8)).filter(ImageFilter.MaxFilter(3)), dtype=np.int16)


def main():
    run = sys.argv[1]
    meta = json.load(open(os.path.join(run, "meta.json")))
    stamps = json.load(open(os.path.join(run, "stamps.json")))
    t_from = float(sys.argv[2]) if len(sys.argv) > 2 else 0.0
    t_to = float(sys.argv[3]) if len(sys.argv) > 3 else stamps[-1] - stamps[0]
    if meta["medianGapMs"] > MAX_MEDIAN_GAP_MS:
        print(f"NOT MEASURED: median frame gap {meta['medianGapMs']}ms > {MAX_MEDIAN_GAP_MS}ms, frames were dropped")
        return 2
    lo = bisect.bisect_left(stamps, stamps[0] + t_from)
    hi = bisect.bisect_right(stamps, stamps[0] + t_to)
    paths = [os.path.join(run, "frames", f"f{i:05d}.jpg") for i in range(lo, hi)]
    if len(paths) < 5:
        print("NOT MEASURED: fewer than 5 frames in the window")
        return 2

    L, D = {}, {}

    def get(i):
        if i not in L:
            L[i] = lum(paths[i])
            D[i] = dilate(L[i])
        return L[i], D[i]

    events, mean_lum = [], []
    for i in range(2, len(paths) - 2):
        cur, _ = get(i)
        around = np.maximum.reduce([get(j)[1] for j in (i - 2, i - 1, i + 1, i + 2)])
        spike = cur - around
        mean_lum.append(float(cur.mean()))
        ys, xs = np.nonzero(spike > THRESHOLD)
        if len(ys):
            events.append({
                "frame": lo + i, "t": round(stamps[lo + i] - stamps[0], 3), "px": int(len(ys)),
                "peak": int(spike.max()), "x": int(np.median(xs)), "y": int(np.median(ys)),
                "box": [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
            })
        for j in [k for k in L if k < i - 1]:
            del L[j], D[j]

    json.dump(events, open(os.path.join(run, "events.json"), "w"))
    summary = {
        "tag": meta["tag"], "route": meta["route"], "window_s": [t_from, round(t_to, 3)],
        "frames_scanned": len(paths) - 4, "flash_frames": len(events),
        "big_flashes": sum(e["px"] >= BIG_PX for e in events),
        "mean_luminance": round(float(np.mean(mean_lum)), 2),
        "fps": meta["fps"], "median_gap_ms": meta["medianGapMs"], "gpu": meta["gpu"],
    }
    print(json.dumps(summary))
    return 0


if __name__ == "__main__":
    sys.exit(main())
