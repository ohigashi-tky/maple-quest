// ============================================================
// ゲームデータ定義: キャラクター / スキル / 敵 / ステージ
// ============================================================

export type CharKey = 'warrior' | 'mage';

// スキルは「種類 + パラメータ」で定義し、転職で強化版に差し替わる
export type SkillKind =
  | 'melee'      // 前方斬撃
  | 'aoe'        // 自分中心の範囲攻撃
  | 'rush'       // 突進
  | 'wave'       // 地面を走る衝撃波(コーマ)
  | 'shout'      // 範囲+スタン(シャウト)
  | 'buff'       // 自己強化(アイアンボディ/インレイジ)
  | 'projectile' // 弾(エナジーボルト/ファイアアロー)
  | 'thunder'    // 落雷(サンダーボルト)
  | 'freeze'     // 範囲+凍結(アイスストライク)
  | 'meteor'     // メテオ
  | 'chain'      // チェーンライトニング
  | 'genesis'    // ジェネシス(全体攻撃+大回復)
  | 'heal';      // 回復

export interface SkillDef {
  id: string;
  name: string;
  label: string; // ボタン表示(短)
  mp: number; // 最大MPに対する消費%(実値はレベルで変動)
  cd: number; // ms
  kind: SkillKind;
  mult: number; // 攻撃倍率
  hits?: number; // melee/aoe: ヒット数
  range?: number; // melee: リーチ / thunder・chain: 索敵範囲
  radius?: number; // aoe/shout/freeze: 半径
  targets?: number; // thunder/chain/meteor: 最大対象数
  speed?: number; // projectile: 弾速
  pierce?: boolean; // projectile: 貫通
  healPct?: number; // heal/genesis: 最大HP比回復量
  durMs?: number; // buff/スタン/凍結の持続
  atkBuff?: number; // buff: 攻撃倍率
  defCut?: number; // buff: 被ダメージ軽減率(0.5=半減)
}

// 転職ティア: 到達レベルでジョブ名・見た目・スキルが変わる
export interface JobTier {
  minLevel: number;
  jobName: string;
  rankName: string; // 「1次」「2次」「3次」
  spriteKey: string;
  atkBonus: number;
  skills: SkillDef[];
}

export interface CharDef {
  key: CharKey;
  name: string;
  maxhp: number; // Lv1基準値
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
    maxhp: 300,
    maxmp: 120,
    atk: 22,
    speed: 120,
    jump: 330,
    tiers: [
      {
        minLevel: JOB_LEVELS[0], jobName: '剣士', rankName: '1次', spriteKey: 'warrior', atkBonus: 1,
        skills: [
          { id: 'power1', name: 'パワーストライク', label: '強撃', mp: 6, cd: 1100, kind: 'melee', mult: 2.6, hits: 2, range: 38 },
          { id: 'blast1', name: 'スラッシュブラスト', label: '乱舞', mp: 12, cd: 3600, kind: 'aoe', mult: 2.3, hits: 1, radius: 72 },
          { id: 'iron1', name: 'アイアンボディ', label: '鉄壁', mp: 14, cd: 12000, kind: 'buff', mult: 0, durMs: 8000, defCut: 0.5 },
        ],
      },
      {
        minLevel: JOB_LEVELS[1], jobName: 'クルセイダー', rankName: '2次', spriteKey: 'warrior2', atkBonus: 1.3,
        skills: [
          { id: 'combo2', name: 'コンボアタック', label: '連撃', mp: 8, cd: 1000, kind: 'melee', mult: 2.9, hits: 3, range: 44 },
          { id: 'shout2', name: 'シャウト', label: '咆哮', mp: 16, cd: 4500, kind: 'shout', mult: 3.0, radius: 95, durMs: 1600 },
          { id: 'coma2', name: 'コーマ', label: '衝撃波', mp: 14, cd: 3800, kind: 'wave', mult: 3.6 },
        ],
      },
      {
        minLevel: JOB_LEVELS[2], jobName: 'ヒーロー', rankName: '3次', spriteKey: 'warrior3', atkBonus: 1.6,
        skills: [
          { id: 'brand3', name: 'ブランディッシュ', label: '極撃', mp: 9, cd: 950, kind: 'melee', mult: 3.6, hits: 4, range: 54 },
          { id: 'rush3', name: '突進(ラッシュ)', label: '突進', mp: 12, cd: 3400, kind: 'rush', mult: 4.0 },
          { id: 'rage3', name: 'インレイジ', label: '激怒', mp: 20, cd: 14000, kind: 'buff', mult: 0, durMs: 10000, atkBuff: 1.6 },
        ],
      },
    ],
  },
  mage: {
    key: 'mage',
    name: '魔法使い',
    maxhp: 200,
    maxmp: 200,
    atk: 18,
    speed: 115,
    jump: 320,
    tiers: [
      {
        minLevel: JOB_LEVELS[0], jobName: '魔法使い', rankName: '1次', spriteKey: 'mage', atkBonus: 1,
        skills: [
          { id: 'bolt1', name: 'エナジーボルト', label: '魔弾', mp: 7, cd: 1300, kind: 'projectile', mult: 2.8, speed: 220, pierce: false },
          { id: 'thunder1', name: 'サンダーボルト', label: '雷撃', mp: 16, cd: 4200, kind: 'thunder', mult: 2.6, targets: 4, range: 115 },
          { id: 'heal1', name: 'ヒール', label: '回復', mp: 14, cd: 7000, kind: 'heal', mult: 0, healPct: 0.45 },
        ],
      },
      {
        minLevel: JOB_LEVELS[1], jobName: 'ウィザード', rankName: '2次', spriteKey: 'mage2', atkBonus: 1.3,
        skills: [
          { id: 'fire2', name: 'ファイアアロー', label: '火矢', mp: 9, cd: 1100, kind: 'projectile', mult: 3.2, speed: 300, pierce: true },
          { id: 'ice2', name: 'アイスストライク', label: '氷撃', mp: 16, cd: 4200, kind: 'freeze', mult: 3.0, radius: 90, durMs: 2200 },
          { id: 'heal2', name: 'ヒーリング', label: '回復改', mp: 18, cd: 6500, kind: 'heal', mult: 0, healPct: 0.65 },
        ],
      },
      {
        minLevel: JOB_LEVELS[2], jobName: 'アークメイジ', rankName: '3次', spriteKey: 'mage3', atkBonus: 1.6,
        skills: [
          { id: 'meteor3', name: 'メテオ', label: '隕石', mp: 14, cd: 3000, kind: 'meteor', mult: 4.2, targets: 5 },
          { id: 'chain3', name: 'チェーンライトニング', label: '連雷', mp: 16, cd: 3400, kind: 'chain', mult: 3.8, targets: 8, range: 160 },
          { id: 'genesis3', name: 'ジェネシス', label: '聖光', mp: 28, cd: 9000, kind: 'genesis', mult: 4.6, healPct: 1.0 },
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

// ============================================================
// 成長式(メイプル風のインフレ成長)
// ============================================================
export const HP_CAP = 30000;
export const MP_CAP = 5000;

// 攻撃力: レベル毎に約1.9倍 → 終盤は数十万ダメージ
export function atkScale(level: number): number {
  return Math.pow(1.9, level - 1);
}

export function hpScale(base: number, level: number): number {
  return Math.min(HP_CAP, Math.round(base * Math.pow(1.55, level - 1)));
}

export function mpScale(base: number, level: number): number {
  return Math.min(MP_CAP, Math.round(base * Math.pow(1.5, level - 1)));
}

// クリティカル率: 15% から成長して最大60%
export function critRate(level: number): number {
  return Math.min(0.6, 0.15 + (level - 1) * 0.035);
}

// クリティカル倍率: 1.5倍 → 最大2.0倍
export function critMul(level: number): number {
  return 1.5 + Math.min(0.5, (level - 1) * 0.04);
}

// レベルアップに必要な経験値(指数)
export function expForLevel(lv: number): number {
  return Math.round(50 * Math.pow(1.7, lv - 1));
}

// ============================================================
// 敵
// ============================================================
export interface EnemyDef {
  key: string;
  name: string;
  hp: number; // 基準値(ステージ係数で増幅)
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
  slime: { key: 'slime', name: 'スパイクスライム', hp: 85, atk: 17, exp: 22, speed: 26, hop: true, scale: 1 },
  pig: { key: 'pig', name: 'アーマーブタ', hp: 110, atk: 21, exp: 28, speed: 48, scale: 1 },
  bat: { key: 'bat', name: 'デビルバット', hp: 95, atk: 25, exp: 34, speed: 42, fly: true, scale: 1 },
  zombieshroom: { key: 'zombieshroom', name: 'カオスマッシュ', hp: 150, atk: 30, exp: 45, speed: 32, hop: true, scale: 1 },
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
    hp: 1800, atk: 32, exp: 800, speed: 50, scale: 1.5,
  },
  cygnus: {
    key: 'cygnus', name: 'シグナス', title: '闇に堕ちた女帝',
    hp: 2800, atk: 40, exp: 2000, speed: 55, fly: true, scale: 1.5,
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
  // ステージ係数(プレイヤーのインフレ成長に合わせる)
  mobHpMul: number;
  mobAtkMul: number;
  expMul: number;
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
    mobHpMul: 1,
    mobAtkMul: 1,
    expMul: 1,
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
    mobHpMul: 30,
    mobAtkMul: 18,
    expMul: 8,
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
    mobHpMul: 600,
    mobAtkMul: 120,
    expMul: 60,
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

// ボスHPはステージ係数 × さらに3倍
export const BOSS_HP_MUL = 3;

// ============================================================
// 進行状態
// ============================================================
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
  elixirs: number; // エリクサー(HP/MP全回復)
  kills: number;
  startTime: number;
}

export const ELIXIR_MAX = 30;

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
    elixirs: 10,
    kills: 0,
    startTime: Date.now(),
  };
}

// 大きい数値の表示用フォーマット
export function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
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
