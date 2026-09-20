"""ASTEROID-BACKLIT measurement. usage: belt-backlit.py <run-dir> [--sheet out.png]
Per backlit rock (cosPhase < -0.5, px >= 6): inside 0.6 x radius, share of pixels with
luma > X (B1) and mean luma, for every configuration in the same frozen frame."""
import json, sys, numpy as np
from PIL import Image
X = 48
run = sys.argv[1]
d = json.load(open(f'{run}/probe.json'))
cfgs = ['base', 'nodust', 'noband', 'bare', 'nodither', 'nospec', 'gate008', 'gate015', 'gate03', 'gate05']
img = {c: np.asarray(Image.open(f'{run}/{c}.png').convert('RGB')).astype(float) for c in cfgs}
luma = {c: 0.2126*a[..., 0] + 0.7152*a[..., 1] + 0.0722*a[..., 2] for c, a in img.items()}
H, W = luma['base'].shape
yy, xx = np.mgrid[0:H, 0:W]
sel = [r for r in d['rocks'] if r['cosPhase'] < -0.5 and r['px'] >= 6]
# rocks whose footprint overlaps another rock's are excluded: the 0.6r disc must be one rock's
def foot(r, k=0.6): return (xx - r['x'])**2 + (yy - r['y'])**2 <= (r['px']/2*k)**2
res = {c: {'share': [], 'mean': [], 'n': []} for c in cfgs}
kept = []
for r in sel:
    if any(o is not r and (o['x']-r['x'])**2 + (o['y']-r['y'])**2 < (o['px']/2 + r['px']/2 + 2)**2 for o in d['rocks'] if o['px'] >= 3):
        continue
    kept.append(r)
    m = foot(r)
    for c in cfgs:
        v = luma[c][m]
        res[c]['share'].append(float((v > X).mean())); res[c]['mean'].append(float(v.mean())); res[c]['n'].append(int(m.sum()))
out = {'rocks': len(kept)}
for c in cfgs:
    s = np.array(res[c]['share']); mn = np.array(res[c]['mean'])
    out[c] = {'rocks_with_bright': int((s > 0).sum()), 'pixel_share_pct': round(float(np.average(s, weights=res[c]['n']))*100, 2), 'mean_luma': round(float(mn.mean()), 2), 'max_luma_in_footprints': round(max(float(luma[c][foot(r)].max()) for r in kept), 1) if kept else None}
out['frame_mean'] = {c: round(float(luma[c].mean()), 3) for c in cfgs}
print(json.dumps(out, indent=1))
if '--sheet' in sys.argv:
    tiles = []
    for r in kept[:8]:
        row = []
        for c in cfgs:
            x0, y0 = int(r['x']) - 20, int(r['y']) - 20
            t = img[c][max(y0, 0):y0 + 40, max(x0, 0):x0 + 40].astype('uint8')
            t = np.pad(t, ((0, 40 - t.shape[0]), (0, 40 - t.shape[1]), (0, 0)))
            row.append(np.kron(t, np.ones((4, 4, 1), dtype='uint8')))
        tiles.append(np.hstack(row))
    Image.fromarray(np.vstack(tiles)).save(sys.argv[sys.argv.index('--sheet') + 1])
