import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--mute-audio'], defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2} });
const page = await browser.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await page.goto('http://localhost:4173/', { waitUntil:'networkidle0' });
await page.evaluate(()=>localStorage.removeItem('maple-quest-save-v3'));
await page.reload({ waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,2200));
await page.screenshot({ path:'/tmp/v6-title.png' });
const info = await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},vw:c.width,vh:c.height};});
const {rect,vw,vh}=info; const S=(vx,vy)=>({x:rect.x+(vx/vw)*rect.w,y:rect.y+(vy/vh)*rect.h});
// 挑戦(VIEW_H-380)
await page.touchscreen.tap(S(270, vh-380).x, S(270, vh-380).y);
await new Promise(r=>setTimeout(r,2200)); // ボス出現まで待つ
// 一時停止ボタン(右上 VIEW_W-74, iconY=108)
await page.touchscreen.tap(S(vw-74, 108).x, S(vw-74, 108).y);
await new Promise(r=>setTimeout(r,300));
const paused = await page.evaluate(()=>{ const g=window.__PHASER_GAME__; return { gamePaused: g.scene.isPaused('Game') }; });
// 一時停止中にHPが減らないか(2秒待つ)、ボス座標が動かないか
const before = await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); return { hp: Math.round(s.charState.hp), bx: s.boss?Math.round(s.boss.x):null }; });
await new Promise(r=>setTimeout(r,2000));
const after = await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); return { hp: Math.round(s.charState.hp), bx: s.boss?Math.round(s.boss.x):null }; });
console.log('pause active:', JSON.stringify(paused), 'HP/bossX before:', JSON.stringify(before), 'after 2s:', JSON.stringify(after));
await page.screenshot({ path:'/tmp/v6-pause.png' });
// 再開
await page.touchscreen.tap(S(270, vh/2 - 30).x, S(270, vh/2 - 30).y); // ゲームにもどる
await new Promise(r=>setTimeout(r,300));
const resumed = await page.evaluate(()=>!window.__PHASER_GAME__.scene.isPaused('Game'));
console.log('resumed:', resumed);
// ボスが動いて壁際固まりしないか: 3秒間のボスX範囲を記録
const xs=[];
for(let i=0;i<12;i++){ xs.push(await page.evaluate(()=>{ const b=window.__PHASER_GAME__.scene.getScene('Game').boss; return b?Math.round(b.x):null; })); await new Promise(r=>setTimeout(r,250)); }
console.log('boss X over 3s:', JSON.stringify(xs), 'range:', Math.max(...xs.filter(Number.isFinite))-Math.min(...xs.filter(Number.isFinite)));
console.log(errs.length?'ERR:'+errs.join('|'):'no errors');
await browser.close();
