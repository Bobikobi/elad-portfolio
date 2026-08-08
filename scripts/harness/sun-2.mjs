/**
 * SUN-2 - does the sun read as a photographed star rather than a smooth disc.
 *
 *   BASE=<alias-or-prod> [BYPASS=<token>] [CHROME=...] node scripts/harness/sun-2.mjs
 *
 * Measures the five criteria from `docs/briefs/SUN-2-brief.md` off a screenshot of the sun,
 * cropped by the disc's own silhouette:
 *
 *  C1 granulation - high-frequency energy (the crop minus a blurred copy of itself)
 *  C2 sphericity  - limb luminance against centre luminance, and monotone in between
 *  C3 live edge   - the silhouette's radius varies, and moves between frames
 *  C4 tier law    - draw calls and triangles per frame, and frame time
 *  C5 discipline  - clipped pixels, and the mid tone the B3 pass measured
 *
 * Nothing is reported unless a real GPU answered AND the sun is actually on screen at a
 * usable size. A blank frame produces a beautifully consistent set of numbers, and three
 * harness defects in the previous stage all had the same shape: an instrument confidently
 * measuring something other than what it claimed.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import os from 'os';
import zlib from 'zlib';

const BASE = process.env.BASE || 'http://localhost:3112';
const BYPASS = process.env.BYPASS || '';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'sun-2');
const SETTLE = Number(process.env.SETTLE || 12000);
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Minimal PNG reader: enough for the 8-bit RGBA screenshots Chromium produces. */
function readPng(buf) {
  let pos = 8, width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2)) {
    throw new Error(`unsupported PNG: depth ${bitDepth} colour ${colorType}`);
  }
  const channels = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  let rp = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++];
    const line = raw.subarray(rp, rp + stride);
    rp += stride;
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= channels ? prev[x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 0xff;
    }
  }
  return { width, height, channels, data: out };
}

const lum = (img, x, y) => {
  const i = (y * img.width + x) * img.channels;
  return 0.2126 * img.data[i] + 0.7152 * img.data[i + 1] + 0.0722 * img.data[i + 2];
};

/** Separable box blur of a luminance plane, radius r. */
function blur(plane, w, h, r) {
  const tmp = new Float64Array(w * h);
  const out = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let d = -r; d <= r; d++) {
        const xx = x + d;
        if (xx < 0 || xx >= w) continue;
        s += plane[y * w + xx]; n++;
      }
      tmp[y * w + x] = s / n;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let d = -r; d <= r; d++) {
        const yy = y + d;
        if (yy < 0 || yy >= h) continue;
        s += tmp[yy * w + x]; n++;
      }
      out[y * w + x] = s / n;
    }
  }
  return out;
}

/** The disc, as the CAMERA reports it - see `hudFrame` below. Thresholding a screenshot for
 *  it does not work: the bloom skirt and the two planets sitting on the sun's edge come back
 *  as part of the same bright blob, which put the radius 33% out and made the edge appear to
 *  vary by 23%. Kept only as a fallback, and the run refuses to report if it is used. */
function findDiscByThreshold(img) {
  let maxL = 0;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) maxL = Math.max(maxL, lum(img, x, y));
  // Half the peak: the plasma surface is far brighter than the space and the bloom skirt.
  const thr = maxL * 0.5;
  let sx = 0, sy = 0, n = 0, minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (lum(img, x, y) < thr) continue;
      sx += x; sy += y; n++;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  if (!n) return null;
  const cx = sx / n, cy = sy / n;
  // Radius from the AREA, not from the bbox: a prominence or a streak stretches the box.
  const r = Math.sqrt(n / Math.PI);
  return { cx, cy, r, pixels: n, thr, maxL, bbox: [minX, minY, maxX, maxY] };
}

/** The silhouette's radius at 360 angles, taken as the STEEPEST LUMINANCE DROP along each
 *  ray rather than a threshold crossing.
 *
 *  A threshold does not find this edge. The sun is wrapped in bloom that decays smoothly for
 *  another 30% of the radius, so "the last pixel above half the peak" lands somewhere out in
 *  the glow: it reported a mean radius of 222px for a disc the camera says is 175px, and an
 *  edge that "varied" by 12-23%, which is the glow's shape and not the star's. The limb is a
 *  step; the glow is a ramp; the derivative tells them apart.
 *
 *  Rays that disagree wildly with the rest are dropped, and the count is reported: a planet
 *  crossing the disc's edge or a prominence licking out takes its ray with it, and they must
 *  not be averaged in silently. */
function silhouette(img, disc) {
  const radii = [];
  for (let a = 0; a < 360; a++) {
    const th = (a * Math.PI) / 180;
    const dx = Math.cos(th), dy = Math.sin(th);
    let best = 0, bestDrop = 0;
    let prev = null;
    for (let t = disc.r * 0.6; t < disc.r * 1.5; t += 0.5) {
      const x = Math.round(disc.cx + dx * t);
      const y = Math.round(disc.cy + dy * t);
      if (x < 0 || y < 0 || x >= img.width || y >= img.height) break;
      const L = lum(img, x, y);
      if (prev !== null) {
        const drop = prev - L;
        if (drop > bestDrop) { bestDrop = drop; best = t; }
      }
      prev = L;
    }
    radii.push(best);
  }
  const sorted = [...radii].filter((v) => v > 0).sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  const kept = radii.map((v) => (median > 0 && Math.abs(v - median) <= median * 0.25 ? v : null));
  return { radii, kept, median, dropped: kept.filter((v) => v === null).length };
}

function analyse(img, disc) {
  const [x0, y0, x1, y1] = [
    Math.max(0, Math.floor(disc.cx - disc.r * 1.2)),
    Math.max(0, Math.floor(disc.cy - disc.r * 1.2)),
    Math.min(img.width - 1, Math.ceil(disc.cx + disc.r * 1.2)),
    Math.min(img.height - 1, Math.ceil(disc.cy + disc.r * 1.2)),
  ];
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const plane = new Float64Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) plane[y * w + x] = lum(img, x0 + x, y0 + y);

  const fine = blur(plane, w, h, 4);
  const coarse = blur(plane, w, h, 24);
  const inner = (x, y) => {
    const dx = x0 + x - disc.cx, dy = y0 + y - disc.cy;
    return Math.sqrt(dx * dx + dy * dy) <= disc.r * 0.8;
  };
  let hfN = 0, hfS = 0, hfS2 = 0, lfN = 0, lfS = 0, lfS2 = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inner(x, y)) continue;
      const hf = plane[y * w + x] - fine[y * w + x];
      const lf = plane[y * w + x] - coarse[y * w + x];
      hfN++; hfS += hf; hfS2 += hf * hf;
      lfN++; lfS += lf; lfS2 += lf * lf;
    }
  }
  const sd = (n, s, s2) => (n ? Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2)) : 0);

  // Radial luminance profile, 8 bins from the centre to the limb.
  const bins = Array.from({ length: 8 }, () => ({ s: 0, n: 0 }));
  let centre = { s: 0, n: 0 }, limb = { s: 0, n: 0 };
  let clipped = 0, discPx = 0;
  const midR = [], midG = [], midB = [];
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const dx = x - disc.cx, dy = y - disc.cy;
      const rr = Math.sqrt(dx * dx + dy * dy) / disc.r;
      if (rr > 1) continue;
      const L = lum(img, x, y);
      discPx++;
      const i = (y * img.width + x) * img.channels;
      if (img.data[i] >= 255 || img.data[i + 1] >= 255 || img.data[i + 2] >= 255) clipped++;
      const b = Math.min(7, Math.floor(rr * 8));
      bins[b].s += L; bins[b].n++;
      if (rr < 0.25) { centre.s += L; centre.n++; }
      if (rr >= 0.90 && rr <= 0.97) { limb.s += L; limb.n++; }
      // The mid tone: pixels within a band of the disc's median-ish brightness.
      if (rr < 0.8) { midR.push(img.data[i]); midG.push(img.data[i + 1]); midB.push(img.data[i + 2]); }
    }
  }
  const med = (a) => { if (!a.length) return null; a.sort((p, q) => p - q); return a[Math.floor(a.length / 2)]; };
  const profile = bins.map((b) => (b.n ? +(b.s / b.n).toFixed(2) : null));
  let monotone = true;
  for (let i = 1; i < profile.length; i++) if (profile[i] !== null && profile[i - 1] !== null && profile[i] > profile[i - 1] + 1.0) monotone = false;

  return {
    highFreqSd: +sd(hfN, hfS, hfS2).toFixed(3),
    lowFreqSd: +sd(lfN, lfS, lfS2).toFixed(3),
    limbRatio: centre.n && limb.n ? +((limb.s / limb.n) / (centre.s / centre.n)).toFixed(4) : null,
    profile,
    monotone,
    clippedShare: discPx ? +(clipped / discPx).toFixed(4) : null,
    midTone: [med(midR), med(midG), med(midB)],
    discPixels: discPx,
  };
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 240000,
  userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'harness-profile-')),
  args: [
    '--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars',
    '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage',
    '--user-agent-suffix=elad-harness',
  ],
});

const ctx = await browser.createBrowserContext();
const page = await ctx.newPage();
if (BYPASS) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': BYPASS });
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(`${BASE}/?hud=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await wait(SETTLE);

// The sun is in the SOLAR act, at the end of the scroll driver. Park there and let the rig
// settle - a frame caught mid-transition is a different composition entirely.
await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
await wait(SETTLE);

const gpu = await page.evaluate(() => {
  const g = document.createElement('canvas').getContext('webgl2');
  const d = g?.getExtension('WEBGL_debug_renderer_info');
  return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'none';
});
const realGpu = /angle|vulkan/i.test(gpu) && !/swiftshader/i.test(gpu);

// Where the disc is, straight from the camera. Without the debug hooks there is no honest
// measurement here at all, so say so rather than falling back quietly: the hooks are
// stripped from the production bundle, which means SUN-2 can only be measured on a preview.
const hud = await page.evaluate(() => {
  const h = window.__hud;
  // `corners` is the R2.2 milky-halo acceptance: the emissive this stage lowers is what
  // Bloom reads, so the halo has to be re-measured, not assumed unchanged.
  return h ? { solar: h.solar, sunPx: h.sunPx, sunX: h.sunX, sunY: h.sunY, vw: h.vw, vh: h.vh, calls: h.calls, tris: h.tris, fps: h.fps, corners: h.corners, center: h.center } : null;
});
const hudDisc = hud && hud.solar && hud.sunPx > 40
  ? { cx: hud.sunX, cy: hud.sunY, r: hud.sunPx / 2, pixels: Math.PI * (hud.sunPx / 2) ** 2, fromCamera: true }
  : null;

// C4: what the renderer actually does per frame, sampled over 120 frames.
const cost = await page.evaluate(() => new Promise((resolve) => {
  const frames = [];
  let calls = null, tris = null, last = performance.now(), n = 0;
  const tick = () => {
    const now = performance.now();
    frames.push(now - last); last = now;
    // Published by the HUD probe from inside the Canvas - the renderer is not reachable
    // from the page otherwise.
    if (window.__hud) { calls = window.__hud.calls; tris = window.__hud.tris; }
    if (++n < 120) requestAnimationFrame(tick);
    else {
      frames.sort((a, b) => a - b);
      resolve({ calls, tris, medianFrame: +frames[Math.floor(frames.length / 2)].toFixed(2), frames: frames.length });
    }
  };
  requestAnimationFrame(tick);
}));

// The HUD panel is a DOM overlay in the same screenshot. It sits top-left and the sun does
// not, but a measurement that depends on that staying true is one bad viewport from lying.
await page.evaluate(() => { for (const el of document.querySelectorAll('pre')) el.style.display = 'none'; });

const shots = [];
for (let i = 0; i < 3; i++) {
  const buf = await page.screenshot({ encoding: 'binary' });
  fs.writeFileSync(path.join(OUT, `frame-${i}.png`), buf);
  shots.push(readPng(buf));
  if (i < 2) await wait(2000);
}
await page.close();
await ctx.close();
await browser.close();

const disc = hudDisc || findDiscByThreshold(shots[0]);
if (!disc) {
  console.log('ERROR no disc found - the sun is not on screen, nothing below would mean anything');
  process.exitCode = 1;
} else {
  const sils = shots.map((s) => silhouette(s, disc));
  const kept0 = sils[0].kept.filter((v) => v !== null);
  const mean = kept0.reduce((a, b) => a + b, 0) / Math.max(1, kept0.length);
  const sd = Math.sqrt(kept0.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, kept0.length));
  // An angle counts as moving only if it survived the outlier filter in ALL three frames -
  // otherwise a planet drifting across the limb reads as the star's edge coming apart.
  let moved = 0, comparable = 0;
  for (let a = 0; a < 360; a++) {
    const v0 = sils[0].kept[a], v1 = sils[1].kept[a], v2 = sils[2].kept[a];
    if (v0 === null || v1 === null || v2 === null) continue;
    comparable++;
    if (Math.max(Math.abs(v1 - v0), Math.abs(v2 - v0)) > mean * 0.005) moved++;
  }
  const stats = analyse(shots[0], disc);
  const report = {
    base: BASE, gpu, realGpu, hud, discFromCamera: Boolean(hudDisc),
    disc: { cx: +disc.cx.toFixed(1), cy: +disc.cy.toFixed(1), r: +disc.r.toFixed(1), pixels: disc.pixels },
    cost,
    edge: {
      meanRadius: +mean.toFixed(2),
      cameraRadius: +disc.r.toFixed(2),
      radiusSdShare: +(sd / mean).toFixed(4),
      anglesMoved: moved,
      anglesComparable: comparable,
      anglesDropped: sils[0].dropped,
    },
    ...stats,
  };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  // A disc under 40px across cannot carry a granulation measurement.
  if (!realGpu || disc.r < 20 || !hudDisc || cost.calls == null) {
    console.log(
      `REFUSING to report: realGpu=${realGpu} discRadius=${disc.r.toFixed(1)}px ` +
      `discFromCamera=${Boolean(hudDisc)} calls=${cost.calls}` +
      (hudDisc ? '' : ' - no debug hooks: run this against a PREVIEW, not production')
    );
    process.exitCode = 1;
  }
}
