/**
 * F5 harness - what every route actually costs, measured on the deployment.
 *
 *   BASE=<url> [BYPASS=<token>] [THROTTLE=4] node scripts/harness/f5-route-cost.mjs
 *
 * Two questions per route, both of which a screenshot answers wrongly:
 *
 *  1. Does this route mount a WebGL canvas at all? Only home and the five world routes
 *     should. A legal page or a guide that mounts one is paying a scene's frame budget to
 *     render text, and (before the route gate landed) drawing the galaxy behind that text.
 *  2. What frame rate does it hold under a CPU throttle? Run with THROTTLE=4 this is a
 *     stand-in for the average machine the owner reported stuttering on. The quality tier
 *     the governor settles on is read from window.__perf, which ships in production
 *     builds precisely so this can be measured where it matters.
 *
 * Frames are counted with requestAnimationFrame in the page. On a throttled run that
 * counter is itself throttled, which is the point: it measures what a visitor sees.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE;
const BYPASS = process.env.BYPASS || '';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const THROTTLE = Number(process.env.THROTTLE || 4);
const SAMPLE_MS = Number(process.env.SAMPLE_MS || 6000);
const SETTLE_MS = Number(process.env.SETTLE_MS || 6000);
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'f5');
fs.mkdirSync(OUT, { recursive: true });

if (!BASE) {
  console.error('BASE is required');
  process.exit(2);
}

// `scene: true` = this route is supposed to mount a canvas. Everything else must not.
const ROUTES = [
  { path: '/', scene: true, note: 'home (en)' },
  { path: '/he', scene: true, note: 'home (he)' },
  { path: '/ru', scene: true, note: 'home (ru)' },
  { path: '/about', scene: true, note: 'world - earth' },
  { path: '/services', scene: true, note: 'world - jupiter' },
  { path: '/projects', scene: true, note: 'world - saturn' },
  { path: '/technologies', scene: true, note: 'world - belt' },
  { path: '/contact', scene: true, note: 'world - mars' },
  { path: '/privacy', scene: false, note: 'legal' },
  { path: '/terms', scene: false, note: 'legal' },
  { path: '/accessibility', scene: false, note: 'legal' },
  { path: '/guides', scene: false, note: 'long-form index' },
  { path: '/services/nextjs-development', scene: false, note: 'service sub-page' },
  { path: '/he/privacy-does-not-exist', scene: false, note: '404' },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  args: ['--use-angle=d3d11', '--window-size=1280,900'],
  defaultViewport: { width: 1280, height: 860 },
});

const rows = [];
for (const route of ROUTES) {
  const page = await browser.newPage();
  if (BYPASS) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': BYPASS });

  const cdp = await page.createCDPSession();
  if (THROTTLE > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });

  const res = await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const status = res?.status() ?? 0;
  await new Promise((r) => setTimeout(r, SETTLE_MS));

  // Frame counter + a scripted scroll, so the sample covers motion rather than a page
  // sitting idle (where the throttle to 30fps would make the number meaningless).
  const measured = await page.evaluate(async (ms) => {
    const canvases = document.querySelectorAll('canvas').length;
    let frames = 0;
    let raf = 0;
    const tick = () => { frames += 1; raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    const t0 = performance.now();
    const end = t0 + ms;
    while (performance.now() < end) {
      window.scrollBy(0, 6);
      window.dispatchEvent(new Event('pointermove'));
      await new Promise((r) => setTimeout(r, 50));
    }
    cancelAnimationFrame(raf);
    const seconds = (performance.now() - t0) / 1000;
    const perf = window.__perf ?? null;
    return {
      canvases,
      fps: +(frames / seconds).toFixed(1),
      perf,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      textColor: getComputedStyle(document.querySelector('main p') ?? document.body).color,
    };
  }, SAMPLE_MS);

  await page.screenshot({ path: path.join(OUT, `${route.path.replace(/\W+/g, '_') || 'root'}.png`) });
  rows.push({ ...route, status, ...measured });
  await page.close();
}

await browser.close();

let pass = true;
console.log(`\nBASE=${BASE}  CPU throttle=${THROTTLE}x  sample=${SAMPLE_MS}ms\n`);
console.log('route                          http  canvas  expect  fps    tier   dpr   verdict');
for (const r of rows) {
  const ok = r.scene ? r.canvases > 0 : r.canvases === 0;
  if (!ok) pass = false;
  console.log(
    `${r.path.padEnd(30)} ${String(r.status).padEnd(5)} ${String(r.canvases).padEnd(7)} ` +
      `${(r.scene ? 'yes' : 'no').padEnd(7)} ${String(r.fps).padEnd(6)} ` +
      `${String(r.perf?.quality ?? '-').padEnd(6)} ${String(r.perf?.dpr ?? '-').padEnd(5)} ${ok ? 'ok' : 'WRONG'}`
  );
}
console.log(`\ncanvas gating: ${pass ? 'PASS' : 'FAIL'}`);
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(rows, null, 2));
console.log(`report: ${path.join(OUT, 'report.json')}`);
process.exit(pass ? 0 : 1);
