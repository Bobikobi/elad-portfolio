#!/usr/bin/env python3
"""
P7 - measure the six sun-richness criteria from p7-sun.mjs captures.

    python3 scripts/harness/p7-sun.py TAG

The sun's silhouette is fitted from each image. The HUD supplies only the initial seed; the
edge level is halfway between that image's own interior and nearby sky, so a brightness
change cannot silently move the instrument's radius. S1 and S5 subtract an independently
estimated radial luminance profile before measuring structure.
"""
import json
import os
import sys

import numpy as np
from PIL import Image


OUT = os.environ.get("OUT", os.path.join(os.getcwd(), ".harness-out", "p7-sun"))
LUMA = np.array([0.2126, 0.7152, 0.0722])
TIERS = ["high", "low"]

# The standing tier-law baseline is P3's accepted `before`/`ap3` sample, recorded in
# docs/briefs/P3-verify.md. Ranges come from that same p3-albedo capture. The P3 law compares
# modes and ranges exactly, while allowing at most 1ms of median-frame movement.
P3_TIER_BASELINE = {
    "high": {
        "calls": 69,
        "callsRange": [68, 72],
        "triangles": 167134,
        "trianglesRange": [166654, 170078],
        "medianFrameMs": 16.7,
    },
    "low": {
        "calls": 64,
        "callsRange": [63, 67],
        "triangles": 146549,
        "trianglesRange": [146069, 149493],
        "medianFrameMs": 16.7,
    },
}

# R2.2's accepted post-SUN-3 corner level, recorded in PHOTOMETRY-megaplan.md. Values are
# percent of full-scale luminance because that is the HUD convention used by R2.2.
R22_CORNER_BASELINE_PERCENT = 3.1


def load_capture(tag):
    path = os.path.join(OUT, f"{tag}-capture.json")
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def load_image(name):
    path = os.path.join(OUT, name)
    if not os.path.exists(path):
        raise FileNotFoundError(path)
    rgb = np.asarray(Image.open(path).convert("RGB"), dtype=np.float64)
    return rgb, rgb @ LUMA


def trace(lum, cx, cy, r0, r1, threshold, n=1440):
    """Outermost above-edge sample on each ray; spikes are rejected by fit_disc."""
    height, width = lum.shape
    angles = 2 * np.pi * np.arange(n) / n
    radii = np.arange(r0, r1, 0.4)
    px = (cx + np.cos(angles)[:, None] * radii).astype(int)
    py = (cy + np.sin(angles)[:, None] * radii).astype(int)
    valid = (px >= 0) & (px < width) & (py >= 0) & (py < height)
    values = np.where(
        valid,
        lum[np.clip(py, 0, height - 1), np.clip(px, 0, width - 1)],
        0,
    )
    outer = np.full(n, np.nan)
    for index in range(n):
        hits = np.nonzero(values[index] > threshold)[0]
        if len(hits):
            outer[index] = radii[hits[-1]]
    return angles, outer


def fit_disc(lum, cx, cy, radius_hint, threshold):
    """Least-squares circle on the image silhouette, rejecting prominence rays."""
    kept = 0
    for _ in range(10):
        angles, radii = trace(
            lum, cx, cy, radius_hint * 0.72, radius_hint * 1.6, threshold
        )
        median = np.nanmedian(radii)
        good = (
            (~np.isnan(radii))
            & (radii < median * 1.05)
            & (radii > median * 0.92)
        )
        kept = int(good.sum())
        if kept < 720:
            raise ValueError(f"silhouette fit retained only {kept}/1440 rays")
        design = np.c_[np.cos(angles[good]), np.sin(angles[good]), np.ones(kept)]
        solution, *_ = np.linalg.lstsq(design, radii[good], rcond=None)
        cx += solution[0]
        cy += solution[1]
        radius_hint = solution[2]
    return float(cx), float(cy), float(radius_hint), kept


def image_fitted_disc(rgb, lum, overview):
    """Seed from camera geometry, derive both edge level and final circle from the image."""
    viewport = overview.get("viewport") or {}
    hud = overview.get("hud") or {}
    dpr = float(viewport.get("dpr", 0))
    if dpr <= 0 or not hud.get("solar"):
        raise ValueError("DPR or solar HUD seed is missing")
    cx0 = float(hud["sunX"]) * dpr
    cy0 = float(hud["sunY"]) * dpr
    radius0 = float(hud["sunPx"]) * dpr / 2
    height, width = lum.shape
    if (width, height) != (
        int(viewport["width"] * dpr),
        int(viewport["height"] * dpr),
    ):
        raise ValueError(
            f"image is {width}x{height}, report says "
            f"{viewport['width']}x{viewport['height']} DPR {dpr:g}"
        )

    yy, xx = np.mgrid[0:height, 0:width]
    seeded_r = np.hypot(xx - cx0, yy - cy0) / radius0
    interior = float(lum[seeded_r < 0.5].mean())
    sky_samples = lum[(seeded_r > 1.35) & (seeded_r < 1.70)]
    if len(sky_samples) < 1000:
        raise ValueError("not enough nearby sky to derive the silhouette level")
    sky = float(np.median(sky_samples))
    if not interior > sky:
        raise ValueError(f"disc interior {interior:.2f} is not brighter than sky {sky:.2f}")
    threshold = (interior + sky) / 2
    cx, cy, radius, kept = fit_disc(lum, cx0, cy0, radius0, threshold)

    shift = np.hypot(cx - cx0, cy - cy0) / radius0
    radius_error = abs(radius / radius0 - 1)
    if shift > 0.08 or radius_error > 0.15:
        raise ValueError(
            f"image fit disagrees with camera seed: centre shift {shift:.1%}, "
            f"radius shift {radius / radius0 - 1:+.1%}"
        )
    if cx - 2 * radius < 0 or cx + 2 * radius >= width or cy - 2 * radius < 0 or cy + 2 * radius >= height:
        raise ValueError("fitted disc's complete 2R annulus is cut by the image edge")
    return {
        "cx": cx,
        "cy": cy,
        "radius": radius,
        "seedCx": cx0,
        "seedCy": cy0,
        "seedRadius": radius0,
        "threshold": threshold,
        "interior": interior,
        "nearbySky": sky,
        "keptRays": kept,
    }


def radial_detrend(lum, disc, limit=0.97):
    """Crop the disc and subtract its one-pixel radial mean profile."""
    cx, cy, radius = disc["cx"], disc["cy"], disc["radius"]
    pad = int(np.ceil(radius * limit)) + 2
    x0, y0 = int(np.floor(cx)) - pad, int(np.floor(cy)) - pad
    x1, y1 = int(np.floor(cx)) + pad + 1, int(np.floor(cy)) + pad + 1
    crop = lum[y0:y1, x0:x1]
    yy, xx = np.mgrid[0:crop.shape[0], 0:crop.shape[1]]
    radial_px = np.hypot(xx + x0 - cx, yy + y0 - cy)
    bins = np.floor(radial_px).astype(int)
    mask = radial_px <= radius * limit
    sums = np.bincount(bins[mask], weights=crop[mask])
    counts = np.bincount(bins[mask])
    profile = np.divide(sums, counts, out=np.zeros_like(sums), where=counts > 0)
    field = np.zeros_like(crop)
    field[mask] = crop[mask] - profile[bins[mask]]
    return field, mask, radial_px, profile


def radial_mean(values, radial_bins, valid=None):
    if valid is None:
        valid = np.ones(values.shape, dtype=bool)
    indexes = radial_bins[valid].astype(int)
    sums = np.bincount(indexes, weights=values[valid])
    counts = np.bincount(indexes)
    return np.divide(sums, counts, out=np.full_like(sums, np.nan), where=counts > 0)


def s1_grain(lum, disc):
    field, mask, radial_px, profile = radial_detrend(lum, disc)
    diameter = 2 * disc["radius"]

    # Linear (zero-padded) masked autocorrelation. Dividing by mask autocorrelation makes
    # every lag an average over its actual overlapping pairs rather than rewarding short
    # lags merely because they have more pixels.
    height, width = field.shape
    padded_h = 1 << (2 * height - 1).bit_length()
    padded_w = 1 << (2 * width - 1).bit_length()
    spectrum = np.fft.rfft2(field, s=(padded_h, padded_w))
    covariance = np.fft.fftshift(
        np.fft.irfft2(np.abs(spectrum) ** 2, s=(padded_h, padded_w))
    )
    mask_spectrum = np.fft.rfft2(mask.astype(float), s=(padded_h, padded_w))
    overlaps = np.fft.fftshift(
        np.fft.irfft2(np.abs(mask_spectrum) ** 2, s=(padded_h, padded_w))
    )
    covariance = np.divide(
        covariance,
        overlaps,
        out=np.full_like(covariance, np.nan),
        where=overlaps > 100,
    )
    center_y, center_x = padded_h // 2, padded_w // 2
    covariance /= covariance[center_y, center_x]
    yy, xx = np.mgrid[0:padded_h, 0:padded_w]
    lag_bins = np.floor(np.hypot(xx - center_x, yy - center_y)).astype(int)
    max_lag = int(np.ceil(diameter * 0.20))
    corr = radial_mean(covariance, lag_bins, np.isfinite(covariance))[: max_lag + 1]
    # A symmetric five-sample kernel reduces shell-count jitter without changing a cell-scale
    # crossing by more than a small fraction of one pixel.
    smooth = np.convolve(corr, np.array([1, 2, 3, 2, 1]) / 9, mode="same")
    smooth[:2] = corr[:2]
    crossing = None
    for index in range(1, len(smooth)):
        if np.isfinite(smooth[index - 1:index + 1]).all() and smooth[index] <= 0 < smooth[index - 1]:
            fraction = smooth[index - 1] / (smooth[index - 1] - smooth[index])
            crossing = (index - 1) + fraction
            break
    if crossing is None:
        raise ValueError("radial autocorrelation has no zero crossing within 20% of the diameter")

    # The 2D spectrum uses a radial taper only at the silhouette, preventing the circular
    # mask edge from becoming the dominant frequency. The search spans 2px to D/3; it is
    # intentionally much broader than S1's 1-2% target.
    rn = radial_px / disc["radius"]
    window = np.zeros_like(field)
    window[rn <= 0.80] = 1
    taper = (rn > 0.80) & (rn < 0.97)
    window[taper] = 0.5 * (1 + np.cos(np.pi * (rn[taper] - 0.80) / 0.17))
    power2d = np.abs(np.fft.fftshift(np.fft.fft2(field * window))) ** 2
    fy = np.fft.fftshift(np.fft.fftfreq(height))
    fx = np.fft.fftshift(np.fft.fftfreq(width))
    frequency = np.hypot(fx[None, :], fy[:, None])
    shell_width = 1 / max(height, width)
    shells = np.floor(frequency / shell_width).astype(int)
    power = radial_mean(power2d, shells)
    freq_mean = radial_mean(frequency, shells)
    # In two dimensions, a radial shell contains proportional-to-k Fourier modes and a
    # logarithmic frequency interval has width proportional-to-k. Thus k^2 P(k) is the
    # power carried by each spatial SCALE. Raw shell-mean density P(k) is expected to rise
    # toward k=0 for any residual broad structure and has no meaningful cell-size maximum.
    # This is still the measured 2D power spectrum, expressed per log-frequency band.
    scale_power = power * freq_mean ** 2
    smooth_power = np.convolve(scale_power, np.ones(5) / 5, mode="same")
    low_frequency = 1 / diameter       # longest accepted wavelength: one disc diameter
    high_frequency = 0.4               # keep clear of the Nyquist/AA boundary
    candidates = np.nonzero(
        np.isfinite(smooth_power)
        & np.isfinite(freq_mean)
        & (freq_mean >= low_frequency)
        & (freq_mean <= high_frequency)
    )[0]
    if not len(candidates):
        raise ValueError("2D power spectrum has no resolved frequency samples")
    peak_shell = int(candidates[np.argmax(smooth_power[candidates])])
    if peak_shell in (int(candidates[0]), int(candidates[-1])):
        raise ValueError("2D scale-power spectrum peaks at the analysis boundary")
    peak_frequency = float(freq_mean[peak_shell])
    wavelength = 1 / peak_frequency

    autocorr_fraction = crossing / diameter
    spectrum_fraction = wavelength / diameter
    disagreement = abs(autocorr_fraction - spectrum_fraction) / (
        (autocorr_fraction + spectrum_fraction) / 2
    )
    return {
        "autocorrelationPixels": float(crossing),
        "autocorrelationFraction": float(autocorr_fraction),
        "spectrumWavelengthPixels": float(wavelength),
        "spectrumFraction": float(spectrum_fraction),
        "disagreement": float(disagreement),
        "radialProfile": profile.tolist(),
        "autocorrelation": corr.tolist(),
        "powerFrequency": freq_mean.tolist(),
        "power": power.tolist(),
        "powerPerLogFrequency": scale_power.tolist(),
    }


def s2_hot_core(rgb, disc):
    height, width = rgb.shape[:2]
    yy, xx = np.mgrid[0:height, 0:width]
    rn = np.hypot(xx - disc["cx"], yy - disc["cy"]) / disc["radius"]
    core_rgb = rgb[rn < 0.25]
    disc_rgb = rgb[rn <= 1.0]
    if len(core_rgb) < 1000 or len(disc_rgb) < 10000:
        raise ValueError("fitted core or disc has too few pixels")
    channel_peaks = core_rgb.max(axis=0).astype(int)
    peak_channel = int(channel_peaks.max())
    blown_share = float((disc_rgb.min(axis=1) > 250).mean())
    return {
        "peakChannel": peak_channel,
        "channelPeaks": channel_peaks.tolist(),
        "blownShare": blown_share,
        "discPixels": int(len(disc_rgb)),
    }


def corner_luminance(lum):
    """Reproduce R2.2's four 10-device-pixel blocks inset 3% from the frame edge."""
    height, width = lum.shape
    size = 10
    margin = round(min(width, height) * 0.03)
    blocks = [
        lum[margin:margin + size, margin:margin + size],
        lum[margin:margin + size, width - margin - size:width - margin],
        lum[height - margin - size:height - margin, margin:margin + size],
        lum[height - margin - size:height - margin, width - margin - size:width - margin],
    ]
    values = [float(block.mean() / 255 * 100) for block in blocks]
    return {"blocksPercent": values, "meanPercent": float(np.mean(values)), "maxPercent": float(max(values))}


def s3_corona(lum, disc):
    height, width = lum.shape
    yy, xx = np.mgrid[0:height, 0:width]
    rn = np.hypot(xx - disc["cx"], yy - disc["cy"]) / disc["radius"]
    corona = lum[(rn >= 1.1) & (rn <= 2.0)]
    sky = lum[rn > 3.0]
    if len(corona) < 10000 or len(sky) < 10000:
        raise ValueError("corona or beyond-3R sky has too few pixels")
    corona_median = float(np.median(corona))
    sky_median = float(np.median(sky))
    if sky_median <= 0:
        raise ValueError("sky median is at the 8-bit black floor; a corona ratio is not trustworthy")
    return {
        "coronaMedian": corona_median,
        "skyMedian": sky_median,
        "ratio": corona_median / sky_median,
        "corners": corner_luminance(lum),
    }


def s4_limb(lum, disc):
    height, width = lum.shape
    yy, xx = np.mgrid[0:height, 0:width]
    rn = np.hypot(xx - disc["cx"], yy - disc["cy"]) / disc["radius"]
    center = lum[rn < 0.25]
    limb = lum[(rn >= 0.90) & (rn <= 0.97)]
    if len(center) < 1000 or len(limb) < 1000 or center.mean() <= 0:
        raise ValueError("centre or true-limb annulus is unusable")
    return {
        "centerMean": float(center.mean()),
        "limbMean": float(limb.mean()),
        "ratio": float(limb.mean() / center.mean()),
    }


def bilinear_sample(image, x, y):
    height, width = image.shape
    x0 = np.floor(x).astype(int)
    y0 = np.floor(y).astype(int)
    x1 = np.clip(x0 + 1, 0, width - 1)
    y1 = np.clip(y0 + 1, 0, height - 1)
    x0 = np.clip(x0, 0, width - 1)
    y0 = np.clip(y0, 0, height - 1)
    wx = x - x0
    wy = y - y0
    return (
        image[y0, x0] * (1 - wx) * (1 - wy)
        + image[y0, x1] * wx * (1 - wy)
        + image[y1, x0] * (1 - wx) * wy
        + image[y1, x1] * wx * wy
    )


def normalized_granulation(lum, disc, size=512):
    """Fit each frame, register in normalized disc coordinates, then detrend radially."""
    axis = np.linspace(-0.8, 0.8, size)
    yn, xn = np.meshgrid(axis, axis, indexing="ij")
    rn = np.hypot(xn, yn)
    mask = rn <= 0.8
    x = disc["cx"] + xn * disc["radius"]
    y = disc["cy"] + yn * disc["radius"]
    sampled = bilinear_sample(lum, x, y)
    bins = np.minimum(255, np.floor(rn / 0.8 * 256).astype(int))
    sums = np.bincount(bins[mask], weights=sampled[mask], minlength=256)
    counts = np.bincount(bins[mask], minlength=256)
    profile = np.divide(sums, counts, out=np.zeros_like(sums), where=counts > 0)
    field = sampled[mask] - profile[bins[mask]]
    field -= field.mean()
    sd = field.std()
    if sd < 0.25:
        raise ValueError(f"granulation field SD is only {sd:.3f}/255")
    return field / sd


def s5_lifetime(capture, overview):
    captures = overview.get("captures") or []
    if len(captures) < 2:
        raise ValueError("fewer than two fixed-step captures")
    times = [float(row["sceneSeconds"]) for row in captures]
    if times[0] != 0 or any(b <= a for a, b in zip(times, times[1:])):
        raise ValueError("capture scene times are not strictly increasing from zero")

    fields = []
    fits = []
    for row in captures:
        rgb, lum = load_image(row["capture"])
        disc = image_fitted_disc(rgb, lum, overview)
        fields.append(normalized_granulation(lum, disc))
        fits.append(disc)
    first = fields[0]
    correlations = [1.0]
    for field in fields[1:]:
        correlations.append(float(np.mean(first * field)))

    half_time = None
    bracket = None
    for index in range(1, len(correlations)):
        before, after = correlations[index - 1], correlations[index]
        if before > 0.5 >= after:
            fraction = (before - 0.5) / (before - after)
            half_time = times[index - 1] + fraction * (times[index] - times[index - 1])
            bracket = [times[index - 1], times[index]]
            break
    return {
        "times": times,
        "correlations": correlations,
        "halfTimeSeconds": half_time,
        "bracket": bracket,
        "fits": fits,
        "lastBoundSeconds": times[-1],
    }


def s6_tier_law(capture):
    rows = {}
    passed = True
    for tier in TIERS:
        measured = (capture.get("tiers") or {}).get(tier)
        baseline = P3_TIER_BASELINE[tier]
        if not measured:
            raise ValueError(f"{tier}: tier sample missing")
        if measured.get("tier") != tier:
            raise ValueError(f"{tier}: actual tier is {measured.get('tier')}")
        # Refuse rather than report a number that is about the browser instead of the
        # scene. The same unchanged scene medians 16.700ms in a launched browser and
        # 33.300ms in the shared one attached over CDP: a clean 60fps against a clean
        # 30fps, because the attached browser is not vsynced the same way. Pixel
        # measurements matched across both to three decimals, so only S6 is affected.
        if measured.get("timingValid") is False:
            raise ValueError(
                f"{tier}: {measured.get('timingNote') or 'captured over CDP - timing invalid'}"
            )
        frame_delta = float(measured["medianFrameMs"]) - baseline["medianFrameMs"]
        calls_same = (
            measured.get("calls") == baseline["calls"]
            and measured.get("callsRange") == baseline["callsRange"]
        )
        triangles_same = (
            measured.get("triangles") == baseline["triangles"]
            and measured.get("trianglesRange") == baseline["trianglesRange"]
        )
        frame_same = abs(frame_delta) <= 1
        passed &= calls_same and triangles_same and frame_same
        rows[tier] = {
            "baseline": baseline,
            "measured": measured,
            "medianFrameDeltaMs": frame_delta,
            "pass": calls_same and triangles_same and frame_same,
        }
    return {"pass": bool(passed), "tiers": rows}


def measure(tag):
    capture = load_capture(tag)
    overview = capture.get("overview") or {}
    captures = overview.get("captures") or []
    if not captures:
        raise ValueError("overview capture series is missing")
    rgb, lum = load_image(captures[0]["capture"])
    disc = image_fitted_disc(rgb, lum, overview)

    results = {}
    for key, function in (
        ("S1", lambda: s1_grain(lum, disc)),
        ("S2", lambda: s2_hot_core(rgb, disc)),
        ("S3", lambda: s3_corona(lum, disc)),
        ("S4", lambda: s4_limb(lum, disc)),
        ("S5", lambda: s5_lifetime(capture, overview)),
        ("S6", lambda: s6_tier_law(capture)),
    ):
        try:
            results[key] = {"measured": True, "data": function()}
        except Exception as exc:
            results[key] = {"measured": False, "reason": str(exc)}

    if results["S1"]["measured"]:
        data = results["S1"]["data"]
        results["S1"]["pass"] = (
            0.01 <= data["autocorrelationFraction"] <= 0.02
            and 0.01 <= data["spectrumFraction"] <= 0.02
            and data["disagreement"] <= 0.30
        )
    if results["S2"]["measured"]:
        data = results["S2"]["data"]
        results["S2"]["pass"] = data["peakChannel"] >= 240 and data["blownShare"] < 0.01
    if results["S3"]["measured"]:
        data = results["S3"]["data"]
        results["S3"]["pass"] = (
            data["ratio"] >= 2
            and data["corners"]["meanPercent"] <= R22_CORNER_BASELINE_PERCENT
        )
    if results["S4"]["measured"]:
        results["S4"]["pass"] = results["S4"]["data"]["ratio"] <= 0.75
    if results["S5"]["measured"]:
        half_time = results["S5"]["data"]["halfTimeSeconds"]
        results["S5"]["pass"] = half_time is not None and 6 <= half_time <= 20
    if results["S6"]["measured"]:
        results["S6"]["pass"] = results["S6"]["data"]["pass"]
    return capture, disc, results


def table_rows(results):
    rows = []
    for key in ["S1", "S2", "S3", "S4", "S5", "S6"]:
        result = results[key]
        if not result["measured"]:
            rows.append((key, "NOT MEASURED", result["reason"]))
            continue
        data = result["data"]
        status = "PASS" if result["pass"] else "FAIL"
        if key == "S1":
            disagreement = data["disagreement"] * 100
            warning = " DISAGREE >30%" if disagreement > 30 else ""
            detail = (
                f"autocorr {data['autocorrelationFraction'] * 100:.3f}% D; "
                f"spectrum {data['spectrumFraction'] * 100:.3f}% D; "
                f"difference {disagreement:.1f}%{warning} (need both 1-2%)"
            )
        elif key == "S2":
            detail = (
                f"core peak {data['peakChannel']}/255 (RGB {data['channelPeaks']}); "
                f"all-channel >250 {data['blownShare'] * 100:.4f}% of disc "
                f"(need >=240 and <1%)"
            )
        elif key == "S3":
            corners = data["corners"]
            detail = (
                f"corona {data['coronaMedian']:.2f}, sky {data['skyMedian']:.2f}, "
                f"ratio {data['ratio']:.3f}x; corners mean {corners['meanPercent']:.3f}% "
                f"(need >=2x and <= R2.2 {R22_CORNER_BASELINE_PERCENT:.1f}%)"
            )
        elif key == "S4":
            detail = (
                f"limb {data['limbMean']:.2f} / centre {data['centerMean']:.2f} = "
                f"{data['ratio']:.3f} (need <=0.75)"
            )
        elif key == "S5":
            pairs = ", ".join(
                f"{time:g}s:{corr:.3f}"
                for time, corr in zip(data["times"], data["correlations"])
            )
            if data["halfTimeSeconds"] is None:
                half = f">{data['lastBoundSeconds']:g}s (0.5 not crossed)"
            else:
                half = f"{data['halfTimeSeconds']:.3f}s interpolated"
            detail = f"half-life {half}; correlations [{pairs}] (need 6-20s)"
        else:
            tier_details = []
            for tier in TIERS:
                row = data["tiers"][tier]
                base, measured = row["baseline"], row["measured"]
                tier_details.append(
                    f"{tier} calls {base['calls']}->{measured['calls']} "
                    f"{measured['callsRange']}, tris {base['triangles']}->{measured['triangles']} "
                    f"{measured['trianglesRange']}, median "
                    f"{base['medianFrameMs']:.3f}->{measured['medianFrameMs']:.3f}ms "
                    f"({row['medianFrameDeltaMs']:+.3f}ms)"
                )
            detail = "; ".join(tier_details)
        rows.append((key, status, detail))
    return rows


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    tag = sys.argv[1]
    try:
        capture, disc, results = measure(tag)
    except Exception as exc:
        print(f"NOT MEASURED: {exc}")
        return 2

    print(
        f"disc: centre ({disc['cx']:.1f},{disc['cy']:.1f}) R {disc['radius']:.2f}px; "
        f"image edge {disc['threshold']:.2f} from interior {disc['interior']:.2f} / "
        f"sky {disc['nearbySky']:.2f}; camera seed R {disc['seedRadius']:.2f}px"
    )
    print(f"build: {capture.get('build', 'unknown')}")
    print(f"gpu: {(capture.get('overview') or {}).get('gpu', 'unknown')}")
    print()

    rows = table_rows(results)
    print(f"{'criterion':<10} {'verdict':<12} measured")
    print("-" * 132)
    for criterion, verdict, detail in rows:
        print(f"{criterion:<10} {verdict:<12} {detail}")

    report_path = os.path.join(OUT, f"{tag}-measurement.json")
    with open(report_path, "w", encoding="utf-8") as handle:
        json.dump(
            {
                "tag": tag,
                "build": capture.get("build"),
                "disc": disc,
                "r22CornerBaselinePercent": R22_CORNER_BASELINE_PERCENT,
                "p3TierBaseline": P3_TIER_BASELINE,
                "criteria": results,
            },
            handle,
            indent=2,
        )
    print(f"\nmeasurement report -> {report_path}")

    if any(not result["measured"] for result in results.values()):
        return 2
    return 0 if all(result["pass"] for result in results.values()) else 1


if __name__ == "__main__":
    sys.exit(main())
