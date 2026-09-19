/**
 * Diagnostic only, not a criterion harness. Loads a view exactly the way
 * photometry-diff.mjs does (same flags, same scroll anchor) and asks the scene what state
 * every planet's ALBEDO MAP is actually in - image present, version, uploaded - plus what
 * the network did with /textures/. No pixels are judged here.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3112';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const VIEW = process.env.VIEW || '/';
const SCROLL = process.env.SCROLL === '1';
const SETTLE = Number(process.env.SETTLE || 14000);
const FIXEDSTEP = process.env.FIXEDSTEP !== '0';
const TARGET_FRAME = Number(process.env.TARGET_FRAME || 1600);
const SCROLL_FRAME = Number(process.env.SCROLL_FRAME || 1000);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 240000,
  userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'texprobe-')),
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars',
         '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
const net = [];
page.on('response', (r) => { if (/\/textures\//.test(r.url())) net.push(`${r.status()} ${r.url().replace(BASE,'')}`); });
page.on('requestfailed', (r) => { if (/\/textures\//.test(r.url())) net.push(`FAILED ${r.failure()?.errorText} ${r.url().replace(BASE,'')}`); });
page.on('console', (m) => { const t = m.text(); if (/\[BM\]/.test(t)) console.log(t); else if (/bitmapTexture|tex\]/i.test(t)) console.log('  console:', t.slice(0, 200)); });

await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(`${BASE}${VIEW}?hud=1&tier=high${FIXEDSTEP ? '&fixedStep' : ''}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await wait(SETTLE);
if (SCROLL) {
  if (FIXEDSTEP) await page.evaluate((f) => window.__clock?.waitForFrame(f), SCROLL_FRAME);
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await wait(500);
}
if (FIXEDSTEP) await page.evaluate((f) => window.__clock?.waitForFrame(f), TARGET_FRAME);

const dump = await page.evaluate(() => {
  const t = window.__three;
  if (!t) return { error: 'no __three' };
  const out = [];
  t.scene.traverse((o) => {
    const m = o.material;
    if (!m || Array.isArray(m)) return;
    const map = m.map;
    if (!map && !m.uniforms?.uMap) return;
    const tex = map || m.uniforms?.uMap?.value;
    if (!tex) return;
    const img = tex.image;
    out.push({
      obj: o.name || o.type,
      parent: o.parent?.name || o.parent?.type,
      visible: o.visible,
      matType: m.type,
      imageKind: img ? (img.constructor?.name || typeof img) : null,
      imgW: img?.width ?? null,
      imgH: img?.height ?? null,
      version: tex.version,
      srcVersion: tex.source?.version,
      uuid: tex.uuid.slice(0, 8),
      colorSpace: tex.colorSpace,
      flipY: tex.flipY,
      uHiMix: m.userData?.hiMix ?? null,
    });
  });
  return { objects: out, textures: t.gl.info.memory.textures, geometries: t.gl.info.memory.geometries };
});
console.log(`\n=== ${VIEW} (scroll=${SCROLL}) ===`);
console.log('gl.info.memory:', dump.textures, 'textures,', dump.geometries, 'geometries');
console.table?.(dump.objects);
console.log(JSON.stringify(dump.objects, null, 1));
console.log('\n--- /textures/ network ---');
console.log(net.join('\n') || '(none)');
await browser.close();
