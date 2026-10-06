"""M101 in motion (#82 stage 2, owner 2026-10-04): the galaxy alive at rest and rich in the dive,
the tunnel's colour taken from the galaxy, and a seamless hand-over between the two.

  python3 scripts/harness/m101-motion.py rest <TAG>                  (rest-life.mjs captures)
  python3 scripts/harness/m101-motion.py passage .harness-out/passage/<TAG> [...]   (passage.mjs, down runs)

rest (C3, alive at rest): per phase, the disc body's mean |luma difference| between the frame and
  the frame 1 step later (d1) and GAP steps later (dGAP, 0.5 s at 30), and the share of the body
  that changed by more than 2 levels. Median over phases. The body is blur 24 over the sky floor
  (median of the top sixth) + 18, as richness.py takes it.
passage:
  C1 colour   - B/R of the frame's mean colour: the last galaxy frame (the last frame before the
                curtain shows, coverage <= 0.006) against the tunnel's first half (coverage >= 0.95
                while the act is still the galaxy). The tunnel then warms toward the sun on purpose
                (owner, 2026-10-04), so its second half is reported, not judged.
  C2 seam     - max over R, G, B of |mean(first tunnel frame) - mean(last galaxy frame)|, the first
                tunnel frame being the first at coverage >= 0.95. Also the largest step between
                two consecutive distinct frames from the last galaxy frame to the first tunnel one.
  C4 dive     - fine = |L - blur 1.5| over the whole frame (the body mask fails on a dimmed dive
                frame), median over the dive: the frames after the gesture and before the curtain.
                Mid (|blur 1.5 - blur 6|) and the frame mean alongside.
The screencast delivers most paints twice; a frame identical to the one before it is a repeat and
is skipped where steps between frames are measured.
"""
import glob, json, os, sys
import numpy as np
from PIL import Image, ImageFilter


def blur(g, r):
    return np.asarray(g.filter(ImageFilter.GaussianBlur(r)), np.float32)


def luma(a):
    return a.mean(2)


def body_mask(L):
    b24 = blur(Image.fromarray(L.astype(np.uint8)), 24)
    bg = float(np.median(b24[: L.shape[0] // 6]))
    return b24 > bg + 18


def rest(tag, d='.harness-out/rest-life'):
    phases = sorted({os.path.basename(f).split('-p')[1].split('-')[0] for f in glob.glob(f'{d}/{tag}-p*-d0.png')}, key=int)
    rows = []
    for ph in phases:
        load = lambda s: np.asarray(Image.open(f'{d}/{tag}-p{ph}-d{s}.png').convert('RGB'), np.float32)
        a0 = load(0)
        L0 = luma(a0)
        body = body_mask(L0)
        row = {'phase': int(ph), 'body_pct': round(float(body.mean() * 100), 1)}
        for f in sorted(glob.glob(f'{d}/{tag}-p{ph}-d*.png')):
            s = os.path.basename(f).split('-d')[-1][:-4]
            if s == '0':
                continue
            diff = np.abs(luma(load(s)) - L0)[body]
            row[f'd{s}_mean'] = round(float(diff.mean()), 3)
            row[f'd{s}_over2_pct'] = round(float((diff > 2).mean() * 100), 2)
        rows.append(row)
    keys = [k for k in rows[0] if k.startswith('d')]
    med = {k: round(float(np.median([r[k] for r in rows])), 3) for k in keys}
    print(json.dumps({'tag': tag, 'median': med, 'phases': rows}))


def passage(d):
    R = json.load(open(os.path.join(d, 'rec.json')))
    m, rec, st = R['meta'], R['rec'], R['stamps']
    files = sorted(os.listdir(os.path.join(d, 'frames')))
    at = lambda ts: min(rec, key=lambda r: abs(r[0] - ts))
    img = lambda i: np.asarray(Image.open(os.path.join(d, 'frames', files[i])).convert('RGB'), np.float32)
    info = [(i, at(st[i])) for i in range(len(files))]
    after = [(i, r) for i, r in info if st[i] > m['gesture']]
    first_cov = next(k for k, (i, r) in enumerate(after) if r[2] > 0.006)
    last_gal = after[first_cov - 1][0]
    first_tun = next(i for i, r in after if r[2] >= 0.95)
    tun1 = [i for i, r in after if r[2] >= 0.95 and r[1] == 'galaxy']
    tun2 = [i for i, r in after if r[2] >= 0.95 and r[1] != 'galaxy']
    dive = [i for i, r in after[:first_cov] if r[3] > 0.015]

    br = lambda a: float(a[..., 2].mean() / max(a[..., 0].mean(), 1e-6))
    g = img(last_gal)
    gbr = br(g)
    t1 = [br(img(i)) for i in tun1]
    t2 = [br(img(i)) for i in tun2]
    t1m = float(np.mean(t1)) if t1 else None
    mean_rgb = lambda a: a.reshape(-1, 3).mean(0)
    seam = float(np.abs(mean_rgb(img(first_tun)) - mean_rgb(g)).max())
    steps, prev = [], None
    for i in range(last_gal, first_tun + 1):
        a = img(i)
        if prev is not None:
            if np.abs(a - prev).mean() < 0.05:
                continue
            steps.append(float(np.abs(mean_rgb(a) - mean_rgb(prev)).max()))
        prev = a

    fine, mid, mean = [], [], []
    for i in dive:
        a = img(i)
        L = luma(a)
        gL = Image.fromarray(L.astype(np.uint8))
        b15, b6 = blur(gL, 1.5), blur(gL, 6)
        fine.append(float(np.abs(L - b15).mean()))
        mid.append(float(np.abs(b15 - b6).mean()))
        mean.append(float(L.mean()))
    out = {
        'run': os.path.basename(d.rstrip('/')),
        'C1': {'galaxy_BR': round(gbr, 3), 'tunnel1_BR': round(t1m, 3) if t1m else None,
               'off_pct': round((t1m / gbr - 1) * 100, 1) if t1m else None,
               'tunnel2_BR': round(float(np.mean(t2)), 3) if t2 else None, 'frames1': len(t1), 'frames2': len(t2)},
        'C2': {'galaxy_rgb': [round(float(x), 1) for x in mean_rgb(g)], 'tunnel_rgb': [round(float(x), 1) for x in mean_rgb(img(first_tun))],
               'jump': round(seam, 1), 'max_step': round(max(steps), 1) if steps else None},
        'C4': {'frames': len(dive), 'fine': round(float(np.median(fine)), 3), 'mid': round(float(np.median(mid)), 3),
               'mean': round(float(np.median(mean)), 1), 'fine_p75': round(float(np.percentile(fine, 75)), 3)},
    }
    print(json.dumps(out))


if __name__ == '__main__':
    if sys.argv[1] == 'rest':
        for t in sys.argv[2:]:
            rest(t)
    else:
        for d in sys.argv[2:]:
            passage(d)
