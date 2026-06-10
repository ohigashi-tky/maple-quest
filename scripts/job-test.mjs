// 転職システムの検証: レベルアップで見た目・スキルが変わることを確認
import puppeteer from 'puppeteer-core';

const URL = process.env.GAME_URL || 'http://localhost:4173/';
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--mute-audio'],
  defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

await page.goto(URL, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 2000));

const info = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  const r = c.getBoundingClientRect();
  return { rect: { x: r.x, y: r.y, w: r.width, h: r.height }, vw: c.width, vh: c.height };
});
const { rect, vw, vh } = info;
const toScreen = (vx, vy) => ({ x: rect.x + (vx / vw) * rect.w, y: rect.y + (vy / vh) * rect.h });
const start = toScreen(270, vh - 420);
await page.touchscreen.tap(start.x, start.y);
await new Promise((r) => setTimeout(r, 1500));

const state = () => page.evaluate(() => {
  const s = window.__PHASER_GAME__.scene.getScene('Game');
  return {
    level: s.progress.level,
    job: s.uiState.charName,
    sprite: s.uiState.spriteKey,
    skills: s.uiState.skills.map((k) => k.label),
  };
});

console.log('tier1:', JSON.stringify(await state()));

// 2次転職 (Lv5)
await page.evaluate(() => {
  const s = window.__PHASER_GAME__.scene.getScene('Game');
  s.gainExp(1600); // Lv5相当まで
});
await new Promise((r) => setTimeout(r, 1200));
console.log('tier2:', JSON.stringify(await state()));
await page.screenshot({ path: '/tmp/maple-job2.png' });

// 3次転職 (Lv10)
await page.evaluate(() => {
  const s = window.__PHASER_GAME__.scene.getScene('Game');
  s.gainExp(20000);
});
await new Promise((r) => setTimeout(r, 1200));
console.log('tier3:', JSON.stringify(await state()));
await page.screenshot({ path: '/tmp/maple-job3.png' });

// 魔法使いに交代 → アークメイジの見た目確認
const sw = toScreen(48, 152);
await page.touchscreen.tap(sw.x, sw.y);
await new Promise((r) => setTimeout(r, 600));
console.log('mage tier3:', JSON.stringify(await state()));
// スキル使用(雷)
const sk2 = toScreen(318, vh - 148);
await page.touchscreen.tap(sk2.x, sk2.y);
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: '/tmp/maple-job3-mage.png' });

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
