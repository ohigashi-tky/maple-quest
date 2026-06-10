// 3ステージのボス戦をデバッグフック経由で検証する
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
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push('console.error: ' + msg.text());
});

await page.goto(URL, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 2000));

const rect = await page.evaluate(() => {
  const r = document.querySelector('canvas').getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
const toScreen = (vx, vy) => ({ x: rect.x + (vx / 540) * rect.w, y: rect.y + (vy / 960) * rect.h });
const start = toScreen(270, 960 - 420);
await page.touchscreen.tap(start.x, start.y);
await new Promise((r) => setTimeout(r, 1500));

for (let stage = 0; stage < 3; stage++) {
  // ステージを直接開始してボスを即時出現させる
  await page.evaluate((s) => {
    const g = window.__PHASER_GAME__;
    const scene = g.scene.getScene('Game');
    scene.scene.restart({ stage: s });
  }, stage);
  await new Promise((r) => setTimeout(r, 1500));
  await page.evaluate(() => {
    const g = window.__PHASER_GAME__;
    const scene = g.scene.getScene('Game');
    scene.spawnBoss();
  });
  await new Promise((r) => setTimeout(r, 2600)); // ボスの攻撃パターンを1回見る
  await page.screenshot({ path: `/tmp/maple-boss-${stage + 1}.png` });

  // ボスへダメージを与えて倒せることを確認
  const result = await page.evaluate(() => {
    const g = window.__PHASER_GAME__;
    const scene = g.scene.getScene('Game');
    const boss = scene.boss;
    if (!boss) return { ok: false, reason: 'no boss' };
    const name = boss.def.name;
    boss.hp = 1;
    scene.hitEnemy(boss, 1, 1);
    return { ok: true, name };
  });
  console.log(`stage ${stage + 1} boss:`, JSON.stringify(result));
  await new Promise((r) => setTimeout(r, 2500));
  const after = await page.evaluate(() => {
    const g = window.__PHASER_GAME__;
    const scene = g.scene.getScene('Game');
    return { bossGone: !scene.boss, portal: !!scene.portal };
  });
  console.log(`stage ${stage + 1} after kill:`, JSON.stringify(after));
  await page.screenshot({ path: `/tmp/maple-boss-${stage + 1}-dead.png` });
}

// ポータル進入 → ゲームクリアの確認 (ステージ3のポータルへワープ)
await page.evaluate(() => {
  const g = window.__PHASER_GAME__;
  const scene = g.scene.getScene('Game');
  if (scene.portal) scene.player.setPosition(scene.portal.x, scene.portal.y);
});
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: '/tmp/maple-clear.png' });

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
