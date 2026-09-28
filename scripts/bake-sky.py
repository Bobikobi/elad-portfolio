"""Bake public/sky/stars.bin and public/sky/milkyway.png for RealSky.tsx.

Source data: d3-celestial 0.7.35 (BSD-3, Olaf Frohn), fetched into a work dir first:
  mkdir -p .scratch/sky && cd .scratch/sky && for f in stars.8.json mw.json; do
    curl -sL --http1.1 -O https://cdn.jsdelivr.net/npm/d3-celestial@0.7.35/data/$f; done
Run from the repo root:  python3 scripts/bake-sky.py .scratch/sky
Needs numpy + Pillow. Figure stars are read from src/lib/constellations.ts and left out.
"""
import os
import json, math, re, sys, numpy as np
from PIL import Image, ImageDraw, ImageFilter
E = math.radians(23.4393)
MAG_LIMIT = 7.5
DATA = sys.argv[1] if len(sys.argv) > 1 else '.scratch/sky'
OUT = 'public/sky/'
def ecl(ra, dec):
    a, d = np.radians(ra), np.radians(dec)
    x = np.cos(d)*np.cos(a); y = np.cos(d)*np.sin(a); z = np.sin(d)
    y2 = y*np.cos(E) + z*np.sin(E); z2 = -y*np.sin(E) + z*np.cos(E)
    return np.degrees(np.arctan2(y2, x)) % 360, np.degrees(np.arcsin(z2))
# --- figure stars (to skip) from the TS source
src = open('src/lib/constellations.ts').read()
fig = [tuple(map(float, m)) for m in re.findall(r'\[(-?[\d.]+), (-?[\d.]+), -?[\d.]+\]', src)]
fl = np.radians(np.array([f[0] for f in fig])); fb = np.radians(np.array([f[1] for f in fig]))
fv = np.stack([np.cos(fb)*np.cos(fl), np.cos(fb)*np.sin(fl), np.sin(fb)], 1)
st = [f for f in json.load(open(os.path.join(DATA, 'stars.8.json')))['features'] if f['properties']['mag'] <= MAG_LIMIT]
ra = np.array([f['geometry']['coordinates'][0] for f in st]) % 360
de = np.array([f['geometry']['coordinates'][1] for f in st])
mag = np.array([f['properties']['mag'] for f in st], float)
bv = np.array([float(f['properties']['bv']) if f['properties']['bv'] not in ('', None) else 0.6 for f in st])
L, B = ecl(ra, de)
v = np.stack([np.cos(np.radians(B))*np.cos(np.radians(L)), np.cos(np.radians(B))*np.sin(np.radians(L)), np.sin(np.radians(B))], 1)
near = np.zeros(len(st), bool)
for i in range(0, len(st), 4000):
    near[i:i+4000] = (v[i:i+4000] @ fv.T).max(1) > math.cos(math.radians(0.15))
keep = ~near
print('stars', len(st), 'in figures', near.sum(), 'kept', keep.sum(), 'figure pts', len(fig))
# 6 bytes a star, little-endian: u16 lon*100, u16 (lat+90)*100, u8 (mag+2)*25, u8 (B-V+0.5)*100
order = np.argsort(mag[keep])  # brightest first
rec = np.zeros(keep.sum(), dtype=[('lon', '<u2'), ('lat', '<u2'), ('mag', 'u1'), ('bv', 'u1')])
rec['lon'] = (np.round(L[keep]*100) % 36000)[order]
rec['lat'] = np.round((B[keep]+90)*100)[order]
rec['mag'] = np.clip(np.round((mag[keep]+2)*25), 0, 255)[order]
rec['bv'] = np.clip(np.round((np.clip(bv[keep], -0.4, 2.0)+0.5)*100), 0, 255)[order]
rec.tofile(OUT + 'stars.bin'); arr = rec
print('bin bytes', arr.nbytes)
# --- Milky Way: rasterise in RA/Dec, resample into ecliptic equirect
W, H = 2048, 1024
acc = np.zeros((H, W), np.float32)
def px(ring):
    lon = np.array([p[0] for p in ring], float); lat = np.array([p[1] for p in ring], float)
    lon = np.degrees(np.unwrap(np.radians(lon)))
    return lon, lat
for f in json.load(open(os.path.join(DATA, 'mw.json')))['features']:
    lvl = np.zeros((H, W), bool)
    for poly in f['geometry']['coordinates']:
        for ring in poly:
            lon, lat = px(ring)
            if abs(lon[-1] - lon[0]) > 300:  # wraps the sky: close it over the north pole
                lon = np.append(lon, [lon[-1], lon[0]]); lat = np.append(lat, [90, 90])
            img = Image.new('1', (W, H), 0); d = ImageDraw.Draw(img)
            for off in (-360, 0, 360):
                d.polygon([((x + off + 180) / 360 * W, (90 - y) / 180 * H) for x, y in zip(lon, lat)], fill=1)
            lvl ^= np.asarray(img, bool)
    print(f['id'], 'cover %.3f' % lvl.mean())
    acc += lvl
print('mw levels max', acc.max())
# ecliptic grid -> ra/dec -> sample acc (RA/Dec image: x = (ra+180)/360 with ra in -180..180)
lon = (np.arange(W) + 0.5) / W * 360; lat = 90 - (np.arange(H) + 0.5) / H * 180
LL, BB = np.meshgrid(np.radians(lon), np.radians(lat))
x = np.cos(BB)*np.cos(LL); y = np.cos(BB)*np.sin(LL); z = np.sin(BB)
y2 = y*np.cos(E) - z*np.sin(E); z2 = y*np.sin(E) + z*np.cos(E)
RA = np.degrees(np.arctan2(y2, x)); DE = np.degrees(np.arcsin(z2))
ix = np.clip(((RA + 180) / 360 * W).astype(int), 0, W-1); iy = np.clip(((90 - DE) / 180 * H).astype(int), 0, H-1)
out = acc[iy, ix] / acc.max()
im = Image.fromarray((out * 255).astype(np.uint8)).resize((1024, 512), Image.LANCZOS).filter(ImageFilter.GaussianBlur(4))
im.save(OUT + 'milkyway.png', optimize=True)
# check: galactic centre (RA 266.4, Dec -29.0) should be bright; north galactic pole (192.9, 27.1) dark
for name, r, dd in [('GC', 266.4, -29.0), ('NGP', 192.9, 27.1), ('Cyg', 305, 40)]:
    l, b = ecl(np.array(r), np.array(dd)); a = np.asarray(im)
    print(name, 'ecl', round(float(l),1), round(float(b),1), 'value', a[int((90-b)/180*512), int(l/360*1024)])
