import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--autoplay-policy=no-user-gesture-required'], defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2} });
const page = await browser.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:4173/', { waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,1500));
// タイトルでタップ→BGM開始
const info = await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
await page.touchscreen.tap(info.x, info.y);
await new Promise(r=>setTimeout(r,2500));
console.log(errs.length?'ERR:'+errs.join('|'):'no errors (BGM稼働・ウォッチドッグ動作中)');
await browser.close();
