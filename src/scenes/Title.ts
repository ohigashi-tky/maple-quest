import Phaser from 'phaser';
import { VIEW_W, VIEW_H, SAFE_TOP } from '../main';
import { initAudio, playBgm, sfx, setMuted, isMuted } from '../audio';
import { loadSave, writeSave, resetSave, newProgress, CHARACTERS, tierFor, type CharKey } from '../data';
import { openFloorSelect } from '../ui/FloorSelect';

export default class TitleScene extends Phaser.Scene {
  private selectedClass: CharKey = 'warrior';
  private classBtns: { key: CharKey; redraw: () => void }[] = [];

  constructor() {
    super('Title');
  }

  create() {
    const cx = VIEW_W / 2;
    const save = loadSave();

    // 背景: 夕暮れの空 + 草原
    const g = this.add.graphics();
    const top = Phaser.Display.Color.HexStringToColor('#5a4a8c');
    const bottom = Phaser.Display.Color.HexStringToColor('#f7d9a0');
    for (let y = 0; y < VIEW_H; y++) {
      const t = y / VIEW_H;
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bottom, 100, t * 100);
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
      g.fillRect(0, y, VIEW_W, 1);
    }
    g.fillStyle(0x6ab84e, 1);
    g.fillEllipse(cx - 160, VIEW_H - 60, 600, 320);
    g.fillStyle(0x5fae3c, 1);
    g.fillEllipse(cx + 220, VIEW_H - 40, 640, 280);

    for (const [x, y, s] of [[80, 130, 2], [380, 90, 1.6], [250, 220, 1.2], [460, 280, 1.8]] as const) {
      this.add.image(x, y, 'cloud_0').setScale(s).setAlpha(0.85);
    }
    this.add.image(80, VIEW_H - 210, 'tree_0').setScale(4).setOrigin(0.5, 1);
    this.add.image(470, VIEW_H - 190, 'tree_0').setScale(3).setOrigin(0.5, 1).setFlipX(true);
    this.add.tileSprite(cx, VIEW_H - 40, VIEW_W, 80, 'tile_grass').setTileScale(3);

    // 5次職のドット絵を主役に
    this.add.sprite(cx - 78, VIEW_H - 88, 'warrior5_0').setScale(5).setOrigin(0.5, 1).play('warrior5_walk');
    this.add.sprite(cx + 78, VIEW_H - 88, 'mage5_0').setScale(5).setOrigin(0.5, 1).setFlipX(true).play('mage5_walk');
    // ボス(ブラックマゲ風)を遠景に
    this.add.sprite(cx + 160, 360, 'boss_lord_0').setScale(2.2).setTint(0x2a1a3a).play('boss_lord_move').setAlpha(0.9);

    // ロゴ
    const logoShadow = this.add.text(cx + 4, 168, '無限ボス道場', {
      fontFamily: '"Arial Black", sans-serif', fontSize: '52px', fontStyle: 'bold', color: '#3a2a5a',
    }).setOrigin(0.5);
    const logo = this.add.text(cx, 164, '無限ボス道場', {
      fontFamily: '"Arial Black", sans-serif', fontSize: '52px', fontStyle: 'bold', color: '#ffb347',
      stroke: '#4a2a5a', strokeThickness: 10,
    }).setOrigin(0.5);
    this.add.text(cx, 218, '〜 20階のボスに挑め 〜', {
      fontFamily: 'sans-serif', fontSize: '24px', color: '#ffffff', stroke: '#4a2a5a', strokeThickness: 6,
    }).setOrigin(0.5);
    this.tweens.add({ targets: [logo, logoShadow], y: '-=10', duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // セーブ情報パネル
    const panelY = 300;
    const pg = this.add.graphics();
    pg.fillStyle(0x1a1430, 0.7);
    pg.fillRoundedRect(cx - 200, panelY - 36, 400, 96, 16);
    pg.lineStyle(2, 0xffb347, 0.8);
    pg.strokeRoundedRect(cx - 200, panelY - 36, 400, 96, 16);
    const maxFloor = Math.max(...save.highestByDiff);
    this.selectedClass = save.charKey;
    const jobName = tierFor(CHARACTERS[this.selectedClass], save.level).jobName;
    const lvText = this.add.text(cx, panelY - 12, `Lv.${save.level}  ${jobName}`, {
      fontFamily: '"Arial Black", sans-serif', fontSize: '26px', color: '#ffe9b0',
    }).setOrigin(0.5).setResolution(2);
    this.add.text(cx, panelY + 28, maxFloor > 1
      ? `最高到達: 第 ${maxFloor} 階 ${save.clears > 0 ? `(制覇 ${save.clears} 回)` : ''}`
      : 'はじめての挑戦', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#cfe0ff',
    }).setOrigin(0.5).setResolution(2);

    // 戦士で挑戦(1階 EASY から)。ゲーム内で魔法使いに交代可能
    this.selectedClass = 'warrior';
    this.makeButton(cx, VIEW_H - 470, '挑 戦', '戦士で第1階 EASY から', 0xff8a2a, () => this.start(1, 0));
    // 階層をえらぶ(難易度・到達階層から)
    this.makeButton(cx, VIEW_H - 382, '階層をえらぶ', '到達階層・難易度を選択', 0x8a5ac4, () => {
      initAudio();
      openFloorSelect(this, loadSave(), 0, (f, d) => this.start(f, d));
    });

    // Lv1からやり直す(確認あり・小さめ。誤タップ防止に十分な余白を上に)
    this.makeSmallButton(cx, VIEW_H - 250, 'Lv1からやり直す', 0x9a3a4a, () => this.confirmReset());

    // 音量切り替えアイコン(右上・セーフエリア考慮)
    this.buildSoundToggle();

    this.input.once('pointerdown', () => { initAudio(); playBgm('title'); });
  }

  // 右上の音量アイコン(タップでミュート切替。未初期化なら初期化)
  private buildSoundToggle() {
    const x = VIEW_W - 34, y = 36 + SAFE_TOP;
    const c = this.add.container(x, y).setDepth(60);
    const g = this.add.graphics();
    const render = (pressed: boolean) => {
      g.clear();
      g.fillStyle(0x2a2440, pressed ? 1 : 0.82);
      g.fillCircle(0, 0, 22);
      g.lineStyle(2, 0x8a7ac4, 0.9);
      g.strokeCircle(0, 0, 22);
      g.fillStyle(0xffffff, 1);
      g.fillRect(-10, -5, 5, 10);
      g.fillTriangle(-5, -8, -5, 8, 5, 0);
      if (isMuted()) {
        g.lineStyle(3, 0xff5a5a, 1);
        g.lineBetween(-2, -8, 11, 8);
      } else {
        g.lineStyle(2, 0xffffff, 0.9);
        g.beginPath(); g.arc(5, 0, 7, -0.8, 0.8); g.strokePath();
        g.beginPath(); g.arc(5, 0, 10, -0.7, 0.7); g.strokePath();
      }
    };
    render(false);
    c.add(g);
    c.setSize(48, 48).setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => {
      initAudio();
      setMuted(!isMuted());
      sfx('select');
      render(true);
      this.time.delayedCall(130, () => render(false));
    });
  }

  // 小さめのボタン
  private makeSmallButton(x: number, y: number, label: string, color: number, onTap: () => void) {
    const w = 240, h = 50;
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const col = Phaser.Display.Color.IntegerToColor(color);
    g.fillStyle(col.clone().darken(34).color, 0.95);
    g.fillRoundedRect(-w / 2, -h / 2 + 3, w, h, 12);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    const t = this.add.text(0, 0, label, {
      fontFamily: 'sans-serif', fontSize: '19px', fontStyle: 'bold', color: '#ffffff', stroke: '#2a1a30', strokeThickness: 3,
    }).setOrigin(0.5).setResolution(2);
    c.add([g, t]);
    c.setSize(w, h).setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => { initAudio(); sfx('select'); this.tweens.add({ targets: c, scale: 0.94, duration: 70, yoyo: true, onComplete: onTap }); });
    return c;
  }

  // Lv1リセットの確認ダイアログ
  private confirmReset() {
    const cy = VIEW_H / 2;
    const c = this.add.container(0, 0).setDepth(200);
    const dim = this.add.rectangle(VIEW_W / 2, cy, VIEW_W, VIEW_H, 0x05030a, 0.78).setInteractive();
    const t = this.add.text(VIEW_W / 2, cy - 90, 'Lv1からやり直しますか?', {
      fontFamily: '"Arial Black", sans-serif', fontSize: '26px', color: '#ffd8d8', stroke: '#3d0a0a', strokeThickness: 6,
    }).setOrigin(0.5).setResolution(2);
    const warn = this.add.text(VIEW_W / 2, cy - 36, 'レベル・到達階層・難易度の解放が\nすべてリセットされます(取り消せません)', {
      fontFamily: 'sans-serif', fontSize: '17px', color: '#ffffff', align: 'center', lineSpacing: 6,
    }).setOrigin(0.5).setResolution(2);
    c.add([dim, t, warn]);
    c.add(this.makeSmallButton(VIEW_W / 2, cy + 50, 'はい、やり直す', 0x9a3a4a, () => {
      resetSave();
      sfx('select');
      c.destroy();
      this.scene.restart();
    }));
    c.add(this.makeSmallButton(VIEW_W / 2, cy + 118, 'キャンセル', 0x6a6a8a, () => c.destroy()));
  }

  private makeClassToggle(x: number, y: number, key: CharKey, label: string, sub: string, color: number, onTap: (k: CharKey) => void) {
    const w = 176, h = 66;
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const spr = this.add.sprite(-w / 2 + 24, 0, `${key}_0`).setScale(2.4);
    const t = this.add.text(8, -12, label, { fontFamily: 'sans-serif', fontSize: '20px', fontStyle: 'bold', color: '#ffffff', stroke: '#2a1a30', strokeThickness: 3 }).setOrigin(0.5).setResolution(2);
    const st = this.add.text(8, 14, sub, { fontFamily: 'sans-serif', fontSize: '11px', color: '#ffe9d0' }).setOrigin(0.5).setResolution(2);
    c.add([g, spr, t, st]);
    c.setSize(w, h).setInteractive({ useHandCursor: true });
    const redraw = () => {
      const active = this.selectedClass === key;
      g.clear();
      const col = Phaser.Display.Color.IntegerToColor(color);
      g.fillStyle(col.clone().darken(active ? 0 : 45).color, active ? 1 : 0.7);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
      if (active) { g.lineStyle(3, 0xffffff, 0.95); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 14); }
    };
    c.on('pointerdown', () => { initAudio(); sfx('select'); onTap(key); });
    redraw();
    this.classBtns.push({ key, redraw });
    return c;
  }

  private makeButton(x: number, y: number, label: string, sub: string, color: number, onTap: () => void) {
    const w = 360, h = 76;
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const col = Phaser.Display.Color.IntegerToColor(color);
    g.fillStyle(col.clone().darken(34).color, 0.95);
    g.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 16);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    g.fillStyle(0xffffff, 0.18);
    g.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h / 2 - 4, { tl: 12, tr: 12, bl: 0, br: 0 });
    const t = this.add.text(0, -12, label, {
      fontFamily: 'sans-serif', fontSize: '26px', fontStyle: 'bold', color: '#ffffff', stroke: '#2a1a30', strokeThickness: 4,
    }).setOrigin(0.5).setResolution(2);
    const st = this.add.text(0, 16, sub, {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#ffe9d0',
    }).setOrigin(0.5).setResolution(2);
    c.add([g, t, st]);
    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => {
      initAudio();
      sfx('select');
      this.tweens.add({ targets: c, scale: 0.94, duration: 70, yoyo: true, onComplete: onTap });
    });
    return c;
  }

  private start(floor: number, difficulty: number) {
    const save = loadSave();
    save.charKey = this.selectedClass;
    writeSave(save);
    this.registry.set('progress', newProgress(save, floor, difficulty));
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Game', { floor, difficulty });
      this.scene.launch('Hud');
    });
  }
}
