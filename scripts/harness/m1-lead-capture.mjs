/**
 * M1 harness - a real submission through the real form must land in the database.
 *
 *   BASE=<alias> BYPASS=<token> DATABASE_URL=<neon url> CHROME=<path> \
 *     node scripts/harness/m1-lead-capture.mjs
 *
 * The point is the whole path, not the pieces: browser -> server action -> Neon. It fills
 * the form the way a visitor does, waits for the success state the visitor sees, and then
 * reads the row back out of Postgres to check the two context fields the privacy policy
 * discloses (which page it came from, which language it was written in). The test row is
 * deleted at the end - a verification must not leave data behind in a lead table.
 */
import puppeteer from 'puppeteer-core';
import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE;
const BYPASS = process.env.BYPASS || '';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROUTE = process.env.ROUTE || '/he/contact';
const OUT = process.env.OUT || path.join(process.cwd(), '.harness-out', 'm1');
fs.mkdirSync(OUT, { recursive: true });

if (!BASE || !process.env.DATABASE_URL) {
  console.error('BASE and DATABASE_URL are required');
  process.exit(2);
}

const sql = neon(process.env.DATABASE_URL);
const marker = `m1-harness-${Date.now()}`;
const email = `${marker}@example.invalid`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  args: ['--use-angle=d3d11', '--window-size=1280,900'],
  defaultViewport: { width: 1280, height: 860 },
});

const page = await browser.newPage();
if (BYPASS) await page.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': BYPASS });
await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise((r) => setTimeout(r, 3000));

const filled = await page.evaluate((value) => {
  const set = (el, v) => {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
    Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const form = document.querySelector('form');
  if (!form) return false;
  set(form.querySelector('input[name="name"]'), 'M1 Harness');
  set(form.querySelector('input[name="email"]'), value);
  set(form.querySelector('textarea[name="message"]'), 'Automated M1 verification - this row is deleted by the harness.');
  return {
    locale: form.querySelector('input[name="locale"]')?.value ?? null,
    sourcePath: form.querySelector('input[name="sourcePath"]')?.value ?? null,
  };
}, email);

console.log('hidden fields in the form:', JSON.stringify(filled));

await page.evaluate(() => document.querySelector('form button[type="submit"]').click());
await new Promise((r) => setTimeout(r, 6000));
await page.screenshot({ path: path.join(OUT, 'contact-after-submit.png') });

const visibleState = await page.evaluate(() => ({
  formStillPresent: Boolean(document.querySelector('form input[name="email"]')),
  text: document.body.innerText.slice(0, 4000),
}));

const rows = await sql`
  SELECT id, name, email, locale, source_path, source_form, interest, message, created_at
  FROM leads WHERE email = ${email}
`;

const row = rows[0];
console.log('rows found in the database:', rows.length);
if (row) {
  console.log(
    `id=${row.id} locale=${row.locale} source_path=${row.source_path} ` +
      `source_form=${row.source_form} interest=${row.interest}`
  );
  await sql`DELETE FROM leads WHERE id = ${row.id}`;
  console.log('test row deleted');
}

await browser.close();

const pass =
  rows.length === 1 &&
  !visibleState.formStillPresent &&
  row.locale === filled.locale &&
  row.source_path === filled.sourcePath;

console.log(`success state shown to the visitor: ${!visibleState.formStillPresent}`);
console.log(pass ? 'PASS' : 'FAIL');
process.exit(pass ? 0 : 1);
