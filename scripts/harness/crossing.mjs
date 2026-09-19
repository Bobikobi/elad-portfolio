/**
 * CROSSING recorder. Screencasts the galaxy→solar passage while the scroll is driven on a
 * ramp indexed by RENDERED FRAME, not by wall clock. Pair with crossing.py.
 *
 *   BASE=<alias> TAG=master-1 node scripts/harness/crossing.mjs
 *   BASE=<alias> TAG=cand-1 RAMP_FRAMES=180 node scripts/harness/crossing.mjs
 *
 * Why a frame-indexed ramp. edge-flash.mjs drove the same passage with 100 wheel steps on a
 * 50ms timer, so how far the page had scrolled by any given frame depended on how busy the
 * machine was. The dive gate is damped per dt and the act swap fires on a coverage window,
 * so that made the passage's DURATIONS a property of the load rather than of the build. With
 * `?fixedStep` every rendered frame advances the scene by the same delta, and this ramp moves
 * the scroll by rendered frame, so two runs of one build see the same scene at the same step.
 * That is what makes the run-to-run agreement check in the brief mean anything.
 *
 * The DOM is hidden (canvas only), exactly as photometry-diff.mjs and p4-galaxy.mjs do it, so
 * the numbers describe the scene rather than the navbar, the chat widget and the debug HUD.
 *
 * Writes frames/, stamps.json, samples.json (the store's act/coverage/scrollProgress per
 * rendered frame) and meta.json. Refuses to report on a software GPU.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3000';
const TAG = process.env.TAG || 'run';
const RAMP_FRAMES = Number(process.env.RAMP_FRAMES || 180);
const PRE_MS = Number(process.env.PRE_MS || 1200);
const POST_MS = Number(process.env.POST_MS || 4000);
const SETTLE = Number(process.env.SETTLE || 14000);
const EXTRA_QS = process.env.EXTRA_QS || '';
const W = 1280;
const H = 720;
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'crossing', TAG);
const BYPASS_FILE = process.env.VERCEL_BYPASS_FILE
  || path.join(os.homedir(), '.claude', 'secrets', 'vercel-bypass.txt');
const VERCEL_BYPASS = (() => {
  try { return fs.readFileSync(BYPASS_FILE, 'utf8').trim() || null; } catch { return null; }
})();

const framesDir = path.join(OUT, 'frames');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 240000,
  userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'crossing-')),
  args: [
    '--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars',
    '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage',
  ],
});
let exitCode = 0;
try {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  if (VERCEL_BYPASS && /vercel\.app/.test(BASE)) {
    await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': VERCEL_BYPASS });
  }
  await page.goto(`${BASE}/?hud=1&tier=high&fixedStep${EXTRA_QS ? `&${EXTRA_QS}` : ''}`,
    { waitUntil: 'domcontentloaded', timeout: 90000 });
  await new Promise((r) => setTimeout(r, SETTLE));

  // A blank page is perfectly free of washes and jumps too, so nothing below means anything
  // until the GPU is real, the scene canvas is on the page, and the clock really is fixed.
  const probe = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    const canvas = [...document.querySelectorAll('canvas')]
      .map((c) => c.getBoundingClientRect())
      .find((r) => r.width >= 600 && r.height >= 300);
    return {
      gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'none',
      sceneCanvas: !!canvas,
      clock: window.__clock ? window.__clock.state() : null,
      act: window.__scene?.getState?.().act ?? null,
    };
  });
  if (/swiftshader|llvmpipe|^none$/i.test(probe.gpu) || !probe.sceneCanvas) {
    throw new Error(`not a real measurement: gpu=${probe.gpu} sceneCanvas=${probe.sceneCanvas}`);
  }
  if (!probe.clock?.fixedStep) throw new Error('the fixed-step clock is not installed - the ramp would not be reproducible');
  // The passage only exists from the galaxy side. A returning visitor is parked in the solar
  // overview and would be recorded scrolling through nothing.
  if (probe.act !== 'galaxy') throw new Error(`act is "${probe.act}", not galaxy - there is no passage to record`);

  await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    for (let el = canvas; el; el = el.parentElement) el.setAttribute('data-harness-keep', '');
    const style = document.createElement('style');
    style.textContent = 'body *:not([data-harness-keep]) { visibility: hidden !important;'
      + ' transition: none !important; animation: none !important; }'
      + 'body [data-harness-keep] { visibility: visible !important; }';
    document.head.appendChild(style);
  });
  await new Promise((r) => setTimeout(r, 400));

  const cdp = await page.createCDPSession();
  const stamps = [];
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    fs.writeFileSync(path.join(framesDir, `f${String(stamps.length).padStart(5, '0')}.jpg`), Buffer.from(data, 'base64'));
    stamps.push(metadata.timestamp);
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  const t0 = Date.now();
  await new Promise((r) => setTimeout(r, PRE_MS));

  // The ramp, and a per-rendered-frame sample of the three store values that decide what the
  // passage looks like. Both live in the page and are keyed on the SAME frame counter.
  const rampStartedAt = (Date.now() - t0) / 1000;
  await page.evaluate((span) => {
    const clock = window.__clock;
    const store = window.__scene;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const f0 = clock.frame;
    window.__crossing = { f0, span, max, samples: [], done: false };
    let last = -1;
    const tick = () => {
      const f = clock.frame;
      if (f !== last) {
        last = f;
        const t = Math.min(1, (f - f0) / span);
        window.scrollTo({ top: t * max, behavior: 'instant' });
        const s = store.getState();
        window.__crossing.samples.push([f, +t.toFixed(4), s.act, +s.coverage.toFixed(4), +s.scrollProgress.toFixed(4)]);
        if (t >= 1) { window.__crossing.done = true; return; }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, RAMP_FRAMES);

  const rampDeadline = Date.now() + 60000;
  while (!(await page.evaluate(() => window.__crossing.done))) {
    if (Date.now() > rampDeadline) throw new Error('the ramp did not finish in 60s');
    await new Promise((r) => setTimeout(r, 100));
  }
  const rampEndedAt = (Date.now() - t0) / 1000;
  await new Promise((r) => setTimeout(r, POST_MS));
  await cdp.send('Page.stopScreencast');
  await new Promise((r) => setTimeout(r, 300));

  const crossing = await page.evaluate(() => {
    const c = window.__crossing;
    return { f0: c.f0, span: c.span, maxScroll: c.max, samples: c.samples };
  });
  const endAct = await page.evaluate(() => window.__scene?.getState?.().act ?? null);
  fs.writeFileSync(path.join(OUT, 'samples.json'), JSON.stringify(crossing.samples));

  // Where the act actually flipped, in ramp fraction - the one event the curtain exists to hide.
  const swapAt = (() => {
    for (let i = 1; i < crossing.samples.length; i++) {
      if (crossing.samples[i][2] !== crossing.samples[i - 1][2]) return crossing.samples[i][1];
    }
    return null;
  })();

  const gaps = stamps.slice(1).map((t, i) => t - stamps[i]).sort((a, b) => a - b);
  const meta = {
    base: BASE, tag: TAG, extraQs: EXTRA_QS, rampFrames: RAMP_FRAMES,
    preMs: PRE_MS, postMs: POST_MS, settleMs: SETTLE,
    gpu: probe.gpu, fixedStep: true, startAct: probe.act, endAct,
    rampStartedAt: +rampStartedAt.toFixed(3), rampEndedAt: +rampEndedAt.toFixed(3),
    rampFirstFrame: crossing.f0, rampRenderedFrames: crossing.samples.length,
    swapAtRampFraction: swapAt, maxScrollPx: crossing.maxScroll,
    frames: stamps.length,
    span: +(stamps.at(-1) - stamps[0]).toFixed(3),
    fps: +((stamps.length - 1) / (stamps.at(-1) - stamps[0])).toFixed(1),
    medianGapMs: +(gaps[gaps.length >> 1] * 1000).toFixed(1),
    maxGapMs: +(gaps.at(-1) * 1000).toFixed(1),
    capturedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(OUT, 'stamps.json'), JSON.stringify(stamps));
  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 2));
  if (endAct !== 'solar') throw new Error(`the ramp ended in act "${endAct}" - the passage did not complete`);
  console.log(JSON.stringify(meta));
} catch (err) {
  console.error(err);
  exitCode = 2;
} finally {
  await browser.close();
}
process.exit(exitCode);
