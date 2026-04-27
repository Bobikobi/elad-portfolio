import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox'],
});

// --- HONEY SHOR: narrow viewport to eliminate the gray left margin ---
{
  const page = await browser.newPage();
  // 1100px viewport: the site's centered content fills more of the screen
  await page.setViewport({ width: 1100, height: 688 });
  await page.goto('https://honey-site-seven.vercel.app', { waitUntil: 'networkidle2', timeout: 35000 });
  // Force all lazy images to load eagerly
  await page.evaluate(() => {
    document.querySelectorAll('img').forEach(img => {
      if (img.loading === 'lazy') img.loading = 'eager';
      if (!img.complete) img.src = img.src; // trigger reload
    });
  });
  await new Promise(r => setTimeout(r, 5000));
  await page.screenshot({ path: 'public/images/projects/honey-shor-preview.jpg', type: 'jpeg', quality: 90 });
  console.log('honey-shor done');
  await page.close();
}

// --- ELAD PORTFOLIO: 1920px so RTL hero text is not clipped ---
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('https://elad-s-portfolio.vercel.app', { waitUntil: 'networkidle2', timeout: 35000 });
  // Wait for Framer Motion animations to complete
  await new Promise(r => setTimeout(r, 8000));
  await page.screenshot({
    path: 'public/images/projects/elad-portfolio-preview.jpg',
    type: 'jpeg',
    quality: 90,
    clip: { x: 0, y: 0, width: 1920, height: 1080 },
  });
  console.log('elad-portfolio done');
  await page.close();
}

await browser.close();
console.log('All done');
