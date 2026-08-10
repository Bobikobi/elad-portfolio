/**
 * NIGHT-LIGHTS capture. Records CONSECUTIVE rendered frames of the Earth world so the
 * twinkle of the city lights ON THE DISC can be measured.
 *
 *   BASE=http://localhost:3114 node scripts/harness/night-lights-capture.mjs
 *
 * Why this is not flicker-capture.mjs: that one samples a screenshot every 450ms and
 * MASKS THE DISC OUT - it was built to answer a question about background stars, and by
 * construction it cannot see this defect. Two things had to change.
 *
 *  1. Consecutive frames. Earth turns ~2.5 px per rendered frame; over 450ms it turns
 *     ~50px. A point detector comparing two such samples is looking at two different
 *     pieces of coastline, so any number it produces is about the rotation, not about
 *     flicker. CDP Page.startScreencast with everyNthFrame:1 hands back the frames the
 *     compositor actually presented - the same thing the eye is given.
 *  2. The disc is the subject, not the exclusion. __labelProbe gives the body's centre
 *     and radius in screen px, so the night side can be cut from geometry rather than
 *     guessed from a blur.
 *
 * Frame timestamps are recorded because "step between consecutive frames" is only
 * meaningful next to the frame rate that produced it - a slow tier strobes harder for
 * the same scene, and the analysis says so rather than hiding it.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3114';
const BYPASS = process.env.BYPASS || '';
// Google Chrome, not the snap. The snap build aborts before it ever paints here -
// "Failed to create socket directory" out of ProcessSingleton, because the confinement
// does not give it the temp dir it wants from this shell. Same engine, same flags.
const CHROME = process.env.CHROME || '/opt/google/chrome/chrome';
const ROUTE = process.env.ROUTE || '/about';
const PLANET = process.env.PLANET || 'earth';
const FRAMES = Number(process.env.FRAMES || 90);
const SETTLE = Number(process.env.SETTLE || 15000);
const LABEL = process.env.LABEL || 'before';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', `night-${LABEL}`);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 240000,
  // Own profile dir. Puppeteer's default is one shared path, so a harness run started
  // while another session's browser is up dies on a lock instead of measuring.
  userDataDir: process.env.PROFILE || `/tmp/puppeteer-night-${process.pid}`,
  args: [
    '--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars',
    // Only --use-angle=vulkan gives a real GPU here. The other "helpful" flags break
    // WebGL silently, and then everything measures beautifully on a blank page.
    '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage',
    '--user-agent-suffix=elad-harness',
  ],
});
const page = await browser.newPage();
if (BYPASS) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': BYPASS });
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(`${BASE}${ROUTE}?hud=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise((r) => setTimeout(r, SETTLE));

const meta = await page.evaluate((planet) => {
  const probe = window.__labelProbe;
  const hit = probe ? probe(planet, 0) : null;
  const chrome = [...document.querySelectorAll('body *')]
    .filter((e) => getComputedStyle(e).position === 'fixed')
    .map((e) => e.getBoundingClientRect())
    .filter((r) => r.width > 8 && r.height > 8)
    .map((r) => [Math.floor(r.left), Math.floor(r.top), Math.ceil(r.right), Math.ceil(r.bottom)]);
  return { planet: hit, chrome, vw: innerWidth, vh: innerHeight, dpr: devicePixelRatio };
}, PLANET);

if (!meta.planet) {
  await browser.close();
  throw new Error('__labelProbe returned nothing for ' + PLANET + ' - refusing to measure a disc I cannot locate');
}

// Hide every DOM layer. Bright text on a dark panel is a "bright point" to any detector
// looking for one; the probe above already took what it needed from the DOM.
await page.evaluate(() => {
  const keepsCanvas = (e) => e.tagName === 'CANVAS' || !!e.querySelector('canvas');
  for (const e of document.querySelectorAll('body > *, body > * > *')) {
    if (!keepsCanvas(e)) e.style.visibility = 'hidden';
  }
  for (const e of document.querySelectorAll('nav, main, footer, header')) e.style.visibility = 'hidden';
});
await new Promise((r) => setTimeout(r, 700));

const cdp = await page.createCDPSession();

// The page's real rate, before anything is frozen. Recorded because every per-frame number
// downstream is only meaningful next to it.
const realFps = await page.evaluate(() => new Promise((res) => {
  const t = []; let n = 0;
  const tick = (ts) => {
    t.push(ts);
    if (++n < 90) requestAnimationFrame(tick);
    else { const d = t.slice(1).map((v, i) => v - t[i]).sort((a, b) => a - b); res(1000 / d[d.length >> 1]); }
  };
  requestAnimationFrame(tick);
}));

// THE SAMPLING RATIO, and why it is written down instead of ignored.
//
// The screencast delivers about 30 frames a second off a page that renders at 60. Every
// "consecutive pair" it hands back is therefore two rendered frames apart, and the globe
// turns twice as far between them as it does between the frames the eye is given. The
// first run of this reported 4.0 px of rotation per frame; the real figure is 2.0, and a
// criterion written against 4.0 would have been judging a defect twice the size of the
// one being complained about.
//
// Stepping Emulation.setVirtualTimePolicy in 16.7ms slices was tried instead and does not
// work here: with virtual time paused the compositor stops scheduling, Page.captureScreenshot
// deadlocks waiting for a frame that is never coming, and driving it off the screencast
// instead dries up after two steps. HeadlessExperimental.beginFrame, which is the tool
// built for this, is gone from --headless=new in Chrome 151.
//
// So the sampling ratio is MEASURED and recorded, and the analysis divides by it. For a
// before/after comparison the ratio cancels anyway - both runs are sampled the same way -
// but the absolute per-frame figures have to be honest on their own.
const stamps = [];
let captured = 0;
let done;
const finished = new Promise((r) => { done = r; });

cdp.on('Page.screencastFrame', async ({ data, sessionId, metadata }) => {
  try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch { /* stopped */ }
  if (captured >= FRAMES) return;
  const i = captured++;
  fs.writeFileSync(path.join(OUT, `f${String(i).padStart(3, '0')}.png`), Buffer.from(data, 'base64'));
  stamps.push(metadata.timestamp);
  if (captured >= FRAMES) done();
});

await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
await Promise.race([finished, new Promise((r) => setTimeout(r, 90000))]);
try { await cdp.send('Page.stopScreencast'); } catch { /* already gone */ }

const dts = stamps.slice(1).map((t, i) => t - stamps[i]).filter((d) => d > 0).sort((a, b) => a - b);
const medianDt = dts.length ? dts[dts.length >> 1] : 0;
const captureFps = medianDt ? 1 / medianDt : 0;

fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify({
  ...meta, ROUTE, PLANET, LABEL, frames: captured,
  captureFps, realFps,
  // How many rendered frames each captured frame is worth. The analysis divides the
  // measured rotation by this to get the real per-rendered-frame figure.
  sampleRatio: captureFps > 0 ? realFps / captureFps : 1,
}, null, 2));
await browser.close();

console.log(`captured ${captured} consecutive frames to ${OUT}`);
console.log(`disc: ${JSON.stringify(meta.planet)}  chrome rects: ${meta.chrome.length}`);
console.log(`render rate: ${realFps.toFixed(1)} fps real, captured at ${captureFps.toFixed(1)} fps (ratio ${(realFps/captureFps).toFixed(2)})`);
