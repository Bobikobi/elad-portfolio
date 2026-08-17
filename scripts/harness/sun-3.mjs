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
import { execFileSync } from 'child_process';
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

const gitText = (args) => {
  try {
    return execFileSync('git', args, { cwd: process.cwd(), encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
};
const revision = gitText(['rev-parse', '--short', 'HEAD']);
const branch = gitText(['branch', '--show-current']) || 'detached';
const sceneStatus = gitText(['status', '--porcelain', '--untracked-files=no', '--', 'src']);
const build = `${branch}@${revision}${sceneStatus && sceneStatus !== 'unknown' ? ' (src dirty)' : ''}`;

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
    if (!canvas) return false;
    // PlanetLabels re-renders every frame and can replace an inline visibility value after
    // this function returns. A stylesheet with !important survives that re-render. The
    // ancestor tags matter too: visibility is inherited, so keeping only the canvas is not
    // sufficient when one of its wrappers was hidden.
    for (let el = canvas; el; el = el.parentElement) el.setAttribute('data-harness-keep', '');
    const style = document.createElement('style');
    style.id = 'sun-3-hide-dom';
    style.textContent =
      'body *:not([data-harness-keep]) { visibility: hidden !important; }' +
      'body [data-harness-keep] { visibility: visible !important; }';
    document.head.appendChild(style);
    return true;
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

const report = { base: BASE, tag: TAG, when: new Date().toISOString(), build };

// ---------------------------------------------------------------- A: solar overview
{
  let page = await browser.newPage();
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

  // The normal overview is intentionally only 1440 CSS px wide: C1/C2/C3/C5 were defined
  // and calibrated on that frame, so widening it would silently change their instrument.
  // It cannot carry P2, though. At this camera height the eight planet centres span about
  // 2400 CSS px and three discs are wholly outside the frame. Horizontal screen offsets do
  // not change when only the aspect ratio widens (the vertical FOV and height stay fixed),
  // so a second, 3072px-wide frame reveals the missing horizontal span without changing
  // apparent diameter. It is a separate capture so none of the five existing criteria
  // inherit the larger field of view or the small framing correction below.
  //
  // IT MUST BE A SEPARATE PAGE, not a resize of this one, and that is measured rather than
  // stylistic. Resizing 1440 -> 3072 leaves Neptune at x=3099 in a 3072-wide frame: outside
  // it, at every pitch, so the search below rejects all of them and reports something that
  // sounds like a HUD failure. Loading the same URL directly at 3072 puts Neptune at
  // x~2908, comfortably inside. The framing depends on the width the page was LOADED at,
  // not on the width it currently has. Written by an agent with no GPU to run it on, so
  // the assumption survived to the first real run.
  // One source of truth for this viewport. It used to be a setViewport call plus a
  // hand-written copy of the same numbers in the report, and when the real capture moved to
  // 3600x900 at DPR 1 the report still claimed 3072x900 at DPR 2 - so the measurement
  // doubled every body's coordinates and declared seven of eight "cut by the capture edge".
  const PANORAMA = { width: 3600, height: 900, dpr: 1 };
  await page.close();
  page = await browser.newPage();
  await page.setViewport({ width: PANORAMA.width, height: PANORAMA.height, deviceScaleFactor: PANORAMA.dpr });
  await page.goto(`${BASE}/?hud=1&tier=high`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await wait(SETTLE);
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await wait(SETTLE);

  // Jupiter and Neptune graze the bottom of the resting view. Use the overview's own
  // debug drag seam to find the first upward pitch that encloses every HUD circle.
  // This is geometry derived from this capture, not a hand-tuned camera pose; the small
  // margin keeps the sphere's antialiased edge out of Chrome's viewport clipping.
  let photometryHud = null;
  let photometryPitch = null;
  let lastOffenders = 'the search never ran';
  // Coarser steps and a longer wait than the first version of this loop. CameraRig damps
  // the overview with a 0.7s time constant, so stepping 0.02 every 1.2s means the camera
  // never catches up and every reading is a pose that is still moving - the loop then
  // rejects the pitch that actually fits. 0.05 every 2.5s settles between samples.
  for (let pitch = 0; pitch <= 0.30001; pitch += 0.05) {
    const set = await page.evaluate((p) => {
      const scene = window.__scene?.getState?.();
      if (!scene?.setOrbit) return false;
      scene.setOrbit(0, p);
      return true;
    }, pitch);
    if (!set) break;
    await wait(2500);
    const candidate = await page.evaluate(() => window.__hud ?? null);
    const offenders = (candidate?.planets ?? []).filter((p) => {
      const r = p.px / 2;
      const margin = Math.max(2, r * 0.02);
      return !(p.x - r >= margin && p.x + r <= candidate.vw - margin &&
        p.y - r >= margin && p.y + r <= candidate.vh - margin);
    });
    if (candidate?.planets?.length === 8 && offenders.length === 0) {
      photometryHud = candidate;
      photometryPitch = pitch;
      break;
    }
    // Keep the real reason. The first version reported "0 published", which reads as a HUD
    // failure when the HUD was publishing all eight and one of them was simply off-frame.
    lastOffenders = `pitch ${pitch.toFixed(2)}: ` + (offenders.length
      ? offenders.map((p) => `${p.key} at (${Math.round(p.x)},${Math.round(p.y)}) d${Math.round(p.px)}`).join(', ')
      : `only ${candidate?.planets?.length ?? 0} bodies published`);
  }
  if (!photometryHud) {
    console.error(`P2 panorama: no pitch enclosed all eight bodies in ${PANORAMA.width}x${PANORAMA.height}. Last: ${lastOffenders}`);
    await browser.close();
    process.exit(2);
  }
  const bodies = photometryHud?.planets ?? [];
  const outside = bodies.filter((p) => {
    const r = p.px / 2;
    return p.x - r < 0 || p.x + r > photometryHud.vw || p.y - r < 0 || p.y + r > photometryHud.vh;
  });
  if (bodies.length !== 8 || outside.length) {
    console.error(`P2 panorama does not contain eight complete bodies (${bodies.length} published; outside: ${outside.map((p) => p.key).join(', ') || 'none'})`);
    await browser.close();
    process.exit(2);
  }
  const photometryCapture = `${TAG}-overview-bodies.png`;
  report.photometry = {
    gpu,
    tier,
    hud: photometryHud,
    capture: photometryCapture,
    viewport: { width: PANORAMA.width, height: PANORAMA.height, dpr: PANORAMA.dpr },
    orbitPitch: photometryPitch,
  };
  fs.writeFileSync(path.join(OUT, photometryCapture), await page.screenshot({ type: 'png' }));
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
