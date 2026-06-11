import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from '../main';
import { initAudio, playBgm, sfx } from '../audio';
import { loadSave, writeSave, newProgress, CHARACTERS, tierFor, type CharKey } from '../data';

export default class TitleScene extends Phaser.Scene {
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
    const logoShadow = this.add.text(cx + 4, 168, 'MAPLE DOJO', {
      fontFamily: '"Arial Black", sans-serif', fontSize: '58px', color: '#3a2a5a',
    }).setOrigin(0.5);
    const logo = this.add.text(cx, 164, 'MAPLE DOJO', {
      fontFamily: '"Arial Black", sans-serif', fontSize: '58px', color: '#ffb347',
      stroke: '#4a2a5a', strokeThickness: 10,
    }).setOrigin(0.5);
    this.add.text(cx, 220, '〜 20階の試練 〜', {
      fontFamily: 'sans-serif', fontSize: '26px', color: '#ffffff', stroke: '#4a2a5a', strokeThickness: 6,
    }).setOrigin(0.5);
    this.tweens.add({ targets: [logo, logoShadow], y: '-=10', duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // セーブ情報パネル
    const panelY = 300;
    const pg = this.add.graphics();
    pg.fillStyle(0x1a1430, 0.7);
    pg.fillRoundedRect(cx - 200, panelY - 36, 400, 96, 16);
    pg.lineStyle(2, 0xffb347, 0.8);
    pg.strokeRoundedRect(cx - 200, panelY - 36, 400, 96, 16);
    const wTier = tierFor(CHARACTERS.warrior, save.level);
    const mTier = tierFor(CHARACTERS.mage, save.level);
    const jobName = save.charKey === 'warrior' ? wTier.jobName : mTier.jobName;
    this.add.text(cx, panelY - 12, `Lv.${save.level}  ${jobName}`, {
      fontFamily: '"Arial Black", sans-serif', fontSize: '26px', color: '#ffe9b0',
    }).setOrigin(0.5).setResolution(2);
    this.add.text(cx, panelY + 28, save.highestFloor > 1
      ? `最高到達: 第 ${save.highestFloor} 階 ${save.clears > 0 ? `(制覇 ${save.clears} 回)` : ''}`
      : 'はじめての挑戦', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#cfe0ff',
    }).setOrigin(0.5).setResolution(2);

    // クラス選択 → 挑戦開始
    this.add.text(cx, VIEW_H - 470, '挑戦するジョブを選べ', {
      fontFamily: 'sans-serif', fontSize: '20px', fontStyle: 'bold', color: '#ffffff', stroke: '#4a2a5a', strokeThickness: 5,
    }).setOrigin(0.5).setResolution(2);
    this.makeButton(cx, VIEW_H - 410, '戦士で挑戦', '剣士→ダークナイト', 0xc85a3a, () => this.start('warrior'));
    this.makeButton(cx, VIEW_H - 318, '魔法使いで挑戦', '魔法使い→アークメイジ(氷雷)', 0x3a6ad8, () => this.start('mage'));

    this.add.text(cx, VIEW_H - 14, 'レベルは記憶され、自分の強さで何階まで登れるか挑戦!', {
      fontFamily: 'sans-serif', fontSize: '15px', color: '#5a4a3a',
    }).setOrigin(0.5, 1);

    this.input.once('pointerdown', () => { initAudio(); playBgm('title'); });
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

  private start(charKey: CharKey) {
    const save = loadSave();
    save.charKey = charKey;
    writeSave(save);
    this.registry.set('progress', newProgress(save));
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Game', { floor: 1 });
      this.scene.launch('Hud');
    });
  }
}
