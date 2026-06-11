import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--mute-audio'], defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2} });
const page = await browser.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:4173/', { waitUntil:'networkidle0' });
await page.evaluate(()=>localStorage.setItem('maple-quest-save-v3', JSON.stringify({level:120,exp:0,charKey:'warrior',highestByDiff:[1,1,1,1],clearedByDiff:[false,false,false,false],clears:0})));
await page.reload({ waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,2200));
const info = await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},vw:c.width,vh:c.height};});
const {rect,vw,vh}=info; const S=(vx,vy)=>({x:rect.x+(vx/vw)*rect.w,y:rect.y+(vy/vh)*rect.h});
await page.touchscreen.tap(S(270, vh-464).x, S(270, vh-464).y);
await new Promise(r=>setTimeout(r,2000));
// 魔法使いに切替えてKB率測定
const res = await page.evaluate(()=>{
  const s=window.__PHASER_GAME__.scene.getScene('Game');
  s.progress.charKey='mage';
  let kb=0,total=0;
  for(let i=0;i<200;i++){
    if(!s.boss) break;
    s.player.x=s.boss.x; s.invulnUntil=0;
    s.hurtPlayer(50);
    total++; if(Math.abs(s.player.body.velocity.x)>100) kb++;
  }
  return { knockbackRate: Math.round(100*kb/total), n: total };
});
console.log('5次魔法使い(stance50%):', JSON.stringify(res));
console.log(errs.length?'ERR:'+errs.join('|'):'no errors');
await browser.close();
