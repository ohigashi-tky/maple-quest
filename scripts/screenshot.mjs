// 動作確認用: ヘッドレスChromeでゲームを起動してスクリーンショットを撮る
import puppeteer from 'puppeteer-core';

const URL = process.env.GAME_URL || 'http://localhost:4173/';
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--mute-audio', '--hide-scrollbars'],
  defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push('console.error: ' + msg.text());
});
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

await page.goto(URL, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: '/tmp/maple-1-title.png' });

// キャンバスの論理解像度(高さは端末比率で動的)と表示位置を取得
const info = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  const r = c.getBoundingClientRect();
  return {
    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    vw: c.width, vh: c.height,
    win: { w: window.innerWidth, h: window.innerHeight },
  };
});
console.log('canvas:', JSON.stringify(info));
const fills =
  Math.abs(info.rect.w - info.win.w) < 2 && Math.abs(info.rect.h - info.win.h) < 2;
console.log(fills ? 'FULLSCREEN OK (canvas fills viewport)' : 'WARNING: canvas does not fill viewport');

const { rect, vw, vh } = info;
const toScreen = (vx, vy) => ({ x: rect.x + (vx / vw) * rect.w, y: rect.y + (vy / vh) * rect.h });

// タイトルの「はじめから」(VIEW_H-420)
const start = toScreen(270, vh - 420);
await page.touchscreen.tap(start.x, start.y);
await new Promise((r) => setTimeout(r, 2000));
await page.screenshot({ path: '/tmp/maple-2-game.png' });

// 右移動を少し
const right = toScreen(174, vh - 102);
await page.touchscreen.touchStart(right.x, right.y);
await new Promise((r) => setTimeout(r, 1200));
await page.touchscreen.touchEnd();

// 攻撃ボタン連打
const atk = toScreen(458, vh - 98);
for (let i = 0; i < 5; i++) {
  await page.touchscreen.tap(atk.x, atk.y);
  await new Promise((r) => setTimeout(r, 350));
}
await page.screenshot({ path: '/tmp/maple-3-attack.png' });

// スキル1
const sk = toScreen(338, vh - 58);
await page.touchscreen.tap(sk.x, sk.y);
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: '/tmp/maple-4-skill.png' });

// キャラ交代 → 魔法攻撃
const sw = toScreen(48, 152);
await page.touchscreen.tap(sw.x, sw.y);
await new Promise((r) => setTimeout(r, 600));
await page.touchscreen.tap(atk.x, atk.y);
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: '/tmp/maple-5-mage.png' });

console.log('screenshots saved.');
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
