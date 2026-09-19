"""CROSSING detector. Judges CROSSING's C1-C3 on a run recorded by crossing.mjs.

    /usr/bin/python3 scripts/harness/crossing.py <run-dir> [<run-dir> ...]

Per frame it takes the whole frame's mean luminance, its 99th percentile, the fraction of
pixels above level 200, and the mean of each channel. From those:

  C1  the wash        max mean luminance <= C1_MEAN, max %>200 <= C1_BRIGHT_PCT
  C2  the jump        max |mean(t) - mean(t-1)| <= C2_JUMP, and no near-black frame with a
                      bright neighbour within C2_REACH frames
  C3  invented colour max |mean R - mean G| <= C3_RG

The bars live in the brief (docs/briefs/CROSSING-brief.md) and are repeated here so a run can
be judged without it; changing one here without changing it there is a defect.

Needs PIL and numpy (/usr/bin/python3 on this machine).
"""
import json
import os
import sys

import numpy as np
from PIL import Image

# C1: the galaxy at rest measures 76.1 mean / 7.30% above 200 ON THIS INSTRUMENT, and it is the
# brightest thing the visitor is already looking at when the passage starts. Rounded up.
# These are NOT the 56.6 / 1.81% in the brief's first table: that came from the edge-flash
# recordings, which keep the DOM on screen. The two scales do not convert.
C1_MEAN = 80.0
C1_BRIGHT_PCT = 8.0

# C2: the settled solar system's own mean is 30.6, so a 25-level step is under one settled
# scene's worth of change in a single frame. A bar on violence, not on speed.
C2_JUMP = 25.0
# The near-black clause. Master already passes it here - the frame held during the act-swap
# stall is the bright one, not a black one - so it is a guard, not a proof. The black frame
# in the edge-flash recordings is only visible to a capture with the DOM live; see the brief.
C2_DARK = 20.0     # "near black"
C2_BRIGHT = 100.0  # "bright"
C2_REACH = 3       # frames either side

# C3: |R-G| reads 1.4 at the galaxy and 7.8 at the settled solar system. 10 is just past the
# looser end.
C3_RG = 10.0

LUMA = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)


def stats(path):
    a = np.asarray(Image.open(path).convert("RGB"), dtype=np.float32)
    l = a @ LUMA
    return {
        "mean": float(l.mean()),
        "p99": float(np.percentile(l, 99)),
        "pct200": float(100.0 * (l > 200).mean()),
        "r": float(a[..., 0].mean()),
        "g": float(a[..., 1].mean()),
        "b": float(a[..., 2].mean()),
    }


def judge(run):
    meta = json.load(open(os.path.join(run, "meta.json")))
    stamps = json.load(open(os.path.join(run, "stamps.json")))
    rows = [stats(os.path.join(run, "frames", f"f{i:05d}.jpg")) for i in range(len(stamps))]
    if len(rows) < 10:
        return {"tag": meta["tag"], "error": "fewer than 10 frames"}

    means = [r["mean"] for r in rows]
    jumps = [abs(means[i] - means[i - 1]) for i in range(1, len(means))]
    rg = [abs(r["r"] - r["g"]) for r in rows]

    # The near-black frame sandwiched inside a bright wash: the defect the curtain creates.
    holes = []
    for i, m in enumerate(means):
        if m >= C2_DARK:
            continue
        lo, hi = max(0, i - C2_REACH), min(len(means), i + C2_REACH + 1)
        if max(means[lo:i] + means[i + 1:hi] or [0.0]) > C2_BRIGHT:
            holes.append({"frame": i, "t": round(stamps[i] - stamps[0], 3), "mean": round(m, 1)})

    peak = int(np.argmax(means))
    worst_jump = int(np.argmax(jumps)) + 1
    out = {
        "tag": meta["tag"], "gpu": meta["gpu"], "fixedStep": meta.get("fixedStep"),
        "frames": len(rows), "fps": meta["fps"], "median_gap_ms": meta["medianGapMs"],
        "ramp_frames": meta.get("rampFrames"), "ramp_rendered": meta.get("rampRenderedFrames"),
        "swap_at_ramp_fraction": meta.get("swapAtRampFraction"),
        "max_mean": round(max(means), 1),
        "max_mean_at_t": round(stamps[peak] - stamps[0], 3),
        "max_pct200": round(max(r["pct200"] for r in rows), 2),
        "max_jump": round(max(jumps), 1),
        "max_jump_at_t": round(stamps[worst_jump] - stamps[0], 3),
        "max_abs_rg": round(max(rg), 1),
        "dark_holes": holes,
        "settled_mean": round(float(np.mean(means[-15:])), 1),
        "C1": "PASS" if max(means) <= C1_MEAN and max(r["pct200"] for r in rows) <= C1_BRIGHT_PCT else "FAIL",
        "C2": "PASS" if max(jumps) <= C2_JUMP and not holes else "FAIL",
        "C3": "PASS" if max(rg) <= C3_RG else "FAIL",
    }
    json.dump({"meta": meta, "rows": rows}, open(os.path.join(run, "frames.json"), "w"))
    return out


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    for run in sys.argv[1:]:
        print(json.dumps(judge(run)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
