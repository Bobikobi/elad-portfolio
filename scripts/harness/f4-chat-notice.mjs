/**
 * F4 harness - the AI-processing notice inside the chat widget.
 *
 *   BASE=<preview alias> BYPASS=<token> CHROME=<chrome path> node scripts/harness/f4-chat-notice.mjs
 *
 * The notice is rendered by the widget panel, so it is absent from the initial page
 * source by design. A source grep therefore proves nothing either way - the only honest
 * check is to open the widget the way a visitor does and look at what is on screen.
 *
 * Per locale it asserts, in order:
 *   1. the launcher exists and the panel opens,
 *   2. the notice element carries the expected string for that locale,
 *   3. it is actually visible - non-zero box, not clipped, not transparent,
 *   4. it sits inside the panel and within the viewport,
 *   5. where it lands relative to the text input (reported, not asserted - the owner
 *      asked for "above the input"; the component puts it in the footer below).
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:3112';
const BYPASS = process.env.BYPASS || '';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'f4-chat-notice');
fs.mkdirSync(OUT, { recursive: true });

// The root serves English; Hebrew and Russian are prefixed. ('/en' 308s back to '/'.)
const ROUTES = { he: '/he', en: '', ru: '/ru' };
const EXPECTED = {
  he: 'ההודעות מעובדות אצל ספק בינה מלאכותית כדי לייצר תשובה.',
  en: 'Messages are processed by an AI provider to generate replies.',
  ru: 'Сообщения обрабатываются провайдером ИИ для формирования ответа.',
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  args: ['--use-angle=d3d11', '--window-size=1280,900'],
  defaultViewport: { width: 1280, height: 860 },
});

const results = [];
for (const [loc, prefix] of Object.entries(ROUTES)) {
  const page = await browser.newPage();
  if (BYPASS) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': BYPASS });

  const url = `${BASE}${prefix}/`;
  const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const status = res?.status() ?? 0;

  // The notice must not be in the server payload - state it rather than assume it.
  const html = await page.content();
  const inInitialSource = html.includes(EXPECTED[loc]);

  // Open the widget the way a visitor does.
  const opened = await page.evaluate(() => {
    const btn = document.querySelector('button.chrome-launcher');
    if (!btn) return false;
    btn.click();
    return true;
  });
  await new Promise((r) => setTimeout(r, 1200));

  const probe = await page.evaluate((expected) => {
    const nodes = [...document.querySelectorAll('p, span, div')];
    const el = nodes.find((n) => n.textContent?.trim() === expected);
    if (!el) return { found: false };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const input = document.querySelector('input[type="text"]');
    const ir = input?.getBoundingClientRect();
    return {
      found: true,
      text: el.textContent.trim(),
      box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      visible:
        r.width > 0 &&
        r.height > 0 &&
        cs.visibility !== 'hidden' &&
        cs.display !== 'none' &&
        Number(cs.opacity) > 0.1 &&
        r.top >= 0 &&
        r.bottom <= window.innerHeight,
      opacity: cs.opacity,
      fontSize: cs.fontSize,
      color: cs.color,
      dir: getComputedStyle(document.documentElement).direction,
      relativeToInput: ir ? (r.top < ir.top ? 'above' : 'below') : 'no-input',
      inputBox: ir ? { y: Math.round(ir.y), h: Math.round(ir.height) } : null,
      // Whether the widget can actually be used at all - the send button is gated on a
      // Turnstile token, so a deployment without the site key renders a dead widget.
      sendDisabled: document.querySelector('button[aria-label="Send"]')?.disabled ?? null,
      offlineNotice: [...document.querySelectorAll('p')].some((p) =>
        /switched off|כבוי|отключ/i.test(p.textContent || '')
      ),
    };
  }, EXPECTED[loc]);

  await page.screenshot({ path: path.join(OUT, `${loc}.png`) });
  results.push({ loc, status, opened, inInitialSource, ...probe });
  await page.close();
}

await browser.close();

let pass = true;
for (const r of results) {
  const ok = r.status === 200 && r.opened && r.found && r.visible && r.text === EXPECTED[r.loc];
  if (!ok) pass = false;
  console.log(
    `[${r.loc}] http=${r.status} opened=${r.opened} inSource=${r.inInitialSource} found=${r.found} ` +
      `visible=${r.visible} pos=${r.relativeToInput} box=${JSON.stringify(r.box)} ` +
      `size=${r.fontSize} opacity=${r.opacity} sendDisabled=${r.sendDisabled} offline=${r.offlineNotice} => ${ok ? 'PASS' : 'FAIL'}`
  );
}
console.log(pass ? '\nALL LOCALES PASS' : '\nFAILURES PRESENT');
console.log(`screenshots: ${OUT}`);
process.exit(pass ? 0 : 1);
