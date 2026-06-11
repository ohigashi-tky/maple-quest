import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--mute-audio'], defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2} });
const page = await browser.newPage();
await page.goto('http://localhost:4173/', { waitUntil:'networkidle0' });
await page.evaluate(()=>localStorage.removeItem('maple-quest-save-v3'));
await page.reload({ waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,2200));
const info = await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},vw:c.width,vh:c.height};});
const {rect,vw,vh}=info; const S=(vx,vy)=>({x:rect.x+(vx/vw)*rect.w,y:rect.y+(vy/vh)*rect.h});
await page.touchscreen.tap(S(270, vh-350).x, S(270, vh-350).y);
await new Promise(r=>setTimeout(r,1700));
for (const [f,label] of [[3,'knight'],[9,'witch'],[12,'clown'],[20,'lord']]) {
  await page.evaluate((fl)=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); s.progress.level=Math.max(s.progress.level, fl*9); s.scene.restart({floor:fl,difficulty:0}); }, f);
  await new Promise(r=>setTimeout(r,1800));
  // ボスを画面中央寄りに固定し、AIを一瞬止める
  await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); const b=s.boss; if(b){ b.stunUntil = s.time.now+4000; b.x = s.player.x + 70; b.y = b.flying ? s.GROUND_Y-100 : 392; if(b.body) b.body.setVelocity(0,0); } });
  await new Promise(r=>setTimeout(r,300));
  await page.screenshot({ path:`/tmp/v4b-${f}-${label}.png` });
}
await browser.close(); console.log('done');
