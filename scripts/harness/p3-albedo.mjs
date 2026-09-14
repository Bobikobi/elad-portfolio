/**
 * P3 - albedo and falloff: deterministic capture. Measurement is in p3-albedo.py.
 *
 *   TAG=before node scripts/harness/p3-albedo.mjs
 *   TAG=after  node scripts/harness/p3-albedo.mjs
 *   python3 scripts/harness/p3-albedo.py before after
 *
 * The overview needs all eight bodies at once, so it uses the same 3600x900 DPR-1
 * panorama and 0.30 overview pitch proven by SUN-3/P2. Every world and every tier-law
 * probe is a newly loaded page: this scene's composition depends on the viewport it was
 * loaded at, not merely on its current dimensions.
 *
 * Screenshots are taken only after the fixed-step clock reaches a frame well past the
 * 14-second asset settle, then the clock is frozen. No wall-clock capture is accepted.
 * Nothing is written unless ANGLE/Vulkan reports a real GPU; SwiftShader is not evidence.
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
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'p3-albedo');
const SETTLE = Number(process.env.SETTLE || 14000);
const TAG = process.env.TAG;
const SCROLL_FRAME = Number(process.env.SCROLL_FRAME || 1000);
const CAPTURE_FRAME = Number(process.env.CAPTURE_FRAME || 1600);
const PERF_FRAME = Number(process.env.PERF_FRAME || 1200);
const PERF_SAMPLES = Number(process.env.PERF_SAMPLES || 300);

if (!TAG || !/^[A-Za-z0-9._-]+$/.test(TAG)) {
  console.error('TAG is required (letters, digits, dot, underscore, hyphen), e.g. TAG=before node scripts/harness/p3-albedo.mjs');
  process.exit(2);
}
if (!(SCROLL_FRAME < PERF_FRAME && PERF_FRAME + PERF_SAMPLES < CAPTURE_FRAME)) {
  console.error('frame anchors must satisfy SCROLL_FRAME < PERF_FRAME and PERF_FRAME + PERF_SAMPLES < CAPTURE_FRAME');
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

/**
 * Take every DOM overlay out of the frame, leaving the canvas. TWO mechanisms, because
 * one is not enough and each covers the other's blind spot.
 *
 *  - the STYLESHEET catches nodes React re-creates. Inline styles lose to a re-render:
 *    PlanetLabels rewrites its pills every frame and puts their own style back.
 *  - the INLINE sweep catches nodes the stylesheet cannot win against. Measured here:
 *    the site header stays computed-visible under the stylesheet rule even though it
 *    matches the selector, so the app's own CSS is outranking an `!important` rule in an
 *    injected sheet. An inline `!important` declaration is the strongest author priority
 *    there is and it does win.
 *
 * The sweep runs more than once on purpose: a computed style read in the same task as the
 * write still returns the old value, so a single pass reports a leak it has just fixed.
 */
const hideDom = async (page) => {
  const ok = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return false;
    for (let el = canvas; el; el = el.parentElement) el.setAttribute('data-harness-keep', '');
    const style = document.createElement('style');
    style.id = 'p3-albedo-hide-dom';
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
      let n = 0;
      for (const el of document.body.querySelectorAll('*')) {
        if (el === canvas || el.contains(canvas) || canvas.contains(el)) continue;
        const box = el.getBoundingClientRect();
        if (getComputedStyle(el).visibility === 'visible' && box.width > 0 && box.height > 0) {
          el.style.setProperty('visibility', 'hidden', 'important');
          n++;
        }
      }
      return n;
    });
    if (!forced) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  return true;
};

/** Refuse the frame unless the stylesheet really left only the canvas visible. */
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
    const g = document.createElement('canvas').getContext('webgl2');
    const d = g?.getExtension('WEBGL_debug_renderer_info');
    return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'none';
  });

// Deliberately the same guard as SUN-3. Do not weaken it to obtain sandbox numbers.
const requireRealGpu = async (page) => {
  const gpu = await gpuRenderer(page);
  if (!/angle|vulkan/i.test(gpu) || /swiftshader/i.test(gpu)) {
    console.error(`NO REAL GPU (${gpu}) - refusing to measure`);
    await closeBrowser();
    process.exit(2);
  }
  return gpu;
};

// P4 measurement seam: extra query string, appended verbatim. Added 2026-09-14 so the
// rolloff can be switched off (`EXTRA_QS=noRolloff`) with every other capture condition -
// the fixed step, the frozen clock, the frame anchor - held exactly as they are.
const EXTRA_QS = process.env.EXTRA_QS || '';
const fixedStepUrl = (pathname, tier) => {
  const join = pathname.includes('?') ? '&' : '?';
  return `${BASE}${pathname}${join}hud=1&tier=${tier}&fixedStep${EXTRA_QS ? `&${EXTRA_QS}` : ''}`;
};

const waitForFixedFrame = async (page, target, id) => {
  const at = await page.evaluate(async (frame) => {
    const clock = window.__clock;
    if (!clock) return null;
    const state = await clock.waitForFrame(frame);
    return { ...state, actualFrame: clock.frame };
  }, target);
  if (!at?.fixedStep || at.actualFrame < target) {
    console.error(`fixedStep did not reach frame ${target} on ${id}`);
    await closeBrowser();
    process.exit(2);
  }
  return at;
};

const freeze = async (page, id) => {
  const frozen = await page.evaluate(async () => {
    const clock = window.__clock;
    return clock ? await clock.freeze() : null;
  });
  if (!frozen?.fixedStep || !frozen?.frozen) {
    console.error(`fixedStep clock did not freeze on ${id}`);
    await closeBrowser();
    process.exit(2);
  }
  return frozen;
};

const mode = (values) => {
  const counts = new Map();
  for (const value of values.filter(Number.isFinite)) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? null;
};

/**
 * CDP_URL attaches to a browser that is ALREADY RUNNING instead of starting one.
 *
 * That exists for one reason: an agent sandboxed away from this machine's GPU cannot
 * launch a Chrome that has one, so every measurement it writes has to be run by someone
 * else, and it hands back work it could not check. Pointing it at a browser that lives
 * outside its sandbox removes that limit without giving it GPU access or any other
 * privilege - it sends CDP commands to a local port, and the rendering happens out here.
 *
 *   ~/browser-agent/start-harness-browser.sh          # once, real GPU, invisible
 *   CDP_URL=http://127.0.0.1:9223 TAG=x node scripts/harness/p3-albedo.mjs
 *
 * The GPU guard below is unchanged and still refuses to measure on SwiftShader, so an
 * attached browser without acceleration fails exactly like a launched one would.
 */
const CDP_URL = process.env.CDP_URL;
const browser = CDP_URL
  ? await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 240000 })
  : await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    protocolTimeout: 240000,
    userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'p3-albedo-')),
    args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars',
      '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage',
    ],
  });
// Never close a browser we did not start - it is shared, and the next run needs it.
const closeBrowser = async () => (CDP_URL ? browser.disconnect() : browser.close());

// These objects are the single source of truth for both setViewport and the report.
const OVERVIEW_VIEWPORT = { width: 3600, height: 900, dpr: 1 };
const WORLD_VIEWPORT = { width: 1440, height: 900, dpr: 1 };
const PERF_VIEWPORT = { width: 1440, height: 900, dpr: 1 };
const VIEWS = [
  { id: 'overview', pathname: '/', focus: null, probeBody: null, viewport: OVERVIEW_VIEWPORT, overview: true },
  { id: 'about', pathname: '/about', focus: 'earth', probeBody: 'earth', viewport: WORLD_VIEWPORT },
  { id: 'services', pathname: '/services', focus: 'jupiter', probeBody: 'jupiter', viewport: WORLD_VIEWPORT },
  { id: 'projects', pathname: '/projects', focus: 'saturn', probeBody: 'saturn', viewport: WORLD_VIEWPORT },
  // The belt is not a sphere. Jupiter is the large HUD-located disc in this deterministic
  // composition and is the image probe for the belt world's ORBIT_APERTURE.
  { id: 'technologies', pathname: '/technologies', focus: 'belt', probeBody: 'jupiter', viewport: WORLD_VIEWPORT },
  { id: 'contact', pathname: '/contact', focus: 'mars', probeBody: 'mars', viewport: WORLD_VIEWPORT },
];

const report = {
  base: BASE,
  tag: TAG,
  when: new Date().toISOString(),
  build,
  anchors: { scrollFrame: SCROLL_FRAME, captureFrame: CAPTURE_FRAME, perfFrame: PERF_FRAME, perfSamples: PERF_SAMPLES },
  views: {},
  tiers: {},
};

for (const view of VIEWS) {
  const page = await browser.newPage();
  await applyBypass(page);
  
  const viewport = view.viewport;
  await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: viewport.dpr });
  await page.goto(fixedStepUrl(view.pathname, 'high'), { waitUntil: 'domcontentloaded', timeout: 90000 });
  await wait(SETTLE);

  const gpu = await requireRealGpu(page);
  if (view.overview) {
    await waitForFixedFrame(page, SCROLL_FRAME, view.id);
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    const orbitSet = await page.evaluate(() => {
      const scene = window.__scene?.getState?.();
      if (!scene?.setOrbit) return false;
      scene.setOrbit(0, 0.30);
      return true;
    });
    if (!orbitSet) {
      console.error('overview setOrbit seam is unavailable - refusing to measure');
      await closeBrowser();
      process.exit(2);
    }
  }

  const hidden = await hideDom(page);
  if (!hidden) {
    console.error(`no canvas on ${view.id} - refusing to measure`);
    await closeBrowser();
    process.exit(2);
  }
  const leaks = await assertCanvasOnly(page);
  if (leaks.length) {
    console.error(`NOT canvas-only on ${view.id}: ${leaks.join(', ')} - refusing to measure`);
    await closeBrowser();
    process.exit(2);
  }

  await waitForFixedFrame(page, CAPTURE_FRAME, view.id);
  const frozen = await freeze(page, view.id);
  const finalLeaks = await assertCanvasOnly(page);
  if (finalLeaks.length) {
    console.error(`NOT canvas-only at capture on ${view.id}: ${finalLeaks.join(', ')} - refusing to measure`);
    await closeBrowser();
    process.exit(2);
  }
  const probe = await page.evaluate(() => ({
    focusedPlanet: window.__scene?.getState?.().focusedPlanet ?? null,
    tier: window.__scene?.getState?.().quality ?? null,
    hud: window.__hud ?? null,
  }));
  if (probe.tier !== 'high' || probe.focusedPlanet !== view.focus) {
    console.error(`${view.id}: focus/tier is ${probe.focusedPlanet}/${probe.tier}, expected ${view.focus}/high - refusing to measure`);
    await closeBrowser();
    process.exit(2);
  }
  if (!probe.hud || probe.hud.vw !== viewport.width || probe.hud.vh !== viewport.height) {
    console.error(`${view.id}: HUD viewport ${probe.hud?.vw}x${probe.hud?.vh}, expected ${viewport.width}x${viewport.height} - refusing to measure`);
    await closeBrowser();
    process.exit(2);
  }

  const planets = probe.hud.planets ?? [];
  if (view.overview) {
    const outside = planets.filter((planet) => {
      const r = planet.px / 2;
      return planet.x - r < 0 || planet.x + r > probe.hud.vw || planet.y - r < 0 || planet.y + r > probe.hud.vh;
    });
    if (planets.length !== 8 || outside.length) {
      console.error(`overview does not contain eight complete HUD discs (${planets.length}; outside: ${outside.map((p) => p.key).join(', ') || 'none'})`);
      await closeBrowser();
      process.exit(2);
    }
  } else {
    const planet = planets.find((candidate) => candidate.key === view.probeBody);
    const r = (planet?.px ?? 0) / 2;
    if (!planet || planet.x - r < 0 || planet.x + r > probe.hud.vw ||
        planet.y - r < 0 || planet.y + r > probe.hud.vh) {
      console.error(`${view.id}: HUD probe body ${view.probeBody} is missing or cut by the capture edge - refusing to measure`);
      await closeBrowser();
      process.exit(2);
    }
  }

  const capture = `${TAG}-${view.id}.png`;
  report.views[view.id] = {
    capture,
    gpu,
    focus: probe.focusedPlanet,
    tier: probe.tier,
    viewport,
    probeBody: view.probeBody,
    hud: probe.hud,
    frozen,
  };
  fs.writeFileSync(path.join(OUT, capture), await page.screenshot({ type: 'png' }));
  console.log(`captured ${view.id} at fixed frame ${frozen.frame} (${viewport.width}x${viewport.height} DPR ${viewport.dpr})`);
  await page.close();
}

// P3-5 uses fresh, normally sized overview pages. It compares before/after within each
// pinned tier; high and low are not expected to have equal triangle counts to each other.
for (const requestedTier of ['high', 'low']) {
  const page = await browser.newPage();
  await applyBypass(page);
  
  const viewport = PERF_VIEWPORT;
  await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: viewport.dpr });
  await page.goto(fixedStepUrl('/', requestedTier), { waitUntil: 'domcontentloaded', timeout: 90000 });
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
    console.error(`tier ${requestedTier} was not pinned or returned an incomplete frame sample - refusing to measure`);
    await closeBrowser();
    process.exit(2);
  }
  const sorted = [...sample.intervals].sort((a, b) => a - b);
  const calls = sample.calls.filter(Number.isFinite);
  const triangles = sample.triangles.filter(Number.isFinite);
  if (!calls.length || !triangles.length) {
    console.error(`tier ${requestedTier}: renderer telemetry is unavailable - refusing to measure`);
    await closeBrowser();
    process.exit(2);
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
  };
  console.log(`sampled ${requestedTier}: calls ${report.tiers[requestedTier].calls}, triangles ${report.tiers[requestedTier].triangles}, median ${report.tiers[requestedTier].medianFrameMs.toFixed(3)}ms`);
  await page.close();
}

fs.writeFileSync(path.join(OUT, `${TAG}-capture.json`), JSON.stringify(report, null, 2));
console.log(`\ncaptured P3 tag "${TAG}" -> ${OUT}`);
await closeBrowser();
