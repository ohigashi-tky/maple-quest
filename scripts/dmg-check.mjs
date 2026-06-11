import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--no-sandbox', '--mute-audio'],
  defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 2000));
const info = await page.evaluate(() => { const c=document.querySelector('canvas'); const r=c.getBoundingClientRect(); return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},vw:c.width,vh:c.height}; });
const { rect, vw, vh } = info;
const S=(vx,vy)=>({x:rect.x+(vx/vw)*rect.w,y:rect.y+(vy/vh)*rect.h});
await page.touchscreen.tap(S(270, vh-420).x, S(270, vh-420).y);
await new Promise((r)=>setTimeout(r,1500));
// stage3, lvUp, spawn enemy near player, attack
await page.evaluate(() => { const s=window.__PHASER_GAME__.scene.getScene('Game'); s.scene.restart({stage:2}); });
await new Promise((r)=>setTimeout(r,1200));
const res = await page.evaluate(() => {
  const s=window.__PHASER_GAME__.scene.getScene('Game');
  s.gainExp(3_000_000);
  // spawn a mob next to player
  const e = s.spawnEnemy(s.constructor.name ? window.__ENEMIES__ : null);
  return { lv: s.progress.level };
}).catch(e=>({err:String(e)}));
// Use boss for a guaranteed target
await page.evaluate(() => { const s=window.__PHASER_GAME__.scene.getScene('Game'); s.spawnBoss(); });
await new Promise((r)=>setTimeout(r,800));
// move toward boss and attack a few times
const atk = S(462, vh-96);
const dmgSamples = [];
for (let i=0;i<6;i++){
  await page.evaluate(() => { const s=window.__PHASER_GAME__.scene.getScene('Game'); const b=s.boss; if(b){ s.player.x=b.x-20; } });
  await page.touchscreen.tap(atk.x, atk.y);
  await new Promise((r)=>setTimeout(r,250));
}
// also a skill
await page.touchscreen.tap(S(330, vh-76).x, S(330, vh-76).y);
await new Promise((r)=>setTimeout(r,500));
const bossHp = await page.evaluate(() => { const b=window.__PHASER_GAME__.scene.getScene('Game').boss; return b?{hp:Math.round(b.hp),max:b.maxhp}:null; });
console.log('boss hp after hits:', JSON.stringify(bossHp));
await page.screenshot({ path: '/tmp/maple-dmg.png' });
console.log(errors.length ? 'ERRORS:\n'+errors.join('\n') : 'no page errors');
await browser.close();
