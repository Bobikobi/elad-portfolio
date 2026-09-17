/**
 * P1-1 - capture. The measurement lives in `photometry-diff.py` next to this file.
 *
 *   FIXEDSTEP=1 FREEZE=1 TAG=before node scripts/harness/photometry-diff.mjs
 *   FIXEDSTEP=1 FREEZE=1 TAG=after  node scripts/harness/photometry-diff.mjs
 *   python3 scripts/harness/photometry-diff.py before after
 *
 * ALWAYS run it with both flags. Without them the scene's live clock puts a floor of
 * mean 1.4-9.6 under every measurement and the criterion cannot be met by anything,
 * including a change that does nothing. With them, two SEPARATE page loads come back
 * byte-identical on all six views - measured, mean 0.0000 and max 0 - so any non-zero
 * difference afterwards is the code and nothing else. The flags are opt-in only because
 * the un-flagged path is what proves the floor is real when someone doubts it.
 *
 * P1 moves the numbers that decide every pixel into one module and is required to change
 * none of them. "It still looks right" cannot show that, so this captures the solar overview
 * and all five worlds before and after, and diffs them per pixel.
 *
 * THE PROBLEM THIS HARNESS HAS TO SOLVE FIRST
 *
 * The scene has a seeded RNG but a live clock, so two captures are never the same instant
 * and the diff is never zero. A tolerance guessed against that is exactly the mistake SUN-3
 * made with its disc threshold: a number calibrated against the thing it measures, which
 * expires the moment that thing moves.
 *
 * So every run captures each view TWICE, ~900ms apart, from the SAME build. The
 * within-run pair is pure animation phase - the noise floor - and it is measured, not
 * assumed. The across-run diff is animation phase PLUS whatever the code change did. A
 * before/after result is only meaningful when it sits at the noise floor, and the floor is
 * printed next to it every time.
 *
 * If the floor itself comes out above the P1-1 target, the criterion is unmeetable on a live
 * clock and that has to be known BEFORE any refactor is handed to anyone - not after.
 *
 * Six views, DPR 1: DPR 2 quadruples the pixels for a measurement that is about whether a
 * constant moved, not about fine structure. Real GPU only, same reason as sun-3: SwiftShader
 * has a different tone response, so a pass measured on it is a lie that reads like a pass.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Vercel's preview deployments sit behind SSO, which an automated harness cannot pass. The
 * project's standing rule 2 says numbers only count from a deployed alias, so without this
 * every stage is measured on localhost and stays unsigned. A Protection Bypass for
 * Automation secret opens exactly those deployments to a header.
 *
 * The secret is read from a file rather than an argument or an env var written inline: it
 * must not end up in shell history, a command log, or a committed script.
 */
const BYPASS_FILE = process.env.VERCEL_BYPASS_FILE
  || path.join(os.homedir(), '.claude', 'secrets', 'vercel-bypass.txt');
const VERCEL_BYPASS = (() => {
  try { return fs.readFileSync(BYPASS_FILE, 'utf8').trim() || null; } catch { return null; }
})();
const applyBypass = async (page) => {
  if (!VERCEL_BYPASS || !/vercel\.app/.test(BASE)) return;
  await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': VERCEL_BYPASS });
};

const BASE = process.env.BASE || 'http://localhost:3112';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'photometry-diff');
const SETTLE = Number(process.env.SETTLE || 14000);
const TAG = process.env.TAG;
const FREEZE = process.env.FREEZE === '1';
// FIXEDSTEP=1 arms the scene's fixed-step clock and captures at a FRAME NUMBER rather
// than a wall-clock moment, which is what makes two separate page loads comparable.
// The target is far past the settle so every texture has landed before it: async asset
// arrival is not clock-driven and is the one thing fixed stepping cannot make identical.
const FIXEDSTEP = process.env.FIXEDSTEP === '1';
// Both anchors must sit PAST the settle wait, or they are no-ops: 14s at ~60fps is
// already ~840 frames, so anchoring the scroll at 300 anchored nothing and the overview
// stayed irreproducible (mean 0.69-0.81, max ~180) while the other five views were
// already exact. 1000 and 1600 are the first pair measured byte-identical on all six.
const TARGET_FRAME = Number(process.env.TARGET_FRAME || 1600);
const SCROLL_FRAME = Number(process.env.SCROLL_FRAME || 1000);
if (!TAG) {
  console.error('TAG is required, e.g. TAG=before node scripts/harness/photometry-diff.mjs');
  process.exit(2);
}
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** The six views P1-1 covers: the overview, then one per world. */
const VIEWS = [
  { id: 'overview', path: '/', scrollToBottom: true, expectFocus: null },
  { id: 'about', path: '/about', expectFocus: 'earth' },
  { id: 'services', path: '/services', expectFocus: 'jupiter' },
  { id: 'projects', path: '/projects', expectFocus: 'saturn' },
  { id: 'technologies', path: '/technologies', expectFocus: 'belt' },
  { id: 'contact', path: '/contact', expectFocus: 'mars' },
];

/**
 * Take every DOM overlay out of the frame, leaving the canvas.
 *
 * NOT the same as sun-3's version, and the difference is a defect found here on 2026-08-15.
 * That one walks the DOM writing `el.style.visibility = 'hidden'`. Inline styles lose to
 * React: `PlanetLabels` re-renders its pills every frame as the planets move, and each
 * re-render puts the button's own style back. Measured after hiding, the three planet pills
 * still computed to `visibility: visible` while the nav anchors were correctly hidden - so
 * "every pixel came out of the renderer" was false for any view with pills on it.
 *
 * A stylesheet rule with `!important` cannot be overwritten by an inline style, so the
 * canvas and its ancestor chain are tagged and everything else is hidden by CSS instead.
 */
const hideDom = (page) =>
  page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return false;
    for (let el = canvas; el; el = el.parentElement) el.setAttribute('data-harness-keep', '');
    const style = document.createElement('style');
    style.id = 'harness-hide-dom';
    style.textContent =
      // transition/animation:none is load-bearing, not tidiness. `visibility` is a DISCRETE
      // property: under `transition: all 0.3s` - which the site header carries - it does not
      // flip until the transition's midpoint, so "hidden" arrives ~150ms late and later still
      // when the main thread is busy settling the scene. The assert below waits 400ms, which
      // was enough by luck on every run taken before 2026-09-14 and not enough on a tree
      // whose first paint was slower. Killing the transition removes the race instead of
      // widening the wait, which would only have made the race rarer.
      'body *:not([data-harness-keep]) { visibility: hidden !important;' +
      ' transition: none !important; animation: none !important; }' +
      'body [data-harness-keep] { visibility: visible !important; }';
    document.head.appendChild(style);
    return true;
  });

/** Prove the hiding actually held, instead of assuming it did. */
const assertCanvasOnly = (page) =>
  page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    return [...document.body.querySelectorAll('*')]
      .filter((el) => !el.hasAttribute('data-harness-keep') && el !== canvas)
      .filter((el) => getComputedStyle(el).visibility === 'visible')
      .filter((el) => el.getBoundingClientRect().width > 0)
      .map((el) => `${el.tagName}.${el.className || ''}`.slice(0, 60))
      .slice(0, 5);
  });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 240000,
  userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'photodiff-')),
  args: [
    '--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars',
    '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage',
  ],
});

const report = { base: BASE, tag: TAG, when: new Date().toISOString(), views: {} };
let failed = false;

// try/finally around the whole capture, added 2026-09-15. Without it, a tab crash inside a
// page.evaluate throws out of top-level await, Node prints the error - and then never exits,
// because the Chrome child it launched is still holding the event loop open. That is not
// hypothetical: a sweep hit "Target closed" on the Mars world and sat for 12 hours 39 minutes
// with its browser alive until it was killed by PID. The loop body is left at its original
// indentation to keep this diff reviewable.
try {
for (const view of VIEWS) {
  const page = await browser.newPage();
  await applyBypass(page);
  
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const q = `?hud=1&tier=high${FIXEDSTEP ? '&fixedStep' : ''}`;
  await page.goto(`${BASE}${view.path}${q}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await wait(SETTLE);
  if (view.scrollToBottom) {
    // Anchor the scroll to a FRAME, not to a moment. It is the only per-view action that
    // changes scene state, and doing it on a wall-clock timer lands it on a different
    // frame in every run - which left the overview as the last view that could not
    // reproduce (mean 0.69, max 180) while the other five were already byte-identical.
    if (FIXEDSTEP) await page.evaluate((f) => window.__clock?.waitForFrame(f), SCROLL_FRAME);
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await wait(FIXEDSTEP ? 500 : SETTLE);
  }

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

  const state = await page.evaluate(() => ({
    focusedPlanet: window.__scene?.getState?.().focusedPlanet ?? null,
    tier: window.__scene?.getState?.().quality ?? null,
  }));
  if (view.expectFocus && state.focusedPlanet !== view.expectFocus) {
    // Not fatal: the frame is still comparable to its own twin at the other tag, as long as
    // both runs land in the same place. Recorded so a mismatch cannot pass unnoticed.
    console.error(`WARN ${view.id}: focused "${state.focusedPlanet}", expected "${view.expectFocus}"`);
    failed = true;
  }

  await hideDom(page);
  await wait(400);
  const leaks = await assertCanvasOnly(page);
  if (leaks.length) {
    console.error(`NOT canvas-only on ${view.id}: ${leaks.join(', ')} - refusing to measure`);
    await browser.close();
    process.exit(2);
  }

  // FREEZE=1 pins the scene clock, so the two shots below are the same instant and the
  // noise floor should collapse to zero. Awaited on purpose: the handle resolves from
  // inside a scene frame, so by the time this returns every subscriber has already seen
  // delta 0. Refusing rather than warning - a frozen run that silently did not freeze
  // would report a floor of zero for the wrong reason.
  if (FIXEDSTEP) {
    const at = await page.evaluate(async (target) => {
      const w = window.__clock;
      if (!w) return null;
      const s = await w.waitForFrame(target);
      return { frame: w.frame, elapsed: s.elapsedTime, fixed: s.fixedStep };
    }, TARGET_FRAME);
    if (!at?.fixed) {
      console.error(`fixedStep requested but the scene did not report it on ${view.id}`);
      await browser.close();
      process.exit(2);
    }
    report.views[view.id] = { ...(report.views[view.id] || {}), reachedFrame: at.frame, elapsed: at.elapsed };
  }

  if (FREEZE) {
    const frozen = await page.evaluate(async () => {
      const w = window.__clock;
      if (!w) return null;
      return await w.freeze();
    });
    if (!frozen?.frozen) {
      console.error(`freeze requested but window.__clock did not report frozen on ${view.id}`);
      await browser.close();
      process.exit(2);
    }
    report.frozenAt = frozen.elapsedTime;
    await wait(300);
  }
  // Two shots from the same build: the pair IS the noise floor.
  fs.writeFileSync(path.join(OUT, `${TAG}-${view.id}-0.png`), await page.screenshot({ type: 'png' }));
  await wait(900);
  fs.writeFileSync(path.join(OUT, `${TAG}-${view.id}-1.png`), await page.screenshot({ type: 'png' }));

  report.views[view.id] = { gpu, ...state };
  console.log(`captured ${view.id}  (focus ${state.focusedPlanet}, tier ${state.tier})`);
  await page.close();
}

report.focusMismatch = failed;
fs.writeFileSync(path.join(OUT, `${TAG}-capture.json`), JSON.stringify(report, null, 2));
console.log(`\ncaptured 6 views x 2 shots -> ${OUT}  (tag "${TAG}")`);
} finally {
  await browser.close().catch(() => {});
}
