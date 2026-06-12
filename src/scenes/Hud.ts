import Phaser from 'phaser';
import { VIEW_W, VIEW_H, SAFE_TOP } from '../main';
import { sfx, setMuted, isMuted, stopBgm } from '../audio';
import { fmt, fmtBig, DIFFICULTIES, loadSave } from '../data';
import { openFloorSelect } from '../ui/FloorSelect';
import type GameScene from './Game';

interface BtnOpts {
  r: number;
  color: number;
  label?: string;
  sub?: string;
  icon?: string;
  iconScale?: number;
  wrap?: boolean;      // ラベルを小さく折り返す(技名用)
  labelY?: number;
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
  private critText!: Phaser.GameObjects.Text;
  private stageText!: Phaser.GameObjects.Text;
  private killText!: Phaser.GameObjects.Text;
  private bossG!: Phaser.GameObjects.Graphics;
  private bossText!: Phaser.GameObjects.Text;
  // 無限ボスモード表示
  private infGaugeText!: Phaser.GameObjects.Text;   // 何ゲージ目か
  private infHpText!: Phaser.GameObjects.Text;       // 現在HP/ゲージHP
  private infTimerText!: Phaser.GameObjects.Text;    // 残り秒
  private infTotalText!: Phaser.GameObjects.Text;    // 累計ダメージ

  private skillBtns: Btn[] = [];
  private potionHpBtn!: Btn; // エリクサーボタン

  private banner?: Phaser.GameObjects.Container;
  private overlay?: Phaser.GameObjects.Container;
  private gamePaused = false;
  private mpFlashUntil = 0;

  constructor() {
    super('Hud');
  }

  create() {
    this.game_ = this.scene.get('Game') as GameScene;
    this.buildStatusBars();
    this.buildBossBar();
    this.buildJoystick();
    this.buildActionButtons();
    this.buildTopRight();
    this.scene.bringToTop();
  }

  // ============================================================
  // ステータス表示(左上)
  // ============================================================
  private buildStatusBars() {
    const ST = SAFE_TOP;
    const g = this.add.graphics();
    g.fillStyle(0x1a1430, 0.75);
    g.fillRoundedRect(10, 14 + ST, 286, 112, 14);
    g.lineStyle(2, 0xffb347, 0.9);
    g.strokeRoundedRect(10, 14 + ST, 286, 112, 14);

    // ポートレート枠
    g.fillStyle(0x2a1f3d, 1);
    g.fillCircle(56, 62 + ST, 36);
    g.lineStyle(3, 0xffb347, 1);
    g.strokeCircle(56, 62 + ST, 36);

    this.portraitIcon = this.add.sprite(56, 64 + ST, 'warrior_0').setScale(2.6);
    this.lvText = this.add.text(104, 24 + ST, 'Lv.1 剣士', {
      fontFamily: 'sans-serif', fontSize: '17px', fontStyle: 'bold', color: '#ffe9b0',
    }).setResolution(2);

    this.barsG = this.add.graphics();
    this.hpText = this.add.text(286, 52 + ST, '', {
      fontFamily: 'sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(1, 0.5).setResolution(2);
    this.mpText = this.add.text(286, 74 + ST, '', {
      fontFamily: 'sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(1, 0.5).setResolution(2);
    this.critText = this.add.text(104, 104 + ST, '', {
      fontFamily: 'sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#ffd24a',
    }).setResolution(2);
  }

  private drawBars() {
    const ui = this.game_.uiState;
    if (!ui) return;
    const g = this.barsG;
    const x = 104, w = 182, ST = SAFE_TOP;
    g.clear();
    // HP
    g.fillStyle(0x3d2430, 1);
    g.fillRoundedRect(x, 46 + ST, w, 13, 6);
    g.fillStyle(0xe8443a, 1);
    const hpw = Math.max(0, (ui.hp / ui.maxhp) * (w - 2));
    if (hpw > 1) g.fillRoundedRect(x + 1, 47 + ST, hpw, 11, 5);
    // MP
    const mpFlash = this.time.now < this.mpFlashUntil && Math.floor(this.time.now / 100) % 2 === 0;
    g.fillStyle(mpFlash ? 0x6a2430 : 0x24303d, 1);
    g.fillRoundedRect(x, 68 + ST, w, 13, 6);
    g.fillStyle(0x3a6ae8, 1);
    const mpw = Math.max(0, (ui.mp / ui.maxmp) * (w - 2));
    if (mpw > 1) g.fillRoundedRect(x + 1, 69 + ST, mpw, 11, 5);
    // EXP
    g.fillStyle(0x3d3a24, 1);
    g.fillRoundedRect(x, 90 + ST, w, 9, 4);
    g.fillStyle(0xffd24a, 1);
    const xw = Math.max(0, Math.min(1, ui.exp / ui.expNext) * (w - 2));
    if (xw > 1) g.fillRoundedRect(x + 1, 91 + ST, xw, 7, 3);

    this.hpText.setText(`${fmt(ui.hp)}/${fmt(ui.maxhp)}`);
    this.mpText.setText(`${fmt(ui.mp)}/${fmt(ui.maxmp)}`);
    this.lvText.setText(`Lv.${ui.level} ${ui.charName}`);
    // クリティカル率 + バフ残り秒
    let crit = `CRI ${Math.round(ui.critRate * 100)}%`;
    if (ui.buffLeft > 0) crit += `  ${ui.buffName} ${Math.ceil(ui.buffLeft / 1000)}s`;
    this.critText.setText(crit);
    const tex = `${ui.spriteKey}_0`;
    if (this.portraitIcon.texture.key !== tex) this.portraitIcon.setTexture(tex);
  }

  flashMp() {
    this.mpFlashUntil = this.time.now + 600;
  }

  // ============================================================
  // ボスHPバー
  // ============================================================
  private buildBossBar() {
    this.bossG = this.add.graphics();
    this.bossText = this.add.text(VIEW_W / 2, 130 + SAFE_TOP, '', {
      fontFamily: 'sans-serif', fontSize: '16px', fontStyle: 'bold',
      color: '#ffd8e2', stroke: '#5c1a2d', strokeThickness: 4,
    }).setOrigin(0.5).setResolution(2);
    // 無限ボス: ゲージ番号(バー右)/現在HP(バー下)/タイマー・累計(中央上)
    this.infGaugeText = this.add.text(0, 0, '', {
      fontFamily: '"Arial Black", sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#ffd24a', stroke: '#5c2a1a', strokeThickness: 3,
    }).setOrigin(0, 0.5).setResolution(2).setVisible(false);
    this.infHpText = this.add.text(0, 0, '', {
      fontFamily: 'sans-serif', fontSize: '13px', fontStyle: 'bold', color: '#ffffff', stroke: '#3a1020', strokeThickness: 3,
    }).setOrigin(0.5).setResolution(2).setVisible(false);
    this.infTimerText = this.add.text(VIEW_W / 2, 96 + SAFE_TOP, '', {
      fontFamily: '"Arial Black", sans-serif', fontSize: '22px', color: '#ffffff', stroke: '#2a1a44', strokeThickness: 5,
    }).setOrigin(0.5).setResolution(2).setVisible(false);
    this.infTotalText = this.add.text(VIEW_W / 2, 118 + SAFE_TOP, '', {
      fontFamily: '"Arial Black", sans-serif', fontSize: '17px', color: '#ffe45a', stroke: '#7a3a1a', strokeThickness: 4,
    }).setOrigin(0.5).setResolution(2).setVisible(false);
  }

  private drawBossBar() {
    const ui = this.game_.uiState;
    const g = this.bossG;
    g.clear();

    // 無限ボスモード: ゲージ(2倍化HP)+番号+数値+タイマー+累計ダメージ
    if (ui?.infinite) {
      const w = 300, x = (VIEW_W - w) / 2, y = 150 + SAFE_TOP;
      this.bossText.setText('無 限 ボ ス');
      g.fillStyle(0x1a1430, 0.85);
      g.fillRoundedRect(x - 4, y - 4, w + 8, 24, 10);
      g.fillStyle(0x241038, 1);
      g.fillRoundedRect(x, y, w, 16, 8);
      g.fillStyle(0xc24aff, 1);
      const hw = Math.max(0, (ui.infMax > 0 ? ui.infHp / ui.infMax : 0) * (w - 2));
      if (hw > 1) g.fillRoundedRect(x + 1, y + 1, hw, 14, 7);
      g.lineStyle(2, 0xe0a0ff, 0.9);
      g.strokeRoundedRect(x, y, w, 16, 8);
      // ゲージ番号(バー右)
      this.infGaugeText.setVisible(true).setPosition(x + w + 8, y + 8).setText(`${fmtBig(ui.infGauge)} ゲージ目`);
      // 現在HP/ゲージHP(バー下)
      this.infHpText.setVisible(true).setPosition(VIEW_W / 2, y + 30).setText(`${fmtBig(ui.infHp)} / ${fmtBig(ui.infMax)}`);
      // タイマー & 累計ダメージ
      this.infTimerText.setVisible(true).setText(`残り ${ui.infTimeLeft} 秒`).setColor(ui.infTimeLeft <= 10 ? '#ff8a8a' : '#ffffff');
      this.infTotalText.setVisible(true).setText(`累計ダメージ ${fmtBig(ui.infTotal)}`);
      return;
    }
    if (this.infGaugeText.visible) { this.infGaugeText.setVisible(false); this.infHpText.setVisible(false); this.infTimerText.setVisible(false); this.infTotalText.setVisible(false); }

    if (!ui?.boss) {
      this.bossText.setText('');
      return;
    }
    const w = 360, x = (VIEW_W - w) / 2, y = 146 + SAFE_TOP;
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
    const ST = SAFE_TOP;
    const g = this.add.graphics();
    g.fillStyle(0x1a1430, 0.78);
    g.fillRoundedRect(VIEW_W - 232, 14 + ST, 218, 70, 12);
    g.lineStyle(2, 0x8a7ac4, 0.8);
    g.strokeRoundedRect(VIEW_W - 232, 14 + ST, 218, 70, 12);

    // 階層(大)
    this.stageText = this.add.text(VIEW_W - 123, 30 + ST, '', {
      fontFamily: '"Arial Black", sans-serif', fontSize: '17px', fontStyle: 'bold', color: '#ffe9b0',
    }).setOrigin(0.5).setResolution(2);
    // ボス名 + 推奨レベル
    this.killText = this.add.text(VIEW_W - 123, 58 + ST, '', {
      fontFamily: 'sans-serif', fontSize: '13px', color: '#dcd2ff', align: 'center',
    }).setOrigin(0.5).setResolution(2);

    // 操作ボタン: 音量 → 一時停止 → トップに戻る の順
    const iconY = 108 + ST;
    const mk = (x: number, draw: (g: Phaser.GameObjects.Graphics, pressed: boolean) => void, onTap: () => void) => {
      const c = this.add.container(x, iconY).setDepth(60);
      const g = this.add.graphics();
      const render = (pressed: boolean) => {
        g.clear();
        g.fillStyle(0x2a2440, pressed ? 1 : 0.82);
        g.fillCircle(0, 0, 21);
        g.lineStyle(2, 0x8a7ac4, 0.9);
        g.strokeCircle(0, 0, 21);
        draw(g, pressed);
      };
      render(false);
      c.add(g);
      c.setSize(46, 46).setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => { render(true); onTap(); this.time.delayedCall(120, () => render(false)); });
      return { c, render };
    };

    // 音量(ミュート切替)
    let volRender: (p: boolean) => void = () => {};
    const drawVol = (g: Phaser.GameObjects.Graphics) => {
      g.fillStyle(0xffffff, 1);
      g.fillRect(-9, -5, 5, 10);
      g.fillTriangle(-4, -8, -4, 8, 5, 0);
      if (isMuted()) {
        g.lineStyle(2.5, 0xff5a5a, 1);
        g.lineBetween(-2, -8, 10, 8);
      } else {
        g.lineStyle(2, 0xffffff, 0.9);
        g.beginPath(); g.arc(5, 0, 6, -0.8, 0.8); g.strokePath();
        g.beginPath(); g.arc(5, 0, 9, -0.7, 0.7); g.strokePath();
      }
    };
    const vol = mk(VIEW_W - 122, (g) => drawVol(g), () => { setMuted(!isMuted()); volRender(false); });
    volRender = vol.render;

    // 一時停止
    mk(VIEW_W - 74, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillRect(-6, -8, 4, 16);
      g.fillRect(3, -8, 4, 16);
    }, () => this.showPause());

    // トップに戻る(家アイコン)
    mk(VIEW_W - 26, (g) => {
      g.fillStyle(0xffe9b0, 1);
      g.fillTriangle(0, -10, -11, 0, 11, 0);      // 屋根
      g.fillRect(-8, 0, 16, 9);                     // 壁
      g.fillStyle(0x2a2440, 1);
      g.fillRect(-3, 2, 6, 7);                      // ドア
    }, () => this.confirmHome());
  }

  // Gameシーンを一時停止(ボスの攻撃・移動・ダメージ・タイマーをすべて止める)
  private pauseGame() {
    if (this.scene.isActive('Game') && !this.scene.isPaused('Game')) {
      this.scene.pause('Game');
      this.gamePaused = true;
    }
  }
  private resumeGame() {
    if (this.gamePaused) {
      this.scene.resume('Game');
      this.gamePaused = false;
    }
  }

  // 一時停止画面
  private showPause() {
    if (this.overlay) return;
    this.pauseGame();
    sfx('select');
    const cy = VIEW_H / 2;
    const c = this.add.container(0, 0).setDepth(120);
    const dim = this.add.rectangle(VIEW_W / 2, cy, VIEW_W, VIEW_H, 0x05030a, 0.7).setInteractive();
    const title = this.add.text(VIEW_W / 2, cy - 140, 'PAUSE', {
      fontFamily: '"Arial Black", sans-serif', fontSize: '52px', color: '#ffe9b0', stroke: '#4a2a5a', strokeThickness: 9,
    }).setOrigin(0.5).setResolution(2);
    c.add([dim, title]);
    c.add(this.makeOverlayButton(VIEW_W / 2, cy - 30, 'ゲームにもどる', 0x4aa84a, () => this.clearOverlay()));
    c.add(this.makeOverlayButton(VIEW_W / 2, cy + 58, isMuted() ? '🔇 音量オン' : '🔊 音量オフ', 0x3a6ad8, () => {
      setMuted(!isMuted());
      this.overlay?.destroy(); this.overlay = undefined;
      this.showPause();
    }));
    c.add(this.makeOverlayButton(VIEW_W / 2, cy + 146, 'タイトルへもどる', 0x6a6a8a, () => this.toTitle()));
    this.overlay = c;
  }

  private confirmHome() {
    if (this.overlay) return;
    this.pauseGame();
    sfx('select');
    const cy = VIEW_H / 2;
    const c = this.add.container(0, 0).setDepth(120);
    const dim = this.add.rectangle(VIEW_W / 2, cy, VIEW_W, VIEW_H, 0x05030a, 0.7).setInteractive();
    const t = this.add.text(VIEW_W / 2, cy - 80, 'タイトルへ戻りますか?\n(レベルは記憶されます)', {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#ffffff', align: 'center', lineSpacing: 8, stroke: '#1a1430', strokeThickness: 5,
    }).setOrigin(0.5).setResolution(2);
    c.add([dim, t]);
    c.add(this.makeOverlayButton(VIEW_W / 2, cy + 10, 'もどる', 0xff8a2a, () => this.toTitle()));
    c.add(this.makeOverlayButton(VIEW_W / 2, cy + 98, 'つづける', 0x6a6a8a, () => this.clearOverlay()));
    this.overlay = c;
  }

  // ============================================================
  // ジョイスティック(左下)— 押した方向に白い丸。下方向なし(上=ジャンプ)
  // ============================================================
  private joyCx = 120;
  private joyCy = VIEW_H - 150;
  private joyR = 78;          // 基部の半径
  private joyKnob!: Phaser.GameObjects.Arc;
  private joyPointerId: number | null = null;

  private buildJoystick() {
    const g = this.add.graphics();
    // 基部の円
    g.fillStyle(0x1a1430, 0.45);
    g.fillCircle(this.joyCx, this.joyCy, this.joyR);
    g.lineStyle(4, 0xffffff, 0.25);
    g.strokeCircle(this.joyCx, this.joyCy, this.joyR);
    // 方向ガイド(上/左/右の薄い印)
    g.fillStyle(0xffffff, 0.18);
    g.fillTriangle(this.joyCx, this.joyCy - this.joyR + 8, this.joyCx - 10, this.joyCy - this.joyR + 24, this.joyCx + 10, this.joyCy - this.joyR + 24);
    g.fillTriangle(this.joyCx - this.joyR + 8, this.joyCy, this.joyCx - this.joyR + 24, this.joyCy - 10, this.joyCx - this.joyR + 24, this.joyCy + 10);
    g.fillTriangle(this.joyCx + this.joyR - 8, this.joyCy, this.joyCx + this.joyR - 24, this.joyCy - 10, this.joyCx + this.joyR - 24, this.joyCy + 10);

    // ノブ(押している方向に出る白い丸)
    this.joyKnob = this.add.circle(this.joyCx, this.joyCy, 26, 0xffffff, 0.85).setVisible(false);

    // 入力ゾーン(基部より少し広め)
    const zone = this.add.zone(this.joyCx, this.joyCy, this.joyR * 2.4, this.joyR * 2.4).setInteractive();
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.joyPointerId !== null) return;
      this.joyPointerId = p.id;
      this.updateJoy(p);
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id === this.joyPointerId) this.updateJoy(p);
    });
    const release = (p: Phaser.Input.Pointer) => {
      if (p.id === this.joyPointerId) this.resetJoy();
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
  }

  private updateJoy(p: Phaser.Input.Pointer) {
    let dx = p.x - this.joyCx;
    let dy = p.y - this.joyCy;
    const dist = Math.hypot(dx, dy);
    const max = this.joyR;
    if (dist > max) { dx = (dx / dist) * max; dy = (dy / dist) * max; }
    this.joyKnob.setPosition(this.joyCx + dx, this.joyCy + dy).setVisible(true);
    // 方向判定(下方向は無視)
    const left = dx < -max * 0.28;
    const right = dx > max * 0.28;
    const up = dy < -max * 0.34;
    this.game_.setPad({ left, right, up } as never);
  }

  private resetJoy() {
    this.joyPointerId = null;
    this.joyKnob.setVisible(false).setPosition(this.joyCx, this.joyCy);
    this.game_.setPad({ left: false, right: false, up: false } as never);
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
    if (opts.label !== undefined) {
      if (opts.wrap) {
        // 技名: 小さめフォントで折り返してボタン内に収める
        label = this.add.text(0, opts.labelY ?? -6, opts.label, {
          fontFamily: 'sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#ffffff',
          align: 'center', wordWrap: { width: opts.r * 1.9 }, lineSpacing: 1,
          stroke: '#2a1f3d', strokeThickness: 2,
        }).setOrigin(0.5).setResolution(3);
      } else {
        label = this.add.text(0, opts.icon ? opts.r - 18 : -4, opts.label, {
          fontFamily: 'sans-serif', fontSize: `${Math.max(13, opts.r * 0.36)}px`, fontStyle: 'bold', color: '#ffffff',
        }).setOrigin(0.5).setResolution(2);
      }
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

    // 攻撃(オレンジ・特大)連打対応 — ジャンプは移動スティックの上方向に統合
    this.makeButton(468, VIEW_H - 92, { r: 54, color: 0xff8a2a, label: '攻撃' }, () => game().doAttack(), true);

    // スキル3つ(実技名を折り返し表示・攻撃ボタンの周りに扇状配置)
    const skillPos: [number, number][] = [[332, VIEW_H - 78], [322, VIEW_H - 188], [402, VIEW_H - 250]];
    this.skillBtns = skillPos.map(([x, y], i) =>
      this.makeButton(x, y, { r: 46, color: 0x8a5ac4, label: '', sub: '', wrap: true, labelY: -8 }, () => game().doSkill(i))
    );

    // エリクサー(HP/MP全回復・1種)
    this.potionHpBtn = this.makeButton(232, VIEW_H - 246, { r: 34, color: 0xd8930f, icon: 'elixir_0', iconScale: 2.4, sub: '0' }, () => game().useElixir());

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

  showGameOver(floor: number, difficulty: number, onRetry1: () => void, onPickFloor: (floor: number, diff: number) => void) {
    this.clearOverlay();
    const cy = VIEW_H / 2;
    const c = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(VIEW_W / 2, cy, VIEW_W, VIEW_H, 0x000000, 0.72).setInteractive();
    const title = this.add.text(VIEW_W / 2, cy - 200, 'GAME OVER', {
      fontFamily: '"Arial Black", sans-serif', fontSize: '54px',
      color: '#ff5a5a', stroke: '#3d0a0a', strokeThickness: 10,
    }).setOrigin(0.5).setResolution(2);
    const subtitle = this.add.text(VIEW_W / 2, cy - 132, `第 ${floor} 階で力尽きた…`, {
      fontFamily: 'sans-serif', fontSize: '24px', color: '#ffd8d8',
    }).setOrigin(0.5).setResolution(2);
    const hint = this.add.text(VIEW_W / 2, cy - 86, 'レベルは引き継がれる。鍛えて再挑戦!', {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#cfe0ff',
    }).setOrigin(0.5).setResolution(2);
    c.add([dim, title, subtitle, hint]);
    c.add(this.makeOverlayButton(VIEW_W / 2, cy - 24, '1階から再挑戦', 0xff8a2a, () => { this.clearOverlay(); onRetry1(); }));
    c.add(this.makeOverlayButton(VIEW_W / 2, cy + 64, '階層をえらぶ', 0x8a5ac4, () => {
      openFloorSelect(this, loadSave(), difficulty, (f, d) => { this.clearOverlay(); onPickFloor(f, d); });
    }));
    c.add(this.makeOverlayButton(VIEW_W / 2, cy + 152, 'タイトルへもどる', 0x6a6a8a, () => this.toTitle()));
    this.overlay = c;
  }

  showClear(stats: { level: number; time: number; difficulty: string; unlockedNext: string | null }) {
    this.clearOverlay();
    sfx('levelup');
    const cy = VIEW_H / 2;
    const c = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(VIEW_W / 2, cy, VIEW_W, VIEW_H, 0x0a0a20, 0.82).setInteractive();
    const title = this.add.text(VIEW_W / 2, cy - 220, `${stats.difficulty} 制覇!`, {
      fontFamily: '"Arial Black", sans-serif', fontSize: '46px',
      color: '#ffd24a', stroke: '#7a4a21', strokeThickness: 10,
    }).setOrigin(0.5).setResolution(2);
    const sub = this.add.text(VIEW_W / 2, cy - 158, '黒き魔導士を打ち倒し\n道場の頂に立った! 🎉', {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#ffffff', align: 'center',
    }).setOrigin(0.5).setResolution(2);
    const m = Math.floor(stats.time / 60), s = stats.time % 60;
    const statsText = this.add.text(VIEW_W / 2, cy - 56,
      `とうたつレベル: Lv.${stats.level}\n制覇タイム: ${m}分${s}秒`, {
        fontFamily: 'sans-serif', fontSize: '23px', color: '#cfe0ff', align: 'center', lineSpacing: 10,
      }).setOrigin(0.5).setResolution(2);
    c.add([dim, title, sub, statsText]);
    if (stats.unlockedNext) {
      c.add(this.add.text(VIEW_W / 2, cy + 8, `🔓 ${stats.unlockedNext} 解放!`, {
        fontFamily: '"Arial Black", sans-serif', fontSize: '22px', color: '#8effa0', stroke: '#1a3d1a', strokeThickness: 4,
      }).setOrigin(0.5).setResolution(2));
    }
    const w = this.add.sprite(VIEW_W / 2 - 60, cy + 100, 'warrior5_0').setScale(4);
    const mg = this.add.sprite(VIEW_W / 2 + 60, cy + 100, 'mage5_0').setScale(4).setFlipX(true);
    this.tweens.add({ targets: [w, mg], y: '-=14', duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    c.add([w, mg]);
    c.add(this.makeOverlayButton(VIEW_W / 2, cy + 210, 'タイトルへもどる', 0xffb347, () => this.toTitle()));
    this.overlay = c;
  }

  // 無限ボスの結果(1分間の累積ダメージ)
  showInfiniteResult(r: { total: number; maxHit: number; gauge: number; level: number; job: string }) {
    this.clearOverlay();
    sfx('levelup');
    const cy = VIEW_H / 2;
    const c = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(VIEW_W / 2, cy, VIEW_W, VIEW_H, 0x0a0420, 0.85).setInteractive();
    const title = this.add.text(VIEW_W / 2, cy - 210, 'TIME UP!', {
      fontFamily: '"Arial Black", sans-serif', fontSize: '50px', color: '#ff9ad8', stroke: '#5c1a3d', strokeThickness: 10,
    }).setOrigin(0.5).setResolution(2);
    this.add.existing(title);
    const lab = this.add.text(VIEW_W / 2, cy - 140, '1分間の累積ダメージ', {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#ffffff',
    }).setOrigin(0.5).setResolution(2);
    const total = this.add.text(VIEW_W / 2, cy - 92, fmtBig(r.total), {
      fontFamily: '"Arial Black", sans-serif', fontSize: '54px', color: '#ffe45a', stroke: '#7a3a1a', strokeThickness: 9,
    }).setOrigin(0.5).setResolution(2);
    const exact = this.add.text(VIEW_W / 2, cy - 50, `(${fmt(r.total)})`, {
      fontFamily: 'sans-serif', fontSize: '15px', color: '#cfe0ff',
    }).setOrigin(0.5).setResolution(2);
    const detail = this.add.text(VIEW_W / 2, cy + 24,
      `最大の一撃: ${fmtBig(r.maxHit)}\n到達ゲージ: ${fmtBig(r.gauge)} ゲージ目\nLv.${r.level} ${r.job}`, {
        fontFamily: 'sans-serif', fontSize: '20px', color: '#cfe0ff', align: 'center', lineSpacing: 9,
      }).setOrigin(0.5).setResolution(2);
    total.setScale(0.4);
    this.tweens.add({ targets: total, scale: 1, duration: 350, ease: 'Back.easeOut' });
    c.add([dim, title, lab, total, exact, detail]);
    c.add(this.makeOverlayButton(VIEW_W / 2, cy + 130, 'もう一度', 0xff8a2a, () => {
      this.clearOverlay();
      (this.scene.get('Game') as GameScene).scene.restart({ infinite: true });
    }));
    c.add(this.makeOverlayButton(VIEW_W / 2, cy + 214, 'タイトルへもどる', 0x6a6a8a, () => this.toTitle()));
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
    this.resumeGame();
  }

  private toTitle() {
    this.overlay?.destroy();
    this.overlay = undefined;
    this.gamePaused = false;
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
    if (ui.infinite) {
      this.stageText.setText('無限ボス');
      this.killText.setText('最大ダメージ計測');
      this.killText.setColor('#ff9ad8');
    } else {
      this.stageText.setText(`第 ${ui.floor} 階 / ${ui.total}`);
      this.killText.setText(`${ui.floorName}  [${DIFFICULTIES[ui.difficulty].name}]`);
      this.killText.setColor(ui.underLeveled ? '#ff8a8a' : '#dcd2ff');
    }

    ui.skills.forEach((s, i) => {
      const btn = this.skillBtns[i];
      if (!btn) return;
      if (btn.label && btn.label.text !== s.name) btn.label.setText(s.name);
      const mpLabel = `MP${fmt(s.mp)}`;
      if (btn.sub && btn.sub.text !== mpLabel) btn.sub.setText(mpLabel);
      this.drawCooldown(btn, s.cdLeft, s.cd);
      const noMp = ui.mp < s.mp;
      btn.container.setAlpha(noMp ? 0.55 : 1);
    });

    // エリクサー(残数 + クールタイム表示)
    if (this.potionHpBtn.sub) this.potionHpBtn.sub.setText(String(ui.elixirs));
    this.drawCooldown(this.potionHpBtn, ui.elixirCdLeft, 6000);
    this.potionHpBtn.container.setAlpha(ui.elixirs > 0 && ui.elixirCdLeft <= 0 ? 1 : 0.55);
  }
}
