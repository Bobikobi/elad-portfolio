"""Analyse a passage.mjs recording (#82).
  python3 scripts/harness/passage.py .harness-out/passage/<TAG> [--sheet]
Per run: duration, dark time (screencast mean < 20), biggest frame-to-frame picture change while
visible, and the longest visible STALL - the camera's visual speed (rotation + travel relative to
its distance from the origin) under 15% of the run's peak - away from the two ends."""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw

d = sys.argv[1]
R = json.load(open(os.path.join(d, 'rec.json')))
m, rec, stamps = R['meta'], R['rec'], R['stamps']
t0, t1 = m['t0'], m['t1']
fdir = os.path.join(d, 'frames')
files = sorted(os.listdir(fdir))
lum, small = [], []
for f in files:
    im = Image.open(os.path.join(fdir, f)).convert('L')
    a = np.asarray(im, dtype=np.float32)
    lum.append(float(a.mean()))
    small.append(np.asarray(im.resize((80, 45)), dtype=np.float32))
fr = [(stamps[i], lum[i], small[i]) for i in range(len(files))]
win = [x for x in fr if t0 - 100 <= x[0] <= t1 + 600]

def at(ts):  # store state at a wall time
    best = min(rec, key=lambda r: abs(r[0] - ts))
    return best

dark = 0.0
for a, b in zip(win, win[1:]):
    if a[1] < 20: dark += b[0] - a[0]
steps = [(abs(b[1] - a[1]), b[0]) for a, b in zip(win, win[1:])]
cuts = []
for a, b in zip(win, win[1:]):
    s = at(b[0])
    if s[2] < 0.3 and a[1] >= 20 and b[1] >= 20:
        cuts.append((float(np.abs(b[2] - a[2]).mean()), b[0]))

def qang(a, b):
    dot = abs(sum(x * y for x, y in zip(a, b))); return 2 * math.acos(min(1.0, dot))
vs = []
for a, b in zip(rec, rec[1:]):
    dt = (b[0] - a[0]) / 1000
    if dt <= 0: continue
    if a[1] != b[1]: vs.append((b[0], None, b)); continue  # the act swap: not a motion sample
    dist = max(0.5, math.dist(b[4], (0, 0, 0)))
    rel = math.dist(a[4], b[4]) / dist / dt
    ang = qang(a[5], b[5]) / dt
    vs.append((b[0], rel + ang, b))
live = [v for v in vs if v[1] is not None and t0 <= v[0] <= t1]
peak = max(v[1] for v in live)
stall, cur, cur0, where = 0, 0, None, None
for v in live:
    vis = v[2][2] < 0.3
    inner = t0 + 250 <= v[0] <= t1 - 300
    if inner and vis and v[1] < 0.15 * peak:
        if cur0 is None: cur0 = v[0]
        if v[0] - cur0 > stall: stall, where = v[0] - cur0, (round(at(cur0)[3], 3), round(v[2][3], 3), v[2][1])
    else:
        cur0 = None
swap = next((r for a, r in zip(rec, rec[1:]) if a[1] != r[1]), None)
turn = max((qang(a[5], b[5]) for a, b in zip(rec, rec[1:]) if a[1] == b[1] and t0 <= b[0] <= t1), default=0)
# The recorder's rAF and R3F's are not ordered, and a GPU-bound frame repeats the previous
# pose: then the next sample carries two renders' worth of turn. Turn RATE over distinct
# poses, scaled to a 60fps frame, is what the criterion means.
dist = [r for a, r in zip([None] + rec, rec) if a is None or a[4] != r[4] or a[5] != r[5]]
turn60 = max((qang(a[5], b[5]) * 16.667 / max(16.667, b[0] - a[0]) for a, b in zip(dist, dist[1:])
              if a[1] == b[1] and t0 <= b[0] <= t1), default=0)
render_fps = (len([r for r in dist if t0 <= r[0] <= t1]) - 1) / max(1e-3, (t1 - t0) / 1000)
out = {
    'tag': os.path.basename(d.rstrip('/')), 'dir': m['DIR'], 'mob': m['MOB'], 'endAct': m['endAct'],
    'dur_s': round((t1 - t0) / 1000, 2), 'dark_ms': round(dark), 'max_lum_step': round(max(s[0] for s in steps), 1),
    'max_picture_change_visible': round(max(c[0] for c in cuts), 1) if cuts else None,
    'longest_visible_stall_ms': round(stall), 'stall_at(scroll from,to,act)': where,
    'max_turn_deg_frame': round(math.degrees(turn), 2),
    'max_turn_deg_per_60fps_frame': round(math.degrees(turn60), 2), 'render_fps': round(render_fps, 1),
    'swap_at_ms': round(swap[0] - t0) if swap else None,
}
print(json.dumps(out))
# speed profile, 100ms buckets: normalized visual speed + mean luminance + act/cov
prof = []
for k in range(int((t1 - t0) // 100) + 6):
    a, b = t0 + k * 100, t0 + (k + 1) * 100
    v = [x[1] for x in live if a <= x[0] < b] + [x[1] for x in vs if x[1] is not None and a <= x[0] < b and x[0] > t1]
    L = [x[1] for x in win if a <= x[0] < b]
    s = at(a)
    prof.append(f"{k*100:5d}ms v={np.mean(v)/peak if v else float('nan'):.2f} L={np.mean(L) if L else float('nan'):5.1f} {s[1][:3]} cov={s[2]:.2f} sp={s[3]:.3f}")
print('\n'.join(prof))
if '--sheet' in sys.argv:
    pick, nxt = [], t0 - 100
    for x in fr:
        if x[0] >= nxt and x[0] <= t1 + 700: pick.append(x); nxt = x[0] + 125
    cols = 6; im0 = Image.open(os.path.join(fdir, files[0])); w, h = im0.size; s = 0.5
    sw, sh = int(w * s), int(h * s)
    sheet = Image.new('RGB', (cols * sw, math.ceil(len(pick) / cols) * (sh + 14)), 'black')
    dr = ImageDraw.Draw(sheet)
    for i, x in enumerate(pick):
        j = stamps.index(x[0]); im = Image.open(os.path.join(fdir, files[j])).convert('RGB').resize((sw, sh))
        X, Y = (i % cols) * sw, (i // cols) * (sh + 14)
        sheet.paste(im, (X, Y)); st = at(x[0])
        dr.text((X + 2, Y + sh), f"{x[0]-t0:.0f}ms {st[1][:3]} L{x[1]:.0f}", fill='white')
    sheet.save(os.path.join(d, 'sheet.png')); print('sheet', os.path.join(d, 'sheet.png'))
