import Phaser from 'phaser';
import {
  CHARACTERS, ENEMIES, BOSSES, STAGES, GROUND_Y, WORLD_H,
  expForLevel, statMul, saveStage, newProgress,
  type CharKey, type EnemyDef, type BossDef, type Progress, type StageDef,
} from '../data';
import { sfx, playBgm, stopBgm } from '../audio';
import type HudScene from './Hud';

const ZOOM = 3;
const TOUCH_DMG_CD = 900;

export interface PadState {
  left: boolean;
  right: boolean;
}

export interface UiState {
  charKey: CharKey;
  charName: string;
  hp: number; maxhp: number;
  mp: number; maxmp: number;
  level: number;
  exp: number; expNext: number;
  potions: { hp: number; mp: number };
  stageName: string;
  kills: number; quota: number;
  boss: { name: string; title: string; hp: number; max: number } | null;
  skills: { name: string; label: string; mp: number; cdLeft: number; cd: number }[];
  switchCdLeft: number;
  otherCharKey: CharKey;
  gameOver: boolean;
}

interface EnemySprite extends Phaser.Physics.Arcade.Sprite {
  def: EnemyDef;
  hp: number;
  maxhp: number;
  isBoss: boolean;
  hpBar?: Phaser.GameObjects.Graphics;
  lastHitAt: number;
  aiTimer: number;
  dir: number;
  touchCd: number;
  dying?: boolean;
}

export default class GameScene extends Phaser.Scene {
  private stageIdx = 0;
  private stage!: StageDef;
  private progress!: Progress;

  private player!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.GameObjects.Group;
  private playerShots!: Phaser.Physics.Arcade.Group;
  private enemyShots!: Phaser.Physics.Arcade.Group;
  private drops!: Phaser.Physics.Arcade.Group;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private pad: PadState = { left: false, right: false };

  private facing = 1;
  private attackCdAt = 0;
  private skillCdAt: number[] = [0, 0, 0];
  private switchCdAt = 0;
  private invulnUntil = 0;
  private stageKills = 0;
  private bossSpawned = false;
  private boss: EnemySprite | null = null;
  private portal: Phaser.Physics.Arcade.Sprite | null = null;
  private over = false;
  private transitioning = false;

  uiState!: UiState;

  constructor() {
    super('Game');
  }

  init(data: { stage?: number }) {
    this.stageIdx = data.stage ?? 0;
    this.stage = STAGES[this.stageIdx];
    this.facing = 1;
    this.attackCdAt = 0;
    this.skillCdAt = [0, 0, 0];
    this.switchCdAt = 0;
    this.invulnUntil = 0;
    this.stageKills = 0;
    this.bossSpawned = false;
    this.boss = null;
    this.portal = null;
    this.over = false;
    this.transitioning = false;
  }

  create() {
    this.progress = this.registry.get('progress') as Progress;
    if (!this.progress) {
      this.progress = newProgress(this.stageIdx);
      this.registry.set('progress', this.progress);
    }
    this.progress.stage = this.stageIdx;

    this.buildBackground();
    this.buildPlatforms();
    this.buildPlayer();
    this.buildGroups();
    this.buildColliders();
    this.buildCamera();
    this.buildKeyboard();

    // 雑魚スポーンループ
    this.time.addEvent({ delay: 1400, loop: true, callback: () => this.spawnTick() });
    this.spawnTick();
    this.spawnTick();

    playBgm(this.stage.bgm);
    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.time.delayedCall(150, () => {
      this.hud()?.showBanner(`${this.stage.name}  ${this.stage.sub}`, '#ffe9b0');
    });

    this.buildUiState();
    this.events.on('shutdown', () => this.tweens.killAll());
  }

  hud(): HudScene | null {
    return (this.scene.get('Hud') as HudScene) ?? null;
  }

  // ============================================================
  // 構築
  // ============================================================
  private buildBackground() {
    const w = this.stage.width;
    // 空のグラデーション
    const skyColors: Record<string, [string, string]> = {
      grass: ['#79c4f2', '#cfeaff'],
      sky: ['#5a8fd8', '#cfe4ff'],
      dark: ['#1a1030', '#3d2a5c'],
    };
    const key = `sky_${this.stage.theme}`;
    if (!this.textures.exists(key)) {
      const tex = this.textures.createCanvas(key, 4, 256)!;
      const ctx = tex.getContext();
      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, skyColors[this.stage.theme][0]);
      grad.addColorStop(1, skyColors[this.stage.theme][1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 4, 256);
      tex.refresh();
    }
    this.add.image(0, 0, key).setOrigin(0).setDisplaySize(w, WORLD_H).setDepth(-30);

    // 遠景の丘 / 雲 / 木
    const g = this.add.graphics().setDepth(-20).setScrollFactor(0.35, 1);
    if (this.stage.theme === 'grass') {
      g.fillStyle(0x5fae3c, 1);
      for (let x = -100; x < w; x += 180) g.fillEllipse(x, GROUND_Y + 30, 320, 180);
    } else if (this.stage.theme === 'sky') {
      g.fillStyle(0xffffff, 0.5);
      for (let x = -100; x < w; x += 150) g.fillEllipse(x, GROUND_Y + 40, 280, 120);
    } else {
      g.fillStyle(0x2a1d45, 1);
      for (let x = -80; x < w; x += 120) g.fillRect(x, GROUND_Y - 200, 34, 230);
    }

    for (let x = 60; x < w; x += Phaser.Math.Between(140, 220)) {
      if (this.stage.theme === 'grass') {
        this.add.image(x, GROUND_Y + 1, 'tree_0').setOrigin(0.5, 1).setDepth(-10)
          .setScrollFactor(0.7, 1).setScale(Phaser.Math.FloatBetween(0.9, 1.3));
      } else if (this.stage.theme === 'dark') {
        this.add.image(x, GROUND_Y + 1, 'tree_0').setOrigin(0.5, 1).setDepth(-10)
          .setScrollFactor(0.7, 1).setTint(0x6a4a9c).setScale(Phaser.Math.FloatBetween(0.9, 1.2));
      }
    }
    for (let x = 40; x < w; x += Phaser.Math.Between(120, 260)) {
      this.add.image(x, Phaser.Math.Between(60, 170), 'cloud_0').setDepth(-15)
        .setScrollFactor(0.25, 0.6)
        .setAlpha(this.stage.theme === 'dark' ? 0.18 : 0.85)
        .setScale(Phaser.Math.FloatBetween(0.7, 1.4));
    }
  }

  private buildPlatforms() {
    this.platforms = this.physics.add.staticGroup();
    const w = this.stage.width;
    const tile = this.stage.tile;

    // 地面: 表面は草つきタイル、下層は土だけのタイル
    this.add.tileSprite(w / 2, GROUND_Y + 8, w, 16, tile);
    this.add.tileSprite(w / 2, (GROUND_Y + 16 + WORLD_H) / 2, w, WORLD_H - GROUND_Y - 16, `${tile}_dirt`);
    const ground = this.add.rectangle(w / 2, (GROUND_Y + WORLD_H) / 2, w, WORLD_H - GROUND_Y);
    this.physics.add.existing(ground, true);
    this.platforms.add(ground as unknown as Phaser.Physics.Arcade.Sprite);

    // 浮遊足場(下から飛び乗れる一方通行)
    for (const p of this.stage.platforms) {
      const spr = this.add.tileSprite(p.x + p.w / 2, p.y + 6, p.w, 12, tile);
      this.physics.add.existing(spr, true);
      const body = (spr.body as Phaser.Physics.Arcade.StaticBody);
      if (p.oneway) {
        body.checkCollision.down = false;
        body.checkCollision.left = false;
        body.checkCollision.right = false;
      }
      this.platforms.add(spr as unknown as Phaser.Physics.Arcade.Sprite);
    }
  }

  private buildPlayer() {
    const charKey = this.progress.charKey;
    this.player = this.physics.add.sprite(48, GROUND_Y - 30, `${charKey}_0`);
    this.player.setSize(10, 20).setOffset(3, 3);
    this.player.setCollideWorldBounds(true);
    this.player.play(`${charKey}_stand`);
    this.player.setDepth(10);
    this.physics.world.setBounds(0, -40, this.stage.width, WORLD_H + 40);
  }

  private buildGroups() {
    this.enemies = this.add.group();
    this.playerShots = this.physics.add.group({ allowGravity: false });
    this.enemyShots = this.physics.add.group({ allowGravity: false });
    this.drops = this.physics.add.group();
  }

  private buildColliders() {
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.drops, this.platforms);
  }

  private buildCamera() {
    const cam = this.cameras.main;
    cam.setZoom(ZOOM);
    cam.setBounds(0, 0, this.stage.width, WORLD_H);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setFollowOffset(0, 40);
  }

  private buildKeyboard() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('Z,X,C,A,S,D,Q,W,E,SPACE') as Record<string, Phaser.Input.Keyboard.Key>;
  }

  private buildUiState() {
    const def = CHARACTERS[this.progress.charKey];
    this.uiState = {
      charKey: def.key,
      charName: def.name,
      hp: this.progress.chars[def.key].hp,
      maxhp: this.maxHp(def.key),
      mp: this.progress.chars[def.key].mp,
      maxmp: this.maxMp(def.key),
      level: this.progress.level,
      exp: this.progress.exp,
      expNext: expForLevel(this.progress.level),
      potions: this.progress.potions,
      stageName: `${this.stage.name} ${this.stage.sub}`,
      kills: this.stageKills,
      quota: this.stage.quota,
      boss: null,
      skills: def.skills.map((s) => ({ name: s.name, label: s.label, mp: s.mp, cdLeft: 0, cd: s.cd })),
      switchCdLeft: 0,
      otherCharKey: def.key === 'warrior' ? 'mage' : 'warrior',
      gameOver: false,
    };
  }

  // ============================================================
  // ステータス
  // ============================================================
  private maxHp(key: CharKey) {
    return Math.floor(CHARACTERS[key].maxhp * statMul(this.progress.level));
  }
  private maxMp(key: CharKey) {
    return Math.floor(CHARACTERS[key].maxmp * statMul(this.progress.level));
  }
  private atk() {
    return CHARACTERS[this.progress.charKey].atk * statMul(this.progress.level);
  }
  private get charDef() {
    return CHARACTERS[this.progress.charKey];
  }
  private get charState() {
    return this.progress.chars[this.progress.charKey];
  }

  // ============================================================
  // スポーン
  // ============================================================
  private spawnTick() {
    if (this.over || this.transitioning || this.bossSpawned) return;
    const counts: Record<string, number> = {};
    for (const e of this.enemies.getChildren() as EnemySprite[]) {
      if (!e.active || e.isBoss) continue;
      counts[e.def.key] = (counts[e.def.key] || 0) + 1;
    }
    for (const [key, max] of this.stage.mobs) {
      if ((counts[key] || 0) >= max) continue;
      this.spawnEnemy(ENEMIES[key]);
      break;
    }
  }

  private spawnEnemy(def: EnemyDef, x?: number, y?: number): EnemySprite {
    let px = x;
    if (px === undefined) {
      // プレイヤーから離れた位置に出す
      for (let i = 0; i < 8; i++) {
        px = Phaser.Math.Between(40, this.stage.width - 40);
        if (Math.abs(px - this.player.x) > 70) break;
      }
    }
    const e = this.physics.add.sprite(px!, y ?? GROUND_Y - 40, `${def.key}_0`) as EnemySprite;
    e.def = def;
    e.isBoss = false;
    e.maxhp = def.hp;
    e.hp = def.hp;
    e.lastHitAt = 0;
    e.aiTimer = 0;
    e.touchCd = 0;
    e.dir = Math.random() > 0.5 ? 1 : -1;
    e.setScale(def.scale);
    e.play(`${def.key}_move`);
    e.setDepth(5);
    const w = e.width * 0.7;
    const h = e.height * 0.8;
    e.setSize(w, h).setOffset((e.width - w) / 2, e.height - h);
    if (def.fly) {
      (e.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      e.y = GROUND_Y - Phaser.Math.Between(60, 110);
    } else {
      this.physics.add.collider(e, this.platforms);
    }
    this.enemies.add(e);
    return e;
  }

  private spawnBoss() {
    this.bossSpawned = true;
    const def = BOSSES[this.stage.boss];
    const x = Phaser.Math.Clamp(this.player.x + 130, 100, this.stage.width - 100);
    const b = this.spawnEnemy(def, x, def.fly ? GROUND_Y - 110 : GROUND_Y - 60) as EnemySprite;
    b.isBoss = true;
    b.setDepth(8);
    this.boss = b;
    this.hud()?.showBanner(`${def.title} ${def.name} が現れた!`, '#ff8a8a');
    playBgm('boss');
    this.cameras.main.shake(400, 0.004);
    sfx('thunder');

    // ボスの行動パターン
    const pattern = () => {
      if (!b.active || this.over) return;
      this.bossAction(b);
      const enraged = b.hp < b.maxhp * 0.5;
      this.time.delayedCall(enraged ? 1700 : 2600, pattern);
    };
    this.time.delayedCall(1500, pattern);
  }

  private bossAction(b: EnemySprite) {
    if (!b.active || b.dying) return;
    const key = b.def.key;
    const toPlayer = Math.sign(this.player.x - b.x) || 1;
    if (key === 'mushmom') {
      // プレイヤーへ向かって大ジャンプ → 着地衝撃波
      b.setVelocity(toPlayer * 110, -300);
      const checkLand = this.time.addEvent({
        delay: 60, loop: true,
        callback: () => {
          if (!b.active || this.over) { checkLand.remove(); return; }
          const body = b.body as Phaser.Physics.Arcade.Body;
          if (body.blocked.down && body.velocity.y >= 0 && checkLand.getOverallProgress() > 0.1) {
            checkLand.remove();
            this.cameras.main.shake(250, 0.008);
            sfx('thunder');
            this.shockwaveAt(b.x, b.def.atk, 70);
          }
        },
      });
    } else if (key === 'pinkbean') {
      // ピンクのオーブを扇状に発射
      const enraged = b.hp < b.maxhp * 0.5;
      const n = enraged ? 5 : 3;
      const base = Math.atan2(this.player.y - b.y, this.player.x - b.x);
      for (let i = 0; i < n; i++) {
        const ang = base + (i - (n - 1) / 2) * 0.28;
        const shot = this.enemyShots.create(b.x, b.y - 6, 'fx_orb_0') as Phaser.Physics.Arcade.Sprite;
        shot.setVelocity(Math.cos(ang) * 90, Math.sin(ang) * 90);
        shot.setDepth(9);
        (shot.body as Phaser.Physics.Arcade.Body).setCircle(4);
        this.time.delayedCall(3500, () => shot.destroy());
      }
      sfx('fire');
      // たまにぴょんぴょん移動
      if ((b.body as Phaser.Physics.Arcade.Body).blocked.down) {
        b.setVelocity(toPlayer * 90, -240);
      }
    } else if (key === 'cygnus') {
      const enraged = b.hp < b.maxhp * 0.5;
      if (Math.random() < 0.5) {
        // 羽根の弾幕
        const n = enraged ? 4 : 3;
        for (let i = 0; i < n; i++) {
          this.time.delayedCall(i * 180, () => {
            if (!b.active || this.over) return;
            const ang = Math.atan2(this.player.y - 4 - b.y, this.player.x - b.x);
            const shot = this.enemyShots.create(b.x, b.y, 'fx_feather_0') as Phaser.Physics.Arcade.Sprite;
            shot.setVelocity(Math.cos(ang) * 120, Math.sin(ang) * 120);
            shot.setRotation(ang);
            shot.setDepth(9);
            this.time.delayedCall(3000, () => shot.destroy());
            sfx('claw');
          });
        }
      } else {
        // 落雷: プレイヤーの位置に予兆 → 落雷
        const targets = enraged ? [this.player.x, this.player.x + Phaser.Math.Between(-50, 50)] : [this.player.x];
        for (const tx of targets) {
          const warn = this.add.rectangle(tx, GROUND_Y - 60, 22, 120, 0xffe45a, 0.25).setDepth(7);
          this.tweens.add({ targets: warn, alpha: 0.5, duration: 120, yoyo: true, repeat: 3 });
          this.time.delayedCall(750, () => {
            warn.destroy();
            if (this.over) return;
            const bolt = this.add.image(tx, GROUND_Y - 50, 'fx_bolt_0').setDepth(12).setScale(1.4, 4);
            sfx('thunder');
            this.cameras.main.shake(150, 0.006);
            this.tweens.add({ targets: bolt, alpha: 0, duration: 300, onComplete: () => bolt.destroy() });
            if (Math.abs(this.player.x - tx) < 16 && this.player.y > GROUND_Y - 130) {
              this.hurtPlayer(b.def.atk * 1.2);
            }
          });
        }
      }
    }
  }

  private shockwaveAt(x: number, atk: number, radius: number) {
    const ring = this.add.circle(x, GROUND_Y, 8, 0xffe9b0, 0.5).setDepth(7);
    this.tweens.add({
      targets: ring, radius, alpha: 0, duration: 350,
      onUpdate: () => ring.setRadius(ring.radius),
      onComplete: () => ring.destroy(),
    });
    const onGround = (this.player.body as Phaser.Physics.Arcade.Body).blocked.down;
    if (onGround && Math.abs(this.player.x - x) < radius) {
      this.hurtPlayer(atk);
    }
  }

  // ============================================================
  // プレイヤー操作(HUD / キーボード両対応)
  // ============================================================
  setPad(p: Partial<PadState>) {
    Object.assign(this.pad, p);
  }

  doJump() {
    if (this.over || this.transitioning) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.down) {
      this.player.setVelocityY(-this.charDef.jump * 0.95);
      sfx('jump');
    }
  }

  doAttack() {
    if (this.over || this.transitioning) return;
    const now = this.time.now;
    if (now < this.attackCdAt) return;
    this.attackCdAt = now + 420;
    this.playAttackAnim();
    if (this.progress.charKey === 'warrior') {
      sfx('slash');
      this.meleeFx();
      this.meleeHit(30, 1.0, 1);
    } else {
      sfx('claw');
      this.clawFx();
      this.shoot('fx_claw_0', 200, 1.0, false, 90);
    }
  }

  doSkill(i: number) {
    if (this.over || this.transitioning) return;
    const def = this.charDef;
    const skill = def.skills[i];
    if (!skill) return;
    const now = this.time.now;
    if (now < this.skillCdAt[i]) return;
    if (this.charState.mp < skill.mp) {
      sfx('denied');
      this.hud()?.flashMp();
      return;
    }
    this.charState.mp -= skill.mp;
    this.skillCdAt[i] = now + skill.cd;
    this.playAttackAnim();
    this.skillNameFx(skill.name);

    switch (skill.id) {
      case 'power':
        sfx('slash');
        this.meleeFx(1.4);
        this.meleeHit(36, 1.7, 2);
        break;
      case 'blast': {
        sfx('rush');
        this.cameras.main.shake(120, 0.004);
        const ring = this.add.circle(this.player.x, this.player.y, 10, 0xffe45a, 0.35).setDepth(11);
        this.tweens.add({
          targets: ring, radius: 60, alpha: 0, duration: 280,
          onUpdate: () => ring.setRadius(ring.radius),
          onComplete: () => ring.destroy(),
        });
        for (const e of this.enemies.getChildren() as EnemySprite[]) {
          if (!e.active || e.dying) continue;
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y) < 64) {
            this.hitEnemy(e, 2.2, 1);
          }
        }
        break;
      }
      case 'rush': {
        sfx('rush');
        const dir = this.facing;
        this.player.setVelocityX(dir * 420);
        this.invulnUntil = Math.max(this.invulnUntil, now + 400);
        const hitDone = new Set<EnemySprite>();
        const ev = this.time.addEvent({
          delay: 40, repeat: 7,
          callback: () => {
            for (const e of this.enemies.getChildren() as EnemySprite[]) {
              if (!e.active || e.dying || hitDone.has(e)) continue;
              if (Math.abs(e.x - this.player.x) < 26 && Math.abs(e.y - this.player.y) < 30) {
                hitDone.add(e);
                this.hitEnemy(e, 1.8, 1);
              }
            }
          },
        });
        this.time.delayedCall(400, () => ev.remove());
        break;
      }
      case 'fire':
        sfx('fire');
        this.shoot('fx_fire_0', 240, 2.0, true, 260);
        break;
      case 'thunder': {
        sfx('thunder');
        this.cameras.main.shake(160, 0.005);
        const candidates = (this.enemies.getChildren() as EnemySprite[])
          .filter((e) => e.active && !e.dying && Math.abs(e.x - this.player.x) < 110 && Math.abs(e.y - this.player.y) < 90)
          .sort((a, b2) => Math.abs(a.x - this.player.x) - Math.abs(b2.x - this.player.x))
          .slice(0, 4);
        candidates.forEach((e, idx) => {
          this.time.delayedCall(idx * 90, () => {
            if (!e.active) return;
            const bolt = this.add.image(e.x, e.y - 30, 'fx_bolt_0').setDepth(12).setScale(1, 2.4).setOrigin(0.5, 0);
            this.tweens.add({ targets: bolt, alpha: 0, duration: 280, onComplete: () => bolt.destroy() });
            this.hitEnemy(e, 2.4, 1);
          });
        });
        if (candidates.length === 0) {
          // 空振りでもエフェクトは出す
          const bolt = this.add.image(this.player.x + this.facing * 30, this.player.y - 40, 'fx_bolt_0')
            .setDepth(12).setScale(1, 2.4).setOrigin(0.5, 0);
          this.tweens.add({ targets: bolt, alpha: 0, duration: 280, onComplete: () => bolt.destroy() });
        }
        break;
      }
      case 'heal': {
        sfx('heal');
        const healed = Math.floor(this.maxHp(this.progress.charKey) * 0.4);
        this.charState.hp = Math.min(this.charState.hp + healed, this.maxHp(this.progress.charKey));
        this.floatText(this.player.x, this.player.y - 26, `+${healed}`, '#6ae45a');
        const fx = this.add.sprite(this.player.x, this.player.y - 10, 'fx_heal_0').setDepth(12);
        fx.play('fx_heal_play');
        this.tweens.add({ targets: fx, y: fx.y - 18, alpha: 0, duration: 700, onComplete: () => fx.destroy() });
        break;
      }
    }
  }

  usePotion(kind: 'hp' | 'mp') {
    if (this.over || this.transitioning) return;
    if (this.progress.potions[kind] <= 0) {
      sfx('denied');
      return;
    }
    this.progress.potions[kind]--;
    sfx('potion');
    if (kind === 'hp') {
      const v = Math.floor(this.maxHp(this.progress.charKey) * 0.55);
      this.charState.hp = Math.min(this.charState.hp + v, this.maxHp(this.progress.charKey));
      this.floatText(this.player.x, this.player.y - 26, `+${v}`, '#ff6a6a');
    } else {
      const v = Math.floor(this.maxMp(this.progress.charKey) * 0.55);
      this.charState.mp = Math.min(this.charState.mp + v, this.maxMp(this.progress.charKey));
      this.floatText(this.player.x, this.player.y - 26, `+${v} MP`, '#6a9aff');
    }
  }

  switchChar() {
    if (this.over || this.transitioning) return;
    const now = this.time.now;
    if (now < this.switchCdAt) return;
    const other: CharKey = this.progress.charKey === 'warrior' ? 'mage' : 'warrior';
    if (this.progress.chars[other].hp <= 0) {
      sfx('denied');
      this.hud()?.showBanner(`${CHARACTERS[other].name}は倒れている!`, '#ff8a8a');
      return;
    }
    this.switchCdAt = now + 2000;
    this.progress.charKey = other;
    this.skillCdAt = [0, 0, 0];
    sfx('switch');
    // 交代エフェクト
    const fx = this.add.circle(this.player.x, this.player.y, 16, 0xffffff, 0.7).setDepth(12);
    this.tweens.add({ targets: fx, radius: 30, alpha: 0, duration: 300, onUpdate: () => fx.setRadius(fx.radius), onComplete: () => fx.destroy() });
    this.player.setTexture(`${other}_0`);
    this.player.play(`${other}_stand`);
    this.buildUiState();
    this.hud()?.refreshSkillButtons();
  }

  // ============================================================
  // 攻撃処理
  // ============================================================
  private playAttackAnim() {
    const key = this.progress.charKey;
    this.player.play(`${key}_attack`, true);
    this.time.delayedCall(260, () => {
      if (this.player.anims.currentAnim?.key === `${key}_attack`) {
        this.player.play(`${key}_stand`, true);
      }
    });
  }

  private meleeFx(scale = 1) {
    const fx = this.add.sprite(this.player.x + this.facing * 18, this.player.y - 2, 'fx_slash_0')
      .setDepth(12).setFlipX(this.facing < 0).setScale(scale);
    fx.play('fx_slash_play');
    fx.once('animationcomplete', () => fx.destroy());
  }

  private clawFx() {
    const fx = this.add.sprite(this.player.x + this.facing * 16, this.player.y - 4, 'fx_claw_0')
      .setDepth(12).setFlipX(this.facing < 0);
    fx.play('fx_claw_play');
    fx.once('animationcomplete', () => fx.destroy());
  }

  private skillNameFx(name: string) {
    const t = this.add.text(this.player.x, this.player.y - 34, name, {
      fontFamily: 'sans-serif', fontSize: '8px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#2a1f3d', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20).setResolution(4);
    this.tweens.add({ targets: t, y: t.y - 12, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  private meleeHit(range: number, mult: number, hits: number) {
    for (const e of this.enemies.getChildren() as EnemySprite[]) {
      if (!e.active || e.dying) continue;
      const dx = e.x - this.player.x;
      const inFront = Math.sign(dx) === this.facing || Math.abs(dx) < 12;
      if (inFront && Math.abs(dx) < range + e.displayWidth / 3 && Math.abs(e.y - this.player.y) < 34) {
        this.hitEnemy(e, mult, hits);
      }
    }
  }

  private shoot(tex: string, speed: number, mult: number, pierce: boolean, rangeMs: number) {
    const shot = this.playerShots.create(
      this.player.x + this.facing * 10, this.player.y - 4, tex
    ) as Phaser.Physics.Arcade.Sprite & { mult: number; pierce: boolean; hitSet: Set<EnemySprite> };
    shot.setVelocityX(this.facing * speed);
    shot.setFlipX(this.facing < 0);
    shot.setDepth(11);
    shot.mult = mult;
    shot.pierce = pierce;
    shot.hitSet = new Set();
    this.time.delayedCall(rangeMs * 4, () => shot.active && shot.destroy());
  }

  private hitEnemy(e: EnemySprite, mult: number, hits: number) {
    if (!e.active || e.dying) return;
    for (let i = 0; i < hits; i++) {
      this.time.delayedCall(i * 90, () => {
        if (!e.active || e.dying) return;
        const crit = Math.random() < 0.15;
        const dmg = Math.max(1, Math.floor(this.atk() * mult * Phaser.Math.FloatBetween(0.9, 1.1) * (crit ? 1.6 : 1)));
        e.hp -= dmg;
        e.lastHitAt = this.time.now;
        sfx(crit ? 'crit' : 'hit');
        this.floatText(
          e.x + Phaser.Math.Between(-6, 6), e.y - e.displayHeight / 2 - 6,
          String(dmg), crit ? '#ffd24a' : '#ff9a3d', crit
        );
        const star = this.add.image(e.x, e.y - 6, 'fx_star_0').setDepth(12).setScale(crit ? 1.3 : 0.9);
        this.tweens.add({ targets: star, alpha: 0, scale: 0.3, duration: 220, onComplete: () => star.destroy() });
        // ノックバック & 点滅
        if (!e.isBoss && e.body) {
          e.setVelocityX(Math.sign(e.x - this.player.x) * 60);
          if (!e.def.fly) e.setVelocityY(-60);
        }
        e.setTintFill(0xffffff);
        this.time.delayedCall(70, () => e.active && e.clearTint());
        if (e.hp <= 0) this.killEnemy(e);
      });
    }
  }

  private killEnemy(e: EnemySprite) {
    if (e.dying) return;
    e.dying = true;
    e.hpBar?.destroy();
    (e.body as Phaser.Physics.Arcade.Body).enable = false;
    sfx(e.isBoss ? 'bossdie' : 'mobdie');

    this.gainExp(e.isBoss ? (e.def as BossDef).exp : e.def.exp);
    if (!e.isBoss) {
      this.stageKills++;
      if (Math.random() < 0.18) this.dropPotion(e.x, e.y - 10);
      if (this.stageKills >= this.stage.quota && !this.bossSpawned) {
        this.time.delayedCall(800, () => this.spawnBoss());
      }
    }

    this.tweens.add({
      targets: e, alpha: 0, y: e.y - 14, angle: e.isBoss ? 0 : 180,
      scaleX: e.scaleX * (e.isBoss ? 1.1 : 0.7), scaleY: e.scaleY * (e.isBoss ? 1.1 : 0.7),
      duration: e.isBoss ? 900 : 380,
      onComplete: () => e.destroy(),
    });

    if (e.isBoss) {
      this.boss = null;
      this.cameras.main.shake(500, 0.006);
      this.cameras.main.flash(400, 255, 255, 255);
      this.hud()?.showBanner(`${e.def.name} を討伐した!`, '#ffe45a');
      this.time.delayedCall(1200, () => this.openPortal(e.x));
    }
  }

  private dropPotion(x: number, y: number) {
    const kind = Math.random() < 0.5 ? 'hp' : 'mp';
    const d = this.drops.create(x, y, `potion_${kind}_0`) as Phaser.Physics.Arcade.Sprite & { kind: string };
    d.kind = kind;
    d.setVelocity(Phaser.Math.Between(-30, 30), -120);
    d.setDepth(6);
    d.setBounce(0.4);
    this.tweens.add({ targets: d, alpha: 0, delay: 7000, duration: 800, onComplete: () => d.active && d.destroy() });
  }

  private openPortal(x: number) {
    if (this.over) return;
    const px = Phaser.Math.Clamp(x, 60, this.stage.width - 60);
    this.portal = this.physics.add.sprite(px, GROUND_Y - 12, 'portal_0');
    (this.portal.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.portal.play('portal_spin');
    this.portal.setDepth(4);
    this.portal.setScale(0);
    this.tweens.add({ targets: this.portal, scale: 1.4, duration: 500, ease: 'Back.easeOut' });
    sfx('portal');
    playBgm(this.stage.bgm);
    const isLast = this.stageIdx >= STAGES.length - 1;
    this.hud()?.showBanner(isLast ? 'ポータルに入ってクリア!' : 'ポータルが開いた! 次のステージへ', '#9ad8ff');
  }

  private enterPortal() {
    if (this.transitioning || !this.portal) return;
    this.transitioning = true;
    sfx('portal');
    this.tweens.add({ targets: this.player, scale: 0, angle: 360, x: this.portal.x, duration: 500 });
    const next = this.stageIdx + 1;
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (next < STAGES.length) {
        saveStage(next);
        // ステージクリア報酬: 回復薬補充
        this.progress.potions.hp = Math.min(this.progress.potions.hp + 5, 30);
        this.progress.potions.mp = Math.min(this.progress.potions.mp + 5, 30);
        this.scene.restart({ stage: next });
      } else {
        this.gameClear();
      }
    });
  }

  private gameClear() {
    stopBgm();
    this.over = true;
    const time = Math.floor((Date.now() - this.progress.startTime) / 1000);
    this.hud()?.showClear({
      level: this.progress.level,
      kills: this.progress.kills,
      time,
    });
  }

  // ============================================================
  // ダメージ / 経験値
  // ============================================================
  private hurtPlayer(rawAtk: number) {
    if (this.over || this.transitioning) return;
    const now = this.time.now;
    if (now < this.invulnUntil) return;
    this.invulnUntil = now + 1000;
    const dmg = Math.max(1, Math.floor(rawAtk * Phaser.Math.FloatBetween(0.85, 1.15)));
    this.charState.hp = Math.max(0, this.charState.hp - dmg);
    sfx('hurt');
    this.floatText(this.player.x, this.player.y - 28, String(dmg), '#ff5a5a');
    this.player.setTintFill(0xff6a6a);
    this.cameras.main.shake(100, 0.004);
    this.player.setVelocityY(-120);
    this.time.delayedCall(120, () => this.player.clearTint());
    // 無敵時間中の点滅
    this.tweens.add({ targets: this.player, alpha: 0.35, duration: 100, yoyo: true, repeat: 4, onComplete: () => this.player.setAlpha(1) });

    if (this.charState.hp <= 0) {
      const other: CharKey = this.progress.charKey === 'warrior' ? 'mage' : 'warrior';
      if (this.progress.chars[other].hp > 0) {
        this.hud()?.showBanner(`${this.charDef.name}が倒れた! ${CHARACTERS[other].name}に交代!`, '#ff8a8a');
        this.switchCdAt = 0;
        this.switchChar();
      } else {
        this.gameOver();
      }
    }
  }

  private gameOver() {
    if (this.over) return;
    this.over = true;
    stopBgm();
    sfx('die');
    this.physics.pause();
    this.tweens.add({ targets: this.player, angle: 90, alpha: 0.6, y: this.player.y - 10, duration: 600 });
    this.hud()?.showGameOver(() => this.revive());
  }

  private revive() {
    // 両キャラ全回復して同ステージから再開
    for (const k of ['warrior', 'mage'] as CharKey[]) {
      this.progress.chars[k].hp = this.maxHp(k);
      this.progress.chars[k].mp = this.maxMp(k);
    }
    this.progress.potions.hp = Math.max(this.progress.potions.hp, 5);
    this.progress.potions.mp = Math.max(this.progress.potions.mp, 5);
    this.scene.restart({ stage: this.stageIdx });
  }

  private gainExp(exp: number) {
    this.progress.kills++;
    this.progress.exp += exp;
    this.floatText(this.player.x, this.player.y - 36, `+${exp} EXP`, '#c8a4ff');
    let next = expForLevel(this.progress.level);
    while (this.progress.exp >= next) {
      this.progress.exp -= next;
      this.progress.level++;
      next = expForLevel(this.progress.level);
      sfx('levelup');
      // 全回復
      for (const k of ['warrior', 'mage'] as CharKey[]) {
        this.progress.chars[k].hp = this.maxHp(k);
        this.progress.chars[k].mp = this.maxMp(k);
      }
      const t = this.add.text(this.player.x, this.player.y - 40, 'LEVEL UP!', {
        fontFamily: '"Arial Black", sans-serif', fontSize: '12px',
        color: '#ffe45a', stroke: '#7a4a21', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(20).setResolution(4);
      this.tweens.add({ targets: t, y: t.y - 24, alpha: 0, duration: 1400, onComplete: () => t.destroy() });
      const ring = this.add.circle(this.player.x, this.player.y, 6, 0xffe45a, 0.6).setDepth(11);
      this.tweens.add({ targets: ring, radius: 44, alpha: 0, duration: 600, onUpdate: () => ring.setRadius(ring.radius), onComplete: () => ring.destroy() });
    }
  }

  private floatText(x: number, y: number, msg: string, color: string, big = false) {
    const t = this.add.text(x, y, msg, {
      fontFamily: '"Arial Black", sans-serif',
      fontSize: big ? '11px' : '9px',
      color,
      stroke: '#ffffff',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20).setResolution(4);
    this.tweens.add({
      targets: t, y: y - 18, alpha: 0, duration: 750, ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  // ============================================================
  // 更新ループ
  // ============================================================
  update(_time: number, _delta: number) {
    if (this.over || this.transitioning) {
      this.syncUiState();
      return;
    }

    this.updatePlayerMove();
    this.updateEnemies();
    this.updateShots();
    this.updatePickups();
    this.updatePortal();
    this.syncUiState();
  }

  private updatePlayerMove() {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const left = this.pad.left || this.cursors.left.isDown;
    const right = this.pad.right || this.cursors.right.isDown;
    const speed = this.charDef.speed;

    // ラッシュ中(速度が大きい間)は上書きしない
    if (Math.abs(body.velocity.x) > speed * 1.5 && !left && !right) {
      // 慣性減衰
      body.setVelocityX(body.velocity.x * 0.92);
    } else if (left) {
      body.setVelocityX(-speed);
      this.facing = -1;
      this.player.setFlipX(true);
    } else if (right) {
      body.setVelocityX(speed);
      this.facing = 1;
      this.player.setFlipX(false);
    } else {
      body.setVelocityX(0);
    }

    // キーボード
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.Z)) this.doJump();
    if (Phaser.Input.Keyboard.JustDown(this.keys.X)) this.doAttack();
    if (Phaser.Input.Keyboard.JustDown(this.keys.A)) this.doSkill(0);
    if (Phaser.Input.Keyboard.JustDown(this.keys.S)) this.doSkill(1);
    if (Phaser.Input.Keyboard.JustDown(this.keys.D)) this.doSkill(2);
    if (Phaser.Input.Keyboard.JustDown(this.keys.Q)) this.usePotion('hp');
    if (Phaser.Input.Keyboard.JustDown(this.keys.W)) this.usePotion('mp');
    if (Phaser.Input.Keyboard.JustDown(this.keys.E)) this.switchChar();

    // アニメーション
    const animKey = this.player.anims.currentAnim?.key ?? '';
    if (!animKey.endsWith('_attack')) {
      const moving = left || right;
      const want = `${this.progress.charKey}_${moving ? 'walk' : 'stand'}`;
      if (animKey !== want) this.player.play(want, true);
    }

    // 落下死防止
    if (this.player.y > WORLD_H + 20) {
      this.player.setPosition(40, GROUND_Y - 40);
      this.hurtPlayer(10);
    }
  }

  private updateEnemies() {
    const now = this.time.now;
    for (const e of this.enemies.getChildren() as EnemySprite[]) {
      if (!e.active || e.dying) continue;
      const body = e.body as Phaser.Physics.Arcade.Body;

      // 接触ダメージ
      if (now > e.touchCd &&
        Math.abs(e.x - this.player.x) < (e.displayWidth + this.player.displayWidth) / 2.4 &&
        Math.abs(e.y - this.player.y) < (e.displayHeight + this.player.displayHeight) / 2.4) {
        e.touchCd = now + TOUCH_DMG_CD;
        this.hurtPlayer(e.def.atk);
      }

      // AI
      if (e.def.fly) {
        // ふわふわ飛んでプレイヤーへ寄る
        const dx = this.player.x - e.x;
        const dy = (this.player.y - 14) - e.y;
        body.setVelocity(
          Phaser.Math.Clamp(dx, -1, 1) * e.def.speed,
          Phaser.Math.Clamp(dy, -1, 1) * e.def.speed * 0.5 + Math.sin(now / 300 + e.x) * 16
        );
        e.setFlipX(dx < 0);
      } else {
        if (now > e.aiTimer) {
          e.aiTimer = now + Phaser.Math.Between(1200, 2600);
          // ボスはプレイヤーを追う / 雑魚はランダム徘徊
          if (e.isBoss) {
            e.dir = Math.sign(this.player.x - e.x) || 1;
          } else {
            e.dir = Math.random() < 0.25 ? 0 : (Math.random() > 0.5 ? 1 : -1);
          }
          if (e.def.hop && body.blocked.down && e.dir !== 0) {
            body.setVelocityY(-150);
          }
        }
        if (body.blocked.left) e.dir = 1;
        if (body.blocked.right) e.dir = -1;
        // 画面端で反転
        if (e.x < 20) e.dir = 1;
        if (e.x > this.stage.width - 20) e.dir = -1;
        body.setVelocityX(e.dir * e.def.speed * (e.isBoss && e.hp < e.maxhp * 0.5 ? 1.5 : 1));
        if (e.dir !== 0) e.setFlipX(e.dir < 0);
      }

      // HPバー(ダメージを受けてから3秒表示)
      if (now - e.lastHitAt < 3000 && e.lastHitAt > 0) {
        if (!e.hpBar) e.hpBar = this.add.graphics().setDepth(15);
        const g = e.hpBar;
        const w = e.isBoss ? 36 : 16;
        g.clear();
        g.setPosition(e.x - w / 2, e.y - e.displayHeight / 2 - 8);
        g.fillStyle(0x000000, 0.55);
        g.fillRect(0, 0, w, 3);
        g.fillStyle(e.isBoss ? 0xff5a8a : 0x6ae45a, 1);
        g.fillRect(0.5, 0.5, (w - 1) * Math.max(0, e.hp / e.maxhp), 2);
      } else if (e.hpBar) {
        e.hpBar.destroy();
        e.hpBar = undefined;
      }
    }
  }

  private updateShots() {
    // プレイヤーの弾 → 敵
    for (const shot of this.playerShots.getChildren() as (Phaser.Physics.Arcade.Sprite & { mult: number; pierce: boolean; hitSet: Set<EnemySprite> })[]) {
      if (!shot.active) continue;
      if (shot.x < -20 || shot.x > this.stage.width + 20) {
        shot.destroy();
        continue;
      }
      for (const e of this.enemies.getChildren() as EnemySprite[]) {
        if (!e.active || e.dying || shot.hitSet.has(e)) continue;
        if (Math.abs(e.x - shot.x) < e.displayWidth / 2 + 6 && Math.abs(e.y - shot.y) < e.displayHeight / 2 + 6) {
          shot.hitSet.add(e);
          this.hitEnemy(e, shot.mult, 1);
          if (!shot.pierce) {
            shot.destroy();
            break;
          }
        }
      }
    }
    // 敵の弾 → プレイヤー
    for (const shot of this.enemyShots.getChildren() as Phaser.Physics.Arcade.Sprite[]) {
      if (!shot.active) continue;
      if (Math.abs(shot.x - this.player.x) < 10 && Math.abs(shot.y - this.player.y) < 14) {
        const atk = this.boss ? this.boss.def.atk * 0.8 : 18;
        shot.destroy();
        this.hurtPlayer(atk);
      }
    }
  }

  private updatePickups() {
    for (const d of this.drops.getChildren() as (Phaser.Physics.Arcade.Sprite & { kind: 'hp' | 'mp' })[]) {
      if (!d.active) continue;
      if (Math.abs(d.x - this.player.x) < 14 && Math.abs(d.y - this.player.y) < 18) {
        this.progress.potions[d.kind] = Math.min(this.progress.potions[d.kind] + 1, 30);
        sfx('potion');
        this.floatText(d.x, d.y - 10, d.kind === 'hp' ? 'HP薬 +1' : 'MP薬 +1', d.kind === 'hp' ? '#ff6a6a' : '#6a9aff');
        d.destroy();
      }
    }
  }

  private updatePortal() {
    if (!this.portal) return;
    if (Math.abs(this.portal.x - this.player.x) < 12 && Math.abs(this.portal.y - this.player.y) < 24) {
      this.enterPortal();
    }
  }

  private syncUiState() {
    const def = this.charDef;
    const ui = this.uiState;
    const now = this.time.now;
    ui.charKey = def.key;
    ui.charName = def.name;
    ui.hp = Math.ceil(this.charState.hp);
    ui.maxhp = this.maxHp(def.key);
    ui.mp = Math.floor(this.charState.mp);
    ui.maxmp = this.maxMp(def.key);
    ui.level = this.progress.level;
    ui.exp = this.progress.exp;
    ui.expNext = expForLevel(this.progress.level);
    ui.potions = this.progress.potions;
    ui.stageName = `${this.stage.name} ${this.stage.sub}`;
    ui.kills = Math.min(this.stageKills, this.stage.quota);
    ui.quota = this.stage.quota;
    ui.boss = this.boss && this.boss.active
      ? { name: this.boss.def.name, title: (this.boss.def as BossDef).title, hp: Math.max(0, this.boss.hp), max: this.boss.maxhp }
      : null;
    ui.skills = def.skills.map((s, i) => ({
      name: s.name, label: s.label, mp: s.mp,
      cdLeft: Math.max(0, this.skillCdAt[i] - now), cd: s.cd,
    }));
    ui.switchCdLeft = Math.max(0, this.switchCdAt - now);
    ui.otherCharKey = def.key === 'warrior' ? 'mage' : 'warrior';
    ui.gameOver = this.over;
  }
}
