// 道場20階システムの検証: クラス選択→階層進行→多段ヒット→MISS→転職→クリア
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

// セーブをクリアしてから開始
await page.goto(URL, { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.removeItem('maple-quest-save-v2'));
await page.reload({ waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 2200));

const info = await page.evaluate(() => {
  const c = document.querySelector('canvas'); const r = c.getBoundingClientRect();
  return { rect: { x: r.x, y: r.y, w: r.width, h: r.height }, vw: c.width, vh: c.height };
});
const { rect, vw, vh } = info;
const S = (vx, vy) => ({ x: rect.x + (vx / vw) * rect.w, y: rect.y + (vy / vh) * rect.h });

await page.screenshot({ path: '/tmp/dojo-title.png' });
// 「戦士で挑戦」ボタン
await page.touchscreen.tap(S(270, vh - 410).x, S(270, vh - 410).y);
await new Promise((r) => setTimeout(r, 2000));

const state = () => page.evaluate(() => {
  const s = window.__PHASER_GAME__.scene.getScene('Game');
  const u = s.uiState;
  return { floor: u.floor, total: u.total, lv: u.level, job: u.charName, rank: u.rankName,
    bossName: u.floorName, req: u.reqLevel, under: u.underLeveled,
    boss: u.boss ? { hp: u.boss.hp, max: u.boss.max } : null,
    skills: u.skills.map((k) => k.name), hp: u.hp, maxhp: u.maxhp, crit: Math.round(u.critRate*100) };
});
console.log('floor1 start:', JSON.stringify(await state()));
await new Promise((r) => setTimeout(r, 1400));
await page.screenshot({ path: '/tmp/dojo-floor1.png' });

// 多段ヒット確認: スキル1連打
const sk = [S(332, vh - 78), S(322, vh - 188), S(402, vh - 250)];
const atk = S(468, vh - 92);
for (let i = 0; i < 4; i++) { await page.touchscreen.tap(sk[0].x, sk[0].y); await new Promise((r)=>setTimeout(r,250)); }
await page.screenshot({ path: '/tmp/dojo-multihit.png' });

// レベルを上げて転職と高階層を見る(Lv120: 4次ダークナイト)
await page.evaluate(() => {
  const s = window.__PHASER_GAME__.scene.getScene('Game');
  s.gainExp(1e12); // 一気に上げる(LEVEL_CAPで頭打ち)
});
await new Promise((r) => setTimeout(r, 1200));
console.log('maxed:', JSON.stringify(await state()));

// ボスを倒してポータル→次階層
await page.evaluate(() => { const s = window.__PHASER_GAME__.scene.getScene('Game'); if (s.boss) { s.boss.hp = 1; s.hitEnemy(s.boss, 99, 1); } });
await new Promise((r) => setTimeout(r, 1600));
const after = await page.evaluate(() => { const s = window.__PHASER_GAME__.scene.getScene('Game'); return { portal: !!s.portal, bossGone: !s.boss }; });
console.log('after kill floor1:', JSON.stringify(after));

// ポータルへワープして2階へ
await page.evaluate(() => { const s = window.__PHASER_GAME__.scene.getScene('Game'); if (s.portal) s.player.setPosition(s.portal.x, s.portal.y); });
await new Promise((r) => setTimeout(r, 2200));
console.log('floor2:', JSON.stringify(await state()));
await page.screenshot({ path: '/tmp/dojo-floor2.png' });

// 高階層(15階=ザクム)を直接見る
await page.evaluate(() => { const s = window.__PHASER_GAME__.scene.getScene('Game'); s.scene.restart({ floor: 15 }); });
await new Promise((r) => setTimeout(r, 2200));
console.log('floor15:', JSON.stringify(await state()));
await page.screenshot({ path: '/tmp/dojo-floor15.png' });

// 20階=ブラックマゲ
await page.evaluate(() => { const s = window.__PHASER_GAME__.scene.getScene('Game'); s.scene.restart({ floor: 20 }); });
await new Promise((r) => setTimeout(r, 2200));
console.log('floor20:', JSON.stringify(await state()));
await page.screenshot({ path: '/tmp/dojo-floor20.png' });

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
