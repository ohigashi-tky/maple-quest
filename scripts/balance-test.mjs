import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--no-sandbox','--mute-audio'],
  defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
const errors=[]; page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.removeItem('maple-quest-save-v2'));
await page.reload({ waitUntil: 'networkidle0' });
await new Promise(r=>setTimeout(r,2200));
const info = await page.evaluate(() => { const c=document.querySelector('canvas'); const r=c.getBoundingClientRect(); return {rect:{x:r.x,y:r.y,w:r.width,h:r.height},vw:c.width,vh:c.height}; });
const {rect,vw,vh}=info; const S=(vx,vy)=>({x:rect.x+(vx/vw)*rect.w,y:rect.y+(vy/vh)*rect.h});
await page.touchscreen.tap(S(270, vh-410).x, S(270, vh-410).y);
await new Promise(r=>setTimeout(r,1800));

// オンレベルのシミュレート: 各floorのreqLevelにして実DPSでボスHPが何秒で削れるか
async function simFloor(floor, level) {
  await page.evaluate((fl,lv)=>{
    const s=window.__PHASER_GAME__.scene.getScene('Game');
    s.progress.level=lv; s.progress.exp=0;
    for(const k of ['warrior','mage']){ s.progress.chars[k].hp=s.maxHp(k); s.progress.chars[k].mp=s.maxMp(k); }
    s.scene.restart({floor:fl});
  }, floor, level);
  await new Promise(r=>setTimeout(r,1700));
  // ボスを画面内に寄せてMP無限化、スキル連打を3秒
  await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); if(s.boss){ s.boss.x=s.player.x+40; } });
  const start = await page.evaluate(()=>{ const b=window.__PHASER_GAME__.scene.getScene('Game').boss; return b?b.hp:0; });
  // 4秒間、攻撃+スキルを連打(MP回復しながら)
  const atk=S(468,vh-92), sk0=S(332,vh-78), sk1=S(322,vh-188);
  const t0=Date.now();
  while(Date.now()-t0<5000){
    await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); s.charState.mp=s.maxMp(s.progress.charKey); if(s.boss) s.boss.x=s.player.x+40; });
    await page.touchscreen.tap(sk0.x,sk0.y); await new Promise(r=>setTimeout(r,120));
    await page.touchscreen.tap(sk1.x,sk1.y); await new Promise(r=>setTimeout(r,120));
    await page.touchscreen.tap(atk.x,atk.y); await new Promise(r=>setTimeout(r,120));
  }
  const res = await page.evaluate(()=>{ const s=window.__PHASER_GAME__.scene.getScene('Game'); return { hp: s.boss?s.boss.hp:0, max: s.boss?s.boss.maxhp:0, dead: !s.boss }; });
  const dealtPct = res.dead ? 100 : Math.round((1 - res.hp/res.max)*100);
  console.log(`floor ${floor} @Lv${level}: ${res.dead?'KILLED':dealtPct+'% in 5s'} (HP ${res.max?Math.round(res.max).toLocaleString():0})`);
}
await simFloor(1, 1);
await simFloor(5, 32);
await simFloor(10, 88);
await simFloor(15, 150);
await simFloor(20, 250);
console.log(errors.length?'ERR:'+errors.join('|'):'no errors');
await browser.close();
