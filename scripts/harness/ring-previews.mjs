/**
 * NEW-2 - how many previews are readable, and where they sit on the ring.
 *
 *   BASE=http://localhost:3113 node scripts/harness/ring-previews.mjs
 *
 * The complaint is that the preview windows are "washed out and clustered in the lower-left
 * instead of spread on an even arc, and their opacity nearly erases them". Those are three
 * separate measurable things and they have different causes, so they are measured
 * separately:
 *
 *   count      - windows whose EFFECTIVE opacity (the group's, times the photo's own) is
 *                high enough to read as a picture. The owner's ruling is 3-4 on desktop and
 *                2 in portrait, with a counter saying how many of the twelve are in view.
 *   opacity    - the effective opacity of each, in ring order. A window at 0.24 is the
 *                "nearly erases them" complaint stated as a number.
 *   spread     - the angular gap between neighbouring windows, and the fan's own two half
 *                angles. Windows are evenly spaced in arc BY CONSTRUCTION, so "clustered"
 *                cannot be about the spacing - it is about the fan being clamped to a short,
 *                lopsided arc, which is what fanUp/fanDown report.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3113';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'ring-previews');
const SETTLE = Number(process.env.SETTLE || 13000);
/** Below this a preview is a ghost rather than a picture. */
const READABLE = Number(process.env.READABLE || 0.5);
fs.mkdirSync(OUT, { recursive: true });

const CASES = [
  { name: 'en-desktop', pre: '', vp: { width: 1440, height: 900 } },
  { name: 'he-desktop', pre: '/he', vp: { width: 1440, height: 900 } },
  { name: 'ru-desktop', pre: '/ru', vp: { width: 1440, height: 900 } },
  { name: 'en-mobile', pre: '', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } },
  { name: 'he-mobile', pre: '/he', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } },
  { name: 'ru-mobile', pre: '/ru', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } },
];

const measure = (readable) => {
  const svg = document.querySelector('svg[data-ring]');
  if (!svg) return { error: 'ring probe off - open with ?ringprobe=1' };
  const m = JSON.parse(svg.dataset.ring);
  const groups = [...svg.querySelectorAll('g[aria-hidden]')];
  const shown = [];
  groups.forEach((g, i) => {
    if (g.style.display === 'none') return;
    const go = Number(g.style.opacity || '1');
    const img = g.querySelector('image.ring-photo');
    const mark = g.querySelector('text.ring-mark');
    // What the eye gets: the group's opacity times the picture's own.
    const own = img ? Number(img.style.opacity || '1') : 1;
    const r = (img || mark || g).getBoundingClientRect();
    shown.push({
      i,
      kind: img ? 'photo' : mark ? 'mark' : 'empty',
      effective: +(go * own).toFixed(3),
      cx: Math.round(r.x + r.width / 2),
      cy: Math.round(r.y + r.height / 2),
    });
  });
  const readableOnes = shown.filter((s) => s.effective >= readable);
  // Angular position of each shown window about the planet's projected centre, so "evenly
  // spread on an arc" is a number rather than an impression.
  const ang = shown.map((s) => (Math.atan2(s.cy - m.cy, s.cx - m.cx) * 180) / Math.PI).sort((a, b) => a - b);
  const gaps = ang.slice(1).map((a, k) => +(a - ang[k]).toFixed(1));
  const counter = document.querySelector('[data-ring-count]');
  return {
    totalCards: document.querySelectorAll('[data-window]').length,
    drawn: shown.length,
    readable: readableOnes.length,
    effectives: shown.map((s) => s.effective),
    kinds: shown.map((s) => s.kind),
    anglesDeg: ang.map((a) => +a.toFixed(1)),
    gapsDeg: gaps,
    fanUpDeg: +((m.fanUp * 180) / Math.PI).toFixed(1),
    fanDownDeg: +((m.fanDown * 180) / Math.PI).toFixed(1),
    pitchPx: Math.round(m.rMid * 0 + 0) || undefined,
    counterText: counter ? (counter.textContent || '').trim() : null,
  };
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 240000,
  userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'ring-prev-')),
  args: [
    '--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars',
    '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage',
  ],
});

const report = {};
for (const c of CASES) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ deviceScaleFactor: 1, ...c.vp });
  await page.goto(`${BASE}${c.pre}/projects?ringprobe=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, SETTLE));
  report[c.name] = await page.evaluate(measure, READABLE);
  await page.screenshot({ path: path.join(OUT, `${c.name}.png`) });
  await page.close();
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

let fails = 0;
for (const [k, v] of Object.entries(report)) {
  if (v.error) { console.log(`${k.padEnd(11)} ERROR ${v.error}`); fails++; continue; }
  const portrait = k.endsWith('mobile');
  const want = portrait ? 2 : 3;
  const ok = v.readable >= want && v.counterText !== null;
  if (!ok) fails++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${k.padEnd(11)} readable ${v.readable}/${v.drawn} of ${v.totalCards} (want >=${want}) ` +
    `eff [${v.effectives.join(', ')}] fan ${v.fanUpDeg}/${v.fanDownDeg}deg ` +
    `gaps [${v.gapsDeg.join(', ')}] counter=${v.counterText === null ? 'MISSING' : `"${v.counterText}"`}`
  );
}
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILING`);
process.exit(fails === 0 ? 0 : 1);
