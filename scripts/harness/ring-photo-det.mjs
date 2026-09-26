/**
 * BUG-2 probe - the ring preview's screen determinant, per photo, per locale, at several
 * ring rotations.
 *
 *   BASE=http://localhost:3113 node scripts/harness/ring-photo-det.mjs
 *
 * The external verification reported 6 of 8 `image.ring-photo` on /projects rendering with
 * a NEGATIVE getScreenCTM() determinant, i.e. mirrored, while the `text.ring-mark`
 * monograms were all positive. This measures exactly that claim before anything is changed,
 * and records enough of the transform chain to say WHERE a sign comes from if one is found:
 * the plane matrix on the `space` group, the window's own rotate+scale, and the photo's own
 * upright correction, each with its own determinant.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3113';
// The DEB Chrome, not `/snap/bin/chromium`. Launching the snap from inside the VS Code
// snap's environment dies at "Failed to create a ProcessSingleton for your profile
// directory" before a page ever loads - the confinement, not the flags. Older harnesses in
// this directory still default to the snap; they only ever ran from a plain terminal.
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'ring-photo-det');
const SETTLE = Number(process.env.SETTLE || 13000);
fs.mkdirSync(OUT, { recursive: true });

const CASES = [
  { name: 'en-desktop', pre: '', vp: { width: 1440, height: 900 } },
  { name: 'he-desktop', pre: '/he', vp: { width: 1440, height: 900 } },
  { name: 'ru-desktop', pre: '/ru', vp: { width: 1440, height: 900 } },
  { name: 'en-mobile', pre: '', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } },
  { name: 'he-mobile', pre: '/he', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } },
  { name: 'ru-mobile', pre: '/ru', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } },
];

/** Determinants down the whole chain, for every ring photo and every monogram. */
const readDet = () => {
  const svg = document.querySelector('svg.ring-layer');
  if (!svg) return { error: 'no ring layer' };
  const det = (m) => (m ? m.a * m.d - m.b * m.c : null);
  const r4 = (n) => (n === null ? null : +n.toFixed(4));

  // The one group that carries the ring plane. Its determinant is shared by everything.
  const space = svg.querySelector('g');
  const spaceDet = r4(det(space && space.getScreenCTM()));

  // EVERY element, painted or not, with the evidence needed to tell the two apart. The
  // external report counted 6 of 8 photos as mirrored; the question this answers is whether
  // those 6 are on the screen at all.
  const shot = (sel) =>
    [...svg.querySelectorAll(sel)].map((el) => {
      const own = det(el.getScreenCTM());
      const g = el.closest('g[aria-hidden]');
      const r = el.getBoundingClientRect();
      const painted =
        !!g &&
        g.style.display !== 'none' &&
        Number(g.style.opacity || '1') > 0.02 &&
        r.width > 1 &&
        r.height > 1;
      // Handedness is only half the question. A preview can have a perfectly positive
      // determinant and still be standing on its head - the determinant cannot see a
      // rotation. `uprightDeg` is the screen direction of the element's own x axis: 0 is
      // reading left-to-right, +-180 is upside down.
      const ctm = el.getScreenCTM();
      const uprightDeg = ctm ? (Math.atan2(ctm.b, ctm.a) * 180) / Math.PI : null;
      return {
        screenDet: r4(own),
        mirrored: own !== null && own < 0,
        uprightDeg: uprightDeg === null ? null : +uprightDeg.toFixed(1),
        upright: uprightDeg !== null && Math.abs(uprightDeg) <= 20,
        painted,
        display: g ? g.style.display || 'inline' : null,
        groupOpacity: g ? g.style.opacity || '1' : null,
        // The decisive field. A window that has never been on the fan is skipped by the
        // frame loop before the upright correction is written, so its image carries NO
        // transform of its own and reports the ring plane's determinant unchanged - which
        // is negative, and which is what a naive sweep over all eight reads as "mirrored".
        hasOwnTransform: !!el.getAttribute('transform'),
        ownTransform: el.getAttribute('transform') || '',
      };
    });

  const photos = shot('image.ring-photo');
  const marks = shot('text.ring-mark');
  return {
    spaceDet,
    photos,
    marks,
    paintedPhotos: photos.filter((p) => p.painted).length,
    paintedPhotosMirrored: photos.filter((p) => p.painted && p.mirrored).length,
    paintedPhotosNotUpright: photos.filter((p) => p.painted && !p.upright).length,
    paintedMarks: marks.filter((p) => p.painted).length,
    paintedMarksMirrored: marks.filter((p) => p.painted && p.mirrored).length,
    paintedMarksNotUpright: marks.filter((p) => p.painted && !p.upright).length,
    // What a sweep that ignores visibility would have reported.
    naiveMirrored: [...photos, ...marks].filter((p) => p.mirrored).length,
    unpaintedWithoutTransform: [...photos, ...marks].filter((p) => !p.painted && !p.hasOwnTransform).length,
  };
};

/** Scroll the ring to a fraction of its span and let the damping settle. */
const rotateTo = (frac) => {
  const list = document.querySelector('.ring-scroll');
  if (!list) return false;
  const horiz = getComputedStyle(list).overflowX === 'auto';
  const span = horiz
    ? list.scrollWidth - list.clientWidth
    : list.scrollHeight - list.clientHeight;
  const rtlBox = getComputedStyle(list).direction === 'rtl';
  if (horiz) list.scrollLeft = (rtlBox ? -1 : 1) * span * frac;
  else list.scrollTop = span * frac;
  return true;
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 240000,
  // Its own throwaway profile. The default one is a fixed path, and the other session
  // measuring at the same moment would collide with it.
  userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'ring-det-profile-')),
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
  await page.goto(`${BASE}${c.pre}/projects`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, SETTLE));

  const rotations = {};
  for (const frac of [0, 0.5, 1]) {
    await page.evaluate(rotateTo, frac);
    await new Promise((r) => setTimeout(r, 1500));
    rotations[`scroll${Math.round(frac * 100)}`] = await page.evaluate(readDet);
  }
  await page.screenshot({ path: path.join(OUT, `${c.name}.png`) });
  report[c.name] = rotations;
  await page.close();
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

let bad = 0;
for (const [name, rots] of Object.entries(report)) {
  for (const [rot, v] of Object.entries(rots)) {
    if (v.error) { console.log(`${name} ${rot}: ERROR ${v.error}`); continue; }
    bad +=
      v.paintedPhotosMirrored + v.paintedMarksMirrored +
      v.paintedPhotosNotUpright + v.paintedMarksNotUpright;
    const ang = (arr) => arr.filter((p) => p.painted).map((p) => `${p.screenDet}@${p.uprightDeg}deg`).join(', ');
    console.log(
      `${name.padEnd(11)} ${rot.padEnd(9)} space=${String(v.spaceDet).padStart(8)} | ` +
      `photos ${v.paintedPhotos} mirror ${v.paintedPhotosMirrored} askew ${v.paintedPhotosNotUpright} [${ang(v.photos)}] | ` +
      `marks ${v.paintedMarks} mirror ${v.paintedMarksMirrored} askew ${v.paintedMarksNotUpright} [${ang(v.marks)}] | ` +
      `naive-mirrored ${v.naiveMirrored}/${v.photos.length + v.marks.length}, never-transformed ${v.unpaintedWithoutTransform}`
    );
  }
}
console.log(
  bad === 0
    ? '\nPASS - every PAINTED ring preview is un-mirrored AND upright.'
    : `\nFAIL - ${bad} painted elements are mirrored or off-upright.`
);
