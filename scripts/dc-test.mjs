import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--mute-audio'], defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2} });
const page = await browser.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:4173/', { waitUntil:'networkidle0' });
await page.evaluate(()=>localStorage.setItem('maple-quest-save-v3', JSON.stringify({level:110,exp:0,charKey:'warrior',charLevels:{warrior:{level:110,exp:0},mage:{level:110,exp:0},thief:{level:110,exp:0}},highestByDiff:[1,1,1,1],clearedByDiff:[false,false,false,false],clears:0})));
await page.reload({ waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,1800));
const info = await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},vw:c.width,vh:c.height};});
const {rect,vw,vh}=info; const S=(vx,vy)=>({x:rect.x+(vx/vw)*rect.w,y:rect.y+(vy/vh)*rect.h});
await page.touchscreen.tap(S(270, vh-552).x, S(270, vh-552).y); // 無限ボス
await new Promise(r=>setTimeout(r,2400));
const names = await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); s.player.x=s.boss.x-100; s.charState.mp=1e12; return s.uiState.skills.map(k=>k.name); });
console.log('戦士5次:', JSON.stringify(names));
const t0 = await page.evaluate(()=>window.__PHASER_GAME__.scene.getScene('Game').inf.total);
await page.evaluate(()=>window.__PHASER_GAME__.scene.getScene('Game').doSkill(2)); // ダークシンセンス
await new Promise(r=>setTimeout(r,350));
await page.screenshot({ path:'/tmp/darkcross.png' });
await new Promise(r=>setTimeout(r,900));
const t1 = await page.evaluate(()=>window.__PHASER_GAME__.scene.getScene('Game').inf.total);
console.log('ダークシンセンス damage:', Math.round((t1-t0)/1e4)+'万 (400%×10)');
console.log(errs.length?'ERR:'+errs.slice(0,2).join('|'):'no errors');
await browser.close();
