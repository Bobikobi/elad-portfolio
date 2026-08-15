#!/usr/bin/env python3
"""
SUN-3 - the five criteria, measured off the captures `sun-3.mjs` wrote.

    python3 scripts/harness/sun-3.py [TAG]

C1  red gradient   sRGB red at the limb <= 0.90 x red at the centre.
                   The defect this stage exists for: the sun's red channel measured 225
                   +- 0.31 across 100% of the disc, so every bit of shading lived in green
                   and blue only and the star read as a flat plate.
C2  sphericity     luminance at the limb 0.80-0.88 x centre, and falling monotonically
                   (measured on 10 radial bins, allowing one bin of noise).
C3  prominences    longest tip <= 1.25 x the disc radius, and spikes covering <= 15% of the
                   circumference.
C4  planet clip    zero pixels outside the sun with all three channels > 235.
C5  hero stars     no background-star sprite wider than 20 CSS px.

REGRESSION  Mars's disc must not start clipping again - that is what the rolloff constants
            in ExposureToneMap were tuned for, and C1/C2/C4 all pull on those constants.

The disc is located by fitting a circle to the silhouette with the prominence spikes
rejected, NOT by a brightness centroid: the spikes are bright and lopsided, and a centroid
walks toward them, which moves the centre and quietly flatters the radial profile.
"""
import json
import sys
import os
from collections import deque

import numpy as np
from PIL import Image

OUT = os.environ.get("OUT", os.path.join(os.getcwd(), ".harness-out", "sun-3"))
TAG = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("TAG", "now")
LUMA = np.array([0.2126, 0.7152, 0.0722])


def load(name):
    im = np.asarray(Image.open(os.path.join(OUT, name)).convert("RGB")).astype(float)
    return im, im @ LUMA


def trace(lum, cx, cy, r0, r1, th, n=1440):
    """Outermost radius along each of n rays where luminance is still above `th`."""
    H, W = lum.shape
    a = 2 * np.pi * np.arange(n) / n
    rr = np.arange(r0, r1, 0.4)
    px = (cx + np.cos(a)[:, None] * rr).astype(int)
    py = (cy + np.sin(a)[:, None] * rr).astype(int)
    ok = (px >= 0) & (px < W) & (py >= 0) & (py < H)
    vals = np.where(ok, lum[np.clip(py, 0, H - 1), np.clip(px, 0, W - 1)], 0)
    out = np.full(n, np.nan)
    for k in range(n):
        idx = np.nonzero(vals[k] > th)[0]
        if len(idx):
            out[k] = rr[idx[-1]]
    return a, out


def foreign_circles(im, rn, dpr):
    """Where another object sits in the annulus, as (cx, cy, r) circles to stay out of.

    The bodies nearest the sun blow out to white and carry a warm glow skirt that fades
    outward through exactly the colours a prominence has. Warmth cannot separate them and
    neither can "stop at the first blown pixel" - a ray reaching Venus meets the skirt long
    before the white. So the blown core is found first and the whole neighbourhood is
    excluded, skirt and all.
    """
    clip = (im.min(axis=-1) > 235) & (rn > 1.02)
    clip[: int(100 * dpr), :] = False
    out = []
    for b in blobs(clip):
        if len(b) < 200:
            continue
        a = np.array(b)
        r = np.sqrt(len(b) / np.pi)
        out.append((a[:, 1].mean(), a[:, 0].mean(), r * 2.4))  # 2.4x covers the bloom skirt
    return out


def spike_extent(im, lum, cx, cy, R, margin, warm, n=2880, rmax=2.6, gap=0.05, avoid=()):
    """Per ray: how far a spike reaches while staying attached to the limb.

    A spike is measured as EXCESS over the corona, not as absolute brightness, and that
    distinction is the whole instrument. An absolute threshold cannot work here: put it low
    and the sun's own halo - which is rotationally symmetric and reaches everywhere - counts
    as a spike on 100% of the circumference; put it high enough to exclude the halo and the
    long pale rays that are the actual complaint fall under the bar, because they are faint.
    They are visible for being LOCAL, so that is what gets measured: each ray against the
    median of all rays at the same radius, which is the halo with the spikes averaged out.

    Two more guards:
      - warmth, because a prominence is additive gold and a blown-out planet is neutral, and
        the planets nearest the sun bridge to the limb through their own bloom skirt;
      - contiguity outward from the limb, with `gap` (in units of R) of slack, so one dark
        pixel does not end a prominence and a real gap to a separate object does.
    """
    H, W = lum.shape
    a = 2 * np.pi * np.arange(n) / n
    rr = np.arange(R * 0.99, R * rmax, 0.4)
    px = (cx + np.cos(a)[:, None] * rr).astype(int)
    py = (cy + np.sin(a)[:, None] * rr).astype(int)
    ok = (px >= 0) & (px < W) & (py >= 0) & (py < H)
    yy, xx = np.clip(py, 0, H - 1), np.clip(px, 0, W - 1)
    L = np.where(ok, lum[yy, xx], np.nan)
    halo = np.nanmedian(L, axis=0)
    r_, b_ = im[..., 0][yy, xx], im[..., 2][yy, xx]
    isWarm = (r_ - b_) / np.maximum(r_, 1) > warm
    foreign = np.zeros_like(ok)
    for fx, fy, fr in avoid:
        foreign |= (px - fx) ** 2 + (py - fy) ** 2 < fr * fr
    live = (L - halo[None, :] > margin) & isWarm & ok & ~foreign
    run = max(1, int(round(gap * R / 0.4)))
    out = np.full(n, 1.0)
    for k in range(n):
        v = live[k]
        stop, miss = len(v), 0
        for i in range(len(v)):
            if v[i]:
                miss = 0
            else:
                miss += 1
                if miss >= run:
                    stop = i - miss + 1
                    break
        idx = np.nonzero(v[:stop])[0]
        if len(idx):
            out[k] = rr[idx[-1]] / R
    return out


def fit_disc(lum, cx, cy, R_hint, th):
    """Least-squares circle on the silhouette, spikes rejected each iteration."""
    for _ in range(10):
        a, r = trace(lum, cx, cy, R_hint * 0.72, R_hint * 1.6, th)
        med = np.nanmedian(r)
        g = (~np.isnan(r)) & (r < med * 1.05) & (r > med * 0.92)
        A = np.c_[np.cos(a[g]), np.sin(a[g]), np.ones(g.sum())]
        sol, *_ = np.linalg.lstsq(A, r[g], rcond=None)
        cx += sol[0]
        cy += sol[1]
        R_hint = sol[2]
    return cx, cy, R_hint


def blobs(mask):
    """Connected components, 4-neighbour, as lists of (y, x)."""
    H, W = mask.shape
    seen = np.zeros_like(mask)
    out = []
    ys, xs = np.nonzero(mask)
    for sy, sx in zip(ys, xs):
        if seen[sy, sx]:
            continue
        q = deque([(sy, sx)])
        seen[sy, sx] = True
        pts = []
        while q:
            y, x = q.popleft()
            pts.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    q.append((ny, nx))
        out.append(pts)
    out.sort(key=len, reverse=True)
    return out


def main():
    cap = json.load(open(os.path.join(OUT, f"{TAG}-capture.json")))
    hud = cap["overview"]["hud"]
    dpr = 2.0
    im, lum = load(f"{TAG}-overview-0.png")
    H, W = lum.shape

    # Locating the disc: seed from the camera, then fit the silhouette at a threshold taken
    # FROM THE IMAGE - halfway between the disc's own interior and the nearby sky, which is
    # the standard 50% edge criterion.
    #
    # This started as a fixed threshold of 150 and that was a defect, of exactly the kind
    # this harness exists to catch. It was picked when the sun measured 195 luminance; once
    # the stage had made the sun dimmer, 150 fell INSIDE the disc, the fit came back ~6%
    # small, and "the limb at r=0.90-0.96" was really the mid-disc. C1 read 0.962 when the
    # same frame measured against the true silhouette read 0.911. An instrument whose zero
    # moves with the thing it measures reports progress as failure and would, in the other
    # direction, report failure as progress.
    cx0, cy0 = hud["sunX"] * dpr, hud["sunY"] * dpr
    R0 = hud["sunPx"] * dpr / 2
    Y0, X0 = np.mgrid[0:H, 0:W]
    seed_rn = np.hypot(X0 - cx0, Y0 - cy0) / R0
    inner = lum[seed_rn < 0.5].mean()
    sky = np.median(lum[(seed_rn > 1.35) & (seed_rn < 1.7)])
    th = (inner + sky) / 2
    cx, cy, R = fit_disc(lum, cx0, cy0, R0, th)
    print(f"disc: centre ({cx:.0f},{cy:.0f})  R {R:.1f}px  edge threshold {th:.0f} "
          f"(interior {inner:.0f}, sky {sky:.0f}; camera said R {R0:.0f})")
    print(f"tier {cap['overview']['tier']}   gpu {cap['overview']['gpu'][:52]}")
    print()

    Y, X = np.mgrid[0:H, 0:W]
    rn = np.hypot(X - cx, Y - cy) / R
    fails = []

    # ---------------------------------------------------------------- C1 + C2
    bins = [(lo, lo + 0.1) for lo in np.arange(0, 1.0, 0.1)]
    prof = [lum[(rn >= a) & (rn < b)].mean() for a, b in bins]
    redp = [im[..., 0][(rn >= a) & (rn < b)].mean() for a, b in bins]
    ctr = (rn < 0.15)
    limb = (rn >= 0.90) & (rn < 0.96)
    r_ratio = im[..., 0][limb].mean() / im[..., 0][ctr].mean()
    l_ratio = lum[limb].mean() / lum[ctr].mean()
    # One bin may rise (granulation is noise on top of the profile); two is a flat disc.
    rises = sum(1 for i in range(1, len(prof)) if prof[i] > prof[i - 1] + 0.5)

    print("radial profile (mean over 10 bins, centre -> limb):")
    print("   lum " + " ".join(f"{v:6.1f}" for v in prof))
    print("   red " + " ".join(f"{v:6.1f}" for v in redp))
    print()
    ok1 = r_ratio <= 0.90
    print(f"C1 red gradient   limb/centre red = {r_ratio:.3f}   (need <= 0.900)   {'PASS' if ok1 else 'FAIL'}")
    ok2 = 0.80 <= l_ratio <= 0.88 and rises <= 1
    print(f"C2 sphericity     limb/centre lum = {l_ratio:.3f}   (need 0.80-0.88)  "
          f"non-monotone bins {rises} (need <= 1)   {'PASS' if ok2 else 'FAIL'}")
    if not ok1:
        fails.append("C1")
    if not ok2:
        fails.append("C2")

    # ---------------------------------------------------------------- C3
    # margin 10 of 255. Checked for sensitivity rather than picked: over 6 -> 25 the answer
    # moves 1.76 -> 1.61 R and 22% -> 11%, so the verdict does not hinge on it. An absolute
    # brightness threshold, which is what this started as, is NOT stable that way - and it
    # is also what made the first reading of this frame wrong in both directions at once,
    # counting Venus as a 2.6 R prominence while missing the real 1.7 R rays for being faint.
    # Across all three frames, worst case. Each arc is on its own 10-25s eruption cycle, so
    # a single frame can catch the ring at rest and report a calm limb that is not calm.
    reach, cover, avoid = 0.0, 0.0, []
    for f in (0, 1, 2):
        imf, lumf = load(f"{TAG}-overview-{f}.png")
        av = foreign_circles(imf, rn, dpr)
        ext = spike_extent(imf, lumf, cx, cy, R, margin=10.0, warm=0.20, n=2880, avoid=av)
        reach = max(reach, ext.max())
        cover = max(cover, (ext > 1.06).mean() * 100)
        avoid = av
    ok3 = reach <= 1.25 and cover <= 15.0
    print(f"C3 prominences    longest {reach:.2f} R (need <= 1.25)   "
          f"covering {cover:.1f}% of the limb (need <= 15%)   {'PASS' if ok3 else 'FAIL'}"
          f"   [{len(avoid)} foreign object(s) excluded]")
    if not ok3:
        fails.append("C3")

    # ---------------------------------------------------------------- C4
    outside = rn > 1.02
    clip = (im.min(axis=-1) > 235) & outside
    clip[: int(200 * dpr / 2), :] = False  # the page header, not the scene
    bl = [b for b in blobs(clip) if len(b) >= 30]
    total = int(clip.sum())
    ok4 = total == 0
    print(f"C4 planet clip    {total} blown-out px outside the sun (need 0)   {'PASS' if ok4 else 'FAIL'}")
    for b in bl[:5]:
        arr = np.array(b)
        w = 2 * np.sqrt(len(b) / np.pi) / dpr
        print(f"      blob at ({arr[:,1].mean():.0f},{arr[:,0].mean():.0f})  {len(b)} px  ~{w:.0f} CSS px wide")
    if not ok4:
        fails.append("C4")

    # ---------------------------------------------------------------- C5
    # A hero star is a near-neutral bright sprite shaped like a CROSS, and the shape is what
    # separates it from a planet: a diffraction star fills maybe a fifth of its own bounding
    # box, a disc fills about four fifths. Without that test a blown-out planet counts as a
    # giant star and C5 fails for C4's reason.
    # Measured across two frames, because the sprites scintillate and one frame catches them
    # mid-breath.
    widths = []
    for f in (0, 1):
        imf, lumf = load(f"{TAG}-overview-{f}.png")
        sat = (imf.max(axis=-1) - imf.min(axis=-1)) / np.maximum(imf.max(axis=-1), 1)
        star = (lumf > 120) & (sat < 0.30) & (rn > 1.30)
        for b in blobs(star):
            if len(b) < 20:
                continue
            arr = np.array(b)
            h = np.ptp(arr[:, 0]) + 1
            w = np.ptp(arr[:, 1]) + 1
            fill = len(b) / (h * w)
            asp = w / h
            off = max(abs((arr[:, 1].mean() - arr[:, 1].min()) / w - 0.5),
                      abs((arr[:, 0].mean() - arr[:, 0].min()) / h - 0.5))
            # A diffraction star: a compact core with four arms, so it is square, centred in
            # its own box, and mostly empty. A planet disc fills its box; a blown-out limb
            # crescent is neither square nor centred.
            if fill > 0.45 or not (0.70 <= asp <= 1.40) or off > 0.12:
                continue
            widths.append((max(w, h) / dpr, arr[:, 1].mean(), arr[:, 0].mean(), fill))
    widths.sort(reverse=True)
    worst = widths[0][0] if widths else 0.0
    ok5 = worst <= 20.0
    print(f"C5 hero stars     widest background sprite {worst:.0f} CSS px (need <= 20)   {'PASS' if ok5 else 'FAIL'}")
    for w, bx, by, fill in widths[:3]:
        print(f"      sprite at ({bx:.0f},{by:.0f})  {w:.0f} CSS px across  (fills {fill:.0%} of its box)")
    if not ok5:
        fails.append("C5")

    # ---------------------------------------------------------------- Mars regression
    print()
    if cap.get("mars", {}).get("usable"):
        mim, mlum = load(f"{TAG}-mars.png")
        mh, mw = mlum.shape
        # The DOM was hidden for this shot, so the frame is renderer output only: fit the
        # disc from the silhouette, seeded from the diameter the camera reported.
        mhud = cap["mars"]["hud"]
        px = next((p["px"] for p in (mhud.get("planets") or []) if p["key"] == "mars"), None)
        seed = (px / 2) if px else mh * 0.3
        mcx, mcy, mR = fit_disc(mlum, mw / 2, mh / 2, seed, 40.0)
        MY, MX = np.mgrid[0:mh, 0:mw]
        d = np.hypot(MX - mcx, MY - mcy) <= mR * 0.95
        mx = mim[d].max(axis=-1)
        clip250 = (mx > 250).mean() * 100
        frame_clip = int((mim.max(axis=-1) >= 255).sum())
        okm = clip250 <= 0.05
        print(f"REGRESSION mars   disc ({mcx:.0f},{mcy:.0f}) R {mR:.0f}, {d.sum()} px   "
              f"clipped >250 {clip250:.2f}% (need <= 0.05)   {'PASS' if okm else 'FAIL'}")
        print(f"      mean RGB {mim[...,0][d].mean():.0f} / {mim[...,1][d].mean():.0f} / {mim[...,2][d].mean():.0f}"
              f"   mean lum {mlum[d].mean():.0f}   fully-clipped px in the whole frame: {frame_clip}")
        if not okm:
            fails.append("mars")
    else:
        print("REGRESSION mars   NOT MEASURED - the capture said the probe was unusable")
        fails.append("mars-unmeasured")

    print()
    print("ALL PASS" if not fails else "FAILED: " + ", ".join(fails))
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(main())
