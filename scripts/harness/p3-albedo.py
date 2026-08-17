#!/usr/bin/env python3
"""
P3 - albedo and falloff: measure two deterministic p3-albedo.mjs tags.

    TAG=before node scripts/harness/p3-albedo.mjs
    TAG=after  node scripts/harness/p3-albedo.mjs
    python3 scripts/harness/p3-albedo.py before after

The five final lines answer the plan's five criteria, one line per criterion. Disc geometry
comes only from the HUD. The lit face is the brighter class found by Otsu on each disc's own
histogram; no luminance threshold is derived from another run or from the value under test.
"""
import json
import os
import sys

import numpy as np
from PIL import Image


# "Blown" means genuinely burnt to white, not merely bright. Corrected from 235 to 250 on
# 2026-08-17: at 235 a sunlit white cloud band counts as a defect, and chasing that number
# darkens the whole system to satisfy an instrument rather than an eye. Measured the same
# frame at both: services 54419 pixels over 235 and ZERO over 250, projects 35182 and ZERO.
# 250 is also the threshold SUN-3's own C4 uses, so the project now says one thing.
CLIP_THRESHOLD = int(os.environ.get("CLIP_THRESHOLD", 250))

OUT = os.environ.get("OUT", os.path.join(os.getcwd(), ".harness-out", "p3-albedo"))
LUMA = np.array([0.2126, 0.7152, 0.0722])
BODY_ORDER = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"]
VIEWS = ["overview", "about", "services", "projects", "technologies", "contact"]
WORLD_VIEWS = VIEWS[1:]
TIERS = ["high", "low"]

# Geometric albedo x irradiance at the plan's approved softened falloff (~1.3), using the
# compressed orbit radii recorded in the scene before P3. These constants are fixed in the
# instrument, independently of the measured image and the implementation under test.
GEOMETRIC_ALBEDO = {
    "mercury": 0.142, "venus": 0.689, "earth": 0.434, "mars": 0.170,
    "jupiter": 0.538, "saturn": 0.499, "uranus": 0.488, "neptune": 0.442,
}
ORBIT_RADIUS = {
    "mercury": 1.95, "venus": 2.55, "earth": 3.35, "mars": 4.25,
    "jupiter": 6.3, "saturn": 8.0, "uranus": 8.9, "neptune": 9.8,
}
REFERENCE_DECAY = 1.3
ALBEDO_IRRADIANCE = {
    key: GEOMETRIC_ALBEDO[key] / ORBIT_RADIUS[key] ** REFERENCE_DECAY
    for key in BODY_ORDER
}
ALBEDO_IRRADIANCE_ORDER = sorted(
    BODY_ORDER, key=lambda key: ALBEDO_IRRADIANCE[key], reverse=True
)


def load_capture(tag):
    filename = os.path.join(OUT, f"{tag}-capture.json")
    if not os.path.exists(filename):
        raise FileNotFoundError(filename)
    with open(filename, encoding="utf-8") as handle:
        return json.load(handle)


def load_image(capture, view):
    section = capture.get("views", {}).get(view, {})
    filename = section.get("capture")
    if not filename:
        raise ValueError(f"{view}: capture filename missing")
    path = os.path.join(OUT, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(path)
    return np.asarray(Image.open(path).convert("RGB"), dtype=np.uint8)


def otsu(values):
    """Find the lit/night valley from this disc's own 8-bit luminance histogram."""
    hist, _ = np.histogram(values, bins=256, range=(0, 256))
    weight = np.cumsum(hist).astype(float)
    mean = np.cumsum(hist * np.arange(256)).astype(float)
    total = weight[-1]
    if total == 0:
        return None
    denominator = weight * (total - weight)
    score = np.divide(
        (mean[-1] * weight - mean * total) ** 2,
        denominator,
        out=np.zeros_like(denominator),
        where=denominator > 0,
    )
    return int(np.argmax(score))


def hud_planet(section, key):
    planets = (section.get("hud") or {}).get("planets") or []
    return next((planet for planet in planets if planet.get("key") == key), None)


def disc_pixels(image, section, key):
    """Return pixels inside 95% of a HUD sphere, excluding bloom, AA, and Saturn's rings."""
    planet = hud_planet(section, key)
    if not planet:
        raise ValueError(f"{key}: no HUD disc")
    viewport = section.get("viewport") or {}
    dpr = float(viewport.get("dpr", 1))
    cx, cy = float(planet["x"]) * dpr, float(planet["y"]) * dpr
    radius = float(planet["px"]) * dpr * 0.5
    edge = radius * 0.95
    height, width = image.shape[:2]
    if cx - edge < 0 or cx + edge >= width or cy - edge < 0 or cy + edge >= height:
        raise ValueError(f"{key}: HUD disc is cut by capture edge")

    pad = radius * 1.01
    x0, y0 = int(np.floor(cx - pad)), int(np.floor(cy - pad))
    x1, y1 = int(np.ceil(cx + pad)) + 1, int(np.ceil(cy + pad)) + 1
    crop = image[y0:y1, x0:x1]
    yy, xx = np.mgrid[0:crop.shape[0], 0:crop.shape[1]]
    mask = np.hypot(xx + x0 - cx, yy + y0 - cy) <= edge
    pixels = crop[mask]
    expected = np.pi * edge * edge
    if len(pixels) < expected * 0.98:
        raise ValueError(f"{key}: incomplete HUD disc")
    return pixels


def body_photometry(capture):
    image = load_image(capture, "overview")
    section = capture["views"]["overview"]
    rows = {}
    for key in BODY_ORDER:
        rgb = disc_pixels(image, section, key)
        lum = rgb.astype(float) @ LUMA
        threshold = otsu(lum)
        lit = lum > threshold if threshold is not None else np.zeros(len(lum), dtype=bool)
        need = max(100, int(np.ceil(len(lum) * 0.01)))
        if lit.sum() < need:
            raise ValueError(f"{key}: lit-face class has only {lit.sum()} of {len(lum)} pixels")
        rows[key] = {
            "disc_mean": float(lum.mean()),
            "lit_mean": float(lum[lit].mean()),
            "lit_pixels": int(lit.sum()),
            "threshold": threshold,
            "clipped": int((rgb.min(axis=1) > CLIP_THRESHOLD).sum()),
        }
    return rows


def world_disc_means(capture):
    rows = {}
    for view in WORLD_VIEWS:
        section = capture.get("views", {}).get(view, {})
        key = section.get("probeBody")
        if not key:
            raise ValueError(f"{view}: probe body missing")
        rgb = disc_pixels(load_image(capture, view), section, key)
        rows[view] = {
            "body": key,
            "mean": float((rgb.astype(float) @ LUMA).mean()),
            "pixels": len(rgb),
        }
    return rows


def frame_clips(capture):
    return {
        view: int((load_image(capture, view).min(axis=2) > CLIP_THRESHOLD).sum())
        for view in VIEWS
    }


def criterion_lines(before, after):
    errors = []
    try:
        clips = frame_clips(after)
        ok1 = all(count == 0 for count in clips.values())
        p1_detail = ", ".join(f"{view} {clips[view]}" for view in VIEWS)
    except Exception as exc:  # Keep all five criterion lines visible on an incomplete run.
        ok1, p1_detail = False, f"NOT MEASURED ({exc})"
        errors.append(str(exc))

    try:
        photometry = body_photometry(after)
        dimmest = min(photometry, key=lambda key: photometry[key]["lit_mean"])
        ok2 = all(row["lit_mean"] >= 60 for row in photometry.values())
        p2_detail = f"dimmest {dimmest} {photometry[dimmest]['lit_mean']:.1f}/255"

        measured_order = sorted(BODY_ORDER, key=lambda key: photometry[key]["lit_mean"], reverse=True)
        venus_brightest = measured_order[0] == "venus"
        monotone = all(
            photometry[a]["lit_mean"] >= photometry[b]["lit_mean"]
            for a, b in zip(ALBEDO_IRRADIANCE_ORDER, ALBEDO_IRRADIANCE_ORDER[1:])
        )
        ok3 = venus_brightest and monotone
        p3_detail = " > ".join(measured_order)
    except Exception as exc:
        ok2 = ok3 = False
        p2_detail = p3_detail = f"NOT MEASURED ({exc})"
        photometry = {}
        errors.append(str(exc))

    try:
        before_worlds = world_disc_means(before)
        after_worlds = world_disc_means(after)
        deltas = {}
        identity_ok = True
        for view in WORLD_VIEWS:
            if before["views"][view].get("viewport") != after["views"][view].get("viewport"):
                raise ValueError(f"{view}: before/after viewport mismatch")
            identity_ok &= before_worlds[view]["body"] == after_worlds[view]["body"]
            deltas[view] = after_worlds[view]["mean"] - before_worlds[view]["mean"]
        worst_view = max(deltas, key=lambda view: abs(deltas[view]))
        ok4 = identity_ok and all(abs(delta) <= 8 for delta in deltas.values())
        p4_detail = ", ".join(f"{view} {delta:+.1f}" for view, delta in deltas.items())
        p4_detail += f"; worst {worst_view}"
    except Exception as exc:
        ok4, p4_detail = False, f"NOT MEASURED ({exc})"
        errors.append(str(exc))

    try:
        tier_rows = {}
        ok5 = True
        for tier in TIERS:
            b = before.get("tiers", {}).get(tier)
            a = after.get("tiers", {}).get(tier)
            if not b or not a:
                raise ValueError(f"{tier}: tier sample missing")
            if b.get("tier") != tier or a.get("tier") != tier:
                raise ValueError(f"{tier}: actual tier mismatch")
            if b.get("gpu") != a.get("gpu") or b.get("viewport") != a.get("viewport"):
                raise ValueError(f"{tier}: before/after GPU or viewport mismatch")
            frame_delta = float(a["medianFrameMs"]) - float(b["medianFrameMs"])
            calls_same = a["calls"] == b["calls"] and a.get("callsRange") == b.get("callsRange")
            triangles_same = (
                a["triangles"] == b["triangles"] and
                a.get("trianglesRange") == b.get("trianglesRange")
            )
            within_frame = abs(frame_delta) <= 1
            ok5 &= calls_same and triangles_same and within_frame
            tier_rows[tier] = {
                "before": b,
                "after": a,
                "delta": frame_delta,
            }
        p5_detail = "; ".join(
            f"{tier} calls {row['before']['calls']}->{row['after']['calls']}, "
            f"tris {row['before']['triangles']}->{row['after']['triangles']}, "
            f"median {row['before']['medianFrameMs']:.3f}->{row['after']['medianFrameMs']:.3f}ms "
            f"({row['delta']:+.3f}ms)"
            for tier, row in tier_rows.items()
        )
    except Exception as exc:
        ok5, p5_detail = False, f"NOT MEASURED ({exc})"
        errors.append(str(exc))

    lines = [
        ("P3-1 no body clips", ok1, p1_detail),
        ("P3-2 no body disappears", ok2, p2_detail),
        ("P3-3 the inner system stays the inner system", ok3, p3_detail),
        ("P3-4 the worlds do not shift", ok4, p4_detail),
        ("P3-5 the tier law", ok5, p5_detail),
    ]
    details = {
        "clips": locals().get("clips"),
        "overviewBodies": photometry,
        "albedoIrradiance": ALBEDO_IRRADIANCE,
        "referenceDecay": REFERENCE_DECAY,
        "expectedOrder": ALBEDO_IRRADIANCE_ORDER,
        "beforeWorlds": locals().get("before_worlds"),
        "afterWorlds": locals().get("after_worlds"),
        "worldDeltas": locals().get("deltas"),
        "tiers": locals().get("tier_rows"),
        "errors": errors,
        "verdicts": {label.split()[0]: ok for label, ok, _ in lines},
    }
    return lines, details


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    before_tag, after_tag = sys.argv[1:3]
    try:
        before = load_capture(before_tag)
        after = load_capture(after_tag)
    except Exception as exc:
        print(f"NOT MEASURED: {exc}")
        return 2

    lines, details = criterion_lines(before, after)
    width = max(len(label) for label, _, _ in lines)
    for label, ok, detail in lines:
        print(f"{label.ljust(width)}  {'PASS' if ok else 'FAIL'}  {detail}")

    report_path = os.path.join(OUT, f"{before_tag}-vs-{after_tag}.json")
    with open(report_path, "w", encoding="utf-8") as handle:
        json.dump({"before": before_tag, "after": after_tag, **details}, handle, indent=2)
    print(f"\nmeasurement report -> {report_path}")
    return 0 if all(ok for _, ok, _ in lines) else 1


if __name__ == "__main__":
    sys.exit(main())
