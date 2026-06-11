import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--no-sandbox','--mute-audio'],
  defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.removeItem('maple-quest-save-v2'));
await page.reload({ waitUntil: 'networkidle0' });
await new Promise(r=>setTimeout(r,2200));
const info = await page.evaluate(() => { const c=document.querySelector('canvas'); const r=c.getBoundingClientRect(); return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},vw:c.width,vh:c.height}; });
const {rect,vw,vh}=info; const S=(vx,vy)=>({x:rect.x+(vx/vw)*rect.w,y:rect.y+(vy/vh)*rect.h});
await page.touchscreen.tap(S(270, vh-410).x, S(270, vh-410).y);
await new Promise(r=>setTimeout(r,1600));
// 各アーキタイプを見る: floor 5(demon major), 7(beast), 8(drake), 15(golem), 13(lord)
for (const f of [5,7,8,15,13]) {
  await page.evaluate((fl)=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); s.scene.restart({floor:fl}); }, f);
  await new Promise(r=>setTimeout(r,1800));
  // プレイヤーをボスの近くへ移動してカメラに収める
  await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); if(s.boss){ s.player.x = s.boss.x - 70; } });
  await new Promise(r=>setTimeout(r,500));
  await page.screenshot({ path:`/tmp/boss-arch-${f}.png` });
}
await browser.close();
console.log('done');
