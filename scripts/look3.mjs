import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--mute-audio'], defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2} });
const page = await browser.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await page.goto('http://localhost:4173/', { waitUntil:'networkidle0' });
await page.evaluate(()=>localStorage.removeItem('maple-quest-save-v3'));
await page.reload({ waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,2200));
await page.screenshot({ path:'/tmp/v4-title.png' });
const info = await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},vw:c.width,vh:c.height};});
const {rect,vw,vh}=info; const S=(vx,vy)=>({x:rect.x+(vx/vw)*rect.w,y:rect.y+(vy/vh)*rect.h});
await page.touchscreen.tap(S(270, vh-350).x, S(270, vh-350).y);
await new Promise(r=>setTimeout(r,1700));
// 人型ボスを順に: 3階faust(knight), 9階anego(witch), 12階pierre(clown), 13階vonleon(knight), 14階hilla(witch)
for (const [f,label] of [[3,'knight-faust'],[9,'witch-anego'],[12,'clown-pierre'],[14,'witch-hilla'],[20,'lord-blackmage']]) {
  await page.evaluate((fl)=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); s.progress.level=Math.max(s.progress.level, fl*8); s.scene.restart({floor:fl,difficulty:0}); }, f);
  await new Promise(r=>setTimeout(r,1700));
  await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); if(s.boss) s.player.x = s.boss.x - 80; });
  await new Promise(r=>setTimeout(r,500));
  await page.screenshot({ path:`/tmp/v4-${f}-${label}.png` });
}
// 難易度別 floor1 HP(段階間が強化されたか)
async function hp(f,d){ await page.evaluate((fl,df)=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); s.scene.restart({floor:fl,difficulty:df}); }, f,d); await new Promise(r=>setTimeout(r,1500)); return page.evaluate(()=>{ const b=window.__PHASER_GAME__.scene.getScene('Game').boss; return b?Math.round(b.maxhp):0; }); }
const e1=await hp(1,0), n1=await hp(1,1), h1=await hp(1,2), o1=await hp(1,3), e20=await hp(20,0);
console.log(`floor1 HP: EASY=${e1.toLocaleString()} NORMAL=${n1.toLocaleString()} HARD=${h1.toLocaleString()} 鬼=${o1.toLocaleString()} | EASY floor20=${e20.toLocaleString()}`);
console.log(errs.length?'ERR:'+errs.join('|'):'no errors');
await browser.close();
