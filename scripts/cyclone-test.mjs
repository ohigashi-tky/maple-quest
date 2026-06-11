import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--mute-audio'], defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2} });
const page = await browser.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await page.goto('http://localhost:4173/', { waitUntil:'networkidle0' });
await page.evaluate(()=>localStorage.setItem('maple-quest-save-v3', JSON.stringify({level:120,exp:0,charKey:'warrior',highestByDiff:[20,1,1,1],clearedByDiff:[true,false,false,false],clears:1})));
await page.reload({ waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,2200));
const info = await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},vw:c.width,vh:c.height};});
const {rect,vw,vh}=info; const S=(vx,vy)=>({x:rect.x+(vx/vw)*rect.w,y:rect.y+(vy/vh)*rect.h});
// 5次戦士のスキル名確認
const skills = await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Title'); return null; }).catch(()=>null);
// 無限ボスへ
await page.touchscreen.tap(S(270, vh-552).x, S(270, vh-552).y);
await new Promise(r=>setTimeout(r,2400));
const sk = await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); return { job:s.uiState.charName, skills:s.uiState.skills.map(k=>k.name), stance: Math.round(100*(s.progress.level>=100?1:0)) }; });
console.log('5次戦士 skills:', JSON.stringify(sk.skills), 'job:', sk.job);
// スタンス確認(戦士Lv120=5次=100%)
const stance = await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); return { w: (window.__STANCE_W__=undefined), }; });
const stanceVals = await page.evaluate(()=>{
  // stanceChance is module-internal; emulate via tierIndex: w Lv120 -> idx4 -> 100%, mage same
  return 'see-data';
});
// ピアスサイクロン(skill index 2)を発動して5秒チャネルでボスHPが削れ続けるか
await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); if(s.boss) s.player.x=s.boss.x-30; s.charState.mp=s.maxMp('warrior'); });
const before = await page.evaluate(()=>window.__PHASER_GAME__.scene.getScene('Game').inf.total);
await page.touchscreen.tap(S(402, vh-250).x, S(402, vh-250).y); // skill[2] cyclone button
// 5秒チャネル中の累計ダメージ増加を観測
const samples=[];
for(let i=0;i<6;i++){ await new Promise(r=>setTimeout(r,800)); samples.push(await page.evaluate(()=>Math.round(window.__PHASER_GAME__.scene.getScene('Game').inf.total))); }
console.log('cyclone total over time:', JSON.stringify(samples.map(v=>Math.round(v/1e4)+'万')));
await page.screenshot({ path:'/tmp/cyclone.png' });
console.log(errs.length?'ERR:'+errs.join('|'):'no errors');
await browser.close();
