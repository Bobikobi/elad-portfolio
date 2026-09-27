/**
 * HITCH probe. Finds the long frames, says when each one happened, and says whether JS was
 * blocking at the time.
 *
 *   BASE=http://localhost:3114 SECONDS=40 node scripts/harness/hitch-probe.mjs
 *
 * "The animation jumps, like a video looping" is a complaint about frame PACING, and an
 * average frame rate cannot answer it: a scene that renders 59 frames in a second and
 * stalls for 100ms in the middle of them reports 59fps and looks broken. So this records
 * every frame gap, keeps the long ones with their timestamps, and reports the intervals
 * BETWEEN them - a jump that repeats on a fixed period is a different bug from one that
 * happens once while a texture uploads, and the gap between hitches is what separates them.
 *
 * Long tasks are recorded alongside, from PerformanceObserver. A hitch with a long task on
 * top of it is JS blocking the main thread - garbage collection, a decode, a React render.
 * A hitch with no long task under it is the GPU or the compositor, and no amount of
 * profiling the JS will find it.
 *
 * The pointer is nudged every second by default so the page never counts as idle: this is
 * about the pacing of a page that IS animating, not about the idle path.
 */
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE || 'http://localhost:3114';
const BYPASS = process.env.BYPASS || '';
const CHROME = process.env.CHROME || '/opt/google/chrome/chrome';
const ROUTE = process.env.ROUTE || '/about';
const SECONDS = Number(process.env.SECONDS || 40);
const WIDTH = Number(process.env.WIDTH || 1440);
const HEIGHT = Number(process.env.HEIGHT || 900);
const DSF = Number(process.env.DSF || 1);
const NUDGE = process.env.NUDGE !== '0';
const LABEL = process.env.LABEL || BASE;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 240000,
  userDataDir: process.env.PROFILE || `/tmp/puppeteer-hitch-${process.pid}`,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars',
    '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
if (BYPASS) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': BYPASS });
await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: DSF });
await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise((r) => setTimeout(r, 14000)); // past the warm-up: compiles and uploads

await page.evaluate(() => {
  const w = window;
  w.__gaps = [];
  w.__long = [];
  let prev = 0;
  const tick = (ts) => {
    if (prev) w.__gaps.push([ts, ts - prev]);
    prev = ts;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) w.__long.push([e.startTime, e.duration]);
    }).observe({ entryTypes: ['longtask'] });
  } catch { /* not supported - the GPU/compositor question just goes unanswered */ }
});

for (let i = 0; i < SECONDS; i++) {
  if (NUDGE) await page.mouse.move(700 + (i % 2) * 6, 450);
  await new Promise((r) => setTimeout(r, 1000));
}

const out = await page.evaluate(() => {
  const w = window;
  return { gaps: w.__gaps, long: w.__long, perf: w.__perf || {} };
});
await browser.close();

const gaps = out.gaps;
const durs = gaps.map((g) => g[1]).sort((a, b) => a - b);
const median = durs[durs.length >> 1];
const p = (q) => durs[Math.floor(durs.length * q)];
const THRESH = Math.max(median * 1.5, median + 8);
const hitches = gaps.filter((g) => g[1] > THRESH);

console.log(`${LABEL}${ROUTE}  ${WIDTH}x${HEIGHT} dsf ${DSF}  nudge=${NUDGE ? 'on' : 'off'}`);
console.log(`perf: quality=${out.perf.quality} dpr=${out.perf.dpr} fps=${out.perf.fps} idle=${out.perf.idle} displayHz=${out.perf.displayHz}`);
console.log(`frames ${gaps.length}   median ${median.toFixed(1)}ms   p95 ${p(0.95).toFixed(1)}ms`
  + `   p99 ${p(0.99).toFixed(1)}ms   max ${durs[durs.length - 1].toFixed(1)}ms`);
console.log(`hitches over ${THRESH.toFixed(1)}ms: ${hitches.length} in ${SECONDS}s`
  + `  (${(hitches.length / SECONDS).toFixed(2)} per second)`);

if (hitches.length) {
  const t0 = gaps[0][0];
  const times = hitches.map((h) => (h[0] - t0) / 1000);
  const between = times.slice(1).map((t, i) => t - times[i]);
  console.log(`\n  when (s from start) and how long:`);
  for (const h of hitches.slice(0, 25)) {
    const at = (h[0] - t0) / 1000;
    const blocking = out.long.find((l) => h[0] - l[0] < l[1] + 60 && h[0] >= l[0]);
    console.log(`    ${at.toFixed(2).padStart(7)}s  ${h[1].toFixed(1).padStart(7)}ms`
      + (blocking ? `   JS blocked ${blocking[1].toFixed(0)}ms` : `   no long task - GPU/compositor`));
  }
  if (hitches.length > 25) console.log(`    ... and ${hitches.length - 25} more`);
  if (between.length > 2) {
    const s = [...between].sort((a, b) => a - b);
    const med = s[s.length >> 1];
    const spread = (s[s.length - 1] - s[0]) / Math.max(med, 1e-6);
    console.log(`\n  gap between hitches: median ${med.toFixed(2)}s  min ${s[0].toFixed(2)}s  max ${s[s.length - 1].toFixed(2)}s`);
    console.log(`  ${spread < 0.5 ? 'REGULAR - something on a fixed period' : 'irregular - not a periodic driver'}`);
  }
}
console.log(`\nlong tasks: ${out.long.length}` + (out.long.length
  ? `   longest ${Math.max(...out.long.map((l) => l[1])).toFixed(0)}ms`
  : ''));
