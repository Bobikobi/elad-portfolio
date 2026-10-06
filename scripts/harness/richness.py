"""Galaxy and tunnel richness (#82 stage 2), from passage.mjs recordings.
  python3 scripts/harness/richness.py .harness-out/passage/<TAG> [...]

Galaxy (down runs only; the frames before the gesture, the galaxy at rest; median over them):
  G1 fine = |L - blur 1.5| and mid = |blur 1.5 - blur 6| on the galaxy body
  G2 lane% = body pixels darker than 0.75x their 16 px surround (blur 2 vs blur 16)
  G3 warm% / blue% = body pixels with R > B + 12 / B > R + 12
  The body is blur 24 over the sky floor (median of the top sixth) + 18.
Tunnel (frames whose curtain coverage is >= 0.95):
  T1 frame-to-frame mean difference (median and min over consecutive tunnel frames)
  T2 detail% = share of the frame more than 12 levels off its 6 px blur (median)
  T3 mean luminance (median) and the largest share of pixels over 200
  T4 time the curtain covers >= 0.5, and the T1 minimum over those frames (moving the whole time)
The screencast delivers most paints twice, and the copy that arrives FIRST often still holds the
previous paint (stamps ~6 ms apart, then ~30 ms to the next pair). So a frame pixel-identical to
the one before it is a repeat, not a frame the page drew: it is skipped for T1, and the time a
picture stays on screen unchanged is reported as T1_longest_hold_ms instead (a frozen tunnel
shows up there; the swap's own stall, the gap between two frames, counts too).
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageFilter


def blur(g, r):
    return np.asarray(g.filter(ImageFilter.GaussianBlur(r)), np.float32)


def galaxy(a):
    L = a.mean(2)
    g = Image.fromarray(L.astype(np.uint8))
    b24 = blur(g, 24)
    bg = float(np.median(b24[: L.shape[0] // 6]))
    body = b24 > bg + 18
    b15, b6 = blur(g, 1.5), blur(g, 6)
    fine = float(np.abs(L - b15)[body].mean())
    mid = float(np.abs(b15 - b6)[body].mean())
    lane = float(((blur(g, 2) < 0.75 * blur(g, 16)) & body).sum() / body.sum() * 100)
    R, B = a[..., 0], a[..., 2]
    warm = float(((R > B + 12) & body).sum() / body.sum() * 100)
    blue = float(((B > R + 12) & body).sum() / body.sum() * 100)
    return dict(bg=bg, body=float(body.mean() * 100), fine=fine, mid=mid, lane=lane, warm=warm, blue=blue, mean=float(L.mean()))


def run(d):
    R = json.load(open(os.path.join(d, 'rec.json')))
    m, rec, st = R['meta'], R['rec'], R['stamps']
    files = sorted(os.listdir(os.path.join(d, 'frames')))
    at = lambda ts: min(rec, key=lambda r: abs(r[0] - ts))
    out = {'run': os.path.basename(d.rstrip('/')), 'dir': m['DIR'], 'mob': m['MOB']}
    if m['DIR'] == 'down':
        rest = [i for i in range(len(files)) if st[i] < m['gesture'] - 50][1:]
        gs = [galaxy(np.asarray(Image.open(os.path.join(d, 'frames', files[i])).convert('RGB'), np.float32)) for i in rest]
        if gs:
            out['galaxy'] = {k: round(float(np.median([x[k] for x in gs])), 2) for k in gs[0]}
            out['galaxy']['frames'] = len(gs)
    tun, vis, prev, diffs, vdiffs, since, hold = [], [], None, [], [], None, 0.0
    for i, f in enumerate(files):
        cov = at(st[i])[2]
        if cov < 0.5:
            prev = None
            continue
        im = Image.open(os.path.join(d, 'frames', f)).convert('L')
        a = np.asarray(im, np.float32)
        vis.append(st[i])
        if prev is not None:
            diff = float(np.abs(a - prev).mean())
            if diff < 0.05:
                continue
            hold = max(hold, st[i] - since)
            vdiffs.append(diff)
            if cov >= 0.95:
                diffs.append(diff)
        prev, since = a, st[i]
        if cov >= 0.95:
            hp = np.abs(a - blur(im, 6))
            tun.append(((hp > 12).mean() * 100, a.mean(), (a > 200).mean() * 100))
    if tun:
        t = np.array(tun)
        out['tunnel'] = {
            'frames': len(tun),
            'T1_diff_med': round(float(np.median(diffs)), 2) if diffs else None,
            'T1_diff_min': round(float(min(diffs)), 2) if diffs else None,
            'T2_detail_pct': round(float(np.median(t[:, 0])), 1),
            'T3_mean': round(float(np.median(t[:, 1])), 1),
            'T3_over200_max_pct': round(float(t[:, 2].max()), 2),
            'T1_longest_hold_ms': round(hold),
            'T4_visible_s': round((vis[-1] - vis[0]) / 1000, 2),
            'T4_diff_min_visible': round(float(min(vdiffs)), 2) if vdiffs else None,
        }
    return out


for d in sys.argv[1:]:
    print(json.dumps(run(d)))
