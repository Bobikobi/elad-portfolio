"""Sparkles over the galaxy (#82 stage 2, owner 2026-10-05): the dive's soft stars spread over the
whole disc from rest, the dive's own stars coming in one by one, and a bigger galaxy.

  python3 scripts/harness/sparkle.py rest <dir> <tag> [...]      galaxy-rest captures, <tag>-f<frame>.png (or <tag>.png)
  python3 scripts/harness/sparkle.py light <dir> <on-tag> <off-tag>   the same frames with the sparkles on and ?spk=0
  python3 scripts/harness/sparkle.py passage .harness-out/passage/<TAG> [...]   passage.mjs, down runs

A POINT is a local maximum (3x3) of luma that stands over its own 3 px blur by more than T: what
the eye picks out as a star. T is 30 on the full-size rest captures, where 12 counts the photo's
own grain (9482 on one rest frame against 2547 at 30), and 12 on the passage's 640 px screencast,
where the downscale has already averaged the grain away. The BODY is the galaxy (blur 24 over the sky floor + 18, as
m101-motion.py takes it); the SKY is everything more than 24 px outside the body.

rest (per frame, worst over frames printed last):
  K1 points  - points inside the body.
  K3 follows - Pearson r between points per 32 px cell and the cell's 6 px-blurred luma, over cells
               wholly inside the body: the points thicken where the photo is bright.
  K5 width   - the body's width in px (columns with any body pixel) and its top row as a fraction
               of the height; sky_pts alongside.
light (K3, per frame and the worst): Pearson r between the sparkles' own light per 32 px cell (the
  frame with them minus the same fixed-step frame at ?spk=0) and the photo's luma in that cell
  (the ?spk=0 frame), over cells wholly inside the body. Counting peaks cannot answer K3: a
  sparkle on a bright arm stands less far over its surroundings than one in a dark gap, so the
  peak count falls where the photo is bright however the sparkles are placed (r -0.23..-0.29 at
  rest before any sparkle, the same with them).
passage (the dive's first part, from the last rest frame to scroll 0.45):
  K2 steps   - points in the whole frame, and the largest rise between two consecutive distinct
               frames as a share of the earlier one (the screencast repeats paints; a frame
               identical to the one before is skipped). Sky points: their largest count over the
               window against the rest frame's, over the whole sky and over the RIM, the 40 px
               band just past the sky's inner edge. The whole sky holds the background stars at
               the frame's sides, which rise during the dive on master's code too (v-down: 79 to
               491); a cloud spilling off the disc shows in the rim band.
"""
import glob, json, os, sys
import numpy as np
from PIL import Image, ImageFilter


def blur(a, r):
    return np.asarray(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), np.float32)


def luma(path):
    return np.asarray(Image.open(path).convert('RGB'), np.float32).mean(2)


def peaks(L, t=12):
    hp = L - blur(L, 3)
    mx = np.asarray(Image.fromarray(L.astype(np.uint8)).filter(ImageFilter.MaxFilter(3)), np.float32)
    return (hp > t) & (L >= mx)


def grow(m, k):
    """A k x k square dilation, separable (PIL's MaxFilter is k^2 per pixel)."""
    r = k // 2
    for ax in (0, 1):
        p = np.pad(m, [(r, r) if a == ax else (0, 0) for a in (0, 1)])
        n = m.shape[ax]
        m = np.logical_or.reduce([np.take(p, range(i, i + n), axis=ax) for i in range(k)])
    return m


def masks(L, ring=False):
    b24 = blur(L, 24)
    bg = float(np.median(b24[: L.shape[0] // 6]))
    body = b24 > bg + 18
    grown = grow(body, 49)
    if ring:
        return body, ~grown, grow(grown, 81) & ~grown
    return body, ~grown


def rest_one(path):
    L = luma(path)
    pk = peaks(L, 30)
    body, sky = masks(L)
    h, w = L.shape
    b6 = blur(L, 6)
    cnt, lum = [], []
    for y in range(0, h - 31, 32):
        for x in range(0, w - 31, 32):
            if body[y:y + 32, x:x + 32].all():
                cnt.append(pk[y:y + 32, x:x + 32].sum())
                lum.append(b6[y:y + 32, x:x + 32].mean())
    r = float(np.corrcoef(cnt, lum)[0, 1]) if len(cnt) > 2 and np.std(cnt) > 0 else float('nan')
    cols = np.where(body.any(0))[0]
    rows = np.where(body.any(1))[0]
    return {'frame': os.path.basename(path)[:-4], 'K1_points': int((pk & body).sum()), 'sky_pts': int((pk & sky).sum()),
            'K3_r': round(r, 3), 'cells': len(cnt), 'K5_width_px': int(cols[-1] - cols[0] + 1) if len(cols) else 0,
            'top_row': round(float(rows[0]) / h, 3) if len(rows) else None}


def rest(d, tag):
    files = sorted(glob.glob(f'{d}/{tag}-f*.png')) or [f'{d}/{tag}.png']
    rows = [rest_one(f) for f in files]
    for r in rows:
        print(json.dumps(r))
    print(json.dumps({'tag': tag, 'WORST_OF': len(rows), 'K1_points_min': min(r['K1_points'] for r in rows),
                      'K3_r_min': min(r['K3_r'] for r in rows), 'K5_width_min': min(r['K5_width_px'] for r in rows),
                      'sky_pts_max': max(r['sky_pts'] for r in rows)}))


def light(d, on, off):
    rs = []
    for fo in sorted(glob.glob(f'{d}/{on}-f*.png')):
        ff = fo.replace(f'/{on}-f', f'/{off}-f')
        A, B = luma(fo), luma(ff)
        body, _ = masks(B)
        h, w = B.shape
        add, lum = [], []
        for y in range(0, h - 31, 32):
            for x in range(0, w - 31, 32):
                if body[y:y + 32, x:x + 32].all():
                    add.append(float((A[y:y + 32, x:x + 32] - B[y:y + 32, x:x + 32]).mean()))
                    lum.append(float(B[y:y + 32, x:x + 32].mean()))
        r = float(np.corrcoef(add, lum)[0, 1])
        rs.append(r)
        print(json.dumps({'frame': os.path.basename(fo)[:-4], 'K3_r': round(r, 3), 'cells': len(add),
                          'mean_added_luma': round(float(np.mean(add)), 2)}))
    print(json.dumps({'tag': on, 'WORST_OF': len(rs), 'K3_r_min': round(min(rs), 3)}))


def passage(d):
    R = json.load(open(os.path.join(d, 'rec.json')))
    m, rec, st = R['meta'], R['rec'], R['stamps']
    files = sorted(os.listdir(os.path.join(d, 'frames')))
    at = lambda ts: min(rec, key=lambda r: abs(r[0] - ts))
    pre = [i for i in range(len(files)) if st[i] <= m['gesture']]
    win = [i for i in range(len(files)) if st[i] > m['gesture'] and at(st[i])[3] <= 0.45]
    idx = ([pre[-1]] if pre else []) + win
    rows, prev = [], None
    for i in idx:
        a = np.asarray(Image.open(os.path.join(d, 'frames', files[i])).convert('RGB'), np.float32)
        if prev is not None and np.abs(a - prev).mean() < 0.05:
            continue
        prev = a
        L = a.mean(2)
        pk = peaks(L)
        _, sky, rim = masks(L, True)
        rows.append((round(at(st[i])[3], 3), int(pk.sum()), int((pk & sky).sum()), int((pk & rim).sum())))
    steps = [(b[1] - a[1]) / max(a[1], 1) for a, b in zip(rows, rows[1:])]
    k = int(np.argmax(steps)) if steps else 0
    print(json.dumps({'run': os.path.basename(d.rstrip('/')), 'frames': len(rows), 'rest_points': rows[0][1],
                      'end_points': rows[-1][1], 'K2_max_rise_pct': round(max(steps) * 100, 1) if steps else None,
                      'at_scroll': rows[k + 1][0] if steps else None, 'sky_rest': rows[0][2],
                      'sky_max': max(r[2] for r in rows), 'sky_ratio': round(max(r[2] for r in rows) / max(rows[0][2], 1), 2),
                      'rim_rest': rows[0][3], 'rim_max': max(r[3] for r in rows),
                      'rim_ratio': round(max(r[3] for r in rows) / max(rows[0][3], 1), 2),
                      'series': rows[:: max(1, len(rows) // 12)]}))


if __name__ == '__main__':
    if sys.argv[1] == 'rest':
        for t in sys.argv[3:]:
            rest(sys.argv[2], t)
    elif sys.argv[1] == 'light':
        light(*sys.argv[2:5])
    else:
        for d in sys.argv[2:]:
            passage(d)
