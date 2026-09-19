#!/usr/bin/env python3
"""
P4 step 1 - how much does `highlightRolloff` take, and from whom.

    TAG=p4-on                        node scripts/harness/p3-albedo.mjs
    TAG=p4-off EXTRA_QS=noRolloff    node scripts/harness/p3-albedo.mjs
    python3 scripts/harness/p4-chroma.py p4-on p4-off

The rolloff gates itself on the PRE-ACES HDR colour. A screenshot is post-ACES and clipped
at 255, so the spread the shader acts on cannot be read off a frame - a pixel that arrives at
(255,255,255) says nothing about how lopsided it was going in. So this does not try. It
compares two captures that differ ONLY in whether the function runs (`?noRolloff`, a HUD-only
seam that is byte-identical when absent), with the fixed step, frozen clock and frame anchor
held. Whatever differs between them is the rolloff, and nothing else.

Per body it reports:
    reach    share of the disc whose pixels differ at all      <- can the rolloff touch it?
    chroma   mean lit-face chroma, on and off, and the delta   <- how much it takes
    clip     pixels over the clip threshold in any channel, on and off
                                                               <- what it is protecting

`reach` is the number P4's Saturn question turns on. A body whose disc is byte-identical with
the function on and off is out of P4's reach at every setting of HL_KNEE, HL_RANGE and HL_MAX,
because those constants only scale an effect that is not happening.

Run it on two captures of the SAME build first. Every delta must be exactly zero, or the
instrument is not holding everything else and none of its answers mean anything.

Disc geometry is imported from p3-albedo.py rather than re-derived, so the two harnesses
cannot disagree about where a planet is.
"""
import importlib.util
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("p3albedo", os.path.join(HERE, "p3-albedo.py"))
p3 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(p3)


def chroma(rgb):
    """Per-pixel chroma on the 8-bit output, 0-1: the gap between the brightest and dimmest
    channel. Output-space by necessity; it is what a visitor's display shows."""
    rgb = rgb.astype(float)
    return (rgb.max(axis=1) - rgb.min(axis=1)) / 255.0


def lit_mask(rgb):
    """The lit face, found by Otsu on this disc's own histogram - the same rule P3 uses, so
    a dark night side cannot dilute the chroma of the part the rolloff can actually reach."""
    lum = rgb.astype(float) @ p3.LUMA
    threshold = p3.otsu(lum)
    if threshold is None:
        return np.zeros(len(lum), dtype=bool)
    return lum > threshold


def hud_geometry(section, key):
    planet = p3.hud_planet(section, key)
    if not planet:
        return None
    return (round(float(planet["x"]), 3), round(float(planet["y"]), 3), round(float(planet["px"]), 3))


def body_row(on_cap, off_cap, view, key):
    on_section = on_cap["views"][view]
    off_section = off_cap["views"][view]
    # The whole method rests on "everything else held". If the planet is not in the same
    # place in both captures, the comparison is of two different frames - refuse.
    g_on, g_off = hud_geometry(on_section, key), hud_geometry(off_section, key)
    if g_on is None or g_off is None:
        return None
    if g_on != g_off:
        raise ValueError(f"{view}/{key}: HUD disc moved between captures {g_on} vs {g_off} - not a held comparison")
    on_rgb = p3.disc_pixels(p3.load_image(on_cap, view), on_section, key)
    off_rgb = p3.disc_pixels(p3.load_image(off_cap, view), off_section, key)
    if on_rgb.shape != off_rgb.shape:
        raise ValueError(f"{view}/{key}: disc pixel counts differ")

    differs = np.any(on_rgb != off_rgb, axis=1)
    lit = lit_mask(off_rgb)                      # the un-rolled-off frame defines the lit face
    if lit.sum() < max(100, int(len(lit) * 0.01)):
        lit = np.ones(len(lit), dtype=bool)      # tiny or fully lit disc: use all of it, say so
        lit_note = "all"
    else:
        lit_note = "lit"
    c_on, c_off = chroma(on_rgb[lit]), chroma(off_rgb[lit])
    return {
        "view": view,
        "body": key,
        "discPixels": int(len(on_rgb)),
        "reachPercent": float(differs.mean() * 100),
        "chromaOn": float(c_on.mean()),
        "chromaOff": float(c_off.mean()),
        # Positive: the rolloff is REMOVING chroma from this body. That is what P4 is about.
        "chromaTakenPercent": float((c_off.mean() - c_on.mean()) / c_off.mean() * 100) if c_off.mean() > 0 else 0.0,
        "clipAnyOn": int((on_rgb.max(axis=1) > p3.CLIP_THRESHOLD).sum()),
        "clipAnyOff": int((off_rgb.max(axis=1) > p3.CLIP_THRESHOLD).sum()),
        "clipAllOn": int((on_rgb.min(axis=1) > p3.CLIP_THRESHOLD).sum()),
        "clipAllOff": int((off_rgb.min(axis=1) > p3.CLIP_THRESHOLD).sum()),
        "face": lit_note,
    }


# The same radii earlier stages already committed to, so this cannot pick a flattering band:
# the core is P7 S2's r < 0.25, the limb is SUN-3 C1/C2's 0.90-0.96 annulus.
SUN_REGIONS = [("core", 0.0, 0.25), ("mid-disc", 0.25, 0.90), ("limb", 0.90, 0.96)]


def sun_rows(on_cap, off_cap):
    """The body the plan says has been paying for Mars: "49% desaturation at the centre
    against 11% at the limb", measured before P3 and P7 both moved the sun. This re-measures
    exactly that claim on today's sun, core against limb, with the function toggled."""
    view = "overview"
    on_hud = on_cap["views"][view].get("hud") or {}
    off_hud = off_cap["views"][view].get("hud") or {}
    keys = ("sunX", "sunY", "sunPx")
    if not all(k in on_hud for k in keys):
        return []
    g_on = tuple(round(float(on_hud[k]), 3) for k in keys)
    g_off = tuple(round(float(off_hud[k]), 3) for k in keys)
    if g_on != g_off:
        raise ValueError(f"sun moved between captures {g_on} vs {g_off} - not a held comparison")
    dpr = float((on_cap["views"][view].get("viewport") or {}).get("dpr", 1))
    cx, cy, radius = g_on[0] * dpr, g_on[1] * dpr, g_on[2] * dpr / 2
    a = p3.load_image(on_cap, view)
    b = p3.load_image(off_cap, view)
    height, width = a.shape[:2]
    if cx - radius < 0 or cx + radius >= width or cy - radius < 0 or cy + radius >= height:
        raise ValueError("sun disc is cut by the capture edge")
    yy, xx = np.mgrid[0:height, 0:width]
    rn = np.hypot(xx - cx, yy - cy) / radius
    rows = []
    for name, lo, hi in SUN_REGIONS:
        mask = (rn >= lo) & (rn < hi)
        on_rgb, off_rgb = a[mask], b[mask]
        c_on, c_off = chroma(on_rgb), chroma(off_rgb)
        rows.append({
            "region": name,
            "from": lo,
            "to": hi,
            "pixels": int(mask.sum()),
            "reachPercent": float(np.any(on_rgb != off_rgb, axis=1).mean() * 100),
            "chromaOn": float(c_on.mean()),
            "chromaOff": float(c_off.mean()),
            "chromaTakenPercent": float((c_off.mean() - c_on.mean()) / c_off.mean() * 100) if c_off.mean() > 0 else 0.0,
            "clipAnyOn": int((on_rgb.max(axis=1) > p3.CLIP_THRESHOLD).sum()),
            "clipAnyOff": int((off_rgb.max(axis=1) > p3.CLIP_THRESHOLD).sum()),
        })
    return rows


def frame_row(on_cap, off_cap, view):
    """Site-wide blast radius. The function runs on every pixel, and no planet-disc number
    says anything about the star field, the nebulae or the gold curtain."""
    a = p3.load_image(on_cap, view)
    b = p3.load_image(off_cap, view)
    if a.shape != b.shape:
        raise ValueError(f"{view}: frame sizes differ")
    differs = np.any(a != b, axis=2)
    return {
        "view": view,
        "framePixelsChangedPercent": float(differs.mean() * 100),
        "maxChannelDelta": int(np.abs(a.astype(int) - b.astype(int)).max()),
    }


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    on_tag, off_tag = sys.argv[1], sys.argv[2]
    on_cap, off_cap = p3.load_capture(on_tag), p3.load_capture(off_tag)

    rows = []
    for key in p3.BODY_ORDER:
        try:
            row = body_row(on_cap, off_cap, "overview", key)
        except ValueError as error:
            print(f"  skip overview/{key}: {error}")
            continue
        if row:
            rows.append(row)
    for view in p3.WORLD_VIEWS:
        key = on_cap["views"].get(view, {}).get("probeBody")
        if not key:
            continue
        try:
            row = body_row(on_cap, off_cap, view, key)
        except ValueError as error:
            print(f"  skip {view}/{key}: {error}")
            continue
        if row:
            rows.append(row)
    frames = [frame_row(on_cap, off_cap, view) for view in p3.VIEWS]
    try:
        sun = sun_rows(on_cap, off_cap)
    except ValueError as error:
        print(f"  skip sun: {error}")
        sun = []

    print(f"P4 step 1 - rolloff ON `{on_tag}` against OFF `{off_tag}`   clip threshold {p3.CLIP_THRESHOLD}\n")
    head = f"{'view':<13}{'body':<9}{'disc px':>9}  {'reach':>7}  {'chroma on':>9} {'off':>6} {'taken':>7}   {'clip any on/off':>16}  {'all on/off':>11}"
    print(head)
    print("-" * len(head))
    for r in rows:
        print(f"{r['view']:<13}{r['body']:<9}{r['discPixels']:>9}  {r['reachPercent']:>6.2f}%  "
              f"{r['chromaOn']:>9.4f} {r['chromaOff']:>6.4f} {r['chromaTakenPercent']:>6.2f}%   "
              f"{r['clipAnyOn']:>7}/{r['clipAnyOff']:<8}  {r['clipAllOn']:>5}/{r['clipAllOff']:<5} {'' if r['face']=='lit' else '(whole disc)'}")
    if sun:
        print()
        print(f"{'sun, overview':<22}{'px':>9}  {'reach':>7}  {'chroma on':>9} {'off':>6} {'taken':>7}   {'clip any on/off':>16}")
        for r in sun:
            print(f"{r['region']:<10} r {r['from']:.2f}-{r['to']:.2f} {r['pixels']:>9}  {r['reachPercent']:>6.2f}%  "
                  f"{r['chromaOn']:>9.4f} {r['chromaOff']:>6.4f} {r['chromaTakenPercent']:>6.2f}%   "
                  f"{r['clipAnyOn']:>7}/{r['clipAnyOff']:<8}")
    print()
    print(f"{'view':<13}{'frame pixels changed':>22}  {'largest channel delta':>22}")
    for f in frames:
        print(f"{f['view']:<13}{f['framePixelsChangedPercent']:>21.3f}%  {f['maxChannelDelta']:>22}")

    report = {"on": on_tag, "off": off_tag, "clipThreshold": p3.CLIP_THRESHOLD, "bodies": rows, "sun": sun, "frames": frames}
    path = os.path.join(p3.OUT, f"{on_tag}-vs-{off_tag}-p4.json")
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
    print(f"\n-> {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
