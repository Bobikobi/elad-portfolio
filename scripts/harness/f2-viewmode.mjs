/**
 * F2 harness - the classic/cosmic view mode.
 *
 *   BASE=http://localhost:3112 node scripts/harness/f2-viewmode.mjs
 *   BASE=<preview alias> BYPASS=<token> node scripts/harness/f2-viewmode.mjs
 *
 * Five things are checked, and the first two are the ones that actually matter:
 *
 *  1. SERVER-SIDE. The mode is asserted by fetching the raw HTML with a cookie header and
 *     looking at what came back. A browser check cannot tell a page that was server-
 *     rendered in classic from one that was corrected during hydration - which is exactly
 *     the failure this stage is about - so the no-flash claim is made against bytes off
 *     the wire, not against a screenshot.
 *  2. COST. Total JS transferred, from the Performance API. The three.js chunk is ~424KB,
 *     so its absence is not a subtle signal.
 *  3. Round-trip: toggle in the page, reload, and confirm the mode survived.
 *  4. Auto-adoption: a reduced-motion visitor with no cookie must end up in classic.
 *  5. Screenshots, both viewports, all three locales.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3112';
const BYPASS = process.env.BYPASS || '';
const CHROME = process.env.CHROME || '/snap/bin/chromium';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'f2');
const SETTLE = Number(process.env.SETTLE || 9000);
fs.mkdirSync(OUT, { recursive: true });

const ROUTES = { he: '', en: '/en', ru: '/ru' };
const SECTIONS = ['about', 'services', 'projects', 'technologies', 'contact'];
const headers = BYPASS ? { 'x-vercel-protection-bypass': BYPASS } : {};

// --- 1. server-side rendering, straight off the wire -------------------------------
// Markers chosen because each appears in exactly one mode: the ring layer only exists in
// the cosmic /projects world, and the classic sections carry the section landmark id.
const ssr = [];
for (const [loc, prefix] of Object.entries(ROUTES)) {
  for (const s of SECTIONS) {
    for (const mode of ['cosmic', 'classic']) {
      const url = `${BASE}${prefix}/${s}`;
      const res = await fetch(url, { headers: { ...headers, cookie: `viewMode=${mode}` } });
      const html = await res.text();
      const cosmicMarkup = /ring-scroll|world-window|data-world-back/.test(html);
      const classicMarkup = new RegExp(`id="${s === 'technologies' ? 'tech' : s}"`).test(html)
        || /ClassicSection|section id=/.test(html);
      ssr.push({
        locale: loc, route: `/${s}`, cookie: mode, status: res.status,
        cosmicMarkup, classicMarkup,
        ok: mode === 'cosmic' ? cosmicMarkup : !cosmicMarkup,
      });
    }
  }
}
const ssrBad = ssr.filter((r) => !r.ok || r.status !== 200);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 240000,
  args: [
    '--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars',
    '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage',
    '--user-agent-suffix=elad-harness',
  ],
});

const page = async (ctx, { reduced = false, width = 1440, height = 900 } = {}) => {
  const p = await ctx.newPage();
  if (BYPASS) await p.setExtraHTTPHeaders(headers);
  await p.setViewport({ width, height, deviceScaleFactor: 1 });
  if (reduced) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  return p;
};

const snapshot = (p) => p.evaluate(() => {
  const js = performance.getEntriesByType('resource').filter((e) => /\.js/.test(e.name));
  return {
    totalJSKB: Math.round(js.reduce((a, e) => a + (e.transferSize || 0), 0) / 1024),
    biggestKB: Math.round(Math.max(0, ...js.map((e) => e.transferSize || 0)) / 1024),
    canvas: !!document.querySelector('canvas'),
    dataView: document.documentElement.dataset.view || null,
    cookie: (document.cookie.match(/viewMode=(\w+)/) || [])[1] || null,
    toggle: !!document.querySelector('[aria-label]') && !!document.querySelector('button[title]'),
  };
});

// --- 2. cost, per mode -------------------------------------------------------------
const cost = {};
for (const mode of ['cosmic', 'classic']) {
  const ctx = await browser.createBrowserContext();
  await ctx.setCookie({ name: 'viewMode', value: mode, url: BASE, path: '/' });
  const p = await page(ctx);
  await p.goto(`${BASE}/projects`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, SETTLE));
  cost[mode] = await snapshot(p);
  await p.close();
  await ctx.close();
}

// --- 3. toggle round-trip, from every route, every locale ---------------------------
const roundTrip = [];
for (const [loc, prefix] of Object.entries(ROUTES)) {
  for (const s of SECTIONS) {
    const ctx = await browser.createBrowserContext();
    const p = await page(ctx);
    await p.goto(`${BASE}${prefix}/${s}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 4500));
    const before = await snapshot(p);
    const clicked = await p.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => /view|תצוגה|вид/i.test(x.title || ''));
      if (!b) return false;
      b.click();
      return true;
    });
    await new Promise((r) => setTimeout(r, 3000));
    const after = await snapshot(p);
    await p.reload({ waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 4000));
    const reloaded = await snapshot(p);
    roundTrip.push({
      locale: loc, route: `/${s}`, clicked,
      before: before.cookie, after: after.cookie, reloaded: reloaded.cookie,
      canvasAfter: after.canvas, canvasReloaded: reloaded.canvas,
      ok: clicked && after.cookie === 'classic' && reloaded.cookie === 'classic'
        && !after.canvas && !reloaded.canvas,
    });
    await p.close();
    await ctx.close();
  }
}

// --- 4. auto-adoption for reduced motion, no cookie ----------------------------------
const ctxR = await browser.createBrowserContext();
const pR = await page(ctxR, { reduced: true });
await pR.goto(`${BASE}/projects`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise((r) => setTimeout(r, SETTLE));
const adoption = await snapshot(pR);
await pR.screenshot({ path: path.join(OUT, 'adopted-reduced-projects.png') });
await pR.close();
await ctxR.close();

// --- 5. screenshots, both viewports, all locales -------------------------------------
for (const mode of ['classic', 'cosmic']) {
  for (const [loc, prefix] of Object.entries(ROUTES)) {
    for (const [vpName, vp] of Object.entries({
      desktop: { width: 1440, height: 900 },
      mobile: { width: 390, height: 844 },
    })) {
      const ctx = await browser.createBrowserContext();
      await ctx.setCookie({ name: 'viewMode', value: mode, url: BASE, path: '/' });
      const p = await page(ctx, vp);
      await p.goto(`${BASE}${prefix}/projects`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await new Promise((r) => setTimeout(r, SETTLE));
      await p.screenshot({ path: path.join(OUT, `${mode}-${loc}-${vpName}.png`) });
      await p.close();
      await ctx.close();
    }
  }
}

await browser.close();
const report = { ssr, ssrBad, cost, roundTrip, adoption };
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

console.log(`SSR: ${ssr.length - ssrBad.length}/${ssr.length} routes served the cookie's mode`);
if (ssrBad.length) console.log('  BAD:', JSON.stringify(ssrBad.slice(0, 5)));
console.log(`cost cosmic : ${cost.cosmic.totalJSKB}KB JS, biggest ${cost.cosmic.biggestKB}KB, canvas=${cost.cosmic.canvas}`);
console.log(`cost classic: ${cost.classic.totalJSKB}KB JS, biggest ${cost.classic.biggestKB}KB, canvas=${cost.classic.canvas}`);
const rtBad = roundTrip.filter((r) => !r.ok);
console.log(`toggle round-trip: ${roundTrip.length - rtBad.length}/${roundTrip.length} ok`);
if (rtBad.length) console.log('  BAD:', JSON.stringify(rtBad.slice(0, 4)));
console.log(`reduced-motion adoption: cookie=${adoption.cookie} canvas=${adoption.canvas} dataView=${adoption.dataView}`);
