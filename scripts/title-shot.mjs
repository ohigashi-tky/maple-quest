import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--mute-audio'], defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2} });
const page = await browser.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:4173/', { waitUntil:'networkidle0' });
await page.evaluate(()=>{ const s=loadSaveRaw(); }).catch(()=>{});
// give a save with some progress to show reset is meaningful
await page.evaluate(()=>localStorage.setItem('maple-quest-save-v3', JSON.stringify({level:88,exp:0,charKey:'warrior',highestByDiff:[20,5,1,1],clearedByDiff:[true,false,false,false],clears:1})));
await page.reload({ waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,2200));
const info = await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},vw:c.width,vh:c.height};});
const {rect,vw,vh}=info; const S=(vx,vy)=>({x:rect.x+(vx/vw)*rect.w,y:rect.y+(vy/vh)*rect.h});
await page.screenshot({ path:'/tmp/v5-title.png' });
// tap reset button (VIEW_H-196)
await page.touchscreen.tap(S(270, vh-196).x, S(270, vh-196).y);
await new Promise(r=>setTimeout(r,500));
await page.screenshot({ path:'/tmp/v5-confirm.png' });
// cancel
const got = await page.evaluate(()=>'ok');
console.log('errs:', errs.length?errs.join('|'):'none');
await browser.close();
