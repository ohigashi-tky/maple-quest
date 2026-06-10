import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from '../main';
import { initAudio, playBgm, sfx } from '../audio';
import { loadSavedStage, newProgress, STAGES } from '../data';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const cx = VIEW_W / 2;

    // 背景: 夕暮れの空グラデーション + 草原
    const g = this.add.graphics();
    const top = Phaser.Display.Color.HexStringToColor('#7ec8f0');
    const bottom = Phaser.Display.Color.HexStringToColor('#f7d9a0');
    for (let y = 0; y < VIEW_H; y++) {
      const t = y / VIEW_H;
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bottom, 100, t * 100);
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
      g.fillRect(0, y, VIEW_W, 1);
    }
    // 遠景の丘
    g.fillStyle(0x6ab84e, 1);
    g.fillEllipse(cx - 160, VIEW_H - 60, 600, 320);
    g.fillStyle(0x5fae3c, 1);
    g.fillEllipse(cx + 220, VIEW_H - 40, 640, 280);

    // 雲・木
    for (const [x, y, s] of [[80, 130, 2], [380, 90, 1.6], [250, 220, 1.2], [460, 280, 1.8]] as const) {
      this.add.image(x, y, 'cloud_0').setScale(s).setAlpha(0.92);
    }
    this.add.image(80, VIEW_H - 210, 'tree_0').setScale(4).setOrigin(0.5, 1);
    this.add.image(470, VIEW_H - 190, 'tree_0').setScale(3).setOrigin(0.5, 1).setFlipX(true);

    // 地面
    this.add.tileSprite(cx, VIEW_H - 40, VIEW_W, 80, 'tile_grass').setTileScale(3);

    // キャラクターとモンスター
    this.add.sprite(cx - 70, VIEW_H - 88, 'warrior_0').setScale(5).setOrigin(0.5, 1).play('warrior_walk');
    this.add.sprite(cx + 70, VIEW_H - 88, 'mage_0').setScale(5).setOrigin(0.5, 1).setFlipX(true).play('mage_walk');
    this.add.sprite(cx - 190, VIEW_H - 84, 'mushroom_0').setScale(3.4).setOrigin(0.5, 1).play('mushroom_move');
    this.add.sprite(cx + 190, VIEW_H - 84, 'snail_0').setScale(3.2).setOrigin(0.5, 1).setFlipX(true).play('snail_move');
    this.add.sprite(cx + 150, 330, 'pinkbean_0').setScale(2.6).play('pinkbean_move');

    // ロゴ
    const logoShadow = this.add.text(cx + 4, 204, 'MAPLE QUEST', {
      fontFamily: '"Arial Black", sans-serif',
      fontSize: '60px',
      color: '#7a4a21',
    }).setOrigin(0.5);
    const logo = this.add.text(cx, 200, 'MAPLE QUEST', {
      fontFamily: '"Arial Black", sans-serif',
      fontSize: '60px',
      color: '#ffb347',
      stroke: '#5b3a22',
      strokeThickness: 10,
    }).setOrigin(0.5);
    this.add.text(cx, 258, '〜 きのこ島の大冒険 〜', {
      fontFamily: 'sans-serif',
      fontSize: '26px',
      color: '#ffffff',
      stroke: '#5b3a22',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: [logo, logoShadow],
      y: '-=10',
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ボタン
    const saved = loadSavedStage();
    this.makeButton(cx, VIEW_H - 420, 'はじめから', () => this.startGame(0));
    if (saved > 0) {
      this.makeButton(cx, VIEW_H - 330, `つづきから (${STAGES[saved].name})`, () => this.startGame(saved));
    }

    this.add.text(cx, VIEW_H - 16, 'PWA対応: ホーム画面に追加してオフラインでも遊べます', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#7a5a3a',
    }).setOrigin(0.5, 1);

    // 最初のタップでオーディオ初期化
    this.input.once('pointerdown', () => {
      initAudio();
      playBgm('title');
    });
  }

  private makeButton(x: number, y: number, label: string, onTap: () => void) {
    const w = 320;
    const h = 64;
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x2a1f3d, 0.9);
    g.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 16);
    g.fillStyle(0xffb347, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    g.fillStyle(0xffd98a, 1);
    g.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h / 2 - 4, { tl: 12, tr: 12, bl: 0, br: 0 });
    const t = this.add.text(0, 0, label, {
      fontFamily: 'sans-serif',
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#5b3a22',
    }).setOrigin(0.5);
    c.add([g, t]);
    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => {
      initAudio();
      sfx('select');
      this.tweens.add({ targets: c, scale: 0.93, duration: 70, yoyo: true, onComplete: onTap });
    });
    return c;
  }

  private startGame(stage: number) {
    this.registry.set('progress', newProgress(stage));
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Game', { stage });
      this.scene.launch('Hud');
    });
  }
}
