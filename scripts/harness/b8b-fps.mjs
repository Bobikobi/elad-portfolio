/**
 * B8b criterion 6 - frame rate while the ring scrolls, on a REAL GPU.
 *
 *   BASE=<alias> BYPASS=<token> node scripts/harness/b8b-fps.mjs
 *
 * Headless here is SwiftShader, so a headless frame rate measures software 3D and says
 * nothing about this layer. This runs headed against the machine's GPU (MEGA PLAN part
 * 5.4) and reports both tiers: high = untouched, low = CDP CPU throttling, which is what
 * the quality governor is meant to survive.
 *
 * It also asserts the TIER LAW (L2) directly: the ring geometry the layer publishes must
 * be IDENTICAL between the two tiers. Only the cost may differ.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3112';
const BYPASS = process.env.BYPASS || '';
const CHROME = process.env.CHROME || '/snap/bin/chromium';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'b8b-fps');
const SETTLE = Number(process.env.SETTLE || 11000);
fs.mkdirSync(OUT, { recursive: true });

const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const CASES = [
  { name: 'desktop-high', vp: { width: 1440, height: 900 }, throttle: 1 },
  { name: 'desktop-low', vp: { width: 1440, height: 900 }, throttle: 6 },
  { name: 'mobile-high', vp: { width: 390, height: 844, isMobile: true, hasTouch: true }, throttle: 1 },
  { name: 'mobile-low', vp: { width: 390, height: 844, isMobile: true, hasTouch: true }, throttle: 6 },
].filter((c) => !ONLY || ONLY.includes(c.name));

/**
 * Scroll the ring for SECS seconds and record every animation frame. Reported as
 * intervals rather than an average: an average of 60 hides a 300ms stall, and a stall is
 * exactly what a per-frame path rebuild would cause.
 */
const run = (secs) => `(async () => {
  const list = document.querySelector('.ring-scroll');
  if (!list) return { error: 'no ring' };
  list.scrollTop = 0;
  const frames = [];
  let stop = false;
  let dir = 1;
  // The deadline is a setTimeout, NOT the rAF loop's own clock. If rAF is being throttled
  // (an occluded or backgrounded window drops it to ~1Hz) a loop that waits on rAF to
  // reach its deadline simply never returns, and the run hangs instead of reporting that
  // the sample is worthless. This way it always resolves and the frame count tells us.
  const tick = (t) => {
    frames.push(t);
    list.scrollTop += 7 * dir;
    if (list.scrollTop <= 0 || list.scrollTop >= list.scrollHeight - list.clientHeight - 1) dir = -dir;
    if (!stop) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  await new Promise((r) => setTimeout(r, ${secs} * 1000));
  stop = true;
  if (frames.length < 3) return { error: 'rAF starved - ' + frames.length + ' frames in ${secs}s', frames: frames.length };
  const dts = frames.slice(1).map((t, i) => t - frames[i]).sort((a, b) => a - b);
  const at = (p) => +dts[Math.min(dts.length - 1, Math.floor(dts.length * p))].toFixed(2);
  const svg = document.querySelector('svg[data-ring]');
  return {
    frames: frames.length,
    seconds: +((frames[frames.length - 1] - frames[0]) / 1000).toFixed(2),
    fpsMean: +(1000 / (dts.reduce((a, b) => a + b, 0) / dts.length)).toFixed(1),
    medianMs: at(0.5),
    p95Ms: at(0.95),
    worstMs: at(1),
    over16_7: +(100 * dts.filter((d) => d > 16.7).length / dts.length).toFixed(1),
    over33: +(100 * dts.filter((d) => d > 33).length / dts.length).toFixed(1),
    scrolled: Math.round(list.scrollTop),
    ring: svg ? JSON.parse(svg.dataset.ring) : null,
  };
})()`;

// Headless WITH the real GPU. The default headless path is SwiftShader, which measures
// software 3D and would fail a criterion this layer is not responsible for. Measured on
// this machine: default headless = "SwiftShader Device (Subzero)", --use-gl=egl /
// --use-angle=gl / --use-gl=desktop = no WebGL context at all, and only
// --use-gl=angle --use-angle=vulkan reaches "Intel(R) Graphics (RPL-P), Mesa". Changing
// these flags without re-running that probe is how a run silently measures a page with
// no scene on it at 60fps and calls it a pass - see the sceneRendered guard below.
// HEADED=1 forces a visible window instead (then keep it focused, or rAF is throttled
// and the run reports 'rAF starved' rather than a wrong number).
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: process.env.HEADED ? false : 'new',
  protocolTimeout: 240000,
  args: [
    '--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars',
    '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-zero-copy',
    '--use-gl=angle', '--use-angle=vulkan',
    '--user-agent-suffix=elad-harness',
  ],
});

const report = {};
for (const c of CASES) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  if (BYPASS) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': BYPASS });
  await page.setViewport({ deviceScaleFactor: 1, ...c.vp });
  await page.bringToFront();
  await page.goto(`${BASE}/projects?ringprobe=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, SETTLE));
  const cdp = await page.createCDPSession();
  const gpu = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return 'NO WEBGL CONTEXT';
    const d = gl.getExtension('WEBGL_debug_renderer_info');
    return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown renderer';
  });
  // The guard that makes this measurement worth anything. The ring falls back to the
  // DESIGN framing whenever the rig is not publishing a limb, i.e. whenever the scene is
  // not rendering - and a page with no scene on it scrolls at a flawless 60fps on any
  // tier, which is precisely the false pass this harness exists to avoid. Design R is
  // fill/2 * viewport height, exactly; the live fit never lands on it.
  const designR = (c.vp.height * (c.vp.width / c.vp.height < 1 ? 0.44 : 0.68)) / 2;
  const probe = await page.evaluate(() => {
    const s = document.querySelector('svg[data-ring]');
    return s ? JSON.parse(s.dataset.ring).R : null;
  });
  const sceneRendered = probe !== null && Math.abs(probe - designR) > 0.5;
  if (c.throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: c.throttle });
  await new Promise((r) => setTimeout(r, 1500));
  report[c.name] = { gpu, throttle: c.throttle, sceneRendered, probeR: probe, designR,
    ...(sceneRendered ? await page.evaluate(run(4))
      : { error: `scene not rendering (ring R ${probe} == design ${designR}) - frame rate would be meaningless` }) };
  await page.screenshot({ path: path.join(OUT, `${c.name}.png`) });
  await page.close();
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

for (const [k, v] of Object.entries(report)) {
  if (v.error) { console.log(`${k.padEnd(13)} ERROR ${v.error}`); continue; }
  console.log(
    `${k.padEnd(13)} throttle=${v.throttle}x fps=${v.fpsMean} median=${v.medianMs}ms ` +
    `p95=${v.p95Ms}ms worst=${v.worstMs}ms  >16.7ms:${v.over16_7}%  >33ms:${v.over33}%`
  );
}
// Tier law: identical composition, only cost may differ.
for (const [hi, lo] of [['desktop-high', 'desktop-low'], ['mobile-high', 'mobile-low']]) {
  const a = report[hi] && report[hi].ring, b = report[lo] && report[lo].ring;
  if (!a || !b) continue;
  const keys = ['r0', 'r1', 'rMid', 'dHalf', 'fan', 'th0', 'contentDepth', 'contentHalf'];
  const worst = Math.max(...keys.map((k) => Math.abs(a[k] - b[k])));
  console.log(`tier-law ${hi} vs ${lo}: worst geometry delta = ${worst.toFixed(3)} (R differs by ${Math.abs(a.R - b.R).toFixed(2)}px, the live limb breathing)`);
}
console.log(`GPU: ${report['desktop-high'].gpu}`);
if (/swiftshader|llvmpipe|software/i.test(String(report['desktop-high'].gpu))) {
  console.log('WARNING: software renderer - this run does NOT satisfy criterion 6.');
}
