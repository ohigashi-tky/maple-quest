import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--mute-audio'], defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2} });
const page = await browser.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:4173/', { waitUntil:'networkidle0' });
// 既存セーブ(戦士Lv120)からの移行を確認しつつ盗賊へ切替
await page.evaluate(()=>localStorage.setItem('maple-quest-save-v3', JSON.stringify({level:120,exp:0,charKey:'warrior',highestByDiff:[20,1,1,1],clearedByDiff:[true,false,false,false],clears:1})));
await page.reload({ waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,1800));
// パネルタップ→モーダル
const info = await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},vw:c.width,vh:c.height};});
const {rect,vw,vh}=info; const S=(vx,vy)=>({x:rect.x+(vx/vw)*rect.w,y:rect.y+(vy/vh)*rect.h});
await page.touchscreen.tap(S(270, 312).x, S(270, 312).y);
await new Promise(r=>setTimeout(r,700));
await page.screenshot({ path:'/tmp/char-modal.png' });
// 盗賊の行(モーダル3行目 cy+30+... vh/2 - 110 + 2*140 = vh/2+170)
await page.touchscreen.tap(S(270, vh/2 + 170).x, S(270, vh/2 + 170).y);
await new Promise(r=>setTimeout(r,1500));
const save1 = await page.evaluate(()=>JSON.parse(localStorage.getItem('maple-quest-save-v3')));
console.log('切替後save:', JSON.stringify({charKey:save1.charKey, level:save1.level, charLevels:save1.charLevels}));
await page.screenshot({ path:'/tmp/title-thief.png' });
console.log(errs.length?'ERR:'+errs.join('|'):'no errors');
await browser.close();
