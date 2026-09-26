/**
 * PACING probe. Watches what the frame loop and the resolution scaler actually DO over
 * time on a page, rather than what the code says they should do.
 *
 *   BASE=http://localhost:3114 ROUTE=/about node scripts/harness/pacing-probe.mjs
 *
 * Two suspects, both in PerfPacer, both of which would read to a viewer as "the animation
 * jumps, like a video looping" rather than as flicker:
 *
 *  - FramePacer drops an IDLE page to 30fps. At 30 the globe turns twice as far between
 *    frames as at 60, which doubles every aliasing artefact on it. Whether a page is idle
 *    depends on `coverage` and `departure`, so it differs per route - that is measured
 *    here, not assumed.
 *  - ResolutionScaler re-evaluates once a SECOND and steps the render buffer by 0.1 down
 *    or 0.05 up. A machine sitting near the threshold therefore resizes its buffer every
 *    second, and the whole image pops between soft and sharp on a one-second cycle.
 *
 * `window.__perf` is published in production builds on purpose, so this probe works
 * against the live site as well as against a dev server.
 */
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE || 'http://localhost:3114';
const BYPASS = process.env.BYPASS || '';
const CHROME = process.env.CHROME || '/opt/google/chrome/chrome';
const ROUTE = process.env.ROUTE || '/about';
const SECONDS = Number(process.env.SECONDS || 30);
const WIDTH = Number(process.env.WIDTH || 1440);
const HEIGHT = Number(process.env.HEIGHT || 900);
const DSF = Number(process.env.DSF || 1);
const NUDGE = process.env.NUDGE === '1'; // move the pointer, so the page never goes idle

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 240000,
  userDataDir: process.env.PROFILE || `/tmp/puppeteer-pacing-${process.pid}`,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars',
    '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
if (BYPASS) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': BYPASS });
await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: DSF });
await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise((r) => setTimeout(r, 12000));

// A rolling record of every rendered frame's timestamp, kept in the page so the sampling
// below never has to guess at the rate.
await page.evaluate(() => {
  const w = window;
  w.__ft = [];
  const tick = (ts) => { w.__ft.push(ts); if (w.__ft.length > 4000) w.__ft.shift(); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});

const samples = [];
for (let i = 0; i < SECONDS; i++) {
  if (NUDGE) await page.mouse.move(700 + (i % 2) * 8, 450);
  await new Promise((r) => setTimeout(r, 1000));
  const s = await page.evaluate(() => {
    const w = window;
    const ft = w.__ft || [];
    const recent = ft.slice(-200);
    const d = recent.slice(1).map((v, i2) => v - recent[i2]).sort((a, b) => a - b);
    const p = w.__perf || {};
    const st = w.__scene || null;
    return {
      medianMs: d.length ? d[d.length >> 1] : 0,
      p95Ms: d.length ? d[Math.floor(d.length * 0.95)] : 0,
      maxMs: d.length ? d[d.length - 1] : 0,
      dpr: p.dpr, scale: p.scale, base: p.base, fps: p.fps, idle: p.idle,
      quality: p.quality, pacing: p.pacing, displayHz: p.displayHz,
      coverage: st ? st.coverage : undefined,
    };
  });
  samples.push(s);
}
await browser.close();

const first = samples[0] || {};
console.log(`${ROUTE} @ ${WIDTH}x${HEIGHT} dsf ${DSF}   nudge=${NUDGE ? 'on (never idle)' : 'off (left alone)'}`);
console.log(`quality=${first.quality} pacing=${first.pacing} displayHz=${first.displayHz} base=${first.base}\n`);
console.log(` s  medianMs  p95Ms   maxMs   fps   dpr    scale  idle`);
for (const [i, s] of samples.entries()) {
  console.log(`${String(i).padStart(2)}  ${String(s.medianMs?.toFixed(1)).padStart(8)}`
    + `${String(s.p95Ms?.toFixed(1)).padStart(7)}${String(s.maxMs?.toFixed(1)).padStart(8)}`
    + `${String(s.fps).padStart(7)}${String(s.dpr).padStart(7)}${String(s.scale).padStart(7)}`
    + `  ${s.idle}`);
}
const dprs = [...new Set(samples.map((s) => s.dpr).filter((v) => v !== undefined))];
const idles = [...new Set(samples.map((s) => s.idle))];
console.log(`\ndistinct dpr values seen: ${JSON.stringify(dprs)}`);
console.log(`idle states seen:         ${JSON.stringify(idles)}`);
const changes = samples.filter((s, i) => i && s.dpr !== samples[i - 1].dpr).length;
console.log(`buffer resizes in ${SECONDS}s: ${changes}`);
