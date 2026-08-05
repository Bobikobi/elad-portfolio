/**
 * PERF-2 harness - does the inverted governor actually assign the right tier?
 *
 *   BASE=<alias> BYPASS=<token> [THROTTLE=4] [WATCH_MS=35000] node scripts/harness/perf2-tier.mjs
 *
 * The two acceptance runs are the same script at two throttle rates:
 *
 *   THROTTLE=1  a machine with headroom  -> must START low and PROMOTE, then hold.
 *   THROTTLE=4  a struggling machine     -> must START low and STAY low, with no flapping.
 *
 * "No flapping" is the reason this samples over time rather than reading the tier once at
 * the end: a governor that promotes and demotes twice settles on the same final value as
 * one that never moved, and only the transition list tells them apart.
 *
 * The page is kept active throughout. The frame pacer drops an idle page to 30fps and the
 * governor deliberately ignores those frames, so a passive watcher would measure the
 * throttle rather than the machine.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE;
const BYPASS = process.env.BYPASS || '';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROUTE = process.env.ROUTE || '/';
// FPS_TARGET lowers the governor's bar so the promotion path can be exercised on a box
// with no headroom. It proves the MECHANISM fires; it says nothing about assignment on a
// real machine, which is why the strong run still has to happen on one.
const FPS_TARGET = process.env.FPS_TARGET || '';
const THROTTLE = Number(process.env.THROTTLE || 1);
const WATCH_MS = Number(process.env.WATCH_MS || 35000);
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'perf2');
fs.mkdirSync(OUT, { recursive: true });

if (!BASE) { console.error('BASE is required'); process.exit(2); }

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  args: ['--use-angle=d3d11', '--window-size=1280,900'],
  defaultViewport: { width: 1280, height: 860 },
});

const page = await browser.newPage();
if (BYPASS) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': BYPASS });
await page.bringToFront();

// A run that produces no readings has to say WHY. The first time this happened it looked
// like a governor failure and was not one - it was the page, and nothing recorded that.
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') pageErrors.push(`console: ${m.text().slice(0, 200)}`); });
page.on('requestfailed', (r) => pageErrors.push(`net: ${r.failure()?.errorText} ${r.url().slice(0, 90)}`));

const cdp = await page.createCDPSession();
if (THROTTLE > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });

const t0 = Date.now();
const url = `${BASE}${ROUTE}${FPS_TARGET ? `?fpsTarget=${FPS_TARGET}` : ''}`;
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });

/**
 * THE LATCH TEST. `SQUEEZE=on` promotes the page first, then throttles hard mid-run to
 * force a demotion, then releases. A governor whose latch works demotes ONCE and stays
 * there; one without it climbs straight back and the visitor watches the sky change twice.
 * Neither behaviour is visible in a run that only ever goes one way.
 */
const SQUEEZE = process.env.SQUEEZE === 'on';
const SQUEEZE_AT = Number(process.env.SQUEEZE_AT || 15000);
const SQUEEZE_RATE = Number(process.env.SQUEEZE_RATE || 8);
const RELEASE_AT = Number(process.env.RELEASE_AT || 24000);
let squeezed = false;
let released = false;

const samples = [];
while (Date.now() - t0 < WATCH_MS) {
  const el = Date.now() - t0;
  if (SQUEEZE && !squeezed && el > SQUEEZE_AT) {
    squeezed = true;
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: SQUEEZE_RATE });
    console.log(`  [${(el / 1000).toFixed(1)}s] squeeze on (${SQUEEZE_RATE}x)`);
  }
  if (SQUEEZE && squeezed && !released && el > RELEASE_AT) {
    released = true;
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    console.log(`  [${(el / 1000).toFixed(1)}s] squeeze released`);
  }
  const s = await page.evaluate(() => {
    // Keep the page non-idle or the pacer throttles and the governor stops judging.
    window.dispatchEvent(new Event('pointermove'));
    const p = window.__perf;
    return p ? { q: p.quality, fps: p.fps, dpr: p.dpr, hz: p.displayHz, idle: p.idle } : null;
  }).catch(() => null);
  if (s) samples.push({ t: +((Date.now() - t0) / 1000).toFixed(1), ...s });
  await new Promise((r) => setTimeout(r, 500));
}

await page.screenshot({ path: path.join(OUT, `tier-${THROTTLE}x.png`) });
const post = await page.evaluate(() => ({
  canvases: document.querySelectorAll('canvas').length,
  three: Boolean(window.__three),
  perf: Boolean(window.__perf),
  poster: Boolean(document.querySelector('[data-scene-poster], img[src*="poster"]')),
  html: document.documentElement.dataset.view ?? null,
})).catch((e) => ({ evalFailed: String(e).slice(0, 200) }));
await browser.close();

// --- verdict ------------------------------------------------------------------------------
const seen = samples.filter((s) => s.q);
const transitions = [];
for (let i = 1; i < seen.length; i++) {
  if (seen[i].q !== seen[i - 1].q) transitions.push({ at: seen[i].t, from: seen[i - 1].q, to: seen[i].q });
}
const first = seen[0];
const last = seen[seen.length - 1];

console.log(`\nBASE=${BASE}${ROUTE}  throttle=${THROTTLE}x  watched=${WATCH_MS / 1000}s  samples=${seen.length}`);
if (!first) {
  console.log('  NO __perf READINGS. End state of the page:');
  console.log(`    ${JSON.stringify(post)}`);
  console.log(`    page errors: ${pageErrors.length ? '' : 'none'}`);
  for (const e of pageErrors.slice(0, 6)) console.log(`      ${e}`);
  process.exit(1);
}
console.log(`  first reading  : ${first.q} @ ${first.t}s  (fps ${first.fps}, dpr ${first.dpr}, ${first.hz}Hz)`);
console.log(`  final reading  : ${last.q} @ ${last.t}s  (fps ${last.fps}, dpr ${last.dpr})`);
console.log(`  transitions    : ${transitions.length === 0 ? 'none' : ''}`);
for (const t of transitions) console.log(`      ${t.at}s  ${t.from} -> ${t.to}`);

const startedLow = first.q === 'low';
const flapped = transitions.length > 1;
console.log(`\n  started low : ${startedLow ? 'YES' : 'NO — the inversion is not in force'}`);
console.log(`  flapping    : ${flapped ? `YES (${transitions.length} changes)` : 'no'}`);
if (THROTTLE > 1) {
  console.log(`  VERDICT     : ${startedLow && last.q === 'low' && !flapped ? 'PASS - stayed low' : 'FAIL'}`);
} else {
  const promoted = transitions.some((t) => t.to === 'high');
  console.log(`  promoted    : ${promoted ? `YES at ${transitions.find((t) => t.to === 'high').at}s` : 'no'}`);
  console.log(`  VERDICT     : ${startedLow && promoted && last.q === 'high' && !flapped ? 'PASS - promoted and held' : startedLow && !promoted ? 'INCONCLUSIVE - no headroom on this box' : 'FAIL'}`);
}

fs.writeFileSync(path.join(OUT, `tier-${THROTTLE}x.json`), JSON.stringify({ base: BASE, route: ROUTE, throttle: THROTTLE, transitions, samples }, null, 2));
console.log(`\n  report: ${path.join(OUT, `tier-${THROTTLE}x.json`)}`);
