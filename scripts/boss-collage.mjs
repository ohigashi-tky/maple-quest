import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--mute-audio'], defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2} });
const page = await browser.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:4173/', { waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,2000));
await page.evaluate(()=>{
  const g = window.__PHASER_GAME__;
  const t = g.scene.getScene('Title');
  // 背景を暗く敷いて全アーキタイプを並べる
  t.add.rectangle(270, 480, 540, 960, 0x14101e, 1).setDepth(900);
  const items = [
    ['boss_mush', 0xef7d2f, 'マッシュ'], ['boss_demon', 0xd81a1a, '悪魔'],
    ['boss_drake', 0x4a9c3a, '竜'], ['boss_horntail', 0x3aa84a, 'ホーンテイル'], ['boss_golem', 0xd8541a, 'ゴーレム'],
    ['boss_beast', 0xe0a030, '猛禽'], ['boss_knight', 0x3a6ae8, '騎士'],
    ['boss_witch', 0x8a1a4a, '魔女'], ['boss_clown', 0xb04ad8, '道化'],
    ['boss_lord', 0x6a52b4, '魔導王'], ['boss_titan', 0x8a3acc, '巨神'],
  ];
  items.forEach(([key, tint, label], i) => {
    const x = 100 + (i % 3) * 170;
    const y = 140 + Math.floor(i / 3) * 200;
    const s = t.add.sprite(x, y, key + '_0').setScale(4).setTint(tint).setDepth(901);
    if (t.anims.exists(key + '_move')) s.play(key + '_move');
    t.add.text(x, y + 80, label, { fontFamily:'sans-serif', fontSize:'18px', color:'#ffffff' }).setOrigin(0.5).setDepth(901);
  });
});
await new Promise(r=>setTimeout(r,400));
await page.screenshot({ path:'/tmp/boss-collage-a.png' });
await new Promise(r=>setTimeout(r,350)); // 次フレーム
await page.screenshot({ path:'/tmp/boss-collage-b.png' });
console.log(errs.length?'ERR:'+errs.join('|'):'no errors');
await browser.close();
