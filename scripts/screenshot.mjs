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

// タイトルの「はじめから」をタップ (中央, VIEW基準 y=540/960 → 画面比率で計算)
// キャンバスはletterboxされるので実際の描画域を求める
const rect = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  const r = c.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
const toScreen = (vx, vy) => ({ x: rect.x + (vx / 540) * rect.w, y: rect.y + (vy / 960) * rect.h });

const start = toScreen(270, 960 - 420);
await page.touchscreen.tap(start.x, start.y);
await new Promise((r) => setTimeout(r, 2000));
await page.screenshot({ path: '/tmp/maple-2-game.png' });

// 右移動を少し
const right = toScreen(174, 858);
await page.touchscreen.touchStart(right.x, right.y);
await new Promise((r) => setTimeout(r, 1200));
await page.touchscreen.touchEnd();

// 攻撃ボタン連打
const atk = toScreen(458, 862);
for (let i = 0; i < 5; i++) {
  await page.touchscreen.tap(atk.x, atk.y);
  await new Promise((r) => setTimeout(r, 350));
}
await page.screenshot({ path: '/tmp/maple-3-attack.png' });

// スキル1
const sk = toScreen(338, 902);
await page.touchscreen.tap(sk.x, sk.y);
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: '/tmp/maple-4-skill.png' });

// キャラ交代 → 魔法攻撃
const sw = toScreen(330, 62);
await page.touchscreen.tap(sw.x, sw.y);
await new Promise((r) => setTimeout(r, 600));
await page.touchscreen.tap(atk.x, atk.y);
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: '/tmp/maple-5-mage.png' });

console.log('screenshots saved.');
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
