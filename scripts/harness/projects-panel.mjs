/**
 * The owner's report: on a phone, rotating the projects ring does not change the words,
 * and the words cover too much of the screen.
 *
 *   BASE=https://www.eladsaadon.dev node scripts/harness/projects-panel.mjs
 *
 * Measures, per viewport:
 *   1. the panel's text after each swipe of the fan — does the named project change?
 *   2. did the fan actually move? (scroll position + the ring's own angle signature)
 *      A panel that never changes because nothing rotated is a DIFFERENT defect from a
 *      panel that ignores a rotation, and the screenshot cannot tell them apart.
 *   3. how much of the viewport the panel's text covers, and what it covers.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE || 'https://www.eladsaadon.dev';
const CHROME = process.env.CHROME || '/opt/google/chrome/chrome';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'projects-panel');
const SETTLE = Number(process.env.SETTLE || 9000);
const PATHS = (process.env.PATHS || '/projects').split(',');

fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const VIEWPORTS = [
  { id: 'mobile', width: 390, height: 844, mobile: true },
  { id: 'phone-lg', width: 412, height: 915, mobile: true },
  { id: 'desktop', width: 1440, height: 900, mobile: false },
];

const PROFILE = path.join(process.env.HOME, '.cache', `panel-probe-${process.pid}-${Date.now()}`);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  userDataDir: PROFILE,
  args: ['--use-gl=angle', '--use-angle=vulkan', '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
});

/** Everything the panel and the fan are doing, in one read. */
const readState = (page) =>
  page.evaluate(() => {
    const t = document.querySelector('[data-panel-title]');
    const d = document.querySelector('[data-panel-desc]');
    const tech = document.querySelector('[data-panel-tech]');
    // The panel is the title's PARENT. `closest('div[class]')` matched the title itself
    // (closest includes self) and reported a 278x22 box for a block that is clearly
    // hundreds of px tall on the owner's screenshot.
    const panel = t?.parentElement ?? null;
    // The exact container ProjectsStage reads — not "the first scrollable div", which
    // found some unrelated 25px-tall box that never moved and made a rotating fan look
    // frozen.
    const scroller = document.querySelector('.ring-scroll');

    const cards = [...document.querySelectorAll('[data-title]')].map((c) => c.dataset.title);

    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };

    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const pb = box(panel);

    return {
      title: t?.textContent ?? null,
      desc: (d?.textContent ?? '').slice(0, 80),
      descLen: (d?.textContent ?? '').length,
      tech: tech?.textContent ?? null,
      panelBox: pb,
      panelCoverPct: pb ? +(((pb.w * pb.h) / (vw * vh)) * 100).toFixed(1) : null,
      panelOpacity: panel ? +getComputedStyle(panel).opacity : null,
      scroll: scroller
        ? {
            top: Math.round(scroller.scrollTop),
            left: Math.round(scroller.scrollLeft),
            spanY: scroller.scrollHeight - scroller.clientHeight,
            spanX: scroller.scrollWidth - scroller.clientWidth,
          }
        : null,
      cardCount: cards.length,
      cards: cards.slice(0, 14),
      vw,
      vh,
    };
  });

const results = [];

for (const vp of VIEWPORTS) {
  for (const p of PATHS) {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      isMobile: vp.mobile,
      hasTouch: vp.mobile,
    });

    const url = BASE + p;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(SETTLE);

    const steps = [];
    let s = await readState(page);
    steps.push({ step: 'initial', ...s });

    const dir = vp.mobile ? 'x' : 'y';
    for (let k = 1; k <= 5; k++) {
      // Drive the ring the way a visitor does. In portrait the fan runs sideways, so a
      // phone swipes horizontally; on desktop the wheel scrolls it.
      if (vp.mobile) {
        const cx = vp.width / 2;
        const cy = vp.height * 0.62;
        await page.touchscreen.touchStart(cx + 120, cy);
        for (let f = 1; f <= 10; f++) await page.touchscreen.touchMove(cx + 120 - f * 24, cy);
        await page.touchscreen.touchEnd();
      } else {
        await page.mouse.move(vp.width / 2, vp.height * 0.6);
        await page.mouse.wheel({ deltaY: 220 });
      }
      await sleep(1400);
      s = await readState(page);
      steps.push({ step: `swipe ${k}`, ...s });
      await page.screenshot({ path: path.join(OUT, `${vp.id}-${p.replace(/\W+/g, '_')}-${k}.png`) });
    }

    const titles = steps.map((x) => x.title);
    const uniqueTitles = [...new Set(titles)];
    const scrollMoved = steps.some(
      (x, i) =>
        i > 0 &&
        x.scroll &&
        steps[0].scroll &&
        (Math.abs(x.scroll.top - steps[0].scroll.top) > 4 || Math.abs(x.scroll.left - steps[0].scroll.left) > 4)
    );

    console.log(`\n=== ${vp.id} ${p} (${vp.width}x${vp.height}) ===`);
    console.log(`cards in DOM: ${steps[0].cardCount}`);
    console.log(`panel covers: ${steps[0].panelCoverPct}% of viewport  box=${JSON.stringify(steps[0].panelBox)}`);
    console.log(`desc length: ${steps[0].descLen} chars`);
    console.log(`scroll span: ${JSON.stringify(steps[0].scroll)}`);
    console.log(`fan moved on swipe: ${scrollMoved ? 'YES' : 'NO'}`);
    console.log(`distinct titles across 5 swipes: ${uniqueTitles.length} → ${JSON.stringify(uniqueTitles)}`);
    for (const st of steps) console.log(`  ${st.step.padEnd(9)} scroll=${JSON.stringify(st.scroll)} title="${st.title}"`);

    results.push({ viewport: vp.id, path: p, steps, uniqueTitles, scrollMoved });
    await page.close();
    await ctx.close();
  }
}

await browser.close();
fs.rmSync(PROFILE, { recursive: true, force: true });
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 2));
console.log('\nreport → ' + path.join(OUT, 'report.json'));
