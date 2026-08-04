/**
 * F5 harness - the composer's real pass list, and how many renders a frame costs.
 *
 *   BASE=<alias> BYPASS=<token> [ROUTES=/,/about] [TIER=low] node scripts/harness/f5-pass-audit.mjs
 *
 * Requires a HUD build (any non-production deployment): the pass list is published by
 * Effects.tsx behind HUD_AVAILABLE, and `?hud=1` also exposes the renderer.
 *
 * Two numbers, and they answer different questions:
 *
 *  - `passList` is what the composer BUILT. It shows which effects got merged into one
 *    EffectPass and which took a pass of their own, which is the thing that cannot be read
 *    off the source.
 *  - `rendersPerFrame` is what it COSTS: renderer.render() calls divided by animation
 *    frames. Bloom and God Rays each run their own internal render targets on top of their
 *    EffectPass, so this is always the larger number - and it is the one the frame pays.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE;
const BYPASS = process.env.BYPASS || '';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROUTES = (process.env.ROUTES || '/,/about').split(',');
const TIER = process.env.TIER || '';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'f5-passes');
fs.mkdirSync(OUT, { recursive: true });

if (!BASE) { console.error('BASE is required'); process.exit(2); }

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  args: ['--use-angle=d3d11', '--window-size=1280,900'],
  defaultViewport: { width: 1280, height: 860 },
});

const results = [];
for (const route of ROUTES) {
  const page = await browser.newPage();
  if (BYPASS) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': BYPASS });
  await page.bringToFront(); // a backgrounded tab stops rAF and every frame measure hangs
  const q = `hud=1${TIER ? `&tier=${TIER}` : ''}`;
  await page.goto(`${BASE}${route}?${q}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await new Promise((r) => setTimeout(r, 9000));

  const data = await page.evaluate(async () => {
    const t = window.__three;
    if (!t) return { error: '__three missing - not a HUD build?' };

    // Count renderer.render() calls against real animation frames over the same window.
    t.gl.info.autoReset = false;
    t.gl.info.reset();
    const startRenders = t.gl.info.render.frame;
    let rafs = 0;
    let raf = 0;
    const tick = () => { rafs += 1; raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    // Keep the page non-idle, or the pacer throttles and the ratio measures the throttle.
    const end = performance.now() + 3000;
    while (performance.now() < end) {
      window.dispatchEvent(new Event('pointermove'));
      await new Promise((r) => setTimeout(r, 50));
    }
    cancelAnimationFrame(raf);
    const renders = t.gl.info.render.frame - startRenders;
    const calls = t.gl.info.render.calls;
    t.gl.info.autoReset = true;

    return {
      passList: window.__passes ?? null,
      rendersPerFrame: rafs ? +(renders / rafs).toFixed(1) : null,
      drawCallsPerFrame: rafs ? +(calls / rafs).toFixed(1) : null,
      framesSampled: rafs,
      perf: window.__perf ?? null,
    };
  });

  // A centre crop at 1:1 - this is the anti-aliasing evidence. A full-page screenshot
  // scaled to fit hides exactly the stair-stepping the question is about.
  const tag = `${route.replace(/\W+/g, '_') || 'root'}${TIER ? `-${TIER}` : ''}`;
  await page.screenshot({
    path: path.join(OUT, `crop-${tag}.png`),
    clip: { x: 440, y: 250, width: 400, height: 300 },
  });

  console.log(`\n=== ${route}${TIER ? ` (tier pinned: ${TIER})` : ''}`);
  if (data.error) {
    console.log(`  ${data.error}`);
  } else {
    console.log('  composer passes:');
    for (const p of data.passList ?? []) {
      console.log(`    ${p.pass}${p.merged ? `  [${p.merged.join(' + ')}]` : ''}`);
    }
    console.log(`  EffectPasses built : ${(data.passList ?? []).length}`);
    console.log(`  renders per frame  : ${data.rendersPerFrame}`);
    console.log(`  draw calls / frame : ${data.drawCallsPerFrame}`);
    console.log(`  tier               : ${data.perf?.quality ?? '-'}  dpr=${data.perf?.dpr ?? '-'}`);
  }
  results.push({ route, tier: TIER || 'auto', ...data });
  await page.close();
}

await browser.close();
const file = path.join(OUT, `passes${TIER ? `-${TIER}` : ''}.json`);
fs.writeFileSync(file, JSON.stringify(results, null, 2));
console.log(`\nreport: ${file}`);
