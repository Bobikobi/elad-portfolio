/**
 * UX / visual audit sweep — every page, desktop and mobile.
 *
 *   BASE=https://www.eladsaadon.dev node scripts/harness/ux-audit.mjs
 *
 * Captures a viewport shot per route x viewport, and records the things a screenshot
 * cannot be trusted to show on its own:
 *   - horizontal overflow (scrollWidth vs clientWidth)
 *   - whether the WebGL canvas ACTUALLY rendered (non-blank pixels), because a dead
 *     scene screenshots as a clean dark page and looks intentional
 *   - tap targets under 44px on mobile
 *   - console errors and failed requests (missing images above all)
 *
 * Output: .harness-out/ux-audit/<viewport>/<name>.png + report.json
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { decodePng, imageStats } from './png-stats.mjs';

const BASE = process.env.BASE || 'https://www.eladsaadon.dev';
const CHROME = process.env.CHROME || '/snap/bin/chromium';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'ux-audit');
const SETTLE = Number(process.env.SETTLE || 9000);
const ONLY = process.env.ONLY || '';

const COSMIC = true; // route is expected to mount the 3D scene

const ROUTES = [
  { name: 'en-home', path: '/', canvas: COSMIC },
  { name: 'en-about', path: '/about', canvas: COSMIC },
  { name: 'en-services', path: '/services', canvas: COSMIC },
  { name: 'en-service-nextjs', path: '/services/nextjs-development', canvas: false },
  { name: 'en-projects', path: '/projects', canvas: COSMIC },
  { name: 'en-technologies', path: '/technologies', canvas: COSMIC },
  { name: 'en-contact', path: '/contact', canvas: COSMIC },
  { name: 'en-guide-cost', path: '/guides/website-cost-guide', canvas: false },
  { name: 'en-privacy', path: '/privacy', canvas: false },
  { name: 'en-accessibility', path: '/accessibility', canvas: false },
  { name: 'he-home', path: '/he', canvas: COSMIC },
  { name: 'he-about', path: '/he/about', canvas: COSMIC },
  { name: 'he-services', path: '/he/services', canvas: COSMIC },
  { name: 'he-service-nextjs', path: '/he/services/nextjs-development', canvas: false },
  { name: 'he-projects', path: '/he/projects', canvas: COSMIC },
  { name: 'he-technologies', path: '/he/technologies', canvas: COSMIC },
  { name: 'he-contact', path: '/he/contact', canvas: COSMIC },
  { name: 'ru-home', path: '/ru', canvas: COSMIC },
  { name: 'ru-projects', path: '/ru/projects', canvas: COSMIC },
];

const VIEWPORTS = [
  { id: 'desktop', width: 1440, height: 900, mobile: false },
  { id: 'mobile', width: 390, height: 844, mobile: true },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Where the canvas sits, and whether WebGL came up at all. Deliberately does NOT try to
 * read the canvas pixels: three.js runs preserveDrawingBuffer:false here, so a readback
 * returns all zeros on a page that is drawing a full galaxy. Liveness is decided from
 * the screenshot instead, in `sceneIsAlive` below.
 */
async function canvasProbe(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return { present: false, reason: 'no canvas element' };
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    const r = c.getBoundingClientRect();
    return {
      present: true,
      hasContext: !!gl,
      renderer: gl
        ? (() => {
            const ext = gl.getExtension('WEBGL_debug_renderer_info');
            return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
          })()
        : null,
      rect: { x: r.x, y: r.y, width: r.width, height: r.height },
      size: `${c.width}x${c.height}`,
    };
  });
}

/**
 * A rendered 3D scene has many luminance levels; a blank or failed canvas has one or two.
 * Measured over the screenshot, which is what the visitor actually sees.
 */
function sceneIsAlive(shotBuf, rect) {
  const stats = imageStats(decodePng(shotBuf), rect);
  return { ...stats, alive: stats.distinct >= 8 && stats.spread > 12 };
}

async function measure(page, isMobile) {
  return page.evaluate((mobile) => {
    const de = document.documentElement;
    const overflow = de.scrollWidth - de.clientWidth;

    // widest element that pokes past the viewport, for a diagnosis rather than a flag
    let culprit = null;
    if (overflow > 1) {
      let worst = 0;
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const past = Math.max(r.right - de.clientWidth, -r.left);
        if (past > worst) {
          worst = past;
          culprit = `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''} (+${Math.round(past)}px)`;
        }
      }
    }

    let smallTargets = [];
    if (mobile) {
      for (const el of document.querySelectorAll('a[href], button, [role="button"], input, select, textarea')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue; // not rendered
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        if (r.width < 44 || r.height < 44) {
          smallTargets.push({
            tag: el.tagName.toLowerCase(),
            text: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 28),
            size: `${Math.round(r.width)}x${Math.round(r.height)}`,
          });
        }
      }
    }

    const h1s = [...document.querySelectorAll('h1')].map((h) => h.innerText.trim().slice(0, 60));
    const bodyText = (document.body.innerText || '').trim();

    return {
      overflowPx: overflow,
      overflowCulprit: culprit,
      docHeight: de.scrollHeight,
      viewportHeight: de.clientHeight,
      h1Count: h1s.length,
      h1: h1s,
      textChars: bodyText.length,
      smallTargetCount: smallTargets.length,
      smallTargets: smallTargets.slice(0, 12),
      title: document.title,
      lang: de.lang,
      dir: de.dir || getComputedStyle(document.body).direction,
    };
  }, isMobile);
}

// A unique profile per run, under $HOME because snap confinement cannot reach /tmp.
// A SHARED profile is a known instrument defect here: a stored locale leaks from one
// case into the next, so every page also gets its own isolated browser context below.
const PROFILE = path.join(
  process.env.HOME,
  '.cache',
  `ux-audit-profile-${process.pid}-${Date.now()}`
);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  userDataDir: PROFILE,
  args: [
    '--use-gl=angle',
    '--use-angle=vulkan',
    '--enable-unsafe-webgpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
  ],
});

const report = [];
const routes = ONLY ? ROUTES.filter((r) => ONLY.split(',').includes(r.name)) : ROUTES;

for (const vp of VIEWPORTS) {
  fs.mkdirSync(path.join(OUT, vp.id), { recursive: true });
  for (const route of routes) {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      isMobile: vp.mobile,
      hasTouch: vp.mobile,
    });

    const consoleErrors = [];
    const failedRequests = [];
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 180));
    });
    page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + String(e).slice(0, 180)));
    page.on('requestfailed', (r) =>
      failedRequests.push(`${r.failure()?.errorText || 'failed'} ${r.url().slice(0, 120)}`)
    );
    page.on('response', (r) => {
      if (r.status() >= 400) failedRequests.push(`HTTP ${r.status()} ${r.url().slice(0, 120)}`);
    });

    const url = BASE + route.path;
    let status = 'ok';
    try {
      const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      status = `HTTP ${resp?.status()}`;
    } catch (e) {
      status = 'NAV FAIL: ' + String(e).slice(0, 120);
    }

    await sleep(route.canvas ? SETTLE : 2500);

    const probe = route.canvas ? await canvasProbe(page) : { present: false, expected: false };
    const m = await measure(page, vp.mobile);

    const shot = path.join(OUT, vp.id, `${route.name}.png`);
    const shotBuf = await page.screenshot();
    fs.writeFileSync(shot, shotBuf);

    let canvas = probe;
    if (route.canvas && probe.present) {
      try {
        canvas = { ...probe, ...sceneIsAlive(shotBuf, probe.rect) };
      } catch (e) {
        canvas = { ...probe, alive: null, statsError: String(e).slice(0, 100) };
      }
    }

    report.push({
      route: route.name,
      viewport: vp.id,
      url,
      status,
      canvas,
      ...m,
      consoleErrors: [...new Set(consoleErrors)].slice(0, 6),
      failedRequests: [...new Set(failedRequests)].slice(0, 6),
      shot,
    });

    const flags = [];
    if (m.overflowPx > 1) flags.push(`OVERFLOW +${m.overflowPx}px`);
    if (route.canvas && canvas.alive === false) flags.push('CANVAS DEAD');
    if (m.smallTargetCount) flags.push(`${m.smallTargetCount} small targets`);
    if (consoleErrors.length) flags.push(`${consoleErrors.length} console errors`);
    if (failedRequests.length) flags.push(`${failedRequests.length} failed reqs`);
    console.log(
      `${vp.id.padEnd(7)} ${route.name.padEnd(20)} ${status.padEnd(9)} ${flags.length ? '⚠ ' + flags.join(', ') : 'clean'}`
    );

    await page.close();
    await ctx.close();
  }
}

await browser.close();
fs.rmSync(PROFILE, { recursive: true, force: true });
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log('\nreport → ' + path.join(OUT, 'report.json'));
