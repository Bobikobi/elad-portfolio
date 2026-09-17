/**
 * EDGE-FLASH recorder. Records the live scene as a screencast with each frame's real
 * timestamp, so edge-flash.py can count one-frame flashes. Pair with edge-flash.py.
 *
 *   BASE=<alias> ROUTE=/about TAG=before-about node scripts/harness/edge-flash.mjs
 *   BASE=<alias> ROUTE=/ SCROLL=1 SECONDS=35 TAG=before-home node scripts/harness/edge-flash.mjs
 *
 * Why a screencast and not screenshots: the flashes last ONE frame. SCENE-FLICKER sampled a
 * screenshot every 450ms and never saw one. An idle page renders at 30fps (the idle
 * throttle) and a 1280x720 jpeg screencast delivers every one of those frames - check
 * `medianGapMs` in meta.json (~33ms) before trusting a count.
 *
 * The page is left as a visitor sees it (HTML included): the flash detector only counts
 * pixels that jump and fall back within two frames, and static HTML never does.
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

const BASE = process.env.BASE || 'http://localhost:3000';
const ROUTE = process.env.ROUTE || '/about';
const TAG = process.env.TAG || 'run';
const SECONDS = Number(process.env.SECONDS || 25);
const SETTLE = Number(process.env.SETTLE || 12000);
const SCROLL = !!process.env.SCROLL;
const MP4 = !!process.env.MP4;
const W = 1280;
const H = 720;
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'edge-flash', TAG);
const BYPASS_FILE = process.env.VERCEL_BYPASS_FILE
  || path.join(os.homedir(), '.claude', 'secrets', 'vercel-bypass.txt');
const VERCEL_BYPASS = (() => {
  try { return fs.readFileSync(BYPASS_FILE, 'utf8').trim() || null; } catch { return null; }
})();

const framesDir = path.join(OUT, 'frames');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });

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
let exitCode = 0;
try {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  if (VERCEL_BYPASS && /vercel\.app/.test(BASE)) {
    await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': VERCEL_BYPASS });
  }
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, SETTLE));

  // A blank page has no flashes either, so a zero count means nothing until the GPU is real
  // and the scene canvas is on the page.
  const probe = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    const canvas = [...document.querySelectorAll('canvas')]
      .map((c) => c.getBoundingClientRect())
      .find((r) => r.width >= 600 && r.height >= 300);
    return { gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'none', sceneCanvas: !!canvas };
  });
  if (/swiftshader|llvmpipe|^none$/i.test(probe.gpu) || !probe.sceneCanvas) {
    throw new Error(`not a real measurement: gpu=${probe.gpu} sceneCanvas=${probe.sceneCanvas}`);
  }

  const cdp = await page.createCDPSession();
  const stamps = [];
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    fs.writeFileSync(path.join(framesDir, `f${String(stamps.length).padStart(5, '0')}.jpg`), Buffer.from(data, 'base64'));
    stamps.push(metadata.timestamp);
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  const t0 = Date.now();
  let scrolledAt = null;
  if (SCROLL) {
    // A visitor's scroll: 2s of the top, then ~5s of steady wheel steps down to the solar system.
    await new Promise((r) => setTimeout(r, 2000));
    await page.mouse.move(W / 2, H / 2);
    for (let i = 0; i < 100; i++) {
      await page.mouse.wheel({ deltaY: 120 });
      await new Promise((r) => setTimeout(r, 50));
    }
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    scrolledAt = (Date.now() - t0) / 1000;
  }
  await new Promise((r) => setTimeout(r, Math.max(0, SECONDS * 1000 - (Date.now() - t0))));
  await cdp.send('Page.stopScreencast');
  await new Promise((r) => setTimeout(r, 300));

  const gaps = stamps.slice(1).map((t, i) => t - stamps[i]).sort((a, b) => a - b);
  const meta = {
    base: BASE, route: ROUTE, tag: TAG, seconds: SECONDS, settleMs: SETTLE, scroll: SCROLL, scrolledAt,
    gpu: probe.gpu, frames: stamps.length,
    span: +(stamps.at(-1) - stamps[0]).toFixed(3),
    fps: +((stamps.length - 1) / (stamps.at(-1) - stamps[0])).toFixed(1),
    medianGapMs: +(gaps[gaps.length >> 1] * 1000).toFixed(1),
    maxGapMs: +(gaps.at(-1) * 1000).toFixed(1),
    capturedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(OUT, 'stamps.json'), JSON.stringify(stamps));
  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 2));

  if (MP4) {
    // Real per-frame durations, so a dropped frame shows as a hold rather than a jump.
    const list = stamps.map((t, i) => `file 'frames/f${String(i).padStart(5, '0')}.jpg'\nduration ${((stamps[i + 1] ?? t + 1 / 30) - t).toFixed(5)}`)
      .join('\n') + `\nfile 'frames/f${String(stamps.length - 1).padStart(5, '0')}.jpg'\n`;
    fs.writeFileSync(path.join(OUT, 'list.txt'), list);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(OUT, 'list.txt'),
      '-fps_mode', 'cfr', '-r', '60', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-crf', '16', path.join(OUT, `${TAG}.mp4`)]);
  }
  console.log(JSON.stringify(meta));
} catch (err) {
  console.error(err);
  exitCode = 2;
} finally {
  await browser.close();
}
process.exit(exitCode);
