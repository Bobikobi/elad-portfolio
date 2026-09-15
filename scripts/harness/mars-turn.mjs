/**
 * P4-1 capture: Mars over one full turn, in ONE page load. Measured by mars-turn.py.
 *
 *   TAG=turn-on                       node scripts/harness/mars-turn.mjs
 *   TAG=turn-off EXTRA_QS=noRolloff   node scripts/harness/mars-turn.mjs
 *
 * Mars keeps spinning inside its own focused world (SolarAct: `rotation.y += dt * 0.3`, not
 * gated on focusedPlanet, while the revolution is). A single capture therefore measures
 * whichever longitude happens to face the camera - the same harness read 0.09% and 0.29% minutes
 * apart. This captures the turn instead.
 *
 * Fixed-step clock, frozen, then advanced an exact number of scene steps between shots, using
 * p7-sun's stepping sequence (the only one in this repo that is checked to advance exactly N/60 s).
 * Resuming leaves the clock RUNNING, so every shot is preceded by an explicit freeze, and each
 * sample's angle is computed from the FROZEN scene time rather than from the step count asked for.
 *
 * 0.3 rad/s at 60 steps/s is one turn in 1256.6 steps. 24 samples 52 steps apart, then a closing
 * shot at step 1257, one turn after the first. It cannot show that only the spin moved - the framing
 * breathes and the lit target wobbles on clocks of their own - so the analyzer compares clip figures.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';

const BYPASS_FILE = process.env.VERCEL_BYPASS_FILE || path.join(os.homedir(), '.claude', 'secrets', 'vercel-bypass.txt');
const VERCEL_BYPASS = (() => { try { return fs.readFileSync(BYPASS_FILE, 'utf8').trim() || null; } catch { return null; } })();
const BASE = process.env.BASE || 'http://localhost:3112';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'mars-turn');
const TAG = process.env.TAG;
const EXTRA_QS = process.env.EXTRA_QS || '';
const SETTLE = Number(process.env.SETTLE || 14000);
const START_FRAME = Number(process.env.START_FRAME || 1600);
const SAMPLES = Number(process.env.SAMPLES || 24);
const STEPS_PER_SAMPLE = Number(process.env.STEPS_PER_SAMPLE || 52);
const SPIN_RAD_PER_S = 0.3;                                  // SolarAct.tsx, the planet's own spin
const STEPS_PER_TURN = (2 * Math.PI / SPIN_RAD_PER_S) * 60;  // 1256.637
const CLOSING_STEPS = Math.ceil(STEPS_PER_TURN);             // 1257
if (!TAG) { console.error('TAG is required'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Same DOM hiding as photometry-diff, including the transition kill that removed its race.
const hideDom = (page) => page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return false;
  for (let el = canvas; el; el = el.parentElement) el.setAttribute('data-harness-keep', '');
  const style = document.createElement('style');
  style.textContent =
    'body *:not([data-harness-keep]) { visibility: hidden !important; transition: none !important; animation: none !important; }' +
    'body [data-harness-keep] { visibility: visible !important; }';
  document.head.appendChild(style);
  return true;
});
const assertCanvasOnly = (page) => page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  return [...document.body.querySelectorAll('*')]
    .filter((el) => !el.hasAttribute('data-harness-keep') && el !== canvas)
    .filter((el) => getComputedStyle(el).visibility === 'visible')
    .filter((el) => el.getBoundingClientRect().width > 0)
    .map((el) => `${el.tagName}.${el.className || ''}`.slice(0, 60)).slice(0, 5);
});

// Copied from p7-sun.mjs, unchanged in behaviour.
const waitForFixedFrame = async (page, target, id) => {
  const at = await page.evaluate(async (frame) => {
    const clock = window.__clock;
    if (!clock) return null;
    const state = await clock.waitForFrame(frame);
    return { ...state, actualFrame: clock.frame };
  }, target);
  if (!at?.fixedStep || at.actualFrame < target) throw new Error(`fixedStep did not reach frame ${target} on ${id}`);
  return at;
};
const freeze = async (page, id) => {
  const frozen = await page.evaluate(async () => window.__clock ? await window.__clock.freeze() : null);
  if (!frozen?.fixedStep || !frozen.frozen) throw new Error(`fixedStep clock did not freeze on ${id}`);
  return frozen;
};
const resumeForSceneSteps = async (page, steps, id) => {
  const state = await page.evaluate(async (count) => {
    const clock = window.__clock;
    if (!clock || count < 1) return null;
    const before = clock.state();
    const resumed = await clock.unfreeze(); // The resolving scene frame is step one.
    const remaining = count - 1;
    const reached = remaining > 0 ? await clock.waitForFrame(clock.frame + remaining) : resumed;
    return { before, reached, actualFrame: clock.frame };
  }, steps);
  const advanced = state ? state.reached.elapsedTime - state.before.elapsedTime : NaN;
  if (!state?.reached?.fixedStep || state.reached.frozen || Math.abs(advanced - steps / 60) > 1e-7) {
    throw new Error(`${id}: requested ${steps}/60s of scene time, advanced ${advanced}`);
  }
  return state.reached;
};

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new', protocolTimeout: 240000,
  userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'marsturn-')),
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars', '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage'],
});
try {
  const page = await browser.newPage();
  if (VERCEL_BYPASS && /vercel\.app/.test(BASE)) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': VERCEL_BYPASS });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/contact?hud=1&tier=high&fixedStep${EXTRA_QS ? `&${EXTRA_QS}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await wait(SETTLE);

  const gpu = await page.evaluate(() => {
    const g = document.createElement('canvas').getContext('webgl2');
    const d = g?.getExtension('WEBGL_debug_renderer_info');
    return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'none';
  });
  if (!/angle|vulkan/i.test(gpu) || /swiftshader/i.test(gpu)) throw new Error(`NO REAL GPU (${gpu}) - refusing to measure`);

  await waitForFixedFrame(page, START_FRAME, 'start');
  // Freeze AT the anchor, then hide the DOM. The first version hid first and froze after its
  // 400ms wall-clock wait, so the scene kept running: sample 0 landed at 26.88s against
  // p3-albedo's 26.67s for the same START_FRAME - 13 steps, ~4 degrees of spin - and, because
  // that wait is wall-clock, it would land a different number of steps late on every run.
  // Two turns captured that way cannot be paired by longitude. Freezing the scene clock does
  // not stop CSS, so the overlay still hides while the frame holds.
  let frozen = await freeze(page, 'start');
  await hideDom(page);
  await wait(400);
  const leaks = await assertCanvasOnly(page);
  if (leaks.length) throw new Error(`NOT canvas-only: ${leaks.join(', ')} - refusing to measure`);
  const focus = await page.evaluate(() => window.__scene?.getState?.().focusedPlanet ?? null);
  if (focus !== 'mars') throw new Error(`/contact focused "${focus}", not mars - refusing to measure`);

  const t0 = frozen.elapsedTime;
  const shoot = async (index, label) => {
    const state = await page.evaluate(() => window.__clock.state());
    const hud = await page.evaluate(() => {
      const m = (window.__hud?.planets || []).find((p) => p.key === 'mars');
      return m ? { x: m.x, y: m.y, px: m.px } : null;
    });
    if (!hud) throw new Error(`${label}: HUD did not publish Mars`);
    const file = `${TAG}-${label}.png`;
    fs.writeFileSync(path.join(OUT, file), await page.screenshot({ type: 'png' }));
    const dt = state.elapsedTime - t0;
    return { index, steps: Math.round(dt * 60), angleRad: SPIN_RAD_PER_S * dt, elapsedTime: state.elapsedTime, file, hud };
  };

  const samples = [];
  let taken = 0;
  // Written after EVERY shot, not once at the end. The tab crashed twice on this very view in the
  // photometry-diff sweep (Target closed, frames 1600 and 2200), and a full turn is one long Mars
  // session; a crash at shot 18 should leave 18 usable shots, not an orphaned folder of PNGs.
  const writeManifest = (closingSample) => fs.writeFileSync(path.join(OUT, `${TAG}-capture.json`), JSON.stringify({
    tag: TAG, base: BASE, extraQs: EXTRA_QS, when: new Date().toISOString(), gpu,
    stepsPerSample: STEPS_PER_SAMPLE, stepsPerTurn: STEPS_PER_TURN, startFrame: START_FRAME,
    complete: !!closingSample, samples, closing: closingSample,
  }, null, 2));
  for (let i = 0; i < SAMPLES; i++) {
    const want = i * STEPS_PER_SAMPLE;
    if (want > taken) {
      await resumeForSceneSteps(page, want - taken, `sample ${i}`);
      await freeze(page, `sample ${i}`);
      taken = want;
    }
    samples.push(await shoot(i, `s${String(i).padStart(2, '0')}`));
    console.log(`sample ${i}: ${samples[i].steps} steps, ${(samples[i].angleRad * 180 / Math.PI % 360).toFixed(1)} deg`);
    writeManifest(null);
  }
  await resumeForSceneSteps(page, CLOSING_STEPS - taken, 'closing');
  await freeze(page, 'closing');
  const closing = await shoot(SAMPLES, 'closing');
  console.log(`closing: ${closing.steps} steps, ${(closing.angleRad * 180 / Math.PI % 360).toFixed(2)} deg past sample 0`);

  writeManifest(closing);
  console.log(`-> ${OUT}/${TAG}-capture.json`);
} finally {
  await browser.close();
}
