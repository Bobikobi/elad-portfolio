/**
 * MOON PASS probe. Records whole-frame brightness for long enough to see whether the
 * scene's big visual events repeat, and on what period.
 *
 *   BASE=http://localhost:3114 SECONDS=75 node scripts/harness/moon-pass-probe.mjs
 *
 * Chasing "the animation jumps, like a video looping". The night-lights frame set turned up
 * a burst of frame-to-frame differences 15x the median, lasting about a second, and the
 * difference image is unmistakable: the Moon, in two positions far apart, having crossed a
 * long way in one frame. It also lifts the whole frame's brightness by ~23% as it passes.
 *
 * At MOON_PERIOD = 26s the Moon comes round again and again, so if that is the jump then it
 * is a jump on a 26-second cycle - which is exactly what "like a video looping" describes.
 * This measures the period rather than assuming it.
 *
 * Frames come back as small JPEGs on purpose: whole-frame mean brightness is all this needs,
 * and 75 seconds of full-size PNGs is gigabytes for a number that fits in a float.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3114';
const BYPASS = process.env.BYPASS || '';
const CHROME = process.env.CHROME || '/opt/google/chrome/chrome';
const ROUTE = process.env.ROUTE || '/about';
const SECONDS = Number(process.env.SECONDS || 75);
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'moon-pass');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 240000,
  userDataDir: process.env.PROFILE || `/tmp/puppeteer-moon-${process.pid}`,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars',
    '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
if (BYPASS) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': BYPASS });
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(`${BASE}${ROUTE}?hud=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise((r) => setTimeout(r, 14000));

await page.evaluate(() => {
  const keepsCanvas = (e) => e.tagName === 'CANVAS' || !!e.querySelector('canvas');
  for (const e of document.querySelectorAll('body > *, body > * > *')) {
    if (!keepsCanvas(e)) e.style.visibility = 'hidden';
  }
  for (const e of document.querySelectorAll('nav, main, footer, header')) e.style.visibility = 'hidden';
});
await new Promise((r) => setTimeout(r, 700));

const cdp = await page.createCDPSession();
const rows = [];
cdp.on('Page.screencastFrame', async ({ data, sessionId, metadata }) => {
  try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch { /* stopped */ }
  rows.push({ t: metadata.timestamp, data });
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 60, maxWidth: 320, maxHeight: 200, everyNthFrame: 1 });

// The Moon's own position, straight from the scene, so the brightness trace can be checked
// against where the Moon actually is rather than against a story about it.
const moon = [];
const t0 = Date.now();
while (Date.now() - t0 < SECONDS * 1000) {
  const m = await page.evaluate(() => {
    const w = window;
    return w.__moon ? { dist: w.__moon.dist, rel: w.__moon.rel, r: w.__moon.radius } : null;
  });
  if (m) moon.push({ t: (Date.now() - t0) / 1000, ...m });
  await new Promise((r) => setTimeout(r, 250));
}
try { await cdp.send('Page.stopScreencast'); } catch { /* already gone */ }
await browser.close();

for (const [i, r] of rows.entries()) {
  fs.writeFileSync(path.join(OUT, `f${String(i).padStart(4, '0')}.jpg`), Buffer.from(r.data, 'base64'));
}
fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify({
  ROUTE, SECONDS, frames: rows.length,
  stamps: rows.map((r) => r.t),
  moon,
}, null, 2));
console.log(`captured ${rows.length} frames over ${SECONDS}s to ${OUT}`);
console.log(`moon samples: ${moon.length}`);
