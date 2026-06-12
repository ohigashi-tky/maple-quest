import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--mute-audio'], defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2} });
const page = await browser.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:4173/', { waitUntil:'networkidle0' });
await page.evaluate(()=>localStorage.setItem('maple-quest-save-v3', JSON.stringify({level:35,exp:0,charKey:'thief',charLevels:{warrior:{level:1,exp:0},mage:{level:1,exp:0},thief:{level:35,exp:0}},highestByDiff:[20,1,1,1],clearedByDiff:[false,false,false,false],clears:0})));
await page.reload({ waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,1800));
await page.evaluate(()=>{ const g=window.__PHASER_GAME__; g.scene.getScene('Title').scene.start('Game',{floor:2,difficulty:0}); g.scene.getScene('Title').scene.launch?.('Hud'); });
await new Promise(r=>setTimeout(r,900));
await page.screenshot({ path:'/tmp/rift.png' }); // リフト出現中
await new Promise(r=>setTimeout(r,2200));
const d = await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); return { bosses: s.bosses.length, alive: s.aliveBosses().length, skills: s.uiState.skills.map(k=>k.name) }; });
console.log('2階(偶数層):', JSON.stringify(d));
// 巨大クナイ + シャドーパートナー + トリプルスロー
const info = await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},vw:c.width,vh:c.height};});
const {rect,vw,vh}=info; const S=(vx,vy)=>({x:rect.x+(vx/vw)*rect.w,y:rect.y+(vy/vh)*rect.h});
await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); s.player.x = 200; s.charState.mp = s.maxMp('thief'); });
await page.touchscreen.tap(S(402, vh-250).x, S(402, vh-250).y); // シャドーパートナー×2
await new Promise(r=>setTimeout(r,500));
await page.touchscreen.tap(S(432, vh-138).x, S(432, vh-138).y); // skill[1] 巨大クナイ
await new Promise(r=>setTimeout(r,350));
await page.screenshot({ path:'/tmp/kunai.png' });
await new Promise(r=>setTimeout(r,500));
// トリプルスロー連打でダメージ表記確認
for(let i=0;i<3;i++){ await page.touchscreen.tap(S(332, vh-78).x, S(332, vh-78).y); await new Promise(r=>setTimeout(r,300)); }
await new Promise(r=>setTimeout(r,200));
await page.screenshot({ path:'/tmp/dmgnum.png' });
const d2 = await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); return { shadows: s.shadowSprites.length, alive: s.aliveBosses().length }; });
console.log('影/生存ボス:', JSON.stringify(d2));
console.log(errs.length?'ERR:'+errs.slice(0,3).join('|'):'no errors');
await browser.close();
