"""
NIGHT-LIGHTS analysis. Reads a consecutive-frame set from night-lights-capture.mjs and
answers the four acceptance questions with numbers.

    python3 scripts/harness/night-lights-analyse.py .harness-out/night-before

The defect being measured: the city lights on Earth's dark hemisphere are one-to-two
texels wide in a 2048x1024 map, land on roughly one screen pixel, and the globe turns
about 2.5 px per rendered frame. Each light therefore jumps to a different pixel every
frame with nothing in between, and strobes. The tell is that the TOTAL light in the
region holds steady while INDIVIDUAL pixels swing - energy hopping between neighbours,
which is aliasing, not lights switching on and off.

Three choices that the numbers depend on, so they are stated rather than buried:

* The night side is cut GEOMETRICALLY, not by brightness. The disc's centre and radius
  come from __labelProbe; the sun's direction is the disc's own luminance centroid. A
  brightness cut would move when the fix changes brightness, and then before/after would
  be measuring two different regions.
* Points are MATCHED between consecutive frames, not read at fixed coordinates. The globe
  rotates; a fixed-coordinate reading calls "a different city arrived here" a flicker.
  Match radius is derived from the measured per-frame displacement, not assumed.
* A point with no match in the next frame is counted as VANISHED - that is criterion 2,
  and it is the failure mode the eye actually names as twinkling.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".harness-out/night-before")
meta = json.loads((root / "meta.json").read_text())
files = sorted(root.glob("f*.png"))
if len(files) < 8:
    sys.exit(f"need at least 8 frames in {root}, found {len(files)}")

frames = [np.asarray(Image.open(f).convert("RGB"), dtype=np.float32) / 255.0 for f in files]
H, W, _ = frames[0].shape
grays = [f @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32) for f in frames]


def box_blur(a, r):
    """Mean over a (2r+1) square via a summed-area table. No scipy in this repo.

    The SAT needs a leading zero row and column; without them every lookup is off by one
    and the result is garbage that still looks like an image."""
    n = 2 * r + 1
    pad = np.pad(a.astype(np.float64), r, mode="edge")
    s = np.zeros((pad.shape[0] + 1, pad.shape[1] + 1), dtype=np.float64)
    s[1:, 1:] = pad.cumsum(0).cumsum(1)
    y, x = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    total = s[y + n, x + n] - s[y, x + n] - s[y + n, x] + s[y, x]
    return (total / (n * n)).astype(np.float32)


# --- geometry --------------------------------------------------------------------
cx, cy, R = meta["planet"]["x"], meta["planet"]["y"], meta["planet"]["rPx"]
yy, xx = np.mgrid[0:H, 0:W]
dx = (xx - cx) / R
dy = (yy - cy) / R
rr = np.sqrt(dx * dx + dy * dy)

mean_gray = np.mean(grays, axis=0)
inner = rr < 0.95
# The sub-solar direction: the luminance centroid of the disc, relative to its centre.
# Rotation does not move it (the sun and camera do not move with the spin), so it is the
# one axis that is stable across two separate runs.
w = np.clip(mean_gray, 0, None) * inner
sx = float((w * dx).sum() / max(w.sum(), 1e-6))
sy = float((w * dy).sum() / max(w.sum(), 1e-6))
sn = max((sx * sx + sy * sy) ** 0.5, 1e-6)
sx, sy = sx / sn, sy / sn
along = dx * sx + dy * sy  # +1 toward the sub-solar point, -1 at the anti-solar point

# The night side, cut three ways. The geometric cut alone is not enough: the lit crescent
# wraps past the terminator and the atmosphere shell puts a bright rim right around the
# limb, and at `along < -0.25, rr < 0.97` those two carry the region's p90 to 0.28 - ten
# times the level the city lights actually sit on. The brightness cut is taken from the
# TIME-AVERAGED frame, so it is a property of the region rather than of any one frame, and
# it is nowhere near its threshold (region mean 0.021 against a 0.06 bar) - a fix that
# moves the night brightness by the 10% criterion 3 allows cannot move this mask. The
# pixel count is reported for both runs so that if it ever did move, it would show.
night = (rr < 0.99) & (along < -0.40) & (box_blur(mean_gray, 6) < 0.06)
day = (rr < 0.85) & (along > 0.30)
haze = (rr > 1.02) & (rr < 1.10)

# --- per-frame displacement -----------------------------------------------------------
# Taken from the scene's own spin rate, not from the image. Correlating two frames was
# tried first and it is not trustworthy on this content: the lit hemisphere is large,
# bright and smooth, so the sum-of-squares has a shallow minimum near zero shift and the
# estimate collapses toward it. Two runs of the same unchanged build came back with 4.0
# and 1.0 px, and the second one dragged the match radius down with it and turned 1% of
# points "vanishing" into 28%. The spin is a constant in the source - Planet's useFrame
# does `rotation.y += dt * SPIN` - so the displacement at the sub-camera point is just
# geometry, and it cannot wobble between runs.
SPIN = float(__import__("os").environ.get("SPIN", 0.3))  # rad/s, SolarAct Planet useFrame
render_fps = float(meta.get("realFps", 60.0)) or 60.0
ratio_raw = float(meta.get("sampleRatio", 1.0)) or 1.0
disp_render = SPIN / render_fps * R          # px between two RENDERED frames
disp = disp_render * ratio_raw               # px between two CAPTURED frames
MATCH_R = max(4.0, 2.5 * disp)

# --- bright points on the night side -------------------------------------------------
# City lights are dim in absolute terms, so the bar is set against the point's OWN local
# background rather than a global level. It is NOT set as low as it will go: at 0.02 the
# detector returned 1,172 "points" per frame over a region that holds a few hundred cities,
# and the extra thousand were film grain and terrain - their steps are small, so they
# dragged the median down to 19% and made a badly aliasing scene look like it was already
# inside the acceptance bar. At 0.04 the detections land on Europe, the Middle East and the
# African coast and nowhere else, which was checked against a marked-up frame rather than
# assumed. Between 0.03 and 0.08 the count moves 370 -> 186 and the verdict does not change.
TOPHAT = float(sys.argv[2]) if len(sys.argv) > 2 else 0.040
BG_MAX = 0.06
MIN_PEAK = 0.06


def points_of(g):
    bg = box_blur(g, 4)
    hat = g - bg
    m = (hat > TOPHAT) & (bg < BG_MAX) & (g > MIN_PEAK) & night
    for ddy in (-1, 0, 1):
        for ddx in (-1, 0, 1):
            if ddy == 0 and ddx == 0:
                continue
            m &= hat >= np.roll(np.roll(hat, ddy, 0), ddx, 1)
    return m


def peak_of(g, pts):
    return np.array([g[max(0, y - 1):y + 2, max(0, x - 1):x + 2].max() for y, x in pts], dtype=np.float32)


def blob_width(g, pts):
    """Equivalent diameter of the pixels at or above half the peak, in an 11x11 window.
    A point that is genuinely one pixel wide reports ~1.1; a properly band-limited one
    reports 2.5 and up, which is the width at which 2.5 px of motion per frame still
    overlaps itself and so cannot strobe."""
    out = []
    for y, x in pts:
        win = g[max(0, y - 5):y + 6, max(0, x - 5):x + 6]
        pk = win.max()
        if pk <= 0:
            continue
        area = float((win >= 0.5 * pk).sum())
        out.append(2.0 * np.sqrt(area / np.pi))
    return np.array(out, dtype=np.float32)


pts_per_frame = [np.argwhere(points_of(g)) for g in grays]
lum_per_frame = [peak_of(g, p) for g, p in zip(grays, pts_per_frame)]

steps = []
vanished = 0
tracked = 0
for i in range(len(grays) - 1):
    a, b = pts_per_frame[i], pts_per_frame[i + 1]
    la, lb = lum_per_frame[i], lum_per_frame[i + 1]
    if len(a) == 0:
        continue
    if len(b) == 0:
        vanished += len(a)
        tracked += len(a)
        continue
    d = np.sqrt(((a[:, None, :].astype(np.float32) - b[None, :, :].astype(np.float32)) ** 2).sum(axis=2))
    j = d.argmin(axis=1)
    ok = d[np.arange(len(a)), j] <= MATCH_R
    tracked += len(a)
    vanished += int((~ok).sum())
    if ok.any():
        steps.append(np.abs(lb[j[ok]] - la[ok]) / np.maximum(la[ok], 0.02))

steps = np.concatenate(steps) if steps else np.zeros(1)
widths = np.concatenate([blob_width(g, p) for g, p in zip(grays, pts_per_frame) if len(p)]) \
    if any(len(p) for p in pts_per_frame) else np.zeros(1)

# --- region levels -------------------------------------------------------------------
night_sum = float(np.mean([g[night].sum() for g in grays]))
night_mean = float(np.mean([g[night].mean() for g in grays]))
day_mean = float(np.mean([g[day].mean() for g in grays]))
haze_mean = float(np.mean([g[haze].mean() for g in grays]))

# Whole-region churn: the second temporal difference, which is high when a pixel is
# strobing and low when it is simply being carried past by the rotation.
gs = np.stack(grays)
churn = float(np.abs(gs[2:] - 2 * gs[1:-1] + gs[:-2]).mean(axis=0)[night].mean())

# The rate the captured frames were sampled at, and the rate the page actually rendered
# at. The screencast is slower than the page, so the rotation between two captured frames
# is several rendered frames' worth - which happens to put this harness at about the 23 fps
# of the screen recording the complaint came from, but the per-RENDERED-frame figure has to
# be derived rather than assumed.
ratio = ratio_raw

# The criterion that does not care what rate anything ran at: is a light wider than the
# distance it travels between two frames? Under 1.0 the two positions of the same light do
# not overlap, so it cannot be seen to move - only to blink somewhere else. That is the
# defect, stated as a ratio.
overlap_capture = None  # filled in below, once the widths are known

out = {
    "label": meta.get("LABEL"),
    "frames": len(frames),
    "capture_fps": round(meta.get("captureFps", 0), 1),
    "render_fps": round(meta.get("realFps", 0), 1),
    "sample_ratio": round(ratio, 2),
    "disp_per_render_frame_px": round(disp_render, 2),
    "disc_px": round(2 * R, 1),
    "sun_dir": [round(sx, 3), round(sy, 3)],
    "disp_px_per_frame": disp,
    "match_radius_px": round(MATCH_R, 1),
    "points_per_frame": round(float(np.mean([len(p) for p in pts_per_frame])), 1),
    "step_median_pct": round(float(np.median(steps)) * 100, 1),
    "step_p90_pct": round(float(np.percentile(steps, 90)) * 100, 1),
    "step_over_20pct": round(float((steps > 0.20).mean()) * 100, 1),
    "vanished_pct": round(100 * vanished / max(tracked, 1), 2),
    "vanished_count": vanished,
    "blob_width_median_px": round(float(np.median(widths)), 2),
    "overlap_vs_capture": round(float(np.median(widths)) / max(disp, 1e-6), 2),
    "overlap_vs_render": round(float(np.median(widths)) / max(disp_render, 1e-6), 2),
    "night_px": int(night.sum()),
    "night_sum": round(night_sum, 1),
    "night_mean": round(night_mean, 5),
    "day_mean": round(day_mean, 5),
    "haze_mean": round(haze_mean, 5),
    "night_churn": round(churn, 5),
    "night_churn_rel": round(churn / max(night_mean, 1e-6), 3),
}
(root / "night-metrics.json").write_text(json.dumps(out, indent=2))

print(f"{out['label']}  {out['frames']} frames  captured {out['capture_fps']} fps / rendered "
      f"{out['render_fps']} fps (x{out['sample_ratio']})   disc {out['disc_px']} px   night {out['night_px']} px")
print(f"  rotation            {disp:.1f} px per captured frame  =  {disp_render:.1f} px per rendered frame")
print(f"  night-light points  {out['points_per_frame']} per frame  (top-hat {TOPHAT}, match radius {MATCH_R:.1f} px)")
print(f"C1 step p90           {out['step_p90_pct']}%   median {out['step_median_pct']}%"
      f"   over 20%: {out['step_over_20pct']}% of steps")
print(f"C2 vanished           {out['vanished_count']} of {tracked} ({out['vanished_pct']}%)")
print(f"C3 blob width         {out['blob_width_median_px']} px  ->  overlap {out['overlap_vs_capture']}x per captured "
      f"frame, {out['overlap_vs_render']}x per rendered frame")
print(f"C4 day {out['day_mean']:.5f}   haze {out['haze_mean']:.5f}   night mean {out['night_mean']:.5f}"
      f"   night sum {out['night_sum']}")
print(f"   night churn        {out['night_churn']:.5f} absolute = {out['night_churn_rel']:.2f}x the region mean"
      f"  (2nd temporal difference)")
