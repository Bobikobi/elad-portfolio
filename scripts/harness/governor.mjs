/**
 * PERF-2 - what tier does a visitor actually get, and does it flap?
 *
 *   BASE=<alias> BYPASS=<token> node scripts/harness/governor.mjs
 *
 * Samples the scene store once a second for 45s on `/`, at CPU throttles 1x and 4x, and
 * reports every tier transition with the second it happened on.
 *
 * The ruling's three requirements map onto three readings: it must START low (the first
 * sample), it must STAY low under throttle (no transition in the 4x run), and it must
 * never FLAP (no more than one transition in any run). The 1x run additionally answers
 * whether this machine can earn a promotion at all, and how long that takes.
 *
 * `?hud=1` installs `window.__scene`, which is the only way to read the tier without
 * inferring it from pixels.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3112';
const BYPASS = process.env.BYPASS || '';
const CHROME = process.env.CHROME || '/snap/bin/chromium';
const ROUTE = process.env.ROUTE || '/';
const SECONDS = Number(process.env.SECONDS || 45);
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'governor');
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 300000,
  args: [
    '--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars',
    '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage',
    '--user-agent-suffix=elad-harness',
  ],
});

const report = {};
for (const rate of [1, 4]) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  if (BYPASS) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': BYPASS });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${BASE}${ROUTE}?hud=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  // Wait for the store to exist before sampling. Sampling from the navigation reads null
  // for however long hydration takes, and a run of nulls is indistinguishable from a run
  // that never decided - the first version of this reported exactly that.
  await page.waitForFunction(() => !!(window.__scene && window.__scene.getState), { timeout: 40000 })
    .catch(() => console.log('  (store never appeared)'));
  const cdp = await page.createCDPSession();
  if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });

  const read = () => page.evaluate(() => {
    const s = window.__scene && window.__scene.getState ? window.__scene.getState() : {};
    return { q: s.quality, hz: s.displayHz, pacing: s.pacing, fps: window.__hud ? Math.round(window.__hud.fps) : null };
  });

  const samples = [];
  for (let t = 0; t < SECONDS; t++) {
    await new Promise((r) => setTimeout(r, 1000));
    samples.push({ t: t + 1, ...(await read()) });
  }
  const transitions = [];
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].q !== samples[i - 1].q) {
      transitions.push({ atSecond: samples[i].t, from: samples[i - 1].q, to: samples[i].q });
    }
  }
  const first = samples.find((s) => s.q);
  // The refresh estimate needs 96 frames, so the FIRST sample is taken before it lands and
  // reports hz 0 with the default pacing. Reading the run's identity from it made the
  // report say the estimate never happened at all. Take the first SETTLED sample instead.
  const settled = samples.find((s) => s.hz) ?? first;
  report[`${rate}x`] = {
    startedOn: first ? first.q : null,
    endedOn: samples[samples.length - 1].q,
    transitions,
    displayHz: settled ? settled.hz : null,
    pacing: settled ? settled.pacing : null,
    fpsMedian: (() => {
      const f = samples.map((s) => s.fps).filter((x) => typeof x === 'number').sort((a, b) => a - b);
      return f.length ? f[Math.floor(f.length / 2)] : null;
    })(),
    samples,
  };
  await page.close();
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

for (const [k, v] of Object.entries(report)) {
  console.log(
    `${k.padEnd(3)} start=${String(v.startedOn).padEnd(4)} end=${String(v.endedOn).padEnd(4)} ` +
    `median fps=${String(v.fpsMedian).padStart(3)} hz=${v.displayHz} pacing=${v.pacing} ` +
    `transitions=${v.transitions.length ? v.transitions.map((t) => `${t.from}->${t.to}@${t.atSecond}s`).join(', ') : 'none'}`
  );
}
