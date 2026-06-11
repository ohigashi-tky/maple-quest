// ============================================================
// ゲームデータ定義: キャラクター / 5次転職 / スキル / 20階層ダンジョン
// 道場形式: 雑魚なし、各階層にボス。5階層ごとに強力なボス。
// レベルは永続化され、自分の強さでどこまで登れるかに挑戦する。
// ============================================================

export type CharKey = 'warrior' | 'mage';

// スキル種別(多段ヒット対応)
export type SkillKind =
  | 'melee'      // 前方多段斬撃
  | 'aoe'        // 自分中心の範囲多段
  | 'rush'       // 突進多段
  | 'wave'       // 地走り衝撃波
  | 'buff'       // 自己強化
  | 'projectile' // 貫通弾(多段)
  | 'thunder'    // 落雷(複数対象/多段)
  | 'freeze'     // 範囲凍結(多段)
  | 'chain'      // 連鎖雷
  | 'meteor'     // 隕石/ブリザード(降下多段)
  | 'nova'       // 全画面多段
  | 'heal';      // 回復

export interface SkillDef {
  id: string;
  name: string;  // 正式技名(ボタンに表示)
  mp: number;    // 最大MPに対する消費%
  cd: number;    // ms
  kind: SkillKind;
  mult: number;  // 1ヒットあたりの倍率
  hits: number;  // ヒット数(多段)
  range?: number;
  radius?: number;
  targets?: number;
  speed?: number;
  pierce?: boolean;
  healPct?: number;
  durMs?: number;
  atkBuff?: number;
  defCut?: number;
}

export interface JobTier {
  minLevel: number;
  jobName: string;
  rankName: string;  // 「1次」〜「5次」
  spriteKey: string;
  atkBonus: number;
  skills: SkillDef[];  // 3スキル
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

// 転職レベル: 1次=Lv1 / 2次=30 / 3次=60 / 4次=100 / 5次=150
export const JOB_LEVELS = [1, 30, 60, 100, 150];
export const LEVEL_CAP = 999;

export const CHARACTERS: Record<CharKey, CharDef> = {
  // ========== 戦士: ダークナイト系列(剣士→スピアマン→ドラゴンナイト→ダークナイト) ==========
  warrior: {
    key: 'warrior',
    name: '戦士',
    maxhp: 360,
    maxmp: 120,
    atk: 24,
    speed: 122,
    jump: 335,
    tiers: [
      {
        minLevel: 1, jobName: '剣士', rankName: '1次', spriteKey: 'warrior', atkBonus: 1,
        skills: [
          { id: 'w1a', name: 'パワーストライク', mp: 6, cd: 700, kind: 'melee', mult: 1.6, hits: 2, range: 40 },
          { id: 'w1b', name: 'スラッシュブラスト', mp: 10, cd: 1400, kind: 'aoe', mult: 1.2, hits: 2, radius: 66 },
          { id: 'w1c', name: 'アイアンボディ', mp: 12, cd: 14000, kind: 'buff', mult: 0, hits: 0, durMs: 9000, defCut: 0.55 },
        ],
      },
      {
        minLevel: 30, jobName: 'スピアマン', rankName: '2次', spriteKey: 'warrior2', atkBonus: 1.25,
        skills: [
          { id: 'w2a', name: 'スピアクラッシュ', mp: 7, cd: 750, kind: 'melee', mult: 1.5, hits: 3, range: 46 },
          { id: 'w2b', name: 'ファイナルアタック', mp: 12, cd: 1600, kind: 'melee', mult: 1.7, hits: 4, range: 50 },
          { id: 'w2c', name: 'ハイパーボディ', mp: 16, cd: 16000, kind: 'buff', mult: 0, hits: 0, durMs: 11000, atkBuff: 1.3, defCut: 0.6 },
        ],
      },
      {
        minLevel: 60, jobName: 'ドラゴンナイト', rankName: '3次', spriteKey: 'warrior3', atkBonus: 1.55,
        skills: [
          { id: 'w3a', name: 'ドラゴンバスター', mp: 8, cd: 800, kind: 'melee', mult: 1.7, hits: 4, range: 56 },
          { id: 'w3b', name: 'ドラゴンフューリー', mp: 14, cd: 1700, kind: 'aoe', mult: 1.5, hits: 4, radius: 90 },
          { id: 'w3c', name: 'ドラゴンブラッド', mp: 18, cd: 17000, kind: 'buff', mult: 0, hits: 0, durMs: 12000, atkBuff: 1.5 },
        ],
      },
      {
        minLevel: 100, jobName: 'ダークナイト', rankName: '4次', spriteKey: 'warrior4', atkBonus: 2.0,
        skills: [
          { id: 'w4a', name: 'サウザンドスピア', mp: 10, cd: 850, kind: 'melee', mult: 1.6, hits: 6, range: 62 },
          { id: 'w4b', name: 'ガングニールの降臨', mp: 18, cd: 2000, kind: 'aoe', mult: 1.8, hits: 5, radius: 110 },
          { id: 'w4c', name: 'ビホルダー', mp: 22, cd: 12000, kind: 'heal', mult: 0, hits: 0, healPct: 0.5 },
        ],
      },
      {
        minLevel: 150, jobName: 'ダークナイト・極', rankName: '5次', spriteKey: 'warrior5', atkBonus: 2.6,
        skills: [
          { id: 'w5a', name: 'ダークインペール', mp: 12, cd: 800, kind: 'melee', mult: 1.9, hits: 8, range: 70 },
          { id: 'w5b', name: 'ガングニールの咆哮', mp: 22, cd: 2200, kind: 'nova', mult: 2.0, hits: 6 },
          { id: 'w5c', name: 'リインカーネーション', mp: 28, cd: 16000, kind: 'buff', mult: 0, hits: 0, durMs: 13000, atkBuff: 1.8, defCut: 0.5 },
        ],
      },
    ],
  },
  // ========== 魔法使い: アークメイジ(氷雷)系列(魔法使い→ウィザード→メイジ→アークメイジ) ==========
  mage: {
    key: 'mage',
    name: '魔法使い',
    maxhp: 240,
    maxmp: 220,
    atk: 20,
    speed: 116,
    jump: 322,
    tiers: [
      {
        minLevel: 1, jobName: '魔法使い', rankName: '1次', spriteKey: 'mage', atkBonus: 1,
        skills: [
          { id: 'm1a', name: 'エナジーボルト', mp: 6, cd: 750, kind: 'projectile', mult: 1.7, hits: 1, speed: 230, pierce: false },
          { id: 'm1b', name: 'マジッククロー', mp: 9, cd: 900, kind: 'projectile', mult: 1.3, hits: 2, speed: 260, pierce: false },
          { id: 'm1c', name: 'マジックガード', mp: 12, cd: 14000, kind: 'buff', mult: 0, hits: 0, durMs: 9000, defCut: 0.55 },
        ],
      },
      {
        minLevel: 30, jobName: 'ウィザード', rankName: '2次', spriteKey: 'mage2', atkBonus: 1.25,
        skills: [
          { id: 'm2a', name: 'コールドビーム', mp: 8, cd: 900, kind: 'freeze', mult: 1.6, hits: 2, radius: 70, durMs: 1800 },
          { id: 'm2b', name: 'サンダーボルト', mp: 12, cd: 1500, kind: 'aoe', mult: 1.2, hits: 4, radius: 96 },
          { id: 'm2c', name: 'メディテーション', mp: 16, cd: 16000, kind: 'buff', mult: 0, hits: 0, durMs: 11000, atkBuff: 1.35 },
        ],
      },
      {
        minLevel: 60, jobName: 'メイジ', rankName: '3次', spriteKey: 'mage3', atkBonus: 1.55,
        skills: [
          { id: 'm3a', name: 'アイスストライク', mp: 10, cd: 1100, kind: 'freeze', mult: 1.6, hits: 3, radius: 100, durMs: 2200 },
          { id: 'm3b', name: 'ライトニングボルト', mp: 14, cd: 1500, kind: 'thunder', mult: 1.5, hits: 1, targets: 5, range: 130 },
          { id: 'm3c', name: 'スペルブースター', mp: 18, cd: 17000, kind: 'buff', mult: 0, hits: 0, durMs: 12000, atkBuff: 1.5 },
        ],
      },
      {
        minLevel: 100, jobName: 'アークメイジ', rankName: '4次', spriteKey: 'mage4', atkBonus: 2.0,
        skills: [
          { id: 'm4a', name: 'ブリザード', mp: 14, cd: 1900, kind: 'meteor', mult: 1.7, hits: 5, targets: 6, durMs: 2000 },
          { id: 'm4b', name: 'チェーンライトニング', mp: 16, cd: 1600, kind: 'chain', mult: 1.9, hits: 1, targets: 8, range: 170 },
          { id: 'm4c', name: 'イフリート', mp: 22, cd: 12000, kind: 'heal', mult: 0, hits: 0, healPct: 0.55 },
        ],
      },
      {
        minLevel: 150, jobName: 'アークメイジ・極', rankName: '5次', spriteKey: 'mage5', atkBonus: 2.6,
        skills: [
          { id: 'm5a', name: 'フローズンオーブ', mp: 14, cd: 1000, kind: 'projectile', mult: 1.8, hits: 4, speed: 300, pierce: true },
          { id: 'm5b', name: 'サンダーブレイク', mp: 22, cd: 2000, kind: 'nova', mult: 1.9, hits: 6 },
          { id: 'm5c', name: 'ブリザードストーム', mp: 26, cd: 2400, kind: 'meteor', mult: 1.8, hits: 7, targets: 8, durMs: 2400 },
        ],
      },
    ],
  },
};

export function tierIndexFor(def: CharDef, level: number): number {
  let idx = 0;
  def.tiers.forEach((t, i) => { if (level >= t.minLevel) idx = i; });
  return idx;
}
export function tierFor(def: CharDef, level: number): JobTier {
  return def.tiers[tierIndexFor(def, level)];
}

// ============================================================
// 成長式(レベル1〜250想定の指数成長)
// ============================================================
export function atkScale(level: number): number {
  // 二次成長: 大きな数字になるが青天井すぎない
  return level * level;
}
export function hpScale(base: number, level: number): number {
  return Math.floor(base * Math.pow(level, 1.65));
}
export function mpScale(base: number, level: number): number {
  return Math.floor(base * Math.pow(level, 1.3));
}
export function critRate(level: number): number {
  return Math.min(0.6, 0.12 + (level - 1) * 0.012);
}
export function critMul(level: number): number {
  return 1.5 + Math.min(0.6, (level - 1) * 0.01);
}
// レベルアップ必要経験値
export function expForLevel(lv: number): number {
  return Math.floor(40 * Math.pow(lv, 2.1));
}

// 参照値(バランス計算用)
function refAtk(level: number): number {
  return 24 * atkScale(level) * 1.4; // 平均ジョブ補正込み
}
function refHp(level: number): number {
  return 300 * Math.pow(level, 1.65);
}

// ============================================================
// 20階層ダンジョン(道場)
// ============================================================
export type Theme = 'grass' | 'sky' | 'dark' | 'void';

export interface FloorDef {
  floor: number;
  bossKey: string;
  bossName: string;
  title: string;
  reqLevel: number;   // 推奨レベル(これ未満だとMISS頻発&被弾大)
  major: boolean;     // 5階層ごとの強敵
  theme: Theme;
  archetype: BossArchetype;
  tint: number;       // ボスの配色
  scale: number;
}

export type BossArchetype = 'mush' | 'demon' | 'drake' | 'golem' | 'beast' | 'lord';

// MapleStoryのエリア/ダンジョンボスを弱→強で配置(★=5階層ごとの強敵)
interface FloorSeed {
  key: string; name: string; title: string; req: number;
  arch: BossArchetype; tint: number; major?: boolean; scale?: number;
}
const FLOOR_SEEDS: FloorSeed[] = [
  { key: 'mushmom', name: 'マッシュモム', title: '森の主', req: 1, arch: 'mush', tint: 0xef7d2f, scale: 1.4 },
  { key: 'bluemushmom', name: 'ブルーマッシュモム', title: '青き森の主', req: 8, arch: 'mush', tint: 0x5a8fe0, scale: 1.45 },
  { key: 'faust', name: 'ファウスト', title: '闇の従者', req: 16, arch: 'demon', tint: 0x7a52b4, scale: 1.4 },
  { key: 'dyle', name: 'ダイル', title: '沼の捕食者', req: 24, arch: 'drake', tint: 0x4a9c3a, scale: 1.45 },
  { key: 'jrbalrog', name: 'ジュニアバルログ', title: '小さき災い', req: 32, arch: 'demon', tint: 0xc04a2a, major: true, scale: 1.7 },

  { key: 'stumpy', name: 'スタンピー', title: '怒れる古木', req: 42, arch: 'golem', tint: 0x8a5a32, scale: 1.5 },
  { key: 'griffey', name: 'グリフィー', title: '天空の猛禽', req: 52, arch: 'beast', tint: 0xe0a030, scale: 1.5 },
  { key: 'manon', name: 'マノン', title: '古龍', req: 64, arch: 'drake', tint: 0xd86a9c, scale: 1.55 },
  { key: 'anego', name: 'アネゴ', title: '夜叉の女傑', req: 76, arch: 'lord', tint: 0xd84a6a, scale: 1.45 },
  { key: 'crimsonbalrog', name: 'クリムゾンバルログ', title: '深紅の魔王', req: 88, arch: 'demon', tint: 0xd81a1a, major: true, scale: 1.95 },

  { key: 'dunas', name: 'デュナス', title: '機械龍', req: 100, arch: 'drake', tint: 0x4a7fd6, scale: 1.6 },
  { key: 'pierre', name: 'ピエール', title: '深淵の道化', req: 112, arch: 'lord', tint: 0xb04ad8, scale: 1.5 },
  { key: 'vonleon', name: 'ヴァンレオン', title: '獅子王', req: 124, arch: 'lord', tint: 0x3a6ae8, scale: 1.55 },
  { key: 'hilla', name: 'ヒルラ', title: '血の魔女', req: 136, arch: 'lord', tint: 0x8a1a4a, scale: 1.5 },
  { key: 'zakum', name: 'ザクム', title: '炎の巨神', req: 150, arch: 'golem', tint: 0xd8541a, major: true, scale: 2.1 },

  { key: 'horntail', name: 'ホーンテイル', title: '双頭の邪龍', req: 168, arch: 'drake', tint: 0x3aa84a, scale: 1.85 },
  { key: 'magnus', name: 'マグナス', title: '堕ちた翼', req: 186, arch: 'lord', tint: 0x2a2a3a, scale: 1.6 },
  { key: 'lucid', name: 'ルシード', title: '夢幻の蝶', req: 204, arch: 'lord', tint: 0x6ad8c4, scale: 1.6 },
  { key: 'damien', name: 'デミアン', title: '絶望の剣', req: 224, arch: 'lord', tint: 0xc02a3a, scale: 1.65 },
  { key: 'blackmage', name: 'ブラックマゲ', title: '黒き魔導士', req: 250, arch: 'lord', tint: 0x1a1024, major: true, scale: 2.3 },
];

function themeForFloor(f: number): Theme {
  if (f <= 5) return 'grass';
  if (f <= 10) return 'sky';
  if (f <= 15) return 'dark';
  return 'void';
}

export function themeTile(theme: Theme): string {
  return `tile_${theme}`;
}
export function themeBgm(theme: Theme): 'grass' | 'sky' | 'dark' | 'boss' {
  return theme === 'void' ? 'boss' : theme;
}

// 推奨レベル(EASY基準): 階層が上がってもなだらかに上昇(急騰を大幅緩和)
function baseReq(floor: number): number {
  return Math.max(1, Math.round(1 + Math.pow(floor - 1, 1.15) * 1.3));
}

export const FLOORS: FloorDef[] = FLOOR_SEEDS.map((s, i) => ({
  floor: i + 1,
  bossKey: s.key,
  bossName: s.name,
  title: s.title,
  reqLevel: baseReq(i + 1),
  major: !!s.major,
  theme: themeForFloor(i + 1),
  archetype: s.arch,
  tint: s.tint,
  scale: s.scale ?? 1.5,
}));

export const TOTAL_FLOORS = FLOORS.length;
export const GROUND_Y = 432;
export const WORLD_H = 600;
export const ARENA_W = 720; // 道場アリーナの横幅(コンパクト)

// ============================================================
// 難易度(クリアで次が解放。各段階で敵が強くなる)
// ============================================================
export interface DifficultyDef {
  key: string;
  name: string;
  reqMul: number;  // 推奨レベル(=敵ステータス)の倍率
  expMul: number;  // 経験値ボーナス
  color: number;
  desc: string;
}
export const DIFFICULTIES: DifficultyDef[] = [
  { key: 'easy',   name: 'EASY',   reqMul: 1.0, expMul: 1.0,  color: 0x4aa84a, desc: 'まずはここから' },
  { key: 'normal', name: 'NORMAL', reqMul: 1.7, expMul: 1.5,  color: 0x3a7fd6, desc: '敵が手強くなる' },
  { key: 'hard',   name: 'HARD',   reqMul: 2.8, expMul: 2.3,  color: 0xd8730f, desc: '歴戦の挑戦者へ' },
  { key: 'oni',    name: '鬼モード', reqMul: 4.4, expMul: 3.6, color: 0xc02a3a, desc: 'Lv150以上で挑め' },
];

// 階層×難易度の実効推奨レベル(敵の強さの基準)
export function effReq(f: FloorDef, diff: number): number {
  return Math.round(f.reqLevel * DIFFICULTIES[diff].reqMul);
}

// ボスのステータス(実効推奨レベルから算出)
export function bossHp(f: FloorDef, diff: number): number {
  return Math.round(refAtk(effReq(f, diff)) * (f.major ? 55 : 32));
}
export function bossAtk(f: FloorDef, diff: number): number {
  return Math.round(refHp(effReq(f, diff)) * (f.major ? 0.11 : 0.08));
}
export function bossExp(f: FloorDef, diff: number): number {
  return Math.round(expForLevel(effReq(f, diff)) * (f.major ? 1.1 : 0.65) * DIFFICULTIES[diff].expMul);
}

// ============================================================
// レベル差による命中(MISS)とダメージ補正(緩め)
// ============================================================
// プレイヤー→敵の命中率(実効推奨レベルに対して低いとMISS)
export function playerHitChance(playerLevel: number, reqLevel: number): number {
  const diff = playerLevel - reqLevel;
  if (diff >= 0) return 1;
  return Math.max(0.2, 1 + diff * 0.04); // 1レベル不足ごとに-4%、下限20%(緩和)
}
// レベル不足だと与ダメージも減る(格上補正)
export function playerDamageScale(playerLevel: number, reqLevel: number): number {
  const diff = playerLevel - reqLevel;
  if (diff >= 0) return 1;
  return Math.max(0.25, 1 + diff * 0.04);
}
// 敵→プレイヤーの被ダメージ補正(格上ほど痛い・緩和)
export function enemyDamageScale(playerLevel: number, reqLevel: number): number {
  const diff = reqLevel - playerLevel;
  if (diff <= 0) return 1;
  return 1 + diff * 0.035;
}

// ============================================================
// 進行状態 & 永続化
// ============================================================
export interface CharState { hp: number; mp: number; }

export interface Progress {
  floor: number;       // 現在の階層(1始まり)
  difficulty: number;  // 0=EASY 〜 3=鬼
  level: number;
  exp: number;
  charKey: CharKey;
  chars: Record<CharKey, CharState>;
  elixirs: number;
  startTime: number;
}

export const ELIXIR_MAX = 30;

export interface SaveData {
  level: number;
  exp: number;
  charKey: CharKey;
  highestByDiff: number[];   // 難易度別の到達最高階層
  clearedByDiff: boolean[];  // 難易度別の20階制覇フラグ
  clears: number;
}

const SAVE_KEY = 'maple-quest-save-v3';

function defaultSave(): SaveData {
  return {
    level: 1, exp: 0, charKey: 'warrior',
    highestByDiff: [1, 1, 1, 1],
    clearedByDiff: [false, false, false, false],
    clears: 0,
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<SaveData>;
      const d = defaultSave();
      return {
        level: Math.max(1, Math.min(LEVEL_CAP, s.level || 1)),
        exp: Math.max(0, s.exp || 0),
        charKey: s.charKey === 'mage' ? 'mage' : 'warrior',
        highestByDiff: Array.isArray(s.highestByDiff) ? DIFFICULTIES.map((_, i) => Math.max(1, Math.min(TOTAL_FLOORS, s.highestByDiff![i] || 1))) : d.highestByDiff,
        clearedByDiff: Array.isArray(s.clearedByDiff) ? DIFFICULTIES.map((_, i) => !!s.clearedByDiff![i]) : d.clearedByDiff,
        clears: s.clears || 0,
      };
    }
  } catch { /* ignore */ }
  return defaultSave();
}

export function writeSave(s: SaveData) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// 難易度が解放されているか(EASYは常時、以降は1つ前を制覇で解放)
export function isDifficultyUnlocked(save: SaveData, diff: number): boolean {
  if (diff <= 0) return true;
  return !!save.clearedByDiff[diff - 1];
}

export function newProgress(save: SaveData, floor = 1, difficulty = 0): Progress {
  return {
    floor,
    difficulty,
    level: save.level,
    exp: save.exp,
    charKey: save.charKey,
    chars: {
      warrior: { hp: hpScale(CHARACTERS.warrior.maxhp, save.level), mp: mpScale(CHARACTERS.warrior.maxmp, save.level) },
      mage: { hp: hpScale(CHARACTERS.mage.maxhp, save.level), mp: mpScale(CHARACTERS.mage.maxmp, save.level) },
    },
    elixirs: 12,
    startTime: Date.now(),
  };
}

// 数値表示(桁区切り)
export function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}
