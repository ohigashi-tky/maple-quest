import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--mute-audio'], defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2} });
const page = await browser.newPage();
try { await page.emulateMediaFeatures([{ name:'display-mode', value:'standalone' }]); } catch(e){ console.log('emulate not supported'); }
await page.goto('http://localhost:4173/', { waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,1500));
// SAFE_TOP のロジックを in-page で再現して確認
const r = await page.evaluate(()=>{
  const VIEW_W=540; const aspect=innerHeight/Math.max(1,innerWidth);
  const VIEW_H=Math.max(960, Math.min(1200, Math.round((VIEW_W*aspect)/2)*2));
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator.standalone===true);
  const probe=document.createElement('div');
  probe.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;visibility:hidden;padding-top:env(safe-area-inset-top,0px);';
  document.body.appendChild(probe);
  let inset=parseFloat(getComputedStyle(probe).paddingTop)||0;
  probe.remove();
  if(standalone && inset<20) inset=Math.max(inset,50);
  const units=Math.round(inset*VIEW_H/Math.max(1,innerHeight));
  return { standalone, insetPx:inset, VIEW_H, units };
});
console.log('SAFE_TOP calc:', JSON.stringify(r));
await browser.close();
