import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--mute-audio'], defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2} });
const page = await browser.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:4173/', { waitUntil:'networkidle0' });
await page.evaluate(()=>localStorage.setItem('maple-quest-save-v3', JSON.stringify({level:40,exp:0,charKey:'warrior',highestByDiff:[3,1,1,1],clearedByDiff:[false,false,false,false],clears:0})));
await page.reload({ waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,2200));
const info = await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},vw:c.width,vh:c.height};});
const {rect,vw,vh}=info; const S=(vx,vy)=>({x:rect.x+(vx/vw)*rect.w,y:rect.y+(vy/vh)*rect.h});
await page.touchscreen.tap(S(270, vh-464).x, S(270, vh-464).y); // 挑戦
await new Promise(r=>setTimeout(r,2000));
// ボス即撃破→ポータル
await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); if(s.boss){s.boss.hp=1; s.hitEnemy(s.boss,99,1);} });
await new Promise(r=>setTimeout(r,1600));
const portal = await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); return s.portal?{x:Math.round(s.portal.x)}:null; });
// プレイヤーをポータルへ移動
await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); if(s.portal){ s.player.x=s.portal.x; s.player.y=s.portal.y; } });
await new Promise(r=>setTimeout(r,2200));
const fl = await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); return { floor: s.floor.floor, transitioning: s.transitioning }; });
console.log('portal:', JSON.stringify(portal), '→ after enter, floor:', JSON.stringify(fl));
console.log(errs.length?'ERR:'+errs.join('|'):'no errors');
await browser.close();
