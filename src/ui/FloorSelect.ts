import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from '../main';
import {
  FLOORS, TOTAL_FLOORS, DIFFICULTIES, effReq, isDifficultyUnlocked,
  type SaveData,
} from '../data';
import { sfx } from '../audio';

// 階層+難易度 選択モーダル(タイトル / ゲームオーバーで共用)
export function openFloorSelect(
  scene: Phaser.Scene,
  save: SaveData,
  startDiff: number,
  onPick: (floor: number, difficulty: number) => void,
  onClose?: () => void
): Phaser.GameObjects.Container {
  const root = scene.add.container(0, 0).setDepth(200);
  const dim = scene.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x05030a, 0.82).setInteractive();
  root.add(dim);

  // パネル
  const pw = VIEW_W - 36, ph = 760, px = VIEW_W / 2, py = VIEW_H / 2;
  const panel = scene.add.graphics();
  panel.fillStyle(0x1a1430, 0.96);
  panel.fillRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 20);
  panel.lineStyle(3, 0xffb347, 0.9);
  panel.strokeRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 20);
  root.add(panel);

  const top = py - ph / 2;
  root.add(scene.add.text(px, top + 34, '階層をえらぶ', {
    fontFamily: '"Arial Black", sans-serif', fontSize: '30px', color: '#ffe9b0', stroke: '#5a3a1a', strokeThickness: 5,
  }).setOrigin(0.5).setResolution(2));

  // 難易度タブ
  let selDiff = Math.max(0, Math.min(DIFFICULTIES.length - 1, startDiff));
  const diffBtns: { c: Phaser.GameObjects.Container; bg: Phaser.GameObjects.Graphics; d: number; unlocked: boolean }[] = [];
  const diffY = top + 92;
  const dw = (pw - 40) / DIFFICULTIES.length;
  DIFFICULTIES.forEach((def, d) => {
    const unlocked = isDifficultyUnlocked(save, d);
    const cx = px - pw / 2 + 20 + dw * d + dw / 2;
    const c = scene.add.container(cx, diffY);
    const bg = scene.add.graphics();
    const label = scene.add.text(0, -4, def.name, {
      fontFamily: 'sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setResolution(2);
    const lock = scene.add.text(0, 14, unlocked ? (save.clearedByDiff[d] ? '★制覇' : '') : '🔒', {
      fontFamily: 'sans-serif', fontSize: '11px', color: '#ffe45a',
    }).setOrigin(0.5).setResolution(2);
    c.add([bg, label, lock]);
    c.setSize(dw - 8, 50).setInteractive();
    diffBtns.push({ c, bg, d, unlocked });
    if (unlocked) {
      c.on('pointerdown', () => { sfx('select'); selDiff = d; renderDiffs(); renderFloors(); });
    } else {
      label.setColor('#7a7488');
    }
    root.add(c);
  });

  function renderDiffs() {
    for (const b of diffBtns) {
      const def = DIFFICULTIES[b.d];
      b.bg.clear();
      const active = b.d === selDiff;
      const col = b.unlocked ? def.color : 0x3a3450;
      const c = Phaser.Display.Color.IntegerToColor(col);
      b.bg.fillStyle(c.clone().darken(active ? 0 : 40).color, b.unlocked ? 1 : 0.6);
      b.bg.fillRoundedRect(-(dw - 8) / 2, -25, dw - 8, 50, 10);
      if (active) { b.bg.lineStyle(3, 0xffffff, 0.95); b.bg.strokeRoundedRect(-(dw - 8) / 2, -25, dw - 8, 50, 10); }
    }
  }

  const descText = scene.add.text(px, diffY + 42, '', {
    fontFamily: 'sans-serif', fontSize: '14px', color: '#cfe0ff',
  }).setOrigin(0.5).setResolution(2);
  root.add(descText);

  // 階層グリッド(4列 × 5行)
  const gridTop = diffY + 78;
  const cols = 4, cellW = (pw - 40) / cols, cellH = 92;
  const floorLayer = scene.add.container(0, 0);
  root.add(floorLayer);

  function renderFloors() {
    floorLayer.removeAll(true);
    descText.setText(DIFFICULTIES[selDiff].desc);
    const reached = save.highestByDiff[selDiff] || 1;
    for (let i = 0; i < TOTAL_FLOORS; i++) {
      const f = FLOORS[i];
      const row = Math.floor(i / cols), col = i % cols;
      const cx = px - pw / 2 + 20 + cellW * col + cellW / 2;
      const cy = gridTop + row * cellH + cellH / 2;
      const open = f.floor <= reached;
      const cell = scene.add.container(cx, cy);
      const bg = scene.add.graphics();
      const base = f.major ? 0x6a2a4a : 0x2a2440;
      const cc = Phaser.Display.Color.IntegerToColor(open ? base : 0x1a1626);
      bg.fillStyle(cc.color, open ? 1 : 0.5);
      bg.fillRoundedRect(-cellW / 2 + 4, -cellH / 2 + 4, cellW - 8, cellH - 8, 10);
      bg.lineStyle(2, f.major ? 0xff8abf : 0x6a5a9a, open ? 0.9 : 0.3);
      bg.strokeRoundedRect(-cellW / 2 + 4, -cellH / 2 + 4, cellW - 8, cellH - 8, 10);
      cell.add(bg);
      cell.add(scene.add.text(0, -28, `${f.floor}階`, {
        fontFamily: '"Arial Black", sans-serif', fontSize: '17px',
        color: open ? (f.major ? '#ffd24a' : '#ffffff') : '#5a5470',
      }).setOrigin(0.5).setResolution(2));
      cell.add(scene.add.text(0, -6, f.bossName, {
        fontFamily: 'sans-serif', fontSize: '9px', color: open ? '#cfe0ff' : '#4a4560',
        align: 'center', wordWrap: { width: cellW - 12 },
      }).setOrigin(0.5).setResolution(3));
      cell.add(scene.add.text(0, 26, open ? `推奨Lv ${effReq(f, selDiff)}` : '🔒', {
        fontFamily: 'sans-serif', fontSize: '10px', color: open ? '#9ad8ff' : '#5a5470',
      }).setOrigin(0.5).setResolution(2));
      if (open) {
        cell.setSize(cellW - 8, cellH - 8).setInteractive();
        cell.on('pointerdown', () => {
          sfx('select');
          scene.tweens.add({ targets: cell, scale: 0.92, duration: 70, yoyo: true, onComplete: () => onPick(f.floor, selDiff) });
        });
      }
      floorLayer.add(cell);
    }
  }

  // 閉じる
  const closeBtn = scene.add.container(px, top + ph - 40);
  const cg = scene.add.graphics();
  cg.fillStyle(0x6a6a8a, 1);
  cg.fillRoundedRect(-100, -26, 200, 52, 14);
  closeBtn.add(cg);
  closeBtn.add(scene.add.text(0, 0, '閉じる', {
    fontFamily: 'sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#ffffff',
  }).setOrigin(0.5).setResolution(2));
  closeBtn.setSize(200, 52).setInteractive();
  closeBtn.on('pointerdown', () => { sfx('select'); root.destroy(); onClose?.(); });
  root.add(closeBtn);

  renderDiffs();
  renderFloors();
  root.setScale(0.85).setAlpha(0);
  scene.tweens.add({ targets: root, scale: 1, alpha: 1, duration: 200, ease: 'Back.easeOut' });
  return root;
}
