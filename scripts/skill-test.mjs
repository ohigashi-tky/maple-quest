// 新スキル・5方向操作・ダメージスケール・エリクサーの検証
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
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(URL, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 2000));

const info = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  const r = c.getBoundingClientRect();
  return { rect: { x: r.x, y: r.y, w: r.width, h: r.height }, vw: c.width, vh: c.height };
});
const { rect, vw, vh } = info;
const S = (vx, vy) => ({ x: rect.x + (vx / vw) * rect.w, y: rect.y + (vy / vh) * rect.h });
await page.touchscreen.tap(S(270, vh - 420).x, S(270, vh - 420).y);
await new Promise((r) => setTimeout(r, 1500));

const state = () => page.evaluate(() => {
  const s = window.__PHASER_GAME__.scene.getScene('Game');
  return {
    lv: s.progress.level, job: s.uiState.charName,
    hp: s.uiState.hp, maxhp: s.uiState.maxhp,
    crit: Math.round(s.uiState.critRate * 100),
    elixirs: s.uiState.elixirs,
    skills: s.uiState.skills.map((k) => k.label),
  };
});
console.log('start:', JSON.stringify(await state()));

// ステージ3・3次職まで引き上げてダメージスケールを見る
await page.evaluate(() => {
  const s = window.__PHASER_GAME__.scene.getScene('Game');
  s.scene.restart({ stage: 2 });
});
await new Promise((r) => setTimeout(r, 1200));
await page.evaluate(() => {
  const s = window.__PHASER_GAME__.scene.getScene('Game');
  s.gainExp(5_000_000); // 一気にレベルを上げる
});
await new Promise((r) => setTimeout(r, 1200));
console.log('stage3 maxed:', JSON.stringify(await state()));

// 5方向ジャンプ確認(右上ジャンプ)
const beforeY = await page.evaluate(() => window.__PHASER_GAME__.scene.getScene('Game').player.y);
await page.touchscreen.touchStart(S(176, vh - 200).x, S(176, vh - 200).y);
await new Promise((r) => setTimeout(r, 250));
const jumpData = await page.evaluate(() => {
  const p = window.__PHASER_GAME__.scene.getScene('Game').player;
  return { y: p.y, vx: p.body.velocity.x, vy: p.body.velocity.y };
});
await page.touchscreen.touchEnd();
console.log('diagonal jump (vx>0, vy<0 expected):', JSON.stringify(jumpData), 'beforeY=', Math.round(beforeY));

// 各スキルを発動してエフェクト/ダメージを確認
const skillSlots = [S(330, vh - 76), S(318, vh - 176), S(378, vh - 262)];
for (let i = 0; i < 3; i++) {
  await page.touchscreen.tap(skillSlots[i].x, skillSlots[i].y);
  await new Promise((r) => setTimeout(r, 600));
}
await page.screenshot({ path: '/tmp/maple-sk-warrior.png' });

// 魔法使いに交代して3スキル発動
await page.touchscreen.tap(S(48, 178).x, S(48, 178).y);
await new Promise((r) => setTimeout(r, 600));
for (let i = 0; i < 3; i++) {
  await page.touchscreen.tap(skillSlots[i].x, skillSlots[i].y);
  await new Promise((r) => setTimeout(r, 700));
}
await page.screenshot({ path: '/tmp/maple-sk-mage.png' });
console.log('after skills:', JSON.stringify(await state()));

// エリクサー使用
await page.evaluate(() => { window.__PHASER_GAME__.scene.getScene('Game').charState ? null : null; });
const elxBefore = (await state()).elixirs;
await page.touchscreen.tap(S(250, vh - 232).x, S(250, vh - 232).y);
await new Promise((r) => setTimeout(r, 400));
console.log('elixir before/after:', elxBefore, (await state()).elixirs);

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
