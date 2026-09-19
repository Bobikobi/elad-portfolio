#!/usr/bin/env python3
"""
P4-1, measured over a full turn of Mars instead of at one arbitrary frame.

    TAG=turn-on                       node scripts/harness/mars-turn.mjs
    TAG=turn-off EXTRA_QS=noRolloff   node scripts/harness/mars-turn.mjs
    python3 scripts/harness/mars-turn.py turn-on            # one turn
    python3 scripts/harness/mars-turn.py turn-on turn-off   # and the rolloff's effect per longitude

WHY. Mars keeps spinning inside its own focused world: SolarAct gates the heliocentric
revolution on `focusedPlanet` but not the axial spin (`rotation.y += dt * 0.3`), so a single
capture sees whichever longitude happens to face the camera. Measured 2026-09-14: the same
harness on the same code, minutes apart, read 0.09% and 0.29% of the disc clipped, and two
harnesses read 0.08% and 1.87%. A clipping criterion taken at one frame is measuring the clock.
ExposureToneMap's constants were tuned "at the worst longitude", so the criterion is the worst
longitude, and this reports it.

INPUT (written by mars-turn.mjs), .harness-out/mars-turn/<TAG>-capture.json:
    { "tag", "base", "extraQs", "stepsPerSample", "stepsPerTurn",
      "samples": [ { "index", "steps", "angleRad", "file", "elapsedTime",
                     "hud": { "x", "y", "px" } }, ... ],
      "closing":   { same fields - one full turn after sample 0 } }

GEOMETRY comes from each sample's own HUD disc (95% of the projected radius, as p3-albedo and
sun-3 both use), never from a fit and never from another run - standing rule 6. If the disc's
CENTRE moves by more than half a pixel the camera is still flying in, and it refuses. Its SIZE
is allowed to move, and is reported: measured 2026-09-15, the orbit framing breathes, radius
318 -> 306 -> 313 px over the turn as a smooth wave of ~30s period, while the centre holds at
(1022.40, 396.00) to two decimals. The first version refused on size and was wrong about the
scene. Per-shot geometry makes the breathing harmless to the clip percentage.

THE CLOSING SAMPLE is one turn after sample 0. It checks that only the spin moved. It is not
expected to be byte-identical: Mars's dust haze drifts on the scene clock, independent of the
rotation. Measured 2026-09-15 it is also moved by two things that are NOT the spin: the orbit
framing's size breathes (radius 306-318px, ~30s) and CameraRig's lit target wobbles (periods 114s
and 299s). One turn later the frame changed on 91% of pixels (mean 8.9) while the clip figure
matched within 0.2 points. So compare the clip figures; the frame diff is expected to be large.
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image

OUT = os.environ.get("OUT", os.path.join(os.getcwd(), ".harness-out", "mars-turn"))
LUMA = np.array([0.2126, 0.7152, 0.0722])
CLIP = int(os.environ.get("CLIP_THRESHOLD", 250))
DISC_FRACTION = 0.95
MAX_CENTRE_MOVE_PX = 0.5


def load(tag):
    with open(os.path.join(OUT, f"{tag}-capture.json"), encoding="utf-8") as handle:
        return json.load(handle)


def image(sample):
    return np.asarray(Image.open(os.path.join(OUT, sample["file"])).convert("RGB")).astype(int)


def disc_mask(shape, hud):
    height, width = shape[:2]
    cx, cy, r = float(hud["x"]), float(hud["y"]), float(hud["px"]) / 2 * DISC_FRACTION
    if cx - r < 0 or cx + r >= width or cy - r < 0 or cy + r >= height:
        raise ValueError("Mars's disc is cut by the capture edge")
    yy, xx = np.mgrid[0:height, 0:width]
    return np.hypot(xx - cx, yy - cy) <= r, (cx, cy, float(hud["px"]) / 2)


def measure(sample):
    im = image(sample)
    mask, (cx, cy, radius) = disc_mask(im.shape, sample["hud"])
    px = im[mask]
    any_clip = px.max(axis=1) > CLIP
    row = {
        "index": sample["index"],
        "elapsedTime": float(sample["elapsedTime"]),
        "steps": sample["steps"],
        "degrees": math.degrees(sample["angleRad"]) % 360,
        "discPixels": int(mask.sum()),
        "clipAny": int(any_clip.sum()),
        "clipAnyPercent": float(any_clip.mean() * 100),
        "clipAll": int((px.min(axis=1) > CLIP).sum()),
        "meanLum": float((px @ LUMA).mean()),
        "chroma": float(((px.max(axis=1) - px.min(axis=1)) / 255.0).mean()),
        "radius": radius,
        "cx": cx,
        "cy": cy,
    }
    if any_clip.any():
        yy, xx = np.nonzero(mask)
        cyc, cxc = yy[any_clip], xx[any_clip]
        row["clipRadial"] = float(np.hypot(cxc - cx, cyc - cy).mean() / radius)
    return row, im


def summarise(capture):
    rows, first = [], None
    for sample in capture["samples"]:
        row, im = measure(sample)
        rows.append(row)
        if first is None:
            first = im
    radii = [r["radius"] for r in rows]
    drift = (max(radii) - min(radii)) / (sum(radii) / len(radii))
    centre_move = max(math.hypot(r["cx"] - rows[0]["cx"], r["cy"] - rows[0]["cy"]) for r in rows)
    if centre_move > MAX_CENTRE_MOVE_PX:
        raise SystemExit(f"REFUSED: Mars's disc centre moved {centre_move:.2f}px across the turn - "
                         f"the camera was still flying in, so shots are not the same framing")
    closing = None
    if capture.get("closing"):
        c_row, c_im = measure(capture["closing"])
        diff = np.abs(c_im - first)
        closing = {"row": c_row, "frameMean": float(diff.mean()), "frameMax": int(diff.max()),
                   "pixelsChangedPercent": float((diff.max(axis=2) > 0).mean() * 100)}
    return rows, drift, centre_move, closing


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    tag = sys.argv[1]
    cap = load(tag)
    rows, drift, centre_move, closing = summarise(cap)
    # A capture that crashed part-way still leaves a valid manifest (it is written after every
    # shot), so "worst" must say how much of the turn it is the worst OF. Missing `complete` is
    # treated as incomplete: an unknown turn is not a full one.
    complete = bool(cap.get("complete"))
    coverage = (rows[-1]["steps"] - rows[0]["steps"]) / cap["stepsPerTurn"] * 360 if len(rows) > 1 else 0.0
    scope = "over the full turn" if complete else f"over a PARTIAL turn - {len(rows)} samples covering {coverage:.0f} of 360 deg"
    if not complete:
        print(f"!! PARTIAL: the capture did not finish (no closing sample). Every figure below is {scope}.\n")
    print(f"Mars {scope} - `{tag}` {cap.get('extraQs') or '(rolloff on)'}   "
          f"{len(rows)} samples, {cap['stepsPerSample']} steps apart, turn = {cap['stepsPerTurn']:.1f} steps   "
          f"centre moved {centre_move:.2f}px   radius range {min(r['radius'] for r in rows):.1f}-{max(r['radius'] for r in rows):.1f}px ({drift*100:.2f}%, the framing's breathing)")
    print(f"{'#':>3} {'deg':>6} {'disc px':>8} {'clip any':>9} {'%':>7} {'all':>5} {'mean lum':>9} {'chroma':>7} {'clip at r':>9}")
    for r in rows:
        at = f"{r['clipRadial']:.2f}R" if "clipRadial" in r else "-"
        print(f"{r['index']:>3} {r['degrees']:>6.1f} {r['discPixels']:>8} {r['clipAny']:>9} {r['clipAnyPercent']:>6.2f}% "
              f"{r['clipAll']:>5} {r['meanLum']:>9.1f} {r['chroma']:>7.4f} {at:>9}")
    pct = np.array([r["clipAnyPercent"] for r in rows])
    worst = rows[int(pct.argmax())]
    best = rows[int(pct.argmin())]
    print(f"\nclip {scope}:  WORST {worst['clipAnyPercent']:.3f}% at {worst['degrees']:.1f} deg   "
          f"median {np.median(pct):.3f}%   best {best['clipAnyPercent']:.3f}% at {best['degrees']:.1f} deg   "
          + (f"worst/best {pct.max() / pct.min():.1f}x" if pct.min() > 0
             else f"{int((pct == 0).sum())} of {len(pct)} longitudes clip nothing"))
    if closing:
        print(f"closing sample, one turn after #0: clip {closing['row']['clipAnyPercent']:.3f}% vs #0 {rows[0]['clipAnyPercent']:.3f}%   "
              f"frame diff mean {closing['frameMean']:.3f} max {closing['frameMax']}   "
              f"{closing['pixelsChangedPercent']:.2f}% of pixels changed")
        print("   (not an identity check: the framing's size breathes and the lit target wobbles on their own clocks, "
              "so the pixels move; compare the clip figures)")

    report = {"tag": tag, "centreMovePx": centre_move, "complete": complete, "coverageDegrees": coverage, "rows": rows, "radiusDrift": drift, "closing": closing,
              "worst": worst, "best": best, "median": float(np.median(pct))}

    if len(sys.argv) > 2:
        other_tag = sys.argv[2]
        other = load(other_tag)
        o_rows, _, _, _ = summarise(other)
        if len(o_rows) != len(rows) or any(a["steps"] != b["steps"] for a, b in zip(rows, o_rows)):
            raise SystemExit("REFUSED: the two turns were not sampled at the same steps")
        # Step COUNTS can agree while the turns are offset: a first shot that slipped a frame and then
        # stepped cleanly keeps every count equal. Compare absolute scene time too.
        off = [(a["index"], round((b["elapsedTime"] - a["elapsedTime"]) * 60, 3)) for a, b in zip(rows, o_rows)
               if abs(b["elapsedTime"] - a["elapsedTime"]) > 1e-6]
        if off:
            raise SystemExit(f"REFUSED: the two turns are offset in absolute scene time at shot(s) {off[:5]} (in steps)")
        print(f"\nper longitude, `{tag}` against `{other_tag}` {other.get('extraQs') or ''}")
        print(f"{'deg':>6} {'clip on':>8} {'clip off':>9} {'chroma on':>10} {'off':>7} {'taken':>7}")
        for a, b in zip(rows, o_rows):
            taken = (b["chroma"] - a["chroma"]) / b["chroma"] * 100 if b["chroma"] > 0 else 0.0
            print(f"{a['degrees']:>6.1f} {a['clipAnyPercent']:>7.2f}% {b['clipAnyPercent']:>8.2f}% "
                  f"{a['chroma']:>10.4f} {b['chroma']:>7.4f} {taken:>6.2f}%")
        o_pct = np.array([r["clipAnyPercent"] for r in o_rows])
        print(f"worst longitude: on {pct.max():.3f}%   off {o_pct.max():.3f}%")
        report["other"] = {"tag": other_tag, "rows": o_rows, "worst": float(o_pct.max())}

    path = os.path.join(OUT, f"{tag}{'-vs-' + sys.argv[2] if len(sys.argv) > 2 else ''}-turn.json")
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
    print(f"\n-> {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
