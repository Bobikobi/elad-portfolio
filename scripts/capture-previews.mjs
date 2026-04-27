/**
 * Captures project preview screenshots using system Chrome via puppeteer-core.
 * Run: node scripts/capture-previews.mjs
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, '..', 'public', 'images', 'projects');
fs.mkdirSync(outputDir, { recursive: true });

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const projects = [
  { id: 'political-compass', url: 'https://political-compass-il.vercel.app' },
  { id: 'emergency-teams',   url: 'https://netanya-civil.vercel.app/emergency' },
  { id: 'honey-shor',        url: 'https://honey-site-seven.vercel.app' },
  { id: 'elad-portfolio',    url: 'https://elad-s-portfolio.vercel.app' },
];

async function capture(browser, project) {
  const page = await browser.newPage();
  try {
    // 1440x900 desktop viewport — same as the original iframe dimensions
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    // Navigate and wait until network is idle (images/fonts loaded)
    await page.goto(project.url, { waitUntil: 'networkidle2', timeout: 30000 });
    // Extra wait for CSS animations / JS hydration to settle
    await new Promise(r => setTimeout(r, 2500));
    const dest = path.join(outputDir, `${project.id}-preview.jpg`);
    await page.screenshot({
      path: dest,
      type: 'jpeg',
      quality: 88,
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    });
    const kb = Math.round(fs.statSync(dest).size / 1024);
    console.log(`✓  ${project.id}  (${kb} KB)`);
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    for (const project of projects) {
      process.stdout.write(`Capturing ${project.id}... `);
      try {
        await capture(browser, project);
      } catch (err) {
        console.log(`✗  (${err.message})`);
      }
    }
  } finally {
    await browser.close();
  }
}

main();

