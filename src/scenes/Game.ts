import Phaser from 'phaser';
import {
  CHARACTERS, FLOORS, TOTAL_FLOORS, GROUND_Y, WORLD_H, ARENA_W,
  expForLevel, newProgress, tierFor, tierIndexFor,
  atkScale, hpScale, mpScale, critRate, critMul, fmt, fmtBig, ELIXIR_MAX, LEVEL_CAP, REGEN_PCT_PER_SEC,
  bossHp, bossAtk, bossExp, playerHitChance, playerDamageScale, enemyDamageScale, effReq, stanceChance,
  loadSave, writeSave, themeTile, DIFFICULTIES,
  INFINITE_TIME, gaugeMax,
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
  hp: number; maxhp: number;
  mp: number; maxmp: number;
  level: number;
  exp: number; expNext: number;
  elixirs: number;
  critRate: number;
  buffLeft: number; buffName: string;
  floor: number; total: number;
  floorName: string;
  difficulty: number;
  underLeveled: boolean;
  boss: { name: string; title: string; hp: number; max: number } | null;
  skills: { name: string; mp: number; cdLeft: number; cd: number }[];
  elixirCdLeft: number;
  gameOver: boolean;
  // 無限ボスモード
  infinite: boolean;
  infGauge: number;      // 何ゲージ目か
  infHp: number;         // 現在ゲージの残りHP
  infMax: number;        // 現在ゲージの最大HP
  infTotal: number;      // 累積ダメージ
  infTimeLeft: number;   // 残り秒
}

interface BossSprite extends Phaser.Physics.Arcade.Sprite {
  floor: FloorDef;
  expMul?: number;  // 撃破EXP倍率(双子ボスの2体目は低め)
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
  dmgStackAt?: number;  // 直近のダメージ表示時刻(多段の積み重ね用)
  dmgStackN?: number;   // 連続ヒット数
  slowUntil?: number;   // フリージングブレスの減速デバフ
  roamAt?: number;      // 次に気まぐれ移動を更新する時刻
  targetDist?: number;  // 現在保とうとしている間合い
  strafe?: number;      // 横方向の気まぐれ(-1/0/1)
}

export default class GameScene extends Phaser.Scene {
  private floorIdx = 0;
  private floor!: FloorDef;
  private progress!: Progress;

  private player!: Phaser.Physics.Arcade.Sprite;
  private weapon!: Phaser.GameObjects.Sprite;  // 転職ごとに大型化する武器(鉾/杖)
  private weaponSwingUntil = 0;                // 攻撃時の振りモーション終了時刻
  private weaponHiddenUntil = 0;               // ピアスサイクロン中は手持ち武器を隠す
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
  private invulnUntil = 0;
  private elixirCdUntil = 0;
  private buffs: Record<CharKey, { atk: number; def: number; hp: number; cd: number; until: number; name: string }> = {
    warrior: { atk: 1, def: 1, hp: 1, cd: 1, until: 0, name: '' },
    mage: { atk: 1, def: 1, hp: 1, cd: 1, until: 0, name: '' },
    thief: { atk: 1, def: 1, hp: 1, cd: 1, until: 0, name: '' },
  };
  // 召喚獣が付与する一時バフ(攻撃/防御/クリティカル)
  private sumBuff = { atk: 1, def: 1, crit: 0, until: 0 };
  private inputLockUntil = 0;  // フリージングブレス等で行動不能
  private castLockUntil = 0;   // スキル発動モーション中は他スキル使用不可
  // 召喚獣(エルクィネス/ダークスピリット)。再詠唱で作り直す
  private summons: Record<string, { sprite: Phaser.GameObjects.Sprite; endAt: number; ev: Phaser.Time.TimerEvent }> = {};
  // シャドーパートナー(盗賊): 分身が本体の攻撃を反復する
  private shadowUntil = 0;
  private shadowSprites: Phaser.GameObjects.Sprite[] = [];
  private bosses: BossSprite[] = [];
  // 互換用: 既存スキルは「最も近い生存ボス」を単体ターゲットとして扱う
  private get boss(): BossSprite | null {
    let best: BossSprite | null = null, bd = Infinity;
    for (const b of this.bosses) {
      if (!b.active || b.dying) continue;
      const d = Math.abs(b.x - this.player.x);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }
  // 生存中のボス一覧(範囲攻撃用)
  private aliveBosses(): BossSprite[] {
    return this.bosses.filter((b) => b.active && !b.dying);
  }
  private portal: Phaser.Physics.Arcade.Sprite | null = null;
  private over = false;
  private transitioning = false;
  private bossActive = false;

  uiState!: UiState;

  constructor() {
    super('Game');
  }

  init(data: { floor?: number; difficulty?: number; infinite?: boolean }) {
    this.facing = 1;
    this.attackCdAt = 0;
    this.skillCdAt = [0, 0, 0];
    this.invulnUntil = 0;
    this.elixirCdUntil = 0;
    this.inputLockUntil = 0;
    this.castLockUntil = 0;
    this.sumBuff = { atk: 1, def: 1, crit: 0, until: 0 };
    this.summons = {};
    this.shadowUntil = 0;
    this.shadowSprites = [];
    this.bosses = [];
    this.portal = null;
    this.over = false;
    this.transitioning = false;
    this.bossActive = false;
    this._initFloor = data.floor;
    this._initDiff = data.difficulty;
    this.infinite = !!data.infinite;
    this.inf = { gauge: 1, hp: 0, total: 0, maxHit: 0, endAt: 0 };
  }
  private _initFloor?: number;
  private _initDiff?: number;
  private infinite = false;
  private inf = { gauge: 1, hp: 0, total: 0, maxHit: 0, endAt: 0 };

  create() {
    this.progress = this.registry.get('progress') as Progress;
    if (!this.progress) {
      this.progress = newProgress(loadSave());
      this.registry.set('progress', this.progress);
    }
    if (this.infinite) {
      // 無限ボス: 虚無テーマの舞台で巨大ボスを延々と殴る計測モード
      this.floorIdx = TOTAL_FLOORS - 1;
      this.floor = FLOORS[this.floorIdx]; // void テーマ
    } else {
      if (this._initFloor !== undefined) this.progress.floor = this._initFloor;
      if (this._initDiff !== undefined) this.progress.difficulty = this._initDiff;
      this.floorIdx = Phaser.Math.Clamp(this.progress.floor - 1, 0, TOTAL_FLOORS - 1);
      this.floor = FLOORS[this.floorIdx];
    }

    this.buildBackground();
    this.buildPlatforms();
    this.buildPlayer();
    this.buildGroups();
    this.buildColliders();
    this.buildCamera();
    this.buildKeyboard();
    this.buildUiState();

    this.cameras.main.fadeIn(400, 0, 0, 0);

    if (this.infinite) {
      playBgm('epic');
      this.inf.endAt = this.time.now + INFINITE_TIME * 1000;
      this.inf.gauge = 1;
      this.inf.hp = gaugeMax(1);
      this.time.delayedCall(150, () => this.hud()?.showBanner('無限ボス\n1分間の最大ダメージに挑戦!', '#ff9ad8'));
      this.time.delayedCall(900, () => this.spawnBoss());
    } else {
      // 中ボスはかっこいい戦闘曲、5層ごとの強敵はより激しいエピック曲
      playBgm(this.floor.major ? 'epic' : 'battle');
      this.time.delayedCall(200, () => {
        const diffName = DIFFICULTIES[this.progress.difficulty].name;
        this.hud()?.showBanner(
          `第 ${this.floor.floor} 階 [${diffName}]\n${this.floor.title}「${this.floor.bossName}」`,
          this.floor.major ? '#ff7a7a' : '#ffe9b0'
        );
        if (this.progress.level < this.er(this.floor) - 4) {
          this.time.delayedCall(1500, () => this.hud()?.showBanner('強敵! 油断するな', '#ff8a8a'));
        }
      });
      this.time.delayedCall(1100, () => this.spawnBoss());
    }

    this.events.on('shutdown', () => { this.tweens.killAll(); this.clearSummons(); this.clearShadows(); });
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
      this.add.image(x, Phaser.Math.Between(50, 140), 'cloud_0').setDepth(-15)
        .setScrollFactor(0.3, 0.6)
        .setAlpha(this.floor.theme === 'dark' || this.floor.theme === 'void' ? 0.16 : 0.85)
        .setScale(Phaser.Math.FloatBetween(0.6, 1.1));
    }
    this.buildDojoDecor(w);
  }

  // 道場らしい装飾: 左右の柱・後壁の帯・幕・灯り(テーマ別)
  private buildDojoDecor(w: number) {
    const theme = this.floor.theme;
    const pal: Record<string, { wall: number; beam: number; accent: number; rope: number }> = {
      grass: { wall: 0x8a5a32, beam: 0x6a4422, accent: 0xc23a3a, rope: 0xe0b050 },
      sky: { wall: 0xb0a0d8, beam: 0x8a78b8, accent: 0x4a7fd6, rope: 0xe0e8ff },
      dark: { wall: 0x3a2d52, beam: 0x261c3a, accent: 0x8a5acc, rope: 0xc09040 },
      void: { wall: 0x241830, beam: 0x140c1e, accent: 0xc02a6a, rope: 0x8a3a9c },
    };
    const c = pal[theme];
    const g = this.add.graphics().setDepth(-8);

    // 背面の道場の壁(腰高の羽目板)
    g.fillStyle(c.wall, theme === 'grass' ? 0.55 : 0.7);
    g.fillRect(0, GROUND_Y - 96, w, 96);
    g.fillStyle(c.beam, 0.6);
    g.fillRect(0, GROUND_Y - 96, w, 8);          // 上桁
    g.fillRect(0, GROUND_Y - 30, w, 6);          // 腰板の境
    for (let x = 24; x < w; x += 56) g.fillRect(x, GROUND_Y - 96, 5, 96); // 縦柱

    // 左右の太い柱
    g.fillStyle(c.beam, 0.95);
    g.fillRect(0, GROUND_Y - 200, 16, 200);
    g.fillRect(w - 16, GROUND_Y - 200, 16, 200);
    g.fillStyle(c.wall, 1);
    g.fillRect(2, GROUND_Y - 200, 12, 200);
    g.fillRect(w - 14, GROUND_Y - 200, 12, 200);
    // 柱頭
    g.fillStyle(c.beam, 1);
    g.fillRect(-2, GROUND_Y - 206, 20, 8);
    g.fillRect(w - 18, GROUND_Y - 206, 20, 8);

    // 上部に渡した横断幕
    g.fillStyle(c.accent, 0.92);
    g.fillRect(18, GROUND_Y - 196, w - 36, 22);
    g.fillStyle(0xffffff, 0.16);
    g.fillRect(18, GROUND_Y - 196, w - 36, 5);
    // 幕の房飾り
    g.fillStyle(c.rope, 1);
    for (let x = 30; x < w - 24; x += 28) g.fillTriangle(x, GROUND_Y - 174, x - 5, GROUND_Y - 174, x, GROUND_Y - 166);

    // 道場名の円印(中央)
    g.fillStyle(c.rope, 0.9);
    g.fillCircle(w / 2, GROUND_Y - 185, 9);
    g.fillStyle(c.accent, 1);
    g.fillCircle(w / 2, GROUND_Y - 185, 6);

    // 暗いテーマは左右に松明の灯り
    if (theme === 'dark' || theme === 'void') {
      for (const tx of [30, w - 30]) {
        const fire = this.add.circle(tx, GROUND_Y - 150, 7, theme === 'void' ? 0xc02a6a : 0xffb347, 0.85).setDepth(-7);
        this.tweens.add({ targets: fire, scale: 1.3, alpha: 0.5, duration: 420, yoyo: true, repeat: -1 });
        const glow = this.add.circle(tx, GROUND_Y - 150, 18, theme === 'void' ? 0xc02a6a : 0xffb347, 0.18).setDepth(-7);
        this.tweens.add({ targets: glow, scale: 1.25, duration: 600, yoyo: true, repeat: -1 });
      }
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

    // ジャンプで届く高さの足場(ジャンプ到達は約55〜60px)
    // 低段(地面から直接届く) y=GROUND_Y-44、中段は低段から跳んで届く位置に
    const lowY = GROUND_Y - 44;   // 388
    const midY = GROUND_Y - 92;   // 340: 低段の上から届く
    const plats = [
      { x: 40, y: lowY, w: 104 },
      { x: ARENA_W - 144, y: lowY, w: 104 },
      { x: ARENA_W / 2 - 52, y: midY, w: 104 }, // 中央上段(両脇の低段から跳んで届く)
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
    // 武器オーバーレイ(握り=下端を支点に回転)
    this.weapon = this.add.sprite(this.player.x, this.player.y, `${this.weaponKey}_0`)
      .setOrigin(0.5, 0.86).setDepth(11);
    this.refreshWeapon();
    this.physics.world.setBounds(0, -60, ARENA_W, WORLD_H + 60);
  }

  // 武器の見た目を現在のティアに合わせて更新
  private refreshWeapon() {
    if (!this.weapon) return;
    this.weapon.setTexture(`${this.weaponKey}_0`).setScale(this.weaponScale);
  }

  // 武器をプレイヤーの手元へ追従させ、攻撃時に振る
  private updateWeapon() {
    if (!this.weapon) return;
    const dir = this.facing;
    this.weapon.setFlipX(dir < 0);
    // 手元の位置(向きで左右反転)
    const hx = this.player.x + dir * 7;
    const hy = this.player.y + 6;
    this.weapon.setPosition(hx, hy);
    // 通常は穂先を上・前方へ傾けて構える。攻撃中は前方へ振り下ろす
    const swinging = this.time.now < this.weaponSwingUntil;
    const restAngle = dir * 18;       // 構え(やや前傾)
    const swingAngle = dir * 96;      // 振り下ろし
    const target = swinging ? swingAngle : restAngle;
    const cur = this.weapon.angle;
    this.weapon.setAngle(cur + (target - cur) * (swinging ? 0.5 : 0.25));
    this.weapon.setVisible(this.player.visible && this.time.now >= this.weaponHiddenUntil);
    this.weapon.setAlpha(this.player.alpha);
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
      difficulty: this.progress.difficulty,
      underLeveled: this.progress.level < this.er(this.floor),
      boss: null,
      skills: tier.skills.map((s) => ({ name: s.name, mp: this.skillMpCost(s), cdLeft: 0, cd: s.cd })),
      elixirCdLeft: 0,
      gameOver: false,
      infinite: this.infinite,
      infGauge: this.inf.gauge,
      infHp: this.inf.hp,
      infMax: gaugeMax(this.inf.gauge),
      infTotal: this.inf.total,
      infTimeLeft: INFINITE_TIME,
    };
  }

  // ============================================================
  // ステータス
  // ============================================================
  private maxHp(key: CharKey) {
    const b = this.buffs[key];
    const hpMul = this.time && this.time.now < b.until ? b.hp : 1; // ハイパーボディ等の最大HP上昇
    return Math.round(hpScale(CHARACTERS[key].maxhp, this.progress.level) * hpMul);
  }
  private maxMp(key: CharKey) { return mpScale(CHARACTERS[key].maxmp, this.progress.level); }
  private atk() {
    const buff = this.buffs[this.progress.charKey];
    const buffMul = this.time.now < buff.until ? buff.atk : 1;
    const sumMul = this.time.now < this.sumBuff.until ? this.sumBuff.atk : 1; // 召喚バフ
    return CHARACTERS[this.progress.charKey].atk * atkScale(this.progress.level) * this.jobTier.atkBonus * buffMul * sumMul;
  }
  private skillMpCost(s: SkillDef): number {
    return Math.max(1, Math.floor(this.maxMp(this.progress.charKey) * s.mp / 100));
  }
  private get charDef() { return CHARACTERS[this.progress.charKey]; }
  private get charState() { return this.progress.chars[this.progress.charKey]; }
  private get jobTier(): JobTier { return tierFor(this.charDef, this.progress.level); }
  private get spriteKey(): string { return this.jobTier.spriteKey; }
  // 現在の武器テクスチャキー(転職ティアに応じて1〜5)
  private get weaponKey(): string {
    const idx = tierIndexFor(this.charDef, this.progress.level) + 1;
    const p = this.progress.charKey === 'warrior' ? 'w' : this.progress.charKey === 'mage' ? 'm' : 't';
    return `weap_${p}${idx}`;
  }
  // 盗賊の手裏剣テクスチャ(転職ごとに 鉄→氷→雷→火→魔)
  private get shurikenTex(): string {
    return `fx_shuriken${tierIndexFor(this.charDef, this.progress.level) + 1}_0`;
  }
  // ティアが上がるほど武器を大きく表示
  private get weaponScale(): number {
    return 1.0 + tierIndexFor(this.charDef, this.progress.level) * 0.16;
  }
  // 現在の難易度での実効推奨レベル(敵の強さ基準)
  private er(f: FloorDef): number { return effReq(f, this.progress.difficulty); }

  // ============================================================
  // ボス
  // ============================================================
  private spawnBoss() {
    if (this.over) return;
    if (this.infinite) { this.spawnTitan(); return; }
    const f = this.floor;
    // 偶数層はボス2体(2体目はやや小さく・弱め)
    const twin = f.floor % 2 === 0;
    this.spawnOne(f, ARENA_W * 0.7, 1, 0);
    if (twin) this.spawnOne(f, ARENA_W * 0.42, 0.78, 350);

    this.cameras.main.shake(300, f.major ? 0.0035 : 0.0022);
    sfx('thunder');
    if (f.major) this.cameras.main.flash(300, 255, 120, 120);
  }

  // ボス1体を異次元の裂け目から出現させる
  private spawnOne(f: FloorDef, x: number, mul: number, delayMs: number) {
    const flying = f.archetype === 'demon' || f.archetype === 'beast';
    const y = flying ? GROUND_Y - 110 : GROUND_Y - 40;
    const b = this.physics.add.sprite(x, y, `boss_${f.archetype}_0`) as BossSprite;
    b.floor = f;
    b.flying = flying;
    b.atk = bossAtk(f, this.progress.difficulty) * (mul < 1 ? 0.85 : 1);
    b.maxhp = Math.floor(bossHp(f, this.progress.difficulty) * (mul < 1 ? 0.6 : 1));
    b.hp = b.maxhp;
    b.expMul = mul < 1 ? 0.5 : 1;
    b.lastHitAt = 0;
    b.aiTimer = 0;
    b.touchCd = 0;
    b.dir = -1;
    b.setScale(f.scale * mul);
    b.setTint(f.tint);
    b.play(`boss_${f.archetype}_move`);
    b.setDepth(8);
    b.setCollideWorldBounds(true);  // 巨大ボスが画面外に出ないように
    const bw = b.width * 0.6, bh = b.height * 0.75;
    b.setSize(bw, bh).setOffset((b.width - bw) / 2, b.height - bh);
    // 巨大ボスはスポーン位置が低いと地面をすり抜けて埋まるため、スケール確定後に下端を地面の上へ合わせる
    if (!flying) b.y = GROUND_Y - b.displayHeight / 2 - 6;
    if (flying) (b.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    else this.physics.add.collider(b, this.platforms);
    this.bosses.push(b);
    this.bossActive = true;

    this.riftAppear(b, delayMs, () => {
      const pattern = () => {
        if (!b.active || this.over) return;
        this.bossAction(b);
        const enraged = b.hp < b.maxhp * 0.5;
        // 攻撃間隔はやや余裕を持たせる(機敏すぎ防止)
        this.time.delayedCall(enraged ? 1900 : 2800, pattern);
      };
      this.time.delayedCall(1300, pattern);
    });
  }

  // 異次元の裂け目からボスが現れる演出
  private riftAppear(b: BossSprite, delayMs: number, onDone: () => void) {
    const fsx = b.scaleX, fsy = b.scaleY;
    const fullH = b.displayHeight;  // 縮小前に計算
    b.setAlpha(0);
    b.setScale(fsx * 0.2, fsy * 0.2);
    (b.body as Phaser.Physics.Arcade.Body).enable = false;
    this.time.delayedCall(delayMs, () => {
      if (!b.active || this.over) return;
      const bx = b.x, by = b.y;
      // 縦に裂ける次元の亀裂
      const rift = this.add.ellipse(bx, by, 4, 12, 0x0c0418, 0.95).setDepth(9).setStrokeStyle(2, 0xb86aff, 0.9);
      const glow = this.add.ellipse(bx, by, 8, 20, 0x7a3acc, 0.4).setDepth(8).setBlendMode(Phaser.BlendModes.ADD);
      sfx('portal');
      this.tweens.add({
        targets: rift, width: 34, height: fullH * 1.15, duration: 420, ease: 'Cubic.easeOut',
        onUpdate: () => rift.setSize(rift.width, rift.height),
      });
      this.tweens.add({
        targets: glow, width: 60, height: fullH * 1.4, duration: 420, ease: 'Cubic.easeOut',
        onUpdate: () => glow.setSize(glow.width, glow.height),
      });
      // 裂け目から紫の粒子が漏れる
      for (let i = 0; i < 8; i++) {
        const sp = this.add.rectangle(bx, by + Phaser.Math.Between(-20, 20), 2, 2, i % 2 ? 0xc84aff : 0x7a3acc, 1).setDepth(10);
        this.tweens.add({ targets: sp, x: bx + Phaser.Math.Between(-40, 40), y: sp.y + Phaser.Math.Between(-26, 26), alpha: 0, duration: 520, delay: i * 50, onComplete: () => sp.destroy() });
      }
      // ボス本体が裂け目から実体化
      this.time.delayedCall(380, () => {
        if (!b.active || this.over) { rift.destroy(); glow.destroy(); return; }
        this.tweens.add({ targets: b, alpha: 1, scaleX: fsx, scaleY: fsy, duration: 380, ease: 'Back.easeOut' });
        this.cameras.main.shake(120, 0.0015);
        sfx('thunder');
        this.time.delayedCall(380, () => {
          if (b.active) (b.body as Phaser.Physics.Arcade.Body).enable = true;
          // 裂け目が閉じる
          this.tweens.add({ targets: [rift, glow], scaleX: 0, alpha: 0, duration: 280, onComplete: () => { rift.destroy(); glow.destroy(); } });
          onDone();
        });
      });
    });
  }

  // 無限ボス: 巨大タイタンを設置(ゲージHP・攻撃は1ダメージ・ほぼ静止)
  private spawnTitan() {
    const f = this.floor;
    const x = ARENA_W * 0.66;
    const b = this.physics.add.sprite(x, GROUND_Y - 70, 'boss_titan_0') as BossSprite;
    b.floor = f;
    b.flying = false;
    b.atk = 1;            // 攻撃は固定1ダメージ
    b.maxhp = this.inf.hp;
    b.hp = this.inf.hp;
    b.lastHitAt = 0;
    b.aiTimer = 0;
    b.touchCd = 0;
    b.dir = -1;
    b.setScale(5.0);       // かなり大きめ
    b.setTint(0x8a3acc);
    b.play('boss_titan_move');
    b.setDepth(8);
    const bw = b.width * 0.5, bh = b.height * 0.8;
    b.setSize(bw, bh).setOffset((b.width - bw) / 2, b.height - bh);
    this.physics.add.collider(b, this.platforms);
    (b as BossSprite & { titan?: boolean }).stunUntil = 0;
    this.bosses = [b];
    this.bossActive = true;

    this.cameras.main.shake(260, 0.003);
    this.cameras.main.flash(360, 200, 120, 255);
    sfx('thunder');

    // ゆるい攻撃(1ダメージ・画面揺れほぼ無し)
    const pattern = () => {
      if (!b.active || this.over) return;
      this.titanAction(b);
      this.time.delayedCall(2400, pattern);
    };
    this.time.delayedCall(2000, pattern);
  }

  // タイタンのゆるい攻撃: 遅い弾を少し撒く(被弾しても1ダメージ・揺れ極小)
  private titanAction(b: BossSprite) {
    if (!b.active || this.over) return;
    const n = 3;
    const base = Math.atan2(this.player.y - b.y, this.player.x - b.x);
    for (let i = 0; i < n; i++) {
      const ang = base + (i - (n - 1) / 2) * 0.4;
      this.eShot(b, b.x, b.y - 10, 'fx_orb_0', Math.cos(ang) * 70, Math.sin(ang) * 70, 1.4, 4000);
    }
  }

  private bossAction(b: BossSprite) {
    if (!b.active || b.dying) return;
    if (b.frozenUntil && this.time.now < b.frozenUntil) return;
    if (b.stunUntil && this.time.now < b.stunUntil) return;
    const arch = b.floor.archetype;
    // アーキタイプ(キャラ性)ごとの攻撃プール(複数からランダム選択)
    const pools: Record<string, string[]> = {
      mush: ['slam', 'ring', 'spikes'],                   // キノコ: 跳ねて潰す・胞子をまく
      golem: ['slam', 'spikes', 'rain', 'volley'],        // 巨人: 叩きつけ・岩飛ばし
      demon: ['fan', 'homing', 'ring', 'dash'],           // 魔神: 火球弾幕・突進
      drake: ['fan', 'rain', 'beam', 'spiral'],           // 竜: ブレス・薙ぎ払い
      horntail: ['fan', 'rain', 'beam', 'spiral', 'ring'], // 双頭竜: 両頭からの猛弾幕
      beast: ['dash', 'fan', 'spikes', 'volley'],         // 猛獣: 急襲・爪連撃
      knight: ['dash', 'slam', 'volley', 'beam'],         // 騎士: 斬り込み・剣圧・突き
      witch: ['bolt', 'homing', 'spiral', 'rain'],        // 魔女: 呪詛弾・落雷・血の雨
      clown: ['ring', 'homing', 'orbBurst', 'spiral'],    // 道化: トランプ弾幕・いたずら弾
      lord: ['bolt', 'orbBurst', 'beam', 'homing', 'spiral'], // 魔導士: 落雷・弾幕・闇のビーム
    };
    let pool = pools[arch] ?? ['fan'];
    // 強敵(5層ボス)は怒り時に強力な弾幕(spiral)を多用
    if (b.floor.major && b.hp < b.maxhp * 0.5) pool = [...pool, 'spiral', 'ring'];
    const pick = pool[Phaser.Math.Between(0, pool.length - 1)];
    switch (pick) {
      case 'slam': this.atkSlam(b); break;
      case 'fan': this.atkFan(b, arch === 'demon' ? 'fx_fire_0' : 'fx_orb_0'); break;
      case 'dash': this.atkDash(b); break;
      case 'bolt': this.atkBolt(b); break;
      case 'ring': this.atkRing(b); break;
      case 'orbBurst': this.atkOrbBurst(b); break;
      case 'rain': this.atkRain(b); break;
      case 'spikes': this.atkSpikes(b); break;
      case 'homing': this.atkHoming(b); break;
      case 'beam': this.atkBeam(b); break;
      case 'spiral': this.atkSpiral(b); break;
      case 'volley': this.atkVolley(b); break;
    }
  }

  // 回転スパイラル弾(渦を巻く弾幕)
  private atkSpiral(b: BossSprite) {
    const arms = b.floor.major ? 3 : 2;
    const shots = 10;
    const tex = b.floor.archetype === 'demon' ? 'fx_fire_0' : 'fx_orb_0';
    for (let i = 0; i < shots; i++) {
      this.time.delayedCall(i * 70, () => {
        if (!b.active || this.over) return;
        for (let a = 0; a < arms; a++) {
          const ang = (i * 0.5) + (a / arms) * Math.PI * 2;
          this.eShot(b, b.x, b.y, tex, Math.cos(ang) * 100, Math.sin(ang) * 100, 1, 3200);
        }
        if (i % 3 === 0) sfx('fire');
      });
    }
  }

  // 狙い撃ち連射(素早い3連弾)
  private atkVolley(b: BossSprite) {
    const n = b.hp < b.maxhp * 0.5 ? 4 : 3;
    for (let i = 0; i < n; i++) {
      this.time.delayedCall(i * 110, () => {
        if (!b.active || this.over) return;
        const ang = Math.atan2(this.player.y - b.y, this.player.x - b.x);
        this.eShot(b, b.x, b.y, 'fx_star_0', Math.cos(ang) * 170, Math.sin(ang) * 170, 1.2, 2600);
        sfx('claw');
      });
    }
  }

  // 敵弾を生成
  private eShot(b: BossSprite, x: number, y: number, tex: string, vx: number, vy: number, scale = 1, life = 3500) {
    const s = this.enemyShots.create(x, y, tex) as Phaser.Physics.Arcade.Sprite;
    s.setVelocity(vx, vy).setTint(b.floor.tint).setDepth(9).setScale(scale);
    (s.body as Phaser.Physics.Arcade.Body).setCircle(4);
    if (vx !== 0 || vy !== 0) s.setRotation(Math.atan2(vy, vx));
    this.time.delayedCall(life, () => s.active && s.destroy());
    return s;
  }

  // 大ジャンプ → 着地衝撃波
  private atkSlam(b: BossSprite) {
    const toPlayer = Math.sign(this.player.x - b.x) || 1;
    const body = b.body as Phaser.Physics.Arcade.Body;
    if (b.flying || body.blocked.down) body.setVelocity(toPlayer * 130, -340);
    const land = this.time.addEvent({
      delay: 60, loop: true,
      callback: () => {
        if (!b.active || this.over) { land.remove(); return; }
        const bd = b.body as Phaser.Physics.Arcade.Body;
        if (bd.blocked.down && bd.velocity.y >= 0 && land.getOverallProgress() > 0.1) {
          land.remove();
          this.cameras.main.shake(140, 0.0015);
          sfx('thunder');
          this.shockwaveAt(b.x, b.atk, 56 * b.floor.scale);  // スケール1.5倍後も実効半径は維持
        }
      },
    });
  }

  // 扇状弾幕
  private atkFan(b: BossSprite, tex: string) {
    const enraged = b.hp < b.maxhp * 0.5;
    const n = enraged ? 5 : 3;
    const base = Math.atan2(this.player.y - b.y, this.player.x - b.x);
    for (let i = 0; i < n; i++) {
      const ang = base + (i - (n - 1) / 2) * 0.26;
      this.eShot(b, b.x, b.y, tex, Math.cos(ang) * 120, Math.sin(ang) * 120);
    }
    sfx('fire');
    if (!b.flying && (b.body as Phaser.Physics.Arcade.Body).blocked.down) b.setVelocity((Math.sign(this.player.x - b.x) || 1) * 100, -220);
  }

  // 全方位リング弾
  private atkRing(b: BossSprite) {
    const enraged = b.hp < b.maxhp * 0.5;
    const n = enraged ? 14 : 10;
    const off = Math.random() * Math.PI;
    for (let i = 0; i < n; i++) {
      const ang = off + (i / n) * Math.PI * 2;
      this.eShot(b, b.x, b.y, 'fx_orb_0', Math.cos(ang) * 95, Math.sin(ang) * 95);
    }
    const ring = this.add.circle(b.x, b.y, 6, b.floor.tint, 0.5).setDepth(8);
    this.tweens.add({ targets: ring, radius: 40, alpha: 0, duration: 350, onUpdate: () => ring.setRadius(ring.radius), onComplete: () => ring.destroy() });
    sfx('fire');
  }

  // 連続オーブ(プレイヤー狙い)
  private atkOrbBurst(b: BossSprite) {
    const enraged = b.hp < b.maxhp * 0.5;
    const n = enraged ? 6 : 4;
    for (let i = 0; i < n; i++) {
      this.time.delayedCall(i * 130, () => {
        if (!b.active || this.over) return;
        const ang = Math.atan2(this.player.y - b.y, this.player.x - b.x) + Phaser.Math.FloatBetween(-0.25, 0.25);
        this.eShot(b, b.x, b.y, 'fx_orb_0', Math.cos(ang) * 135, Math.sin(ang) * 135);
        sfx('claw');
      });
    }
  }

  // 急襲ダッシュ
  private atkDash(b: BossSprite) {
    const toPlayer = Math.sign(this.player.x - b.x) || 1;
    const body = b.body as Phaser.Physics.Arcade.Body;
    // 予兆(目を光らせる)
    b.setTintFill(0xffffff);
    this.time.delayedCall(180, () => { if (b.active) b.setTint(b.floor.tint); body.setVelocity(toPlayer * 265, b.flying ? 0 : -70); });
    this.time.delayedCall(640, () => b.active && body.setVelocityX(toPlayer * 60));
  }

  // 落雷(予兆 → 直撃)
  private atkBolt(b: BossSprite) {
    const enraged = b.hp < b.maxhp * 0.5;
    const targets = enraged ? [this.player.x, this.player.x + Phaser.Math.Between(-70, 70), this.player.x + Phaser.Math.Between(-70, 70)] : [this.player.x, this.player.x + Phaser.Math.Between(-50, 50)];
    targets.forEach((tx, i) => {
      this.time.delayedCall(i * 120, () => {
        const warn = this.add.rectangle(tx, GROUND_Y - 60, 20, 120, b.floor.tint, 0.22).setDepth(7);
        this.tweens.add({ targets: warn, alpha: 0.5, duration: 110, yoyo: true, repeat: 3 });
        this.time.delayedCall(640, () => {
          warn.destroy();
          if (this.over) return;
          const bolt = this.add.image(tx, GROUND_Y - 50, 'fx_bolt_0').setDepth(12).setScale(1.4, 4).setTint(b.floor.tint);
          sfx('thunder');
          this.cameras.main.shake(90, 0.0013);
          this.tweens.add({ targets: bolt, alpha: 0, duration: 300, onComplete: () => bolt.destroy() });
          if (Math.abs(this.player.x - tx) < 18 && this.player.y > GROUND_Y - 130) this.hurtPlayer(b.atk * 1.05);
        });
      });
    });
  }

  // 天から降る弾(エリアに雨)
  private atkRain(b: BossSprite) {
    const enraged = b.hp < b.maxhp * 0.5;
    const n = enraged ? 8 : 5;
    const cx = this.player.x;
    for (let i = 0; i < n; i++) {
      this.time.delayedCall(i * 90, () => {
        if (!b.active || this.over) return;
        const tx = cx + Phaser.Math.Between(-90, 90);
        this.eShot(b, tx, -10, b.floor.archetype === 'drake' || b.floor.archetype === 'horntail' ? 'fx_ice_0' : 'fx_fire_0', Phaser.Math.Between(-20, 20), 200, 1, 3000);
        sfx('fire');
      });
    }
  }

  // 地面から噴き出す棘(予兆あり・プレイヤー付近)
  private atkSpikes(b: BossSprite) {
    const enraged = b.hp < b.maxhp * 0.5;
    const n = enraged ? 5 : 3;
    let sx = this.player.x - (n * 22) / 2;
    for (let i = 0; i < n; i++) {
      const x = sx + i * 26 + Phaser.Math.Between(-4, 4);
      this.time.delayedCall(i * 110, () => {
        if (this.over) return;
        const warn = this.add.circle(x, GROUND_Y - 2, 10, b.floor.tint, 0.3).setDepth(7);
        this.tweens.add({ targets: warn, alpha: 0.6, duration: 100, yoyo: true, repeat: 2 });
        this.time.delayedCall(420, () => {
          warn.destroy();
          if (this.over) return;
          const spike = this.add.triangle(x, GROUND_Y, 0, 0, -10, 30, 10, 30, b.floor.tint).setDepth(11).setAlpha(0.95).setOrigin(0.5, 1);
          spike.setScale(1, 0);
          this.tweens.add({ targets: spike, scaleY: 1.6, duration: 120, yoyo: true, hold: 120, onComplete: () => spike.destroy() });
          sfx('hit');
          if (Math.abs(this.player.x - x) < 20 && this.player.y > GROUND_Y - 60) this.hurtPlayer(b.atk * 0.9);
        });
      });
    }
  }

  // 追尾オーブ(ゆっくり追う)
  private atkHoming(b: BossSprite) {
    const enraged = b.hp < b.maxhp * 0.5;
    const n = enraged ? 3 : 2;
    for (let i = 0; i < n; i++) {
      this.time.delayedCall(i * 200, () => {
        if (!b.active || this.over) return;
        const s = this.eShot(b, b.x, b.y, 'fx_orb_0', 0, 0, 1.1, 4000) as Phaser.Physics.Arcade.Sprite & { homing?: boolean };
        s.homing = true;
        sfx('claw');
      });
    }
  }

  // 横薙ぎビーム(予兆 → 発射)
  private atkBeam(b: BossSprite) {
    const dir = Math.sign(this.player.x - b.x) || 1;
    const y = b.y;
    const warn = this.add.rectangle(b.x + dir * 160, y, 320, 6, b.floor.tint, 0.25).setDepth(7).setOrigin(dir > 0 ? 0 : 1, 0.5);
    warn.setX(b.x);
    this.tweens.add({ targets: warn, alpha: 0.55, duration: 130, yoyo: true, repeat: 2 });
    this.time.delayedCall(560, () => {
      warn.destroy();
      if (this.over || !b.active) return;
      sfx('thunder');
      this.cameras.main.shake(120, 0.003);
      const beam = this.add.rectangle(b.x, y, 360, 16, b.floor.tint, 0.9).setDepth(12).setOrigin(dir > 0 ? 0 : 1, 0.5);
      this.tweens.add({ targets: beam, alpha: 0, scaleY: 2, duration: 280, onComplete: () => beam.destroy() });
      // ビームライン上にいれば被弾
      const onLine = Math.abs(this.player.y - y) < 18 && (dir > 0 ? this.player.x > b.x : this.player.x < b.x) && Math.abs(this.player.x - b.x) < 360;
      if (onLine) this.hurtPlayer(b.atk * 1.1);
    });
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
    if (now < this.inputLockUntil) return; // 行動不能中
    if (now < this.attackCdAt) return;
    this.attackCdAt = now + 360;
    this.playAttackAnim();
    if (this.progress.charKey === 'warrior') {
      sfx('slash');
      this.meleeFx();
      this.meleeHit(34, 1.0, 1);
    } else if (this.progress.charKey === 'thief') {
      sfx('claw');
      this.shoot(this.shurikenTex, 300, 1.0, false, 90, 1, 1, true);
      this.shadowThrows();
    } else {
      sfx('claw');
      this.clawFx();
      this.shoot('fx_claw_0', 220, 1.0, false, 90, 1, 1);
    }
  }

  doSkill(i: number) {
    if (this.over || this.transitioning) return;
    if (this.time.now < this.inputLockUntil) return; // 行動不能中
    if (this.time.now < this.castLockUntil) return;  // 他スキルの発動モーション中
    const skill = this.jobTier.skills[i];
    if (!skill) return;
    const now = this.time.now;
    if (now < this.skillCdAt[i]) return;
    const cost = this.skillMpCost(skill);
    if (this.charState.mp < cost) { sfx('denied'); this.hud()?.flashMp(); return; }
    this.charState.mp -= cost;
    // スペルブースター等のCT短縮を反映(自身はフル)
    const buff = this.buffs[this.progress.charKey];
    const cdMul = (skill.kind !== 'buff' && now < buff.until) ? buff.cd : 1;
    this.skillCdAt[i] = now + skill.cd * cdMul;
    if (skill.kind !== 'buff') this.playAttackAnim();
    this.skillNameFx(skill.name);

    // 各段階の主力(一番弱い=spammableな)スキル[0]はカッコいい専用効果音
    const primary = i === 0;
    switch (skill.kind) {
      case 'melee': this.skMelee(skill, primary); break;
      case 'aoe': this.skAoe(skill); break;
      case 'wave': this.skWave(skill); break;
      case 'rush': this.skRush(skill, now); break;
      case 'buff': this.skBuff(skill); break;
      case 'projectile': this.skProjectile(skill, primary); break;
      case 'thunder': this.skThunder(skill); break;
      case 'freeze': this.skFreeze(skill, primary); break;
      case 'meteor': this.skMeteor(skill, primary); break;
      case 'chain': this.skChain(skill); break;
      case 'nova': this.skNova(skill); break;
      case 'channel': this.skChannel(skill); break;
      case 'darkimpale': this.skDarkImpale(skill); break;
      case 'breath': this.skBreath(skill); break;
      case 'gungnir': this.skGungnir(skill); break;
      case 'summon': this.skSummon(skill); break;
      case 'shadow': this.skShadow(skill); break;
      case 'kunai': this.skKunai(skill); break;
      case 'darkcross': this.skDarkCross(skill); break;
      case 'heal': this.skHeal(skill); break;
    }
    // 発動モーションが終わるまで他スキルをロック
    this.castLockUntil = now + this.castLockFor(skill);
  }

  // スキル種別ごとの発動モーション時間(この間は他スキル使用不可)
  private castLockFor(s: SkillDef): number {
    switch (s.kind) {
      case 'buff': case 'heal': return 350;
      case 'summon': case 'shadow': return 450;
      case 'melee': case 'wave': case 'rush': case 'freeze': return 450;
      case 'aoe': case 'chain': return 500;
      case 'projectile': return (s.proj ?? 2) * 70 + 280;
      case 'thunder': return (s.targets ?? 1) * 70 + 350;
      case 'kunai': case 'darkimpale': return 600;
      case 'darkcross': return 800;
      case 'meteor': case 'nova': return 650;
      case 'gungnir': return 180 + s.hits * 70 + 120;
      case 'channel': return 400;  // ピアスサイクロンは常駐型: 回転中も他スキル使用可
      case 'breath': return s.durMs ?? 5000;
      default: return 450;
    }
  }

  // ピアスサイクロン: 5秒間うずを巻いて周囲に連続ダメージ(キーダウン継続)
  private channelUntil = 0;
  private skChannel(s: SkillDef) {
    const dur = s.durMs ?? 5000;
    const end = this.time.now + dur;
    this.channelUntil = end;
    sfx('cyclone');
    const radius = s.range ?? 80;
    // 鉾が水平にブンブン回るビジュアル(手持ち武器は隠して回転体に差し替え)
    this.weaponHiddenUntil = end;
    const spin = this.add.image(this.player.x, this.player.y - 4, `${this.weaponKey}_0`)
      .setDepth(12).setOrigin(0.5, 0.5).setScale(this.weaponScale * 1.25).setAngle(90);
    this.tweens.add({ targets: spin, angle: 90 + 360, duration: 260, repeat: -1 });
    // ダメージ&演出のティック(約140ms毎)
    let tick = 0;
    const ev = this.time.addEvent({
      delay: 140, loop: true,
      callback: () => {
        if (this.over || this.time.now >= end) { ev.remove(); spin.destroy(); this.weaponHiddenUntil = 0; return; }
        spin.setPosition(this.player.x, this.player.y - 4);
        if (tick % 3 === 0) sfx('cyclone');
        tick++;
        // 周囲の風の刃
        const ang = Math.random() * Math.PI * 2;
        const blade = this.add.image(this.player.x + Math.cos(ang) * radius * 0.7, this.player.y + Math.sin(ang) * radius * 0.7, 'fx_star_0')
          .setDepth(13).setScale(1.1).setTint(0xd8b0ff);
        this.tweens.add({ targets: blade, alpha: 0, scale: 0.3, duration: 220, onComplete: () => blade.destroy() });
        this.aoeDamage(this.player.x, this.player.y, radius, s.mult, s.hits, true); // 1段目に重ねる表示
      },
    });
    this.cameras.main.shake(120, 0.003);
  }

  // ダークインペール: 上から下へ振り下ろす黒×赤の闇斬撃(300%×6)
  private skDarkImpale(s: SkillDef) {
    sfx('slashpro');
    this.cameras.main.shake(180, 0.005);
    const dir = this.facing;
    const cx = this.player.x + dir * 30;
    const topY = this.player.y - 60;
    const botY = this.player.y + 18;
    // 闇のオーラを足元に展開
    const aura = this.add.ellipse(cx, this.player.y + 14, 90, 26, 0x16040c, 0.55).setDepth(8);
    this.tweens.add({ targets: aura, scaleX: 1.4, alpha: 0, duration: 420, onComplete: () => aura.destroy() });
    // 6本の振り下ろし斬撃を時間差で
    for (let k = 0; k < s.hits; k++) {
      this.time.delayedCall(k * 70, () => {
        const ox = dir * Phaser.Math.Between(-8, 30);
        // 黒い刃(縦長) + 赤いグロー
        const glow = this.add.rectangle(cx + ox, topY, 10, 0, 0xff2a3a, 0.9).setDepth(12).setOrigin(0.5, 0);
        const blade = this.add.rectangle(cx + ox, topY, 5, 0, 0x1a0010, 1).setDepth(13).setOrigin(0.5, 0);
        glow.setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: [glow, blade], height: botY - topY, duration: 110, ease: 'Quad.easeIn',
          onComplete: () => {
            // 着弾の飛沫
            for (let p = 0; p < 4; p++) {
              const sp = this.add.rectangle(cx + ox, botY, 3, 3, p % 2 ? 0xff2a3a : 0x2a0014, 1).setDepth(13);
              this.tweens.add({ targets: sp, x: sp.x + Phaser.Math.Between(-20, 20), y: sp.y + Phaser.Math.Between(-14, 4), alpha: 0, duration: 260, onComplete: () => sp.destroy() });
            }
            this.tweens.add({ targets: [glow, blade], alpha: 0, duration: 90, onComplete: () => { glow.destroy(); blade.destroy(); } });
          },
        });
        // 1段ごとにダメージ(複数体)
        this.meleeHit(s.range ?? 76, s.mult, 1, true);
      });
    }
    this.cameras.main.flash(120, 60, 0, 16);
  }

  // ダークシンセンス: 闇の大きな斜め十字が周囲に多発し、広範囲の敵(最大10体)を10回斬る
  private skDarkCross(s: SkillDef) {
    sfx('slashpro');
    this.cameras.main.shake(220, 0.004);
    this.cameras.main.flash(140, 70, 0, 90);
    const radius = s.radius ?? 190;
    const cx = this.player.x, cy = this.player.y - 6;
    // 周囲に大きな闇のXが次々と出現
    for (let k = 0; k < 7; k++) {
      this.time.delayedCall(k * 90, () => {
        if (this.over) return;
        const ox = cx + Phaser.Math.Between(-radius, radius) * 0.8;
        const oy = cy + Phaser.Math.Between(-60, 30);
        const sizeW = Phaser.Math.Between(56, 86);
        // 斜め十字(X): 黒い刃2本 + 紫紅のグロー2本
        for (const ang of [45, -45]) {
          const glow = this.add.rectangle(ox, oy, sizeW, 12, 0x9a2ae0, 0.55).setAngle(ang).setDepth(12).setBlendMode(Phaser.BlendModes.ADD).setScale(0.2);
          const blade = this.add.rectangle(ox, oy, sizeW, 5, 0x12041e, 1).setAngle(ang).setDepth(13).setScale(0.2);
          this.tweens.add({ targets: [glow, blade], scaleX: 1, scaleY: 1, duration: 110, ease: 'Back.easeOut' });
          this.tweens.add({ targets: [glow, blade], alpha: 0, duration: 240, delay: 170, onComplete: () => { glow.destroy(); blade.destroy(); } });
        }
        // 闇の粒子
        for (let q = 0; q < 3; q++) {
          const sp = this.add.rectangle(ox, oy, 3, 3, q % 2 ? 0xc84aff : 0x2a0a44, 1).setDepth(13);
          this.tweens.add({ targets: sp, x: ox + Phaser.Math.Between(-30, 30), y: oy + Phaser.Math.Between(-30, 30), alpha: 0, duration: 300, onComplete: () => sp.destroy() });
        }
        if (k % 3 === 0) sfx('slash');
      });
    }
    // 10回の多段(広範囲・最大10体=範囲内全員)
    for (let h = 0; h < s.hits; h++) {
      this.time.delayedCall(80 + h * 64, () => {
        if (this.over) return;
        this.aoeDamage(cx, cy, radius, s.mult, 1);
      });
    }
  }

  // フリージングブレス: キーダウン中(最大5秒)行動不能+完全無敵。前方の敵を多段攻撃し減速デバフ
  private skBreath(s: SkillDef) {
    const dur = s.durMs ?? 5000;
    const end = this.time.now + dur;
    this.inputLockUntil = end;            // 行動不能
    this.invulnUntil = end + 100;          // 完全無敵
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    sfx('cyclone');
    const dir = this.facing;
    const range = s.range ?? 200;
    // 氷ドラゴンの顔
    const head = this.add.sprite(this.player.x + dir * 26, this.player.y - 6, 'fx_icedragon_0')
      .setDepth(13).setScale(2.2).setFlipX(dir < 0).setAlpha(0.95);
    let tick = 0;
    const ev = this.time.addEvent({
      delay: 130, loop: true,
      callback: () => {
        if (this.over || this.time.now >= end) { ev.remove(); this.tweens.add({ targets: head, alpha: 0, duration: 200, onComplete: () => head.destroy() }); return; }
        head.setPosition(this.player.x + dir * 26, this.player.y - 6).setFlipX(dir < 0);
        if (tick % 3 === 0) sfx('cyclone');
        // 氷のブレス粒子
        const bx = this.player.x + dir * (40 + Math.random() * range * 0.7);
        const by = this.player.y - 6 + Phaser.Math.Between(-18, 18);
        const ice = this.add.image(bx, by, 'fx_ice_0').setDepth(12).setScale(Phaser.Math.FloatBetween(0.7, 1.3)).setAlpha(0.9).setTint(0xbfeaff);
        this.tweens.add({ targets: ice, x: bx + dir * 30, alpha: 0, duration: 260, onComplete: () => ice.destroy() });
        tick++;
        // 前方の敵に120%×4ヒット + 減速デバフ
        const b = this.boss;
        if (b && b.active && !b.dying) {
          const dx = b.x - this.player.x;
          if ((dir > 0 ? dx > -20 : dx < 20) && Math.abs(dx) < range && Math.abs(b.y - this.player.y) < 80) {
            this.hitEnemy(b, s.mult, s.hits, true);
            b.slowUntil = this.time.now + 3000; // 移動・攻撃速度半減(3秒)
            b.setTint(0x9ad8ff);
          }
        }
      },
    });
    // 自分を氷のオーラで包む(無敵表現)
    this.player.setTint(0x9ad8ff);
    this.time.delayedCall(dur, () => { if (!this.over) this.player.clearTint(); });
    this.cameras.main.shake(140, 0.003);
  }

  // グングニル: 神槍を投げ、最大HPに比例した致命的多段ダメージ。攻撃ごとにHP比ダメージが増加
  private skGungnir(s: SkillDef) {
    sfx('slashpro');
    this.cameras.main.shake(160, 0.004);
    this.cameras.main.flash(160, 220, 230, 255);
    const dir = this.facing;
    const maxhp = this.maxHp(this.progress.charKey);
    // 最大targets体(既定3)へ同時に神槍を放つ(複数体攻撃)
    const targets = this.aliveBosses().slice(0, s.targets ?? 3);
    if (!targets.length) {
      const spear = this.add.rectangle(this.player.x, this.player.y - 4, 30, 5, 0xdfeaff, 1).setDepth(13).setOrigin(0.5);
      this.tweens.add({ targets: spear, x: this.player.x + dir * 160, alpha: 0, duration: 220, onComplete: () => spear.destroy() });
      return;
    }
    for (const b of targets) {
      const spear = this.add.rectangle(this.player.x, this.player.y - 4, 30, 5, 0xdfeaff, 1).setDepth(13).setOrigin(0.5);
      this.tweens.add({ targets: spear, x: b.x, y: b.y - 4, duration: 180, onComplete: () => spear.destroy() });
      // 12回の多段。攻撃ごとに最大HPの110%ぶんダメージ加算
      for (let k = 0; k < s.hits; k++) {
        this.time.delayedCall(180 + k * 70, () => {
          if (!b.active || b.dying) return;
          const bonus = Math.floor(maxhp * 1.1 * (k + 1)); // 攻撃ごとに増加
          this.boltFx(b.x + Phaser.Math.Between(-12, 12), b.y, 1.2);
          this.hitEnemy(b, s.mult, 1, false, bonus);
        });
      }
    }
  }

  // シャドーパートナー: 自分の後ろに分身を呼び出す(本体の攻撃を反復)
  private skShadow(s: SkillDef) {
    sfx('portal');
    const count = s.targets ?? 1;
    this.clearShadows();
    this.shadowUntil = this.time.now + (s.durMs ?? 30000);
    for (let i = 0; i < count; i++) {
      const spr = this.add.sprite(this.player.x - this.facing * 10 * (i + 1), this.player.y, `${this.spriteKey}_0`)
        .setDepth(9 - i * 0.1)
        .setAlpha(0)
        .setTintFill(0x2a1a4a);
      this.shadowSprites.push(spr);
      this.tweens.add({ targets: spr, alpha: 0.55 - i * 0.06, duration: 300, delay: i * 90 });
    }
    // 召喚演出: 闇のリング
    const ring = this.add.circle(this.player.x, this.player.y, 10, 0x7a3acc, 0.55).setDepth(12);
    this.tweens.add({ targets: ring, radius: 40, alpha: 0, duration: 480, onUpdate: () => ring.setRadius(ring.radius), onComplete: () => ring.destroy() });
    this.floatText(this.player.x, this.player.y - 50, `シャドーパートナー×${count}!`, '#c8a4ff');
  }

  private clearShadows() {
    for (const s of this.shadowSprites) s.destroy();
    this.shadowSprites = [];
    this.shadowUntil = 0;
  }

  // 分身: 本体の少し後ろを追従し、姿勢(テクスチャ/向き)をコピー
  private updateShadows() {
    if (!this.shadowSprites.length) return;
    if (this.time.now >= this.shadowUntil) {
      for (const s of this.shadowSprites) this.tweens.add({ targets: s, alpha: 0, duration: 300, onComplete: () => s.destroy() });
      this.shadowSprites = [];
      return;
    }
    this.shadowSprites.forEach((s, i) => {
      const tx = this.player.x - this.facing * 11 * (i + 1);
      const ty = this.player.y;
      s.x += (tx - s.x) * 0.25;
      s.y += (ty - s.y) * 0.5;
      s.setTexture(this.player.texture.key);
      s.setFlipX(this.player.flipX);
      s.setVisible(this.player.visible);
    });
  }

  // 分身の攻撃力倍率: 50%から1体増えるごとに-10%(2体40%/3体30%/4体20%)
  private shadowMul(): number {
    return Math.max(0.1, 0.5 - (this.shadowSprites.length - 1) * 0.1);
  }

  // 分身の投擲(見た目): 1体につき1枚だけ薄めに描画(負荷を抑えつつ賑やかさを残す)
  private shadowThrows() {
    if (!this.shadowSprites.length || this.time.now >= this.shadowUntil) return;
    this.shadowSprites.forEach((sp, i) => {
      this.time.delayedCall(100 + i * 70, () => {
        if (this.over || !sp.active) return;
        const img = this.add.image(sp.x + this.facing * 8, sp.y - 4, this.shurikenTex)
          .setDepth(10).setScale(0.85).setAlpha(0.45).setTint(0xb09ae0);
        this.tweens.add({ targets: img, x: img.x + this.facing * 210, angle: this.facing * 720, alpha: 0, duration: 620, onComplete: () => img.destroy() });
      });
    });
  }

  // 巨大クナイ: 巨大なクナイを投げ、闇の大爆発で複数体を同時攻撃
  private skKunai(s: SkillDef) {
    sfx('slashpro');
    const dir = this.facing;
    const target = this.boss;
    const tx = target && target.active ? target.x : this.player.x + dir * 170;
    const ty = target && target.active ? target.y : this.player.y - 6;
    const kunai = this.add.image(this.player.x + dir * 14, this.player.y - 6, 'fx_kunai_0')
      .setDepth(13).setScale(2.0).setFlipX(dir < 0);
    this.tweens.add({ targets: kunai, scale: 2.4, duration: 120, yoyo: true });
    this.tweens.add({
      targets: kunai, x: tx, y: ty, duration: 230, ease: 'Quad.easeIn',
      onComplete: () => {
        kunai.destroy();
        if (this.over) return;
        // 非常に大きな闇の爆発
        sfx('thunder');
        this.cameras.main.shake(150, 0.0028);
        const radius = s.radius ?? 115;
        const core = this.add.circle(tx, ty, 14, 0x12041e, 0.95).setDepth(12);
        const ring1 = this.add.circle(tx, ty, 16, 0x7a3acc, 0.7).setDepth(12);
        const ring2 = this.add.circle(tx, ty, 10, 0xc84aff, 0.6).setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: core, radius: radius * 0.92, alpha: 0, duration: 440, onUpdate: () => core.setRadius(core.radius), onComplete: () => core.destroy() });
        this.tweens.add({ targets: ring1, radius: radius, alpha: 0, duration: 500, onUpdate: () => ring1.setRadius(ring1.radius), onComplete: () => ring1.destroy() });
        this.tweens.add({ targets: ring2, radius: radius * 0.72, alpha: 0, duration: 400, onUpdate: () => ring2.setRadius(ring2.radius), onComplete: () => ring2.destroy() });
        for (let q = 0; q < 12; q++) {
          const a = Math.random() * Math.PI * 2, r = radius * (0.3 + Math.random() * 0.65);
          const sp = this.add.rectangle(tx, ty, 3, 3, q % 2 ? 0xc84aff : 0x2a0a44, 1).setDepth(13);
          this.tweens.add({ targets: sp, x: tx + Math.cos(a) * r, y: ty + Math.sin(a) * r, alpha: 0, duration: 440, onComplete: () => sp.destroy() });
        }
        this.aoeDamage(tx, ty, radius, s.mult, s.hits);
      },
    });
    this.shadowThrows();
  }

  // 召喚: エルクィネス(氷の鳥) / ダークスピリット(黒い魂)
  private skSummon(s: SkillDef) {
    sfx('portal');
    const isBird = s.name.includes('エルクィネス');
    const key = isBird ? 'elquines' : 'darkspirit';
    // 既存の同種召喚は作り直す
    const prev = this.summons[key];
    if (prev) { prev.ev.remove(); prev.sprite.destroy(); }
    const tex = isBird ? 'fx_elquines_0' : 'fx_darkspirit_0';
    const anim = isBird ? 'fx_elquines_fly' : 'fx_darkspirit_idle';
    const spr = this.add.sprite(this.player.x, this.player.y - 40, tex).setDepth(14).setScale(isBird ? 1.6 : 1.5);
    spr.play(anim);
    const endAt = this.time.now + (s.durMs ?? 20000);
    // 召喚演出
    const ring = this.add.circle(this.player.x, this.player.y - 40, 8, isBird ? 0x9ad8ff : 0x9a5ad8, 0.6).setDepth(13);
    this.tweens.add({ targets: ring, radius: 34, alpha: 0, duration: 450, onUpdate: () => ring.setRadius(ring.radius), onComplete: () => ring.destroy() });
    this.floatText(this.player.x, this.player.y - 56, isBird ? 'エルクィネス召喚!' : 'ダークスピリット召喚!', isBird ? '#9ad8ff' : '#c8a4ff');

    const ev = this.time.addEvent({
      delay: isBird ? 2000 : 2400, loop: true,
      callback: () => {
        if (this.over) return;
        if (isBird) this.elquinesAct(spr, s);
        else this.darkSpiritAct(spr, s);
      },
    });
    this.summons[key] = { sprite: spr, endAt, ev };
  }

  private elquinesAct(spr: Phaser.GameObjects.Sprite, s: SkillDef) {
    const b = this.boss;
    if (!b || !b.active || b.dying) return;
    // ボスへ舞い降りて150%×3ヒット
    this.tweens.add({ targets: spr, x: b.x, y: b.y - 10, duration: 350, yoyo: true, hold: 200, ease: 'Sine.easeInOut' });
    for (let k = 0; k < 3; k++) {
      this.time.delayedCall(380 + k * 110, () => {
        if (!b.active) return;
        const ice = this.add.image(b.x + Phaser.Math.Between(-14, 14), b.y - 6, 'fx_ice_0').setDepth(13).setScale(1.2).setTint(0x9ad8ff);
        this.tweens.add({ targets: ice, alpha: 0, scale: 0.4, duration: 220, onComplete: () => ice.destroy() });
        this.hitEnemy(b, s.mult, 1);
      });
    }
    sfx('fire');
  }

  private darkSpiritAct(spr: Phaser.GameObjects.Sprite, s: SkillDef) {
    const roll = Phaser.Math.Between(0, 3);
    if (roll === 0) {
      // 多段攻撃
      const b = this.boss;
      if (b && b.active && !b.dying) {
        this.tweens.add({ targets: spr, x: b.x, y: b.y, duration: 300, yoyo: true, hold: 150 });
        for (let k = 0; k < s.hits; k++) {
          this.time.delayedCall(320 + k * 100, () => { if (b.active) { this.boltFx(b.x, b.y, 1); this.hitEnemy(b, s.mult, 1); } });
        }
      }
      sfx('claw');
    } else if (roll === 1) {
      // 回復
      const max = this.maxHp(this.progress.charKey);
      const heal = Math.floor(max * 0.18);
      this.charState.hp = Math.min(max, this.charState.hp + heal);
      this.floatText(this.player.x, this.player.y - 26, `+${fmt(heal)}`, '#6ae45a');
      const fx = this.add.sprite(this.player.x, this.player.y - 8, 'fx_heal_0').setDepth(13).setScale(1.2);
      fx.play('fx_heal_play'); this.tweens.add({ targets: fx, y: fx.y - 16, alpha: 0, duration: 700, onComplete: () => fx.destroy() });
      sfx('heal');
    } else {
      // 攻撃力/防御力/クリティカルのいずれか +30% を5秒
      const kind = Phaser.Math.Between(0, 2);
      this.sumBuff.until = this.time.now + 5000;
      this.sumBuff.atk = kind === 0 ? 1.3 : 1;
      this.sumBuff.def = kind === 1 ? 0.7 : 1;
      this.sumBuff.crit = kind === 2 ? 0.3 : 0;
      const label = kind === 0 ? '攻撃力+30%' : kind === 1 ? '防御力+30%' : 'クリティカル+30%';
      const color = kind === 0 ? '#ff7a3a' : kind === 1 ? '#6ab0ff' : '#ffd24a';
      this.floatText(this.player.x, this.player.y - 30, label, color);
      const aura = this.add.circle(this.player.x, this.player.y, 8, Phaser.Display.Color.HexStringToColor(color).color, 0.5).setDepth(9);
      this.tweens.add({ targets: aura, radius: 28, alpha: 0, duration: 480, onUpdate: () => aura.setRadius(aura.radius), onComplete: () => aura.destroy() });
      sfx('select');
    }
  }

  // ---- スキル実装 ----
  private skMelee(s: SkillDef, primary = false) {
    sfx(primary ? 'slashpro' : 'slash');
    const power = s.hits >= 5;
    this.meleeFx(1.2 + s.hits * 0.12);
    // 多段ぶんの槍/剣閃が前方へ連続して走る独創エフェクト
    const range = s.range ?? 36;
    for (let k = 0; k < s.hits; k++) {
      this.time.delayedCall(k * 55, () => {
        if (this.over) return;
        const off = 10 + (k / Math.max(1, s.hits - 1)) * (range * 0.9);
        const yj = Phaser.Math.Between(-10, 10);
        const tint = power ? 0xc89aff : 0xffe9b0;
        const blade = this.add.rectangle(this.player.x + this.facing * off, this.player.y - 2 + yj, 26, 4, tint, 0.95)
          .setDepth(12).setOrigin(this.facing > 0 ? 0 : 1, 0.5);
        this.tweens.add({ targets: blade, scaleX: 1.8, alpha: 0, x: blade.x + this.facing * 16, duration: 200, onComplete: () => blade.destroy() });
        const tip = this.add.image(this.player.x + this.facing * (off + 18), this.player.y - 2 + yj, 'fx_star_0').setDepth(13).setScale(0.8).setTint(tint);
        this.tweens.add({ targets: tip, scale: 0.2, alpha: 0, duration: 180, onComplete: () => tip.destroy() });
      });
    }
    if (power) {
      const arc = this.add.sprite(this.player.x + this.facing * 22, this.player.y - 2, 'fx_slash_0')
        .setDepth(12).setFlipX(this.facing < 0).setScale(2.6).setTint(0xb89aff).setAlpha(0.85);
      arc.play('fx_slash_play');
      arc.once('animationcomplete', () => arc.destroy());
      this.cameras.main.shake(70, 0.0025);
    }
    this.meleeHit(range, s.mult, s.hits, !!s.multi);
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
    const key = this.progress.charKey;
    const buff = this.buffs[key];
    buff.until = this.time.now + (s.durMs ?? 8000);
    buff.atk = s.atkBuff ?? 1;
    buff.def = s.defCut ?? 1;
    buff.hp = s.hpBuff ?? 1;
    buff.cd = s.cdCut ?? 1;
    buff.name = s.name;
    // スキル名・種類に応じた効果文と色
    let label = '強化!';
    let color = 0x6ab0ff;
    if (s.hpBuff && s.hpBuff > 1) {
      label = `最大HP ${Math.round((s.hpBuff - 1) * 100)}% UP!`;
      color = 0x6ae45a;
      this.charState.hp = this.maxHp(key); // 増えた最大HPぶん即回復
    } else if (s.cdCut && s.cdCut < 1) {
      label = `スキルCT ${Math.round((1 - s.cdCut) * 100)}% 短縮!`;
      color = 0xc8a4ff;
    } else if (s.atkBuff && s.atkBuff > 1) {
      label = `攻撃力 ${Math.round((s.atkBuff - 1) * 100)}% UP!`;
      color = 0xff7a3a;
    } else if (s.defCut && s.defCut < 1) {
      label = `被ダメージ ${Math.round((1 - s.defCut) * 100)}% 軽減!`;
      color = 0x6ab0ff;
    }
    const aura = this.add.circle(this.player.x, this.player.y, 8, color, 0.5).setDepth(9);
    this.tweens.add({ targets: aura, radius: 30, alpha: 0, duration: 520, onUpdate: () => aura.setRadius(aura.radius), onComplete: () => aura.destroy() });
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * Math.PI * 2;
      const p = this.add.image(this.player.x + Math.cos(ang) * 22, this.player.y + 14, 'fx_star_0').setDepth(14).setScale(1.1).setTint(color);
      this.tweens.add({ targets: p, y: this.player.y - 26, alpha: 0, duration: 640, delay: k * 35, onComplete: () => p.destroy() });
    }
    this.player.setTint(color);
    this.time.delayedCall(320, () => !this.over && this.player.clearTint());
    this.floatText(this.player.x, this.player.y - 32, label, Phaser.Display.Color.IntegerToColor(color).rgba);
  }

  private skProjectile(s: SkillDef, primary = false) {
    if (this.progress.charKey === 'thief') {
      // 手裏剣投擲: スキル名どおりの本数(proj)を縦に並べて連投(回転付き)
      sfx(primary ? 'slashpro' : 'claw');
      const throws = s.proj ?? Math.min(4, Math.max(1, Math.ceil(s.hits / 2)));
      const hitsPer = Math.max(1, Math.round(s.hits / throws));
      for (let k = 0; k < throws; k++) {
        this.time.delayedCall(k * 70, () => {
          if (this.over) return;
          const yOff = (k - (throws - 1) / 2) * 8;
          this.shoot(this.shurikenTex, s.speed ?? 300, s.mult, s.pierce ?? false, 280, 0.95, hitsPer, true, yOff);
        });
      }
      this.shadowThrows();  // 影は1体1枚だけ
      return;
    }
    sfx(primary ? 'magicpro' : 'fire');
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

  private skFreeze(s: SkillDef, primary = false) {
    sfx(primary ? 'magicpro' : 'thunder');
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
    const inRange = this.aliveBosses().filter((b) => Phaser.Math.Distance.Between(cx, cy, b.x, b.y) < radius + b.displayWidth / 3);
    if (!s.multi && inRange.length > 1) {
      inRange.sort((a, b2) => Math.abs(a.x - this.player.x) - Math.abs(b2.x - this.player.x));
      inRange.length = 1;  // 単体スキルは最寄りのみ
    }
    for (const b of inRange) {
      this.hitEnemy(b, s.mult, s.hits);
      b.frozenUntil = this.time.now + (s.durMs ?? 2000);
      if (!b.flying && b.body) b.setVelocity(0, 0);
    }
  }

  private skChain(s: SkillDef) {
    sfx('thunder');
    this.cameras.main.flash(140, 180, 220, 255);
    // 名前どおりの連鎖雷: 範囲内の敵(最大targets体)へ次々にバウンドする
    const inRange = this.aliveBosses().filter((b) => Math.abs(b.x - this.player.x) < (s.range ?? 160));
    if (!inRange.length) {
      this.boltFx(this.player.x + this.facing * 30, this.player.y);
      return;
    }
    let px = this.player.x, py = this.player.y - 6;
    for (let k = 0; k < (s.targets ?? 8); k++) {
      const b = inRange[k % inRange.length];  // 敵が少なければ同じ敵に再バウンド
      this.time.delayedCall(k * 60, () => {
        if (!b.active || b.dying) return;
        const tx = b.x + Phaser.Math.Between(-12, 12), ty = b.y + Phaser.Math.Between(-12, 12);
        this.lightningLink(px, py, tx, ty);
        px = tx; py = ty;
        this.boltFx(tx, ty, 1.4);
        this.hitEnemy(b, s.mult, s.hits);
      });
    }
  }

  private skMeteor(s: SkillDef, primary = false) {
    sfx(primary ? 'magicpro' : 'fire');
    this.cameras.main.shake(130, 0.0035);
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
    this.cameras.main.shake(200, 0.0035);
    const cam = this.cameras.main;
    const left = cam.scrollX, right = cam.scrollX + cam.width / cam.zoom;
    // 自分から放射状に走る光線(独創的なバースト)
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2;
      const ray = this.add.rectangle(this.player.x, this.player.y, 60, 4, 0xffffff, 0.8).setDepth(13).setOrigin(0, 0.5).setRotation(ang);
      this.tweens.add({ targets: ray, scaleX: 2.4, alpha: 0, duration: 320, onComplete: () => ray.destroy() });
    }
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
  private aoeDamage(x: number, y: number, radius: number, mult: number, hits: number, flat = false) {
    for (const b of this.aliveBosses()) {
      if (Phaser.Math.Distance.Between(x, y, b.x, b.y) < radius + b.displayWidth / 3) {
        this.hitEnemy(b, mult, hits, flat);
      }
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
    if (this.time.now < this.elixirCdUntil) { sfx('denied'); return; }
    if (this.progress.elixirs <= 0) { sfx('denied'); return; }
    this.progress.elixirs--;
    this.elixirCdUntil = this.time.now + 6000; // クールタイム6秒
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

  // ============================================================
  // 攻撃判定
  // ============================================================
  private playAttackAnim() {
    const key = this.spriteKey;
    this.player.play(`${key}_attack`, true);
    this.weaponSwingUntil = this.time.now + 160;  // 武器を前方へ振る
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

  private meleeHit(range: number, mult: number, hits: number, all = false) {
    const candidates = this.aliveBosses().filter((b) => {
      const dx = b.x - this.player.x;
      const inFront = Math.sign(dx) === this.facing || Math.abs(dx) < 14;
      return inFront && Math.abs(dx) < range + b.displayWidth / 2.5 && Math.abs(b.y - this.player.y) < 40 + b.displayHeight / 3;
    });
    if (all) {
      for (const b of candidates) this.hitEnemy(b, mult, hits);
    } else if (candidates.length) {
      // 単体スキル: 最も近い1体のみ
      candidates.sort((a, b2) => Math.abs(a.x - this.player.x) - Math.abs(b2.x - this.player.x));
      this.hitEnemy(candidates[0], mult, hits);
    }
  }

  private shoot(tex: string, speed: number, mult: number, pierce: boolean, rangeMs: number, scale: number, hits: number, spin = false, yOff = 0) {
    const shot = this.playerShots.create(
      this.player.x + this.facing * 10, this.player.y - 4 + yOff, tex
    ) as Phaser.Physics.Arcade.Sprite & { mult: number; pierce: boolean; hits: number; hitSet: Set<BossSprite> };
    shot.setVelocityX(this.facing * speed);
    shot.setFlipX(this.facing < 0);
    shot.setDepth(11);
    shot.setScale(scale);
    if (spin) (shot.body as Phaser.Physics.Arcade.Body).setAngularVelocity(this.facing * 720);  // 手裏剣回転
    shot.mult = mult; shot.pierce = pierce; shot.hits = hits; shot.hitSet = new Set();
    this.time.delayedCall(rangeMs * 4, () => shot.active && shot.destroy());
  }

  // 多段ヒット + MISS判定 + レベル差補正
  private hitEnemy(e: BossSprite, mult: number, hits: number, flat = false, bonusDmg = 0, shadowEcho = true) {
    if (!e.active || e.dying) return;
    // シャドーパートナー: 分身が本体の攻撃を反復(体数ぶん追撃)
    if (shadowEcho && this.shadowSprites.length > 0 && this.time.now < this.shadowUntil) {
      const sm = this.shadowMul();
      this.shadowSprites.forEach((spr, c) => {
        this.time.delayedCall(110 + c * 70, () => {
          if (!e.active || e.dying || this.over) return;
          this.hitEnemy(e, mult * sm, hits, flat, 0, false);
          // 分身が一瞬前へ踏み込む演出
          this.tweens.add({ targets: spr, x: spr.x + this.facing * 8, duration: 80, yoyo: true });
        });
      });
    }
    // 無限ボス: MISSなし・格上補正なし(自分の素の火力を計測)
    const hitChance = this.infinite ? 1 : playerHitChance(this.progress.level, this.er(e.floor));
    const dmgScale = this.infinite ? 1 : playerDamageScale(this.progress.level, this.er(e.floor));
    for (let i = 0; i < Math.max(1, hits); i++) {
      this.time.delayedCall(i * 75, () => {
        if (!e.active || e.dying) return;
        if (Math.random() > hitChance) { this.missNumber(e); return; }
        // 召喚獣のクリティカルバフを加算
        const critP = critRate(this.progress.level) + (this.time.now < this.sumBuff.until ? this.sumBuff.crit : 0);
        const crit = Math.random() < critP;
        const frozen = e.frozenUntil && this.time.now < e.frozenUntil ? 1.3 : 1;
        const dmg = Math.max(1, Math.floor(
          this.atk() * mult * dmgScale * Phaser.Math.FloatBetween(0.92, 1.08) * (crit ? critMul(this.progress.level) : 1) * frozen + bonusDmg
        ));
        e.lastHitAt = this.time.now;
        sfx(crit ? 'crit' : 'hit');
        this.damageNumber(e, dmg, crit, flat);
        const star = this.add.image(e.x, e.y - 6, 'fx_star_0').setDepth(13).setScale(crit ? 1.6 : 1.0);
        this.tweens.add({ targets: star, alpha: 0, scale: 0.3, angle: 90, duration: 240, onComplete: () => star.destroy() });
        e.setTintFill(crit ? 0xc8b070 : 0xb0acc0);  // 落ち着いた明るさ(眩しさ軽減)
        const titanTint = this.infinite ? 0x8a3acc : e.floor.tint;
        const frozenNow = e.frozenUntil && this.time.now < e.frozenUntil;
        this.time.delayedCall(70, () => e.active && (frozenNow ? e.setTint(0x9ad8ff) : e.setTint(titanTint)));

        if (this.infinite) {
          this.applyInfiniteDamage(e, dmg);
        } else {
          e.hp -= dmg;
          if (e.hp <= 0) this.killBoss(e);
        }
      });
    }
  }

  // 無限ボス: 累積ダメージとゲージ進行(ゲージを超えた分は次段階へ持ち越し、必要なら一気に飛ばす)
  private applyInfiniteDamage(e: BossSprite, dmg: number) {
    this.inf.total += dmg;
    this.inf.maxHit = Math.max(this.inf.maxHit, dmg);
    let d = dmg;
    let broke = false;
    // 残HPを超えるダメージはゲージを割って次段階へ
    while (d >= this.inf.hp && this.inf.gauge < 1000) {
      d -= this.inf.hp;
      this.inf.gauge += 1;
      this.inf.hp = gaugeMax(this.inf.gauge);
      broke = true;
    }
    this.inf.hp -= d;
    e.hp = this.inf.hp;
    e.maxhp = gaugeMax(this.inf.gauge);
    if (broke) {
      // ゲージ突破の演出
      this.cameras.main.flash(120, 255, 200, 120);
      const t = this.add.text(e.x, e.y - e.displayHeight / 2 - 24, `${this.inf.gauge} ゲージ目!`, {
        fontFamily: '"Arial Black", sans-serif', fontSize: '12px', color: '#ffd24a', stroke: '#7a2a2a', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(22).setResolution(4);
      this.tweens.add({ targets: t, y: t.y - 20, alpha: 0, duration: 900, onComplete: () => t.destroy() });
    }
  }

  private damageNumber(e: BossSprite, dmg: number, crit: boolean, flat = false) {
    const now = this.time.now;
    if (e.dmgStackAt && now - e.dmgStackAt < 520) e.dmgStackN = (e.dmgStackN ?? 0) + 1;
    else e.dmgStackN = 0;
    e.dmgStackAt = now;
    // 通常: 6段まで積み、それ以上は1段目から再スタート(重なってOK)
    // キーダウン系(flat): 常に1段目に新しいダメージを重ねる
    const stack = flat ? 0 : (e.dmgStackN ?? 0) % 6;
    const x = e.x + (flat ? Phaser.Math.Between(-7, 7) : (stack % 2 === 0 ? -1 : 1) * Math.min(8, stack * 2));
    const baseY = e.y - e.displayHeight / 2 - 8;
    const y = baseY - stack * 12;
    // 事前生成したビットマップ数字(黒枠+白枠+グラデーション)をImage合成のみで表示(軽量)
    const str = String(Math.round(dmg));  // カンマ区切りなし
    const c = this.add.container(x, y).setDepth(21);
    const key = crit ? 'dmgfont_c' : 'dmgfont_n';
    const SCALE = 0.25;          // 4倍解像度で焼いてあるため縮小
    const OVERLAP = 3.5;         // 文字ごとのストローク余白ぶん詰める(表示px)。数字が読めるよう控えめに
    const tex = this.textures.get(key);
    const chars = [...str];
    const ws = chars.map((ch) => tex.get(ch === ',' ? 'comma' : ch).width * SCALE);
    const total = ws.reduce((a, b) => a + b, 0) - OVERLAP * (chars.length - 1);
    let cx2 = -total / 2;
    chars.forEach((ch, i) => {
      const img = this.add.image(cx2, 0, key, ch === ',' ? 'comma' : ch).setOrigin(0, 0.5).setScale(SCALE);
      c.add(img);
      cx2 += ws[i] - OVERLAP;
    });
    // クリティカル: 数字の左に薄黄色の爆発エフェクト
    if (crit) {
      const burst = this.add.image(-total / 2 - 4, 0, 'fx_star_0').setTint(0xfff2b0).setAlpha(0.95).setScale(0.7);
      c.add(burst);
      this.tweens.add({ targets: burst, scale: 1.7, alpha: 0, angle: 50, duration: 330, ease: 'Cubic.easeOut' });
    }
    c.setScale(0.4);
    this.tweens.add({ targets: c, scale: crit ? 1.1 : 1, duration: 130, ease: 'Back.easeOut' });
    // flatは短めに消えて次々重なる
    const fade = flat ? 520 : 900;
    this.tweens.add({ targets: c, y: y - 14, alpha: 0, duration: fade, delay: flat ? 60 : 200, ease: 'Quad.easeOut', onComplete: () => c.destroy() });
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
    sfx('bossdie');
    this.gainExp(Math.floor(bossExp(e.floor, this.progress.difficulty) * (e.expMul ?? 1)));
    const remain = this.bosses.some((x) => x !== e && x.active && !x.dying);
    this.bossActive = remain;
    this.cameras.main.shake(320, 0.004);
    this.cameras.main.flash(400, 255, 255, 255);
    this.tweens.add({
      targets: e, alpha: 0, y: e.y - 14, scaleX: e.scaleX * 1.1, scaleY: e.scaleY * 1.1, duration: 900,
      onComplete: () => e.destroy(),
    });
    // 残りのボスがいる間はポータルを開かない(偶数層は2体)
    if (remain) {
      this.hud()?.showBanner(`${e.floor.bossName} 1体撃破! 残り1体!`, '#ffe45a');
      return;
    }
    // ステージクリアでエリクサーを5個支給
    this.progress.elixirs = Math.min(this.progress.elixirs + 5, ELIXIR_MAX);
    this.floatText(this.player.x, this.player.y - 44, 'エリクサー +5', '#ffd24a');
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
    save.level = this.progress.level;
    save.exp = this.progress.exp;
    save.charKey = this.progress.charKey;
    save.clears = (save.clears || 0) + 1;
    const d = this.progress.difficulty;
    save.highestByDiff[d] = TOTAL_FLOORS;
    save.clearedByDiff[d] = true; // 次の難易度を解放
    writeSave(save);
    const time = Math.floor((Date.now() - this.progress.startTime) / 1000);
    const unlocked = d + 1 < DIFFICULTIES.length ? DIFFICULTIES[d + 1].name : null;
    this.hud()?.showClear({ level: this.progress.level, time, difficulty: DIFFICULTIES[d].name, unlockedNext: unlocked });
  }

  // ============================================================
  // 被ダメージ
  // ============================================================
  private hurtPlayer(rawAtk: number) {
    if (this.over || this.transitioning) return;
    const now = this.time.now;
    if (now < this.invulnUntil) return;

    // 無限ボス: 被ダメージは固定1・画面揺れ極小・倒れない(計測に集中)
    if (this.infinite) {
      this.invulnUntil = now + 500;
      this.charState.hp = Math.max(1, this.charState.hp - 1);
      this.floatText(this.player.x, this.player.y - 28, '1', '#ff8a8a');
      this.player.setTintFill(0xff9a9a);
      this.time.delayedCall(90, () => this.player.clearTint());
      return;
    }

    this.invulnUntil = now + 900;
    const buff = this.buffs[this.progress.charKey];
    const sumDef = now < this.sumBuff.until ? this.sumBuff.def : 1; // 召喚防御バフ
    const defMul = (now < buff.until ? buff.def : 1) * sumDef;
    const lvMul = enemyDamageScale(this.progress.level, this.er(this.floor));
    const dmg = Math.max(1, Math.floor(rawAtk * Phaser.Math.FloatBetween(0.85, 1.15) * defMul * lvMul));
    this.charState.hp = Math.max(0, this.charState.hp - dmg);
    sfx('hurt');
    this.floatText(this.player.x, this.player.y - 28, fmt(dmg), '#ff5a5a');
    this.player.setTintFill(0xff6a6a);
    this.cameras.main.shake(60, 0.0008);  // 被弾時の揺れは控えめに(酔い防止)
    // ノックバック: 敵から離れる方向へ押される。スタンス成功時はのけぞらない
    const resisted = Math.random() < stanceChance(this.progress.charKey, this.progress.level);
    if (resisted) {
      this.player.setVelocityY(-70);
      this.floatText(this.player.x + 12, this.player.y - 40, 'STANCE', '#9ad8ff');
    } else {
      const src = this.boss && this.boss.active ? this.boss.x : this.player.x - this.facing * 10;
      const kbDir = Math.sign(this.player.x - src) || -this.facing || 1;
      // 少しだけ後ろ方向へ。大きくのけぞらない
      this.player.setVelocity(kbDir * 70, -45);
    }
    this.time.delayedCall(120, () => this.player.clearTint());
    this.tweens.add({ targets: this.player, alpha: 0.35, duration: 100, yoyo: true, repeat: 4, onComplete: () => this.player.setAlpha(1) });

    if (this.charState.hp <= 0) {
      this.gameOver();
    }
  }

  private gameOver() {
    if (this.over) return;
    this.over = true;
    stopBgm();
    sfx('die');
    this.physics.pause();
    this.persist(this.progress.floor);
    this.tweens.add({ targets: this.player, angle: 90, alpha: 0.6, y: this.player.y - 10, duration: 600 });
    this.hud()?.showGameOver(this.floor.floor, this.progress.difficulty,
      () => this.retryFloor(1, this.progress.difficulty),
      (floor: number, diff: number) => this.retryFloor(floor, diff));
  }

  // 指定の階層・難易度から再挑戦(レベルは保持)
  retryFloor(floor: number, difficulty: number) {
    for (const k of ['warrior', 'mage', 'thief'] as CharKey[]) {
      this.progress.chars[k].hp = this.maxHp(k);
      this.progress.chars[k].mp = this.maxMp(k);
    }
    this.progress.elixirs = Math.max(this.progress.elixirs, 8);
    this.progress.floor = floor;
    this.progress.difficulty = difficulty;
    this.scene.restart({ floor, difficulty });
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
      for (const k of ['warrior', 'mage', 'thief'] as CharKey[]) {
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
    this.refreshWeapon();
    this.hud()?.showBanner(`${tier.rankName}転職! 「${tier.jobName}」にジョブアップ!`, '#ffd24a');
    this.buildUiState();
  }

  // レベル/経験値を保存しつつ、現難易度の到達階層も更新
  private persist(reachedFloor?: number) {
    const save = loadSave();
    save.level = this.progress.level;
    save.exp = this.progress.exp;
    save.charKey = this.progress.charKey;
    const d = this.progress.difficulty;
    if (reachedFloor !== undefined) {
      save.highestByDiff[d] = Math.max(save.highestByDiff[d] || 1, Math.min(TOTAL_FLOORS, reachedFloor));
    }
    writeSave(save);
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
  update(_time: number, delta: number) {
    if (this.over || this.transitioning) { this.syncUiState(); return; }
    if (this.infinite && this.time.now >= this.inf.endAt) { this.endInfinite(); this.syncUiState(); return; }
    this.updateRegen(delta);
    this.updatePlayerMove();
    this.updateBoss();
    this.updateShots();
    this.updatePickups();
    this.updateSummons();
    this.updateShadows();
    this.updateWeapon();
    if (!this.infinite) this.updatePortal();
    this.syncUiState();
  }

  // 召喚獣: プレイヤーに追従させ、時間切れで消す
  private updateSummons() {
    const now = this.time.now;
    for (const key of Object.keys(this.summons)) {
      const s = this.summons[key];
      if (now >= s.endAt || !s.sprite.active) {
        s.ev.remove();
        if (s.sprite.active) this.tweens.add({ targets: s.sprite, alpha: 0, scale: 0.3, duration: 300, onComplete: () => s.sprite.destroy() });
        delete this.summons[key];
        continue;
      }
      // 攻撃中(tween移動中)でなければプレイヤーの斜め上をふわふわ追従
      if (!this.tweens.isTweening(s.sprite)) {
        const ox = key === 'elquines' ? -34 : 34;
        const tx = this.player.x + ox;
        const ty = this.player.y - 44 + Math.sin(now / 400 + (key === 'elquines' ? 0 : 2)) * 8;
        s.sprite.x += (tx - s.sprite.x) * 0.12;
        s.sprite.y += (ty - s.sprite.y) * 0.12;
        s.sprite.setFlipX((this.boss?.x ?? this.player.x) < s.sprite.x);
      }
    }
  }

  private clearSummons() {
    for (const key of Object.keys(this.summons)) {
      this.summons[key].ev.remove();
      this.summons[key].sprite.destroy();
      delete this.summons[key];
    }
  }

  // 無限ボス終了 → 結果表示
  private endInfinite() {
    if (this.over) return;
    this.over = true;
    stopBgm();
    sfx('levelup');
    this.physics.pause();
    this.hud()?.showInfiniteResult({
      total: this.inf.total,
      maxHit: this.inf.maxHit,
      gauge: this.inf.gauge,
      level: this.progress.level,
      job: this.jobTier.jobName,
    });
  }

  // 自然回復: 戦士はHP、魔法使いはMPを毎秒わずかに回復
  private updateRegen(delta: number) {
    const dt = delta / 1000;
    const st = this.charState;
    const key = this.progress.charKey;
    if (key === 'warrior') {
      const max = this.maxHp('warrior');
      if (st.hp < max) st.hp = Math.min(max, st.hp + max * REGEN_PCT_PER_SEC * dt);
    } else if (key === 'thief') {
      // 盗賊はHP/MP両方を半分の速度で回復
      const maxHp = this.maxHp('thief'), maxMp = this.maxMp('thief');
      if (st.hp < maxHp) st.hp = Math.min(maxHp, st.hp + maxHp * REGEN_PCT_PER_SEC * 0.5 * dt);
      if (st.mp < maxMp) st.mp = Math.min(maxMp, st.mp + maxMp * REGEN_PCT_PER_SEC * 0.5 * dt);
    } else {
      const max = this.maxMp('mage');
      if (st.mp < max) st.mp = Math.min(max, st.mp + max * REGEN_PCT_PER_SEC * dt);
    }
  }

  private updatePlayerMove() {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    // フリージングブレス等で行動不能(移動・ジャンプ不可)。攻撃キーは別途skill側で抑止
    if (this.time.now < this.inputLockUntil) {
      body.setVelocityX(0);
      this.upPrev = true;
      return;
    }
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
    for (const b of this.bosses) this.updateBossOne(b);
  }

  private updateBossOne(b: BossSprite) {
    if (!b || !b.active || b.dying) return;
    const now = this.time.now;
    const body = b.body as Phaser.Physics.Arcade.Body;

    // 巨大ボスが壁際で見切れないよう、表示幅ベースで位置をクランプ
    const halfW = Math.min(b.displayWidth / 2, ARENA_W / 2 - 10);
    if (b.x < halfW) { b.x = halfW; if (body.velocity.x < 0) body.setVelocityX(0); }
    else if (b.x > ARENA_W - halfW) { b.x = ARENA_W - halfW; if (body.velocity.x > 0) body.setVelocityX(0); }

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
      b.frozenUntil = 0; b.setTint(this.infinite ? 0x8a3acc : b.floor.tint);
    }

    // 無限ボス: タイタンはほぼ静止(殴られ続ける用)。プレイヤーをゆっくり向くだけ
    if (this.infinite) {
      b.setFlipX((this.player.x - b.x) < 0);
      body.setVelocityX(0);
      this.drawBossHpBar(b, now);
      return;
    }

    const enraged = b.hp < b.maxhp * 0.5;
    // ダッシュ攻撃などで速度が高い間はAIの移動を上書きしない
    const dashing = Math.abs(body.velocity.x) > 180 || Math.abs(body.velocity.y) > 200;
    const slowed = b.slowUntil && this.time.now < b.slowUntil ? 0.5 : 1; // フリージングブレスの減速
    const spd = (b.floor.archetype === 'beast' ? 64 : 43) * (enraged ? 1.35 : 1) * slowed;  // 機敏すぎ防止に減速
    // アーキタイプごとの基準間合い(近接ボスは近め、遠隔ボスは遠め)
    const keep = ({ golem: 46, mush: 50, beast: 40, knight: 44, drake: 96, demon: 100, clown: 104, witch: 118, lord: 122 } as Record<string, number>)[b.floor.archetype] ?? 70;
    const dx = this.player.x - b.x;
    const adx = Math.abs(dx);
    const face = Math.sign(dx) || b.dir || 1;
    b.dir = face;
    b.setFlipX(face < 0);

    // 気まぐれ更新: 一定間隔で保ちたい間合い・横移動の向きをランダムに変える(壁際で固まらない)
    if (!b.roamAt || now > b.roamAt) {
      b.roamAt = now + Phaser.Math.Between(650, 1500);
      b.targetDist = keep * Phaser.Math.FloatBetween(0.5, 1.4);
      b.strafe = Phaser.Math.Between(-1, 1);
    }
    const td = b.targetDist ?? keep;
    const drift = (b.strafe ?? 0) * spd * 0.55;          // 横方向の気まぐれ
    const wobble = Math.sin(now / 380 + b.x * 0.05) * spd * 0.3; // 常に少し揺れる

    if (b.flying) {
      const dy = (this.player.y - 16) - b.y;
      let vx: number;
      if (adx > td + 12) vx = face * spd + drift * 0.3;   // 遠い→寄る(ヘイト)
      else if (adx < td - 12) vx = -face * spd * 0.85;     // 近すぎ→離れる
      else vx = drift + wobble;                            // 間合い内でも漂って止まらない
      if (b.x < 44) vx = spd;                              // 壁際は中央へ
      if (b.x > ARENA_W - 44) vx = -spd;
      body.setVelocity(vx, Phaser.Math.Clamp(dy, -1, 1) * spd * 0.5 + Math.sin(now / 320 + b.x) * 12);
    } else if (!dashing) {
      let vx: number;
      if (adx > td + 12) vx = face * spd + drift * 0.3;
      else if (adx < td - 12) vx = -face * spd * 0.85;     // 近すぎたら下がる(まとわりつき防止)
      else vx = drift + wobble;                            // 間合い内でもふらつく(固まらない)
      if (b.x < 40) vx = spd;                              // 壁際は中央へ押し戻し
      if (b.x > ARENA_W - 40) vx = -spd;
      body.setVelocityX(vx);
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
      for (const b of this.aliveBosses()) {
        if (shot.hitSet.has(b)) continue;
        if (Math.abs(b.x - shot.x) < b.displayWidth / 2 + 8 && Math.abs(b.y - shot.y) < b.displayHeight / 2 + 8) {
          shot.hitSet.add(b);
          this.hitEnemy(b, shot.mult, shot.hits);
          if (!shot.pierce) { shot.destroy(); break; }
        }
      }
    }
    for (const shot of this.enemyShots.getChildren() as (Phaser.Physics.Arcade.Sprite & { homing?: boolean })[]) {
      if (!shot.active) continue;
      if (shot.x < -30 || shot.x > ARENA_W + 30 || shot.y < -30 || shot.y > WORLD_H + 30) { shot.destroy(); continue; }
      // 追尾弾は徐々にプレイヤーへ向きを変える
      if (shot.homing) {
        const body = shot.body as Phaser.Physics.Arcade.Body;
        const ang = Math.atan2(this.player.y - shot.y, this.player.x - shot.x);
        const cur = Math.atan2(body.velocity.y, body.velocity.x);
        const spd = 100;
        const na = cur + Phaser.Math.Angle.Wrap(ang - cur) * 0.06;
        body.setVelocity(Math.cos(na) * spd, Math.sin(na) * spd);
        shot.setRotation(na);
      }
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
    ui.difficulty = this.progress.difficulty;
    ui.underLeveled = this.progress.level < this.er(this.floor);
    ui.elixirCdLeft = Math.max(0, this.elixirCdUntil - now);
    ui.boss = this.boss && this.boss.active
      ? { name: this.boss.floor.bossName, title: this.boss.floor.title, hp: Math.max(0, this.boss.hp), max: this.boss.maxhp }
      : null;
    ui.skills = tier.skills.map((s, i) => ({
      name: s.name, mp: this.skillMpCost(s),
      cdLeft: Math.max(0, this.skillCdAt[i] - now), cd: s.cd,
    }));
    ui.gameOver = this.over;
    // 無限ボスモード
    ui.infinite = this.infinite;
    ui.infGauge = this.inf.gauge;
    ui.infHp = Math.max(0, this.inf.hp);
    ui.infMax = gaugeMax(this.inf.gauge);
    ui.infTotal = this.inf.total;
    ui.infTimeLeft = this.infinite ? Math.max(0, Math.ceil((this.inf.endAt - now) / 1000)) : 0;
  }
}
