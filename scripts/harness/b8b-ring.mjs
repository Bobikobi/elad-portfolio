/**
 * B8b harness - measures the /projects annular-sector windows and captures the
 * screenshots. Output is gitignored.
 *
 *   BASE=http://localhost:3111 node scripts/harness/b8b-ring.mjs
 *   BASE=<preview alias> BYPASS=<token> node scripts/harness/b8b-ring.mjs
 *
 * Notes that cost time to learn, so they are written down:
 *  - `?ringprobe=1` makes the ring layer publish the frame it actually used. Without
 *    it there is nothing to assert against except the design constants, which are not
 *    what the shape is built from.
 *  - Each case gets its OWN browser context. A shared profile carries the stored
 *    locale between cases: the Hebrew case then rendered Russian copy with an LTR
 *    camera and RTL windows, which looks exactly like a layout bug and is not one.
 *  - A content box is ROTATED, so its getBoundingClientRect is not its corners. The
 *    corners come from the element's own transform matrix.
 *  - networkidle2 never fires here (the scene holds connections open); the settle is
 *    a wall-clock wait, long enough for the entry flight to finish.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3111';
const BYPASS = process.env.BYPASS || '';
const CHROME = process.env.CHROME || '/snap/bin/chromium';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'b8b');
const SETTLE = Number(process.env.SETTLE || 9000);
fs.mkdirSync(OUT, { recursive: true });

const q = (p) => `${BASE}${p}?ringprobe=1`;
const CASES = [
  { name: 'he-desktop', url: q('/projects'), vp: { width: 1440, height: 900 } },
  { name: 'en-desktop', url: q('/en/projects'), vp: { width: 1440, height: 900 } },
  { name: 'ru-desktop', url: q('/ru/projects'), vp: { width: 1440, height: 900 } },
  { name: 'he-laptop', url: q('/projects'), vp: { width: 1280, height: 800 } },
  { name: 'he-mobile', url: q('/projects'), vp: { width: 390, height: 844, isMobile: true, hasTouch: true } },
  { name: 'en-mobile', url: q('/en/projects'), vp: { width: 390, height: 844, isMobile: true, hasTouch: true } },
];

/** Runs in the page. Everything is measured off the rendered DOM, not recomputed. */
const measure = () => {
  const svg = document.querySelector('svg[data-ring]');
  if (!svg) return { error: 'no ring probe data - the layer did not run' };
  const m = JSON.parse(svg.dataset.ring);
  const bodies = [...svg.querySelectorAll('path.ring-window')].filter((p) => p.getAttribute('d'));
  const accents = [...svg.querySelectorAll('path.ring-accent')].filter((p) => p.getAttribute('d'));
  const cards = [...document.querySelectorAll('[data-window]')].filter(
    (c) => getComputedStyle(c).visibility !== 'hidden'
  );
  const dist = (x, y) => Math.hypot(x - m.cx, y - m.cy);

  // (1) constant gap - every sampled point of every inner arc against the limb.
  const gaps = [];
  for (const a of accents) {
    const L = a.getTotalLength();
    for (let i = 0; i <= 20; i++) {
      const p = a.getPointAtLength((L * i) / 20);
      gaps.push(dist(p.x, p.y) - m.R);
    }
  }

  // Walk a path once and hand back its commands as [cmd, startPoint, endPoint].
  const segs = (d) => {
    const out = [];
    let cur = null;
    for (const c of d.match(/[MLQAZ][^MLQAZ]*/g) || []) {
      const nums = (c.slice(1).match(/-?\d+(\.\d+)?/g) || []).map(Number);
      const end = nums.length >= 2 ? [nums[nums.length - 2], nums[nums.length - 1]] : null;
      if (cur && end) out.push([c[0], cur, end]);
      if (end) cur = end;
    }
    return out;
  };

  // (2) radial edges - extend each straight edge and measure how far the infinite
  //     line passes from the planet centre.
  const radial = [];
  // (3) outer edge - sagitta of the arc that runs at r1.
  const sagitta = [];
  for (const b of bodies) {
    for (const [cmd, p, qq] of segs(b.getAttribute('d'))) {
      if (cmd === 'L') {
        const dx = qq[0] - p[0];
        const dy = qq[1] - p[1];
        const len = Math.hypot(dx, dy) || 1;
        const off = Math.abs(dx * (p[1] - m.cy) - dy * (p[0] - m.cx)) / len;
        radial.push((off / m.R) * 100);
      } else if (cmd === 'A' && Math.abs(dist(p[0], p[1]) - m.r1) < 2) {
        const mx = (p[0] + qq[0]) / 2;
        const my = (p[1] + qq[1]) / 2;
        sagitta.push(m.r1 - (dist(mx, my) || 1));
      }
    }
  }

  // (5) text inside the shape - the four real corners plus the centre of each box.
  const deck = document.querySelector('.ring-scroll > div');
  const org = deck.getBoundingClientRect();
  const inside = [];
  cards.forEach((card, i) => {
    const body = bodies[i];
    if (!body) return;
    const mtx = new DOMMatrix(getComputedStyle(card).transform);
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    const corner = (x, y) => {
      const p = mtx.transformPoint(new DOMPoint(x, y));
      return [org.left + p.x, org.top + p.y];
    };
    const pts = [corner(0, 0), corner(w, 0), corner(w, h), corner(0, h), corner(w / 2, h / 2)];
    const pt = svg.createSVGPoint();
    inside.push({
      ok: pts.every(([x, y]) => { pt.x = x; pt.y = y; return body.isPointInFill(pt); }),
      overflowY: card.scrollHeight - card.clientHeight,
      overflowX: card.scrollWidth - card.clientWidth,
      clipped: [...card.querySelectorAll('h2,p,li')].some((e) => e.scrollWidth - e.clientWidth > 1),
    });
  });

  const stat = (arr) => (arr.length
    ? { min: +Math.min(...arr).toFixed(2), max: +Math.max(...arr).toFixed(2),
        spread: +(Math.max(...arr) - Math.min(...arr)).toFixed(2), n: arr.length }
    : null);

  return {
    frame: m,
    visibleWindows: bodies.length,
    gap: stat(gaps),
    radialWorstPctOfR: +Math.max(...radial).toFixed(3),
    radialEdges: radial.length,
    sagitta: stat(sagitta),
    contentInside: inside,
  };
};

/** Scrolls the ring for ~1.2s and reports the frame interval distribution. */
const scrollFrames = (page) => page.evaluate(async () => {
  const list = document.querySelector('.ring-scroll');
  if (!list) return null;
  const frames = [];
  let stop = false;
  const tick = (t) => { frames.push(t); if (!stop) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const start = performance.now();
  while (performance.now() - start < 1200) {
    list.scrollTop += 6;
    await new Promise((r) => requestAnimationFrame(r));
  }
  stop = true;
  const dts = frames.slice(1).map((t, i) => t - frames[i]).sort((a, b) => a - b);
  return {
    frames: frames.length,
    medianMs: +dts[Math.floor(dts.length / 2)].toFixed(2),
    p95Ms: +dts[Math.floor(dts.length * 0.95)].toFixed(2),
    scrolled: list.scrollTop,
  };
});

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: [
    '--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars',
    '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
    '--disable-dev-shm-usage', '--user-agent-suffix=elad-harness',
  ],
});

const report = {};
for (const c of CASES) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  if (BYPASS) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': BYPASS });
  await page.setViewport({ deviceScaleFactor: 1, ...c.vp });
  await page.goto(c.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, SETTLE));
  try { await page.waitForSelector('svg[data-ring]', { timeout: 15000 }); } catch { /* reported below */ }
  await new Promise((r) => setTimeout(r, 1500));
  report[c.name] = await page.evaluate(measure);
  await page.screenshot({ path: path.join(OUT, `${c.name}.png`) });
  report[c.name].scrollFps = await scrollFrames(page);
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(OUT, `${c.name}-scrolled.png`) });
  report[c.name].afterScroll = await page.evaluate(measure);
  await page.close();
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
for (const [k, v] of Object.entries(report)) {
  if (v.error) { console.log(k, 'ERROR', v.error); continue; }
  console.log(
    `${k.padEnd(12)} windows=${v.visibleWindows} R=${v.frame.R.toFixed(1)} ` +
    `gapSpread=${v.gap.spread} radialWorst=${v.radialWorstPctOfR}% ` +
    `sagitta=${v.sagitta.min} inside=${v.contentInside.map((c) => c.ok).join(',')} ` +
    `rebuild=${v.frame.costMs}ms`
  );
}
