/**
 * Two questions the owner's screenshot raises, answered in numbers.
 *
 *   1. Does the words panel OVERLAP the preview window it is describing? On a phone the
 *      screenshot shows the description sitting across the picture, which would mean the
 *      "preview-only window + words on the planet" split does not survive portrait.
 *   2. What does each gesture actually do in portrait — swipe sideways vs swipe up?
 *      The ring reads scrollLeft in portrait, so a vertical swipe may be doing something
 *      else entirely (the departure/exit gesture), leaving one unlabelled gesture as the
 *      only way to see 12 projects.
 *
 *   BASE=https://www.eladsaadon.dev node scripts/harness/projects-collide.mjs
 */
import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const BASE = process.env.BASE || 'https://www.eladsaadon.dev';
const CHROME = process.env.CHROME || '/opt/google/chrome/chrome';
const OUT = path.join(process.cwd(), '.harness-out', 'projects-collide');
const SETTLE = Number(process.env.SETTLE || 9000);
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PROFILE = path.join(process.env.HOME, '.cache', `collide-${process.pid}-${Date.now()}`);
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  userDataDir: PROFILE,
  args: ['--use-gl=angle', '--use-angle=vulkan', '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
});

const geom = (page) =>
  page.evaluate(() => {
    const t = document.querySelector('[data-panel-title]');
    const panel = t?.parentElement ?? null;
    const scroller = document.querySelector('.ring-scroll');
    const de = document.documentElement;

    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: +r.x.toFixed(0), y: +r.y.toFixed(0), w: +r.width.toFixed(0), h: +r.height.toFixed(0), r: +r.right.toFixed(0), b: +r.bottom.toFixed(0) };
    };

    // The window currently named by the panel: match the panel's title text against the
    // cards' data-title, then take that card's hit shape.
    const title = t?.textContent ?? '';
    const cards = [...document.querySelectorAll('[data-title]')];
    const idx = cards.findIndex((c) => c.dataset.title === title);
    const card = idx >= 0 ? cards[idx] : null;

    // The visible sector is an SVG path in the ring layer; the card carries the content.
    const paths = [...document.querySelectorAll('.ring-layer path, .ring-layer image, .ring-layer g')];
    const visible = paths
      .map((p) => {
        const r = p.getBoundingClientRect();
        return { tag: p.tagName, x: +r.x.toFixed(0), y: +r.y.toFixed(0), w: +r.width.toFixed(0), h: +r.height.toFixed(0), r: +r.right.toFixed(0), b: +r.bottom.toFixed(0), area: r.width * r.height };
      })
      .filter((r) => r.w > 40 && r.h > 40)
      .sort((a, b) => b.area - a.area);

    const pb = box(panel);
    const overlapWith = (o) => {
      if (!pb || !o) return null;
      const ox = Math.max(0, Math.min(pb.r, o.r) - Math.max(pb.x, o.x));
      const oy = Math.max(0, Math.min(pb.b, o.b) - Math.max(pb.y, o.y));
      const inter = ox * oy;
      return {
        interPx: Math.round(inter),
        pctOfPanel: pb.w * pb.h ? +((inter / (pb.w * pb.h)) * 100).toFixed(1) : 0,
        pctOfOther: o.w * o.h ? +((inter / (o.w * o.h)) * 100).toFixed(1) : 0,
      };
    };

    return {
      vw: de.clientWidth,
      vh: de.clientHeight,
      title,
      namedIndex: idx,
      panel: pb,
      panelPctOfViewport: pb ? +(((pb.w * pb.h) / (de.clientWidth * de.clientHeight)) * 100).toFixed(1) : null,
      cardBox: box(card),
      cardOverlap: overlapWith(box(card)),
      biggestRingShapes: visible.slice(0, 3),
      ringShapeOverlap: visible[0] ? overlapWith(visible[0]) : null,
      scroll: scroller ? { left: Math.round(scroller.scrollLeft), top: Math.round(scroller.scrollTop) } : null,
      scrollerPresent: !!scroller,
      docScrollY: window.scrollY,
    };
  });

for (const vp of [
  { id: 'mobile', width: 390, height: 844, mobile: true },
  { id: 'desktop', width: 1440, height: 900, mobile: false },
]) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ ...vp, deviceScaleFactor: 1, isMobile: vp.mobile, hasTouch: vp.mobile });
  await page.goto(BASE + '/projects', { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(SETTLE);

  const at_rest = await geom(page);
  console.log(`\n=== ${vp.id} ${vp.width}x${vp.height} — AT REST ===`);
  console.log(`named: "${at_rest.title}" (card #${at_rest.namedIndex})`);
  console.log(`panel box ${JSON.stringify(at_rest.panel)} = ${at_rest.panelPctOfViewport}% of viewport`);
  console.log(`card  box ${JSON.stringify(at_rest.cardBox)}`);
  console.log(`panel∩card: ${JSON.stringify(at_rest.cardOverlap)}`);
  console.log(`biggest ring shape ${JSON.stringify(at_rest.biggestRingShapes[0])}`);
  console.log(`panel∩ringShape: ${JSON.stringify(at_rest.ringShapeOverlap)}`);

  if (vp.mobile) {
    // Gesture A: swipe sideways — the documented way to turn the fan in portrait.
    const cx = vp.width / 2, cy = vp.height * 0.62;
    await page.touchscreen.touchStart(cx + 130, cy);
    for (let f = 1; f <= 12; f++) await page.touchscreen.touchMove(cx + 130 - f * 22, cy);
    await page.touchscreen.touchEnd();
    await sleep(1600);
    const afterX = await geom(page);
    console.log(`after SIDEWAYS swipe → scroll=${JSON.stringify(afterX.scroll)} named="${afterX.title}" stillMounted=${afterX.scrollerPresent}`);
    await page.screenshot({ path: path.join(OUT, 'mobile-after-sideways.png') });

    // Gesture B: swipe up — what a visitor does by reflex on a phone.
    await page.touchscreen.touchStart(cx, cy);
    for (let f = 1; f <= 12; f++) await page.touchscreen.touchMove(cx, cy - f * 22);
    await page.touchscreen.touchEnd();
    await sleep(1800);
    const afterY = await geom(page);
    console.log(`after UPWARD  swipe → scroll=${JSON.stringify(afterY.scroll)} named="${afterY.title}" stillMounted=${afterY.scrollerPresent} docScrollY=${afterY.docScrollY} url=${page.url()}`);
    await page.screenshot({ path: path.join(OUT, 'mobile-after-upward.png') });
  }

  await page.close();
  await ctx.close();
}

await browser.close();
fs.rmSync(PROFILE, { recursive: true, force: true });
