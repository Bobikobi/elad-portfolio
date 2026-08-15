/**
 * SUN-3 - capture. The measurement itself lives in `sun-3.py` next to this file.
 *
 *   node scripts/harness/sun-3.mjs            # against localhost:3112
 *   BASE=<alias> node scripts/harness/sun-3.mjs
 *
 * Two captures, because the two things this stage changes are measured in different places:
 *
 *  A. the SOLAR OVERVIEW at DPR 2, HUD hidden. This is where the sun's own shading and the
 *     sparkle artefacts live. DPR 2 because a 340px-radius disc cannot carry a granulation
 *     measurement, and the criteria are about a gradient across the disc.
 *
 *  B. the MARS world at DPR 1. `highlightRolloff` in ExposureToneMap was tuned against
 *     Mars's disc clipping, so anything this stage does to that function has to be
 *     re-measured THERE and not argued about.
 *
 *     `?ringprobe=1` is NOT available here - checked, not assumed: it is published by
 *     ProjectsStage, so it exists on /projects (saturn) and nowhere else. So the whole DOM
 *     is hidden instead and the disc is fitted from the frame. That is the stronger check
 *     anyway: with no overlay left, EVERY clipped pixel in the shot came out of the
 *     renderer, and "did anything clip" needs no disc at all.
 *
 * Nothing is written unless a real GPU answered. SwiftShader renders a plausible-looking
 * frame with a different tone response, and a criterion measured on it is a lie that reads
 * like a pass.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3112';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'sun-3');
const SETTLE = Number(process.env.SETTLE || 14000);
const TAG = process.env.TAG || 'now';
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Take every DOM overlay out of the frame, leaving the canvas.
 *
 * Not cosmetic. The nav labels, the planet labels, the chat button and the HUD are white
 * text, and C4 counts blown-out pixels while C5 hunts small bright near-neutral shapes -
 * so with the DOM in shot both criteria spend their time measuring typography. The first
 * run of C5 returned seventy "sprites", most of which were letters. Afterwards, every
 * pixel in the frame came out of the renderer.
 */
const hideDom = (page) =>
  page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    for (const el of document.body.querySelectorAll('*')) {
      if (el === canvas || el.contains(canvas)) continue;
      el.style.visibility = 'hidden';
    }
    if (canvas) canvas.style.visibility = 'visible';
  });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 240000,
  userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'sun3-')),
  args: [
    '--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars',
    '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage',
  ],
});

const report = { base: BASE, tag: TAG, when: new Date().toISOString() };

// ---------------------------------------------------------------- A: solar overview
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/?hud=1&tier=high`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await wait(SETTLE);
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await wait(SETTLE);

  const gpu = await page.evaluate(() => {
    const g = document.createElement('canvas').getContext('webgl2');
    const d = g?.getExtension('WEBGL_debug_renderer_info');
    return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'none';
  });
  if (!/angle|vulkan/i.test(gpu) || /swiftshader/i.test(gpu)) {
    console.error(`NO REAL GPU (${gpu}) - refusing to measure`);
    await browser.close();
    process.exit(2);
  }
  const hud = await page.evaluate(() => window.__hud ?? null);
  const tier = await page.evaluate(() => window.__scene?.getState?.().quality ?? null);
  if (!hud?.solar || !(hud.sunPx > 200)) {
    console.error(`sun not on screen at a usable size (solar=${hud?.solar} sunPx=${hud?.sunPx}) - refusing to measure`);
    await browser.close();
    process.exit(2);
  }
  report.overview = { gpu, tier, hud };

  // Read the HUD first, then take it - and every other overlay - out of the picture.
  await hideDom(page);
  await wait(400);
  for (let i = 0; i < 3; i++) {
    fs.writeFileSync(path.join(OUT, `${TAG}-overview-${i}.png`), await page.screenshot({ type: 'png' }));
    await wait(800);
  }
  await page.close();
}

// ---------------------------------------------------------------- B: the Mars world
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/contact?hud=1&tier=high`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await wait(SETTLE);
  const probe = await page.evaluate(() => ({
    focusedPlanet: window.__scene?.getState?.().focusedPlanet ?? null,
    hud: window.__hud ?? null,
  }));
  report.mars = probe;
  if (probe.focusedPlanet !== 'mars') {
    console.error(`the /contact world focused "${probe.focusedPlanet}", not mars - the rolloff regression check cannot run`);
    report.mars.usable = false;
  } else {
    report.mars.usable = true;
    await hideDom(page);
    await wait(500);
    fs.writeFileSync(path.join(OUT, `${TAG}-mars.png`), await page.screenshot({ type: 'png' }));
  }
  await page.close();
}

fs.writeFileSync(path.join(OUT, `${TAG}-capture.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log(`\ncaptured -> ${OUT}  (tag "${TAG}")`);
await browser.close();
