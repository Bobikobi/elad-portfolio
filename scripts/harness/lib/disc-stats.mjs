/**
 * Disc statistics, shared by the NEW-1 harnesses so the two cannot drift apart.
 *
 * The disc is always supplied by the CAMERA (`?discprobe=1`), never found by thresholding a
 * screenshot: a threshold selects the lit half and then reports how bright it is, which is
 * how "too bright" and "clipped" get confused.
 *
 * DETAIL IS MEASURED AT TWO SCALES, and the reason is the whole of NEW-1's difficulty.
 * `detail5` (5px kernel) sees fine structure - coastlines, cloud edges, city lights. Earth
 * is full of it and Saturn physically has none, so scoring a gas giant against Earth on
 * `detail5` is asking Saturn to grow continents. `detail25` (25px kernel) sees BANDING,
 * which is what a gas giant actually has and what "no banding, no surface texture" is
 * pointing at. Both are reported; `detail25` is the one to move for /projects.
 */

/** Mean |L - blur(L)| over the given pixels, with a box blur of half-width K. */
function localContrast(L, w, pix, cx, cy, r, K) {
  let sum = 0;
  let n = 0;
  for (const p of pix) {
    // Only pixels whose whole window is inside the disc: the limb is an enormous gradient
    // and has nothing to do with surface texture.
    if ((p.x - cx) ** 2 + (p.y - cy) ** 2 > (r - K - 1) ** 2) continue;
    let s = 0;
    let m = 0;
    for (let dy = -K; dy <= K; dy++) {
      for (let dx = -K; dx <= K; dx++) {
        s += L[(p.y + dy) * w + (p.x + dx)];
        m++;
      }
    }
    sum += Math.abs(p.lum - s / m);
    n++;
  }
  return n ? sum / n : 0;
}

export function discStats(buf, w, h, cx, cy, R, frac) {
  const r = R * frac;
  const L = new Float64Array(w * h);
  const inside = [];
  for (let y = Math.max(0, Math.floor(cy - r)); y < Math.min(h, Math.ceil(cy + r)); y++) {
    for (let x = Math.max(0, Math.floor(cx - r)); x < Math.min(w, Math.ceil(cx + r)); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
      const i = (y * w + x) * 3;
      const lum = 0.2126 * buf[i] + 0.7152 * buf[i + 1] + 0.0722 * buf[i + 2];
      L[y * w + x] = lum;
      inside.push({ x, y, lum, r: buf[i], g: buf[i + 1], b: buf[i + 2] });
    }
  }
  if (!inside.length) return null;

  const lums = inside.map((p) => p.lum).sort((a, b) => a - b);
  const lo = lums[Math.floor(lums.length * 0.02)];
  const hi = lums[Math.floor(lums.length * 0.98)];
  // Lit by the disc's OWN range rather than an absolute cut, so one rule works on a bright
  // Saturn and a darker Earth. The night side is excluded on purpose: averaging it in hides
  // exactly the shoulder this is looking for.
  const lit = inside.filter((p) => p.lum >= lo + (hi - lo) * 0.25);
  const litL = lit.map((p) => p.lum).sort((a, b) => a - b);
  const q = (f) => litL[Math.min(litL.length - 1, Math.floor(litL.length * f))];

  // Colour, because "flat near-white cream mass" is a saturation complaint as much as a
  // contrast one. Mean chroma = mean (max channel - min channel) over the lit disc.
  const chroma = lit.reduce((a, p) => a + (Math.max(p.r, p.g, p.b) - Math.min(p.r, p.g, p.b)), 0) / lit.length;

  return {
    litFrac: +(lit.length / inside.length).toFixed(3),
    meanLit: +(lit.reduce((a, p) => a + p.lum, 0) / lit.length).toFixed(1),
    p50Lit: +q(0.5).toFixed(1),
    p99Lit: +q(0.99).toFixed(1),
    pctAbove250: +((100 * lit.filter((p) => p.lum >= 250).length) / lit.length).toFixed(2),
    pctChannel255: +((100 * lit.filter((p) => p.r >= 255 || p.g >= 255 || p.b >= 255).length) / lit.length).toFixed(2),
    chroma: +chroma.toFixed(1),
    detail5: +localContrast(L, w, lit, cx, cy, r, 2).toFixed(2),
    detail25: +localContrast(L, w, lit, cx, cy, r, 12).toFixed(2),
  };
}
