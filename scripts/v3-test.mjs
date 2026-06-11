// 大型UPDATE検証: 難易度・階層選択・緩和バランス・エリクサーCT・EXP増
import puppeteer from 'puppeteer-core';
const URL = process.env.GAME_URL || 'http://localhost:4173/';
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--no-sandbox', '--mute-audio'],
  defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(URL, { waitUntil: 'networkidle0' });
await page.evaluate(() => { localStorage.removeItem('maple-quest-save-v3'); });
await page.reload({ waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 2200));
const info = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { rect: { x: r.x, y: r.y, w: r.width, h: r.height }, vw: c.width, vh: c.height }; });
const { rect, vw, vh } = info;
const S = (vx, vy) => ({ x: rect.x + (vx / vw) * rect.w, y: rect.y + (vy / vh) * rect.h });
await page.screenshot({ path: '/tmp/v3-title.png' });

// 挑戦ボタン(VIEW_H-350)
await page.touchscreen.tap(S(270, vh - 350).x, S(270, vh - 350).y);
await new Promise((r) => setTimeout(r, 2000));
const st = () => page.evaluate(() => {
  const s = window.__PHASER_GAME__.scene.getScene('Game'); const u = s.uiState;
  return { floor: u.floor, diff: u.difficulty, lv: u.level, job: u.charName, boss: u.floorName,
    bossHp: u.boss ? u.boss.max : null, under: u.underLeveled, elixCd: Math.round(u.elixirCdLeft) };
});
console.log('floor1 EASY:', JSON.stringify(await st()));
await page.screenshot({ path: '/tmp/v3-floor1.png' });

// 隣接階層のHP差(緩和確認): floor1,2,3,4,5 のボスHP
const hps = await page.evaluate(() => {
  const s = window.__PHASER_GAME__.scene.getScene('Game');
  const out = [];
  // data.tsのbossHpを直接は呼べないので、各floorをrestartして取得
  return out;
});
async function bossHpAt(floor, diff) {
  await page.evaluate((f, d) => { const s = window.__PHASER_GAME__.scene.getScene('Game'); s.progress.difficulty = d; s.scene.restart({ floor: f, difficulty: d }); }, floor, diff);
  await new Promise((r) => setTimeout(r, 1600));
  return page.evaluate(() => { const b = window.__PHASER_GAME__.scene.getScene('Game').boss; return b ? Math.round(b.maxhp) : 0; });
}
const h1 = await bossHpAt(1, 0), h2 = await bossHpAt(2, 0), h5 = await bossHpAt(5, 0);
console.log(`EASY HP floor1=${h1.toLocaleString()} floor2=${h2.toLocaleString()} (x${(h2/h1).toFixed(1)}) floor5=${h5.toLocaleString()}`);
// NORMAL/HARD/鬼 の floor1 HP(難易度スケール確認)
const n1 = await bossHpAt(1, 1), hd1 = await bossHpAt(1, 2), o1 = await bossHpAt(1, 3);
console.log(`floor1 HP EASY=${h1.toLocaleString()} NORMAL=${n1.toLocaleString()} HARD=${hd1.toLocaleString()} 鬼=${o1.toLocaleString()}`);

// EXP増の確認: floor5でボス撃破して得EXPとレベル
await page.evaluate(() => { const s = window.__PHASER_GAME__.scene.getScene('Game'); s.progress.level = 16; s.progress.exp = 0; s.scene.restart({ floor: 5, difficulty: 0 }); });
await new Promise((r) => setTimeout(r, 1700));
const before = await page.evaluate(() => { const s = window.__PHASER_GAME__.scene.getScene('Game'); return { lv: s.progress.level, exp: s.progress.exp, need: (40*Math.pow(s.progress.level,2.1))|0 }; });
await page.evaluate(() => { const s = window.__PHASER_GAME__.scene.getScene('Game'); if (s.boss) { s.boss.hp = 1; s.hitEnemy(s.boss, 99, 1); } });
await new Promise((r) => setTimeout(r, 1400));
const after = await page.evaluate(() => { const s = window.__PHASER_GAME__.scene.getScene('Game'); return { lv: s.progress.level, exp: s.progress.exp }; });
console.log('EXP gain floor5 major @Lv16:', JSON.stringify({ before, after }));

// エリクサーCT確認
await page.evaluate(() => { const s = window.__PHASER_GAME__.scene.getScene('Game'); s.progress.elixirs = 5; s.elixirCdUntil = 0; s.useElixir(); });
const cd = await page.evaluate(() => { const s = window.__PHASER_GAME__.scene.getScene('Game'); return Math.round(s.uiState.elixirCdLeft); });
console.log('elixir CD after use (ms):', cd);

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
