import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--mute-audio'], defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2} });
const page = await browser.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await page.goto('http://localhost:4173/', { waitUntil:'networkidle0' });
// give a leveled save so damage is meaningful
await page.evaluate(()=>localStorage.setItem('maple-quest-save-v3', JSON.stringify({level:60,exp:0,charKey:'warrior',highestByDiff:[20,1,1,1],clearedByDiff:[true,false,false,false],clears:1})));
await page.reload({ waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,2200));
await page.screenshot({ path:'/tmp/inf-title.png' });
const info = await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},vw:c.width,vh:c.height};});
const {rect,vw,vh}=info; const S=(vx,vy)=>({x:rect.x+(vx/vw)*rect.w,y:rect.y+(vy/vh)*rect.h});
// 無限ボス(VIEW_H-552)
await page.touchscreen.tap(S(270, vh-552).x, S(270, vh-552).y);
await new Promise(r=>setTimeout(r,2400)); // titan出現
const st = ()=>page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); const u=s.uiState; return { inf:u.infinite, gauge:u.infGauge, hp:Math.round(u.infHp), max:Math.round(u.infMax), total:Math.round(u.infTotal), t:u.infTimeLeft, bossX: s.boss?Math.round(s.boss.x):null }; });
console.log('start:', JSON.stringify(await st()));
// プレイヤーをボスへ寄せて攻撃+スキル連打(数秒)
const atk=S(468,vh-92), sk=[S(332,vh-78),S(322,vh-188),S(402,vh-250)];
for(let i=0;i<14;i++){
  await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); if(s.boss) s.player.x=s.boss.x-30; s.charState.mp=s.maxMp(s.progress.charKey); });
  await page.touchscreen.tap(sk[0].x,sk[0].y); await new Promise(r=>setTimeout(r,90));
  await page.touchscreen.tap(sk[1].x,sk[1].y); await new Promise(r=>setTimeout(r,90));
  await page.touchscreen.tap(atk.x,atk.y); await new Promise(r=>setTimeout(r,90));
}
await new Promise(r=>setTimeout(r,400));
console.log('after wail:', JSON.stringify(await st()));
await page.screenshot({ path:'/tmp/inf-play.png' });
// タイマーを終了直前にして結果画面を出す
await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); s.inf.endAt = s.time.now + 200; });
await new Promise(r=>setTimeout(r,800));
await page.screenshot({ path:'/tmp/inf-result.png' });
console.log(errs.length?'ERR:'+errs.join('|'):'no errors');
await browser.close();
