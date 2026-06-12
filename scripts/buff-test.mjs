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
await page.touchscreen.tap(S(270, vh-464).x, S(270, vh-464).y);
await new Promise(r=>setTimeout(r,2000));
// 戦士Lv60=4次。各バフ効果を関数で検証
const res = await page.evaluate(()=>{
  const s=window.__PHASER_GAME__.scene.getScene('Game');
  const out={};
  // ハイパーボディ(2次相当を直接付与してmaxHP上昇を確認)
  const baseHp = s.maxHp('warrior');
  s.buffs.warrior = { atk:1, def:1, hp:1.6, cd:1, until: s.time.now+5000, name:'ハイパーボディ' };
  out.hyperBody = { base: Math.round(baseHp), buffed: Math.round(s.maxHp('warrior')), ratio: +(s.maxHp('warrior')/baseHp).toFixed(2) };
  // ドラゴンブラッド(atk1.6)
  const baseAtk = s.atk();
  s.buffs.warrior = { atk:1.6, def:1, hp:1, cd:1, until: s.time.now+5000, name:'' };
  out.dragonBlood = { ratio: +(s.atk()/baseAtk).toFixed(2) };
  // アイアンボディ(被ダメ0.5) — hurtPlayerで確認
  s.buffs.warrior = { atk:1, def:0.5, hp:1, cd:1, until: s.time.now+5000, name:'' };
  s.charState.hp = 1e9; s.invulnUntil=0; s.hurtPlayer(1000);
  const dmgWithDef = 1e9 - s.charState.hp;
  s.buffs.warrior = { atk:1, def:1, hp:1, cd:1, until:0, name:'' };
  s.charState.hp = 1e9; s.invulnUntil=0; s.hurtPlayer(1000);
  const dmgNoDef = 1e9 - s.charState.hp;
  out.ironBody = { dmgNoDef: Math.round(dmgNoDef), dmgWithDef: Math.round(dmgWithDef), ratio: +(dmgWithDef/dmgNoDef).toFixed(2) };
  // スペルブースター(cd0.55)
  s.buffs.warrior = { atk:1, def:1, hp:1, cd:0.55, until: s.time.now+5000, name:'' };
  const skill = s.jobTier.skills[0]; // melee
  s.skillCdAt=[0,0,0]; s.charState.mp=1e9; s.doSkill(0);
  out.spellBooster = { cdApplied: Math.round(s.skillCdAt[0]-s.time.now), baseCd: skill.cd };
  return out;
});
console.log('buffs:', JSON.stringify(res));
console.log(errs.length?'ERR:'+errs.join('|'):'no errors');
await browser.close();
