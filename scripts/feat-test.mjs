import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--mute-audio'], defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2} });
const page = await browser.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await page.goto('http://localhost:4173/', { waitUntil:'networkidle0' });
await page.evaluate(()=>localStorage.removeItem('maple-quest-save-v3'));
await page.reload({ waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,2200));
const info = await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},vw:c.width,vh:c.height};});
const {rect,vw,vh}=info; const S=(vx,vy)=>({x:rect.x+(vx/vw)*rect.w,y:rect.y+(vy/vh)*rect.h});
await page.touchscreen.tap(S(270, vh-350).x, S(270, vh-350).y);
await new Promise(r=>setTimeout(r,1700));
// 転職レベル確認
const jobs = await page.evaluate(()=>{
  const s=window.__PHASER_GAME__.scene.getScene('Game');
  const tf=(lv)=>{ s.progress.level=lv; return s.uiState && s.jobTier ? s.jobTier.jobName : '?'; };
  // jobTier is getter; set level and read via tierFor through buildUiState
  const out={};
  for(const lv of [1,10,30,60,100]){ s.progress.level=lv; s.buildUiState(); out[lv]=s.uiState.charName+' '+s.uiState.rankName; }
  return out;
});
console.log('転職Lv:', JSON.stringify(jobs));
// クリアでエリクサー+5
const elxr = await page.evaluate(()=>{
  const s=window.__PHASER_GAME__.scene.getScene('Game');
  s.progress.level=40; s.progress.elixirs=3; s.scene.restart({floor:1,difficulty:0}); return 0;
});
await new Promise(r=>setTimeout(r,1700));
const before = await page.evaluate(()=>window.__PHASER_GAME__.scene.getScene('Game').progress.elixirs);
await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); if(s.boss){s.boss.hp=1; s.hitEnemy(s.boss,99,1);} });
await new Promise(r=>setTimeout(r,1500));
const after = await page.evaluate(()=>window.__PHASER_GAME__.scene.getScene('Game').progress.elixirs);
console.log('エリクサー クリア前/後:', before, after);
// HP自然回復(戦士)
const regen = await page.evaluate(async ()=>{
  const s=window.__PHASER_GAME__.scene.getScene('Game');
  s.progress.charKey='warrior'; s.charState.hp = 1000; const h0=s.charState.hp;
  await new Promise(r=>setTimeout(r,1500));
  return { h0, h1: Math.round(s.charState.hp), max: s.maxHp('warrior') };
});
console.log('戦士HP自然回復(1.5s):', JSON.stringify(regen));
// エリクサーCT
await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); s.progress.elixirs=5; s.elixirCdUntil=0; s.useElixir(); });
const cd = await page.evaluate(()=>Math.round(window.__PHASER_GAME__.scene.getScene('Game').uiState.elixirCdLeft));
console.log('エリクサーCT(ms):', cd);
console.log(errs.length?'ERR:'+errs.join('|'):'no errors');
await browser.close();
