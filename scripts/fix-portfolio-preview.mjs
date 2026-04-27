import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox'],
});

// At 900px the max-w-2xl hero fills the viewport without large empty margins
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 562 }); // 16:10 ratio
await page.goto('https://elad-s-portfolio.vercel.app', { waitUntil: 'networkidle2', timeout: 35000 });
// Wait for Framer Motion animations to complete
await new Promise(r => setTimeout(r, 7000));
await page.screenshot({
  path: 'public/images/projects/elad-portfolio-preview.jpg',
  type: 'jpeg',
  quality: 90,
});
console.log('elad-portfolio done');
await page.close();

await browser.close();
