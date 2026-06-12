import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--mute-audio'], defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2} });
const page = await browser.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await page.goto('http://localhost:4173/', { waitUntil:'networkidle0' });
async function startInfinite(level, charKey){
  await page.evaluate((lv,ck)=>localStorage.setItem('maple-quest-save-v3', JSON.stringify({level:lv,exp:0,charKey:ck,highestByDiff:[1,1,1,1],clearedByDiff:[false,false,false,false],clears:0})),level,charKey);
  await page.reload({ waitUntil:'networkidle0' });
  await new Promise(r=>setTimeout(r,2000));
  const info = await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},vw:c.width,vh:c.height};});
  const {rect,vw,vh}=info; const S=(vx,vy)=>({x:rect.x+(vx/vw)*rect.w,y:rect.y+(vy/vh)*rect.h});
  await page.touchscreen.tap(S(270, vh-552).x, S(270, vh-552).y); // 無限ボス
  await new Promise(r=>setTimeout(r,2200));
  return {S,vh};
}
// 戦士5次(Lv100)で武器とダークインペール
const a = await startInfinite(100,'warrior');
await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); s.player.x=s.boss.x-40; });
await new Promise(r=>setTimeout(r,200));
const wst = await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); return { weaponTex: s.weapon.texture.key, scale: s.weapon.scaleX.toFixed(2), spriteKey: s.spriteKey }; });
console.log('戦士5次 武器:', JSON.stringify(wst));
await page.touchscreen.tap(a.S(232, a.vh-78).x, a.S(232, a.vh-78).y); // skill[0] ダークインペール
await new Promise(r=>setTimeout(r,500));
await page.screenshot({ path:'/tmp/v-warrior5.png' });
// 召喚獣を出して見た目確認
await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); s.skSummon({name:'ダークスピリット',kind:'summon',mult:1.3,hits:3,durMs:30000,mp:7,cd:30000}); });
await new Promise(r=>setTimeout(r,400));
await page.screenshot({ path:'/tmp/v-darkspirit.png' });

// 魔法使い4次(Lv60)で杖とエルクィネス
const b = await startInfinite(60,'mage');
await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); s.progress.charKey='mage'; s.buildUiState(); s.player.setTexture(s.spriteKey+'_0'); s.refreshWeapon(); s.skSummon({name:'エルクィネス',kind:'summon',mult:1.5,hits:3,targets:3,durMs:20000,mp:6,cd:20000}); });
await new Promise(r=>setTimeout(r,500));
const mst = await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); return { weaponTex: s.weapon.texture.key, scale: s.weapon.scaleX.toFixed(2) }; });
console.log('魔4次 武器:', JSON.stringify(mst));
await page.screenshot({ path:'/tmp/v-mage4.png' });
console.log(errs.length?'ERR:'+errs.slice(0,3).join('|'):'no errors');
await browser.close();
