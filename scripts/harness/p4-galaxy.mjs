/**
 * P4-8 evidence: one galaxy-act frame, before and after a candidate.
 *
 *   TAG=before                                   node scripts/harness/p4-galaxy.mjs
 *   TAG=after  EXTRA_QS='hl=0.72,1.70,0.73,2'    node scripts/harness/p4-galaxy.mjs
 *
 * highlightRolloff runs on every pixel in the site, and none of P4's numeric views look at the galaxy
 * act. This captures the top of the home route - the galaxy act, before any scroll - frozen at frame
 * 1600 with wait and freeze in ONE browser call (see mars-turn.mjs), DOM hidden, so the owner can see
 * the galaxy side by side and not only the planets.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3112';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'p4-galaxy');
const TAG = process.env.TAG;
const EXTRA_QS = process.env.EXTRA_QS || '';
if (!TAG) { console.error('TAG is required'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

// Preview deployments sit behind SSO; the bypass secret is read from a file, never an argument,
// so it stays out of shell history. Same block as photometry-diff.mjs. Without it this script
// could only ever reach localhost, which the standing rules do not accept as evidence.
const BYPASS_FILE = process.env.VERCEL_BYPASS_FILE
  || path.join(os.homedir(), '.claude', 'secrets', 'vercel-bypass.txt');
const VERCEL_BYPASS = (() => {
  try { return fs.readFileSync(BYPASS_FILE, 'utf8').trim() || null; } catch { return null; }
})();

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 240000,
  userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'p4galaxy-')),
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars', '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage'],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  if (VERCEL_BYPASS && /vercel\.app/.test(BASE)) {
    await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': VERCEL_BYPASS });
  }
  await page.goto(`${BASE}/?hud=1&tier=high&fixedStep${EXTRA_QS ? `&${EXTRA_QS}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await new Promise((r) => setTimeout(r, 14000));
  const at = await page.evaluate(async () => {
    const clock = window.__clock;
    if (!clock) return null;
    await clock.waitForFrame(1600);
    return await clock.freeze();
  });
  if (!at?.fixedStep || !at.frozen) throw new Error('fixedStep clock did not freeze at frame 1600');
  const act = await page.evaluate(() => window.__scene?.getState?.().act ?? null);
  if (act !== 'galaxy') throw new Error(`act is "${act}", not galaxy - refusing to label this a galaxy frame`);
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    for (let el = canvas; el; el = el.parentElement) el.setAttribute('data-harness-keep', '');
    const style = document.createElement('style');
    style.textContent = 'body *:not([data-harness-keep]) { visibility: hidden !important; transition: none !important; animation: none !important; }' +
      'body [data-harness-keep] { visibility: visible !important; }';
    document.head.appendChild(style);
  });
  await new Promise((r) => setTimeout(r, 400));
  fs.writeFileSync(path.join(OUT, `${TAG}.png`), await page.screenshot({ type: 'png' }));
  console.log(JSON.stringify({ tag: TAG, elapsedTime: at.elapsedTime, act }));
} finally {
  await browser.close();
}
