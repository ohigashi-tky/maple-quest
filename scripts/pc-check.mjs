import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--mute-audio'],
  defaultViewport: { width: 1440, height: 850 },
});
const page = await browser.newPage();
await page.goto('https://ohigashi-tky.github.io/maple-quest/', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 2500));
const info = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  const r = c.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height, win: { w: innerWidth, h: innerHeight } };
});
console.log(JSON.stringify(info));
const centered = Math.abs((info.x + info.w / 2) - info.win.w / 2) < 2 && Math.abs((info.y + info.h / 2) - info.win.h / 2) < 2;
console.log(centered ? 'PC CENTERED OK' : 'WARNING: not centered');
await page.screenshot({ path: '/tmp/maple-pc.png' });
await browser.close();
