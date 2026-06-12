import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--mute-audio'], defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2} });
const page = await browser.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await page.goto('http://localhost:4173/', { waitUntil:'networkidle0' });
await page.evaluate(()=>localStorage.setItem('maple-quest-save-v3', JSON.stringify({level:110,exp:0,charKey:'mage',highestByDiff:[1,1,1,1],clearedByDiff:[false,false,false,false],clears:0})));
await page.reload({ waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,2200));
const info = await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},vw:c.width,vh:c.height};});
const {rect,vw,vh}=info; const S=(vx,vy)=>({x:rect.x+(vx/vw)*rect.w,y:rect.y+(vy/vh)*rect.h});
await page.touchscreen.tap(S(270, vh-552).x, S(270, vh-552).y);
await new Promise(r=>setTimeout(r,2400));
// 魔法使いに(挑戦は戦士固定なので切替)
await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); s.progress.charKey='mage'; s.buildUiState(); s.player.setTexture(s.spriteKey+'_0'); });
await new Promise(r=>setTimeout(r,300));
const sk = await page.evaluate(()=>window.__PHASER_GAME__.scene.getScene('Game').uiState.skills.map(k=>k.name));
console.log('魔5次 skills:', JSON.stringify(sk)); // フリージングブレス/サンダーブレイク/ブリザードストーム
// フリージングブレス(skill[0]) 発動 → 無敵&行動不能&減速
await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); s.player.x=s.boss.x-50; s.charState.mp=s.maxMp('mage'); s.skillCdAt=[0,0,0]; });
await page.touchscreen.tap(S(332, vh-78).x, S(332, vh-78).y); // skill[0]
await new Promise(r=>setTimeout(r,600));
const breath = await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); return { inputLocked: s.inputLockUntil>s.time.now, invuln: s.invulnUntil>s.time.now, bossSlowed: s.boss? (s.boss.slowUntil>s.time.now):false }; });
console.log('フリージングブレス:', JSON.stringify(breath));
await page.screenshot({ path:'/tmp/mage4-breath.png' });
await new Promise(r=>setTimeout(r,5000)); // チャネル終了待ち
// エルクィネス: Lv110は5次。4次のエルクィネスを見るためLv60に。簡易にsummonを直接呼ぶ
const elq = await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); s.skSummon({name:'エルクィネス', kind:'summon', mult:1.5, hits:3, durMs:20000, mp:12, cd:20000}); return Object.keys(s.summons); });
await new Promise(r=>setTimeout(r,500));
console.log('エルクィネス召喚:', JSON.stringify(elq));
await page.screenshot({ path:'/tmp/mage4-elquines.png' });
console.log(errs.length?'ERR:'+errs.join('|'):'no errors');
await browser.close();
