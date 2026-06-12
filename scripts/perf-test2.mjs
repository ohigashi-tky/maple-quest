import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--mute-audio'], defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2} });

async function run(patch) {
  const page = await browser.newPage();
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 }); // スマホ相当に減速
  await page.goto('http://localhost:4173/', { waitUntil:'networkidle0' });
  await page.evaluate(()=>localStorage.setItem('maple-quest-save-v3', JSON.stringify({level:110,exp:0,charKey:'thief',charLevels:{warrior:{level:1,exp:0},mage:{level:1,exp:0},thief:{level:110,exp:0}},highestByDiff:[1,1,1,1],clearedByDiff:[false,false,false,false],clears:0})));
  await page.reload({ waitUntil:'networkidle0' });
  await new Promise(r=>setTimeout(r,2200));
  const info = await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},vw:c.width,vh:c.height};});
  const {rect,vw,vh}=info; const S=(vx,vy)=>({x:rect.x+(vx/vw)*rect.w,y:rect.y+(vy/vh)*rect.h});
  await page.touchscreen.tap(S(270, vh-552).x, S(270, vh-552).y);
  await new Promise(r=>setTimeout(r,2800));
  await page.evaluate((mode)=>{
    const s = window.__PHASER_GAME__.scene.getScene('Game');
    s.player.x = s.boss.x - 90; s.charState.mp = 1e12;
    s.skShadow({name:'シャドーパートナー',kind:'shadow',mult:0,hits:0,targets:4,durMs:60000,mp:0,cd:0});
    if (mode==='noDmgNum') s.damageNumber = ()=>{};
    if (mode==='noFlash') { const ob = s.hitEnemy.bind(s); for (const b of s.bosses) { b.setTintFill = ()=>b; b.setTint = ()=>b; } }
    if (mode==='noStar') { const orig = s.add.image.bind(s.add); s.add.image = (x,y,t,...a)=> { const im = orig(x,y,t,...a); if (t==='fx_star_0') im.setVisible(false); return im; }; }
  }, patch);
  const fpsArr = [];
  const t0 = Date.now();
  const spam = (async()=>{ while(Date.now()-t0 < 7000){ await page.touchscreen.tap(S(332, vh-78).x, S(332, vh-78).y); await new Promise(r=>setTimeout(r,160)); } })();
  const meas = (async()=>{ while(Date.now()-t0 < 7000){ await new Promise(r=>setTimeout(r,400)); fpsArr.push(await page.evaluate(()=>window.__PHASER_GAME__.loop.actualFps)); } })();
  await Promise.all([spam, meas]);
  await page.close();
  const tail = fpsArr.slice(3); // ウォームアップ除外
  const avg = tail.reduce((a,b)=>a+b,0)/tail.length;
  return { avg: avg.toFixed(1), min: Math.min(...tail).toFixed(1) };
}

console.log('CPU 1/6相当・クアドラプル連打+影4体');
console.log('baseline(全部あり)   :', JSON.stringify(await run('base')));
console.log('ダメージ表記なし      :', JSON.stringify(await run('noDmgNum')));
console.log('被弾発光(tint)なし   :', JSON.stringify(await run('noFlash')));
console.log('ヒット星エフェクトなし:', JSON.stringify(await run('noStar')));
await browser.close();
