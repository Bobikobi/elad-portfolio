/**
 * MOBILE-1's risk clause, made lookable-at: "M3 proves only the SETTLED frame. Whoever runs
 * this must also look at the first two seconds by eye and say so."
 *
 *   TAG=before node scripts/harness/startup-filmstrip.mjs
 *
 * Shoots the canvas every 250ms from navigation for 4s. No criterion is computed here -
 * the output is a contact sheet a person looks at, which is the whole point of the clause.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3112';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'startup-filmstrip');
const TAG = process.env.TAG || 'now';
const SHOTS = Number(process.env.SHOTS || 16);
const EVERY = Number(process.env.EVERY || 250);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new', protocolTimeout: 240000,
  userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'filmstrip-')),
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars',
         '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
// 6x is enough to stretch the opening into separable frames without changing the ORDER
// things appear in, which is what this is looking at.
const client = await page.createCDPSession();
await client.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.CPU_THROTTLE || 6) });

const t0 = Date.now();
await page.goto(`${BASE}/?tier=high`, { waitUntil: 'domcontentloaded', timeout: 90000 });
for (let i = 0; i < SHOTS; i++) {
  const at = Date.now() - t0;
  fs.writeFileSync(path.join(OUT, `${TAG}-${String(i).padStart(2, '0')}-${at}ms.png`), await page.screenshot({ type: 'png' }));
  await wait(EVERY);
}
console.log(`filmstrip "${TAG}" -> ${OUT}`);
await browser.close();
