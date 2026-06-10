// ============================================================
// ドット絵スプライト定義 & テクスチャ生成
// すべてのグラフィックはコード内のピクセルグリッドから生成する。
// '.' と ' ' は透明。行の長さは自動でパディングされる。
// ============================================================
import Phaser from 'phaser';

type Palette = Record<string, string>;
interface SpriteDef {
  palette: Palette;
  frames: string[][];
}

// ---------- 剣士 (16x23) ----------
const WARRIOR: SpriteDef = {
  palette: {
    h: '#6b4226', H: '#8a5a32', s: '#ffdcb0', S: '#e8b98a', k: '#2a2118',
    r: '#d23c3c', R: '#9c2230', e: '#f06a5a', b: '#2e4a8f', B: '#1f3263',
    o: '#5b3a22', m: '#c47a52', X: '#e3eaf2', x: '#9aabc0', g: '#f2c14e', n: '#7a4a21',
  },
  frames: [
    // 0: stand
    [
      '.....hhhhhh.....',
      '...hhhhhhhhhh...',
      '..hhhhhhhhhhhh..',
      '..hhHhhhhhHhhh..',
      '..hhhhhhhhhhhh..',
      '..eeeeeeeeeeee..',
      '..ssssssssssss..',
      '..sskksssskkss..',
      '..sskksssskkss..',
      '..ssssssssssss..',
      '..Sssssmmssss S.',
      '...ssssssssss...',
      '....rrrrrr....X.',
      '...rrrrrrrr...X.',
      '..ssrrrrrrss..X.',
      '..ssrRrrRrss..X.',
      '...rrrrrrrr...g.',
      '...RRrrrrRR...n.',
      '....bbbbbb......',
      '....bb..bb......',
      '....bb..bb......',
      '...oo....oo.....',
      '...oo....oo.....',
    ],
    // 1: walk A
    [
      '.....hhhhhh.....',
      '...hhhhhhhhhh...',
      '..hhhhhhhhhhhh..',
      '..hhHhhhhhHhhh..',
      '..hhhhhhhhhhhh..',
      '..eeeeeeeeeeee..',
      '..ssssssssssss..',
      '..sskksssskkss..',
      '..sskksssskkss..',
      '..ssssssssssss..',
      '..Sssssmmssss S.',
      '...ssssssssss...',
      '....rrrrrr....X.',
      '...rrrrrrrr...X.',
      '..ssrrrrrrss..X.',
      '..ssrRrrRrss..X.',
      '...rrrrrrrr...g.',
      '...RRrrrrRR...n.',
      '....bbbbbb......',
      '...bbb..bbb.....',
      '..bb......bb....',
      '..oo......oo....',
      '.oo........oo...',
    ],
    // 2: walk B
    [
      '.....hhhhhh.....',
      '...hhhhhhhhhh...',
      '..hhhhhhhhhhhh..',
      '..hhHhhhhhHhhh..',
      '..hhhhhhhhhhhh..',
      '..eeeeeeeeeeee..',
      '..ssssssssssss..',
      '..sskksssskkss..',
      '..sskksssskkss..',
      '..ssssssssssss..',
      '..Sssssmmssss S.',
      '...ssssssssss...',
      '....rrrrrr....X.',
      '...rrrrrrrr...X.',
      '..ssrrrrrrss..X.',
      '..ssrRrrRrss..X.',
      '...rrrrrrrr...g.',
      '...RRrrrrRR...n.',
      '....bbbbbb......',
      '....bbbbbb......',
      '.....bbbb.......',
      '....oo..oo......',
      '....oo..oo......',
    ],
    // 3: attack (剣を前へ振る)
    [
      '.....hhhhhh.....',
      '...hhhhhhhhhh...',
      '..hhhhhhhhhhhh..',
      '..hhHhhhhhHhhh..',
      '..hhhhhhhhhhhh..',
      '..eeeeeeeeeeee..',
      '..ssssssssssss..',
      '..sskksssskkss..',
      '..sskksssskkss..',
      '..ssssssssssss..',
      '..Sssssmmssss...',
      '...ssssssssss...',
      '....rrrrrr......',
      '...rrrrrrrrss...',
      '..rrrrrrrrssng..',
      '..rrrRrrRrr.XX..',
      '...rrrrrrrr.XX..',
      '...RRrrrrRR.XX..',
      '....bbbbbb..XX..',
      '...bb...bb..Xx..',
      '...bb...bb......',
      '..oo.....oo.....',
      '..oo.....oo.....',
    ],
  ],
};

// ---------- 魔法使い (16x23) ----------
const MAGE: SpriteDef = {
  palette: {
    t: '#3b56c4', T: '#283c8f', w: '#f5f0ff', y: '#f2c14e', Y: '#d8a32e',
    s: '#ffdcb0', S: '#e8b98a', k: '#2a2118', m: '#c47a52',
    r: '#4a63d8', R: '#32479f', u: '#8fa6ff', o: '#5b3a22', n: '#8a5a2b', j: '#e84a5f', J: '#ffb0bc',
  },
  frames: [
    // 0: stand
    [
      '.......tt.......',
      '......tttt......',
      '.....tttttt.....',
      '....tttttttt....',
      '...tTtttttTtt...',
      '.twtttttttttwt..',
      '.twwwwwwwwwwwt..',
      '..yyyyyyyyyyy.J.',
      '..ysssssssssy.j.',
      '..yskkssskksy.j.',
      '..yskkssskksy.n.',
      '..ssssssssssy.n.',
      '..Ssssmmsss.S.n.',
      '...ssssssss...n.',
      '....rrrrrr....n.',
      '...rrrrrrrr...n.',
      '..ssrrrrrrss..n.',
      '..ssruurrurs..n.',
      '...rrrrrrrrr....',
      '..rrrrrrrrrrr...',
      '..RrrrrrrrrrR...',
      '..RRRRRRRRRRR...',
      '...oo.....oo....',
    ],
    // 1: walk A
    [
      '.......tt.......',
      '......tttt......',
      '.....tttttt.....',
      '....tttttttt....',
      '...tTtttttTtt...',
      '.twtttttttttwt..',
      '.twwwwwwwwwwwt..',
      '..yyyyyyyyyyy.J.',
      '..ysssssssssy.j.',
      '..yskkssskksy.j.',
      '..yskkssskksy.n.',
      '..ssssssssssy.n.',
      '..Ssssmmsss.S.n.',
      '...ssssssss...n.',
      '....rrrrrr....n.',
      '...rrrrrrrr...n.',
      '..ssrrrrrrss..n.',
      '..ssruurrurs..n.',
      '...rrrrrrrrr....',
      '..rrrrrrrrrr....',
      '..RrrrrrrrrR....',
      '..RRRRRRRRRR....',
      '..oo......oo....',
    ],
    // 2: walk B
    [
      '.......tt.......',
      '......tttt......',
      '.....tttttt.....',
      '....tttttttt....',
      '...tTtttttTtt...',
      '.twtttttttttwt..',
      '.twwwwwwwwwwwt..',
      '..yyyyyyyyyyy.J.',
      '..ysssssssssy.j.',
      '..yskkssskksy.j.',
      '..yskkssskksy.n.',
      '..ssssssssssy.n.',
      '..Ssssmmsss.S.n.',
      '...ssssssss...n.',
      '....rrrrrr....n.',
      '...rrrrrrrr...n.',
      '..ssrrrrrrss..n.',
      '..ssruurrurs..n.',
      '...rrrrrrrrr....',
      '...rrrrrrrrr....',
      '...RrrrrrrrR....',
      '...RRRRRRRRR....',
      '....oo..oo......',
    ],
    // 3: cast (杖を前へ)
    [
      '.......tt.......',
      '......tttt......',
      '.....tttttt.....',
      '....tttttttt....',
      '...tTtttttTtt...',
      '.twtttttttttwt..',
      '.twwwwwwwwwwwt..',
      '..yyyyyyyyyyy...',
      '..ysssssssssy...',
      '..yskkssskksy...',
      '..yskkssskksy...',
      '..ssssssssssy...',
      '..Ssssmmsss.....',
      '...ssssssss.....',
      '....rrrrrrss.nJ.',
      '...rrrrrrrssnnj.',
      '..rrrrrrrrr..nj.',
      '..rruurrunr..n..',
      '...rrrrrrrrr....',
      '..rrrrrrrrrrr...',
      '..RrrrrrrrrrR...',
      '..RRRRRRRRRRR...',
      '...oo.....oo....',
    ],
  ],
};

// ---------- ブルースネイル (14x11) ----------
const SNAIL: SpriteDef = {
  palette: {
    u: '#4a7fd6', U: '#2f5aa8', w: '#cfe3ff', c: '#e8dcb0', C: '#c4b486', k: '#2a2118',
  },
  frames: [
    [
      '....uuuuuu....',
      '...uuuuuuuu...',
      '..uuUUUUuuuu..',
      '..uUUwwwUUuu..',
      '..uUwwuuwUuu..',
      '..uUUwuuwUuu..',
      '..uuUUwwUUuu..',
      '.ccuuUUUUuucc.',
      'ckcccccccccccc',
      '.cccccccccccc.',
      '..CCCCCCCCCC..',
    ],
    [
      '....uuuuuu....',
      '...uuuuuuuu...',
      '..uuUUUUuuuu..',
      '..uUUwwwUUuu..',
      '..uUwwuuwUuu..',
      '..uUUwuuwUuu..',
      '..uuUUwwUUuu..',
      '..cuuUUUUuuc..',
      '.ckcccccccccc.',
      '..cccccccccc..',
      '...CCCCCCCC...',
    ],
  ],
};

// ---------- オレンジマッシュ (16x15) ----------
const MUSHROOM: SpriteDef = {
  palette: {
    a: '#ef7d2f', A: '#c95a1a', w: '#fff4e0', f: '#f7dfae', F: '#d9b97e',
    k: '#2a2118', m: '#c47a52', p: '#f5a0a0',
  },
  frames: [
    [
      '......aaaaaa....',
      '....aaaaaaaaaa..',
      '...aawwaaaaaaaa.',
      '..aaawwaaaaaaaa.',
      '..aaaaaaaaawwaa.',
      '..aaaaaaaaawwaa.',
      '..aAAAAAAAAAAAa.',
      '...AAAAAAAAAAA..',
      '....ffffffffff..',
      '....fkkffffkkf..',
      '....fkkffffkkf..',
      '....pffffffffp..',
      '.....fffmmfff...',
      '......FF..FF....',
      '......FF..FF....',
    ],
    [
      '......aaaaaa....',
      '....aaaaaaaaaa..',
      '...aawwaaaaaaaa.',
      '..aaawwaaaaaaaa.',
      '..aaaaaaaaawwaa.',
      '..aaaaaaaaawwaa.',
      '..aAAAAAAAAAAAa.',
      '...AAAAAAAAAAA..',
      '....ffffffffff..',
      '....fkkffffkkf..',
      '....fkkffffkkf..',
      '....pffffffffp..',
      '.....fffmmfff...',
      '.....FF....FF...',
      '....FF......FF..',
    ],
  ],
};

// ---------- グリーンスライム (14x12) ----------
const SLIME: SpriteDef = {
  palette: {
    e: '#58c443', E: '#3c9230', d: '#8ee07a', k: '#2a2118', m: '#2f7a22',
  },
  frames: [
    [
      '......ee......',
      '.....eeee.....',
      '....eeeeee....',
      '...eedeeeee...',
      '..eeddeeeeee..',
      '.eeedeeeeeeee.',
      '.eeeeeeeeeeee.',
      '.ekkeeeeekkee.',
      '.ekkeeeeekkee.',
      '.eeeeemmeeeee.',
      '.EEeeeeeeeeEE.',
      '..EEEEEEEEEE..',
    ],
    [
      '..............',
      '......ee......',
      '.....eeee.....',
      '....eedeee....',
      '..eeeddeeeee..',
      '.eeeedeeeeeee.',
      'eeeeeeeeeeeeee',
      'ekkeeeeeeekkee',
      'ekkeeeeeeekkee',
      'eeeeeemmeeeeee',
      'EEeeeeeeeeeeEE',
      '.EEEEEEEEEEEE.',
    ],
  ],
};

// ---------- リボンブタ (16x13) ----------
const PIG: SpriteDef = {
  palette: {
    p: '#f4a7b9', P: '#d97f96', n: '#e8829e', k: '#2a2118', r: '#d8333f', R: '#9c1f2d', w: '#ffd7e2',
  },
  frames: [
    [
      '..rr............',
      '.rrrr...........',
      '..rRr.pp...pp...',
      '...rpppp...pp...',
      '..pppppppppppp..',
      '.pppppppppppppp.',
      '.ppkkpppppkkppp.',
      '.ppkkpppppkkppp.',
      'wpppppnnnppppppw',
      'wpppppnknpppppww',
      '.ppppppnnpppppp.',
      '..PPpppppppPP...',
      '..PP.......PP...',
    ],
    [
      '..rr............',
      '.rrrr...........',
      '..rRr.pp...pp...',
      '...rpppp...pp...',
      '..pppppppppppp..',
      '.pppppppppppppp.',
      '.ppkkpppppkkppp.',
      '.ppkkpppppkkppp.',
      'wpppppnnnppppppw',
      'wpppppnknpppppww',
      '.ppppppnnpppppp.',
      '..PPP.....PPP...',
      '.PP.........PP..',
    ],
  ],
};

// ---------- ダークバット (18x12) ----------
const BAT: SpriteDef = {
  palette: {
    v: '#6a4a9c', V: '#4a3270', d: '#8a66c4', k: '#2a2118', w: '#ffffff', f: '#e8e0ff',
  },
  frames: [
    [
      'v................v',
      'vv..............vv',
      'vvv....vvvv....vvv',
      'vdvv..vvvvvv..vvdv',
      'vddvvvvvvvvvvvvddv',
      '.vvvvwkvvvvkwvvvv.',
      '..vvvwkvvvvkwvvv..',
      '...vvvvvvvvvvvv...',
      '....vvfvvvvfvv....',
      '.....Vvvvvvvv.....',
      '......VVVVVV......',
      '.......V..V.......',
    ],
    [
      '..................',
      '..................',
      '.......vvvv.......',
      '..vv..vvvvvv..vv..',
      '.vvvvvvvvvvvvvvvv.',
      'vvvvvwkvvvvkwvvvvv',
      'vvvvvwkvvvvkwvvvvv',
      '.vvvvvvvvvvvvvvvv.',
      '..vvvvfvvvvfvvvv..',
      '....VvvvvvvvvV....',
      '......VVVVVV......',
      '.......V..V.......',
    ],
  ],
};

// ---------- ゾンビマッシュ (16x16) ----------
const ZOMBIESHROOM: SpriteDef = {
  palette: {
    a: '#7a8a99', A: '#56636f', w: '#aab8c4', f: '#c9d4b0', F: '#a4b08a',
    k: '#1d2a14', m: '#5a6b4a', x: '#d8e44a',
  },
  frames: [
    [
      '......aaaaaa....',
      '....aaaaaaaaaa..',
      '...aawwaaaaaaaa.',
      '..aaawwaaaaaaaa.',
      '..aaaaaaaaawwaa.',
      '..aaaaaaaaawwaa.',
      '..aAAAAAAAAAAAa.',
      '...AAAAAAAAAAA..',
      '....ffffffffff..',
      '....fxxffffxxf..',
      '....fxkffffkxf..',
      '....ffffffffff..',
      '....ffmmmmmfff..',
      '.....fmfffmff...',
      '......FF..FF....',
      '......FF..FF....',
    ],
    [
      '......aaaaaa....',
      '....aaaaaaaaaa..',
      '...aawwaaaaaaaa.',
      '..aaawwaaaaaaaa.',
      '..aaaaaaaaawwaa.',
      '..aaaaaaaaawwaa.',
      '..aAAAAAAAAAAAa.',
      '...AAAAAAAAAAA..',
      '....ffffffffff..',
      '....fxxffffxxf..',
      '....fxkffffkxf..',
      '....ffffffffff..',
      '....ffmmmmmfff..',
      '.....fmfffmff...',
      '.....FF....FF...',
      '....FF......FF..',
    ],
  ],
};

// ---------- ボス: マッシュモム (32x28) ----------
const MUSHMOM: SpriteDef = {
  palette: {
    a: '#ef7d2f', A: '#c95a1a', w: '#fff4e0', f: '#f7dfae', F: '#d9b97e',
    k: '#2a2118', m: '#8a4a2a', r: '#d23c3c',
  },
  frames: [
    [
      '............aaaaaaaa............',
      '.........aaaaaaaaaaaaaa........',
      '.......aaaaaaaaaaaaaaaaaa......',
      '.....aaawwwaaaaaaaaaaaaaaaa....',
      '....aaawwwwwaaaaaaaaaaaaaaaa...',
      '...aaaawwwaaaaaaaaaawwwwaaaaa..',
      '..aaaaaaaaaaaaaaaaawwwwwwaaaa..',
      '..aaaaaaaaaawwaaaaaawwwwaaaaaa.',
      '.aaaaaaaaaawwwwaaaaaaaaaaaaaaa.',
      '.aaaaaaaaaaawwaaaaaaaaaaaaaaaa.',
      '.aaAAAAAAAAAAAAAAAAAAAAAAAAAa..',
      '..AAAAAAAAAAAAAAAAAAAAAAAAAA...',
      '...ffffffffffffffffffffffff....',
      '...ffkkkffffffffffffkkkfff.....',
      '...ffffkkffffffffffkkfffff.....',
      '...fffffkkffffffffkkffffff.....',
      '...ffffffffffffffffffffff......',
      '...fffffffmmmmmmmmfffffff......',
      '...ffffffmmffffffmmffffff......',
      '...ffffffffffffffffffffff......',
      '....ffffffffffffffffffff.......',
      '....ffffffffffffffffffff.......',
      '.....FFFF..........FFFF........',
      '.....FFFF..........FFFF........',
      '.....FFFF..........FFFF........',
      '....FFFF............FFFF.......',
      '....FFFF............FFFF.......',
      '................................',
    ],
    [
      '............aaaaaaaa............',
      '.........aaaaaaaaaaaaaa........',
      '.......aaaaaaaaaaaaaaaaaa......',
      '.....aaawwwaaaaaaaaaaaaaaaa....',
      '....aaawwwwwaaaaaaaaaaaaaaaa...',
      '...aaaawwwaaaaaaaaaawwwwaaaaa..',
      '..aaaaaaaaaaaaaaaaawwwwwwaaaa..',
      '..aaaaaaaaaawwaaaaaawwwwaaaaaa.',
      '.aaaaaaaaaawwwwaaaaaaaaaaaaaaa.',
      '.aaaaaaaaaaawwaaaaaaaaaaaaaaaa.',
      '.aaAAAAAAAAAAAAAAAAAAAAAAAAAa..',
      '..AAAAAAAAAAAAAAAAAAAAAAAAAA...',
      '...ffffffffffffffffffffffff....',
      '...ffkkkffffffffffffkkkfff.....',
      '...ffffkkffffffffffkkfffff.....',
      '...fffffkkffffffffkkffffff.....',
      '...ffffffffffffffffffffff......',
      '...fffffffmmmmmmmmfffffff......',
      '...ffffffmmffffffmmffffff......',
      '...ffffffffffffffffffffff......',
      '....ffffffffffffffffffff.......',
      '....ffffffffffffffffffff.......',
      '.....FFFF..........FFFF........',
      '.....FFFF..........FFFF........',
      '....FFFF............FFFF.......',
      '...FFFF..............FFFF......',
      '...FFFF..............FFFF......',
      '................................',
    ],
  ],
};

// ---------- ボス: ピンクビーン風 (28x28) ----------
const PINKBEAN: SpriteDef = {
  palette: {
    p: '#ff9ecb', P: '#e570a8', i: '#c4538a', w: '#ffffff', k: '#2a2118',
    m: '#b04a78', y: '#f2c14e', Y: '#d8a32e',
  },
  frames: [
    [
      '....pp..............pp......',
      '...pppp............pppp.....',
      '...pipp............ppip.....',
      '...pipp............ppip.....',
      '...pipp............ppip.....',
      '...pppp............pppp.....',
      '....pppp..........pppp......',
      '....ppppp..yyyy..ppppp......',
      '.....pppppyyYYyypppp........',
      '......ppppppppppppp.........',
      '.....ppppppppppppppp........',
      '....ppppppppppppppppp.......',
      '...ppppppppppppppppppp......',
      '..pppwwkkppppppppwwkkpp.....',
      '..pppwwkkppppppppwwkkpp.....',
      '..ppppppppppppppppppppp.....',
      '..pppppppppmmmmppppppppp....',
      '.pppppppppmmppmmppppppppp...',
      '.ppppppppppwwwwpppppppppp...',
      '.pppppppppwwwwwwppppppppp...',
      '.pppppppppwwwwwwppppppppp...',
      '.ppppppppppwwwwpppppppppp...',
      '..PpppppppppppppppppppppP....',
      '..PPpppppppppppppppppppPP....',
      '...PPPpppppppppppppppPPP.....',
      '....PPPPPPPPPPPPPPPPPPP......',
      '.....PP....PPPP.....PP.......',
      '....PPP....PPPP.....PPP......',
    ],
    [
      '....pp..............pp......',
      '...pppp............pppp.....',
      '...pipp............ppip.....',
      '...pipp............ppip.....',
      '...pppp............pppp.....',
      '....pppp..........pppp......',
      '.....pppp..yyyy..pppp.......',
      '.....ppppyyyYYyyppppp.......',
      '......ppppppppppppp.........',
      '.....ppppppppppppppp........',
      '....ppppppppppppppppp.......',
      '...ppppppppppppppppppp......',
      '..pppkkwwppppppppkkwwpp.....',
      '..pppkkwwppppppppkkwwpp.....',
      '..ppppppppppppppppppppp.....',
      '..pppppppppmmmmppppppppp....',
      '.pppppppppmmppmmppppppppp...',
      '.ppppppppppwwwwpppppppppp...',
      '.pppppppppwwwwwwppppppppp...',
      '.pppppppppwwwwwwppppppppp...',
      '.ppppppppppwwwwpppppppppp...',
      '..PpppppppppppppppppppppP....',
      '..PPpppppppppppppppppppPP....',
      '...PPPpppppppppppppppPPP.....',
      '....PPPPPPPPPPPPPPPPPPP......',
      '....PPP....PPPP.....PPP......',
      '.....PP....PPPP.....PP.......',
    ],
  ],
};

// ---------- ボス: シグナス風 (40x36) ----------
const CYGNUS: SpriteDef = {
  palette: {
    y: '#efe2b8', Y: '#d6c188', g: '#f2c14e', G: '#d8a32e',
    s: '#ffe4c4', S: '#e8c19a', k: '#2a2118', u: '#4a7fd6',
    w: '#ffffff', W: '#cfd8ea', f: '#f4f8ff', F: '#c8d6ec', m: '#d88a8a',
  },
  frames: [
    [
      '..................g.....................',
      '.................ggg....................',
      '...............g.ggg.g.................',
      '...............gggggggg................',
      '...............yyyyyyyy................',
      '.............yyyyyyyyyyyy..............',
      '............yyyyyyyyyyyyyy.............',
      '...........yyyyyyyyyyyyyyyy............',
      'ff.........yyyssssssssssyyy.........ff.',
      'fff........yyssssssssssssyy........fff.',
      'ffff.......yyskkssssssskksyy......ffff.',
      'fffff......yyskkssssssskksyy.....fffff.',
      'ffffff.....yysssssssssssssyy....ffffff.',
      'fffffff....yyssssmmmmsssssyy...fffffff.',
      'ffffffff....yysssssssssssyy...ffffffff.',
      'fFffffff....yyyssssssssyyyy...ffffffFf.',
      'fFfffffff....yywwwwwwwwyy....fffffffFf.',
      '.FFffffff...yywwwwwwwwwwyy...ffffffFF..',
      '.FFFfffff..yywwwuwwwwuwwwyy..fffffFFF..',
      '..FFFffff..sswwwuwwwwuwwwss..ffffFFF...',
      '..FFFFfff..sswwwwwwwwwwwwss..fffFFFF...',
      '...FFFFff...wwwwwwwwwwwwww...ffFFFF....',
      '....FFFF....wwwwwwwwwwwwww....FFFF.....',
      '.....FF....wwwwwwwwwwwwwwww....FF......',
      '...........wwwwwwwwwwwwwwww............',
      '..........wwwwwwwwwwwwwwwwww...........',
      '..........wwwwwwwwwwwwwwwwww...........',
      '.........wwwwwwwwwwwwwwwwwwww..........',
      '.........wwWWwwwwwwwwwwwwWWww..........',
      '........wwWWwwwwwwwwwwwwwwWWww.........',
      '........wWWwwwwwwwwwwwwwwwwWWw.........',
      '.......wWWwwwwwwwwwwwwwwwwwwWWw........',
      '.......WWWWWWWWWWWWWWWWWWWWWWWW........',
      '........uuuuuuuuuuuuuuuuuuuuuu.........',
      '........yy..................yy.........',
      '........yy..................yy.........',
    ],
    [
      '..................g.....................',
      '.................ggg....................',
      '...............g.ggg.g.................',
      '...............gggggggg................',
      '...............yyyyyyyy................',
      '.............yyyyyyyyyyyy..............',
      '............yyyyyyyyyyyyyy.............',
      '...........yyyyyyyyyyyyyyyy............',
      '.f.........yyyssssssssssyyy.........f..',
      'fff........yyssssssssssssyy........fff.',
      'ffff.......yyskkssssssskksyy......ffff.',
      'ffffff.....yyskkssssssskksyy....ffffff.',
      'fffffff....yysssssssssssssyy...fffffff.',
      'ffffffff...yyssssmmmmsssssyy..ffffffff.',
      'fffffffff...yysssssssssssyy..fffffffff.',
      'fFffffffff..yyyssssssssyyyy.ffffffffFf.',
      'fFffffffff...yywwwwwwwwyy...ffffffffFf.',
      '.FFfffffff..yywwwwwwwwwwyy..fffffffFF..',
      '.FFFffffff.yywwwuwwwwuwwwyy.ffffffFFF..',
      '..FFFfffff.sswwwuwwwwuwwwss.fffffFFF...',
      '..FFFFffff.sswwwwwwwwwwwwss.ffffFFFF...',
      '...FFFFfff..wwwwwwwwwwwwww..fffFFFF....',
      '....FFFFf...wwwwwwwwwwwwww...fFFFF.....',
      '.....FFF...wwwwwwwwwwwwwwww...FFF......',
      '...........wwwwwwwwwwwwwwww............',
      '..........wwwwwwwwwwwwwwwwww...........',
      '..........wwwwwwwwwwwwwwwwww...........',
      '.........wwwwwwwwwwwwwwwwwwww..........',
      '.........wwWWwwwwwwwwwwwwWWww..........',
      '........wwWWwwwwwwwwwwwwwwWWww.........',
      '........wWWwwwwwwwwwwwwwwwwWWw.........',
      '.......wWWwwwwwwwwwwwwwwwwwwWWw........',
      '.......WWWWWWWWWWWWWWWWWWWWWWWW........',
      '........uuuuuuuuuuuuuuuuuuuuuu.........',
      '........yy..................yy.........',
      '........yy..................yy.........',
    ],
  ],
};

// ---------- エフェクト ----------
const SLASH: SpriteDef = {
  palette: { w: '#ffffff', y: '#ffe98a', o: '#ffb347' },
  frames: [
    [
      '..........ww',
      '........wwww',
      '......wwwwy.',
      '....wwwyyy..',
      '...wwyyy....',
      '..wwyyo.....',
      '..wyyo......',
      '.wwyo.......',
      '.wyyo.......',
      '.wyo........',
      '.wyo........',
      '.wyo........',
      '.wyyo.......',
      '..wyyo......',
      '..wwyyo.....',
      '...wwyyy....',
    ],
    [
      '............',
      '..........ww',
      '.......wwwww',
      '.....wwwyyy.',
      '...wwwyyy...',
      '..wwyyoo....',
      '.wwyyo......',
      '.wyyo.......',
      'wwyo........',
      'wyyo........',
      'wyo.........',
      'wyyo........',
      '.wyyo.......',
      '..wwyyo.....',
      '....wwyyy...',
      '......wwyyy.',
    ],
  ],
};

const CLAW: SpriteDef = {
  palette: { b: '#7ab8ff', B: '#3a7fd6', w: '#e8f4ff' },
  frames: [
    [
      'w.............',
      'bw............',
      '.bw...w.......',
      '..bw..bw......',
      '...bw..bw...w.',
      '....bw..bw..bw',
      '.....bw..bw..b',
      '......bw..bw..',
      '.......bw..bw.',
      '........bw..bw',
      '.........B...B',
    ],
    [
      '..w...........',
      '..bw....w.....',
      '...bw...bw....',
      '....bw...bw...',
      '.....bw...bw..',
      '......bw...bw.',
      '.......bw...bw',
      '........bw...b',
      '.........bw...',
      '..........bw..',
      '...........B..',
    ],
  ],
};

const FIREBALL: SpriteDef = {
  palette: { r: '#ff5a2a', o: '#ffa02a', y: '#ffe45a', w: '#fff8d8' },
  frames: [
    [
      '....rrrr....',
      '..rroooorr..',
      '.rrooyyyoor.',
      'rrooyywwyoor',
      'rrooyywwyoor',
      '.rrooyyyoor.',
      '..rroooorr..',
      '....rrrr....',
    ],
  ],
};

const BOLT: SpriteDef = {
  palette: { y: '#ffe45a', w: '#ffffff', o: '#ffb347' },
  frames: [
    [
      '....wyyo..',
      '....wyyo..',
      '...wyyo...',
      '...wyyo...',
      '..wyyo....',
      '..wyyoooo.',
      '.wyyyyyyo.',
      '.ooowyyo..',
      '...wyyo...',
      '...wyo....',
      '..wyyo....',
      '..wyo.....',
      '.wyyo.....',
      '.wyo......',
      'wyo.......',
      'wo........',
    ],
  ],
};

const HEAL: SpriteDef = {
  palette: { g: '#6ae45a', w: '#d8ffd0', G: '#3aa82e' },
  frames: [
    [
      '.....gg.....',
      '.....gg.....',
      '....gwwg....',
      '.gggwwwwggg.',
      'ggwwwwwwwwgg',
      'ggwwwwwwwwgg',
      '.gggwwwwggg.',
      '....gwwg....',
      '.....gg.....',
      '.....gg.....',
    ],
    [
      '.....GG.....',
      '....GggG....',
      '...GgwwgG...',
      '..GgwwwwgG..',
      '.GgwwwwwwgG.',
      '.GgwwwwwwgG.',
      '..GgwwwwgG..',
      '...GgwwgG...',
      '....GggG....',
      '.....GG.....',
    ],
  ],
};

const ORB: SpriteDef = {
  palette: { p: '#ff9ecb', P: '#e570a8', w: '#ffe4f0' },
  frames: [
    [
      '..pppp..',
      '.pwwppp.',
      'pwwppppp',
      'pwpppppP',
      'pppppppP',
      'ppppppPP',
      '.pppPPP.',
      '..PPPP..',
    ],
  ],
};

const FEATHER: SpriteDef = {
  palette: { w: '#ffffff', W: '#c8d6ec', u: '#7ab8ff' },
  frames: [
    [
      '........ww..',
      '.....wwwwww.',
      '..wwwwwwwwW.',
      'uwwwwwwwWW..',
      '.uWWWWWWW...',
      '...uuWW.....',
    ],
  ],
};

const STAR: SpriteDef = {
  palette: { y: '#ffe45a', w: '#ffffff' },
  frames: [
    [
      '...yy...',
      '...yy...',
      '.yywwyy.',
      'yywwwwyy',
      'yywwwwyy',
      '.yywwyy.',
      '...yy...',
      '...yy...',
    ],
  ],
};

const PORTAL: SpriteDef = {
  palette: { b: '#4a7fd6', B: '#2f5aa8', w: '#bfe0ff', c: '#7ab8ff' },
  frames: [
    [
      '....bbbbbb....',
      '..bbbccccbb...',
      '.bbcwwwwwcbb..',
      '.bcwwbbwwwcb..',
      'bbcwbbbbwwcbb.',
      'bcwwbwwbbwwcb.',
      'bcwbbwwwbbwcb.',
      'bcwbbwwwbbwcb.',
      'bcwwbbwwbbwcb.',
      'bbcwwbbbbwcbb.',
      '.bcwwwbbwwcb..',
      '.bbcwwwwwcbb..',
      '..bbbccccbb...',
      '....bbbbbb....',
    ],
    [
      '....bbbbbb....',
      '..bbbwwwwbb...',
      '.bbwccccwwbb..',
      '.bwccbbccwwb..',
      'bbwcbbbbccwbb.',
      'bwccbccbbccwb.',
      'bwcbbcccbbcwb.',
      'bwcbbcccbbcwb.',
      'bwccbbccbbcwb.',
      'bbwccbbbbcwbb.',
      '.bwcccbbccwb..',
      '.bbwccccwwbb..',
      '..bbbwwwwbb...',
      '....bbbbbb....',
    ],
  ],
};

// ---------- 回復薬アイコン ----------
const POTION_HP: SpriteDef = {
  palette: { r: '#e8443a', R: '#a82820', w: '#ffd8d0', c: '#d8a05a', g: '#f0f0f0' },
  frames: [
    [
      '....cc....',
      '....cc....',
      '...gggg...',
      '...grrg...',
      '..grrrrg..',
      '.grrwrrrg.',
      '.grwwrrrg.',
      '.grrrrrrg.',
      '.gRrrrrRg.',
      '..gRRRRg..',
      '...gggg...',
    ],
  ],
};

const POTION_MP: SpriteDef = {
  palette: { r: '#3a6ae8', R: '#2038a8', w: '#d0e0ff', c: '#d8a05a', g: '#f0f0f0' },
  frames: [
    [
      '....cc....',
      '....cc....',
      '...gggg...',
      '...grrg...',
      '..grrrrg..',
      '.grrwrrrg.',
      '.grwwrrrg.',
      '.grrrrrrg.',
      '.gRrrrrRg.',
      '..gRRRRg..',
      '...gggg...',
    ],
  ],
};

// ---------- 背景: 木 (26x32) ----------
const TREE: SpriteDef = {
  palette: {
    g: '#4a9c3a', G: '#357a28', d: '#6ab84e', t: '#7a5230', T: '#5a3a20',
  },
  frames: [
    [
      '.........gggggg.........',
      '.......gggggggggg.......',
      '.....gggggdddggggg......',
      '....ggggdddddgggggg.....',
      '...gggggddddggggggggg...',
      '..gggggggddgggggggggg...',
      '..ggggggggggggggdddgg...',
      '.ggggggggggggggddddggg..',
      '.ggGGgggggggggggddgggg..',
      '.gGGGGgggggggggggggggg..',
      '.gGGgggggggggggggGGggg..',
      '.ggggggggggggggGGGGgg...',
      '..ggggggggggggggGGgg....',
      '..GGggggggggggggggggg...',
      '...GGGgggggggggggGG.....',
      '....GGGGgggggGGGGG......',
      '......GGGGGGGGGG........',
      '.........tttt...........',
      '.........tttt...........',
      '.........tTtt...........',
      '.........tTtt...........',
      '........ttTttt..........',
      '........tTTttt..........',
      '.......ttTTtttt.........',
      '.......tTTTttttt........',
      '......ttTTTtttttt.......',
    ],
  ],
};

// ---------- 雲 (24x10) ----------
const CLOUD: SpriteDef = {
  palette: { w: '#ffffff', W: '#e0ecff' },
  frames: [
    [
      '......wwwwww............',
      '....wwwwwwwwww..........',
      '...wwwwwwwwwwww.wwww....',
      '..wwwwwwwwwwwwwwwwwwww..',
      '.wwwwwwwwwwwwwwwwwwwwww.',
      'wwwwwwwwwwwwwwwwwwwwwwww',
      'wwwwwwwwwwwwwwwwwwwwwwww',
      '.WWwwwwwwwwwwwwwwwwwwWW.',
      '..WWWwwwwwwwwwwwwwwWWW..',
      '....WWWWWWWWWWWWWWWW....',
    ],
  ],
};

// ============================================================
// タイルテクスチャ(プロシージャル生成)
// ============================================================
function makeTile(scene: Phaser.Scene, key: string, theme: 'grass' | 'sky' | 'dark') {
  const size = 16;
  const tex = scene.textures.createCanvas(key, size, size)!;
  const ctx = tex.getContext();
  const rnd = (seed: number) => {
    // 簡易シード乱数(タイルの見た目を毎回同じにする)
    let s = seed;
    return () => ((s = (s * 9301 + 49297) % 233280), s / 233280);
  };
  const r = rnd(key.length * 7 + 13);
  if (theme === 'grass') {
    ctx.fillStyle = '#8a5a32';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = r() > 0.5 ? '#7a4c28' : '#9c6a3c';
      ctx.fillRect(Math.floor(r() * size), 5 + Math.floor(r() * (size - 5)), 2, 2);
    }
    ctx.fillStyle = '#5fae3c';
    ctx.fillRect(0, 0, size, 5);
    ctx.fillStyle = '#7ec850';
    ctx.fillRect(0, 0, size, 3);
    ctx.fillStyle = '#a4e070';
    for (let i = 0; i < 4; i++) ctx.fillRect(Math.floor(r() * size), 0, 2, 1);
    ctx.fillStyle = '#4a8c30';
    for (let i = 0; i < 5; i++) ctx.fillRect(Math.floor(r() * size), 4, 2, 2);
  } else if (theme === 'sky') {
    ctx.fillStyle = '#dfe9f5';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, 4);
    ctx.fillStyle = '#c2d4ea';
    for (let i = 0; i < 10; i++)
      ctx.fillRect(Math.floor(r() * size), 6 + Math.floor(r() * 10), 3, 2);
    ctx.fillStyle = '#aabfdd';
    ctx.fillRect(0, size - 2, size, 2);
  } else {
    ctx.fillStyle = '#3a3050';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#4a3f66';
    ctx.fillRect(0, 0, size, 4);
    ctx.fillStyle = '#574a78';
    ctx.fillRect(0, 0, size, 2);
    ctx.fillStyle = '#2c2440';
    for (let i = 0; i < 8; i++)
      ctx.fillRect(Math.floor(r() * size), 5 + Math.floor(r() * 10), 3, 2);
    // 紫の光る模様
    ctx.fillStyle = '#7a5acc';
    if (r() > 0.4) ctx.fillRect(Math.floor(r() * 12) + 2, 8, 2, 2);
  }
  tex.refresh();

  // 草・表面なしの「土だけ」タイル(地面の下層用)
  const dirt = scene.textures.createCanvas(`${key}_dirt`, size, size)!;
  const dctx = dirt.getContext();
  const r2 = rnd(key.length * 11 + 29);
  if (theme === 'grass') {
    dctx.fillStyle = '#8a5a32';
    dctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 16; i++) {
      dctx.fillStyle = r2() > 0.5 ? '#7a4c28' : '#9c6a3c';
      dctx.fillRect(Math.floor(r2() * size), Math.floor(r2() * size), 2, 2);
    }
  } else if (theme === 'sky') {
    dctx.fillStyle = '#c2d4ea';
    dctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 12; i++) {
      dctx.fillStyle = r2() > 0.5 ? '#aabfdd' : '#d4e2f4';
      dctx.fillRect(Math.floor(r2() * size), Math.floor(r2() * size), 3, 2);
    }
  } else {
    dctx.fillStyle = '#2c2440';
    dctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 12; i++) {
      dctx.fillStyle = r2() > 0.5 ? '#241d36' : '#3a3050';
      dctx.fillRect(Math.floor(r2() * size), Math.floor(r2() * size), 3, 2);
    }
  }
  dirt.refresh();
}

// ============================================================
// 生成本体
// ============================================================
const SPRITES: Record<string, SpriteDef> = {
  warrior: WARRIOR,
  mage: MAGE,
  snail: SNAIL,
  mushroom: MUSHROOM,
  slime: SLIME,
  pig: PIG,
  bat: BAT,
  zombieshroom: ZOMBIESHROOM,
  mushmom: MUSHMOM,
  pinkbean: PINKBEAN,
  cygnus: CYGNUS,
  fx_slash: SLASH,
  fx_claw: CLAW,
  fx_fire: FIREBALL,
  fx_bolt: BOLT,
  fx_heal: HEAL,
  fx_orb: ORB,
  fx_feather: FEATHER,
  fx_star: STAR,
  portal: PORTAL,
  potion_hp: POTION_HP,
  potion_mp: POTION_MP,
  tree: TREE,
  cloud: CLOUD,
};

interface Layer {
  rows: string[];
  palette: Palette;
}

function drawGrid(scene: Phaser.Scene, key: string, rows: string[], palette: Palette) {
  drawLayers(scene, key, [{ rows, palette }]);
}

// 複数レイヤー(マント=下層、王冠=上層など)を1枚のテクスチャに合成する
function drawLayers(scene: Phaser.Scene, key: string, layers: Layer[]) {
  const w = Math.max(...layers.flatMap((l) => l.rows.map((r) => r.length)));
  const h = Math.max(...layers.map((l) => l.rows.length));
  const tex = scene.textures.createCanvas(key, w, h)!;
  const ctx = tex.getContext();
  for (const layer of layers) {
    for (let y = 0; y < layer.rows.length; y++) {
      const row = layer.rows[y];
      for (let x = 0; x < row.length; x++) {
        const c = layer.palette[row[x]];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  tex.refresh();
}

// ---------- 転職後の装飾レイヤー ----------
// マント(キャラの背中側 = 下層に描画)
const CAPE_ROWS = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '..cc............',
  '.cccc...........',
  '.cccc...........',
  '.ccccc..........',
  '.ccccc..........',
  '..cccc..........',
  '..ccccc.........',
  '..ccccc.........',
  '...cccc.........',
  '...ccc..........',
  '................',
];

// 王冠(頭の上 = 上層に描画)
const CROWN_ROWS = [
  '.....g..g.g.....',
  '.....gggggg.....',
];

// 帽子の星(魔法使い2次用・上層)
const STAR_ROWS = [
  '................',
  '................',
  '.......z........',
  '......zzz.......',
  '.......z........',
];

// 転職ティアごとの見た目バリエーション(パレット差し替え + 装飾)
interface TierVariant {
  base: string;
  key: string;
  palette: Palette;
  under?: Layer;
  over?: Layer;
}

const TIER_VARIANTS: TierVariant[] = [
  // 剣士 → クルセイダー: 鋼の鎧 + 赤マント
  {
    base: 'warrior',
    key: 'warrior2',
    palette: {
      r: '#7a96c4', R: '#4a628f', e: '#3a6ae8', b: '#3a4258', B: '#272e40',
      X: '#cfe6ff', x: '#8fb0d8',
    },
    under: { rows: CAPE_ROWS, palette: { c: '#c23a48' } },
  },
  // クルセイダー → ヒーロー: 黄金の鎧 + 緋色マント + 王冠
  {
    base: 'warrior',
    key: 'warrior3',
    palette: {
      r: '#f2c14e', R: '#c2902a', e: '#d23c3c', b: '#5a3a6b', B: '#3d2749',
      X: '#fff2c8', x: '#e8c060', g: '#ffe9b0',
    },
    under: { rows: CAPE_ROWS, palette: { c: '#a32433' } },
    over: { rows: CROWN_ROWS, palette: { g: '#ffd24a' } },
  },
  // 魔法使い → ウィザード: 紫ローブ + 星付き帽子
  {
    base: 'mage',
    key: 'mage2',
    palette: {
      t: '#7a3ac4', T: '#54288f', r: '#8a4ad8', R: '#5f329f', u: '#c8a4ff',
      j: '#4ae8c4', J: '#c8fff0',
    },
    over: { rows: STAR_ROWS, palette: { z: '#ffd24a' } },
  },
  // ウィザード → アークメイジ: 白金ローブ + マント + 王冠
  {
    base: 'mage',
    key: 'mage3',
    palette: {
      t: '#f4f0ff', T: '#cfc4ea', w: '#ffd24a', r: '#e8e2f8', R: '#b8aed8',
      u: '#f2c14e', j: '#ff4a8a', J: '#ffd0e0',
    },
    under: { rows: CAPE_ROWS, palette: { c: '#6a3ac4' } },
    over: { rows: CROWN_ROWS, palette: { g: '#ffd24a' } },
  },
];

export function frameKeys(name: string): string[] {
  return SPRITES[name].frames.map((_, i) => `${name}_${i}`);
}

export function createAllTextures(scene: Phaser.Scene) {
  for (const [name, def] of Object.entries(SPRITES)) {
    def.frames.forEach((rows, i) => drawGrid(scene, `${name}_${i}`, rows, def.palette));
  }
  // 転職ティアの見た目(ベースのドット絵にパレット差し替え+装飾レイヤーを合成)
  for (const v of TIER_VARIANTS) {
    const base = SPRITES[v.base];
    const palette = { ...base.palette, ...v.palette };
    base.frames.forEach((rows, i) => {
      const layers: Layer[] = [];
      if (v.under) layers.push(v.under);
      layers.push({ rows, palette });
      if (v.over) layers.push(v.over);
      drawLayers(scene, `${v.key}_${i}`, layers);
    });
  }
  // 1x1 白ピクセル(バー・パーティクル用)
  const px = scene.textures.createCanvas('px', 2, 2)!;
  px.getContext().fillStyle = '#ffffff';
  px.getContext().fillRect(0, 0, 2, 2);
  px.refresh();
  // タイル
  makeTile(scene, 'tile_grass', 'grass');
  makeTile(scene, 'tile_sky', 'sky');
  makeTile(scene, 'tile_dark', 'dark');
}

export function createAllAnims(scene: Phaser.Scene) {
  const mk = (
    key: string,
    name: string,
    frames: number[],
    frameRate: number,
    repeat = -1
  ) => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: frames.map((i) => ({ key: `${name}_${i}` })),
      frameRate,
      repeat,
    });
  };
  for (const who of ['warrior', 'warrior2', 'warrior3', 'mage', 'mage2', 'mage3']) {
    mk(`${who}_stand`, who, [0], 1);
    mk(`${who}_walk`, who, [1, 0, 2, 0], 10);
    mk(`${who}_attack`, who, [3], 1, 0);
  }
  for (const mob of ['snail', 'mushroom', 'slime', 'pig', 'bat', 'zombieshroom']) {
    mk(`${mob}_move`, mob, [0, 1], mob === 'bat' ? 8 : 4);
  }
  mk('mushmom_move', 'mushmom', [0, 1], 3);
  mk('pinkbean_move', 'pinkbean', [0, 1], 3);
  mk('cygnus_move', 'cygnus', [0, 1], 4);
  mk('portal_spin', 'portal', [0, 1], 5);
  mk('fx_slash_play', 'fx_slash', [0, 1], 14, 0);
  mk('fx_claw_play', 'fx_claw', [0, 1], 14, 0);
  mk('fx_heal_play', 'fx_heal', [0, 1, 0, 1], 8, 0);
}
