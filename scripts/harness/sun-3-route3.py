#!/usr/bin/env python3
"""
SUN-3 adversarial route 3, which the verify specified on 2026-08-15 and nobody ran.

    python3 scripts/harness/sun-3-route3.py TAG

C2 asks the radial luminance profile to fall monotonically, and checks it over 10 bins of
0.1 R. Ten bins is coarse enough to average out a plateau - and a plateau is the exact
defect the whole stage exists to fix, so a monotonicity test that cannot see one is the
wrong instrument.

The verify's pass condition, quoted: "monotone at 8 bins AND no non-decreasing run longer
than 3% of the radius at full resolution."

Disc geometry is taken from `sun-3.py` itself rather than re-derived, so this cannot
disagree with the criterion it is auditing by fitting a different circle.
"""
import os
import sys
import json
import numpy as np

sys.argv = [sys.argv[0], sys.argv[1] if len(sys.argv) > 1 else 'now']
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib
s3 = importlib.import_module('sun-3'.replace('-', '_')) if False else None
# The module's filename is not an identifier, so load it by path.
import importlib.util
spec = importlib.util.spec_from_file_location(
    'sun3', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sun-3.py'))
sun3 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sun3)

TAG = sys.argv[1]
cap = json.load(open(os.path.join(sun3.OUT, f'{TAG}-capture.json')))
hud = cap['overview']['hud']
dpr = 2.0
im, lum = sun3.load(f'{TAG}-overview-0.png')
H, W = lum.shape
cx0, cy0 = hud['sunX'] * dpr, hud['sunY'] * dpr
R0 = hud['sunPx'] * dpr / 2
Y0, X0 = np.mgrid[0:H, 0:W]
seed_rn = np.hypot(X0 - cx0, Y0 - cy0) / R0
inner = lum[seed_rn < 0.5].mean()
sky = np.median(lum[(seed_rn > 1.35) & (seed_rn < 1.7)])
th = (inner + sky) / 2
cx, cy, R = sun3.fit_disc(lum, cx0, cy0, R0, th)
Y, X = np.mgrid[0:H, 0:W]
rn = np.hypot(X - cx, Y - cy) / R

print(f'{TAG}   source {cap.get("base", "?")}')
print(f'disc: centre ({cx:.0f},{cy:.0f})  R {R:.1f}px')
print()


def profile(nbins, upto=1.0):
    edges = np.linspace(0, upto, nbins + 1)
    out = []
    for a, b in zip(edges[:-1], edges[1:]):
        m = (rn >= a) & (rn < b)
        out.append(lum[m].mean() if m.any() else np.nan)
    return np.array(out)


def rises(p, tol):
    """Bins that go UP by more than tol. The criterion's own definition."""
    return sum(1 for i in range(1, len(p)) if p[i] > p[i - 1] + tol)


for n in (8, 10, 24):
    p = profile(n)
    r = rises(p, 0.5)
    print(f'{n:3d} bins   rises {r}   ' + ' '.join(f'{v:5.1f}' for v in p))
print()

# Full resolution: one ring per pixel of radius. "Non-decreasing run" is measured as a
# fraction of the radius, per the verify's wording.
rings = int(round(R))
edges = np.linspace(0, 1.0, rings + 1)
prof = []
for a, b in zip(edges[:-1], edges[1:]):
    m = (rn >= a) & (rn < b)
    prof.append(lum[m].mean() if m.any() else np.nan)
prof = np.array(prof)
good = ~np.isnan(prof)
prof = prof[good]
step = 1.0 / rings

# A run of consecutive rings that do not DECREASE. Noise makes single rings wobble, so the
# run is what matters, exactly as the pass condition says.
runs, cur = [], 0
for i in range(1, len(prof)):
    if prof[i] >= prof[i - 1]:
        cur += 1
    else:
        if cur:
            runs.append(cur)
        cur = 0
if cur:
    runs.append(cur)
longest = max(runs) if runs else 0
longest_pct = longest * step * 100

print(f'full resolution: {len(prof)} rings, one per pixel of radius ({step*100:.3f}% of R each)')
print(f'longest non-decreasing run: {longest} rings = {longest_pct:.2f}% of the radius   (need <= 3%)')
top = sorted(runs, reverse=True)[:6]
print(f'six longest runs (% of R): ' + ', '.join(f'{t*step*100:.2f}' for t in top))
print()

ok8 = rises(profile(8), 0.5) <= 1
okfull = longest_pct <= 3.0
print(f'ROUTE 3  monotone at 8 bins: {"PASS" if ok8 else "FAIL"}   '
      f'no run > 3% at full resolution: {"PASS" if okfull else "FAIL"}')
print(f'ROUTE 3  {"PASS - C2 s monotonicity is not an artifact of coarse binning" if (ok8 and okfull) else "FAIL - the plateau the criterion cannot see is real"}')
