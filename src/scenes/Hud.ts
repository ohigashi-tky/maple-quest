import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from '../main';
import { sfx, setMuted, isMuted, stopBgm, playBgm } from '../audio';
import type GameScene from './Game';

interface BtnOpts {
  r: number;
  color: number;
  label?: string;
  sub?: string;
  icon?: string;
  iconScale?: number;
}

interface Btn {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  cdOverlay: Phaser.GameObjects.Graphics;
  label?: Phaser.GameObjects.Text;
  sub?: Phaser.GameObjects.Text;
  icon?: Phaser.GameObjects.Sprite;
  opts: BtnOpts;
}

export default class HudScene extends Phaser.Scene {
  private game_!: GameScene;

  private barsG!: Phaser.GameObjects.Graphics;
  private portraitIcon!: Phaser.GameObjects.Sprite;
  private lvText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private mpText!: Phaser.GameObjects.Text;
  private stageText!: Phaser.GameObjects.Text;
  private killText!: Phaser.GameObjects.Text;
  private bossG!: Phaser.GameObjects.Graphics;
  private bossText!: Phaser.GameObjects.Text;

  private skillBtns: Btn[] = [];
  private potionHpBtn!: Btn;
  private potionMpBtn!: Btn;
  private switchBtn!: Btn;
  private switchIcon!: Phaser.GameObjects.Sprite;

  private banner?: Phaser.GameObjects.Container;
  private overlay?: Phaser.GameObjects.Container;
  private mpFlashUntil = 0;

  constructor() {
    super('Hud');
  }

  create() {
    this.game_ = this.scene.get('Game') as GameScene;
    this.buildStatusBars();
    this.buildBossBar();
    this.buildDpad();
    this.buildActionButtons();
    this.buildTopRight();
    this.scene.bringToTop();
  }

  // ============================================================
  // ステータス表示(左上)
  // ============================================================
  private buildStatusBars() {
    const g = this.add.graphics();
    g.fillStyle(0x1a1430, 0.75);
    g.fillRoundedRect(10, 14, 286, 96, 14);
    g.lineStyle(2, 0xffb347, 0.9);
    g.strokeRoundedRect(10, 14, 286, 96, 14);

    // ポートレート枠
    g.fillStyle(0x2a1f3d, 1);
    g.fillCircle(56, 62, 36);
    g.lineStyle(3, 0xffb347, 1);
    g.strokeCircle(56, 62, 36);

    this.portraitIcon = this.add.sprite(56, 64, 'warrior_0').setScale(2.6);
    this.lvText = this.add.text(104, 24, 'Lv.1 剣士', {
      fontFamily: 'sans-serif', fontSize: '17px', fontStyle: 'bold', color: '#ffe9b0',
    }).setResolution(2);

    this.barsG = this.add.graphics();
    this.hpText = this.add.text(286, 52, '', {
      fontFamily: 'sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(1, 0.5).setResolution(2);
    this.mpText = this.add.text(286, 74, '', {
      fontFamily: 'sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(1, 0.5).setResolution(2);
  }

  private drawBars() {
    const ui = this.game_.uiState;
    if (!ui) return;
    const g = this.barsG;
    const x = 104, w = 182;
    g.clear();
    // HP
    g.fillStyle(0x3d2430, 1);
    g.fillRoundedRect(x, 46, w, 13, 6);
    g.fillStyle(0xe8443a, 1);
    const hpw = Math.max(0, (ui.hp / ui.maxhp) * (w - 2));
    if (hpw > 1) g.fillRoundedRect(x + 1, 47, hpw, 11, 5);
    // MP
    const mpFlash = this.time.now < this.mpFlashUntil && Math.floor(this.time.now / 100) % 2 === 0;
    g.fillStyle(mpFlash ? 0x6a2430 : 0x24303d, 1);
    g.fillRoundedRect(x, 68, w, 13, 6);
    g.fillStyle(0x3a6ae8, 1);
    const mpw = Math.max(0, (ui.mp / ui.maxmp) * (w - 2));
    if (mpw > 1) g.fillRoundedRect(x + 1, 69, mpw, 11, 5);
    // EXP
    g.fillStyle(0x3d3a24, 1);
    g.fillRoundedRect(x, 90, w, 9, 4);
    g.fillStyle(0xffd24a, 1);
    const xw = Math.max(0, Math.min(1, ui.exp / ui.expNext) * (w - 2));
    if (xw > 1) g.fillRoundedRect(x + 1, 91, xw, 7, 3);

    this.hpText.setText(`${ui.hp}/${ui.maxhp}`);
    this.mpText.setText(`${ui.mp}/${ui.maxmp}`);
    this.lvText.setText(`Lv.${ui.level} ${ui.charName}`);
    const tex = `${ui.spriteKey}_0`;
    if (this.portraitIcon.texture.key !== tex) this.portraitIcon.setTexture(tex);
    const otherTex = `${ui.otherSpriteKey}_0`;
    if (this.switchIcon && this.switchIcon.texture.key !== otherTex) this.switchIcon.setTexture(otherTex);
  }

  flashMp() {
    this.mpFlashUntil = this.time.now + 600;
  }

  // ============================================================
  // ボスHPバー
  // ============================================================
  private buildBossBar() {
    this.bossG = this.add.graphics();
    this.bossText = this.add.text(VIEW_W / 2, 130, '', {
      fontFamily: 'sans-serif', fontSize: '16px', fontStyle: 'bold',
      color: '#ffd8e2', stroke: '#5c1a2d', strokeThickness: 4,
    }).setOrigin(0.5).setResolution(2);
  }

  private drawBossBar() {
    const ui = this.game_.uiState;
    const g = this.bossG;
    g.clear();
    if (!ui?.boss) {
      this.bossText.setText('');
      return;
    }
    const w = 360, x = (VIEW_W - w) / 2, y = 146;
    this.bossText.setText(`${ui.boss.title} ${ui.boss.name}`);
    g.fillStyle(0x1a1430, 0.8);
    g.fillRoundedRect(x - 4, y - 4, w + 8, 26, 10);
    g.fillStyle(0x3d1a24, 1);
    g.fillRoundedRect(x, y, w, 18, 8);
    g.fillStyle(0xff4a7a, 1);
    const hw = Math.max(0, (ui.boss.hp / ui.boss.max) * (w - 2));
    if (hw > 1) g.fillRoundedRect(x + 1, y + 1, hw, 16, 7);
    g.lineStyle(2, 0xff9ecb, 0.8);
    g.strokeRoundedRect(x, y, w, 18, 8);
  }

  // ============================================================
  // 右上(ステージ情報・ミュート)
  // ============================================================
  private buildTopRight() {
    const g = this.add.graphics();
    g.fillStyle(0x1a1430, 0.75);
    g.fillRoundedRect(VIEW_W - 226, 14, 212, 62, 12);
    g.lineStyle(2, 0x8a7ac4, 0.8);
    g.strokeRoundedRect(VIEW_W - 226, 14, 212, 62, 12);

    this.stageText = this.add.text(VIEW_W - 120, 32, '', {
      fontFamily: 'sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#dcd2ff',
    }).setOrigin(0.5).setResolution(2);
    this.killText = this.add.text(VIEW_W - 120, 56, '', {
      fontFamily: 'sans-serif', fontSize: '13px', color: '#ffe9b0',
    }).setOrigin(0.5).setResolution(2);

    // ミュートボタン
    const mute = this.add.text(VIEW_W - 30, 100, '🔊', { fontSize: '24px' }).setOrigin(0.5);
    mute.setInteractive({ useHandCursor: true });
    mute.on('pointerdown', () => {
      setMuted(!isMuted());
      mute.setText(isMuted() ? '🔇' : '🔊');
    });
  }

  // ============================================================
  // 移動ボタン(左下)
  // ============================================================
  private buildDpad() {
    const mk = (x: number, y: number, flip: boolean, dir: 'left' | 'right') => {
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      g.fillStyle(0x1a1430, 0.55);
      g.fillCircle(0, 0, 47);
      g.lineStyle(3, 0xffffff, 0.35);
      g.strokeCircle(0, 0, 47);
      // 矢印
      g.fillStyle(0xffffff, 0.85);
      const s = flip ? -1 : 1;
      g.fillTriangle(s * 18, 0, s * -10, -20, s * -10, 20);
      c.add(g);
      c.setSize(110, 110);
      c.setInteractive();
      const on = () => {
        this.game_.setPad({ [dir]: true } as never);
        g.setAlpha(1.5);
      };
      const off = () => {
        this.game_.setPad({ [dir]: false } as never);
        g.setAlpha(1);
      };
      c.on('pointerdown', on);
      c.on('pointerover', (p: Phaser.Input.Pointer) => p.isDown && on());
      c.on('pointerup', off);
      c.on('pointerout', off);
      c.on('pointerupoutside', off);
      return c;
    };
    mk(64, VIEW_H - 102, true, 'left');
    mk(174, VIEW_H - 102, false, 'right');
  }

  // ============================================================
  // アクションボタン(右下)
  // ============================================================
  private makeButton(x: number, y: number, opts: BtnOpts, onTap: () => void, repeat = false): Btn {
    const c = this.add.container(x, y);
    const bg = this.add.graphics();
    this.drawBtnBg(bg, opts, false);
    c.add(bg);

    let icon: Phaser.GameObjects.Sprite | undefined;
    if (opts.icon) {
      icon = this.add.sprite(0, opts.label ? -6 : 0, opts.icon).setScale(opts.iconScale ?? 2);
      c.add(icon);
    }
    let label: Phaser.GameObjects.Text | undefined;
    if (opts.label) {
      label = this.add.text(0, opts.icon ? opts.r - 18 : -4, opts.label, {
        fontFamily: 'sans-serif', fontSize: `${Math.max(13, opts.r * 0.36)}px`, fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5).setResolution(2);
      c.add(label);
    }
    let sub: Phaser.GameObjects.Text | undefined;
    if (opts.sub !== undefined) {
      sub = this.add.text(0, opts.r * 0.42, opts.sub, {
        fontFamily: 'sans-serif', fontSize: '12px', color: '#cfe0ff',
      }).setOrigin(0.5).setResolution(2);
      c.add(sub);
    }
    const cdOverlay = this.add.graphics();
    c.add(cdOverlay);

    c.setSize(opts.r * 2 + 12, opts.r * 2 + 12);
    c.setInteractive();
    let repeatTimer: Phaser.Time.TimerEvent | null = null;
    c.on('pointerdown', () => {
      this.drawBtnBg(bg, opts, true);
      onTap();
      if (repeat) {
        repeatTimer?.remove();
        repeatTimer = this.time.addEvent({ delay: 240, loop: true, callback: onTap });
      }
    });
    const release = () => {
      this.drawBtnBg(bg, opts, false);
      repeatTimer?.remove();
      repeatTimer = null;
    };
    c.on('pointerup', release);
    c.on('pointerout', release);
    c.on('pointerupoutside', release);
    return { container: c, bg, cdOverlay, label, sub, icon, opts };
  }

  private drawBtnBg(g: Phaser.GameObjects.Graphics, opts: BtnOpts, pressed: boolean) {
    g.clear();
    const c = Phaser.Display.Color.IntegerToColor(opts.color);
    const dark = c.clone().darken(28).color;
    g.fillStyle(dark, pressed ? 0.95 : 0.8);
    g.fillCircle(0, 3, opts.r);
    g.fillStyle(opts.color, pressed ? 1 : 0.85);
    g.fillCircle(0, pressed ? 2 : 0, opts.r);
    g.fillStyle(0xffffff, pressed ? 0.1 : 0.22);
    g.fillEllipse(0, -opts.r * 0.42, opts.r * 1.4, opts.r * 0.7);
    g.lineStyle(3, 0xffffff, 0.4);
    g.strokeCircle(0, pressed ? 2 : 0, opts.r);
  }

  private buildActionButtons() {
    const game = () => this.game_;

    // ジャンプ(青・大)
    this.makeButton(478, VIEW_H - 222, { r: 42, color: 0x3a7fd6, label: 'ジャンプ' }, () => game().doJump());
    // 攻撃(オレンジ・特大)連打対応
    this.makeButton(458, VIEW_H - 98, { r: 56, color: 0xff8a2a, label: '攻撃' }, () => game().doAttack(), true);

    // スキル3つ(攻撃ボタンの周りに扇状配置)
    const skillPos: [number, number][] = [[338, VIEW_H - 58], [318, VIEW_H - 148], [360, VIEW_H - 232]];
    this.skillBtns = skillPos.map(([x, y], i) =>
      this.makeButton(x, y, { r: 36, color: 0x8a5ac4, label: '-', sub: '' }, () => game().doSkill(i))
    );

    // 回復薬
    this.potionHpBtn = this.makeButton(252, VIEW_H - 208, { r: 31, color: 0xc43a4a, icon: 'potion_hp_0', sub: '0' }, () => game().usePotion('hp'));
    this.potionMpBtn = this.makeButton(252, VIEW_H - 284, { r: 31, color: 0x3a4ac4, icon: 'potion_mp_0', sub: '0' }, () => game().usePotion('mp'));

    // キャラ交代(ステータスパネルの下)
    this.switchBtn = this.makeButton(48, 152, { r: 28, color: 0x4aa84a, label: '' }, () => game().switchChar());
    this.switchIcon = this.add.sprite(48, 150, 'mage_0').setScale(1.7);
    this.add.text(48, 176, '交代', {
      fontFamily: 'sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#ffffff', stroke: '#1a3d1a', strokeThickness: 3,
    }).setOrigin(0.5).setResolution(2);
  }

  refreshSkillButtons() {
    // syncはupdate内で行うため何もしなくて良い(将来の拡張用フック)
  }

  private drawCooldown(btn: Btn, cdLeft: number, cd: number) {
    const g = btn.cdOverlay;
    g.clear();
    if (cdLeft <= 0) return;
    const frac = cdLeft / cd;
    g.fillStyle(0x000000, 0.55);
    g.slice(0, 0, btn.opts.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac, false);
    g.fillPath();
  }

  // ============================================================
  // バナー・オーバーレイ
  // ============================================================
  showBanner(text: string, color = '#ffffff') {
    this.banner?.destroy();
    const c = this.add.container(VIEW_W / 2, 230).setDepth(50);
    const t = this.add.text(0, 0, text, {
      fontFamily: 'sans-serif', fontSize: '26px', fontStyle: 'bold',
      color, stroke: '#1a1430', strokeThickness: 8,
      align: 'center', wordWrap: { width: VIEW_W - 60 },
    }).setOrigin(0.5).setResolution(2);
    c.add(t);
    c.setScale(0.3).setAlpha(0);
    this.banner = c;
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 250, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: c, alpha: 0, y: 200, delay: 2100, duration: 450,
      onComplete: () => { if (this.banner === c) this.banner = undefined; c.destroy(); },
    });
  }

  showGameOver(onRevive: () => void) {
    this.clearOverlay();
    const cy = VIEW_H / 2;
    const c = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(VIEW_W / 2, cy, VIEW_W, VIEW_H, 0x000000, 0.72).setInteractive();
    const title = this.add.text(VIEW_W / 2, cy - 160, 'GAME OVER', {
      fontFamily: '"Arial Black", sans-serif', fontSize: '56px',
      color: '#ff5a5a', stroke: '#3d0a0a', strokeThickness: 10,
    }).setOrigin(0.5).setResolution(2);
    const subtitle = this.add.text(VIEW_W / 2, cy - 94, '勇者たちは力尽きた…', {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#ffd8d8',
    }).setOrigin(0.5).setResolution(2);
    c.add([dim, title, subtitle]);
    c.add(this.makeOverlayButton(VIEW_W / 2, cy + 20, 'このステージから復活', 0xff8a2a, () => {
      this.clearOverlay();
      onRevive();
    }));
    c.add(this.makeOverlayButton(VIEW_W / 2, cy + 120, 'タイトルへもどる', 0x6a6a8a, () => this.toTitle()));
    this.overlay = c;
  }

  showClear(stats: { level: number; kills: number; time: number }) {
    this.clearOverlay();
    sfx('levelup');
    const cy = VIEW_H / 2;
    const c = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(VIEW_W / 2, cy, VIEW_W, VIEW_H, 0x0a0a20, 0.82).setInteractive();
    const title = this.add.text(VIEW_W / 2, cy - 210, 'GAME CLEAR!', {
      fontFamily: '"Arial Black", sans-serif', fontSize: '54px',
      color: '#ffd24a', stroke: '#7a4a21', strokeThickness: 10,
    }).setOrigin(0.5).setResolution(2);
    const sub = this.add.text(VIEW_W / 2, cy - 144, '闇に堕ちた女帝を解放した!\nきのこ島に平和が戻った 🎉', {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#ffffff', align: 'center',
    }).setOrigin(0.5).setResolution(2);
    const m = Math.floor(stats.time / 60), s = stats.time % 60;
    const statsText = this.add.text(VIEW_W / 2, cy - 40,
      `とうたつレベル: Lv.${stats.level}\nモンスター討伐数: ${stats.kills}体\nクリアタイム: ${m}分${s}秒`, {
        fontFamily: 'sans-serif', fontSize: '24px', color: '#cfe0ff', align: 'center', lineSpacing: 10,
      }).setOrigin(0.5).setResolution(2);
    // 主役たちのドット絵
    const w = this.add.sprite(VIEW_W / 2 - 60, cy + 100, 'warrior_0').setScale(4);
    const mg = this.add.sprite(VIEW_W / 2 + 60, cy + 100, 'mage_0').setScale(4).setFlipX(true);
    this.tweens.add({ targets: [w, mg], y: '-=14', duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    c.add([dim, title, sub, statsText, w, mg]);
    c.add(this.makeOverlayButton(VIEW_W / 2, cy + 220, 'タイトルへもどる', 0xffb347, () => this.toTitle()));
    this.overlay = c;
  }

  private makeOverlayButton(x: number, y: number, label: string, color: number, onTap: () => void) {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const w = 340, h = 64;
    const col = Phaser.Display.Color.IntegerToColor(color);
    g.fillStyle(col.clone().darken(30).color, 1);
    g.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 16);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    const t = this.add.text(0, 0, label, {
      fontFamily: 'sans-serif', fontSize: '24px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#1a1430', strokeThickness: 4,
    }).setOrigin(0.5).setResolution(2);
    c.add([g, t]);
    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => {
      sfx('select');
      this.tweens.add({ targets: c, scale: 0.93, duration: 70, yoyo: true, onComplete: onTap });
    });
    return c;
  }

  private clearOverlay() {
    this.overlay?.destroy();
    this.overlay = undefined;
  }

  private toTitle() {
    this.clearOverlay();
    stopBgm();
    this.registry.remove('progress');
    this.scene.stop('Game');
    this.scene.start('Title');
    this.scene.stop();
  }

  // ============================================================
  // 毎フレーム同期
  // ============================================================
  update() {
    const game = this.scene.get('Game') as GameScene;
    if (!game || !game.uiState) return;
    this.game_ = game;
    const ui = game.uiState;

    this.drawBars();
    this.drawBossBar();
    this.stageText.setText(ui.stageName);
    this.killText.setText(ui.boss ? 'ボスを倒せ!' : `討伐 ${ui.kills} / ${ui.quota}`);

    ui.skills.forEach((s, i) => {
      const btn = this.skillBtns[i];
      if (!btn) return;
      if (btn.label && btn.label.text !== s.label) btn.label.setText(s.label);
      if (btn.sub && btn.sub.text !== `MP${s.mp}`) btn.sub.setText(`MP${s.mp}`);
      this.drawCooldown(btn, s.cdLeft, s.cd);
      const noMp = ui.mp < s.mp;
      btn.container.setAlpha(noMp ? 0.55 : 1);
    });

    if (this.potionHpBtn.sub) this.potionHpBtn.sub.setText(String(ui.potions.hp));
    if (this.potionMpBtn.sub) this.potionMpBtn.sub.setText(String(ui.potions.mp));
    this.potionHpBtn.container.setAlpha(ui.potions.hp > 0 ? 1 : 0.5);
    this.potionMpBtn.container.setAlpha(ui.potions.mp > 0 ? 1 : 0.5);
    this.drawCooldown(this.switchBtn, ui.switchCdLeft, 2000);
  }
}
