import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--mute-audio'], defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2} });
const p = await b.newPage();
await p.goto('http://localhost:4173/', { waitUntil:'networkidle0' });
await p.evaluate(()=>localStorage.removeItem('maple-quest-save-v3'));
await p.reload({ waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,2200));
await p.screenshot({ path:'/tmp/v7-title.png' });
await b.close(); console.log('done');
