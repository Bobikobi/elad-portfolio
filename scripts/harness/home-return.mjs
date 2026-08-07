/**
 * PR #27 - a visitor returning from a world can scroll back to the galaxy.
 *
 *   BASE=<alias-or-prod> [BYPASS=<token>] node scripts/harness/home-return.mjs
 *
 * The defect: after visiting a world and coming home, the document was exactly as tall as
 * the viewport - not scrollable in either direction - so the visitor was parked in the
 * solar overview with no way back to the galaxy short of a reload.
 *
 * Two things have to hold at once, and the second is why the first fix was wrong:
 *  1. the returning visitor lands at the END of the scroll driver and CAN scroll up;
 *  2. they are not ANIMATED there - `html { scroll-behavior: smooth }` is global, and the
 *     numeric overload of scrollTo inherits it, which scrolled the visitor through the
 *     intro's opening frames on the way down. Sampling after a delay cannot see that: by
 *     then a smooth scroll has arrived at the same place. So the position is sampled every
 *     frame from the first, and the check is whether it was ever between the two ends.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3112';
const BYPASS = process.env.BYPASS || '';
const CHROME = process.env.CHROME || '/snap/bin/chromium';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'home-return');
fs.mkdirSync(OUT, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 240000,
  // Its own profile per run. Puppeteer's default profile path is shared, so a browser left
  // behind by an interrupted run holds it and every later run dies on "already running".
  userDataDir: fs.mkdtempSync(path.join(OUT, 'profile-')),
  args: [
    '--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars',
    '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage',
    '--user-agent-suffix=elad-harness',
  ],
});

const report = {};
for (const c of [
  { name: 'he-desktop', pre: '', vp: { width: 1440, height: 900 } },
  { name: 'en-desktop', pre: '/en', vp: { width: 1440, height: 900 } },
  { name: 'he-mobile', pre: '', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } },
]) {
  // A fresh context per case: a stored locale or a `seen-intro` left by the previous case
  // would decide the branch under test for us.
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  if (BYPASS) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': BYPASS });
  await page.setViewport({ deviceScaleFactor: 1, ...c.vp });

  // 1. Fresh arrival. The intro must be unchanged: the document is scrollable and we are
  //    at the TOP of it.
  await page.goto(`${BASE}${c.pre}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await wait(9000);
  const fresh = await page.evaluate(() => ({
    docH: document.documentElement.scrollHeight,
    winH: window.innerHeight,
    y: Math.round(window.scrollY),
    gpu: (() => { const g = document.createElement('canvas').getContext('webgl2');
      const d = g?.getExtension('WEBGL_debug_renderer_info');
      return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'none'; })(),
  }));

  // 2. Visit a world, then come home the way a visitor does.
  await page.goto(`${BASE}${c.pre}/projects`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await wait(7000);
  // Come home the way a VISITOR does: the back control, which is a client-side transition
  // in the same document. A second `goto` is a fresh load and takes a different branch -
  // measured that way first, and it reported the visitor at the top of the page, which is
  // simply not the path under test.
  await page.evaluate(() => {
    window.__scrollTrace = [];
    const tick = () => { window.__scrollTrace.push(Math.round(window.scrollY)); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  const backControl = await page.$('[data-world-back]');
  if (!backControl) { report[c.name] = { error: 'no back control on the world page' }; await page.close(); await ctx.close(); continue; }
  await backControl.click();
  await wait(9000);

  const back = await page.evaluate(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const trace = window.__scrollTrace || [];
    return {
      docH: document.documentElement.scrollHeight,
      winH: window.innerHeight,
      max,
      y: Math.round(window.scrollY),
      atEnd: max > 0 && window.scrollY >= max - 8,
      // Frames spent NEITHER at the top nor at the end: a smooth scroll would have to pass
      // through them. An instant jump has none.
      travelled: trace.filter((v) => v > 8 && v < max - 8).length,
      traceLen: trace.length,
    };
  });

  // 3. And the point of the whole thing: scrolling up from there reaches the galaxy.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await wait(1500);
  const up = await page.evaluate(() => ({ y: Math.round(window.scrollY) }));
  await page.screenshot({ path: path.join(OUT, `${c.name}.png`) });

  report[c.name] = { fresh, back, up };
  await page.close();
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

let bad = 0;
for (const [k, v] of Object.entries(report)) {
  const realGpu = /vulkan|angle/i.test(v.fresh.gpu) && !/swiftshader/i.test(v.fresh.gpu);
  const scrollable = v.back.docH > v.back.winH + 8;
  const parkedAtEnd = v.back.atEnd;
  const instant = v.back.travelled === 0;
  const canGoUp = v.up.y === 0;
  const freshTop = v.fresh.y <= 8;
  if (!realGpu || !scrollable || !parkedAtEnd || !instant || !canGoUp || !freshTop) bad++;
  console.log(
    `${k.padEnd(11)} gpu=${realGpu} freshTop=${freshTop} scrollable=${scrollable} ` +
    `(doc ${v.back.docH} vs win ${v.back.winH}) parkedAtEnd=${parkedAtEnd} (y=${v.back.y}/${v.back.max}) ` +
    `instant=${instant} (mid-frames ${v.back.travelled}/${v.back.traceLen}) canGoUp=${canGoUp}`
  );
}
if (bad) process.exitCode = 1;
