import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--mute-audio'], defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2} });
const page = await browser.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:4173/', { waitUntil:'networkidle0' });
await page.evaluate(()=>localStorage.removeItem('maple-quest-save-v3'));
await page.reload({ waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,2200));
const info = await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},vw:c.width,vh:c.height};});
const {rect,vw,vh}=info; const S=(vx,vy)=>({x:rect.x+(vx/vw)*rect.w,y:rect.y+(vy/vh)*rect.h});
await page.touchscreen.tap(S(270, vh-350).x, S(270, vh-350).y); // 挑戦
await new Promise(r=>setTimeout(r,1700));
// ボスに寄ってカメラに収める
await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); if(s.boss) s.player.x=s.boss.x-70; });
await new Promise(r=>setTimeout(r,500));
await page.screenshot({ path:'/tmp/up-floor1.png' });
// 5階 メジャーボス(でかい)+ epic
await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); s.progress.level=40; s.scene.restart({floor:5,difficulty:0}); });
await new Promise(r=>setTimeout(r,1800));
await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); if(s.boss) s.player.x=s.boss.x-90; });
await new Promise(r=>setTimeout(r,500));
await page.screenshot({ path:'/tmp/up-floor5.png' });
// 15階 ザクム(でかい・暗テーマ)
await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); s.scene.restart({floor:15,difficulty:0}); });
await new Promise(r=>setTimeout(r,1800));
await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); if(s.boss) s.player.x=s.boss.x-100; });
await new Promise(r=>setTimeout(r,500));
await page.screenshot({ path:'/tmp/up-floor15.png' });
console.log(errs.length?'ERR:'+errs.join('|'):'no errors');
await browser.close();
