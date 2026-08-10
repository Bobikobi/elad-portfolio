/**
 * NEW-4 + BUG-3 acceptance.
 *
 *   BASE=http://localhost:3113 node scripts/harness/projects-hover-back.mjs
 *
 * NEW-4, the owner's ruling: no card ever shows text unless the visitor is pointing at it.
 *   idle     - loaded, no pointer moved, no tap: ZERO project text anywhere;
 *   hover    - one pointer move onto a preview: EXACTLY ONE floating text, naming that one;
 *   away     - pointer off the ring: back to zero;
 *   focus    - keyboard focus behaves as hover;
 *   tap      - on a touch viewport, first tap opens the words, tapping the same preview
 *              again closes them, and tapping away closes them.
 *
 * BUG-3: the back control is ONE control on every world and locale - same tag, same icon,
 * no arrow glyph in the copy, and the icon mirrors with the reading direction.
 *
 * "Idle" is taken seriously here: the page is loaded and NOTHING touches the mouse before
 * the reading. Puppeteer's pointer starts at (0,0) and stays there, which is what the
 * external verification's screenshot did.
 */
import puppeteer from 'puppeteer-core';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3113';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'hover-back');
const SETTLE = Number(process.env.SETTLE || 13000);
fs.mkdirSync(OUT, { recursive: true });

const LOCALES = [
  { name: 'en', pre: '' },
  { name: 'he', pre: '/he' },
  { name: 'ru', pre: '/ru' },
];
const VIEWPORTS = [
  { name: 'desktop', vp: { width: 1440, height: 900 } },
  { name: 'mobile', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } },
];
/** The five worlds. Projects draws its own stage; the other four share PlanetWorld. */
const WORLDS = ['/about', '/services', '/projects', '/technologies', '/contact'];

/** Every scrap of project text the panel could be showing, and how much of it is visible. */
const panelState = () => {
  const t = document.querySelector('[data-panel-title]');
  if (!t) return { error: 'no panel' };
  const panel = t.parentElement;
  const text = (t.textContent || '').trim();
  const cs = getComputedStyle(panel);
  const shown = text.length > 0 && Number(cs.opacity) > 0.02;
  // How much of the words is laid over the pictures. On a phone this used to be ~75%, which
  // is both the clutter Elad reported and the reason a second tap could not reach the
  // preview underneath.
  const pr = panel.getBoundingClientRect();
  const lr = document.querySelector('.ring-scroll').getBoundingClientRect();
  const ov =
    Math.max(0, Math.min(pr.bottom, lr.bottom) - Math.max(pr.top, lr.top)) *
    Math.max(0, Math.min(pr.right, lr.right) - Math.max(pr.left, lr.left));
  return {
    title: text,
    opacity: +Number(cs.opacity).toFixed(3),
    pointerEvents: cs.pointerEvents,
    fanOverlapPct: shown && pr.width * pr.height > 0 ? +((100 * ov) / (pr.width * pr.height)).toFixed(1) : 0,
    // The acceptance number: how many project texts are on the screen right now.
    visibleTexts: shown ? 1 : 0,
  };
};

/** A point genuinely on a preview sector, well inside it. Same approach as b8d-ring. */
const pickHoverPoint = () => {
  const vis = [...document.querySelectorAll('svg.ring-layer path.ring-window')].filter((p) => {
    const r = p.getBoundingClientRect();
    return p.getAttribute('d') && r.width > 4 && r.height > 4;
  });
  if (!vis.length) return null;
  const p = vis[Math.floor(vis.length / 2)];
  const r = p.getBoundingClientRect();
  const on = (x, y) => document.elementsFromPoint(x, y).some((el) => el.parentElement === p.parentElement);
  for (let a = 1; a < 8; a++) {
    for (let b = 1; b < 8; b++) {
      const x = r.left + (r.width * a) / 8;
      const y = r.top + (r.height * b) / 8;
      if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) continue;
      if (on(x, y) && on(x - 8, y) && on(x + 8, y) && on(x, y - 8) && on(x, y + 8)) return { x, y };
    }
  }
  return null;
};

/**
 * A tap, dispatched in the page.
 *
 * NOT `page.touchscreen.tap`: against this page CDP's `Input.dispatchTouchEvent` hangs until
 * the protocol timeout - the renderer is running a 60Hz rAF over a live WebGL canvas and the
 * call never returns. (`page.tap` is not it either; that one takes a SELECTOR, and passing it
 * coordinates throws.) These are the two events the stage actually listens for, carrying the
 * pointerType it branches on, so the code path under test is the real one; what this cannot
 * prove is anything about native gesture handling, which is not what NEW-4 is about.
 */
const tapAt = (page, x, y) =>
  page.evaluate(
    ([px, py]) => {
      const el = document.elementFromPoint(px, py);
      if (!el) return { hit: null };
      const base = { clientX: px, clientY: py, bubbles: true, cancelable: true, composed: true };
      el.dispatchEvent(new PointerEvent('pointerdown', { ...base, pointerType: 'touch', isPrimary: true }));
      el.dispatchEvent(new PointerEvent('pointerup', { ...base, pointerType: 'touch', isPrimary: true }));
      el.dispatchEvent(new MouseEvent('click', base));
      // WHAT was tapped, recorded rather than assumed. A tap that lands on something other
      // than the scroll container never reaches the stage's click handler at all, and the
      // reading that follows says "nothing happened" without saying why.
      return {
        hit: `${el.tagName}.${(typeof el.className === 'string' ? el.className : el.className?.baseVal) || ''}`.slice(0, 60),
        insideRing: !!el.closest('.ring-scroll'),
        insidePanel: !!el.closest('[data-visit-label]'),
      };
    },
    [Math.round(x), Math.round(y)]
  );

/** Which preview is under a viewport point, or -1. The planet DRIFTS and the ring is
 *  damped, so a point chosen a second ago may be over its neighbour by the time the second
 *  tap lands - and a second tap on a DIFFERENT preview correctly opens that one instead of
 *  closing this one, which is a pass being read as a failure. */
const windowIndexAt = (page, x, y) =>
  page.evaluate(
    ([px, py]) => {
      const paths = [...document.querySelectorAll('svg.ring-layer path.ring-window')];
      for (const el of document.elementsFromPoint(px, py)) {
        const k = paths.findIndex((q) => q.parentElement === el || q.parentElement === el.parentElement);
        if (k >= 0) return k;
      }
      return -1;
    },
    [Math.round(x), Math.round(y)]
  );

/**
 * Contrast of the card's own text against whatever is behind it, measured off the rendered
 * pixels rather than off the declared colours - the point of the criterion is the planet
 * underneath, and a stylesheet cannot tell you what that is.
 *
 * Two things here are deliberate, and the first version got both wrong.
 *
 * The crop is the TEXT's own extent, taken from a Range, not the title element's box. The
 * element is as wide as the panel, so a short title leaves it mostly empty - and a Hebrew
 * title is short. Measured that way, he-mobile came out at 3.2 while en-mobile read 5.8 on
 * the same design: the quantile standing in for "glyph" had simply landed in empty space.
 * That was the estimator failing, not the page.
 *
 * The background is measured from a SECOND capture with the text hidden, so it is the real
 * planet-and-well behind the glyphs rather than a quantile hoping to miss them. The glyph is
 * then the bright tail of the text-shown crop. WCAG relative luminance, standard
 * (L1 + 0.05) / (L2 + 0.05).
 */
async function textContrast(page, shotPath, vp) {
  const box = await page.evaluate(() => {
    const t = document.querySelector('[data-panel-title]');
    if (!t || !(t.textContent || '').trim()) return null;
    const range = document.createRange();
    range.selectNodeContents(t);
    const r = range.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return null;
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  });
  if (!box) return null;
  const x = Math.max(0, Math.min(box.x, vp.width - 2));
  const y = Math.max(0, Math.min(box.y, vp.height - 2));
  const w = Math.max(2, Math.min(box.w, vp.width - x));
  const h = Math.max(2, Math.min(box.h, vp.height - y));
  const lin = (c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  const crop = (src, tag) => {
    const raw = path.join(OUT, `title-${tag}.raw`);
    execFileSync('ffmpeg', [
      '-loglevel', 'error', '-y', '-i', src,
      '-vf', `crop=${w}:${h}:${x}:${y}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', raw,
    ]);
    const b = fs.readFileSync(raw);
    fs.unlinkSync(raw);
    const out = [];
    for (let i = 0; i < b.length; i += 3) out.push(0.2126 * lin(b[i]) + 0.7152 * lin(b[i + 1]) + 0.0722 * lin(b[i + 2]));
    return out.sort((a, c) => a - c);
  };

  const withText = crop(shotPath, 'text');
  // The same pixels with the glyphs taken away. `visibility` rather than removing the node,
  // so nothing reflows and the crop still lines up.
  await page.evaluate(() => { document.querySelector('[data-panel-title]').style.visibility = 'hidden'; });
  await new Promise((r) => setTimeout(r, 120));
  const bgShot = path.join(OUT, 'title-bg.png');
  await page.screenshot({ path: bgShot });
  await page.evaluate(() => { document.querySelector('[data-panel-title]').style.visibility = ''; });
  const withoutText = crop(bgShot, 'bg');
  fs.unlinkSync(bgShot);

  // The glyph core is the bright tail of the text capture; the background is the MEDIAN of
  // the same area with the text gone, which is the planet-and-well the criterion is about.
  const glyph = withText[Math.floor(withText.length * 0.97)];
  const back = withoutText[Math.floor(withoutText.length * 0.5)];
  const hiL = Math.max(glyph, back);
  const loL = Math.min(glyph, back);
  return +((hiL + 0.05) / (loL + 0.05)).toFixed(2);
}

/** The back control, described so two worlds can be compared field by field. */
const backControl = () => {
  const a = document.querySelector('[data-world-back]');
  if (!a) return { error: 'no back control' };
  const svg = a.querySelector('svg');
  const text = (a.textContent || '').trim();
  const icon = svg ? svg.getAttribute('class') || svg.innerHTML.slice(0, 120) : null;
  const flip = svg ? getComputedStyle(svg).transform : null;
  return {
    tag: a.tagName,
    text,
    hasSvgIcon: !!svg,
    icon,
    // The copy convention bans arrow characters in text. This is that check.
    arrowGlyphInCopy: /[←-⇿➔-➿⬀-⯿]/.test(text),
    dir: document.documentElement.dir,
    // scaleX(-1) shows up as "matrix(-1, 0, 0, 1, 0, 0)".
    iconMirrored: flip ? flip.startsWith('matrix(-1') : null,
  };
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 240000,
  userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'hover-back-profile-')),
  args: [
    '--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars',
    '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage',
  ],
});

const report = { new4: {}, bug3: {} };

// ---- NEW-4 -----------------------------------------------------------------------------
for (const loc of LOCALES) {
  for (const v of VIEWPORTS) {
    const key = `${loc.name}-${v.name}`;
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ deviceScaleFactor: 1, ...v.vp });
    await page.goto(`${BASE}${loc.pre}/projects`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise((r) => setTimeout(r, SETTLE));

    // IDLE. Nothing has moved the pointer. This is the acceptance screenshot.
    const idle = await page.evaluate(panelState);
    await page.screenshot({ path: path.join(OUT, `${key}-idle.png`) });

    let point = await page.evaluate(pickHoverPoint);
    let hover = null;
    let away = null;
    let tapOn = null;
    let tapAgain = null;
    let tapAway = null;
    const hits = [];
    let contrast = null;

    if (point && !v.vp.hasTouch) {
      await page.mouse.move(point.x, point.y);
      await new Promise((r) => setTimeout(r, 700));
      hover = await page.evaluate(panelState);
      const shot = path.join(OUT, `${key}-hover.png`);
      await page.screenshot({ path: shot });
      // NEW-1's last criterion: the card's text over the planet, at 4.5:1 or better.
      contrast = await textContrast(page, shot, v.vp);
      // Off the ring entirely - the top-left corner is header, not fan.
      await page.mouse.move(4, 4);
      await new Promise((r) => setTimeout(r, 700));
      away = await page.evaluate(panelState);
    }
    if (point && v.vp.hasTouch) {
      // Open, then close with a second tap ON THE SAME PREVIEW. If the ring has drifted the
      // point onto a neighbour between the two taps, the reading is meaningless - the second
      // tap opened that neighbour, exactly as it should - so take a fresh point and start the
      // pair again rather than recording a failure the page did not commit.
      for (let attempt = 0; attempt < 4; attempt++) {
        const before = await windowIndexAt(page, point.x, point.y);
        hits.push(await tapAt(page, point.x, point.y));
        await new Promise((r) => setTimeout(r, 700));
        tapOn = await page.evaluate(panelState);
        if (attempt === 0) {
          const tapShot = path.join(OUT, `${key}-tap.png`);
          await page.screenshot({ path: tapShot });
          // Same NEW-1 criterion on touch, where the card sits over the planet too.
          contrast = await textContrast(page, tapShot, v.vp);
        }
        const between = await windowIndexAt(page, point.x, point.y);
        hits.push(await tapAt(page, point.x, point.y));
        await new Promise((r) => setTimeout(r, 700));
        tapAgain = await page.evaluate(panelState);
        if (before >= 0 && before === between) break;
        // Drifted. Clear whatever is open and re-aim.
        tapAgain = null;
        point = (await page.evaluate(pickHoverPoint)) || point;
      }
      // Re-open, then tap somewhere that is not a preview.
      hits.push(await tapAt(page, point.x, point.y));
      await new Promise((r) => setTimeout(r, 500));
      const off = await page.evaluate(() => {
        const list = document.querySelector('.ring-scroll').getBoundingClientRect();
        // Just inside the scroll container but off the fan: its own top-left corner.
        return { x: Math.round(list.left + 3), y: Math.round(list.top + 3) };
      });
      hits.push(await tapAt(page, off.x, off.y));
      await new Promise((r) => setTimeout(r, 700));
      tapAway = await page.evaluate(panelState);
    }

    // Keyboard focus must behave exactly like hover.
    const focused = await page.evaluate(() => {
      const card = document.querySelector('[data-window]');
      if (!card) return false;
      card.focus();
      return document.activeElement === card;
    });
    await new Promise((r) => setTimeout(r, 700));
    const focus = focused ? await page.evaluate(panelState) : null;

    report.new4[key] = { idle, hover, away, tapOn, tapAgain, tapAway, focus, contrast, hadPoint: !!point, hits };
    await page.close();
    await ctx.close();
  }
}

// ---- BUG-3 -----------------------------------------------------------------------------
for (const loc of LOCALES) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ deviceScaleFactor: 1, width: 1440, height: 900 });
  for (const w of WORLDS) {
    await page.goto(`${BASE}${loc.pre}${w}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 4000));
    report.bug3[`${loc.name}${w}`] = await page.evaluate(backControl);
  }
  await page.close();
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

// ---- verdicts --------------------------------------------------------------------------
let fails = 0;
console.log('NEW-4  no text unless pointed at');
for (const [k, v] of Object.entries(report.new4)) {
  const idleOk = v.idle.visibleTexts === 0;
  const hoverOk = v.hover === null || v.hover.visibleTexts === 1;
  const awayOk = v.away === null || v.away.visibleTexts === 0;
  const tapOk = v.tapOn === null || (v.tapOn.visibleTexts === 1 && v.tapAgain.visibleTexts === 0 && v.tapAway.visibleTexts === 0);
  const focusOk = v.focus === null || v.focus.visibleTexts === 1;
  // The words must not be laid over the previews. A few percent of touching corners is
  // tolerable; three quarters of the panel is what this is here to catch.
  const shownStates = [v.hover, v.tapOn, v.focus].filter((s) => s && s.visibleTexts === 1);
  const worstOverlap = shownStates.length ? Math.max(...shownStates.map((s) => s.fanOverlapPct)) : 0;
  const overlapOk = worstOverlap <= 5;
  // NEW-1: the card's text over the planet must reach 4.5:1. Only measurable where a hover
  // actually put text on screen.
  const contrastOk = v.contrast === null || v.contrast >= 4.5;
  const ok = idleOk && hoverOk && awayOk && tapOk && focusOk && overlapOk && contrastOk;
  if (!ok) fails++;
  console.log(
    `  ${ok ? 'PASS' : 'FAIL'} ${k.padEnd(11)} contrast=${v.contrast ?? '-'} overlap=${worstOverlap}% idle=${v.idle.visibleTexts}("${v.idle.title}") ` +
    `hover=${v.hover ? v.hover.visibleTexts : '-'} away=${v.away ? v.away.visibleTexts : '-'} ` +
    `tap=${v.tapOn ? v.tapOn.visibleTexts : '-'}/again=${v.tapAgain ? v.tapAgain.visibleTexts : '-'}` +
    `/away=${v.tapAway ? v.tapAway.visibleTexts : '-'} focus=${v.focus ? v.focus.visibleTexts : '-'}`
  );
}

console.log('\nBUG-3  one back control everywhere');
const sigs = new Set();
for (const [k, v] of Object.entries(report.bug3)) {
  if (v.error) { console.log(`  FAIL ${k}: ${v.error}`); fails++; continue; }
  const wantMirror = v.dir === 'rtl';
  const ok = v.hasSvgIcon && !v.arrowGlyphInCopy && v.iconMirrored === wantMirror;
  if (!ok) fails++;
  sigs.add(`${v.tag}|${v.hasSvgIcon}|${v.icon}`);
  console.log(
    `  ${ok ? 'PASS' : 'FAIL'} ${k.padEnd(16)} tag=${v.tag} icon=${v.hasSvgIcon} ` +
    `arrowInCopy=${v.arrowGlyphInCopy} dir=${v.dir} mirrored=${v.iconMirrored} text="${v.text}"`
  );
}
const oneControl = sigs.size === 1;
if (!oneControl) fails++;
console.log(`  ${oneControl ? 'PASS' : 'FAIL'} identical control across all worlds and locales (${sigs.size} distinct)`);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILING CHECKS`);
process.exit(fails === 0 ? 0 : 1);
