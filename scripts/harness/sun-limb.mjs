// Sun limb (Task B): solar overview capture - one wheel notch from the galaxy, DOM hidden,
// device-pixel screenshot + __perf. Measurement: scripts/harness/sun-limb.py.
//   BASE=<alias or prod> W=1440 H=900 DSF=1 TAG=d1440 node scripts/harness/sun-limb.mjs
import puppeteer from 'puppeteer-core'; import fs from 'fs'; import os from 'os'; import path from 'path';
const BASE = process.env.BASE || 'https://www.eladsaadon.dev';
const [W, H, DSF] = [+process.env.W, +process.env.H, +process.env.DSF]; const MOB = W < 700; const TAG = process.env.TAG;
const OUT = path.join(process.cwd(), '.harness-out', 'sunlimb'); fs.mkdirSync(OUT, { recursive: true });
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'sun-')),
  args: ['--no-sandbox', '--hide-scrollbars', '--use-gl=angle', '--use-angle=vulkan', '--disable-dev-shm-usage'] });
try {
  const p = await b.newPage(); await p.setViewport({ width: W, height: H, deviceScaleFactor: DSF, isMobile: MOB, hasTouch: MOB });
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 }); await new Promise((r) => setTimeout(r, 14000));
  await p.mouse.move(W / 2, H / 2);
  if (MOB) { await p.touchscreen.touchMove?.(0, 0).catch?.(() => {}); }
  await p.mouse.wheel({ deltaY: 120 }); await new Promise((r) => setTimeout(r, 9000));
  await p.evaluate(() => {
    const c = document.querySelector('canvas'); for (let el = c; el; el = el.parentElement) el.setAttribute('data-k', '');
    const st = document.createElement('style'); st.textContent = 'body *:not([data-k]){visibility:hidden!important} body [data-k]{visibility:visible!important}'; document.head.appendChild(st);
  });
  await new Promise((r) => setTimeout(r, 600));
  const info = await p.evaluate(() => { const c = document.querySelector('canvas'); return { perf: window.__perf, dev: devicePixelRatio, buf: [c.width, c.height], css: [c.clientWidth, c.clientHeight] }; });
  const gpu = await p.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); const e = g.getExtension('WEBGL_debug_renderer_info'); return g.getParameter(e.UNMASKED_RENDERER_WEBGL); });
  if (/swiftshader|llvmpipe/i.test(gpu)) throw new Error('software GPU');
  await p.screenshot({ path: path.join(OUT, TAG + '.png') });
  fs.writeFileSync(path.join(OUT, TAG + '.json'), JSON.stringify({ W, H, DSF, ...info }));
  console.log(TAG, JSON.stringify(info));
} finally { await b.close(); }
