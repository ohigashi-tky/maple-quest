// ============================================================
// ゲームデータ定義: キャラクター / 5次転職 / スキル / 20階層ダンジョン
// 道場形式: 雑魚なし、各階層にボス。5階層ごとに強力なボス。
// レベルは永続化され、自分の強さでどこまで登れるかに挑戦する。
// ============================================================

export type CharKey = 'warrior' | 'mage' | 'thief';

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
  | 'channel'    // キーダウン継続発動(ピアスサイクロン)
  | 'darkimpale' // 振り下ろし型の闇斬撃(黒×赤)
  | 'breath'     // キーダウン氷ブレス(無敵+減速デバフ)
  | 'gungnir'    // 神槍投擲(最大HP比例の多段)
  | 'summon'     // 召喚獣(エルクィネス/ダークスピリット)
  | 'shadow'     // シャドーパートナー(分身が攻撃を反復)
  | 'kunai'      // 巨大クナイ(闇の大爆発・複数体攻撃)
  | 'darkcross'  // ダークシンセンス(闇の斜め十字が周囲に多発)
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
  multi?: boolean;  // true=複数体攻撃(近接/凍結系で全体に命中)
  proj?: number;    // 投擲数(手裏剣の表示本数)
  healPct?: number;
  durMs?: number;
  atkBuff?: number;  // 攻撃力倍率(>1)
  defCut?: number;   // 被ダメージ倍率(<1=軽減)
  hpBuff?: number;   // 最大HP倍率(>1)
  cdCut?: number;    // スキルCT倍率(<1=短縮)
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

// 転職レベル: 1次=Lv1 / 2次=10 / 3次=30 / 4次=60 / 5次=100
export const JOB_LEVELS = [1, 10, 30, 60, 100];
export const LEVEL_CAP = 999;
// HP/MPの自然回復(毎秒・最大値に対する割合)。戦士=HP, 魔法使い=MP
export const REGEN_PCT_PER_SEC = 0.012;

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
          { id: 'w1a', name: 'パワーストライク', mp: 2, cd: 700, kind: 'melee', mult: 1.6, hits: 2, range: 40 },
          { id: 'w1b', name: 'スラッシュブラスト', mp: 3, cd: 1400, kind: 'aoe', mult: 1.2, hits: 2, radius: 66 },
          { id: 'w1c', name: 'アイアンボディ', mp: 3, cd: 12000, kind: 'buff', mult: 0, hits: 0, durMs: 10000, defCut: 0.5 },
        ],
      },
      {
        minLevel: 10, jobName: 'スピアマン', rankName: '2次', spriteKey: 'warrior2', atkBonus: 1.25,
        skills: [
          { id: 'w2a', name: 'スピアクラッシュ', mp: 2, cd: 750, kind: 'melee', mult: 1.5, hits: 3, range: 46 },
          { id: 'w2b', name: 'ファイナルアタック', mp: 3, cd: 1600, kind: 'melee', mult: 1.7, hits: 4, range: 56, multi: true },
          { id: 'w2c', name: 'ハイパーボディ', mp: 5, cd: 16000, kind: 'buff', mult: 0, hits: 0, durMs: 14000, hpBuff: 1.6, defCut: 0.85 },
        ],
      },
      {
        minLevel: 30, jobName: 'ドラゴンナイト', rankName: '3次', spriteKey: 'warrior3', atkBonus: 1.55,
        skills: [
          { id: 'w3a', name: 'ドラゴンバスター', mp: 2, cd: 800, kind: 'melee', mult: 1.7, hits: 4, range: 56 },
          { id: 'w3b', name: 'ドラゴンフューリー', mp: 4, cd: 1700, kind: 'aoe', mult: 1.5, hits: 4, radius: 90 },
          { id: 'w3c', name: 'ドラゴンブラッド', mp: 5, cd: 16000, kind: 'buff', mult: 0, hits: 0, durMs: 14000, atkBuff: 1.6 },
        ],
      },
      {
        minLevel: 60, jobName: 'ダークナイト', rankName: '4次', spriteKey: 'warrior4', atkBonus: 2.0,
        skills: [
          { id: 'w4a', name: 'サウザンドスピア', mp: 3, cd: 850, kind: 'melee', mult: 1.6, hits: 6, range: 62 },
          { id: 'w4b', name: 'グングニル', mp: 7, cd: 4500, kind: 'gungnir', mult: 2.25, hits: 12, targets: 3 },
          { id: 'w4c', name: 'ダークスピリット', mp: 7, cd: 30000, kind: 'summon', mult: 1.3, hits: 3, durMs: 30000 },
        ],
      },
      {
        minLevel: 100, jobName: 'ダークナイト・極', rankName: '5次', spriteKey: 'warrior5', atkBonus: 2.6,
        skills: [
          { id: 'w5a', name: 'ダークインペール', mp: 3, cd: 900, kind: 'darkimpale', mult: 3.0, hits: 6, range: 76, multi: true },
          { id: 'w5c', name: 'ピアスサイクロン', mp: 6, cd: 2400, kind: 'channel', mult: 1.3, hits: 1, range: 84, durMs: 5000 },
          { id: 'w5b', name: 'ダークシンセンス', mp: 7, cd: 10000, kind: 'darkcross', mult: 4.0, hits: 10, targets: 10, radius: 190 },
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
          { id: 'm1a', name: 'エナジーボルト', mp: 1, cd: 750, kind: 'projectile', mult: 1.7, hits: 1, speed: 230, pierce: false },
          { id: 'm1b', name: 'マジッククロー', mp: 2, cd: 900, kind: 'projectile', mult: 1.3, hits: 2, speed: 260, pierce: false },
          { id: 'm1c', name: 'マジックガード', mp: 3, cd: 12000, kind: 'buff', mult: 0, hits: 0, durMs: 10000, defCut: 0.45 },
        ],
      },
      {
        minLevel: 10, jobName: 'ウィザード', rankName: '2次', spriteKey: 'mage2', atkBonus: 1.25,
        skills: [
          { id: 'm2a', name: 'コールドビーム', mp: 2, cd: 900, kind: 'freeze', mult: 1.6, hits: 2, radius: 70, durMs: 900 },
          { id: 'm2b', name: 'サンダーボルト', mp: 3, cd: 1500, kind: 'thunder', mult: 1.2, hits: 1, targets: 4, range: 150 },
          { id: 'm2c', name: 'メディテーション', mp: 4, cd: 16000, kind: 'buff', mult: 0, hits: 0, durMs: 14000, atkBuff: 1.45 },
        ],
      },
      {
        minLevel: 30, jobName: 'メイジ', rankName: '3次', spriteKey: 'mage3', atkBonus: 1.55,
        skills: [
          { id: 'm3a', name: 'アイスストライク', mp: 2, cd: 1100, kind: 'freeze', mult: 1.6, hits: 3, radius: 100, durMs: 1100 },
          { id: 'm3b', name: 'ライトニングボルト', mp: 3, cd: 1500, kind: 'thunder', mult: 1.5, hits: 1, targets: 5, range: 130 },
          { id: 'm3c', name: 'スペルブースター', mp: 4, cd: 17000, kind: 'buff', mult: 0, hits: 0, durMs: 14000, cdCut: 0.55 },
        ],
      },
      {
        minLevel: 60, jobName: 'アークメイジ', rankName: '4次', spriteKey: 'mage4', atkBonus: 2.0,
        skills: [
          { id: 'm4b', name: 'チェーンライトニング', mp: 3, cd: 1600, kind: 'chain', mult: 1.9, hits: 1, targets: 8, range: 240 },
          { id: 'm4a', name: 'ブリザード', mp: 4, cd: 1900, kind: 'meteor', mult: 1.7, hits: 5, targets: 6, durMs: 1000 },
          { id: 'm4c', name: 'エルクィネス', mp: 6, cd: 20000, kind: 'summon', mult: 1.5, hits: 3, targets: 3, durMs: 20000 },
        ],
      },
      {
        minLevel: 100, jobName: 'アークメイジ・極', rankName: '5次', spriteKey: 'mage5', atkBonus: 2.6,
        skills: [
          { id: 'm5b', name: 'サンダーブレイク', mp: 4, cd: 2000, kind: 'thunder', mult: 1.9, hits: 1, targets: 6, range: 260 },
          { id: 'm5c', name: 'ブリザードストーム', mp: 5, cd: 2400, kind: 'meteor', mult: 1.8, hits: 7, targets: 8, durMs: 1200 },
          { id: 'm5a', name: 'フリージングブレス', mp: 5, cd: 10000, kind: 'breath', mult: 1.2, hits: 4, targets: 8, range: 200, durMs: 5000 },
        ],
      },
    ],
  },
  // ========== 盗賊: ナイトロード系列(盗賊→アサシン→ハーミット→ナイトロード) ==========
  // 手裏剣を投げる忍者。転職ごとに手裏剣が強化(鉄→氷→雷→火→魔)され攻撃回数も増える。
  // 2次からシャドーパートナー(分身)を召喚: 攻撃力50%で攻撃を反復。
  // 体数は2次1体/3次2体/4次3体/5次4体(1体増えるごとに分身の攻撃力-10%)。
  thief: {
    key: 'thief',
    name: '盗賊',
    maxhp: 300,
    maxmp: 160,
    atk: 22,
    speed: 132,
    jump: 345,
    tiers: [
      {
        minLevel: 1, jobName: '盗賊', rankName: '1次', spriteKey: 'thief', atkBonus: 1,
        skills: [
          { id: 't1a', name: 'ラッキーセブン', mp: 2, cd: 700, kind: 'projectile', mult: 1.5, hits: 2, proj: 2, speed: 300, pierce: false },
          { id: 't1b', name: 'ダブルスタブ', mp: 2, cd: 1200, kind: 'melee', mult: 1.5, hits: 2, range: 44 },
          { id: 't1c', name: 'ニンブルボディ', mp: 3, cd: 12000, kind: 'buff', mult: 0, hits: 0, durMs: 10000, defCut: 0.55 },
        ],
      },
      {
        minLevel: 10, jobName: 'アサシン', rankName: '2次', spriteKey: 'thief2', atkBonus: 1.25,
        skills: [
          { id: 't2a', name: 'トリプルスロー', mp: 2, cd: 750, kind: 'projectile', mult: 1.6, hits: 3, proj: 3, speed: 320, pierce: false },
          { id: 't2b', name: 'シャドーウェブ', mp: 3, cd: 1600, kind: 'freeze', mult: 1.4, hits: 2, radius: 80, durMs: 900, multi: true },
          { id: 't2c', name: 'シャドーパートナー', mp: 5, cd: 30000, kind: 'shadow', mult: 0, hits: 0, targets: 1, durMs: 30000 },
        ],
      },
      {
        minLevel: 30, jobName: 'ハーミット', rankName: '3次', spriteKey: 'thief3', atkBonus: 1.55,
        skills: [
          { id: 't3a', name: 'トリプルスロー', mp: 2, cd: 750, kind: 'projectile', mult: 1.6, hits: 3, proj: 3, speed: 320, pierce: false },
          { id: 't3b', name: '巨大クナイ', mp: 4, cd: 1800, kind: 'kunai', mult: 1.4, hits: 4, targets: 8, radius: 115, speed: 280 },
          { id: 't3c', name: 'シャドーパートナー', mp: 5, cd: 30000, kind: 'shadow', mult: 0, hits: 0, targets: 2, durMs: 30000 },
        ],
      },
      {
        minLevel: 60, jobName: 'ナイトロード', rankName: '4次', spriteKey: 'thief4', atkBonus: 2.0,
        skills: [
          { id: 't4a', name: 'クアドラプルスロー', mp: 3, cd: 850, kind: 'projectile', mult: 1.6, hits: 6, proj: 4, speed: 340, pierce: false },
          { id: 't4b', name: 'ショーダウン', mp: 4, cd: 1800, kind: 'aoe', mult: 1.8, hits: 6, radius: 104 },
          { id: 't4c', name: 'シャドーパートナー', mp: 6, cd: 30000, kind: 'shadow', mult: 0, hits: 0, targets: 3, durMs: 30000 },
        ],
      },
      {
        minLevel: 100, jobName: 'ナイトロード・極', rankName: '5次', spriteKey: 'thief5', atkBonus: 2.6,
        skills: [
          { id: 't5a', name: 'クアドラプルスロー', mp: 3, cd: 800, kind: 'projectile', mult: 1.8, hits: 8, proj: 4, speed: 360, pierce: false },
          { id: 't5b', name: 'スプレッドスロー', mp: 5, cd: 2200, kind: 'nova', mult: 1.8, hits: 7 },
          { id: 't5c', name: 'シャドーパートナー', mp: 7, cd: 30000, kind: 'shadow', mult: 0, hits: 0, targets: 4, durMs: 30000 },
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

// スタンス: 被弾時にノックバックしない確率
// 戦士: 転職ごとに+20%(1次20%〜5次100%) / 魔法使い: +10%(最大50%)
export function stanceChance(charKey: CharKey, level: number): number {
  const idx = tierIndexFor(CHARACTERS[charKey], level); // 0〜4
  if (charKey === 'warrior') return Math.min(1, (idx + 1) * 0.2);
  if (charKey === 'thief') return Math.min(0.75, (idx + 1) * 0.15);
  return Math.min(0.5, (idx + 1) * 0.1);
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

// モンスター型: mush/demon/drake/horntail/golem/beast   人型: knight/witch/clown/lord
export type BossArchetype = 'mush' | 'demon' | 'drake' | 'horntail' | 'golem' | 'beast' | 'knight' | 'witch' | 'clown' | 'lord';

// エリア/ダンジョンボスを弱→強で配置(★=5階層ごとの強敵)。人型と怪物型を作り分け
interface FloorSeed {
  key: string; name: string; title: string; req: number;
  arch: BossArchetype; tint: number; major?: boolean; scale?: number;
}
const FLOOR_SEEDS: FloorSeed[] = [
  { key: 'mushmom', name: 'マッシュモム', title: '森の主', req: 1, arch: 'mush', tint: 0xef7d2f, scale: 1.4 },
  { key: 'bluemushmom', name: 'ブルーマッシュモム', title: '青き森の主', req: 8, arch: 'mush', tint: 0x5a8fe0, scale: 1.45 },
  { key: 'faust', name: 'ファウスト', title: '闇の従者', req: 16, arch: 'knight', tint: 0x6a52b4, scale: 1.5 },
  { key: 'dyle', name: 'ダイル', title: '沼の捕食者', req: 24, arch: 'drake', tint: 0x4a9c3a, scale: 1.5 },
  { key: 'jrbalrog', name: 'ジュニアバルログ', title: '小さき災い', req: 32, arch: 'demon', tint: 0xc04a2a, major: true, scale: 2.2 },

  { key: 'stumpy', name: 'スタンピー', title: '怒れる古木', req: 42, arch: 'golem', tint: 0x8a5a32, scale: 1.5 },
  { key: 'griffey', name: 'グリフィー', title: '天空の猛禽', req: 52, arch: 'beast', tint: 0xe0a030, scale: 1.5 },
  { key: 'manon', name: 'マノン', title: '古龍', req: 64, arch: 'drake', tint: 0xd86a9c, scale: 1.6 },
  { key: 'anego', name: 'アネゴ', title: '夜叉の女傑', req: 76, arch: 'witch', tint: 0xd84a6a, scale: 1.5 },
  { key: 'crimsonbalrog', name: 'クリムゾンバルログ', title: '深紅の魔王', req: 88, arch: 'demon', tint: 0xd81a1a, major: true, scale: 2.5 },

  { key: 'dunas', name: 'デュナス', title: '機械龍', req: 100, arch: 'drake', tint: 0x4a7fd6, scale: 1.65 },
  { key: 'pierre', name: 'ピエール', title: '深淵の道化', req: 112, arch: 'clown', tint: 0xb04ad8, scale: 1.55 },
  { key: 'vonleon', name: 'ヴァンレオン', title: '獅子王', req: 124, arch: 'knight', tint: 0x3a6ae8, scale: 1.6 },
  { key: 'hilla', name: 'ヒルラ', title: '血の魔女', req: 136, arch: 'witch', tint: 0x8a1a4a, scale: 1.55 },
  { key: 'zakum', name: 'ザクム', title: '炎の巨神', req: 150, arch: 'golem', tint: 0xd8541a, major: true, scale: 2.7 },

  { key: 'horntail', name: 'ホーンテイル', title: '双頭の邪龍', req: 168, arch: 'horntail', tint: 0x3aa84a, scale: 2.4 },
  { key: 'magnus', name: 'マグナス', title: '堕ちた翼', req: 186, arch: 'knight', tint: 0x3a3a4a, scale: 1.65 },
  { key: 'lucid', name: 'ルシード', title: '夢幻の蝶', req: 204, arch: 'witch', tint: 0x6ad8c4, scale: 1.6 },
  { key: 'damien', name: 'デミアン', title: '絶望の剣', req: 224, arch: 'knight', tint: 0xc02a3a, scale: 1.7 },
  { key: 'blackmage', name: 'ブラックマゲ', title: '黒き魔導士', req: 250, arch: 'lord', tint: 0x2a1a3a, major: true, scale: 3.0 },
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
  scale: (s.scale ?? 1.5) * 1.5,  // 全ボス1.5倍(迫力重視)
}));

export const TOTAL_FLOORS = FLOORS.length;
export const GROUND_Y = 432;
export const WORLD_H = 600;
export const ARENA_W = 560; // 道場アリーナの横幅(狭め・道場らしく)

// ============================================================
// 難易度(クリアで次が解放。各段階で敵が強くなる)
// ============================================================
export interface DifficultyDef {
  key: string;
  name: string;
  flat: number;    // 推奨レベルの下限(段階間で確実に強くする)
  slope: number;   // 階層ごとの推奨レベルの伸び
  expMul: number;  // 経験値ボーナス
  hpMul: number;   // ボスHP補正(EASYは少し低め)
  color: number;
  desc: string;
}
// 実効推奨Lv = flat + baseReq(floor) * slope
// 前段階の最終階(=次段階の1階の手強さ)が次段階1階で「格段に強い」ようflatを設定
export const DIFFICULTIES: DifficultyDef[] = [
  { key: 'easy',   name: 'EASY',   flat: 0,   slope: 1.0, expMul: 1.0,  hpMul: 0.78, color: 0x4aa84a, desc: 'まずはここから (1階〜)' },
  { key: 'normal', name: 'NORMAL', flat: 28,  slope: 1.6, expMul: 1.6,  hpMul: 1.0,  color: 0x3a7fd6, desc: '1階から手強い (推奨Lv30〜)' },
  { key: 'hard',   name: 'HARD',   flat: 72,  slope: 2.6, expMul: 2.4,  hpMul: 1.0,  color: 0xd8730f, desc: '歴戦の挑戦者へ (推奨Lv75〜)' },
  { key: 'oni',    name: '鬼モード', flat: 150, slope: 4.0, expMul: 3.8, hpMul: 1.0,  color: 0xc02a3a, desc: 'Lv150以上で挑め (推奨Lv154〜)' },
];

// 階層×難易度の実効推奨レベル(敵の強さの基準)
export function effReq(f: FloorDef, diff: number): number {
  const d = DIFFICULTIES[diff];
  return Math.round(d.flat + f.reqLevel * d.slope);
}

// ボスのステータス(実効推奨レベルから算出)
export function bossHp(f: FloorDef, diff: number): number {
  return Math.round(refAtk(effReq(f, diff)) * (f.major ? 55 : 32) * DIFFICULTIES[diff].hpMul);
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

export interface CharProgress { level: number; exp: number; }

export interface SaveData {
  level: number;       // 現在選択中キャラのレベル
  exp: number;         // 現在選択中キャラの経験値
  charKey: CharKey;
  charLevels: Record<CharKey, CharProgress>;  // キャラごとの成長記録
  highestByDiff: number[];   // 難易度別の到達最高階層
  clearedByDiff: boolean[];  // 難易度別の20階制覇フラグ
  clears: number;
}

const SAVE_KEY = 'maple-quest-save-v3';

export const CHAR_KEYS: CharKey[] = ['warrior', 'mage', 'thief'];

function defaultSave(): SaveData {
  return {
    level: 1, exp: 0, charKey: 'warrior',
    charLevels: { warrior: { level: 1, exp: 0 }, mage: { level: 1, exp: 0 }, thief: { level: 1, exp: 0 } },
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
      const charKey: CharKey = s.charKey === 'mage' ? 'mage' : s.charKey === 'thief' ? 'thief' : 'warrior';
      const level = Math.max(1, Math.min(LEVEL_CAP, s.level || 1));
      const exp = Math.max(0, s.exp || 0);
      // キャラ別レベル(旧セーブからの移行: 現キャラに既存Lvを引き継ぎ、他はLv1)
      const cl = d.charLevels;
      const rawCl = s.charLevels as Partial<Record<CharKey, Partial<CharProgress>>> | undefined;
      if (rawCl) {
        for (const k of CHAR_KEYS) {
          const e = rawCl[k];
          if (e) cl[k] = { level: Math.max(1, Math.min(LEVEL_CAP, e.level || 1)), exp: Math.max(0, e.exp || 0) };
        }
      }
      cl[charKey] = { level, exp };  // 選択中キャラは常にトップレベルの値が正
      return {
        level, exp, charKey,
        charLevels: cl,
        highestByDiff: Array.isArray(s.highestByDiff) ? DIFFICULTIES.map((_, i) => Math.max(1, Math.min(TOTAL_FLOORS, s.highestByDiff![i] || 1))) : d.highestByDiff,
        clearedByDiff: Array.isArray(s.clearedByDiff) ? DIFFICULTIES.map((_, i) => !!s.clearedByDiff![i]) : d.clearedByDiff,
        clears: s.clears || 0,
      };
    }
  } catch { /* ignore */ }
  return defaultSave();
}

// タイトル画面でのキャラ切り替え: 現キャラの成長を保存し、新キャラの成長を読み込む
export function switchSaveChar(save: SaveData, key: CharKey): SaveData {
  if (key === save.charKey) return save;
  save.charLevels[save.charKey] = { level: save.level, exp: save.exp };
  save.charKey = key;
  save.level = save.charLevels[key].level;
  save.exp = save.charLevels[key].exp;
  return save;
}

// Lv1からやり直す(全進行をリセット)
export function resetSave(): SaveData {
  const d = defaultSave();
  writeSave(d);
  return d;
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
      thief: { hp: hpScale(CHARACTERS.thief.maxhp, save.level), mp: mpScale(CHARACTERS.thief.maxmp, save.level) },
    },
    elixirs: 12,
    startTime: Date.now(),
  };
}

// 数値表示(桁区切り)
export function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

// 大きい数値を 万/億/兆/京 単位で読みやすく表示
export function fmtBig(n: number): string {
  if (n < 10000) return Math.round(n).toLocaleString('en-US');
  const units: [number, string][] = [[1e16, '京'], [1e12, '兆'], [1e8, '億'], [1e4, '万']];
  for (const [v, u] of units) {
    if (n >= v) {
      const x = n / v;
      return (x >= 100 ? Math.round(x).toLocaleString('en-US') : x.toFixed(1).replace(/\.0$/, '')) + u;
    }
  }
  return Math.round(n).toLocaleString('en-US');
}

// ============================================================
// 無限ボスモード(1分間の累積ダメージ計測)
// ============================================================
export const INFINITE_TIME = 60;       // 秒
export const INFINITE_BASE_HP = 1000;  // 1ゲージ目のHP
export const INFINITE_MAX_GAUGE = 1000;

// Gゲージ目のHP上限(ゲージごとに2倍。1000まで=ほぼ無限)
export function gaugeMax(g: number): number {
  return INFINITE_BASE_HP * Math.pow(2, Math.min(g, INFINITE_MAX_GAUGE) - 1);
}
