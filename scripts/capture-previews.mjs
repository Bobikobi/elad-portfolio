/**
 * Downloads project preview screenshots from thum.io and saves them locally.
 * Run: node scripts/capture-previews.mjs
 */
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, '..', 'public', 'images', 'projects');

fs.mkdirSync(outputDir, { recursive: true });

const projects = [
  { id: 'political-compass', url: 'https://political-compass-il.vercel.app' },
  { id: 'emergency-teams',   url: 'https://netanya-civil.vercel.app/emergency' },
  { id: 'honey-shor',        url: 'https://honey-site-seven.vercel.app' },
  { id: 'elad-portfolio',    url: 'https://elad-s-portfolio.vercel.app' },
];

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlink(dest, () => {});
        return downloadImage(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        return reject(new Error(`HTTP ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    });
    req.on('error', (err) => { fs.unlink(dest, () => {}); reject(err); });
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function main() {
  for (const project of projects) {
    const dest = path.join(outputDir, `${project.id}-preview.jpg`);
    // width=1200, crop=630 → 1200×630 screenshot (same as OG image ratio)
    const thumbUrl = `https://image.thum.io/get/width/1200/crop/630/noanimate/allowJPG/${project.url}`;
    process.stdout.write(`Capturing ${project.id}... `);
    try {
      await downloadImage(thumbUrl, dest);
      console.log('✓');
    } catch (err) {
      console.log(`✗ (${err.message})`);
    }
  }
}

main();
