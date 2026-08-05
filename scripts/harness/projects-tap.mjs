/**
 * PROJECTS-HOVER harness - the two-stage tap on a coarse pointer.
 *
 *   BASE=<alias> BYPASS=<token> node scripts/harness/projects-tap.mjs
 *
 * The gate under test only runs for `pointerType` of 'touch' or 'pen', so a synthesized
 * mouse click would pass every assertion below while never entering it. Every tap here is
 * dispatched through Input.dispatchTouchEvent (puppeteer's touchscreen), and the page
 * records the pointerType it actually observed - a case whose taps did not arrive as
 * 'touch' is reported as an instrument failure, not as a pass.
 *
 * `window.open` is stubbed so "the project would have opened" is observable without
 * losing the page under test.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3112';
const BYPASS = process.env.BYPASS || '';
const CHROME = process.env.CHROME || '/snap/bin/chromium';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'projects-tap');
const SETTLE = Number(process.env.SETTLE || 13000);
fs.mkdirSync(OUT, { recursive: true });

const CASES = [
  { name: 'he-mobile', pre: '', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } },
  { name: 'en-mobile', pre: '/en', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } },
  { name: 'ru-mobile', pre: '/ru', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } },
  { name: 'he-desktop', pre: '', vp: { width: 1440, height: 900 } },
  // A touch pointer on a viewport wide enough to show more than one window. In portrait
  // only ONE window is hit-testable (the standing ruling on window count), so "tap A then
  // tap B" cannot be exercised on a phone at all - it is measured here instead.
  { name: 'he-desktop-touch', pre: '', vp: { width: 1440, height: 900, hasTouch: true } },
];

/** Stub window.open and start recording the pointerType of every press that reaches a
 *  window. Installed after load, so it survives no navigation - none is expected. */
const instrument = () => {
  window.__tap = { opened: [], types: [] };
  window.open = (href) => { window.__tap.opened.push(href); return null; };
  document.addEventListener(
    'pointerdown',
    // The press lands on the scroll container, which is where the stage hit-tests from.
    (e) => { if (e.target.closest?.('.ring-scroll, svg[data-ring]')) window.__tap.types.push(e.pointerType); },
    true
  );
};

/** Indices of the windows currently drawn, with a point that is genuinely ON the sector -
 *  the bbox centre of an annular sector can fall in the hole. */
const targets = () => {
  const svg = document.querySelector('svg[data-ring]');
  if (!svg) return { error: 'ring layer did not run' };
  const paths = [...svg.querySelectorAll('path.ring-window')];
  const out = [];
  paths.forEach((p, i) => {
    if (!p.getAttribute('d')) return;
    const r = p.getBoundingClientRect();
    if (!r.width || !r.height) return;
    for (let a = 1; a < 8; a++) {
      for (let b = 1; b < 8; b++) {
        const x = r.left + (r.width * a) / 8;
        const y = r.top + (r.height * b) / 8;
        if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) continue;
        // elementFROMPoint returns only the TOP element, which over the fan is always the
        // scroll container - `parentElement.contains(p)` was true for it too, because the
        // container and the svg share the layer wrapper. Ask for the whole stack and
        // require a sibling of the body path: the photo, body, accent and monogram are the
        // only things that live in a window's own <g>.
        // The point must be WELL inside the sector, not just inside it: the planet drifts
        // continuously, so a point on the edge can be off the shape by the time the press
        // lands - which reads as "the gate refused to open it" when it was a press on empty
        // space. Require the point and its four neighbours at 8px.
        const on = (px, py) =>
          document.elementsFromPoint(px, py).some((el) => el.parentElement === p.parentElement);
        if (on(x, y) && on(x - 8, y) && on(x + 8, y) && on(x, y - 8) && on(x, y + 8)) {
          const card = document.querySelectorAll('[data-window]')[i];
          out.push({ i, x, y, title: card?.dataset.title ?? null, href: card?.dataset.href ?? null });
          return;
        }
      }
    }
  });
  return { hits: out };
};

const state = () => ({
  // Inlined rather than called: each evaluate() runs in its own scope, so a helper
  // defined beside it in this file does not exist in the page.
  panel: (() => {
    const el = document.querySelector('[data-panel-title]');
    if (!el) return null;
    // An invisible panel is not describing anything, whatever text it still holds.
    const box = el.closest('div[style]');
    if (box && Number(getComputedStyle(box).opacity) < 0.5) return '';
    return el.textContent.trim();
  })(),
  opened: [...window.__tap.opened],
  types: [...new Set(window.__tap.types)],
  href: location.href,
});

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

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const report = {};

for (const c of CASES) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  if (BYPASS) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': BYPASS });
  await page.setViewport({ deviceScaleFactor: 1, ...c.vp });
  await page.goto(`${BASE}${c.pre}/projects?ringprobe=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  // Wait for the layer to say it has laid out, not for a timer - a sample taken before
  // hydration reads a page where nothing under test has run yet.
  await page.waitForFunction(() => document.querySelector('.ring-scroll')?.dataset.ready === '1', { timeout: 60000 })
    .catch(() => {});
  await wait(SETTLE);
  await page.evaluate(instrument);

  const t = await page.evaluate(targets);
  if (t.error || !t.hits?.length) {
    report[c.name] = { error: t.error || 'no window was hit-testable' };
    await page.close(); await ctx.close();
    continue;
  }
  const touch = !c.vp.hasTouch ? null : page.touchscreen;
  const A = t.hits[0];
  const B = t.hits[t.hits.length - 1];
  const idle = await page.evaluate(state);

  const press = async (p) => {
    // Which window is under the point AT THE MOMENT OF THE PRESS. The planet has a live
    // micro-drift, so a point measured a few seconds ago can be off the sector by now -
    // and "nothing opened" would then read as a refusal by the gate when it was really a
    // press on empty space. Recorded so the two are never confused.
    const under = await page.evaluate(([x, y]) => {
      const svg = document.querySelector('svg[data-ring]');
      const paths = [...svg.querySelectorAll('path.ring-window')];
      const stack = document.elementsFromPoint(x, y);
      for (const el of stack) {
        const k = paths.findIndex((q) => q.parentElement === el.parentElement || q.parentElement === el);
        if (k >= 0) return k;
      }
      return -1;
    }, [p.x, p.y]);
    if (touch) await touch.tap(p.x, p.y);
    else await page.mouse.click(p.x, p.y);
    await wait(700);
    return { ...(await page.evaluate(state)), under };
  };

  // Desktop: the hover must reach the window before anything is clicked. This is the check
  // that would have caught the covering scroll container - the panel was empty here.
  let hover = null;
  if (!touch) {
    await page.mouse.move(A.x, A.y);
    await wait(600);
    hover = await page.evaluate(state);
  }
  const first = await press(A);
  const second = await press(A);
  // A fresh page for the "two different windows" case, so the arming from above cannot
  // carry into it.
  await page.evaluate(() => { window.__tap.opened.length = 0; });
  const other = t.hits.length > 1 ? await press(B) : null;

  // Swiping the fan gives up the armed window: the panel returns to the centred one.
  await page.evaluate(() => {
    const list = document.querySelector('.ring-scroll');
    if (!list) return;
    if (getComputedStyle(list).direction === 'rtl' && list.scrollWidth > list.clientWidth) list.scrollLeft -= 260;
    else if (list.scrollWidth > list.clientWidth) list.scrollLeft += 260;
    else list.scrollTop += 260;
  });
  await wait(900);
  const afterScroll = await page.evaluate(state);

  await page.screenshot({ path: path.join(OUT, `${c.name}.png`) });
  report[c.name] = {
    touch: Boolean(touch),
    windowsHit: t.hits.length,
    a: { i: A.i, title: A.title, href: A.href },
    b: { i: B.i, title: B.title, href: B.href },
    idle, hover, first, second, other, afterScroll,
    // The instrument check. Every assertion above is void if this is not what we think.
    pointerTypes: second.types,
  };
  await page.close();
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

let bad = 0;
for (const [k, v] of Object.entries(report)) {
  if (v.error) { console.log(`${k.padEnd(11)} ERROR ${v.error}`); bad++; continue; }
  const want = v.touch ? 'touch' : 'mouse';
  const instrumentOk = v.pointerTypes.length === 1 && v.pointerTypes[0] === want;
  const armed = v.touch
    ? v.first.opened.length === 0 && v.first.panel === v.a.title
    : v.first.opened.length === 1;
  const hovers = v.touch || (v.hover && v.hover.panel === v.a.title);
  const enters = v.touch ? v.second.opened.length === 1 : true;
  const switchable = v.other && v.touch && v.a.i !== v.b.i;
  const switched = !switchable ? 'n/a' : v.other.opened.length === 0 && v.other.panel === v.b.title;
  const released = !v.touch || v.afterScroll.panel !== null;
  if (!instrumentOk || !armed || !enters || switched === false || !released || !hovers) bad++;
  console.log(
    `${k.padEnd(11)} ptr=${v.pointerTypes.join(',')}${instrumentOk ? '' : ' !INSTRUMENT'} ` +
    `hover=${hovers} arm=${armed} enter=${enters} switch=${switched} release=${released} ` +
    `panel "${v.idle.panel}" -> "${v.first.panel}" opened=${JSON.stringify(v.second.opened)}`
  );
}
// A harness that prints a failure and exits 0 is a gate that accepts anything (#26).
if (bad) process.exitCode = 1;
