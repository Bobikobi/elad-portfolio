/**
 * Attribute scene STARTUP cost on the project's phone-class profile.
 *
 *   node scripts/harness/mobile-startup.mjs
 *   BASE=https://preview.example TAG=preview BYPASS=... node scripts/harness/mobile-startup.mjs
 *   python3 scripts/harness/mobile-startup.py [TAG]
 *
 * This harness always launches a private Chrome. CDP_URL is intentionally rejected: CPU
 * throttling and frame timing are not equivalent in the shared attached browser.
 *
 * The viewport and network numbers below come from Lighthouse's emulated Moto G Power
 * mobile profile (the device used by the PageSpeed run in MOBILE-STARTUP-open.md). CDP
 * wants throughput in bytes/second, hence 1.6 Mbit/s / 8 and 750 Kbit/s / 8.
 */
import puppeteer from 'puppeteer-core';
import { execFileSync } from 'child_process';
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
const BYPASS = process.env.BYPASS || '';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'mobile-startup');
const TAG = process.env.TAG || 'now';
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 240_000);

// This exact object drives CDP and is persisted in the run manifest. The Python report
// reads it from there; it has no second copy of these settings.
const EMULATION = Object.freeze({
  device: 'Moto G Power (Lighthouse mobile emulation)',
  viewport: Object.freeze({
    width: 412,
    height: 915,
    deviceScaleFactor: 2.6,
    mobile: true,
    touch: true,
  }),
  // Overridable, because 4x on this machine does not reproduce the problem. Measured
  // 2026-09-10: PageSpeed reports 29,260ms of blocking on the deployed site, while the
  // SAME deployed site measured here at 4x gives 1,248ms - 23 times better. PageSpeed runs
  // on its own slow hardware and throttles 4x on top of that, so matching it means finding
  // the rate where this machine reproduces the number, not assuming 4x is comparable.
  cpuThrottlingRate: Number(process.env.CPU_THROTTLE || 4),
  network: Object.freeze({
    name: 'Slow 4G',
    offline: false,
    latency: 150,
    downloadThroughput: 1_600_000 / 8,
    uploadThroughput: 750_000 / 8,
    connectionType: 'cellular4g',
  }),
  quietWindowMs: 2_000,
  longTaskThresholdMs: 50,
  profilerSamplingIntervalUs: 100,
});

const TRACE_CATEGORIES = [
  '-*',
  'toplevel',
  'blink.user_timing',
  'devtools.timeline',
  'disabled-by-default-devtools.timeline',
  'disabled-by-default-devtools.timeline.frame',
  'disabled-by-default-devtools.timeline.stack',
  'gpu',
  'disabled-by-default-gpu.device',
  'disabled-by-default-gpu.service',
  'loading',
  'v8.execute',
];

if (process.env.CDP_URL) {
  console.error('CDP_URL is not supported: mobile-startup must launch its own Chrome.');
  process.exit(2);
}
if (!Number.isFinite(TIMEOUT_MS) || TIMEOUT_MS <= 0) {
  console.error(`TIMEOUT_MS must be positive, got ${process.env.TIMEOUT_MS}`);
  process.exit(2);
}

fs.mkdirSync(OUT, { recursive: true });
const profilePath = path.join(OUT, `${TAG}-profile.cpuprofile`);
const tracePath = path.join(OUT, `${TAG}-trace.json`);
const runPath = path.join(OUT, `${TAG}-run.json`);

const gitText = (args) => {
  try {
    return execFileSync('git', args, { cwd: process.cwd(), encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
};

/**
 * Installed before navigation. It adds narrow, auditable spans around WebGL work which
 * Chrome otherwise often reports only as an anonymous GPU task. Pure JavaScript remains
 * attributable through the CPU profile. Draw-call instrumentation is removed after the
 * first frame; compile, buffer and texture wrappers remain until the page is closed so
 * late startup uploads count.
 *
 * "Quiet" means no PerformanceObserver long task (>= 50 ms by that API's definition) for
 * the configured two seconds. A live WebGL scene keeps scheduling short rAF work forever,
 * so requiring an empty task queue would never terminate.
 */
const installStartupProbe = (longTaskThresholdMs) => {
  const state = {
    installedAt: performance.now(),
    firstDrawAt: null,
    firstFrameStartAt: null,
    firstFrameEndAt: null,
    lastLongTaskEnd: 0,
    longTaskThresholdMs,
    longTasks: [],
    spans: {},
    errors: [],
  };
  Object.defineProperty(window, '__mobileStartupProbe', { value: state });

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration < longTaskThresholdMs) continue;
        const end = entry.startTime + entry.duration;
        state.lastLongTaskEnd = Math.max(state.lastLongTaskEnd, end);
        state.longTasks.push({ start: entry.startTime, duration: entry.duration });
      }
    });
    observer.observe({ type: 'longtask', buffered: true });
  } catch (error) {
    state.errors.push(`long-task observer: ${String(error)}`);
  }

  let serial = 0;
  let activeFrameStart = null;
  let firstDrawSeen = false;
  let outsideFrameFinishScheduled = false;
  const drawRestore = [];
  const span = (phase, operation, fn, receiver, args) => {
    const id = serial++;
    const prefix = `mobile-startup:${phase}:${operation}:${id}`;
    const start = `${prefix}:start`;
    const end = `${prefix}:end`;
    performance.mark(start);
    const at = performance.now();
    try {
      return Reflect.apply(fn, receiver, args);
    } finally {
      const duration = performance.now() - at;
      const total = state.spans[phase] || { calls: 0, duration: 0 };
      total.calls += 1;
      total.duration += duration;
      state.spans[phase] = total;
      performance.mark(end);
      performance.measure(`mobile-startup:${phase}:${operation}`, start, end);
      performance.clearMarks(start);
      performance.clearMarks(end);
    }
  };

  const wrap = (prototype, operation, phase, isDraw = false) => {
    const original = prototype?.[operation];
    if (typeof original !== 'function' || original.__mobileStartupWrapped) return;
    const wrapped = function (...args) {
      const isFirstDraw = isDraw && !firstDrawSeen;
      if (isDraw && !firstDrawSeen) {
        firstDrawSeen = true;
        state.firstDrawAt = performance.now();
        state.firstFrameStartAt = activeFrameStart ?? state.firstDrawAt;
      }
      const result = span(phase, operation, original, this, args);
      // R3F normally draws inside rAF. Keep a fallback for a renderer which presents its
      // first frame synchronously during setup; otherwise firstFrameEndAt would never land.
      if (isFirstDraw && activeFrameStart === null && !outsideFrameFinishScheduled) {
        outsideFrameFinishScheduled = true;
        originalRaf(() => finishFirstFrame());
      }
      return result;
    };
    Object.defineProperty(wrapped, '__mobileStartupWrapped', { value: true });
    try {
      prototype[operation] = wrapped;
      if (isDraw) drawRestore.push(() => { prototype[operation] = original; });
    } catch (error) {
      state.errors.push(`${operation} wrapper: ${String(error)}`);
    }
  };

  const originalRaf = window.requestAnimationFrame.bind(window);
  const finishFirstFrame = () => {
    if (state.firstFrameEndAt !== null) return;
    state.firstFrameEndAt = performance.now();
    const start = state.firstFrameStartAt ?? state.firstDrawAt;
    performance.measure('mobile-startup:first-frame-render', {
      start,
      end: state.firstFrameEndAt,
    });
    for (const undo of drawRestore.splice(0)) undo();
    window.requestAnimationFrame = originalRaf;
  };
  window.requestAnimationFrame = (callback) => originalRaf((timestamp) => {
    const hadDraw = firstDrawSeen;
    const previousStart = activeFrameStart;
    activeFrameStart = performance.now();
    try {
      return callback(timestamp);
    } finally {
      if (!hadDraw && firstDrawSeen && state.firstFrameEndAt === null) {
        finishFirstFrame();
      }
      activeFrameStart = previousStart;
    }
  });

  const prototypes = [window.WebGLRenderingContext?.prototype, window.WebGL2RenderingContext?.prototype];
  for (const prototype of prototypes) {
    for (const operation of ['compileShader', 'linkProgram']) {
      wrap(prototype, operation, 'shader-compile-link');
    }
    for (const operation of ['bufferData', 'bufferSubData']) {
      wrap(prototype, operation, 'geometry-buffer');
    }
    for (const operation of [
      'texImage2D', 'texSubImage2D', 'texImage3D', 'texSubImage3D',
      'compressedTexImage2D', 'compressedTexSubImage2D',
      'compressedTexImage3D', 'compressedTexSubImage3D',
    ]) {
      wrap(prototype, operation, 'texture-decode-upload');
    }
    for (const operation of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
      wrap(prototype, operation, 'first-frame-render', true);
    }
  }
};

let browser;
let page;
let cdp;
let profilerStarted = false;
let tracingStarted = false;
let profileSaved = false;
const manifest = {
  schemaVersion: 1,
  status: 'starting',
  base: BASE,
  tag: TAG,
  when: new Date().toISOString(),
  build: {
    branch: gitText(['branch', '--show-current']) || 'detached',
    revision: gitText(['rev-parse', '--short', 'HEAD']),
    srcStatus: gitText(['status', '--porcelain', '--untracked-files=no', '--', 'src']),
  },
  emulation: EMULATION,
  artifacts: {
    profile: path.basename(profilePath),
    trace: path.basename(tracePath),
  },
};

try {
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: process.env.HEADED ? false : 'new',
    protocolTimeout: TIMEOUT_MS,
    userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'mobile-startup-')),
    args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars',
      '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-zero-copy',
      '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage',
      '--user-agent-suffix=elad-mobile-startup-harness',
    ],
  });

  // Guard before any trace/profile starts. A fresh target in this browser uses the same GPU
  // process and ANGLE backend as the measurement target.
  const guardPage = await browser.newPage();
  // guardPage, not page - `page` is assigned below and is undefined here. Added in 64f4efd
  // and never exercised, because no run had pointed at a vercel.app URL until 2026-09-14.
  await applyBypass(guardPage);
  const gpu = await guardPage.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return 'NO WEBGL2 CONTEXT';
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    return debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'unknown renderer';
  });
  await guardPage.close();
  manifest.gpu = gpu;
  if (!/angle|vulkan/i.test(gpu) || /swiftshader|llvmpipe|software/i.test(gpu)) {
    throw new Error(`NO REAL GPU (${gpu}) - refusing to measure`);
  }

  page = await browser.newPage();
  await applyBypass(page);
  
  await page.setViewport({
    width: EMULATION.viewport.width,
    height: EMULATION.viewport.height,
    deviceScaleFactor: EMULATION.viewport.deviceScaleFactor,
    isMobile: EMULATION.viewport.mobile,
    hasTouch: EMULATION.viewport.touch,
  });
  if (BYPASS) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': BYPASS });
  await page.evaluateOnNewDocument(installStartupProbe, EMULATION.longTaskThresholdMs);

  cdp = await page.createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: EMULATION.cpuThrottlingRate });
  const networkConditions = Object.fromEntries(
    Object.entries(EMULATION.network).filter(([key]) => key !== 'name'),
  );
  await cdp.send('Network.emulateNetworkConditions', networkConditions);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: EMULATION.profilerSamplingIntervalUs });

  await page.tracing.start({ path: tracePath, categories: [...TRACE_CATEGORIES] });
  tracingStarted = true;
  await cdp.send('Profiler.start');
  profilerStarted = true;
  manifest.profileStartedAt = new Date().toISOString();

  const response = await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
  manifest.navigation = { url: page.url(), status: response?.status() ?? null };
  await page.waitForFunction(
    (quietMs) => {
      const state = window.__mobileStartupProbe;
      if (!state || state.firstDrawAt === null || state.firstFrameEndAt === null) return false;
      return performance.now() - Math.max(state.firstFrameEndAt, state.lastLongTaskEnd) >= quietMs;
    },
    { timeout: TIMEOUT_MS, polling: 100 },
    EMULATION.quietWindowMs,
  );

  const { profile } = await cdp.send('Profiler.stop');
  profilerStarted = false;
  fs.writeFileSync(profilePath, JSON.stringify(profile));
  profileSaved = true;

  manifest.milestones = await page.evaluate(() => {
    const state = window.__mobileStartupProbe;
    const navigation = performance.getEntriesByType('navigation')[0];
    return {
      timeOrigin: performance.timeOrigin,
      stoppedAt: performance.now(),
      firstDrawAt: state.firstDrawAt,
      firstFrameStartAt: state.firstFrameStartAt,
      firstFrameEndAt: state.firstFrameEndAt,
      lastLongTaskEnd: state.lastLongTaskEnd,
      longTasks: state.longTasks,
      instrumentedSpans: state.spans,
      probeErrors: state.errors,
      navigation: navigation?.toJSON?.() ?? null,
    };
  });

  await page.tracing.stop();
  tracingStarted = false;

  manifest.status = 'complete';
  manifest.profileStoppedAt = new Date().toISOString();
  fs.writeFileSync(runPath, JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest, null, 2));
  console.log(`\nraw CPU profile: ${profilePath}`);
  console.log(`raw trace:       ${tracePath}`);
  console.log(`run manifest:    ${runPath}`);
} catch (error) {
  manifest.status = 'failed';
  manifest.error = error instanceof Error ? error.stack || error.message : String(error);

  // A failure after navigation is still useful evidence. Preserve partial raw artifacts;
  // the manifest status prevents the analyzer from presenting them as a completed run.
  if (profilerStarted && cdp) {
    try {
      const { profile } = await cdp.send('Profiler.stop');
      profilerStarted = false;
      fs.writeFileSync(profilePath, JSON.stringify(profile));
      profileSaved = true;
    } catch (stopError) {
      manifest.profileStopError = String(stopError);
    }
  }
  if (tracingStarted && page) {
    try {
      await page.tracing.stop();
      tracingStarted = false;
    } catch (stopError) {
      manifest.traceStopError = String(stopError);
    }
  }
  if (manifest.gpu || profileSaved) {
    fs.writeFileSync(runPath, JSON.stringify(manifest, null, 2));
  }
  console.error(manifest.error);
  process.exitCode = 2;
} finally {
  if (browser) await browser.close();
}
