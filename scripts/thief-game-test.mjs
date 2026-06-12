import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--mute-audio'], defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2} });
const page = await browser.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:4173/', { waitUntil:'networkidle0' });
await page.evaluate(()=>localStorage.setItem('maple-quest-save-v3', JSON.stringify({level:110,exp:0,charKey:'thief',charLevels:{warrior:{level:120,exp:0},mage:{level:50,exp:0},thief:{level:110,exp:0}},highestByDiff:[20,1,1,1],clearedByDiff:[true,false,false,false],clears:1})));
await page.reload({ waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,1800));
const info = await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},vw:c.width,vh:c.height};});
const {rect,vw,vh}=info; const S=(vx,vy)=>({x:rect.x+(vx/vw)*rect.w,y:rect.y+(vy/vh)*rect.h});
await page.touchscreen.tap(S(270, vh-552).x, S(270, vh-552).y); // 無限ボス
await new Promise(r=>setTimeout(r,2400));
const sk = await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); return { skills: s.uiState.skills.map(k=>k.name), char: s.uiState.charName, weapon: s.weapon.texture.key }; });
console.log('盗賊5次:', JSON.stringify(sk));
// シャドーパートナー(skill[2])発動 → 分身4体
await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); s.player.x=s.boss.x-100; s.charState.mp=s.maxMp('thief'); });
await page.touchscreen.tap(S(402, vh-250).x, S(402, vh-250).y);
await new Promise(r=>setTimeout(r,700));
const sh = await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); return { shadows: s.shadowSprites.length, mul: s.shadowMul() }; });
console.log('シャドーパートナー:', JSON.stringify(sh));
// クアドラプルスロー連打 → 総ダメージ(本体+分身エコー)
const t0 = await page.evaluate(()=>window.__PHASER_GAME__.scene.getScene('Game').inf.total);
for (let i=0;i<4;i++){ await page.touchscreen.tap(S(332, vh-78).x, S(332, vh-78).y); await new Promise(r=>setTimeout(r,850)); }
await new Promise(r=>setTimeout(r,1200));
const t1 = await page.evaluate(()=>window.__PHASER_GAME__.scene.getScene('Game').inf.total);
console.log('クアドラプルスロー×4 総ダメージ:', Math.round((t1-t0)/1e4)+'万');
await page.screenshot({ path:'/tmp/thief-battle.png' });
console.log(errs.length?'ERR:'+errs.slice(0,2).join('|'):'no errors');
await browser.close();
