/**
 * Where does the canvas mount, and what does it cost? (scene-mount ruling)
 *
 *   BASE=<alias> BYPASS=<token> node scripts/harness/scene-mount.mjs
 *
 * Per route type: whether a <canvas> exists, total JS transferred, the largest single
 * chunk (three.js + R3F + drei + postprocessing is ~424KB, so its presence is not
 * subtle), and Total Blocking Time from long tasks after navigation.
 *
 * TBT here is the sum of (task duration - 50ms) over long tasks observed from navigation
 * to settle. It is not Lighthouse's number - no throttling profile, no field data - so it
 * is only meaningful as a BEFORE/AFTER on the same machine, which is exactly how it is
 * used: cosmic routes should be unchanged and everything else should fall off a cliff.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3112';
const BYPASS = process.env.BYPASS || '';
const CHROME = process.env.CHROME || '/snap/bin/chromium';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'scene-mount');
const SETTLE = Number(process.env.SETTLE || 9000);
fs.mkdirSync(OUT, { recursive: true });

const ROUTES = [
  { name: 'home', path: '/', canvas: true },
  { name: 'world:projects', path: '/projects', canvas: true },
  { name: 'world:about', path: '/about', canvas: true },
  { name: 'world:contact', path: '/contact', canvas: true },
  { name: 'service-detail', path: '/services/nextjs-development', canvas: false },
  { name: 'guide', path: '/guides/website-cost-guide', canvas: false },
  { name: 'legal:privacy', path: '/privacy', canvas: false },
  { name: 'legal:terms', path: '/terms', canvas: false },
  { name: 'accessibility', path: '/accessibility', canvas: false },
  { name: 'en:guide', path: '/en/guides/website-cost-guide', canvas: false },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 180000,
  args: [
    '--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars',
    '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage',
    '--user-agent-suffix=elad-harness',
  ],
});

const report = {};
let bad = 0;
for (const mode of ['cosmic', 'classic']) {
  for (const r of ROUTES) {
    const ctx = await browser.createBrowserContext();
    await ctx.setCookie({ name: 'viewMode', value: mode, url: BASE, path: '/' });
    const page = await ctx.newPage();
    if (BYPASS) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': BYPASS });
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument(() => {
      window.__long = 0;
      try {
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) window.__long += Math.max(0, e.duration - 50);
        }).observe({ entryTypes: ['longtask'] });
      } catch { /* no longtask support */ }
    });
    await page.goto(BASE + r.path, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise((x) => setTimeout(x, SETTLE));
    const m = await page.evaluate(() => {
      const js = performance.getEntriesByType('resource').filter((e) => /\.js/.test(e.name));
      return {
        canvas: !!document.querySelector('canvas'),
        totalJSKB: Math.round(js.reduce((a, e) => a + (e.transferSize || 0), 0) / 1024),
        biggestKB: Math.round(Math.max(0, ...js.map((e) => e.transferSize || 0)) / 1024),
        tbtMs: Math.round(window.__long || 0),
      };
    });
    const expect = mode === 'classic' ? false : r.canvas;
    const ok = m.canvas === expect && (expect || m.biggestKB < 200);
    if (!ok) bad++;
    report[`${mode}:${r.name}`] = { ...m, expectCanvas: expect, ok };
    await page.close();
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

for (const [k, v] of Object.entries(report)) {
  console.log(
    `${k.padEnd(26)} canvas=${String(v.canvas).padEnd(5)} expect=${String(v.expectCanvas).padEnd(5)} ` +
    `js=${String(v.totalJSKB).padStart(4)}KB biggest=${String(v.biggestKB).padStart(4)}KB ` +
    `tbt=${String(v.tbtMs).padStart(5)}ms ${v.ok ? '' : '  <-- FAIL'}`
  );
}
console.log(bad === 0 ? 'all routes as expected' : `${bad} route(s) wrong`);
// Exit nonzero on failure. Printing "1 route(s) wrong" and then exiting 0 means any shell
// gate or CI step that runs this accepts a failing report - the harness would report the
// regression and the pipeline would carry on. Caught in review.
process.exitCode = bad === 0 ? 0 : 1;
