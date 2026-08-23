/**
 * P7 - sun richness: deterministic capture. Measurement is in p7-sun.py.
 *
 *   CDP_URL=http://127.0.0.1:9223 TAG=now node scripts/harness/p7-sun.mjs
 *   python3 scripts/harness/p7-sun.py now
 *
 * S1-S5 use one 1440x900 DPR-2 solar-overview page with every DOM overlay hidden. The
 * S5 shots are separated by exact fixed-step scene time: the clock is frozen for each
 * screenshot, then resumed for the requested number of 1/60-second steps. S6 uses the
 * same fresh-page, pinned-tier telemetry sample as p3-albedo.mjs.
 *
 * Nothing is written unless ANGLE/Vulkan reports a real GPU, the fixed-step clock answers,
 * the fitted-disc seed is on screen at a usable size, and the canvas-only assertion holds.
 */
import puppeteer from 'puppeteer-core';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3112';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'p7-sun');
const SETTLE = Number(process.env.SETTLE || 14000);
const TAG = process.env.TAG;
const SCROLL_FRAME = Number(process.env.SCROLL_FRAME || 1000);
const CAPTURE_FRAME = Number(process.env.CAPTURE_FRAME || 1600);
const PERF_FRAME = Number(process.env.PERF_FRAME || 1200);
const PERF_SAMPLES = Number(process.env.PERF_SAMPLES || 300);
const FRAME_OFFSETS = (process.env.FRAME_OFFSETS || '0,60,180,360,600,900,1200')
  .split(',')
  .map((value) => Number(value.trim()));

if (!TAG || !/^[A-Za-z0-9._-]+$/.test(TAG)) {
  console.error('TAG is required (letters, digits, dot, underscore, hyphen), e.g. TAG=now node scripts/harness/p7-sun.mjs');
  process.exit(2);
}
if (![SETTLE, SCROLL_FRAME, CAPTURE_FRAME, PERF_FRAME, PERF_SAMPLES].every(Number.isFinite) ||
    !(SCROLL_FRAME < PERF_FRAME && PERF_FRAME + PERF_SAMPLES < CAPTURE_FRAME)) {
  console.error('invalid anchors: require SCROLL_FRAME < PERF_FRAME and PERF_FRAME + PERF_SAMPLES < CAPTURE_FRAME');
  process.exit(2);
}
if (FRAME_OFFSETS.length < 2 || FRAME_OFFSETS[0] !== 0 ||
    FRAME_OFFSETS.some((value) => !Number.isSafeInteger(value) || value < 0) ||
    FRAME_OFFSETS.some((value, index) => index > 0 && value <= FRAME_OFFSETS[index - 1])) {
  console.error('FRAME_OFFSETS must be strictly increasing non-negative integer frames beginning with 0');
  process.exit(2);
}

fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

/** Hide everything except the canvas, using both mechanisms proven by P3. */
const hideDom = async (page) => {
  const ok = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return false;
    for (let el = canvas; el; el = el.parentElement) el.setAttribute('data-harness-keep', '');
    const style = document.createElement('style');
    style.id = 'p7-sun-hide-dom';
    style.textContent =
      'body *:not([data-harness-keep]) { visibility: hidden !important; }' +
      'body [data-harness-keep] { visibility: visible !important; }';
    document.head.appendChild(style);
    return true;
  });
  if (!ok) return false;
  for (let pass = 0; pass < 3; pass++) {
    const forced = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      let count = 0;
      for (const el of document.body.querySelectorAll('*')) {
        if (el === canvas || el.contains(canvas) || canvas.contains(el)) continue;
        const box = el.getBoundingClientRect();
        if (getComputedStyle(el).visibility === 'visible' && box.width > 0 && box.height > 0) {
          el.style.setProperty('visibility', 'hidden', 'important');
          count++;
        }
      }
      return count;
    });
    if (!forced) break;
    await wait(250);
  }
  return true;
};

const assertCanvasOnly = (page) =>
  page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    return [...document.body.querySelectorAll('*')]
      .filter((el) => !el.hasAttribute('data-harness-keep') && el !== canvas)
      .filter((el) => getComputedStyle(el).visibility === 'visible')
      .filter((el) => {
        const box = el.getBoundingClientRect();
        return box.width > 0 && box.height > 0;
      })
      .map((el) => `${el.tagName}.${el.className || ''}`.slice(0, 60))
      .slice(0, 5);
  });

const gpuRenderer = (page) =>
  page.evaluate(() => {
    const context = document.createElement('canvas').getContext('webgl2');
    const debug = context?.getExtension('WEBGL_debug_renderer_info');
    return debug ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'none';
  });

const requireRealGpu = async (page) => {
  const gpu = await gpuRenderer(page);
  if (!/angle|vulkan/i.test(gpu) || /swiftshader/i.test(gpu)) {
    throw new Error(`NO REAL GPU (${gpu}) - refusing to measure`);
  }
  return gpu;
};

/** Keep a page runnable when the shared harness Chrome window itself is invisible. */
const lifecycleSessions = new Map();
const raiseBrowserWindow = async (page) => {
  // The dedicated Chrome shares an Xvfb display with another browser. If its OS window is
  // wholly occluded, Chrome marks every tab hidden and eventually stops rAF. Normalizing
  // and raising this dedicated window through CDP defeats that scheduler optimization.
  // This runs BEFORE the one setViewport and the navigation, because changing outer window
  // bounds afterwards resets CDP's viewport emulation to 800x600.
  const windowSession = await page.createCDPSession();
  try {
    const { windowId } = await windowSession.send('Browser.getWindowForTarget');
    await windowSession.send('Browser.setWindowBounds', {
      windowId,
      bounds: { windowState: 'normal', left: 0, top: 0, width: 1920, height: 1080 },
    });
    await windowSession.send('Page.bringToFront');
  } finally {
    await windowSession.detach();
  }
};

const activatePage = async (page, id) => {
  await page.bringToFront();
  let state = await page.evaluate(() => ({ hidden: document.hidden, focused: document.hasFocus() }));
  if (state.hidden || !state.focused) {
    const session = await page.createCDPSession();
    try {
      await session.send('Page.setWebLifecycleState', { state: 'active' });
      await session.send('Emulation.setFocusEmulationEnabled', { enabled: true });
      // The emulation belongs to the CDP session. Keep it attached for this page's whole
      // measurement lifetime; detaching here immediately restores hidden-tab throttling.
      lifecycleSessions.set(page, session);
    } catch (error) {
      await session.detach().catch(() => {});
      throw error;
    }
    state = await page.evaluate(() => ({ hidden: document.hidden, focused: document.hasFocus() }));
  }
  if (state.hidden || !state.focused) {
    throw new Error(`${id}: harness page remains hidden/unfocused and would be throttled`);
  }
};

// S5 asks how fast the SURFACE evolves, so the rigid spin has to be off for it: at
// 0.03 rad/s a point travels ~3% of the radius per second, more than half a granule, and
// the pattern is carried off the sample point long before it can change. Measured: with
// the spin running, slowing every shader time term by twenty moved the half-life from
// 0.657s to 0.568s - i.e. it was measuring rotation the whole time. `?pinSpin` is
// debug-only and absent from production, like the fixed-step clock it sits beside.
const fixedStepUrl = (tier, opts = {}) =>
  `${BASE}/?hud=1&tier=${tier}&fixedStep${opts.pinSpin ? '&pinSpin' : ''}`;

const waitForFixedFrame = async (page, target, id) => {
  const at = await page.evaluate(async (frame) => {
    const clock = window.__clock;
    if (!clock) return null;
    const state = await clock.waitForFrame(frame);
    return { ...state, actualFrame: clock.frame };
  }, target);
  if (!at?.fixedStep || at.actualFrame < target) {
    throw new Error(`fixedStep did not reach frame ${target} on ${id}`);
  }
  return at;
};

const freeze = async (page, id) => {
  const frozen = await page.evaluate(async () => window.__clock ? await window.__clock.freeze() : null);
  if (!frozen?.fixedStep || !frozen.frozen) {
    throw new Error(`fixedStep clock did not freeze on ${id}`);
  }
  return frozen;
};

/** Resume a frozen clock and advance exactly `steps` scene steps, independent of render speed. */
const resumeForSceneSteps = async (page, steps, id) => {
  const state = await page.evaluate(async (count) => {
    const clock = window.__clock;
    if (!clock || count < 1) return null;
    const before = clock.state();
    const resumed = await clock.unfreeze(); // The resolving scene frame is step one.
    const remaining = count - 1;
    const reached = remaining > 0
      ? await clock.waitForFrame(clock.frame + remaining)
      : resumed;
    return { before, reached, actualFrame: clock.frame };
  }, steps);
  const advanced = state ? state.reached.elapsedTime - state.before.elapsedTime : NaN;
  if (!state?.reached?.fixedStep || state.reached.frozen ||
      Math.abs(advanced - steps / 60) > 1e-7) {
    throw new Error(`${id}: requested ${steps}/60s of scene time, advanced ${advanced}`);
  }
  return state.reached;
};

const mode = (values) => {
  const counts = new Map();
  for (const value of values.filter(Number.isFinite)) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? null;
};

// These objects are the sole viewport source for both setViewport and the report.
const SUN_VIEWPORT = { width: 1440, height: 900, dpr: 2 };
const PERF_VIEWPORT = { width: 1440, height: 900, dpr: 1 };

/**
 * CDP_URL attaches to a browser that is ALREADY RUNNING. This is deliberately the same
 * connect/launch split as p3-albedo.mjs: the external GPU browser is shared and must be
 * disconnected, never closed.
 */
const CDP_URL = process.env.CDP_URL;
const browser = CDP_URL
  ? await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 900000 })
  : await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    protocolTimeout: 900000,
    userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'p7-sun-')),
    args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars',
      '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage',
    ],
  });
// Never close a browser we did not start - it is shared, and the next run needs it.
const closeBrowser = async () => (CDP_URL ? browser.disconnect() : browser.close());
const ownedPages = new Set();

const report = {
  base: BASE,
  tag: TAG,
  when: new Date().toISOString(),
  build,
  anchors: {
    scrollFrame: SCROLL_FRAME,
    captureFrame: CAPTURE_FRAME,
    frameOffsets: FRAME_OFFSETS,
    perfFrame: PERF_FRAME,
    perfSamples: PERF_SAMPLES,
  },
  overview: null,
  tiers: {},
};

try {
  // S1-S5: a single DPR-2 page preserves the scene seed across the entire time series.
  {
    const page = await browser.newPage();
    ownedPages.add(page);
    // An attached Chrome may keep its original blank tab active. Background tabs are
    // throttled to ~1fps, which can make an otherwise valid fixed-step barrier exceed the
    // CDP protocol timeout. Foregrounding changes only production rate, never scene time.
    await raiseBrowserWindow(page);
    const viewport = SUN_VIEWPORT;
    await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: viewport.dpr });
    await page.goto(fixedStepUrl('high', { pinSpin: true }), { waitUntil: 'domcontentloaded', timeout: 90000 });
    await activatePage(page, 'overview');
    await wait(SETTLE);
    const gpu = await requireRealGpu(page);

    await waitForFixedFrame(page, SCROLL_FRAME, 'overview');
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));

    if (!await hideDom(page)) throw new Error('no canvas on overview - refusing to measure');
    const leaks = await assertCanvasOnly(page);
    if (leaks.length) throw new Error(`NOT canvas-only on overview: ${leaks.join(', ')} - refusing to measure`);

    const reached = await waitForFixedFrame(page, CAPTURE_FRAME, 'overview');
    const probe = await page.evaluate(() => ({
      focusedPlanet: window.__scene?.getState?.().focusedPlanet ?? null,
      tier: window.__scene?.getState?.().quality ?? null,
      hud: window.__hud ?? null,
    }));
    if (probe.tier !== 'high' || probe.focusedPlanet !== null) {
      throw new Error(`overview focus/tier is ${probe.focusedPlanet}/${probe.tier}, expected null/high`);
    }
    if (!probe.hud?.solar || !(probe.hud.sunPx > 200)) {
      throw new Error(`sun is not on screen at a usable size (solar=${probe.hud?.solar}, sunPx=${probe.hud?.sunPx})`);
    }
    if (probe.hud.vw !== viewport.width || probe.hud.vh !== viewport.height) {
      throw new Error(`HUD viewport ${probe.hud.vw}x${probe.hud.vh}, expected ${viewport.width}x${viewport.height}`);
    }
    const seedRadius = probe.hud.sunPx * viewport.dpr / 2;
    const seedX = probe.hud.sunX * viewport.dpr;
    const seedY = probe.hud.sunY * viewport.dpr;
    const imageWidth = viewport.width * viewport.dpr;
    const imageHeight = viewport.height * viewport.dpr;
    if (seedX - 2 * seedRadius < 0 || seedX + 2 * seedRadius >= imageWidth ||
        seedY - 2 * seedRadius < 0 || seedY + 2 * seedRadius >= imageHeight) {
      throw new Error('the complete 2R corona annulus is not inside the DPR-2 capture');
    }

    const captures = [];
    let priorOffset = 0;
    for (const offset of FRAME_OFFSETS) {
      if (offset > 0) await resumeForSceneSteps(page, offset - priorOffset, `overview +${offset}`);
      const frozen = await freeze(page, `overview +${offset}`);
      const expectedElapsed = reached.elapsedTime + offset / 60;
      if (Math.abs(frozen.elapsedTime - expectedElapsed) > 1e-7) {
        throw new Error(`overview +${offset}: scene time ${frozen.elapsedTime}, expected ${expectedElapsed}`);
      }
      const finalLeaks = await assertCanvasOnly(page);
      if (finalLeaks.length) {
        throw new Error(`NOT canvas-only at overview +${offset}: ${finalLeaks.join(', ')}`);
      }
      const capture = `${TAG}-sun-f${String(offset).padStart(4, '0')}.png`;
      fs.writeFileSync(path.join(OUT, capture), await page.screenshot({ type: 'png' }));
      captures.push({
        capture,
        offsetFrames: offset,
        sceneSeconds: offset / 60,
        absoluteSceneSeconds: frozen.elapsedTime,
        rawFrame: frozen.frame,
      });
      console.log(`captured sun +${offset} frames (${(offset / 60).toFixed(3)}s scene time)`);
      priorOffset = offset;
    }

    report.overview = { gpu, tier: probe.tier, viewport, hud: probe.hud, captures };
    await lifecycleSessions.get(page)?.detach().catch(() => {});
    lifecycleSessions.delete(page);
    await page.close();
    ownedPages.delete(page);
  }

  // S6: copied from P3's fresh-page, pinned-tier sample.
  for (const requestedTier of ['high', 'low']) {
    const page = await browser.newPage();
    ownedPages.add(page);
    await raiseBrowserWindow(page);
    const viewport = PERF_VIEWPORT;
    await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: viewport.dpr });
    await page.goto(fixedStepUrl(requestedTier), { waitUntil: 'domcontentloaded', timeout: 90000 });
    await activatePage(page, `tier-${requestedTier}`);
    await wait(SETTLE);
    const gpu = await requireRealGpu(page);
    await waitForFixedFrame(page, SCROLL_FRAME, `tier-${requestedTier}`);
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await waitForFixedFrame(page, PERF_FRAME, `tier-${requestedTier}`);

    const sample = await page.evaluate(async (count) => {
      const startFrame = window.__clock?.frame ?? null;
      const timestamps = [];
      const calls = [];
      const triangles = [];
      await new Promise((resolve) => {
        const tick = (time) => {
          timestamps.push(time);
          calls.push(window.__hud?.calls ?? null);
          triangles.push(window.__hud?.tris ?? null);
          if (timestamps.length < count + 1) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
      return {
        intervals: timestamps.slice(1).map((time, index) => time - timestamps[index]),
        calls: calls.slice(1),
        triangles: triangles.slice(1),
        startFrame,
      };
    }, PERF_SAMPLES);

    const state = await page.evaluate(() => ({
      tier: window.__scene?.getState?.().quality ?? null,
      endFrame: window.__clock?.frame ?? null,
    }));
    if (state.tier !== requestedTier || sample.intervals.length !== PERF_SAMPLES) {
      throw new Error(`tier ${requestedTier} was not pinned or returned an incomplete frame sample`);
    }
    const sorted = [...sample.intervals].sort((a, b) => a - b);
    const calls = sample.calls.filter(Number.isFinite);
    const triangles = sample.triangles.filter(Number.isFinite);
    if (!calls.length || !triangles.length) {
      throw new Error(`tier ${requestedTier}: renderer telemetry is unavailable`);
    }
    report.tiers[requestedTier] = {
      gpu,
      tier: state.tier,
      viewport,
      frames: sorted.length,
      startFrame: sample.startFrame,
      endFrame: state.endFrame,
      calls: mode(calls),
      callsRange: [Math.min(...calls), Math.max(...calls)],
      triangles: mode(triangles),
      trianglesRange: [Math.min(...triangles), Math.max(...triangles)],
      medianFrameMs: +sorted[Math.floor(sorted.length / 2)].toFixed(3),
      p95FrameMs: +sorted[Math.floor(sorted.length * 0.95)].toFixed(3),
      // S6 IS NOT VALID OVER CDP, and this is measured rather than cautious. The same
      // unchanged scene reports a 16.700ms median through a browser this harness launched
      // and 33.300ms through the shared one on the virtual display - a clean 60fps against
      // a clean 30fps. The attached browser is not vsynced the same way, so the number is
      // about the display it lives on, not about the scene. Every PIXEL measurement matched
      // to three decimal places across the two, so only timing is affected.
      timingValid: !CDP_URL,
      timingNote: CDP_URL
        ? 'MEASURED OVER CDP - frame time is the attached browser\'s cadence, not the scene\'s. Re-run without CDP_URL for S6.'
        : null,
    };
    console.log(
      `sampled ${requestedTier}: calls ${report.tiers[requestedTier].calls}, ` +
      `triangles ${report.tiers[requestedTier].triangles}, ` +
      `median ${report.tiers[requestedTier].medianFrameMs.toFixed(3)}ms`,
    );
    await lifecycleSessions.get(page)?.detach().catch(() => {});
    lifecycleSessions.delete(page);
    await page.close();
    ownedPages.delete(page);
  }

  fs.writeFileSync(path.join(OUT, `${TAG}-capture.json`), JSON.stringify(report, null, 2));
  console.log(`\ncaptured P7 tag "${TAG}" -> ${OUT}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 2;
} finally {
  for (const page of ownedPages) {
    await lifecycleSessions.get(page)?.detach().catch(() => {});
    await page.close().catch(() => {});
  }
  await closeBrowser();
}
