import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--mute-audio'], defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2} });
const page = await browser.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:4173/', { waitUntil:'networkidle0' });
await page.evaluate(()=>localStorage.setItem('maple-quest-save-v3', JSON.stringify({level:110,exp:0,charKey:'warrior',charLevels:{warrior:{level:110,exp:0},mage:{level:1,exp:0},thief:{level:1,exp:0}},highestByDiff:[1,1,1,1],clearedByDiff:[false,false,false,false],clears:0})));
await page.reload({ waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,1800));
const info = await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},vw:c.width,vh:c.height};});
const {rect,vw,vh}=info; const S=(vx,vy)=>({x:rect.x+(vx/vw)*rect.w,y:rect.y+(vy/vh)*rect.h});
await page.touchscreen.tap(S(270, vh-552).x, S(270, vh-552).y);
await new Promise(r=>setTimeout(r,2400));
const r1 = await page.evaluate(()=>{
  const s=window.__PHASER_GAME__.scene.getScene('Game');
  s.player.x=s.boss.x-90; s.charState.mp=1e9;
  s.doSkill(1); // ピアスサイクロン
  // 直後に別スキルが使えるか(500ms後にインペール)
  return new Promise(res=>setTimeout(()=>{
    const cd0 = s.skillCdAt[0];
    s.doSkill(0);
    res({ cycloneActive: s.channelUntil > s.time.now, otherSkillUsable: s.skillCdAt[0] !== cd0 });
  }, 500));
});
console.log('サイクロン常駐+他スキル:', JSON.stringify(r1));
await new Promise(r=>setTimeout(r,300));
await page.screenshot({ path:'/tmp/cyclone.png' });
console.log(errs.length?'ERR:'+errs.slice(0,2).join('|'):'no errors');
await browser.close();
