import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--mute-audio'], defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2} });
const page = await browser.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:4173/', { waitUntil:'networkidle0' });
await page.evaluate(()=>localStorage.setItem('maple-quest-save-v3', JSON.stringify({level:110,exp:0,charKey:'warrior',charLevels:{warrior:{level:110,exp:0},mage:{level:110,exp:0},thief:{level:110,exp:0}},highestByDiff:[1,1,1,1],clearedByDiff:[false,false,false,false],clears:0})));
await page.reload({ waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,1800));
const info = await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return {vh:c.height,rect:c.getBoundingClientRect()};});
await page.evaluate(()=>{ const g=window.__PHASER_GAME__; g.scene.getScene('Title').scene.start('Game',{floor:1,difficulty:0}); });
await new Promise(r=>setTimeout(r,2600));
const r1 = await page.evaluate(()=>{
  const s=window.__PHASER_GAME__.scene.getScene('Game');
  s.charState.mp = 1e12;
  const names = s.uiState.skills.map(k=>k.name);
  // スキル0発動 → 直後にスキル1を試す(ロックで弾かれるはず)
  s.doSkill(0);
  const cd1Before = s.skillCdAt[1];
  s.doSkill(1);
  const blocked = s.skillCdAt[1] === cd1Before;
  return { warrior5: names, castLockActive: s.castLockUntil > s.time.now, blocked };
});
console.log('戦士5次:', JSON.stringify(r1));
// 魔法使い4次のスキル順(CT昇順)確認
const r2 = await page.evaluate(()=>{
  const s=window.__PHASER_GAME__.scene.getScene('Game');
  s.progress.charKey='mage'; s.progress.level=60; s.buildUiState();
  const m4 = s.uiState.skills.map(k=>k.name);
  s.progress.level=110; s.buildUiState();
  const m5 = s.uiState.skills.map(k=>k.name);
  s.progress.charKey='warrior'; s.buildUiState();
  return { m4, m5 };
});
console.log('魔4次/5次:', JSON.stringify(r2));
console.log(errs.length?'ERR:'+errs.slice(0,2).join('|'):'no errors');
await browser.close();
