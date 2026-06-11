import Phaser from 'phaser';
import {
  CHARACTERS, FLOORS, TOTAL_FLOORS, GROUND_Y, WORLD_H, ARENA_W,
  expForLevel, newProgress, tierFor, tierIndexFor,
  atkScale, hpScale, mpScale, critRate, critMul, fmt, ELIXIR_MAX, LEVEL_CAP,
  bossHp, bossAtk, bossExp, playerHitChance, playerDamageScale, enemyDamageScale,
  loadSave, writeSave, themeTile, themeBgm,
  type CharKey, type Progress, type FloorDef, type JobTier, type SkillDef,
} from '../data';
import { sfx, playBgm, stopBgm } from '../audio';
import type HudScene from './Hud';

const ZOOM = 3;
const TOUCH_DMG_CD = 800;

export interface PadState {
  left: boolean;
  right: boolean;
  up: boolean;
}

export interface UiState {
  charKey: CharKey;
  charName: string;
  rankName: string;
  spriteKey: string;
  otherSpriteKey: string;
  hp: number; maxhp: number;
  mp: number; maxmp: number;
  level: number;
  exp: number; expNext: number;
  elixirs: number;
  critRate: number;
  buffLeft: number; buffName: string;
  floor: number; total: number;
  floorName: string;
  reqLevel: number;
  underLeveled: boolean;
  boss: { name: string; title: string; hp: number; max: number } | null;
  skills: { name: string; mp: number; cdLeft: number; cd: number }[];
  switchCdLeft: number;
  otherCharKey: CharKey;
  gameOver: boolean;
}

interface BossSprite extends Phaser.Physics.Arcade.Sprite {
  floor: FloorDef;
  atk: number;
  hp: number;
  maxhp: number;
  flying: boolean;
  hpBar?: Phaser.GameObjects.Graphics;
  lastHitAt: number;
  aiTimer: number;
  dir: number;
  touchCd: number;
  dying?: boolean;
  frozenUntil?: number;
  stunUntil?: number;
}

export default class GameScene extends Phaser.Scene {
  private floorIdx = 0;
  private floor!: FloorDef;
  private progress!: Progress;

  private player!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private playerShots!: Phaser.Physics.Arcade.Group;
  private enemyShots!: Phaser.Physics.Arcade.Group;
  private drops!: Phaser.Physics.Arcade.Group;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private pad: PadState = { left: false, right: false, up: false };

  private facing = 1;
  private upPrev = false;
  private attackCdAt = 0;
  private skillCdAt: number[] = [0, 0, 0];
  private switchCdAt = 0;
  private invulnUntil = 0;
  private buffs: Record<CharKey, { atk: number; def: number; until: number; name: string }> = {
    warrior: { atk: 1, def: 1, until: 0, name: '' },
    mage: { atk: 1, def: 1, until: 0, name: '' },
  };
  private boss: BossSprite | null = null;
  private portal: Phaser.Physics.Arcade.Sprite | null = null;
  private over = false;
  private transitioning = false;
  private bossActive = false;

  uiState!: UiState;

  constructor() {
    super('Game');
  }

  init(data: { floor?: number }) {
    this.facing = 1;
    this.attackCdAt = 0;
    this.skillCdAt = [0, 0, 0];
    this.switchCdAt = 0;
    this.invulnUntil = 0;
    this.boss = null;
    this.portal = null;
    this.over = false;
    this.transitioning = false;
    this.bossActive = false;
    this._initFloor = data.floor;
  }
  private _initFloor?: number;

  create() {
    this.progress = this.registry.get('progress') as Progress;
    if (!this.progress) {
      this.progress = newProgress(loadSave());
      this.registry.set('progress', this.progress);
    }
    if (this._initFloor !== undefined) this.progress.floor = this._initFloor;
    this.floorIdx = Phaser.Math.Clamp(this.progress.floor - 1, 0, TOTAL_FLOORS - 1);
    this.floor = FLOORS[this.floorIdx];

    this.buildBackground();
    this.buildPlatforms();
    this.buildPlayer();
    this.buildGroups();
    this.buildColliders();
    this.buildCamera();
    this.buildKeyboard();
    this.buildUiState();

    playBgm(themeBgm(this.floor.theme));
    this.cameras.main.fadeIn(400, 0, 0, 0);

    // 階層イントロ → ボス出現
    this.time.delayedCall(200, () => {
      const lvWarn = this.progress.level < this.floor.reqLevel;
      this.hud()?.showBanner(
        `第 ${this.floor.floor} 階  ${this.floor.title}「${this.floor.bossName}」`,
        this.floor.major ? '#ff7a7a' : '#ffe9b0'
      );
      if (lvWarn) {
        this.time.delayedCall(1400, () =>
          this.hud()?.showBanner(`格上の敵! 推奨Lv.${this.floor.reqLevel}`, '#ff8a8a'));
      }
    });
    this.time.delayedCall(1100, () => this.spawnBoss());

    this.events.on('shutdown', () => this.tweens.killAll());
  }

  hud(): HudScene | null {
    return (this.scene.get('Hud') as HudScene) ?? null;
  }

  // ============================================================
  // 構築
  // ============================================================
  private buildBackground() {
    const w = ARENA_W;
    const skyColors: Record<string, [string, string]> = {
      grass: ['#79c4f2', '#cfeaff'],
      sky: ['#5a8fd8', '#cfe4ff'],
      dark: ['#1a1030', '#3d2a5c'],
      void: ['#0a0612', '#2a1030'],
    };
    const key = `sky_${this.floor.theme}`;
    if (!this.textures.exists(key)) {
      const tex = this.textures.createCanvas(key, 4, 256)!;
      const ctx = tex.getContext();
      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, skyColors[this.floor.theme][0]);
      grad.addColorStop(1, skyColors[this.floor.theme][1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 4, 256);
      tex.refresh();
    }
    this.add.image(0, 0, key).setOrigin(0).setDisplaySize(w, WORLD_H).setDepth(-30);

    const g = this.add.graphics().setDepth(-20).setScrollFactor(0.4, 1);
    if (this.floor.theme === 'grass') {
      g.fillStyle(0x5fae3c, 1);
      for (let x = -100; x < w + 100; x += 180) g.fillEllipse(x, GROUND_Y + 30, 320, 180);
    } else if (this.floor.theme === 'sky') {
      g.fillStyle(0xffffff, 0.5);
      for (let x = -100; x < w + 100; x += 150) g.fillEllipse(x, GROUND_Y + 40, 280, 120);
    } else if (this.floor.theme === 'dark') {
      g.fillStyle(0x2a1d45, 1);
      for (let x = -80; x < w + 100; x += 120) g.fillRect(x, GROUND_Y - 200, 34, 230);
    } else {
      // void: 赤紫の柱と裂け目
      g.fillStyle(0x1a0e24, 1);
      for (let x = -80; x < w + 100; x += 110) g.fillRect(x, GROUND_Y - 240, 28, 270);
      g.fillStyle(0x6a1a4a, 0.5);
      for (let x = -40; x < w + 100; x += 160) g.fillRect(x, GROUND_Y - 240, 4, 270);
    }

    // 装飾(木/雲)
    for (let x = 60; x < w; x += Phaser.Math.Between(150, 230)) {
      if (this.floor.theme === 'grass') {
        this.add.image(x, GROUND_Y + 1, 'tree_0').setOrigin(0.5, 1).setDepth(-10)
          .setScrollFactor(0.7, 1).setScale(Phaser.Math.FloatBetween(0.9, 1.3));
      } else if (this.floor.theme === 'dark' || this.floor.theme === 'void') {
        this.add.image(x, GROUND_Y + 1, 'tree_0').setOrigin(0.5, 1).setDepth(-10)
          .setScrollFactor(0.7, 1).setTint(this.floor.theme === 'void' ? 0x4a1a3a : 0x6a4a9c)
          .setScale(Phaser.Math.FloatBetween(0.9, 1.2));
      }
    }
    for (let x = 40; x < w; x += Phaser.Math.Between(140, 240)) {
      this.add.image(x, Phaser.Math.Between(60, 160), 'cloud_0').setDepth(-15)
        .setScrollFactor(0.3, 0.6)
        .setAlpha(this.floor.theme === 'dark' || this.floor.theme === 'void' ? 0.16 : 0.85)
        .setScale(Phaser.Math.FloatBetween(0.7, 1.3));
    }
  }

  private buildPlatforms() {
    this.platforms = this.physics.add.staticGroup();
    const w = ARENA_W;
    const tile = themeTile(this.floor.theme);

    this.add.tileSprite(w / 2, GROUND_Y + 8, w, 16, tile);
    this.add.tileSprite(w / 2, (GROUND_Y + 16 + WORLD_H) / 2, w, WORLD_H - GROUND_Y - 16, `${tile}_dirt`);
    const ground = this.add.rectangle(w / 2, (GROUND_Y + WORLD_H) / 2, w, WORLD_H - GROUND_Y);
    this.physics.add.existing(ground, true);
    this.platforms.add(ground as unknown as Phaser.Physics.Arcade.Sprite);

    // 道場のシンプルな足場2段
    const plats = [
      { x: 110, y: 360, w: 120 },
      { x: ARENA_W - 230, y: 360, w: 120 },
      { x: ARENA_W / 2 - 60, y: 300, w: 120 },
    ];
    for (const p of plats) {
      const spr = this.add.tileSprite(p.x + p.w / 2, p.y + 6, p.w, 12, tile);
      this.physics.add.existing(spr, true);
      const body = spr.body as Phaser.Physics.Arcade.StaticBody;
      body.checkCollision.down = false;
      body.checkCollision.left = false;
      body.checkCollision.right = false;
      this.platforms.add(spr as unknown as Phaser.Physics.Arcade.Sprite);
    }
  }

  private buildPlayer() {
    this.player = this.physics.add.sprite(56, GROUND_Y - 30, `${this.spriteKey}_0`);
    this.player.setSize(10, 20).setOffset(3, 3);
    this.player.setCollideWorldBounds(true);
    this.player.play(`${this.spriteKey}_stand`);
    this.player.setDepth(10);
    this.physics.world.setBounds(0, -60, ARENA_W, WORLD_H + 60);
  }

  private buildGroups() {
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
    cam.setBounds(0, 0, ARENA_W, WORLD_H);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setFollowOffset(0, 40);
  }

  private buildKeyboard() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('Z,X,C,A,S,D,Q,W,E,SPACE') as Record<string, Phaser.Input.Keyboard.Key>;
  }

  private buildUiState() {
    const def = CHARACTERS[this.progress.charKey];
    const tier = this.jobTier;
    this.uiState = {
      charKey: def.key,
      charName: tier.jobName,
      rankName: tier.rankName,
      spriteKey: tier.spriteKey,
      otherSpriteKey: this.otherCharSpriteKey(),
      hp: this.charState.hp,
      maxhp: this.maxHp(def.key),
      mp: this.charState.mp,
      maxmp: this.maxMp(def.key),
      level: this.progress.level,
      exp: this.progress.exp,
      expNext: expForLevel(this.progress.level),
      elixirs: this.progress.elixirs,
      critRate: critRate(this.progress.level),
      buffLeft: 0, buffName: '',
      floor: this.floor.floor, total: TOTAL_FLOORS,
      floorName: `${this.floor.bossName}`,
      reqLevel: this.floor.reqLevel,
      underLeveled: this.progress.level < this.floor.reqLevel,
      boss: null,
      skills: tier.skills.map((s) => ({ name: s.name, mp: this.skillMpCost(s), cdLeft: 0, cd: s.cd })),
      switchCdLeft: 0,
      otherCharKey: def.key === 'warrior' ? 'mage' : 'warrior',
      gameOver: false,
    };
  }

  // ============================================================
  // ステータス
  // ============================================================
  private maxHp(key: CharKey) { return hpScale(CHARACTERS[key].maxhp, this.progress.level); }
  private maxMp(key: CharKey) { return mpScale(CHARACTERS[key].maxmp, this.progress.level); }
  private atk() {
    const buff = this.buffs[this.progress.charKey];
    const buffMul = this.time.now < buff.until ? buff.atk : 1;
    return CHARACTERS[this.progress.charKey].atk * atkScale(this.progress.level) * this.jobTier.atkBonus * buffMul;
  }
  private skillMpCost(s: SkillDef): number {
    return Math.max(1, Math.floor(this.maxMp(this.progress.charKey) * s.mp / 100));
  }
  private get charDef() { return CHARACTERS[this.progress.charKey]; }
  private get charState() { return this.progress.chars[this.progress.charKey]; }
  private get jobTier(): JobTier { return tierFor(this.charDef, this.progress.level); }
  private get spriteKey(): string { return this.jobTier.spriteKey; }
  private otherCharSpriteKey(): string {
    const other: CharKey = this.progress.charKey === 'warrior' ? 'mage' : 'warrior';
    return tierFor(CHARACTERS[other], this.progress.level).spriteKey;
  }

  // ============================================================
  // ボス
  // ============================================================
  private spawnBoss() {
    if (this.over) return;
    const f = this.floor;
    const flying = f.archetype === 'demon' || f.archetype === 'beast';
    const x = ARENA_W * 0.7;
    const y = flying ? GROUND_Y - 110 : GROUND_Y - 40;
    const b = this.physics.add.sprite(x, y, `boss_${f.archetype}_0`) as BossSprite;
    b.floor = f;
    b.flying = flying;
    b.atk = bossAtk(f);
    b.maxhp = bossHp(f);
    b.hp = b.maxhp;
    b.lastHitAt = 0;
    b.aiTimer = 0;
    b.touchCd = 0;
    b.dir = -1;
    b.setScale(f.scale);
    b.setTint(f.tint);
    b.play(`boss_${f.archetype}_move`);
    b.setDepth(8);
    const bw = b.width * 0.6, bh = b.height * 0.75;
    b.setSize(bw, bh).setOffset((b.width - bw) / 2, b.height - bh);
    if (flying) (b.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    else this.physics.add.collider(b, this.platforms);
    this.boss = b;
    this.bossActive = true;

    this.cameras.main.shake(400, f.major ? 0.006 : 0.004);
    sfx('thunder');
    if (f.major) this.cameras.main.flash(300, 255, 120, 120);

    const pattern = () => {
      if (!b.active || this.over) return;
      this.bossAction(b);
      const enraged = b.hp < b.maxhp * 0.5;
      this.time.delayedCall(enraged ? 1500 : 2300, pattern);
    };
    this.time.delayedCall(1400, pattern);
  }

  private bossAction(b: BossSprite) {
    if (!b.active || b.dying) return;
    if (b.frozenUntil && this.time.now < b.frozenUntil) return;
    if (b.stunUntil && this.time.now < b.stunUntil) return;
    const arch = b.floor.archetype;
    const toPlayer = Math.sign(this.player.x - b.x) || 1;
    const enraged = b.hp < b.maxhp * 0.5;

    if (arch === 'mush' || arch === 'golem') {
      // 大ジャンプ → 着地衝撃波
      const body = b.body as Phaser.Physics.Arcade.Body;
      if (body.blocked.down) body.setVelocity(toPlayer * 120, -320);
      const land = this.time.addEvent({
        delay: 60, loop: true,
        callback: () => {
          if (!b.active || this.over) { land.remove(); return; }
          const bd = b.body as Phaser.Physics.Arcade.Body;
          if (bd.blocked.down && bd.velocity.y >= 0 && land.getOverallProgress() > 0.1) {
            land.remove();
            this.cameras.main.shake(240, 0.008);
            sfx('thunder');
            this.shockwaveAt(b.x, b.atk, 80 * b.floor.scale);
          }
        },
      });
    } else if (arch === 'demon' || arch === 'drake') {
      // 弾幕(扇状)
      const n = enraged ? 5 : 3;
      const base = Math.atan2(this.player.y - b.y, this.player.x - b.x);
      const tex = arch === 'demon' ? 'fx_fire_0' : 'fx_orb_0';
      for (let i = 0; i < n; i++) {
        const ang = base + (i - (n - 1) / 2) * 0.26;
        const shot = this.enemyShots.create(b.x, b.y, tex) as Phaser.Physics.Arcade.Sprite;
        shot.setVelocity(Math.cos(ang) * 110, Math.sin(ang) * 110);
        shot.setTint(b.floor.tint);
        shot.setDepth(9);
        (shot.body as Phaser.Physics.Arcade.Body).setCircle(4);
        this.time.delayedCall(3500, () => shot.active && shot.destroy());
      }
      sfx('fire');
      if (!b.flying && (b.body as Phaser.Physics.Arcade.Body).blocked.down) b.setVelocity(toPlayer * 100, -240);
    } else if (arch === 'beast') {
      // 急襲ダッシュ
      const body = b.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(toPlayer * 260, -60);
      this.time.delayedCall(500, () => b.active && body.setVelocityX(toPlayer * 60));
    } else {
      // lord: 落雷 or オーブ弾幕
      if (Math.random() < 0.5) {
        const targets = enraged ? [this.player.x, this.player.x + Phaser.Math.Between(-60, 60)] : [this.player.x];
        for (const tx of targets) {
          const warn = this.add.rectangle(tx, GROUND_Y - 60, 22, 120, b.floor.tint, 0.25).setDepth(7);
          this.tweens.add({ targets: warn, alpha: 0.5, duration: 120, yoyo: true, repeat: 3 });
          this.time.delayedCall(720, () => {
            warn.destroy();
            if (this.over) return;
            const bolt = this.add.image(tx, GROUND_Y - 50, 'fx_bolt_0').setDepth(12).setScale(1.4, 4).setTint(b.floor.tint);
            sfx('thunder');
            this.cameras.main.shake(150, 0.006);
            this.tweens.add({ targets: bolt, alpha: 0, duration: 300, onComplete: () => bolt.destroy() });
            if (Math.abs(this.player.x - tx) < 18 && this.player.y > GROUND_Y - 130) this.hurtPlayer(b.atk * 1.1);
          });
        }
      } else {
        const n = enraged ? 6 : 4;
        for (let i = 0; i < n; i++) {
          this.time.delayedCall(i * 120, () => {
            if (!b.active || this.over) return;
            const ang = Math.atan2(this.player.y - b.y, this.player.x - b.x) + Phaser.Math.FloatBetween(-0.3, 0.3);
            const shot = this.enemyShots.create(b.x, b.y, 'fx_orb_0') as Phaser.Physics.Arcade.Sprite;
            shot.setVelocity(Math.cos(ang) * 130, Math.sin(ang) * 130);
            shot.setTint(b.floor.tint);
            shot.setDepth(9);
            this.time.delayedCall(3200, () => shot.active && shot.destroy());
            sfx('claw');
          });
        }
      }
    }
  }

  private shockwaveAt(x: number, atk: number, radius: number) {
    const ring = this.add.circle(x, GROUND_Y, 8, 0xffe9b0, 0.5).setDepth(7);
    this.tweens.add({
      targets: ring, radius, alpha: 0, duration: 350,
      onUpdate: () => ring.setRadius(ring.radius), onComplete: () => ring.destroy(),
    });
    const onGround = (this.player.body as Phaser.Physics.Arcade.Body).blocked.down;
    if (onGround && Math.abs(this.player.x - x) < radius) this.hurtPlayer(atk);
  }

  // ============================================================
  // 操作
  // ============================================================
  setPad(p: Partial<PadState>) { Object.assign(this.pad, p); }

  doJump(dir = 0) {
    if (this.over || this.transitioning) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.down) {
      this.player.setVelocityY(-this.charDef.jump * 0.98);
      if (dir !== 0) {
        body.setVelocityX(dir * this.charDef.speed * 1.5);
        this.facing = dir;
        this.player.setFlipX(dir < 0);
      }
      sfx('jump');
    }
  }

  doAttack() {
    if (this.over || this.transitioning) return;
    const now = this.time.now;
    if (now < this.attackCdAt) return;
    this.attackCdAt = now + 360;
    this.playAttackAnim();
    if (this.progress.charKey === 'warrior') {
      sfx('slash');
      this.meleeFx();
      this.meleeHit(34, 1.0, 1);
    } else {
      sfx('claw');
      this.clawFx();
      this.shoot('fx_claw_0', 220, 1.0, false, 90, 1, 1);
    }
  }

  doSkill(i: number) {
    if (this.over || this.transitioning) return;
    const skill = this.jobTier.skills[i];
    if (!skill) return;
    const now = this.time.now;
    if (now < this.skillCdAt[i]) return;
    const cost = this.skillMpCost(skill);
    if (this.charState.mp < cost) { sfx('denied'); this.hud()?.flashMp(); return; }
    this.charState.mp -= cost;
    this.skillCdAt[i] = now + skill.cd;
    if (skill.kind !== 'buff') this.playAttackAnim();
    this.skillNameFx(skill.name);

    switch (skill.kind) {
      case 'melee': this.skMelee(skill); break;
      case 'aoe': this.skAoe(skill); break;
      case 'wave': this.skWave(skill); break;
      case 'rush': this.skRush(skill, now); break;
      case 'buff': this.skBuff(skill); break;
      case 'projectile': this.skProjectile(skill); break;
      case 'thunder': this.skThunder(skill); break;
      case 'freeze': this.skFreeze(skill); break;
      case 'chain': this.skChain(skill); break;
      case 'meteor': this.skMeteor(skill); break;
      case 'nova': this.skNova(skill); break;
      case 'heal': this.skHeal(skill); break;
    }
  }

  // ---- スキル実装 ----
  private skMelee(s: SkillDef) {
    sfx('slash');
    const power = s.hits >= 5;
    this.meleeFx(1.2 + s.hits * 0.12);
    if (power) {
      const arc = this.add.sprite(this.player.x + this.facing * 22, this.player.y - 2, 'fx_slash_0')
        .setDepth(12).setFlipX(this.facing < 0).setScale(2.4).setTint(0xb89aff).setAlpha(0.85);
      arc.play('fx_slash_play');
      arc.once('animationcomplete', () => arc.destroy());
      this.cameras.main.shake(90, 0.003);
    }
    this.meleeHit(s.range ?? 36, s.mult, s.hits);
  }

  private skAoe(s: SkillDef) {
    sfx('rush');
    this.cameras.main.shake(130, 0.005);
    const radius = s.radius ?? 64;
    for (let r = 0; r < 2; r++) {
      const ring = this.add.circle(this.player.x, this.player.y, 10, r ? 0xffffff : 0xffe45a, 0.4).setDepth(11);
      this.tweens.add({
        targets: ring, radius: radius - r * 12, alpha: 0, duration: 300 + r * 80,
        onUpdate: () => ring.setRadius(ring.radius), onComplete: () => ring.destroy(),
      });
    }
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      const spark = this.add.image(this.player.x, this.player.y, 'fx_star_0').setDepth(12).setScale(1.2);
      this.tweens.add({
        targets: spark, x: this.player.x + Math.cos(ang) * radius, y: this.player.y + Math.sin(ang) * radius,
        alpha: 0, duration: 320, onComplete: () => spark.destroy(),
      });
    }
    this.aoeDamage(this.player.x, this.player.y, radius, s.mult, s.hits);
  }

  private skWave(s: SkillDef) {
    sfx('rush');
    this.cameras.main.shake(120, 0.004);
    const wave = this.physics.add.sprite(this.player.x + this.facing * 14, this.player.y + 6, 'fx_slash_0') as Phaser.Physics.Arcade.Sprite & { mult: number; pierce: boolean; hits: number; hitSet: Set<BossSprite> };
    (wave.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    wave.setVelocityX(this.facing * 280);
    wave.setScale(2.4, 1.8).setFlipX(this.facing < 0).setTint(0x9a5ad8).setDepth(11);
    wave.mult = s.mult; wave.pierce = true; wave.hits = s.hits; wave.hitSet = new Set();
    this.playerShots.add(wave);
    this.tweens.add({ targets: wave, scaleY: 2.8, yoyo: true, duration: 200, repeat: 3 });
    this.time.delayedCall(900, () => wave.active && wave.destroy());
  }

  private skRush(s: SkillDef, now: number) {
    sfx('rush');
    const dir = this.facing;
    this.player.setVelocityX(dir * 480);
    this.invulnUntil = Math.max(this.invulnUntil, now + 420);
    for (let k = 0; k < 4; k++) {
      this.time.delayedCall(k * 60, () => {
        if (this.over) return;
        const ghost = this.add.sprite(this.player.x, this.player.y, `${this.spriteKey}_0`)
          .setDepth(9).setAlpha(0.4).setFlipX(this.facing < 0).setTint(0x9a5ad8);
        this.tweens.add({ targets: ghost, alpha: 0, duration: 250, onComplete: () => ghost.destroy() });
      });
    }
    const done = new Set<BossSprite>();
    const ev = this.time.addEvent({
      delay: 36, repeat: Math.max(6, s.hits + 2),
      callback: () => {
        const b = this.boss;
        if (b && b.active && !b.dying && !done.has(b) && Math.abs(b.x - this.player.x) < 40 && Math.abs(b.y - this.player.y) < 44) {
          done.add(b);
          this.hitEnemy(b, s.mult, s.hits);
        }
      },
    });
    this.time.delayedCall(440, () => ev.remove());
  }

  private skBuff(s: SkillDef) {
    sfx('heal');
    const buff = this.buffs[this.progress.charKey];
    buff.until = this.time.now + (s.durMs ?? 8000);
    buff.atk = s.atkBuff ?? 1;
    buff.def = s.defCut ?? 1;
    buff.name = s.name;
    const color = s.atkBuff ? 0xff5a3a : 0x6ab0ff;
    const aura = this.add.circle(this.player.x, this.player.y, 8, color, 0.45).setDepth(9);
    this.tweens.add({ targets: aura, radius: 28, alpha: 0, duration: 500, onUpdate: () => aura.setRadius(aura.radius), onComplete: () => aura.destroy() });
    for (let k = 0; k < 6; k++) {
      const ang = (k / 6) * Math.PI * 2;
      const p = this.add.image(this.player.x + Math.cos(ang) * 20, this.player.y + 14, 'fx_star_0').setDepth(14).setScale(1).setTint(color);
      this.tweens.add({ targets: p, y: this.player.y - 24, alpha: 0, duration: 600, delay: k * 40, onComplete: () => p.destroy() });
    }
    this.player.setTint(color);
    this.time.delayedCall(300, () => !this.over && this.player.clearTint());
    this.floatText(this.player.x, this.player.y - 30,
      s.atkBuff && s.defCut ? '攻防UP!' : s.atkBuff ? '攻撃力UP!' : '防御力UP!',
      s.atkBuff ? '#ff7a5a' : '#7ab0ff');
  }

  private skProjectile(s: SkillDef) {
    sfx('fire');
    const tex = this.progress.charKey === 'mage' && s.name.includes('フローズン') ? 'fx_ice_0' : 'fx_fire_0';
    this.shoot(tex, s.speed ?? 240, s.mult, s.pierce ?? false, 280, 0.8 + s.hits * 0.18, s.hits);
    const flash = this.add.circle(this.player.x + this.facing * 14, this.player.y - 4, 6, 0x9ad8ff, 0.7).setDepth(12);
    this.tweens.add({ targets: flash, radius: 16, alpha: 0, duration: 200, onUpdate: () => flash.setRadius(flash.radius), onComplete: () => flash.destroy() });
  }

  private skThunder(s: SkillDef) {
    sfx('thunder');
    this.cameras.main.shake(160, 0.006);
    this.cameras.main.flash(120, 200, 200, 120);
    const b = this.boss;
    if (b && b.active && Math.abs(b.x - this.player.x) < (s.range ?? 120)) {
      for (let k = 0; k < (s.targets ?? 1); k++) {
        this.time.delayedCall(k * 70, () => {
          if (!b.active) return;
          this.boltFx(b.x + Phaser.Math.Between(-10, 10), b.y);
          this.hitEnemy(b, s.mult, s.hits);
        });
      }
    } else {
      this.boltFx(this.player.x + this.facing * 30, this.player.y);
    }
  }

  private skFreeze(s: SkillDef) {
    sfx('thunder');
    this.cameras.main.shake(140, 0.004);
    const radius = s.radius ?? 90;
    const cx = this.player.x + this.facing * 30, cy = this.player.y;
    const ring = this.add.circle(cx, cy, 10, 0x9ad8ff, 0.4).setDepth(11);
    this.tweens.add({ targets: ring, radius, alpha: 0, duration: 360, onUpdate: () => ring.setRadius(ring.radius), onComplete: () => ring.destroy() });
    for (let k = 0; k < 7; k++) {
      const ang = Math.random() * Math.PI * 2, d = Math.random() * radius;
      const ice = this.add.image(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, 'fx_ice_0').setDepth(13).setScale(0.4).setAlpha(0);
      this.tweens.add({ targets: ice, scale: 1, alpha: 1, duration: 180, yoyo: true, hold: 200, delay: k * 30, onComplete: () => ice.destroy() });
    }
    const b = this.boss;
    if (b && b.active && Phaser.Math.Distance.Between(cx, cy, b.x, b.y) < radius + b.displayWidth / 3) {
      this.hitEnemy(b, s.mult, s.hits);
      b.frozenUntil = this.time.now + (s.durMs ?? 2000);
      if (!b.flying && b.body) b.setVelocity(0, 0);
    }
  }

  private skChain(s: SkillDef) {
    sfx('thunder');
    this.cameras.main.flash(140, 180, 220, 255);
    const b = this.boss;
    if (b && b.active && Math.abs(b.x - this.player.x) < (s.range ?? 160)) {
      let px = this.player.x, py = this.player.y - 6;
      // チェーン = ボスに複数回バウンド
      for (let k = 0; k < (s.targets ?? 6); k++) {
        this.time.delayedCall(k * 60, () => {
          if (!b.active) return;
          const tx = b.x + Phaser.Math.Between(-12, 12), ty = b.y + Phaser.Math.Between(-12, 12);
          this.lightningLink(px, py, tx, ty);
          px = tx; py = ty;
          this.boltFx(tx, ty, 1.4);
          this.hitEnemy(b, s.mult, s.hits);
        });
      }
    } else {
      this.boltFx(this.player.x + this.facing * 30, this.player.y);
    }
  }

  private skMeteor(s: SkillDef) {
    sfx('fire');
    this.cameras.main.shake(220, 0.006);
    const isIce = s.name.includes('ブリザード');
    const b = this.boss;
    const spots: { x: number; y: number }[] = [];
    const n = s.targets ?? 5;
    for (let i = 0; i < n; i++) {
      const bx = b && b.active ? b.x : this.player.x + this.facing * 50;
      spots.push({ x: bx + Phaser.Math.Between(-50, 50), y: GROUND_Y - Phaser.Math.Between(0, 40) });
    }
    spots.forEach((sp, idx) => {
      this.time.delayedCall(idx * 110, () => {
        if (this.over) return;
        const tex = isIce ? 'fx_ice_0' : 'fx_fire_0';
        const m = this.add.image(sp.x + 26, sp.y - 120, tex).setDepth(14).setScale(2.4).setTint(isIce ? 0x9ad8ff : 0xff7a2a);
        this.tweens.add({
          targets: m, x: sp.x, y: sp.y, duration: 230, ease: 'Quad.easeIn',
          onComplete: () => {
            m.destroy();
            sfx('thunder');
            const boom = this.add.circle(sp.x, sp.y, 8, isIce ? 0x9ad8ff : 0xffd24a, 0.7).setDepth(13);
            this.tweens.add({ targets: boom, radius: 56, alpha: 0, duration: 320, onUpdate: () => boom.setRadius(boom.radius), onComplete: () => boom.destroy() });
            this.aoeDamage(sp.x, sp.y, 60, s.mult, s.hits);
            if (isIce && b && b.active && Math.abs(b.x - sp.x) < 60) b.frozenUntil = this.time.now + (s.durMs ?? 2000);
          },
        });
      });
    });
  }

  private skNova(s: SkillDef) {
    sfx('thunder');
    sfx('levelup');
    this.cameras.main.flash(400, 255, 240, 200);
    this.cameras.main.shake(360, 0.006);
    const cam = this.cameras.main;
    const left = cam.scrollX, right = cam.scrollX + cam.width / cam.zoom;
    for (let k = 0; k < 12; k++) {
      const x = Phaser.Math.Between(Math.floor(left), Math.floor(right));
      this.time.delayedCall(k * 40, () => {
        const p = this.add.image(x, GROUND_Y - 28, 'fx_pillar_0').setDepth(14).setScale(1.4, 1).setAlpha(0);
        this.tweens.add({ targets: p, alpha: 1, duration: 110, yoyo: true, hold: 140, onComplete: () => p.destroy() });
      });
    }
    const b = this.boss;
    if (b && b.active) {
      for (let k = 0; k < s.hits; k++) {
        this.time.delayedCall(k * 70, () => {
          if (!b.active) return;
          const p = this.add.image(b.x, b.y - 20, 'fx_pillar_0').setDepth(15).setScale(1.4, 1.6).setAlpha(0.9);
          this.tweens.add({ targets: p, alpha: 0, duration: 260, onComplete: () => p.destroy() });
          this.hitEnemy(b, s.mult, 1);
        });
      }
    }
  }

  private skHeal(s: SkillDef) {
    sfx('heal');
    this.healSelf(s.healPct ?? 0.5);
    const fx = this.add.sprite(this.player.x, this.player.y - 10, 'fx_heal_0').setDepth(12).setScale(1.4);
    fx.play('fx_heal_play');
    this.tweens.add({ targets: fx, y: fx.y - 20, alpha: 0, duration: 800, onComplete: () => fx.destroy() });
    for (let k = 0; k < 5; k++) {
      const p = this.add.image(this.player.x + Phaser.Math.Between(-12, 12), this.player.y + 10, 'fx_star_0').setDepth(13).setTint(0x8effa0);
      this.tweens.add({ targets: p, y: this.player.y - 20, alpha: 0, duration: 700, delay: k * 50, onComplete: () => p.destroy() });
    }
  }

  // ---- 共通ヘルパー ----
  private aoeDamage(x: number, y: number, radius: number, mult: number, hits: number) {
    const b = this.boss;
    if (b && b.active && !b.dying && Phaser.Math.Distance.Between(x, y, b.x, b.y) < radius + b.displayWidth / 3) {
      this.hitEnemy(b, mult, hits);
    }
  }

  private boltFx(x: number, y: number, scale = 1) {
    const bolt = this.add.image(x, y - 30, 'fx_bolt_0').setDepth(13).setScale(scale, 2.6 * scale).setOrigin(0.5, 0);
    this.tweens.add({ targets: bolt, alpha: 0, duration: 300, onComplete: () => bolt.destroy() });
    const flash = this.add.circle(x, y, 6, 0xffffff, 0.7).setDepth(12);
    this.tweens.add({ targets: flash, radius: 16, alpha: 0, duration: 200, onUpdate: () => flash.setRadius(flash.radius), onComplete: () => flash.destroy() });
  }

  private lightningLink(x1: number, y1: number, x2: number, y2: number) {
    const g = this.add.graphics().setDepth(13);
    g.lineStyle(2, 0xbfe0ff, 0.9);
    g.beginPath();
    g.moveTo(x1, y1);
    for (let k = 1; k <= 4; k++) {
      const t = k / 4;
      g.lineTo(x1 + (x2 - x1) * t + Phaser.Math.Between(-6, 6), y1 + (y2 - y1) * t + Phaser.Math.Between(-6, 6));
    }
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
  }

  private healSelf(pct: number) {
    const max = this.maxHp(this.progress.charKey);
    const healed = Math.floor(max * pct);
    this.charState.hp = Math.min(this.charState.hp + healed, max);
    this.floatText(this.player.x, this.player.y - 26, `+${fmt(healed)}`, '#6ae45a');
  }

  useElixir() {
    if (this.over || this.transitioning) return;
    if (this.progress.elixirs <= 0) { sfx('denied'); return; }
    this.progress.elixirs--;
    sfx('potion');
    this.charState.hp = this.maxHp(this.progress.charKey);
    this.charState.mp = this.maxMp(this.progress.charKey);
    this.floatText(this.player.x, this.player.y - 30, 'エリクサー!', '#ffd24a');
    const fx = this.add.sprite(this.player.x, this.player.y - 10, 'fx_heal_0').setDepth(12).setScale(1.6);
    fx.play('fx_heal_play');
    this.tweens.add({ targets: fx, y: fx.y - 22, alpha: 0, duration: 800, onComplete: () => fx.destroy() });
    const ring = this.add.circle(this.player.x, this.player.y, 8, 0xffd24a, 0.5).setDepth(11);
    this.tweens.add({ targets: ring, radius: 40, alpha: 0, duration: 500, onUpdate: () => ring.setRadius(ring.radius), onComplete: () => ring.destroy() });
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
    const fx = this.add.circle(this.player.x, this.player.y, 16, 0xffffff, 0.7).setDepth(12);
    this.tweens.add({ targets: fx, radius: 30, alpha: 0, duration: 300, onUpdate: () => fx.setRadius(fx.radius), onComplete: () => fx.destroy() });
    this.player.setTexture(`${this.spriteKey}_0`);
    this.player.play(`${this.spriteKey}_stand`);
    this.buildUiState();
  }

  // ============================================================
  // 攻撃判定
  // ============================================================
  private playAttackAnim() {
    const key = this.spriteKey;
    this.player.play(`${key}_attack`, true);
    this.time.delayedCall(220, () => {
      if (this.player.anims.currentAnim?.key === `${key}_attack`) this.player.play(`${key}_stand`, true);
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
    const b = this.boss;
    if (!b || !b.active || b.dying) return;
    const dx = b.x - this.player.x;
    const inFront = Math.sign(dx) === this.facing || Math.abs(dx) < 14;
    if (inFront && Math.abs(dx) < range + b.displayWidth / 2.5 && Math.abs(b.y - this.player.y) < 40 + b.displayHeight / 3) {
      this.hitEnemy(b, mult, hits);
    }
  }

  private shoot(tex: string, speed: number, mult: number, pierce: boolean, rangeMs: number, scale: number, hits: number) {
    const shot = this.playerShots.create(
      this.player.x + this.facing * 10, this.player.y - 4, tex
    ) as Phaser.Physics.Arcade.Sprite & { mult: number; pierce: boolean; hits: number; hitSet: Set<BossSprite> };
    shot.setVelocityX(this.facing * speed);
    shot.setFlipX(this.facing < 0);
    shot.setDepth(11);
    shot.setScale(scale);
    shot.mult = mult; shot.pierce = pierce; shot.hits = hits; shot.hitSet = new Set();
    this.time.delayedCall(rangeMs * 4, () => shot.active && shot.destroy());
  }

  // 多段ヒット + MISS判定 + レベル差補正
  private hitEnemy(e: BossSprite, mult: number, hits: number) {
    if (!e.active || e.dying) return;
    const hitChance = playerHitChance(this.progress.level, e.floor.reqLevel);
    const dmgScale = playerDamageScale(this.progress.level, e.floor.reqLevel);
    for (let i = 0; i < Math.max(1, hits); i++) {
      this.time.delayedCall(i * 75, () => {
        if (!e.active || e.dying) return;
        // MISS判定(格上だと外れやすい)
        if (Math.random() > hitChance) {
          this.missNumber(e);
          return;
        }
        const crit = Math.random() < critRate(this.progress.level);
        const frozen = e.frozenUntil && this.time.now < e.frozenUntil ? 1.3 : 1;
        const dmg = Math.max(1, Math.floor(
          this.atk() * mult * dmgScale * Phaser.Math.FloatBetween(0.92, 1.08) * (crit ? critMul(this.progress.level) : 1) * frozen
        ));
        e.hp -= dmg;
        e.lastHitAt = this.time.now;
        sfx(crit ? 'crit' : 'hit');
        this.damageNumber(e, dmg, crit);
        const star = this.add.image(e.x, e.y - 6, 'fx_star_0').setDepth(13).setScale(crit ? 1.6 : 1.0);
        this.tweens.add({ targets: star, alpha: 0, scale: 0.3, angle: 90, duration: 240, onComplete: () => star.destroy() });
        e.setTintFill(crit ? 0xffe45a : 0xffffff);
        const frozenNow = e.frozenUntil && this.time.now < e.frozenUntil;
        this.time.delayedCall(70, () => e.active && (frozenNow ? e.setTint(0x9ad8ff) : e.setTint(e.floor.tint)));
        if (e.hp <= 0) this.killBoss(e);
      });
    }
  }

  private damageNumber(e: BossSprite, dmg: number, crit: boolean) {
    const x = e.x + Phaser.Math.Between(-10, 10);
    const y = e.y - e.displayHeight / 2 - 6;
    const t = this.add.text(x, y, fmt(dmg), {
      fontFamily: '"Arial Black", sans-serif',
      fontSize: crit ? '13px' : '10px',
      color: crit ? '#ffe45a' : '#ffffff',
      stroke: crit ? '#d23c1a' : '#a8500a',
      strokeThickness: crit ? 4 : 3,
    }).setOrigin(0.5).setDepth(21).setResolution(4);
    if (crit) {
      const ex = this.add.text(x + t.width / 2 + 2, y - 4, '!', {
        fontFamily: '"Arial Black", sans-serif', fontSize: '13px', color: '#ffd24a', stroke: '#d23c1a', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(21).setResolution(4);
      this.tweens.add({ targets: ex, y: y - 22, alpha: 0, duration: 750, onComplete: () => ex.destroy() });
      t.setScale(1.5);
      this.tweens.add({ targets: t, scale: 1, duration: 180, ease: 'Back.easeOut' });
    }
    this.tweens.add({ targets: t, y: y - 20, alpha: 0, duration: 780, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  private missNumber(e: BossSprite) {
    const t = this.add.text(e.x + Phaser.Math.Between(-8, 8), e.y - e.displayHeight / 2 - 6, 'MISS', {
      fontFamily: '"Arial Black", sans-serif', fontSize: '10px', color: '#cfcfcf', stroke: '#3a3a3a', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(21).setResolution(4);
    this.tweens.add({ targets: t, y: t.y - 16, alpha: 0, duration: 600, onComplete: () => t.destroy() });
  }

  private killBoss(e: BossSprite) {
    if (e.dying) return;
    e.dying = true;
    e.hpBar?.destroy();
    (e.body as Phaser.Physics.Arcade.Body).enable = false;
    this.bossActive = false;
    sfx('bossdie');
    this.gainExp(bossExp(e.floor));
    this.boss = null;
    this.cameras.main.shake(500, 0.006);
    this.cameras.main.flash(400, 255, 255, 255);
    this.tweens.add({
      targets: e, alpha: 0, y: e.y - 14, scaleX: e.scaleX * 1.1, scaleY: e.scaleY * 1.1, duration: 900,
      onComplete: () => e.destroy(),
    });
    // 撃破でエリクサー補充
    this.progress.elixirs = Math.min(this.progress.elixirs + (e.floor.major ? 4 : 2), ELIXIR_MAX);
    // 最高到達階層を更新して保存
    this.persist(Math.max(this.progress.floor, this.floor.floor + 1));

    this.hud()?.showBanner(`${e.floor.bossName} 撃破!`, '#ffe45a');
    this.time.delayedCall(1200, () => this.openPortal(e.x));
  }

  private openPortal(x: number) {
    if (this.over) return;
    const isLast = this.floor.floor >= TOTAL_FLOORS;
    const px = Phaser.Math.Clamp(x, 60, ARENA_W - 60);
    this.portal = this.physics.add.sprite(px, GROUND_Y - 12, 'portal_0');
    (this.portal.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.portal.play('portal_spin');
    this.portal.setDepth(4).setScale(0);
    this.tweens.add({ targets: this.portal, scale: 1.4, duration: 500, ease: 'Back.easeOut' });
    sfx('portal');
    this.hud()?.showBanner(isLast ? 'ポータルへ入って全制覇!' : `ポータルが開いた! 第${this.floor.floor + 1}階へ`, '#9ad8ff');
  }

  private enterPortal() {
    if (this.transitioning || !this.portal) return;
    this.transitioning = true;
    sfx('portal');
    this.tweens.add({ targets: this.player, scale: 0, angle: 360, x: this.portal.x, duration: 500 });
    const next = this.floor.floor + 1;
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (next <= TOTAL_FLOORS) {
        this.progress.floor = next;
        this.scene.restart({ floor: next });
      } else {
        this.gameClear();
      }
    });
  }

  private gameClear() {
    stopBgm();
    this.over = true;
    const save = loadSave();
    save.clears = (save.clears || 0) + 1;
    save.highestFloor = TOTAL_FLOORS;
    writeSave(save);
    const time = Math.floor((Date.now() - this.progress.startTime) / 1000);
    this.hud()?.showClear({ level: this.progress.level, floor: TOTAL_FLOORS, time });
  }

  // ============================================================
  // 被ダメージ
  // ============================================================
  private hurtPlayer(rawAtk: number) {
    if (this.over || this.transitioning) return;
    const now = this.time.now;
    if (now < this.invulnUntil) return;
    this.invulnUntil = now + 900;
    const buff = this.buffs[this.progress.charKey];
    const defMul = now < buff.until ? buff.def : 1;
    const lvMul = enemyDamageScale(this.progress.level, this.floor.reqLevel);
    const dmg = Math.max(1, Math.floor(rawAtk * Phaser.Math.FloatBetween(0.85, 1.15) * defMul * lvMul));
    this.charState.hp = Math.max(0, this.charState.hp - dmg);
    sfx('hurt');
    this.floatText(this.player.x, this.player.y - 28, fmt(dmg), '#ff5a5a');
    this.player.setTintFill(0xff6a6a);
    this.cameras.main.shake(100, 0.004);
    this.player.setVelocityY(-110);
    this.time.delayedCall(120, () => this.player.clearTint());
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
    this.hud()?.showGameOver(this.floor.floor, () => this.retryFromFloor1());
  }

  private retryFromFloor1() {
    // レベルは保持したまま1階から再挑戦
    this.persist(this.progress.floor);
    for (const k of ['warrior', 'mage'] as CharKey[]) {
      this.progress.chars[k].hp = this.maxHp(k);
      this.progress.chars[k].mp = this.maxMp(k);
    }
    this.progress.elixirs = Math.max(this.progress.elixirs, 8);
    this.progress.floor = 1;
    this.scene.restart({ floor: 1 });
  }

  private gainExp(exp: number) {
    this.progress.exp += exp;
    this.floatText(this.player.x, this.player.y - 36, `+${fmt(exp)} EXP`, '#c8a4ff');
    const tierBefore = tierIndexFor(this.charDef, this.progress.level);
    let next = expForLevel(this.progress.level);
    while (this.progress.exp >= next && this.progress.level < LEVEL_CAP) {
      this.progress.exp -= next;
      this.progress.level++;
      next = expForLevel(this.progress.level);
      sfx('levelup');
      for (const k of ['warrior', 'mage'] as CharKey[]) {
        this.progress.chars[k].hp = this.maxHp(k);
        this.progress.chars[k].mp = this.maxMp(k);
      }
      const t = this.add.text(this.player.x, this.player.y - 40, 'LEVEL UP!', {
        fontFamily: '"Arial Black", sans-serif', fontSize: '12px', color: '#ffe45a', stroke: '#7a4a21', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(20).setResolution(4);
      this.tweens.add({ targets: t, y: t.y - 24, alpha: 0, duration: 1400, onComplete: () => t.destroy() });
      const ring = this.add.circle(this.player.x, this.player.y, 6, 0xffe45a, 0.6).setDepth(11);
      this.tweens.add({ targets: ring, radius: 44, alpha: 0, duration: 600, onUpdate: () => ring.setRadius(ring.radius), onComplete: () => ring.destroy() });
    }
    const tierAfter = tierIndexFor(this.charDef, this.progress.level);
    if (tierAfter > tierBefore) this.jobAdvance();
    this.persist(this.progress.floor);
  }

  private jobAdvance() {
    const tier = this.jobTier;
    this.skillCdAt = [0, 0, 0];
    sfx('portal');
    sfx('levelup');
    const pillar = this.add.rectangle(this.player.x, this.player.y - 30, 26, 110, 0xffffff, 0.85).setDepth(13);
    this.tweens.add({ targets: pillar, alpha: 0, scaleX: 2.2, duration: 900, ease: 'Cubic.easeOut', onComplete: () => pillar.destroy() });
    for (let i = 0; i < 3; i++) {
      const ring = this.add.circle(this.player.x, this.player.y, 6, 0xffd24a, 0.7).setDepth(13);
      this.tweens.add({ targets: ring, radius: 56 + i * 16, alpha: 0, duration: 700, delay: i * 150, onUpdate: () => ring.setRadius(ring.radius), onComplete: () => ring.destroy() });
    }
    this.cameras.main.flash(500, 255, 244, 200);
    this.player.setTexture(`${tier.spriteKey}_0`);
    this.player.play(`${tier.spriteKey}_stand`, true);
    this.hud()?.showBanner(`${tier.rankName}転職! 「${tier.jobName}」にジョブアップ!`, '#ffd24a');
    this.buildUiState();
  }

  private persist(floor: number) {
    writeSave({
      level: this.progress.level,
      exp: this.progress.exp,
      charKey: this.progress.charKey,
      highestFloor: Math.max(loadSave().highestFloor, floor),
      clears: loadSave().clears,
    });
  }

  private floatText(x: number, y: number, msg: string, color: string) {
    const t = this.add.text(x, y, msg, {
      fontFamily: '"Arial Black", sans-serif', fontSize: '9px', color, stroke: '#ffffff', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20).setResolution(4);
    this.tweens.add({ targets: t, y: y - 18, alpha: 0, duration: 750, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  // ============================================================
  // 更新ループ
  // ============================================================
  update() {
    if (this.over || this.transitioning) { this.syncUiState(); return; }
    this.updatePlayerMove();
    this.updateBoss();
    this.updateShots();
    this.updatePickups();
    this.updatePortal();
    this.syncUiState();
  }

  private updatePlayerMove() {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const left = this.pad.left || this.cursors.left.isDown;
    const right = this.pad.right || this.cursors.right.isDown;
    const up = this.pad.up || this.cursors.up.isDown || this.keys.SPACE.isDown || this.keys.Z.isDown;
    const speed = this.charDef.speed;

    if (Math.abs(body.velocity.x) > speed * 1.5 && !left && !right) {
      body.setVelocityX(body.velocity.x * 0.92);
    } else if (left) {
      body.setVelocityX(-speed); this.facing = -1; this.player.setFlipX(true);
    } else if (right) {
      body.setVelocityX(speed); this.facing = 1; this.player.setFlipX(false);
    } else {
      body.setVelocityX(0);
    }

    if (up && !this.upPrev && body.blocked.down) {
      this.doJump(left ? -1 : right ? 1 : 0);
    }
    this.upPrev = up;

    if (Phaser.Input.Keyboard.JustDown(this.keys.X)) this.doAttack();
    if (Phaser.Input.Keyboard.JustDown(this.keys.A)) this.doSkill(0);
    if (Phaser.Input.Keyboard.JustDown(this.keys.S)) this.doSkill(1);
    if (Phaser.Input.Keyboard.JustDown(this.keys.D)) this.doSkill(2);
    if (Phaser.Input.Keyboard.JustDown(this.keys.Q)) this.useElixir();
    if (Phaser.Input.Keyboard.JustDown(this.keys.E)) this.switchChar();

    const animKey = this.player.anims.currentAnim?.key ?? '';
    if (!animKey.endsWith('_attack')) {
      const moving = left || right;
      const want = `${this.spriteKey}_${moving ? 'walk' : 'stand'}`;
      if (animKey !== want) this.player.play(want, true);
    }

    if (this.player.y > WORLD_H + 20) {
      this.player.setPosition(40, GROUND_Y - 40);
    }
  }

  private updateBoss() {
    const b = this.boss;
    if (!b || !b.active || b.dying) return;
    const now = this.time.now;
    const body = b.body as Phaser.Physics.Arcade.Body;

    // 接触ダメージ
    if (now > b.touchCd &&
      Math.abs(b.x - this.player.x) < (b.displayWidth + this.player.displayWidth) / 2.6 &&
      Math.abs(b.y - this.player.y) < (b.displayHeight + this.player.displayHeight) / 2.6) {
      b.touchCd = now + TOUCH_DMG_CD;
      this.hurtPlayer(b.atk * 0.8);
    }

    const disabled = (b.frozenUntil && now < b.frozenUntil) || (b.stunUntil && now < b.stunUntil);
    if (disabled) {
      if (b.flying) body.setVelocity(0, 0); else body.setVelocityX(0);
      if (b.frozenUntil && now < b.frozenUntil) b.setTint(0x9ad8ff);
      this.drawBossHpBar(b, now);
      return;
    } else if (b.frozenUntil && now >= b.frozenUntil) {
      b.frozenUntil = 0; b.setTint(b.floor.tint);
    }

    const enraged = b.hp < b.maxhp * 0.5;
    const spd = b.floor.archetype === 'beast' ? 80 : 46;
    if (b.flying) {
      const dx = this.player.x - b.x;
      const dy = (this.player.y - 14) - b.y;
      body.setVelocity(
        Phaser.Math.Clamp(dx, -1, 1) * spd * (enraged ? 1.5 : 1),
        Phaser.Math.Clamp(dy, -1, 1) * spd * 0.5 + Math.sin(now / 300 + b.x) * 14
      );
      b.setFlipX(dx < 0);
    } else {
      if (now > b.aiTimer) {
        b.aiTimer = now + Phaser.Math.Between(900, 1800);
        b.dir = Math.sign(this.player.x - b.x) || 1;
      }
      if (b.x < 24) b.dir = 1;
      if (b.x > ARENA_W - 24) b.dir = -1;
      if (Math.abs(body.velocity.x) < 200) body.setVelocityX(b.dir * spd * (enraged ? 1.6 : 1));
      b.setFlipX(b.dir < 0);
    }
    this.drawBossHpBar(b, now);
  }

  private drawBossHpBar(b: BossSprite, now: number) {
    if (now - b.lastHitAt < 4000 && b.lastHitAt > 0) {
      if (!b.hpBar) b.hpBar = this.add.graphics().setDepth(15);
      const g = b.hpBar;
      const w = 40;
      g.clear();
      g.setPosition(b.x - w / 2, b.y - b.displayHeight / 2 - 9);
      g.fillStyle(0x000000, 0.55);
      g.fillRect(0, 0, w, 3.5);
      g.fillStyle(0xff5a8a, 1);
      g.fillRect(0.5, 0.5, (w - 1) * Math.max(0, b.hp / b.maxhp), 2.5);
    } else if (b.hpBar) {
      b.hpBar.destroy();
      b.hpBar = undefined;
    }
  }

  private updateShots() {
    for (const shot of this.playerShots.getChildren() as (Phaser.Physics.Arcade.Sprite & { mult: number; pierce: boolean; hits: number; hitSet: Set<BossSprite> })[]) {
      if (!shot.active) continue;
      if (shot.x < -20 || shot.x > ARENA_W + 20) { shot.destroy(); continue; }
      const b = this.boss;
      if (b && b.active && !b.dying && !shot.hitSet.has(b) &&
        Math.abs(b.x - shot.x) < b.displayWidth / 2 + 8 && Math.abs(b.y - shot.y) < b.displayHeight / 2 + 8) {
        shot.hitSet.add(b);
        this.hitEnemy(b, shot.mult, shot.hits);
        if (!shot.pierce) shot.destroy();
      }
    }
    for (const shot of this.enemyShots.getChildren() as Phaser.Physics.Arcade.Sprite[]) {
      if (!shot.active) continue;
      if (shot.x < -30 || shot.x > ARENA_W + 30 || shot.y < -30 || shot.y > WORLD_H + 30) { shot.destroy(); continue; }
      if (Math.abs(shot.x - this.player.x) < 11 && Math.abs(shot.y - this.player.y) < 15) {
        const atk = this.boss ? this.boss.atk * 0.7 : 20;
        shot.destroy();
        this.hurtPlayer(atk);
      }
    }
  }

  private updatePickups() {
    for (const d of this.drops.getChildren() as Phaser.Physics.Arcade.Sprite[]) {
      if (!d.active) continue;
      if (Math.abs(d.x - this.player.x) < 16 && Math.abs(d.y - this.player.y) < 20) {
        this.progress.elixirs = Math.min(this.progress.elixirs + 1, ELIXIR_MAX);
        sfx('potion');
        this.floatText(d.x, d.y - 10, 'エリクサー +1', '#ffd24a');
        d.destroy();
      }
    }
  }

  private updatePortal() {
    if (!this.portal) return;
    if (Math.abs(this.portal.x - this.player.x) < 14 && Math.abs(this.portal.y - this.player.y) < 26) this.enterPortal();
  }

  private syncUiState() {
    const def = this.charDef;
    const tier = this.jobTier;
    const ui = this.uiState;
    const now = this.time.now;
    ui.charKey = def.key;
    ui.charName = tier.jobName;
    ui.rankName = tier.rankName;
    ui.spriteKey = tier.spriteKey;
    ui.otherSpriteKey = this.otherCharSpriteKey();
    ui.hp = Math.ceil(this.charState.hp);
    ui.maxhp = this.maxHp(def.key);
    ui.mp = Math.floor(this.charState.mp);
    ui.maxmp = this.maxMp(def.key);
    ui.level = this.progress.level;
    ui.exp = this.progress.exp;
    ui.expNext = expForLevel(this.progress.level);
    ui.elixirs = this.progress.elixirs;
    ui.critRate = critRate(this.progress.level);
    const buff = this.buffs[def.key];
    ui.buffLeft = Math.max(0, buff.until - now);
    ui.buffName = ui.buffLeft > 0 ? buff.name : '';
    ui.floor = this.floor.floor;
    ui.total = TOTAL_FLOORS;
    ui.floorName = this.floor.bossName;
    ui.reqLevel = this.floor.reqLevel;
    ui.underLeveled = this.progress.level < this.floor.reqLevel;
    ui.boss = this.boss && this.boss.active
      ? { name: this.boss.floor.bossName, title: this.boss.floor.title, hp: Math.max(0, this.boss.hp), max: this.boss.maxhp }
      : null;
    ui.skills = tier.skills.map((s, i) => ({
      name: s.name, mp: this.skillMpCost(s),
      cdLeft: Math.max(0, this.skillCdAt[i] - now), cd: s.cd,
    }));
    ui.switchCdLeft = Math.max(0, this.switchCdAt - now);
    ui.otherCharKey = def.key === 'warrior' ? 'mage' : 'warrior';
    ui.gameOver = this.over;
  }
}
