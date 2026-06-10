// ============================================================
// ゲームデータ定義: キャラクター / スキル / 敵 / ステージ
// ============================================================

export type CharKey = 'warrior' | 'mage';

// スキルは「種類 + パラメータ」で定義し、転職で強化版に差し替わる
export type SkillKind = 'melee' | 'aoe' | 'rush' | 'projectile' | 'thunder' | 'heal';

export interface SkillDef {
  id: string;
  name: string;
  label: string; // ボタン表示(短)
  mp: number;
  cd: number; // ms
  kind: SkillKind;
  mult: number; // 攻撃倍率(healでは未使用)
  hits?: number; // melee/aoe: ヒット数
  range?: number; // melee: 前方リーチ / thunder: 索敵範囲
  radius?: number; // aoe: 半径
  targets?: number; // thunder: 最大対象数
  speed?: number; // projectile: 弾速
  pierce?: boolean; // projectile: 貫通
  healPct?: number; // heal: 最大HPに対する回復割合
}

// 転職ティア: 到達レベルでジョブ名・見た目・スキルが変わる
export interface JobTier {
  minLevel: number;
  jobName: string;
  rankName: string; // 「1次」「2次」「3次」
  spriteKey: string; // テクスチャ/アニメのプレフィックス
  atkBonus: number; // 攻撃力倍率
  skills: SkillDef[];
}

export interface CharDef {
  key: CharKey;
  name: string;
  maxhp: number;
  maxmp: number;
  atk: number;
  speed: number;
  jump: number;
  tiers: JobTier[];
}

export const JOB_LEVELS = [1, 5, 10]; // 1次 / 2次 / 3次転職レベル

export const CHARACTERS: Record<CharKey, CharDef> = {
  warrior: {
    key: 'warrior',
    name: '剣士',
    maxhp: 240,
    maxmp: 80,
    atk: 20,
    speed: 120,
    jump: 330,
    tiers: [
      {
        minLevel: JOB_LEVELS[0], jobName: '剣士', rankName: '1次', spriteKey: 'warrior', atkBonus: 1,
        skills: [
          { id: 'power1', name: 'パワーストライク', label: '強撃', mp: 8, cd: 1200, kind: 'melee', mult: 1.7, hits: 2, range: 36 },
          { id: 'blast1', name: 'スラッシュブラスト', label: '乱舞', mp: 16, cd: 4000, kind: 'aoe', mult: 2.2, hits: 1, radius: 64 },
          { id: 'rush1', name: 'ラッシュ', label: '突進', mp: 12, cd: 6000, kind: 'rush', mult: 1.8 },
        ],
      },
      {
        minLevel: JOB_LEVELS[1], jobName: 'クルセイダー', rankName: '2次', spriteKey: 'warrior2', atkBonus: 1.25,
        skills: [
          { id: 'power2', name: 'コンボアタック', label: '連斬', mp: 10, cd: 1100, kind: 'melee', mult: 2.0, hits: 3, range: 40 },
          { id: 'blast2', name: 'パニックブロウ', label: '大乱舞', mp: 20, cd: 3600, kind: 'aoe', mult: 2.6, hits: 2, radius: 80 },
          { id: 'rush2', name: 'シールドラッシュ', label: '突進改', mp: 14, cd: 5000, kind: 'rush', mult: 2.4 },
        ],
      },
      {
        minLevel: JOB_LEVELS[2], jobName: 'ヒーロー', rankName: '3次', spriteKey: 'warrior3', atkBonus: 1.5,
        skills: [
          { id: 'power3', name: 'ブランディッシュ', label: '極撃', mp: 12, cd: 1000, kind: 'melee', mult: 2.5, hits: 4, range: 46 },
          { id: 'blast3', name: 'インパクトウェーブ', label: '極乱舞', mp: 26, cd: 3200, kind: 'aoe', mult: 3.2, hits: 2, radius: 100 },
          { id: 'rush3', name: 'ヒーローラッシュ', label: '極突進', mp: 18, cd: 4200, kind: 'rush', mult: 3.0 },
        ],
      },
    ],
  },
  mage: {
    key: 'mage',
    name: '魔法使い',
    maxhp: 160,
    maxmp: 160,
    atk: 16,
    speed: 115,
    jump: 320,
    tiers: [
      {
        minLevel: JOB_LEVELS[0], jobName: '魔法使い', rankName: '1次', spriteKey: 'mage', atkBonus: 1,
        skills: [
          { id: 'fire1', name: 'ファイアアロー', label: '火矢', mp: 10, cd: 1500, kind: 'projectile', mult: 2.0, speed: 240, pierce: true },
          { id: 'thunder1', name: 'サンダーボルト', label: '雷撃', mp: 24, cd: 5000, kind: 'thunder', mult: 2.4, targets: 4, range: 110 },
          { id: 'heal1', name: 'ヒール', label: '回復', mp: 20, cd: 8000, kind: 'heal', mult: 0, healPct: 0.4 },
        ],
      },
      {
        minLevel: JOB_LEVELS[1], jobName: 'ウィザード', rankName: '2次', spriteKey: 'mage2', atkBonus: 1.25,
        skills: [
          { id: 'fire2', name: 'エクスプロージョン', label: '爆炎', mp: 14, cd: 1300, kind: 'projectile', mult: 2.6, speed: 280, pierce: true },
          { id: 'thunder2', name: 'サンダースピア', label: '雷槍', mp: 30, cd: 4400, kind: 'thunder', mult: 2.8, targets: 6, range: 130 },
          { id: 'heal2', name: 'ヒーリング', label: '回復改', mp: 26, cd: 7000, kind: 'heal', mult: 0, healPct: 0.6 },
        ],
      },
      {
        minLevel: JOB_LEVELS[2], jobName: 'アークメイジ', rankName: '3次', spriteKey: 'mage3', atkBonus: 1.5,
        skills: [
          { id: 'fire3', name: 'メテオ', label: '隕石', mp: 18, cd: 1200, kind: 'projectile', mult: 3.4, speed: 300, pierce: true },
          { id: 'thunder3', name: 'チェーンライトニング', label: '連雷', mp: 38, cd: 3800, kind: 'thunder', mult: 3.4, targets: 8, range: 150 },
          { id: 'heal3', name: 'ジェネシス', label: '大回復', mp: 34, cd: 6000, kind: 'heal', mult: 0, healPct: 0.85 },
        ],
      },
    ],
  },
};

// 現在レベルで適用されるジョブティアを返す
export function tierIndexFor(def: CharDef, level: number): number {
  let idx = 0;
  def.tiers.forEach((t, i) => {
    if (level >= t.minLevel) idx = i;
  });
  return idx;
}

export function tierFor(def: CharDef, level: number): JobTier {
  return def.tiers[tierIndexFor(def, level)];
}

export interface EnemyDef {
  key: string;
  name: string;
  hp: number;
  atk: number;
  exp: number;
  speed: number;
  fly?: boolean;
  hop?: boolean;
  scale: number;
}

export const ENEMIES: Record<string, EnemyDef> = {
  snail: { key: 'snail', name: 'ブルースネイル', hp: 40, atk: 9, exp: 10, speed: 14, scale: 1 },
  mushroom: { key: 'mushroom', name: 'オレンジマッシュ', hp: 65, atk: 13, exp: 16, speed: 30, hop: true, scale: 1 },
  slime: { key: 'slime', name: 'グリーンスライム', hp: 85, atk: 17, exp: 22, speed: 26, hop: true, scale: 1 },
  pig: { key: 'pig', name: 'リボンブタ', hp: 110, atk: 21, exp: 28, speed: 48, scale: 1 },
  bat: { key: 'bat', name: 'ダークバット', hp: 95, atk: 25, exp: 34, speed: 42, fly: true, scale: 1 },
  zombieshroom: { key: 'zombieshroom', name: 'ゾンビマッシュ', hp: 150, atk: 30, exp: 45, speed: 32, hop: true, scale: 1 },
};

export interface BossDef extends EnemyDef {
  title: string;
}

export const BOSSES: Record<string, BossDef> = {
  mushmom: {
    key: 'mushmom', name: 'マッシュモム', title: '森の主',
    hp: 1100, atk: 26, exp: 350, speed: 40, scale: 1.4,
  },
  pinkbean: {
    key: 'pinkbean', name: 'ピンクビーン', title: 'いたずらな神獣',
    hp: 2000, atk: 34, exp: 800, speed: 50, scale: 1.5,
  },
  cygnus: {
    key: 'cygnus', name: 'シグナス', title: '闇に堕ちた女帝',
    hp: 3000, atk: 42, exp: 2000, speed: 55, fly: true, scale: 1.5,
  },
};

export interface PlatformDef { x: number; y: number; w: number; oneway?: boolean }

export interface StageDef {
  name: string;
  sub: string;
  theme: 'grass' | 'sky' | 'dark';
  tile: string;
  width: number;
  quota: number; // ボス出現に必要な討伐数
  mobs: [string, number][]; // [enemyKey, 同時出現数]
  boss: string;
  platforms: PlatformDef[];
  bgm: 'grass' | 'sky' | 'dark';
}

export const GROUND_Y = 432; // 地面の上端(ワールド座標)
export const WORLD_H = 600; // 地面下の土も含めたワールドの高さ

export const STAGES: StageDef[] = [
  {
    name: 'ステージ 1',
    sub: 'ヘネシスの草原',
    theme: 'grass',
    tile: 'tile_grass',
    width: 1600,
    quota: 12,
    mobs: [
      ['snail', 4],
      ['mushroom', 4],
    ],
    boss: 'mushmom',
    bgm: 'grass',
    platforms: [
      { x: 200, y: 368, w: 128, oneway: true },
      { x: 420, y: 320, w: 96, oneway: true },
      { x: 640, y: 368, w: 144, oneway: true },
      { x: 900, y: 330, w: 112, oneway: true },
      { x: 1120, y: 376, w: 128, oneway: true },
      { x: 1340, y: 320, w: 96, oneway: true },
      { x: 560, y: 264, w: 80, oneway: true },
      { x: 1020, y: 264, w: 80, oneway: true },
    ],
  },
  {
    name: 'ステージ 2',
    sub: 'オルビスの雲海',
    theme: 'sky',
    tile: 'tile_sky',
    width: 1800,
    quota: 14,
    mobs: [
      ['slime', 4],
      ['pig', 4],
    ],
    boss: 'pinkbean',
    bgm: 'sky',
    platforms: [
      { x: 180, y: 360, w: 112, oneway: true },
      { x: 400, y: 304, w: 96, oneway: true },
      { x: 620, y: 360, w: 128, oneway: true },
      { x: 860, y: 312, w: 96, oneway: true },
      { x: 1080, y: 368, w: 144, oneway: true },
      { x: 1320, y: 312, w: 112, oneway: true },
      { x: 1540, y: 360, w: 112, oneway: true },
      { x: 520, y: 248, w: 80, oneway: true },
      { x: 980, y: 248, w: 80, oneway: true },
      { x: 1430, y: 248, w: 80, oneway: true },
    ],
  },
  {
    name: 'ステージ 3',
    sub: '闇の神殿',
    theme: 'dark',
    tile: 'tile_dark',
    width: 2000,
    quota: 16,
    mobs: [
      ['bat', 4],
      ['zombieshroom', 4],
    ],
    boss: 'cygnus',
    bgm: 'dark',
    platforms: [
      { x: 200, y: 368, w: 128, oneway: true },
      { x: 440, y: 312, w: 112, oneway: true },
      { x: 680, y: 368, w: 128, oneway: true },
      { x: 920, y: 312, w: 112, oneway: true },
      { x: 1160, y: 368, w: 144, oneway: true },
      { x: 1400, y: 312, w: 112, oneway: true },
      { x: 1640, y: 368, w: 128, oneway: true },
      { x: 560, y: 248, w: 80, oneway: true },
      { x: 1040, y: 248, w: 80, oneway: true },
      { x: 1520, y: 248, w: 80, oneway: true },
    ],
  },
];

// レベルアップに必要な経験値
export function expForLevel(lv: number): number {
  return Math.floor(40 + lv * lv * 18);
}

// 永続化されるプレイヤー進行状態
export interface CharState {
  hp: number;
  mp: number;
}

export interface Progress {
  stage: number;
  level: number;
  exp: number;
  charKey: CharKey;
  chars: Record<CharKey, CharState>;
  potions: { hp: number; mp: number };
  kills: number;
  startTime: number;
}

export function newProgress(stage = 0): Progress {
  return {
    stage,
    level: 1,
    exp: 0,
    charKey: 'warrior',
    chars: {
      warrior: { hp: CHARACTERS.warrior.maxhp, mp: CHARACTERS.warrior.maxmp },
      mage: { hp: CHARACTERS.mage.maxhp, mp: CHARACTERS.mage.maxmp },
    },
    potions: { hp: 15, mp: 15 },
    kills: 0,
    startTime: Date.now(),
  };
}

// ステータス成長: レベルに応じた倍率
export function statMul(level: number): number {
  return 1 + (level - 1) * 0.12;
}

const SAVE_KEY = 'maple-quest-save';

export function saveStage(stage: number) {
  try {
    const prev = loadSavedStage();
    if (stage > prev) localStorage.setItem(SAVE_KEY, String(stage));
  } catch { /* private mode等は無視 */ }
}

export function loadSavedStage(): number {
  try {
    return Math.min(Number(localStorage.getItem(SAVE_KEY) || 0), STAGES.length - 1);
  } catch {
    return 0;
  }
}
