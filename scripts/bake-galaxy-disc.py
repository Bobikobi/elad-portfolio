"""Bake public/images/galaxy/m101-disc-{2048,4096}.webp, the galaxy act's disc (Galaxy.tsx).

Source: the Hubble mosaic of M101 (ESA/Hubble heic0602 = STScI-PRC2006-10a, CC BY 4.0 - credit
"ESA & NASA (Hubble), with CFHT and NOAO data", changes indicated; see the footer). Fetched first:
  mkdir -p .scratch/galaxy && curl -sL -o .scratch/galaxy/m101-3840.jpg \
    https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/M101_hires_STScI-PRC2006-10a.jpg/3840px-M101_hires_STScI-PRC2006-10a.jpg
Run from the repo root:  python3 scripts/bake-galaxy-disc.py [.scratch/galaxy/m101-3840.jpg]
Needs numpy + Pillow.

What it changes, in order (all in display-linear light):
- mirrored, so the arms wind the way the disc turns (trailing);
- the brightest foreground Milky Way stars removed (their diffraction spikes would turn with
  the disc and swell in the dive), each hole filled with a matching patch from nearby;
- the sky subtracted and the faint outskirts denoised, then floored to true black so the
  additive plane adds nothing past the galaxy's light;
- the corners the frame cut off filled from the same radius a quarter turn round;
- an irregular outer fade, so the rim is not a circle.
Row 0 of the output is world -z (the far side of the disc at rest).
"""
import os, sys, numpy as np
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else '.scratch/galaxy/m101-3840.jpg'
OUT = 'public/images/galaxy/'
RD = 1900.0      # source px from the nucleus to the plane's edge
SIZES = (4096, 2048)
# Foreground stars, (x, y, hole radius) in the MIRRORED source: every one with diffraction spikes
# or a saturated disc inside the rim. M101's own knots are round, unsaturated and spikeless, and stay.
STARS = [(2658, 132, 34), (2980, 2810, 20), (495, 1940, 26), (669, 1142, 30), (2862, 230, 34),
         (2520, 2859, 26), (2490, 2355, 16), (3077, 708, 26), (1736, 2563, 30), (1308, 2807, 24),
         (460, 2207, 32), (2956, 1451, 32), (796, 1631, 26)]
LUMA = np.array([0.2126, 0.7152, 0.0722], np.float32)

im = Image.open(SRC).convert('RGB').transpose(Image.FLIP_LEFT_RIGHT)
a = np.asarray(im).astype(np.float32) / 255.0
lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4).astype(np.float32)
H, W = lin.shape[:2]

def box(img, r):
    p = np.pad(img, ((r + 1, r), (r + 1, r)) + ((0, 0),) * (img.ndim - 2), mode='edge')
    c = p.cumsum(0).cumsum(1); k = 2 * r + 1
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)

def sst(e0, e1, v):
    t = np.clip((v - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

# Foreground stars: each hole is filled with a patch of the photo from nearby, copied in whole
# pixels so the grain is the photo's own. The patch is the one whose surroundings continue the
# hole's surroundings (the blurred light in a ring around both), whose level, colour and point
# density match that ring, and that brings no bright star of its own. Tried first and dropped:
# a smooth (Laplace) fill - grain-free grey discs, brighter where a halo lifted the rim; a patch
# a little further round the same circle about the nucleus, chosen by its own point sources -
# it copied an unlisted spiked star once, and picking the emptiest patch left darker discs in
# the resolved-star fields and a soft blue disc where it landed on a knot.
src = lin.copy()
Lsrc = src @ LUMA
Lblur = box(Lsrc, 4)
Lpeak = box(Lsrc, 2)  # a 5x5 mean: a saturated star survives it, the photo's one-pixel points do not
for sx, sy, hr in STARS:
    R = int(hr * 1.35)                         # the halo reaches past the spikes' hole
    Q = int(R * 1.5)
    gy, gx = np.mgrid[-Q:Q + 1, -Q:Q + 1]; dd = np.hypot(gx, gy)
    inner, ann = dd <= R, (dd > R) & (dd <= Q)
    T, Tb = Lsrc[sy - Q:sy + Q + 1, sx - Q:sx + Q + 1], Lblur[sy - Q:sy + Q + 1, sx - Q:sx + Q + 1]
    ring = T[ann]; lo, hi = np.percentile(ring, [2, 98])
    tmean = ring[(ring >= lo) & (ring <= hi)].mean() + 1e-6    # trimmed: spike ends out
    tdens = np.percentile(ring, 90) - np.percentile(ring, 50) + 1e-6
    tpeak = np.percentile(ring, 99) + 1e-6
    trgb = src[sy - Q:sy + Q + 1, sx - Q:sx + Q + 1][ann].mean(0) + 1e-6
    best = None
    # Searched out to 10 hole radii: the star at (1736, 2563) sits in a dark inter-arm patch
    # with nothing as dark within 6, and its patch came out a brighter, hazier disc. A free
    # gain with every test made relative to it was tried too: it picked bright blue knots
    # scaled down, which read as blue discs, and let a spiked star through.
    for dist in np.arange(2.6, 10.01, 0.5) * R:
        for a in np.linspace(0, 2 * np.pi, int(2 * np.pi * dist / (0.5 * R)), endpoint=False):
            ox, oy = int(round(sx + dist * np.cos(a))), int(round(sy + dist * np.sin(a)))
            if ox - Q < 0 or oy - Q < 0 or ox + Q >= W or oy + Q >= H: continue
            if any(np.hypot(ox - x, oy - y) < Q + h * 1.35 for x, y, h in STARS): continue
            C, Cb = Lsrc[oy - Q:oy + Q + 1, ox - Q:ox + Q + 1], Lblur[oy - Q:oy + Q + 1, ox - Q:ox + Q + 1]
            ci = C[inner]
            # Brings a star of its own. Measured: the 13 listed stars peak at 0.77-0.99 here, the
            # median patch at 0.08-0.31; a plain maximum is useless, every patch has a saturated pixel.
            if Lpeak[oy - R:oy + R + 1, ox - R:ox + R + 1][inner[Q - R:Q + R + 1, Q - R:Q + R + 1]].max() > 0.45: continue
            cmean = ci.mean() + 1e-6
            cdens = np.percentile(ci, 90) - np.percentile(ci, 50) + 1e-6
            crgb = src[oy - Q:oy + Q + 1, ox - Q:ox + Q + 1][inner].mean(0) + 1e-6
            seam = np.abs(Cb[ann] - Tb[ann]).mean() / (Tb[ann].mean() + 1e-6)
            score = (abs(np.log(cmean / tmean)) + 0.5 * abs(np.log(cdens / tdens)) + seam
                     + 0.5 * np.abs(np.log((crgb / crgb.sum()) / (trgb / trgb.sum()))).sum())
            if best is None or score < best[0]: best = (score, ox, oy, cmean)
    _, ox, oy, cmean = best
    print(f'star ({sx}, {sy}): patch from ({ox}, {oy}), score {best[0]:.2f}, level x{tmean / cmean:.2f}')
    patch = src[oy - R:oy + R + 1, ox - R:ox + R + 1] * np.clip(tmean / cmean, 0.8, 1.25)
    w = (1 - sst(0.75 * R, R, dd[Q - R:Q + R + 1, Q - R:Q + R + 1]))[..., None]
    lin[sy - R:sy + R + 1, sx - R:sx + R + 1] = patch * w + lin[sy - R:sy + R + 1, sx - R:sx + R + 1] * (1 - w)

# Centre: the peak of the blurred core near the nominal nucleus.
Lb = box(lin @ LUMA, 10)
cx0, cy0 = W - 1 - 1872, 1520
sub = Lb[cy0 - 80:cy0 + 81, cx0 - 80:cx0 + 81]; iy, ix = np.unravel_index(np.argmax(sub), sub.shape)
cx, cy = cx0 - 80 + ix, cy0 - 80 + iy
yy, xx = np.mgrid[0:H, 0:W]; rr = np.hypot(xx - cx, yy - cy)
# Sky: the darkest 30% of the outer band, per channel.
band = rr > 1650; thr = np.percentile(Lb[band], 30); skym = band & (Lb < thr)
sky = np.median(lin[skym], axis=0)
noise = float(np.std((lin @ LUMA - Lb)[skym]))
print('centre', cx, cy, 'sky', sky.round(5), 'noise', round(noise, 5))
x = lin - sky
sm = box(x, 3)
Ls = sm @ LUMA
w = sst(2 * noise, 10 * noise, Ls)[..., None]
x = sm * (1 - w) + x * w                                              # grain-free where faint
x = np.maximum(x, 0) * sst(0.6 * noise, 2.5 * noise, Ls)[..., None]  # residual sky -> 0

M = 80.0  # soft margin inside the frame
def valid(X, Y): return sst(0, M, X) * sst(0, M, W - 1 - X) * sst(0, M, Y) * sst(0, M, H - 1 - Y)
def sample(X, Y):
    X = np.clip(X, 0, W - 1.001); Y = np.clip(Y, 0, H - 1.001)
    x0 = X.astype(np.int32); y0 = Y.astype(np.int32); fx = (X - x0)[..., None]; fy = (Y - y0)[..., None]
    return (x[y0, x0] * (1 - fx) * (1 - fy) + x[y0, x0 + 1] * fx * (1 - fy)
            + x[y0 + 1, x0] * (1 - fx) * fy + x[y0 + 1, x0 + 1] * fx * fy)

N = max(SIZES)
out = np.zeros((N, N, 3), np.float32)
ph = np.random.default_rng(7).uniform(0, 2 * np.pi, 3)
for i0 in range(0, N, 256):
    i = np.arange(i0, min(N, i0 + 256))[:, None]; j = np.arange(N)[None, :]
    dx = ((j + 0.5) / N * 2 - 1) * RD + 0 * i; dy = ((i + 0.5) / N * 2 - 1) * RD + 0 * j
    rho = np.hypot(dx, dy) / RD; th = np.arctan2(dy, dx)
    cand = [(dx, dy), (-dy, dx), (dy, -dx), (-dx, -dy)]
    v = [valid(cx + p, cy + q) for p, q in cand]
    s = [sample(cx + p, cy + q) for p, q in cand]
    alt = v[1] + v[2] + 0.05 * v[3]
    fill = (s[1] * v[1][..., None] + s[2] * v[2][..., None] + 0.05 * s[3] * v[3][..., None]) / (alt[..., None] + 1e-6)
    col = s[0] * v[0][..., None] + fill * ((1 - v[0]) * np.minimum(alt, 1))[..., None]
    rim = 0.9 + 0.05 * (0.6 * np.sin(3 * th + ph[0]) + 0.4 * np.sin(5 * th + ph[1]) + 0.3 * np.sin(8 * th + ph[2])) / 1.3
    out[i0:i0 + len(i)] = col * (1 - sst(rim - 0.2, rim, rho))[..., None]

enc = np.where(out <= 0.0031308, out * 12.92, 1.055 * np.power(np.maximum(out, 0.0031308), 1 / 2.4) - 0.055)
img = Image.fromarray((np.clip(enc, 0, 1) * 255 + 0.5).astype(np.uint8))
os.makedirs(OUT, exist_ok=True)
for n in SIZES:
    p = os.path.join(OUT, f'm101-disc-{n}.webp')
    (img if n == N else img.resize((n, n), Image.LANCZOS)).save(p, quality=86, method=6)
    print(p, os.path.getsize(p) // 1024, 'KB')
