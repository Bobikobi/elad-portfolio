#!/usr/bin/env python3
"""Per body on the overview: how bright the lit face is and how much DETAIL it holds.

    python3 scripts/harness/overview-detail.py <p3-albedo tag> [<tag> ...]

lit_mean is P3's number (Otsu lit face). detail is the standard deviation of luminance on
that lit face, in 8-bit levels: a flat white blob reads ~0-3, a textured planet ~10+. clip is
the pixels above 250 in all channels. Disc geometry comes from p3-albedo.py, so the two agree.
"""
import importlib.util, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
_s = importlib.util.spec_from_file_location("p3albedo", os.path.join(HERE, "p3-albedo.py"))
p3 = importlib.util.module_from_spec(_s)
_s.loader.exec_module(p3)

print(f"{'tag':12} {'body':8} {'lit_mean':>8} {'detail':>7} {'p95-p5':>7} {'clip':>5}")
for tag in sys.argv[1:]:
    cap = p3.load_capture(tag)
    img = p3.load_image(cap, "overview")
    sec = cap["views"]["overview"]
    for key in p3.BODY_ORDER:
        rgb = p3.disc_pixels(img, sec, key)
        lum = rgb.astype(float) @ p3.LUMA
        t = p3.otsu(lum)
        lit = lum > t
        l = lum[lit]
        print(f"{tag:12} {key:8} {l.mean():8.1f} {l.std():7.2f} {np.percentile(l,95)-np.percentile(l,5):7.1f} {int((rgb.min(axis=1)>p3.CLIP_THRESHOLD).sum()):5d}")
