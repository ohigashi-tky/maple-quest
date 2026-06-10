// ============================================================
// ゲームデータ定義: キャラクター / スキル / 敵 / ステージ
// ============================================================

export type CharKey = 'warrior' | 'mage';

export interface SkillDef {
  id: string;
  name: string;
  mp: number;
  cd: number; // ms
  label: string; // ボタン表示(短)
}

export interface CharDef {
  key: CharKey;
  name: string;
  maxhp: number;
  maxmp: number;
  atk: number;
  speed: number;
  jump: number;
  skills: SkillDef[];
}

export const CHARACTERS: Record<CharKey, CharDef> = {
  warrior: {
    key: 'warrior',
    name: '剣士',
    maxhp: 240,
    maxmp: 80,
    atk: 20,
    speed: 120,
    jump: 330,
    skills: [
      { id: 'power', name: 'パワーストライク', mp: 8, cd: 1200, label: '強撃' },
      { id: 'blast', name: 'スラッシュブラスト', mp: 16, cd: 4000, label: '乱舞' },
      { id: 'rush', name: 'ラッシュ', mp: 12, cd: 6000, label: '突進' },
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
    skills: [
      { id: 'fire', name: 'ファイアアロー', mp: 10, cd: 1500, label: '火矢' },
      { id: 'thunder', name: 'サンダーボルト', mp: 24, cd: 5000, label: '雷撃' },
      { id: 'heal', name: 'ヒール', mp: 20, cd: 8000, label: '回復' },
    ],
  },
};

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
