import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--mute-audio'], defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2} });
const page = await browser.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await page.goto('http://localhost:4173/', { waitUntil:'networkidle0' });
await page.evaluate(()=>localStorage.setItem('maple-quest-save-v3', JSON.stringify({level:60,exp:0,charKey:'warrior',highestByDiff:[1,1,1,1],clearedByDiff:[false,false,false,false],clears:0})));
await page.reload({ waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,2200));
const info = await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},vw:c.width,vh:c.height};});
const {rect,vw,vh}=info; const S=(vx,vy)=>({x:rect.x+(vx/vw)*rect.w,y:rect.y+(vy/vh)*rect.h});
// 無限ボスで検証(安定してボスがいる)
await page.touchscreen.tap(S(270, vh-552).x, S(270, vh-552).y);
await new Promise(r=>setTimeout(r,2400));
// 戦士Lv60=4次。スキル名確認
const wskills = await page.evaluate(()=>window.__PHASER_GAME__.scene.getScene('Game').uiState.skills.map(k=>k.name));
console.log('戦士4次 skills:', JSON.stringify(wskills));
// グングニル(skill[1]) — 最大HP比例の多段
await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); s.player.x=s.boss.x-30; s.charState.mp=s.maxMp('warrior'); });
const t0 = await page.evaluate(()=>window.__PHASER_GAME__.scene.getScene('Game').inf.total);
await page.touchscreen.tap(S(322, vh-188).x, S(322, vh-188).y); // skill[1] グングニル
await new Promise(r=>setTimeout(r,1300));
const t1 = await page.evaluate(()=>window.__PHASER_GAME__.scene.getScene('Game').inf.total);
console.log('グングニル damage:', Math.round((t1-t0)/1e4)+'万', '(maxHPに比例した多段)');
// ダークスピリット(skill[2]) 召喚 → 召喚獣が出るか
await page.touchscreen.tap(S(402, vh-250).x, S(402, vh-250).y);
await new Promise(r=>setTimeout(r,2600));
const summon = await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); return { keys: Object.keys(s.summons), sumBuffActive: s.sumBuff.until > s.time.now }; });
console.log('ダークスピリット召喚:', JSON.stringify(summon));
await page.screenshot({ path:'/tmp/skills4-warrior.png' });

// 魔法使いに切替えてエルクィネス/フリージングブレス
await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); s.progress.charKey='mage'; s.buildUiState(); });
await new Promise(r=>setTimeout(r,300));
const mskills = await page.evaluate(()=>window.__PHASER_GAME__.scene.getScene('Game').uiState.skills.map(k=>k.name));
console.log('魔4次 skills:', JSON.stringify(mskills));
console.log(errs.length?'ERR:'+errs.join('|'):'no errors');
await browser.close();
