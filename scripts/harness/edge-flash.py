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
MAX_MEDIAN_GAP_MS = 40  # a whole-run sanity check: a wider median means the capture broke down

# A median cannot see a handful of dropped frames. With a few missing, the median stays near
# 33ms and the run is accepted, while LOCALLY the detector compares frames ~66ms apart as if they
# were adjacent - and a one-frame flash that happened inside the missing interval is invisible,
# so both a zero and a big count are unreliable exactly there. So every judged frame is also
# checked against its own neighbourhood, and the ones sitting next to a dropped frame are skipped
# and counted rather than reported.
#
# The bar is the run's OWN median gap, not a fixed millisecond value, because the delivered rate
# differs per page (30fps idle on /about, ~39fps on the home page during a scroll). That does not
# break standing rule 6: the median gap is a property of the capture clock, not of the scene being
# judged, so it is calibration rather than a threshold derived from the source under audit.
MAX_GAP_FACTOR = 1.5


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

    gaps = [stamps[j + 1] - stamps[j] for j in range(len(stamps) - 1)]
    gap_limit = MAX_GAP_FACTOR * sorted(gaps)[len(gaps) >> 1]

    events, mean_lum, skipped = [], [], 0
    for i in range(2, len(paths) - 2):
        for j in [k for k in L if k < i - 2]:
            del L[j], D[j]
        # every interval this frame's verdict rests on, i.e. lo+i-2 .. lo+i+2
        if max(gaps[lo + i - 2:lo + i + 2]) > gap_limit:
            skipped += 1
            continue
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

    json.dump(events, open(os.path.join(run, "events.json"), "w"))
    summary = {
        "tag": meta["tag"], "route": meta["route"], "window_s": [t_from, round(t_to, 3)],
        "frames_scanned": len(paths) - 4,
        "frames_judged": len(paths) - 4 - skipped,
        "frames_skipped_dropped_neighbour": skipped,
        "gap_limit_ms": round(gap_limit * 1000, 1),
        "flash_frames": len(events),
        "big_flashes": sum(e["px"] >= BIG_PX for e in events),
        "mean_luminance": round(float(np.mean(mean_lum)), 2),
        "fps": meta["fps"], "median_gap_ms": meta["medianGapMs"], "gpu": meta["gpu"],
    }
    print(json.dumps(summary))
    return 0


if __name__ == "__main__":
    sys.exit(main())
