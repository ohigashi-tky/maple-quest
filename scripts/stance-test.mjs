import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--mute-audio'], defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2} });
const page = await browser.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:4173/', { waitUntil:'networkidle0' });
// 1次戦士(Lv5)でノックバックされる、5次(Lv120)でスタンス
async function stanceTest(level, charKey){
  await page.evaluate((lv,ck)=>localStorage.setItem('maple-quest-save-v3', JSON.stringify({level:lv,exp:0,charKey:ck,highestByDiff:[1,1,1,1],clearedByDiff:[false,false,false,false],clears:0})), level, charKey);
  await page.reload({ waitUntil:'networkidle0' });
  await new Promise(r=>setTimeout(r,2200));
  const info = await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},vw:c.width,vh:c.height};});
  const {rect,vw,vh}=info; const S=(vx,vy)=>({x:rect.x+(vx/vw)*rect.w,y:rect.y+(vy/vh)*rect.h});
  await page.touchscreen.tap(S(270, vh-464).x, S(270, vh-464).y); // 挑戦
  await new Promise(r=>setTimeout(r,2000));
  // 何度も被弾させてノックバック発生率を測る
  let kb=0, total=0;
  for(let i=0;i<40;i++){
    const r = await page.evaluate(()=>{
      const s=window.__PHASER_GAME__.scene.getScene('Game');
      if(!s.boss) return null;
      s.player.x = s.boss.x; // 接触
      s.invulnUntil = 0;
      const vx0 = s.player.body.velocity.x;
      s.hurtPlayer(50);
      const vx1 = s.player.body.velocity.x;
      return { knocked: Math.abs(vx1) > 100 };
    });
    if(r){ total++; if(r.knocked) kb++; }
    await new Promise(r=>setTimeout(r,60));
  }
  return { level, charKey, knockbackRate: total? Math.round(100*kb/total): -1, n: total };
}
console.log(JSON.stringify(await stanceTest(5,'warrior')));   // 1次戦士: stance20% → KB~80%
console.log(JSON.stringify(await stanceTest(120,'warrior'))); // 5次戦士: stance100% → KB 0%
console.log(JSON.stringify(await stanceTest(120,'mage')));    // 5次魔: stance50% → KB~50%
console.log(errs.length?'ERR:'+errs.join('|'):'no errors');
await browser.close();
