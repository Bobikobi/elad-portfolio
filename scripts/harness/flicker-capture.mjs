/**
 * SCENE-FLICKER capture. Samples a world page over 10s and records the geometry the
 * analysis needs. Pair with scripts/harness/flicker-analyse.py.
 *
 *   BASE=<alias> BYPASS=<token> ROUTE=/about TIER=high node scripts/harness/flicker-capture.mjs
 *
 * `?hud=1` is on because it installs `__labelProbe`, which is the only way to know where
 * the planet's disc actually is in screen px - needed both to exclude it from the sky
 * measurement and to check candidate 4, whether anything renders over it. The HUD paints
 * a panel while it does that, so its rect is recorded and masked out.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3112';
const BYPASS = process.env.BYPASS || '';
const CHROME = process.env.CHROME || '/snap/bin/chromium';
const ROUTE = process.env.ROUTE || '/about';
const TIER = process.env.TIER || 'high';
const PLANET = process.env.PLANET || 'earth';
const FRAMES = Number(process.env.FRAMES || 22);
const EVERY = Number(process.env.EVERY || 450);
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', `flicker-${TIER}`);
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 240000,
  args: [
    '--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars',
    '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage',
    '--user-agent-suffix=elad-harness',
  ],
});
const page = await browser.newPage();
if (BYPASS) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': BYPASS });
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(`${BASE}${ROUTE}?hud=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise((r) => setTimeout(r, 15000));

if (TIER === 'low') {
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  await new Promise((r) => setTimeout(r, 3000));
}

const meta = await page.evaluate((planet) => {
  const probe = window.__labelProbe;
  const hit = probe ? probe(planet) : null;
  // Every fixed panel the scene is not responsible for: the HUD, the navbar, the widgets.
  const chrome = [...document.querySelectorAll('body *')]
    .filter((e) => getComputedStyle(e).position === 'fixed')
    .map((e) => e.getBoundingClientRect())
    .filter((r) => r.width > 8 && r.height > 8)
    .map((r) => [Math.floor(r.left), Math.floor(r.top), Math.ceil(r.right), Math.ceil(r.bottom)]);
  return { planet: hit, chrome, vw: innerWidth, vh: innerHeight };
}, PLANET);

// Hide every DOM layer before sampling. The scene is what is being measured, and bright
// text on a dark panel is a "bright point" to any detector that is looking for one - the
// first run of this counted 33,000 of them, most of them letters. The probe above already
// has what it needs from the DOM.
await page.evaluate(() => {
  const keepsCanvas = (e) => e.tagName === 'CANVAS' || !!e.querySelector('canvas');
  for (const e of document.querySelectorAll('body > *, body > * > *')) {
    if (!keepsCanvas(e)) e.style.visibility = 'hidden';
  }
  for (const e of document.querySelectorAll('nav, main, footer, header')) {
    e.style.visibility = 'hidden';
  }
});
await new Promise((r) => setTimeout(r, 700));

for (let i = 0; i < FRAMES; i++) {
  await page.screenshot({ path: path.join(OUT, `f${String(i).padStart(2, '0')}.png`) });
  if (i < FRAMES - 1) await new Promise((r) => setTimeout(r, EVERY));
}
fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify({ ...meta, ROUTE, TIER, FRAMES, EVERY }, null, 2));
await browser.close();
console.log(`captured ${FRAMES} frames every ${EVERY}ms to ${OUT}`);
console.log('planet:', JSON.stringify(meta.planet), 'chrome rects:', meta.chrome.length);
