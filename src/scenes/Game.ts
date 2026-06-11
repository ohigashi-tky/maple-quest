import Phaser from 'phaser';
import {
  CHARACTERS, ENEMIES, BOSSES, STAGES, GROUND_Y, WORLD_H,
  expForLevel, saveStage, newProgress, tierFor, tierIndexFor,
  atkScale, hpScale, mpScale, critRate, critMul, fmt, ELIXIR_MAX, BOSS_HP_MUL,
  type CharKey, type EnemyDef, type BossDef, type Progress, type StageDef, type JobTier, type SkillDef,
} from '../data';
import { sfx, playBgm, stopBgm } from '../audio';
import type HudScene from './Hud';

const ZOOM = 3;
const TOUCH_DMG_CD = 900;

export interface PadState {
  left: boolean;
  right: boolean;
  up: boolean;
}

export interface UiState {
  charKey: CharKey;
  charName: string;
  spriteKey: string;
  otherSpriteKey: string;
  hp: number; maxhp: number;
  mp: number; maxmp: number;
  level: number;
  exp: number; expNext: number;
  elixirs: number;
  critRate: number;
  buffLeft: number; buffName: string;
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
  frozenUntil?: number;
  stunUntil?: number;
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
  private pad: PadState = { left: false, right: false, up: false };

  private facing = 1;
  private upPrev = false;
  private attackCdAt = 0;
  private skillCdAt: number[] = [0, 0, 0];
  private switchCdAt = 0;
  private invulnUntil = 0;
  // 自己強化バフ(攻撃/防御)。キャラ別に保持
  private buffs: Record<CharKey, { atk: number; def: number; until: number; name: string }> = {
    warrior: { atk: 1, def: 1, until: 0, name: '' },
    mage: { atk: 1, def: 1, until: 0, name: '' },
  };
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
    this.player = this.physics.add.sprite(48, GROUND_Y - 30, `${this.spriteKey}_0`);
    this.player.setSize(10, 20).setOffset(3, 3);
    this.player.setCollideWorldBounds(true);
    this.player.play(`${this.spriteKey}_stand`);
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
    const tier = this.jobTier;
    this.uiState = {
      charKey: def.key,
      charName: tier.jobName,
      spriteKey: tier.spriteKey,
      otherSpriteKey: this.otherCharSpriteKey(),
      hp: this.progress.chars[def.key].hp,
      maxhp: this.maxHp(def.key),
      mp: this.progress.chars[def.key].mp,
      maxmp: this.maxMp(def.key),
      level: this.progress.level,
      exp: this.progress.exp,
      expNext: expForLevel(this.progress.level),
      elixirs: this.progress.elixirs,
      critRate: critRate(this.progress.level),
      buffLeft: 0, buffName: '',
      stageName: `${this.stage.name} ${this.stage.sub}`,
      kills: this.stageKills,
      quota: this.stage.quota,
      boss: null,
      skills: tier.skills.map((s) => ({ name: s.name, label: s.label, mp: this.skillMpCost(s), cdLeft: 0, cd: s.cd })),
      switchCdLeft: 0,
      otherCharKey: def.key === 'warrior' ? 'mage' : 'warrior',
      gameOver: false,
    };
  }

  // ============================================================
  // ステータス(メイプル風のインフレ成長)
  // ============================================================
  private maxHp(key: CharKey) {
    return hpScale(CHARACTERS[key].maxhp, this.progress.level);
  }
  private maxMp(key: CharKey) {
    return mpScale(CHARACTERS[key].maxmp, this.progress.level);
  }
  // 基礎攻撃力(レベル指数成長 × ジョブ補正 × バフ)
  private atk() {
    const buff = this.buffs[this.progress.charKey];
    const buffMul = this.time.now < buff.until ? buff.atk : 1;
    return CHARACTERS[this.progress.charKey].atk * atkScale(this.progress.level) * this.jobTier.atkBonus * buffMul;
  }
  // スキルのMP消費(最大MPに対する%で定義)
  private skillMpCost(s: SkillDef): number {
    return Math.max(1, Math.floor(this.maxMp(this.progress.charKey) * s.mp / 100));
  }
  // 敵の実効攻撃力(ステージ係数で増幅)
  private enemyAtk(def: EnemyDef): number {
    return def.atk * this.stage.mobAtkMul;
  }
  private get charDef() {
    return CHARACTERS[this.progress.charKey];
  }
  private get charState() {
    return this.progress.chars[this.progress.charKey];
  }
  // 現在のレベルで適用される転職ティア
  private get jobTier(): JobTier {
    return tierFor(this.charDef, this.progress.level);
  }
  private get spriteKey(): string {
    return this.jobTier.spriteKey;
  }
  private otherCharSpriteKey(): string {
    const other: CharKey = this.progress.charKey === 'warrior' ? 'mage' : 'warrior';
    return tierFor(CHARACTERS[other], this.progress.level).spriteKey;
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
    // ステージ係数でHPを増幅(プレイヤーのインフレ成長に追従)
    const hp = Math.round(def.hp * this.stage.mobHpMul);
    e.maxhp = hp;
    e.hp = hp;
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
    // ボスHPはステージ係数 × 追加倍率
    const bossHp = Math.round(def.hp * this.stage.mobHpMul * BOSS_HP_MUL);
    b.maxhp = bossHp;
    b.hp = bossHp;
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
            this.shockwaveAt(b.x, this.enemyAtk(b.def), 70);
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
              this.hurtPlayer(this.enemyAtk(b.def) * 1.2);
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

  // dir: -1=左斜め, 0=垂直, 1=右斜め
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
    const skill = this.jobTier.skills[i];
    if (!skill) return;
    const now = this.time.now;
    if (now < this.skillCdAt[i]) return;
    if (this.charState.mp < skill.mp) {
      sfx('denied');
      this.hud()?.flashMp();
      return;
    }
    this.charState.mp -= this.skillMpCost(skill);
    this.skillCdAt[i] = now + skill.cd;
    if (skill.kind !== 'buff') this.playAttackAnim();
    this.skillNameFx(skill.name);

    switch (skill.kind) {
      case 'melee': this.skMelee(skill); break;
      case 'aoe': this.skAoe(skill); break;
      case 'shout': this.skShout(skill); break;
      case 'wave': this.skWave(skill); break;
      case 'rush': this.skRush(skill, now); break;
      case 'buff': this.skBuff(skill); break;
      case 'projectile': this.skProjectile(skill); break;
      case 'thunder': this.skThunder(skill); break;
      case 'freeze': this.skFreeze(skill); break;
      case 'meteor': this.skMeteor(skill); break;
      case 'chain': this.skChain(skill); break;
      case 'genesis': this.skGenesis(skill); break;
      case 'heal': this.skHeal(skill); break;
    }
  }

  // ---- 戦士系スキル ----
  private skMelee(s: SkillDef) {
    sfx('slash');
    const power = s.mult >= 3.2;
    this.meleeFx(1.2 + s.mult * 0.18);
    if (power) {
      // 極撃: 三日月斬のオーラを前方に展開
      const arc = this.add.sprite(this.player.x + this.facing * 22, this.player.y - 2, 'fx_slash_0')
        .setDepth(12).setFlipX(this.facing < 0).setScale(2.4).setTint(0xfff0a0).setAlpha(0.85);
      arc.play('fx_slash_play');
      arc.once('animationcomplete', () => arc.destroy());
      this.cameras.main.shake(90, 0.003);
    }
    this.meleeHit(s.range ?? 36, s.mult, s.hits ?? 1);
  }

  private skAoe(s: SkillDef) {
    sfx('rush');
    this.cameras.main.shake(140, 0.005);
    const radius = s.radius ?? 64;
    // 二重リング + 放射状の閃光
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
    this.aoeDamage(this.player.x, this.player.y, radius, s.mult, s.hits ?? 1);
  }

  private skShout(s: SkillDef) {
    sfx('rush');
    sfx('thunder');
    this.cameras.main.shake(260, 0.007);
    const radius = s.radius ?? 90;
    // 衝撃の輪が一気に広がる
    const ring = this.add.circle(this.player.x, this.player.y, 12, 0xffd24a, 0.5).setDepth(11);
    this.tweens.add({
      targets: ring, radius, alpha: 0, duration: 360,
      onUpdate: () => ring.setRadius(ring.radius), onComplete: () => ring.destroy(),
    });
    const shock = this.add.circle(this.player.x, this.player.y, radius, 0xffffff, 0.18).setDepth(10);
    this.tweens.add({ targets: shock, alpha: 0, duration: 240, onComplete: () => shock.destroy() });
    for (const e of this.enemies.getChildren() as EnemySprite[]) {
      if (!e.active || e.dying) continue;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y) < radius) {
        this.hitEnemy(e, s.mult, 1);
        // スタン
        e.stunUntil = this.time.now + (s.durMs ?? 1500);
        const z = this.add.text(e.x, e.y - e.displayHeight / 2 - 8, '★', {
          fontSize: '8px', color: '#ffe45a',
        }).setOrigin(0.5).setDepth(16).setResolution(4);
        this.tweens.add({ targets: z, alpha: 0, duration: s.durMs ?? 1500, onComplete: () => z.destroy() });
      }
    }
  }

  private skWave(s: SkillDef) {
    sfx('rush');
    this.cameras.main.shake(120, 0.004);
    // 地面を走る衝撃波(コーマ)
    const wave = this.physics.add.sprite(this.player.x + this.facing * 14, this.player.y + 6, 'fx_slash_0') as Phaser.Physics.Arcade.Sprite & { mult: number; pierce: boolean; hitSet: Set<EnemySprite> };
    (wave.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    wave.setVelocityX(this.facing * 260);
    wave.setScale(2.2, 1.8).setFlipX(this.facing < 0).setTint(0xffb347).setDepth(11);
    wave.mult = s.mult;
    wave.pierce = true;
    wave.hitSet = new Set();
    this.playerShots.add(wave);
    this.tweens.add({ targets: wave, scaleY: 2.6, yoyo: true, duration: 200, repeat: 3 });
    this.time.delayedCall(900, () => wave.active && wave.destroy());
  }

  private skRush(s: SkillDef, now: number) {
    sfx('rush');
    const dir = this.facing;
    this.player.setVelocityX(dir * 460);
    this.invulnUntil = Math.max(this.invulnUntil, now + 420);
    // 残像
    for (let k = 0; k < 4; k++) {
      this.time.delayedCall(k * 60, () => {
        if (this.over) return;
        const ghost = this.add.sprite(this.player.x, this.player.y, `${this.spriteKey}_0`)
          .setDepth(9).setAlpha(0.4).setFlipX(this.facing < 0).setTint(0xffd24a);
        this.tweens.add({ targets: ghost, alpha: 0, duration: 250, onComplete: () => ghost.destroy() });
      });
    }
    const hitDone = new Set<EnemySprite>();
    const ev = this.time.addEvent({
      delay: 36, repeat: 11,
      callback: () => {
        for (const e of this.enemies.getChildren() as EnemySprite[]) {
          if (!e.active || e.dying || hitDone.has(e)) continue;
          if (Math.abs(e.x - this.player.x) < 28 && Math.abs(e.y - this.player.y) < 32) {
            hitDone.add(e);
            this.hitEnemy(e, s.mult, 1);
          }
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
    buff.def = s.defCut ?? 1; // defCut<1 で被ダメージ軽減
    buff.name = s.name;
    const color = s.atkBuff ? 0xff5a3a : 0x6ab0ff;
    // 自分を包むオーラ
    const aura = this.add.circle(this.player.x, this.player.y, 8, color, 0.45).setDepth(9);
    this.tweens.add({ targets: aura, radius: 26, alpha: 0, duration: 500, onUpdate: () => aura.setRadius(aura.radius), onComplete: () => aura.destroy() });
    for (let k = 0; k < 6; k++) {
      const ang = (k / 6) * Math.PI * 2;
      const p = this.add.image(this.player.x + Math.cos(ang) * 20, this.player.y + 14, 'fx_star_0').setDepth(14).setScale(1).setTint(color);
      this.tweens.add({ targets: p, y: this.player.y - 24, alpha: 0, duration: 600, delay: k * 40, onComplete: () => p.destroy() });
    }
    this.player.setTint(color);
    this.time.delayedCall(300, () => !this.over && this.player.clearTint());
    this.floatText(this.player.x, this.player.y - 30, s.atkBuff ? '攻撃力UP!' : '防御力UP!', s.atkBuff ? '#ff7a5a' : '#7ab0ff');
  }

  // ---- 魔法系スキル ----
  private skProjectile(s: SkillDef) {
    sfx('fire');
    const big = s.mult >= 3.0;
    this.shoot('fx_fire_0', s.speed ?? 240, s.mult, s.pierce ?? false, 280, 0.8 + s.mult * 0.22);
    if (big) {
      // 発射の閃光
      const flash = this.add.circle(this.player.x + this.facing * 14, this.player.y - 4, 6, 0xffd24a, 0.7).setDepth(12);
      this.tweens.add({ targets: flash, radius: 18, alpha: 0, duration: 220, onUpdate: () => flash.setRadius(flash.radius), onComplete: () => flash.destroy() });
    }
  }

  private skThunder(s: SkillDef) {
    sfx('thunder');
    this.cameras.main.shake(180, 0.006);
    this.cameras.main.flash(120, 200, 200, 120);
    const range = s.range ?? 110;
    const candidates = (this.enemies.getChildren() as EnemySprite[])
      .filter((e) => e.active && !e.dying && Math.abs(e.x - this.player.x) < range && Math.abs(e.y - this.player.y) < 100)
      .sort((a, b2) => Math.abs(a.x - this.player.x) - Math.abs(b2.x - this.player.x))
      .slice(0, s.targets ?? 4);
    candidates.forEach((e, idx) => {
      this.time.delayedCall(idx * 80, () => {
        if (!e.active) return;
        this.boltFx(e.x, e.y);
        this.hitEnemy(e, s.mult, 1);
      });
    });
    if (candidates.length === 0) {
      this.boltFx(this.player.x + this.facing * 30, this.player.y);
    }
  }

  private skFreeze(s: SkillDef) {
    sfx('thunder');
    this.cameras.main.shake(140, 0.004);
    const radius = s.radius ?? 90;
    const cx = this.player.x + this.facing * 30;
    const cy = this.player.y;
    // 氷の結晶が舞う
    const ring = this.add.circle(cx, cy, 10, 0x9ad8ff, 0.4).setDepth(11);
    this.tweens.add({ targets: ring, radius, alpha: 0, duration: 360, onUpdate: () => ring.setRadius(ring.radius), onComplete: () => ring.destroy() });
    for (let k = 0; k < 7; k++) {
      const ang = Math.random() * Math.PI * 2;
      const d = Math.random() * radius;
      const ice = this.add.image(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, 'fx_ice_0').setDepth(13).setScale(0.4).setAlpha(0);
      this.tweens.add({ targets: ice, scale: 1, alpha: 1, duration: 180, yoyo: true, hold: 200, delay: k * 30, onComplete: () => ice.destroy() });
    }
    for (const e of this.enemies.getChildren() as EnemySprite[]) {
      if (!e.active || e.dying) continue;
      if (Phaser.Math.Distance.Between(cx, cy, e.x, e.y) < radius) {
        this.hitEnemy(e, s.mult, 1);
        e.frozenUntil = this.time.now + (s.durMs ?? 2000);
        if (!e.def.fly && e.body) e.setVelocity(0, 0);
        e.setTint(0x9ad8ff);
      }
    }
  }

  private skMeteor(s: SkillDef) {
    sfx('fire');
    this.cameras.main.shake(220, 0.006);
    const range = 150;
    const targets = (this.enemies.getChildren() as EnemySprite[])
      .filter((e) => e.active && !e.dying && Math.abs(e.x - this.player.x) < range)
      .slice(0, s.targets ?? 5);
    const spots = targets.length
      ? targets.map((e) => ({ x: e.x, y: e.y }))
      : [{ x: this.player.x + this.facing * 50, y: GROUND_Y - 20 }];
    spots.forEach((sp, idx) => {
      this.time.delayedCall(idx * 130, () => {
        if (this.over) return;
        // 上空から隕石が落下
        const meteor = this.add.image(sp.x + 30, sp.y - 120, 'fx_fire_0').setDepth(14).setScale(2.6).setTint(0xff7a2a);
        this.tweens.add({
          targets: meteor, x: sp.x, y: sp.y, duration: 240, ease: 'Quad.easeIn',
          onComplete: () => {
            meteor.destroy();
            sfx('thunder');
            this.cameras.main.shake(120, 0.005);
            // 着弾爆発
            const boom = this.add.circle(sp.x, sp.y, 8, 0xffd24a, 0.7).setDepth(13);
            this.tweens.add({ targets: boom, radius: 56, alpha: 0, duration: 320, onUpdate: () => boom.setRadius(boom.radius), onComplete: () => boom.destroy() });
            this.aoeDamage(sp.x, sp.y, 56, s.mult, 1);
          },
        });
      });
    });
  }

  private skChain(s: SkillDef) {
    sfx('thunder');
    this.cameras.main.flash(140, 180, 220, 255);
    const range = s.range ?? 160;
    const ordered = (this.enemies.getChildren() as EnemySprite[])
      .filter((e) => e.active && !e.dying && Math.abs(e.x - this.player.x) < range && Math.abs(e.y - this.player.y) < 120)
      .sort((a, b2) => Math.abs(a.x - this.player.x) - Math.abs(b2.x - this.player.x))
      .slice(0, s.targets ?? 8);
    let prevX = this.player.x, prevY = this.player.y - 6;
    ordered.forEach((e, idx) => {
      this.time.delayedCall(idx * 70, () => {
        if (!e.active) return;
        this.lightningLink(prevX, prevY, e.x, e.y);
        prevX = e.x; prevY = e.y;
        this.boltFx(e.x, e.y, 1.6);
        this.hitEnemy(e, s.mult, 1);
      });
    });
    if (ordered.length === 0) this.boltFx(this.player.x + this.facing * 30, this.player.y);
  }

  private skGenesis(s: SkillDef) {
    sfx('thunder');
    sfx('levelup');
    this.cameras.main.flash(500, 255, 250, 210);
    this.cameras.main.shake(400, 0.006);
    // 画面全体に降り注ぐ光の柱
    const cam = this.cameras.main;
    const left = cam.scrollX, right = cam.scrollX + cam.width / cam.zoom;
    for (let k = 0; k < 14; k++) {
      const x = Phaser.Math.Between(Math.floor(left), Math.floor(right));
      this.time.delayedCall(k * 45, () => {
        const pillar = this.add.image(x, GROUND_Y - 28, 'fx_pillar_0').setDepth(14).setScale(1.4, 1).setAlpha(0).setOrigin(0.5, 0.5);
        this.tweens.add({ targets: pillar, alpha: 1, duration: 120, yoyo: true, hold: 160, onComplete: () => pillar.destroy() });
      });
    }
    // 全画面の敵にダメージ
    for (const e of this.enemies.getChildren() as EnemySprite[]) {
      if (!e.active || e.dying) continue;
      if (e.x > left - 20 && e.x < right + 20) {
        this.time.delayedCall(Phaser.Math.Between(0, 400), () => {
          if (!e.active) return;
          const p = this.add.image(e.x, e.y - 20, 'fx_pillar_0').setDepth(15).setScale(1.2, 1.4).setAlpha(0.9);
          this.tweens.add({ targets: p, alpha: 0, duration: 280, onComplete: () => p.destroy() });
          this.hitEnemy(e, s.mult, 1);
        });
      }
    }
    // 自分も大回復
    this.healSelf(s.healPct ?? 1.0);
  }

  private skHeal(s: SkillDef) {
    sfx('heal');
    this.healSelf(s.healPct ?? 0.4);
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
    for (const e of this.enemies.getChildren() as EnemySprite[]) {
      if (!e.active || e.dying) continue;
      if (Phaser.Math.Distance.Between(x, y, e.x, e.y) < radius + e.displayWidth / 3) {
        this.hitEnemy(e, mult, hits);
      }
    }
  }

  private boltFx(x: number, y: number, scale = 1) {
    const bolt = this.add.image(x, y - 30, 'fx_bolt_0').setDepth(13).setScale(scale, 2.6 * scale).setOrigin(0.5, 0);
    this.tweens.add({ targets: bolt, alpha: 0, duration: 300, onComplete: () => bolt.destroy() });
    const flash = this.add.circle(x, y, 6, 0xffffff, 0.7).setDepth(12);
    this.tweens.add({ targets: flash, radius: 16, alpha: 0, duration: 200, onUpdate: () => flash.setRadius(flash.radius), onComplete: () => flash.destroy() });
  }

  // 2点間を稲妻でつなぐ(チェーンライトニング)
  private lightningLink(x1: number, y1: number, x2: number, y2: number) {
    const g = this.add.graphics().setDepth(13);
    g.lineStyle(2, 0xbfe0ff, 0.9);
    g.beginPath();
    g.moveTo(x1, y1);
    const seg = 4;
    for (let k = 1; k <= seg; k++) {
      const t = k / seg;
      const mx = x1 + (x2 - x1) * t + Phaser.Math.Between(-6, 6);
      const my = y1 + (y2 - y1) * t + Phaser.Math.Between(-6, 6);
      g.lineTo(mx, my);
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
    if (this.progress.elixirs <= 0) {
      sfx('denied');
      return;
    }
    this.progress.elixirs--;
    sfx('potion');
    // 現在のキャラのHP/MPを全回復
    const max = this.maxHp(this.progress.charKey);
    const mmax = this.maxMp(this.progress.charKey);
    this.charState.hp = max;
    this.charState.mp = mmax;
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
    // 交代エフェクト
    const fx = this.add.circle(this.player.x, this.player.y, 16, 0xffffff, 0.7).setDepth(12);
    this.tweens.add({ targets: fx, radius: 30, alpha: 0, duration: 300, onUpdate: () => fx.setRadius(fx.radius), onComplete: () => fx.destroy() });
    this.player.setTexture(`${this.spriteKey}_0`);
    this.player.play(`${this.spriteKey}_stand`);
    this.buildUiState();
    this.hud()?.refreshSkillButtons();
  }

  // ============================================================
  // 攻撃処理
  // ============================================================
  private playAttackAnim() {
    const key = this.spriteKey;
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

  private shoot(tex: string, speed: number, mult: number, pierce: boolean, rangeMs: number, scale = 1) {
    const shot = this.playerShots.create(
      this.player.x + this.facing * 10, this.player.y - 4, tex
    ) as Phaser.Physics.Arcade.Sprite & { mult: number; pierce: boolean; hitSet: Set<EnemySprite> };
    shot.setVelocityX(this.facing * speed);
    shot.setFlipX(this.facing < 0);
    shot.setDepth(11);
    shot.setScale(scale);
    shot.mult = mult;
    shot.pierce = pierce;
    shot.hitSet = new Set();
    this.time.delayedCall(rangeMs * 4, () => shot.active && shot.destroy());
  }

  private hitEnemy(e: EnemySprite, mult: number, hits: number) {
    if (!e.active || e.dying) return;
    for (let i = 0; i < hits; i++) {
      this.time.delayedCall(i * 80, () => {
        if (!e.active || e.dying) return;
        const crit = Math.random() < critRate(this.progress.level);
        // 凍結中の敵は被ダメージ1.3倍(メイプルの氷結特効)
        const frozen = e.frozenUntil && this.time.now < e.frozenUntil ? 1.3 : 1;
        const dmg = Math.max(1, Math.floor(
          this.atk() * mult * Phaser.Math.FloatBetween(0.92, 1.08) * (crit ? critMul(this.progress.level) : 1) * frozen
        ));
        e.hp -= dmg;
        e.lastHitAt = this.time.now;
        sfx(crit ? 'crit' : 'hit');
        this.damageNumber(e, dmg, crit);
        const star = this.add.image(e.x, e.y - 6, 'fx_star_0').setDepth(13).setScale(crit ? 1.6 : 1.0);
        this.tweens.add({ targets: star, alpha: 0, scale: 0.3, angle: 90, duration: 240, onComplete: () => star.destroy() });
        // ノックバック & 点滅(凍結中は動かない)
        const frozenNow = e.frozenUntil && this.time.now < e.frozenUntil;
        if (!e.isBoss && e.body && !frozenNow) {
          e.setVelocityX(Math.sign(e.x - this.player.x) * 60);
          if (!e.def.fly) e.setVelocityY(-60);
        }
        e.setTintFill(crit ? 0xffe45a : 0xffffff);
        this.time.delayedCall(80, () => e.active && (frozenNow ? e.setTint(0x9ad8ff) : e.clearTint()));
        if (e.hp <= 0) this.killEnemy(e);
      });
    }
  }

  // メイプル風の桁が躍るダメージ表記(クリティカルは黄色く大きく)
  private damageNumber(e: EnemySprite, dmg: number, crit: boolean) {
    const x = e.x + Phaser.Math.Between(-8, 8);
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
    }
    this.tweens.add({
      targets: t, y: y - 20, alpha: 0, duration: 780, ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
    // クリティカルは軽く弾む演出
    if (crit) {
      t.setScale(1.5);
      this.tweens.add({ targets: t, scale: 1, duration: 180, ease: 'Back.easeOut' });
    }
  }

  private killEnemy(e: EnemySprite) {
    if (e.dying) return;
    e.dying = true;
    e.hpBar?.destroy();
    (e.body as Phaser.Physics.Arcade.Body).enable = false;
    sfx(e.isBoss ? 'bossdie' : 'mobdie');

    const baseExp = e.isBoss ? (e.def as BossDef).exp : e.def.exp;
    this.gainExp(Math.round(baseExp * this.stage.expMul));
    if (!e.isBoss) {
      this.stageKills++;
      if (Math.random() < 0.16) this.dropElixir(e.x, e.y - 10);
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

  private dropElixir(x: number, y: number) {
    const d = this.drops.create(x, y, 'elixir_0') as Phaser.Physics.Arcade.Sprite;
    d.setVelocity(Phaser.Math.Between(-30, 30), -120);
    d.setDepth(6);
    d.setBounce(0.4);
    d.setScale(1.2);
    this.tweens.add({ targets: d, angle: 360, duration: 1400, repeat: -1 });
    this.tweens.add({ targets: d, alpha: 0, delay: 8000, duration: 800, onComplete: () => d.active && d.destroy() });
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
        // ステージクリア報酬: エリクサー補充
        this.progress.elixirs = Math.min(this.progress.elixirs + 6, ELIXIR_MAX);
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
    // 防御バフ(アイアンボディ)中は被ダメージ軽減
    const buff = this.buffs[this.progress.charKey];
    const defMul = now < buff.until ? buff.def : 1;
    const dmg = Math.max(1, Math.floor(rawAtk * Phaser.Math.FloatBetween(0.85, 1.15) * defMul));
    this.charState.hp = Math.max(0, this.charState.hp - dmg);
    sfx('hurt');
    this.floatText(this.player.x, this.player.y - 28, fmt(dmg), '#ff5a5a');
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
    this.progress.elixirs = Math.max(this.progress.elixirs, 5);
    this.scene.restart({ stage: this.stageIdx });
  }

  private gainExp(exp: number) {
    this.progress.kills++;
    this.progress.exp += exp;
    this.floatText(this.player.x, this.player.y - 36, `+${exp} EXP`, '#c8a4ff');
    const tierBefore = tierIndexFor(this.charDef, this.progress.level);
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
    const tierAfter = tierIndexFor(this.charDef, this.progress.level);
    if (tierAfter > tierBefore) this.jobAdvance();
  }

  // 転職演出: 見た目・スキルが切り替わる
  private jobAdvance() {
    const tier = this.jobTier;
    this.skillCdAt = [0, 0, 0];
    sfx('portal');
    sfx('levelup');

    // 光の柱 + リング
    const pillar = this.add.rectangle(this.player.x, this.player.y - 30, 26, 110, 0xffffff, 0.85).setDepth(13);
    this.tweens.add({ targets: pillar, alpha: 0, scaleX: 2.2, duration: 900, ease: 'Cubic.easeOut', onComplete: () => pillar.destroy() });
    for (let i = 0; i < 3; i++) {
      const ring = this.add.circle(this.player.x, this.player.y, 6, 0xffd24a, 0.7).setDepth(13);
      this.tweens.add({
        targets: ring, radius: 56 + i * 16, alpha: 0, duration: 700, delay: i * 150,
        onUpdate: () => ring.setRadius(ring.radius), onComplete: () => ring.destroy(),
      });
    }
    this.cameras.main.flash(500, 255, 244, 200);

    // 新しい見た目に切り替え
    this.player.setTexture(`${tier.spriteKey}_0`);
    this.player.play(`${tier.spriteKey}_stand`, true);

    const t = this.add.text(this.player.x, this.player.y - 52, `${tier.rankName}転職!`, {
      fontFamily: '"Arial Black", sans-serif', fontSize: '13px',
      color: '#ffd24a', stroke: '#7a4a21', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20).setResolution(4);
    this.tweens.add({ targets: t, y: t.y - 26, alpha: 0, duration: 1800, onComplete: () => t.destroy() });

    this.hud()?.showBanner(`${tier.rankName}転職! 「${tier.jobName}」にジョブアップ!`, '#ffd24a');
    this.buildUiState();
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
    const up = this.pad.up || this.cursors.up.isDown || this.keys.SPACE.isDown || this.keys.Z.isDown;
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

    // 上方向キー: 接地中の立ち上がりエッジでジャンプ(左右同時押しで斜めジャンプ)
    if (up && !this.upPrev && body.blocked.down) {
      const dir = left ? -1 : right ? 1 : 0;
      this.doJump(dir);
    }
    this.upPrev = up;

    // キーボード(操作系)
    if (Phaser.Input.Keyboard.JustDown(this.keys.X)) this.doAttack();
    if (Phaser.Input.Keyboard.JustDown(this.keys.A)) this.doSkill(0);
    if (Phaser.Input.Keyboard.JustDown(this.keys.S)) this.doSkill(1);
    if (Phaser.Input.Keyboard.JustDown(this.keys.D)) this.doSkill(2);
    if (Phaser.Input.Keyboard.JustDown(this.keys.Q)) this.useElixir();
    if (Phaser.Input.Keyboard.JustDown(this.keys.E)) this.switchChar();

    // アニメーション
    const animKey = this.player.anims.currentAnim?.key ?? '';
    if (!animKey.endsWith('_attack')) {
      const moving = left || right;
      const want = `${this.spriteKey}_${moving ? 'walk' : 'stand'}`;
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
        this.hurtPlayer(this.enemyAtk(e.def));
      }

      // スタン/凍結中は行動停止(地上の敵は静止)
      const disabled = (e.frozenUntil && now < e.frozenUntil) || (e.stunUntil && now < e.stunUntil);
      if (disabled) {
        if (!e.def.fly) body.setVelocityX(0);
        else body.setVelocity(0, 0);
        if (e.frozenUntil && now < e.frozenUntil) e.setTint(0x9ad8ff);
        this.drawEnemyHpBar(e, now);
        continue;
      } else if (e.frozenUntil && now >= e.frozenUntil) {
        e.frozenUntil = 0;
        e.clearTint();
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

      this.drawEnemyHpBar(e, now);
    }
  }

  // HPバー(ダメージを受けてから3秒表示)
  private drawEnemyHpBar(e: EnemySprite, now: number) {
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
        const atk = this.boss ? this.enemyAtk(this.boss.def) * 0.8 : 18 * this.stage.mobAtkMul;
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
    if (Math.abs(this.portal.x - this.player.x) < 12 && Math.abs(this.portal.y - this.player.y) < 24) {
      this.enterPortal();
    }
  }

  private syncUiState() {
    const def = this.charDef;
    const tier = this.jobTier;
    const ui = this.uiState;
    const now = this.time.now;
    ui.charKey = def.key;
    ui.charName = tier.jobName;
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
    ui.stageName = `${this.stage.name} ${this.stage.sub}`;
    ui.kills = Math.min(this.stageKills, this.stage.quota);
    ui.quota = this.stage.quota;
    ui.boss = this.boss && this.boss.active
      ? { name: this.boss.def.name, title: (this.boss.def as BossDef).title, hp: Math.max(0, this.boss.hp), max: this.boss.maxhp }
      : null;
    ui.skills = tier.skills.map((s, i) => ({
      name: s.name, label: s.label, mp: this.skillMpCost(s),
      cdLeft: Math.max(0, this.skillCdAt[i] - now), cd: s.cd,
    }));
    ui.switchCdLeft = Math.max(0, this.switchCdAt - now);
    ui.otherCharKey = def.key === 'warrior' ? 'mage' : 'warrior';
    ui.gameOver = this.over;
  }
}
