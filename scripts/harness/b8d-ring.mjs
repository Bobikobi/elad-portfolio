/**
 * B8d harness - windows as previews in the planet's ring plane, words on the planet.
 *
 *   BASE=<alias> BYPASS=<token> node scripts/harness/b8d-ring.mjs
 *
 * Measures, per locale and viewport:
 *  - co-planarity: the window ring's inner boundary against the planet's own ring edge,
 *    as two ellipses - semi-axis ratio and major-axis direction;
 *  - the navbar clamp, across a full scroll sweep rather than at rest, because the defect
 *    it fixes only appeared while scrolling;
 *  - that no text is painted inside a window and that all of it is still in the DOM;
 *  - the panel: that it names the centred project with no pointer, follows a hover, and
 *    stays clear of the navbar and the viewport;
 *  - the header's reserved zone against the windows' boxes.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3112';
const BYPASS = process.env.BYPASS || '';
const CHROME = process.env.CHROME || '/snap/bin/chromium';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'b8d');
const SETTLE = Number(process.env.SETTLE || 13000);
fs.mkdirSync(OUT, { recursive: true });

const CASES = [
  { name: 'he-desktop', pre: '', vp: { width: 1440, height: 900 } },
  { name: 'en-desktop', pre: '/en', vp: { width: 1440, height: 900 } },
  { name: 'ru-desktop', pre: '/ru', vp: { width: 1440, height: 900 } },
  { name: 'he-laptop', pre: '', vp: { width: 1280, height: 800 } },
  { name: 'he-mobile', pre: '', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } },
  { name: 'en-mobile', pre: '/en', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } },
  { name: 'ru-mobile', pre: '/ru', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } },
];

const measure = () => {
  const svg = document.querySelector('svg[data-ring]');
  if (!svg) return { error: 'ring layer did not run' };
  const m = JSON.parse(svg.dataset.ring);
  const nav = document.querySelector('nav').getBoundingClientRect();
  const cards = [...document.querySelectorAll('[data-window]')];
  const shapes = () => [...svg.querySelectorAll('path.ring-window')].filter((p) => p.getAttribute('d'));

  // Co-planarity. The window ring's inner boundary is a circle of radius r0 in canonical
  // space; the planet's own rings end at `ringOuter` planet-radii in the SAME space. Both
  // therefore go through one matrix, so if the matrix is the plane's projection the two
  // are concentric ellipses by construction - and what is worth measuring is whether the
  // matrix really is that, i.e. whether it matches the basis the rig published.
  const pl = m.plane;
  const lu = Math.hypot(pl.ux, pl.uy);
  const planeMajorDeg = (Math.atan2(pl.uy, pl.ux) * 180) / Math.PI;
  const g = svg.querySelector('g');
  const tf = g ? new DOMMatrix(getComputedStyle(g).transform === 'none' ? undefined : getComputedStyle(g).transform) : null;
  const ringMajorDeg = tf ? (Math.atan2(tf.b, tf.a) * 180) / Math.PI : null;
  const ringAxisRatio = tf ? Math.hypot(tf.c, tf.d) / Math.hypot(tf.a, tf.b) : null;

  // No painted text inside a window, but all of it still in the DOM.
  const painted = cards.filter((c) => {
    const r = c.getBoundingClientRect();
    const cs = getComputedStyle(c);
    return r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.clip === 'auto';
  }).length;
  const inDom = cards.filter((c) => (c.textContent || '').trim().length > 20).length;

  return {
    plane: m.plane ? true : false,
    usingPlane: !!m.plane && Math.abs((ringAxisRatio ?? 1) - pl.axisRatio) < 0.02,
    planeAxisRatio: +pl.axisRatio.toFixed(3),
    ringAxisRatio: ringAxisRatio === null ? null : +ringAxisRatio.toFixed(3),
    planeMajorDeg: +planeMajorDeg.toFixed(2),
    ringMajorDeg: ringMajorDeg === null ? null : +ringMajorDeg.toFixed(2),
    lu: +lu.toFixed(1),
    fanUpDeg: +((m.fanUp * 180) / Math.PI).toFixed(1),
    fanDownDeg: +((m.fanDown * 180) / Math.PI).toFixed(1),
    navBottom: Math.round(nav.bottom),
    cards: cards.length,
    paintedTextBoxes: painted,
    cardsWithCopyInDom: inDom,
    visibleWindows: shapes().length,
  };
};

const sweep = () => {
  const list = document.querySelector('.ring-scroll');
  const svg = document.querySelector('svg[data-ring]');
  const nav = document.querySelector('nav').getBoundingClientRect();
  const header = document.querySelector('header');
  const hb = header ? header.getBoundingClientRect() : null;
  const span = list.scrollHeight - list.clientHeight;
  let minTop = Infinity, maxBottom = -Infinity, minWindows = 99, headerHits = 0;
  const steps = 24;
  return (async () => {
    for (let s = 0; s <= steps; s++) {
      list.scrollTop = (span * s) / steps;
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));
      const vis = [...svg.querySelectorAll('path.ring-window')].filter(
        (p) => p.getAttribute('d') && Number(p.getAttribute('opacity') ?? 1) > 0.05
      );
      minWindows = Math.min(minWindows, vis.length);
      for (const p of vis) {
        const r = p.getBoundingClientRect();
        minTop = Math.min(minTop, r.top);
        maxBottom = Math.max(maxBottom, r.bottom);
        if (hb && r.right > hb.left && r.left < hb.right && r.bottom > hb.top && r.top < hb.bottom) headerHits++;
      }
    }
    list.scrollTop = 0;
    await new Promise((r) => requestAnimationFrame(r));
    return {
      minWindowTop: Math.round(minTop),
      maxWindowBottom: Math.round(maxBottom),
      navBottom: Math.round(nav.bottom),
      clearsNavbar: minTop >= nav.bottom + 8,
      insideViewport: maxBottom <= window.innerHeight,
      minWindowsDuringSweep: minWindows,
      headerOverlaps: headerHits,
      headerWidth: hb ? Math.round(hb.width) : null,
      span: Math.round(span),
    };
  })();
};

const panelCheck = () => {
  const t = document.querySelector('[data-panel-title]');
  const panel = t.parentElement;
  const r = panel.getBoundingClientRect();
  const nav = document.querySelector('nav').getBoundingClientRect();
  return {
    text: (t.textContent || '').slice(0, 40),
    hasText: (t.textContent || '').trim().length > 0,
    opacity: getComputedStyle(panel).opacity,
    clearsNavbar: r.top >= nav.bottom,
    insideViewport: r.left >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight,
  };
};

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

const report = {};
for (const c of CASES) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  if (BYPASS) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': BYPASS });
  await page.setViewport({ deviceScaleFactor: 1, ...c.vp });
  await page.goto(`${BASE}${c.pre}/projects?ringprobe=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, SETTLE));
  const base = await page.evaluate(measure);
  const swept = base.error ? null : await page.evaluate(sweep);
  const panelIdle = base.error ? null : await page.evaluate(panelCheck);
  await page.screenshot({ path: path.join(OUT, `${c.name}.png`) });

  // Hover the middle visible window and check the panel follows it.
  let panelHover = null;
  if (!base.error) {
    const box = await page.evaluate(() => {
      const vis = [...document.querySelectorAll('svg[data-ring] path.ring-window')].filter((p) => p.getAttribute('d'));
      if (!vis.length) return null;
      const r = vis[Math.floor(vis.length / 2)].getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    if (box) {
      await page.mouse.move(box.x, box.y);
      await new Promise((r) => setTimeout(r, 600));
      panelHover = await page.evaluate(panelCheck);
      await page.screenshot({ path: path.join(OUT, `${c.name}-hover.png`) });
    }
  }
  report[c.name] = { ...base, sweep: swept, panelIdle, panelHover };
  await page.close();
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

for (const [k, v] of Object.entries(report)) {
  if (v.error) { console.log(`${k.padEnd(12)} ERROR ${v.error}`); continue; }
  console.log(
    `${k.padEnd(12)} plane=${v.usingPlane} axis=${v.ringAxisRatio}/${v.planeAxisRatio} ` +
    `major=${v.ringMajorDeg}/${v.planeMajorDeg} fan=${v.fanUpDeg}/${v.fanDownDeg} ` +
    `win>=${v.sweep.minWindowsDuringSweep} top=${v.sweep.minWindowTop}>nav${v.sweep.navBottom}=${v.sweep.clearsNavbar} ` +
    `hdrHits=${v.sweep.headerOverlaps} painted=${v.paintedTextBoxes} inDom=${v.cardsWithCopyInDom} ` +
    `panel="${v.panelIdle.text}"->"${v.panelHover ? v.panelHover.text : '-'}"`
  );
}
