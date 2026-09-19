"""CROSSING detector. Judges CROSSING's C1-C3 on a run recorded by crossing.mjs.

    /usr/bin/python3 scripts/harness/crossing.py <run-dir> [<run-dir> ...]

Per frame it takes the whole frame's mean luminance, its 99th percentile, the fraction of
pixels above level 200, and the mean of each channel. From those:

  C1  the wash        max mean luminance <= C1_MEAN, max %>200 <= C1_BRIGHT_PCT
  C2  the jump        max |mean(t) - mean(t-1)| <= C2_JUMP, and no near-black frame with a
                      bright neighbour within C2_REACH frames
  C3  invented colour max |mean R - mean G| <= C3_RG
  C5  the dead stretch how much of the scroll the frame spends near black (span <= C5_SPAN)
                      and where that stretch may start (>= C5_FROM) - the criterion CROSSING v1
                      did not have, and the one its owner's eye failed it on

The bars live in the brief (docs/briefs/CROSSING-brief.md) and are repeated here so a run can
be judged without it; changing one here without changing it there is a defect.

Needs PIL and numpy (/usr/bin/python3 on this machine).
"""
import bisect
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

# C3: |R-G| reads 1.4 at the galaxy and 7.8 at the settled solar system. The v1 bar of 10 is
# what forced the fade to be COMPLETE by scroll 0.64 - the galaxy's own gold core fills the view
# from there to the swap, so obeying 10 meant blacking it out. The bar is now the ember's own
# measured split rounded up, and the reason it may move at all is that this colour is the
# galaxy's, not an invention. Ceiling 20, which is where a warm frame starts to read as a tint
# rather than as a lit object. See CROSSING-brief.md.
C3_RG = 20.0

# C5: the dead stretch. v1 shipped the frame under mean 20 across 0.444 of the whole scroll, in
# both directions, with nothing changing inside it - the owner read it as the scene switching
# off and the scroll sticking. Two numbers, because "how long" and "where" fail differently:
#
#   C5_SPAN  how much of the scroll is near black. The draft bar was 0.10 and is not reachable:
#            the swap curtain alone holds the frame under 20 across 0.111 of the scroll, which
#            follows from COVER_PLATEAU + COVER_FALLOFF in diveEnvelope and is the crossover
#            itself. 0.15 is that geometry plus room for the last of the dive to dim into it.
#   C5_FROM  where the darkness may begin: not before the curtain does. Coverage first leaves 0
#            at scroll 0.8444, so anything dark before 0.84 is the dive going dark on its own -
#            exactly v1's defect, which began at 0.556.
C5_DARK = 20.0
C5_SPAN = 0.15
C5_FROM = 0.84

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


def attach_state(run, stamps, rows):
    """Give every screencast frame the store state that was live when it was captured.

    Both clocks are epoch seconds: CDP stamps each screencast frame, and the in-page ramp
    stamps each rendered frame with Date.now(). Aligning by ramp position instead would be
    wrong - the act swap stalls for hundreds of ms, so a whole run of curtain frames would be
    filed under the dive. Frames captured before the ramp starts get the ramp's first state.
    """
    path = os.path.join(run, "samples.json")
    if not os.path.exists(path):
        return False
    samples = [s for s in json.load(open(path)) if len(s) >= 6]
    if not samples:
        return False
    clock = [s[5] for s in samples]
    for i, r in enumerate(rows):
        j = bisect.bisect_left(clock, stamps[i])
        if j and (j == len(clock) or clock[j] - stamps[i] > stamps[i] - clock[j - 1]):
            j -= 1
        r["act"], r["cov"], r["sp"] = samples[j][2], samples[j][3], samples[j][4]
        r["pre"] = stamps[i] < clock[0]
    return True


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

    # C5 needs each frame's scroll position, which attach_state supplies below.
    peak = int(np.argmax(means))
    worst_jump = int(np.argmax(jumps)) + 1

    # Diagnostic only - the criteria are judged over the whole passage, one bar each. This
    # split just says which of the two halves a failure is coming from: the dive (the
    # streak field and the veils, coverage still 0) or the curtain (SwapMask).
    phases = {}
    dark_span = None
    if attach_state(run, stamps, rows):
        # The dead stretch, measured where the passage actually is: frames captured before the
        # ramp started are the page sitting still and are not part of it.
        dark_sp = [r["sp"] for r in rows if not r.get("pre") and r["mean"] < C5_DARK]
        dark_span = round(max(dark_sp) - min(dark_sp), 4) if dark_sp else 0.0
        for name, sel in (
            ("rest", [r for r in rows if r.get("pre")]),
            ("dive", [r for r in rows if not r.get("pre") and r.get("cov") == 0]),
            ("curtain", [r for r in rows if not r.get("pre") and r.get("cov", 0) > 0]),
        ):
            if sel:
                phases[name] = {
                    "n": len(sel),
                    "mean": round(max(r["mean"] for r in sel), 1),
                    "pct200": round(max(r["pct200"] for r in sel), 2),
                    "rg": round(max(abs(r["r"] - r["g"]) for r in sel), 1),
                }

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
        "phases": phases,
        "settled_mean": round(float(np.mean(means[-15:])), 1),
        "dark_span": dark_span,
        "dark_sp_range": ([round(min(r["sp"] for r in rows if not r.get("pre") and r["mean"] < C5_DARK), 3),
                           round(max(r["sp"] for r in rows if not r.get("pre") and r["mean"] < C5_DARK), 3)]
                          if dark_span else None),
        "C1": "PASS" if max(means) <= C1_MEAN and max(r["pct200"] for r in rows) <= C1_BRIGHT_PCT else "FAIL",
        "C2": "PASS" if max(jumps) <= C2_JUMP and not holes else "FAIL",
        "C3": "PASS" if max(rg) <= C3_RG else "FAIL",
        # A run whose state could not be attached cannot answer C5 at all, and says so rather
        # than passing by default.
        "C5": (("PASS" if dark_span <= C5_SPAN
                and (not dark_span or min(r["sp"] for r in rows if not r.get("pre") and r["mean"] < C5_DARK) >= C5_FROM)
                else "FAIL") if dark_span is not None else "UNKNOWN"),
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
