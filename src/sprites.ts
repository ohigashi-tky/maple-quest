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
      '....rrrrrr......',
      '...rrrrrrrr.....',
      '..ssrrrrrrss....',
      '..ssrRrrRrss....',
      '...rrrrrrrr.....',
      '...RRrrrrRR.....',
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
      '....rrrrrr......',
      '...rrrrrrrr.....',
      '..ssrrrrrrss....',
      '..ssrRrrRrss....',
      '...rrrrrrrr.....',
      '...RRrrrrRR.....',
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
      '....rrrrrr......',
      '...rrrrrrrr.....',
      '..ssrrrrrrss....',
      '..ssrRrrRrss....',
      '...rrrrrrrr.....',
      '...RRrrrrRR.....',
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
      '..rrrrrrrrss....',
      '..rrrRrrRrr.....',
      '...rrrrrrrr.....',
      '...RRrrrrRR.....',
      '....bbbbbb......',
      '...bb...bb......',
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
      '..yyyyyyyyyyy...',
      '..ysssssssssy...',
      '..yskkssskksy...',
      '..yskkssskksy...',
      '..ssssssssssy...',
      '..Ssssmmsss.S...',
      '...ssssssss.....',
      '....rrrrrr......',
      '...rrrrrrrr.....',
      '..ssrrrrrrss....',
      '..ssruurrurs....',
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
      '..yyyyyyyyyyy...',
      '..ysssssssssy...',
      '..yskkssskksy...',
      '..yskkssskksy...',
      '..ssssssssssy...',
      '..Ssssmmsss.S...',
      '...ssssssss.....',
      '....rrrrrr......',
      '...rrrrrrrr.....',
      '..ssrrrrrrss....',
      '..ssruurrurs....',
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
      '..yyyyyyyyyyy...',
      '..ysssssssssy...',
      '..yskkssskksy...',
      '..yskkssskksy...',
      '..ssssssssssy...',
      '..Ssssmmsss.S...',
      '...ssssssss.....',
      '....rrrrrr......',
      '...rrrrrrrr.....',
      '..ssrrrrrrss....',
      '..ssruurrurs....',
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
      '....rrrrrrss....',
      '...rrrrrrrss....',
      '..rrrrrrrrr.....',
      '..rruurrunr.....',
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

// ---------- スパイクスライム (14x13) とげ付きの獰猛スライム ----------
const SLIME: SpriteDef = {
  palette: {
    e: '#58c443', E: '#3c9230', d: '#8ee07a', k: '#1d2a14', m: '#2f7a22',
    s: '#2a5c1e', w: '#ffffff',
  },
  frames: [
    [
      '..s....ss....s',
      '..ss..eses..ss',
      '...seeeeeees..',
      '...eeeeeeeee..',
      '..eedeeeeeeee.',
      '.eeedeeeeeeee.',
      '.ekeeeeeeekee.',
      '.ekkeeeeekkee.',
      '.eekkeeekkeee.',
      '.eeewmmweeeee.',
      '.EEeeeeeeeeEE.',
      '..EEEEEEEEEE..',
    ],
    [
      '..............',
      '..s...ss....s.',
      '..ss.eses..ss.',
      '...seeeeeees..',
      '..eeedeeeeee..',
      '.eeedeeeeeeee.',
      'eekeeeeeeekeee',
      'eekkeeeeekkeee',
      'eeekkeeekkeeee',
      'eeeewmmweeeeee',
      'EEeeeeeeeeeeEE',
      '.EEEEEEEEEEEE.',
    ],
  ],
};

// ---------- アーマーブタ (16x14) 鉄兜と牙の戦闘ブタ ----------
const PIG: SpriteDef = {
  palette: {
    p: '#f4a7b9', P: '#d97f96', n: '#e8829e', k: '#2a2118',
    a: '#8a96a8', A: '#5c6878', w: '#ffffff', r: '#ff3a3a',
  },
  frames: [
    [
      '.......aa.......',
      '...aaaaaaaaaa...',
      '..aaaaaaaaaaaa..',
      '..aAAAAAAAAAAa..',
      '..pppppppppppp..',
      '.ppkppppppppkpp.',
      '.ppkkppppppkkpp.',
      '.pppkkpppppkkpp.',
      'wpppppnnnpppppww',
      'wwppppnknppppwww',
      '.pwpppnnnpppwpp.',
      '.ppppppppppppp..',
      '..PPpppppppPP...',
      '..PP.......PP...',
    ],
    [
      '.......aa.......',
      '...aaaaaaaaaa...',
      '..aaaaaaaaaaaa..',
      '..aAAAAAAAAAAa..',
      '..pppppppppppp..',
      '.ppkppppppppkpp.',
      '.ppkkppppppkkpp.',
      '.pppkkpppppkkpp.',
      'wpppppnnnpppppww',
      'wwppppnknppppwww',
      '.pwpppnnnpppwpp.',
      '.ppppppppppppp..',
      '..PPP.....PPP...',
      '.PP.........PP..',
    ],
  ],
};

// ---------- デビルバット (18x13) 角と赤眼の悪魔コウモリ ----------
const BAT: SpriteDef = {
  palette: {
    v: '#5a3a8c', V: '#3a2460', d: '#7a52b4', k: '#1d1430', w: '#ffffff',
    f: '#e8e0ff', r: '#ff3a3a', h: '#aab0c0',
  },
  frames: [
    [
      'v......h..h......v',
      'vv.....hh.hh....vv',
      'vvv....vvvv....vvv',
      'vdvv..vvvvvv..vvdv',
      'vddvvvvvvvvvvvvddv',
      '.vvvvrrvvvvrrvvvv.',
      '..vvvrrvvvvrrvvv..',
      '...vvvvvvvvvvvv...',
      '....vvwvvvvwvv....',
      '....vvwvvvvwvv....',
      '.....Vvvvvvvv.....',
      '......VVVVVV......',
      '.......V..V.......',
    ],
    [
      '.......h..h.......',
      '.......hh.hh......',
      '.......vvvv.......',
      '..vv..vvvvvv..vv..',
      '.vvvvvvvvvvvvvvvv.',
      'vvvvvrrvvvvrrvvvvv',
      'vvvvvrrvvvvrrvvvvv',
      '.vvvvvvvvvvvvvvvv.',
      '..vvvvwvvvvwvvvv..',
      '..vvvvwvvvvwvvvv..',
      '....VvvvvvvvvV....',
      '......VVVVVV......',
      '.......V..V.......',
    ],
  ],
};

// ---------- カオスマッシュ (16x16) 棘と赤眼の凶悪キノコ ----------
const ZOMBIESHROOM: SpriteDef = {
  palette: {
    a: '#6a5a88', A: '#483c60', w: '#9a8ab8', f: '#c9d4b0', F: '#a4b08a',
    k: '#1d2a14', m: '#5a6b4a', x: '#3a3050', r: '#ff3a3a', q: '#ffd24a',
  },
  frames: [
    [
      '...x..xxxx..x...',
      '....xaaaaaax....',
      '...aawwaaaaaax..',
      '..aaawwaaaaaaa..',
      '..aaaaaaaaawwa..',
      '..aaaaaaaaawwaa.',
      '..aAAAAAAAAAAAa.',
      '...AAAAAAAAAAA..',
      '....ffffffffff..',
      '....frrffffrrf..',
      '....frkffffkrf..',
      '....ffffffffff..',
      '....ffmmmmmfff..',
      '.....fmqqqmff...',
      '......FF..FF....',
      '......FF..FF....',
    ],
    [
      '...x..xxxx..x...',
      '....xaaaaaax....',
      '...aawwaaaaaax..',
      '..aaawwaaaaaaa..',
      '..aaaaaaaaawwa..',
      '..aaaaaaaaawwaa.',
      '..aAAAAAAAAAAAa.',
      '...AAAAAAAAAAA..',
      '....ffffffffff..',
      '....frrffffrrf..',
      '....frkffffkrf..',
      '....ffffffffff..',
      '....ffmmmmmfff..',
      '.....fmqqqmff...',
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

// エルクィネス: 氷の伝説の鳥(青く美しい不死鳥)
// エルクィネス: 気高い青の霊鳥(冠羽・広げた翼・流れる尾羽)
const ELQUINES: SpriteDef = {
  palette: { b: '#6ab8ff', B: '#2f7fd6', d: '#1c4f8f', w: '#eaf6ff', c: '#9ad8ff', k: '#0e2240', y: '#bfeaff', g: '#ffe45a' },
  frames: [
    // 翼を上げた姿
    [
      '........y.......',
      '.......ycy......',
      '.c......wb......',
      '.cc....wbBw.....',
      '.ccc..wbkBbw....',
      'c.ccc.wbBBbwg...',
      '.c.cccwbBBbw....',
      '..cccbbBBBbbc...',
      'cccbbbbBBBbbbccc',
      '.cwbbbbBBBbbbwc.',
      '..wdbbbBBBbddw..',
      '...wddbbbbddw...',
      '....wdbBBbdw....',
      '...y.wbBBbw.y...',
      '..yy..wddw..yy..',
      '.yy....yy....yy.',
    ],
    // 翼を下げた姿(羽ばたき)
    [
      '........y.......',
      '.......ycy......',
      '........wb......',
      '.......wbBw.....',
      '..c...wbkBbw..c.',
      '.ccc..wbBBbw.ccc',
      'c.ccc.wbBBbwccc.',
      '.c.ccbbBBBbbcc.c',
      '..ccbbbBBBbbbcc.',
      '.ccwbbbBBBbbbwcc',
      'c..wdbbbBBbbddw.',
      '....wddbbbddw...',
      '.....wdbBbdw....',
      '..yy.wbBBbw.yy..',
      '.yy...wddw...yy.',
      'yy.....yy.....yy',
    ],
  ],
};

// ダークスピリット: 単眼の闇の魂(揺らめく外殻・紫の光・触手)
const DARKSPIRIT: SpriteDef = {
  palette: { d: '#3a2150', D: '#1c0f30', p: '#9a4ae0', P: '#6a28b0', w: '#f0e0ff', k: '#060410', r: '#c84aff' },
  frames: [
    [
      '.....pPPp.....',
      '...pPddddPp...',
      '..PdDDDDDDdP..',
      '.PdDDDDDDDDdP.',
      '.dDDDwwwwDDDd.',
      'PdDDwwrrwwDDdP',
      'PdDDwrkkrwDDdP',
      'PdDDwwrrwwDDdP',
      '.dDDDwwwwDDDd.',
      '.PdDDDDDDDDdP.',
      '..PddDDDDddP..',
      '...PdDddDdP...',
      '..p.dD..Dd.p..',
      '.p..p.dd.p..p.',
    ],
    [
      '.....pPPp.....',
      '...pPddddPp...',
      '..PdDDDDDDdP..',
      '.PdDDDDDDDDdP.',
      '.dDDwwwwwwDDd.',
      'PdDwwrrrrwwDdP',
      'PdDwrrkkrrwDdP',
      'PdDwwrrrrwwDdP',
      '.dDDwwwwwwDDd.',
      '.PdDDDDDDDDdP.',
      '..PddDDDDddP..',
      '..PdDddddDdP..',
      '.p.dD.dd.Dd.p.',
      'p..p..dd..p..p',
    ],
  ],
};

// 氷ドラゴンの顔(フリージングブレスの口元)
const ICEDRAGON: SpriteDef = {
  palette: { b: '#4aa0e8', B: '#2f6fb8', w: '#dff2ff', c: '#9ad8ff', k: '#16304a', y: '#bfeaff' },
  frames: [
    [
      '..y..........y..',
      '.yBy........yBy.',
      '.yBBy......yBBy.',
      '..bBBbwwwwbBBb..',
      '.bBBkBwwwwBkBBb.',
      'bBBBBBwwwwBBBBBb',
      'bBBBBBBBBBBBBBBb',
      'cBBBBwwwwwwBBBBc',
      '.cBBwwccccwwBBc.',
      '..cBwwc..cwwBc..',
      '...cwwc..cwwc...',
      '....ccc..ccc....',
      '.....c....c.....',
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

// ---------- エリクサー(HP/MP全回復) ----------
const ELIXIR: SpriteDef = {
  palette: {
    r: '#ffb830', R: '#d88a10', w: '#fff4d0', c: '#d8a05a', g: '#f0f0f0',
    s: '#ffffff',
  },
  frames: [
    [
      '....cc..s.',
      '....cc.sss',
      '...gggg.s.',
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

// ---------- 氷の結晶(アイスストライク用) ----------
const ICE: SpriteDef = {
  palette: { b: '#5ab0e8', w: '#d8f2ff', W: '#ffffff' },
  frames: [
    [
      '.....bb.....',
      '....bwwb....',
      '...bwWWwb...',
      '..bwWWWWwb..',
      '.bwWWWWWWwb.',
      '.bwWWWWWWwb.',
      '..bwWWWWwb..',
      '...bwWWwb...',
      '....bwwb....',
      '.....bb.....',
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
function makeTile(scene: Phaser.Scene, key: string, theme: 'grass' | 'sky' | 'dark' | 'void') {
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
  } else if (theme === 'dark') {
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
  } else {
    // void: 虚無の黒に明滅する深紅・紫の裂け目
    ctx.fillStyle = '#16101f';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#241830';
    ctx.fillRect(0, 0, size, 4);
    ctx.fillStyle = '#3a2448';
    ctx.fillRect(0, 0, size, 2);
    ctx.fillStyle = '#0e0a16';
    for (let i = 0; i < 8; i++)
      ctx.fillRect(Math.floor(r() * size), 5 + Math.floor(r() * 10), 3, 2);
    ctx.fillStyle = r() > 0.5 ? '#a02a4a' : '#5a2a9c';
    if (r() > 0.35) ctx.fillRect(Math.floor(r() * 12) + 2, 7, 2, 3);
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
  } else if (theme === 'dark') {
    dctx.fillStyle = '#2c2440';
    dctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 12; i++) {
      dctx.fillStyle = r2() > 0.5 ? '#241d36' : '#3a3050';
      dctx.fillRect(Math.floor(r2() * size), Math.floor(r2() * size), 3, 2);
    }
  } else {
    dctx.fillStyle = '#100a18';
    dctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 12; i++) {
      dctx.fillStyle = r2() > 0.5 ? '#0a0612' : '#241830';
      dctx.fillRect(Math.floor(r2() * size), Math.floor(r2() * size), 3, 2);
    }
  }
  dirt.refresh();
}

// ============================================================
// 生成本体
// ============================================================
// ============================================================
// ボス・アーキタイプ(グレースケールで描画 → ボスごとに色を乗算tint)
// b=ボディ d=陰 w=highlight o=輪郭 k=目 で統一
// ============================================================
const ARCH_PAL: Palette = {
  o: '#1f1626', b: '#c8c8d0', d: '#8a8a96', D: '#5e5e6a', l: '#e4e4ec', w: '#ffffff',
  k: '#100a18', g: '#fbfbff',
};

// demon: 曲がり角と蝙蝠翼の魔神(ジュニア/クリムゾンバルログ)
const A_DEMON: SpriteDef = {
  palette: ARCH_PAL,
  frames: [
    [
      '..oo..................oo..',
      '.oddo................oddo.',
      '.odddo...oooooooo...odddo.',
      '..oddoooobbbbbbbboooooddo.',
      '...oo..obbbbbbbbbbo..oo...',
      '.......obggbbbbggbo.......',
      '.......obgkbbbbkgbo.......',
      '.......obbDwwwwDbbo.......',
      '........obbbbbbbbo........',
      '.ooo......obbbbo......ooo.',
      'obddo....obbbbbbo....obddo',
      'obdddoooobbbbbbbboooobdddo',
      'obddddoobblwwwwlbboobdddbo',
      '.obddoobbbwwwwwwbbboobddo.',
      '..oo...obbbbbbbbbbo...oo..',
      '.......obdbbbbbbdbo.......',
      '........obbbbbbbbo........',
      '........obbo..obbo........',
      '.......obdo....obdo.......',
      '.......obo......obo.......',
      '......obbo......obbo......',
      '......oo..........oo......',
    ],
    [
      '..oo..................oo..',
      '.oddo................oddo.',
      '.odddo...oooooooo...odddo.',
      '..oddoooobbbbbbbboooooddo.',
      '...oo..obbbbbbbbbbo..oo...',
      '.ooo...obggbbbbggbo...ooo.',
      'obddo..obgkbbbbkgbo..obddo',
      'obdddooobbDwwwwDbbooobdddo',
      'obddddo.obbbbbbbbo.obdddbo',
      '.obddo....obbbbo....obddo.',
      '..oo.....obbbbbbo.....oo..',
      '........obbbbbbbbo........',
      '.......obblwwwwlbbo.......',
      '.......obbwwwwwwbbo.......',
      '.......obbbbbbbbbbo.......',
      '.......obdbbbbbbdbo.......',
      '........obbbbbbbbo........',
      '........obbo..obbo........',
      '.......obdo....obdo.......',
      '........obo....obo........',
      '.......obbo....obbo.......',
      '.......oo........oo.......',
    ],
  ],
};

// drake: 横向きの竜(角・背びれ・牙・尻尾)(ダイル・マノン・デュナス・ホーンテイル)
const A_DRAKE: SpriteDef = {
  palette: ARCH_PAL,
  frames: [
    [
      '....oo.......o....o.........',
      '...obbo.....odo..odo........',
      '...obbbo....odbooodbo.......',
      '..oobbbbo...odbbbdbbo.......',
      '.obbbbbbbooooodbbbbbo.......',
      'obggkbbbbbbbbbbbbbbbbboo....',
      'obbggbbbbbdbbbbbbbbbbbbbo...',
      'obbbbbbbbbbbbbbbbbbbbbbbbo..',
      '.owwwwbbbbbbbbbbbbbbbbbbbo..',
      '..owwbbdbbbbbbbbbbbbbbbbbboo',
      '...oobbbbbbbbbbbbbbbbbbbbboo',
      '.....obwwbbbbbbbbbbbbbbbbo..',
      '.....obbwwbbbbbbbbbbbbboo...',
      '......oobbobbbbobbbbboo.....',
      '.......obo.obbo..obbo.......',
      '......obbo.obo...obo........',
      '......oo...oo.....oo........',
    ],
    [
      '....oo.......o....o.........',
      '...obbo.....odo..odo........',
      '...obbbo....odbooodbo.......',
      '..oobbbbo...odbbbdbbo.......',
      '.obbbbbbbooooodbbbbbo.......',
      'obggkbbbbbbbbbbbbbbbbboo....',
      'obbggbbbbbdbbbbbbbbbbbbbo...',
      'obbbbbbbbbbbbbbbbbbbbbbbboo.',
      '.owwwwbbbbbbbbbbbbbbbbbbboo.',
      '..owwbbdbbbbbbbbbbbbbbbbbo..',
      '...oobbbbbbbbbbbbbbbbbbbo...',
      '.....obwwbbbbbbbbbbbbbbboo..',
      '.....obbwwbbbbbbbbbbbbbboo..',
      '......oobbobbbbobbbbboo.....',
      '.......obbo.obo..obo........',
      '......obbo..obbo.obbo.......',
      '......oo.....oo...oo........',
    ],
  ],
};

// golem: 岩の巨人(光る目・胸の溶岩コア・巨大な拳)(スタンピー・ザクム)
const A_GOLEM: SpriteDef = {
  palette: ARCH_PAL,
  frames: [
    [
      '.....oooooooooooo.......',
      '...oodbbbbbbbbbbdoo.....',
      '..obbbbbbbbbbbbbbbbo....',
      '..obdbggbbbbbbggbdbo....',
      '..obbbgkbbbbbbkgbbbo....',
      '...obbdDDddddDDdbbo.....',
      '....obbbbbbbbbbbbo......',
      '..ooobbbooooooobbooo....',
      '.obbdbbo.ogggo.obbdbo...',
      'obbbbbo.ogggggo.obbbbo..',
      'obbdbbo.odggggo.obbdbo..',
      'obbbbbo..odddo..obbbbo..',
      'oobbbboobbbbbbbboobbboo.',
      '.obbbo.obbbbbbbbo.obbbo.',
      '.oooo..obbdbbdbbo..oooo.',
      '.......obbo..obbo.......',
      '......obbbo..obbbo......',
      '......ooooo..ooooo......',
    ],
    [
      '.....oooooooooooo.......',
      '...oodbbbbbbbbbbdoo.....',
      '..obbbbbbbbbbbbbbbbo....',
      '..obdbggbbbbbbggbdbo....',
      '..obbbgkbbbbbbkgbbbo....',
      '...obbdDDddddDDdbbo.....',
      '....obbbbbbbbbbbbo......',
      '..ooobbbooooooobbooo....',
      '.obbdbbo.odggo.obbdbo...',
      'obbbbbo.ogggggo.obbbbo..',
      'obbdbbo.oggggdo.obbdbo..',
      'obbbbbo..odddo..obbbbo..',
      'oobbbboobbbbbbbboobbboo.',
      '.obbbo.obbbbbbbbo.obbbo.',
      '.oooo..obbdbbdbbo..oooo.',
      '.......obbo..obbo.......',
      '.......obbo..obbo.......',
      '......ooooo..ooooo......',
    ],
  ],
};

// beast: 翼を広げた猛禽(嘴・羽根の切れ込み・獅子の体)(グリフィー)
const A_BEAST: SpriteDef = {
  palette: ARCH_PAL,
  frames: [
    [
      'o.....o.....................o.....o',
      'oo...oo.......oooo.......oo...oo...',
      'obo..obo....obbbbbbo....obo..obo...',
      'obbo.obbo..obbbbbbbbo..obbo.obbo...',
      'obbboobbboobggbbbbggboobbboobbbo...',
      '.obbbbbbbbobgkbbbbkgbobbbbbbbbo....',
      '..obbbbbbbobbbwwwwbbbobbbbbbbo.....',
      '...obbbbbbbobwwwwwwbobbbbbbbo......',
      '....obbbbbbboowwwwoobbbbbbbo.......',
      '.....obbbblllllllllllbbbbo.........',
      '....obbbbbbbbbbbbbbbbbbbbbo........',
      '...obbdbbbbbbbbbbbbbbbbdbbo........',
      '...obbbbbbbbbbbbbbbbbbbbbbo........',
      '....obbobbbbbbbbbbbbobbboo.........',
      '....obo.obbo....obbo.obo...........',
      '...obbo.obo......obo.obbo..........',
      '...oo...oo........oo...oo..........',
    ],
    [
      '.o.....o...................o.....o.',
      '.oo...oo......oooo......oo...oo....',
      '.obo..obo...obbbbbbo...obo..obo....',
      '.obbo.obbo.obbbbbbbbo.obbo.obbo....',
      '.obbboobbbobggbbbbggbobbboobbbo....',
      '..obbbbbbbobgkbbbbkgbobbbbbbbo.....',
      '...obbbbbbobbbwwwwbbbobbbbbbo......',
      '....obbbbbbobwwwwwwbobbbbbbo.......',
      '.....obbbbbboowwwwoobbbbbbo........',
      '......obbblllllllllllbbbo..........',
      '.....obbbbbbbbbbbbbbbbbbbo.........',
      '....obbdbbbbbbbbbbbbbbdbbo.........',
      '....obbbbbbbbbbbbbbbbbbbbo.........',
      '.....obbobbbbbbbbbbbobbboo.........',
      '.....obbo.obo....obo.obbo..........',
      '....obbo..obbo..obbo..obbo.........',
      '....oo.....oo....oo.....oo.........',
    ],
  ],
};

// lord: 角冠とマントの魔導王(ブラックマゲ)
const A_LORD: SpriteDef = {
  palette: ARCH_PAL,
  frames: [
    [
      '......o......oo......o......',
      '......oo....oddo....oo......',
      '.......oo..oddddo..oo.......',
      '........oooddddddooo........',
      '........odddddddddo.........',
      '.......oddDDDDDDDddo........',
      '.......odDggbbbbggDdo.......',
      '.......odDgkbbbbkgDdo.......',
      '.......oddDbbbbbbDddo.......',
      '........odbbwwwwbbdo........',
      '....oooooobbbbbbbboooooo....',
      '..oobbbbbboobbbboobbbbbboo..',
      '.obbbbbbbbobbbbbbobbbbbbbbo.',
      'obbbdbbbbbobwwwwbobbbbdbbbo.',
      'obbbbbbbbbobwwwwbobbbbbbbbo.',
      '.oobbbbbbbobwwwwbobbbbbboo..',
      '.g.ooooooobwwwwwwboooooo.g..',
      'ogo......obbbwwbbbo.....ogo.',
      '.g.......obbbwwbbbo......g..',
      '........obbbbwwbbbbo........',
      '........obbbbwwbbbbo........',
      '.......obbbddbbddbbbo.......',
      '.......oddddddddddddo.......',
    ],
    [
      '......o......oo......o......',
      '......oo....oddo....oo......',
      '.......oo..oddddo..oo.......',
      '........oooddddddooo........',
      '........odddddddddo.........',
      '.......oddDDDDDDDddo........',
      '.......odDggbbbbggDdo.......',
      '.......odDgkbbbbkgDdo.......',
      '.......oddDbbbbbbDddo.......',
      '........odbbwwwwbbdo........',
      '....oooooobbbbbbbboooooo....',
      '..oobbbbbboobbbboobbbbbboo..',
      '.obbbbbbbbobbbbbbobbbbbbbbo.',
      'obbbdbbbbbobwwwwbobbbbdbbbo.',
      'obbbbbbbbbobwwwwbobbbbbbbbo.',
      '.oobbbbbbbobwwwwbobbbbbboo..',
      '...ooooooobwwwwwwboooooo....',
      '.g.......obbbwwbbbo......g..',
      'ogo......obbbwwbbbo.....ogo.',
      '.g......obbbbwwbbbbo.....g..',
      '........obbbbwwbbbbo........',
      '.......obbbddbbddbbbo.......',
      '.......oddddddddddddo.......',
    ],
  ],
};

// knight: 角兜と大剣の重騎士(ファウスト/ヴァンレオン/マグナス/デミアン)
const A_KNIGHT: SpriteDef = {
  palette: ARCH_PAL,
  frames: [
    [
      '...oo.............oo.ww..',
      '..oddo...........oddoww..',
      '..odddo..ooooo..odddoww..',
      '...oddo.obbbbbo.oddo.ww..',
      '....oo.obbbbbbbo.oo..ww..',
      '.......obkgggkbo.....ww..',
      '.......obbkkkbbo.....ww..',
      '........obbbbbo......ww..',
      '...oooooobbbbbbbooooo.ww.',
      '..olbbbooblbbblboblbbowww',
      '.olbbbbo.obwwwbo.obbwwww.',
      '.olbbbbo.obbwbbo.obbbowww',
      '..olbbo..obwwwbo..obo.ww.',
      '...ooo...obbbbbo......ww.',
      '.........obdbdbo.........',
      '.........obbbbbo.........',
      '.......obbo.obbo.........',
      '.......obbo.obbo.........',
      '......obdo...obdo........',
      '......obo.....obo........',
      '.....obbo.....obbo.......',
      '.....oo.........oo.......',
    ],
    [
      '...oo.............oo.....',
      '..oddo...........oddoww..',
      '..odddo..ooooo..odddoww..',
      '...oddo.obbbbbo.oddo.ww..',
      '....oo.obbbbbbbo.oo..ww..',
      '.......obkgggkbo.....ww..',
      '.......obbkkkbbo.....ww..',
      '........obbbbbo......ww..',
      '...oooooobbbbbbbooooo.ww.',
      '..olbbbooblbbblboblbbowww',
      '.olbbbbo.obwwwbo.obbwwww.',
      '.olbbbbo.obbwbbo.obbbowww',
      '..olbbo..obwwwbo..obo.ww.',
      '...ooo...obbbbbo......ww.',
      '.........obdbdbo.........',
      '.........obbbbbo.........',
      '.......obbo.obbo.........',
      '........obbo.obbo........',
      '.......obdo...obdo.......',
      '.......obo.....obo.......',
      '......obbo.....obbo......',
      '......oo.........oo......',
    ],
  ],
};

// witch: つば広帽と光るオーブの杖の魔女(アネゴ/ヒルラ/ルシード)
const A_WITCH: SpriteDef = {
  palette: ARCH_PAL,
  frames: [
    [
      '..........oo..........',
      '.........oddo.........',
      '.........oddo.........',
      '........obddo.........',
      '.......obbddo.........',
      '......obbbbdo.........',
      '....oobbbbbbboo..ooo..',
      '..ooddddddddddoo.ogo..',
      '.....odbbbbbbdo..ogo..',
      '....odbkbbbbkbdo..o...',
      '....odbbbbbbbbdo..o...',
      '....oddblwwlbddo..o...',
      '.....oddbbbbddo...o...',
      '....obbbbbbbbbbo..o...',
      '...obbdbbwwbbdbbo.o...',
      '...obbbbbwwbbbbbo.o...',
      '..obbbbbbwwbbbbbbo.o..',
      '..obbbbbbbbbbbbbbo.o..',
      '.obbbbbbbbbbbbbbbbo.o.',
      '.obbddbbbbbbbbddbbo.o.',
      '.oooooooooooooooooo.o.',
    ],
    [
      '..........oo..........',
      '.........oddo.........',
      '.........oddo.........',
      '........obddo.........',
      '.......obbddo.........',
      '......obbbbdo....ooo..',
      '....oobbbbbbboo..ogo..',
      '..ooddddddddddoo.ogo..',
      '.....odbbbbbbdo...o...',
      '....odbkbbbbkbdo..o...',
      '....odbbbbbbbbdo..o...',
      '....oddblwwlbddo..o...',
      '.....oddbbbbddo...o...',
      '....obbbbbbbbbbo..o...',
      '...obbdbbwwbbdbbo.o...',
      '...obbbbbwwbbbbbo.o...',
      '..obbbbbbwwbbbbbboo...',
      '..obbbbbbbbbbbbbbo.o..',
      '.obbbbbbbbbbbbbbbbo.o.',
      '.obbddbbbbbbbbddbbo.o.',
      '.oooooooooooooooooo.o.',
    ],
  ],
};

// clown: 鈴付き三叉帽と襟飾りの道化(ピエール)
const A_CLOWN: SpriteDef = {
  palette: ARCH_PAL,
  frames: [
    [
      '.........oo...........',
      '..oo....oddo....oo....',
      '.oddo..oddddo..oddo...',
      '.goddo.oddddo.oddog...',
      '..oodddddddddddddoo...',
      '......ollllllllo......',
      '.....ollgkllkgllo.....',
      '.....olklllllklo......',
      '.....ollDwwwwDllo.....',
      '......ollllllllo......',
      '..www.oobbbbbboo.www..',
      '.wwwwobbbbbbbbbbowwww.',
      '..ww.obwlbbbblwbo.ww..',
      '.....oblwbbbbwlbo.....',
      '.....obwlbbbblwbo.....',
      '.....obbbbbbbbbbo.....',
      '.....obbbo..obbbo.....',
      '....obbo......obbo....',
      '...obbo........obbo...',
      '...ogo..........ogo...',
    ],
    [
      '.........oo...........',
      '...oo...oddo...oo.....',
      '..oddo.oddddo.oddo....',
      '..goddooddddooddog....',
      '...oodddddddddddoo....',
      '......ollllllllo......',
      '.....ollgkllkgllo.....',
      '.....olklllllklo......',
      '.....ollDwwwwDllo.....',
      '......ollllllllo......',
      '.www..oobbbbbboo..www.',
      'wwwwobbbbbbbbbbbowwww.',
      '.ww..obwlbbbblwbo..ww.',
      '.....oblwbbbbwlbo.....',
      '.....obwlbbbblwbo.....',
      '.....obbbbbbbbbbo.....',
      '.....obbbo..obbbo.....',
      '.....obbo....obbo.....',
      '....obbo......obbo....',
      '....ogo........ogo....',
    ],
  ],
};

// titan: 無限ボス用の巨大コロッサス(角・光る目・胸のコア・巨大な拳)
const A_TITAN: SpriteDef = {
  palette: ARCH_PAL,
  frames: [
    [
      '......oo..........oo......',
      '.....oddo........oddo.....',
      '....oddo..oooooo..oddo....',
      '....oddoodlbbbldoodddo....',
      '.....oodbbbbbbbbdoo.......',
      '......obbgkbbbkgbbo.......',
      '......obbbbbbbbbbbo.......',
      '......obbdwwwwwdbbo.......',
      '.....oobbbbbbbbbbboo......',
      '....obbbbbbbbbbbbbbbo.....',
      '...obdbbbbbbbbbbbbbdbo....',
      '..obbbbbbbolllllobbbbbbo..',
      '.obbbbbbbolgggggllobbbbbo.',
      'obbdbbbbbolgggggglobbdbbbo',
      'obbbbbbbbbolggggloobbbbbbo',
      'obbbbbbbbbbollllobbbbbbbbo',
      'obbbbbbbbbbbbbbbbbbbbbbbbo',
      '.obbbbbbbbbbbbbbbbbbbbbbo.',
      'obbo.obbbbbbbbbbbbbbo.obbo',
      'obbbo.obbbbbbbbbbbbo.obbbo',
      'obbbo.obbbbbbbbbbbo.obbbbo',
      'obbo..obbbo....obbo..obbo.',
      'oooo..obbo......obbo.oooo.',
      '......obbo......obbo......',
      '......obo........obo......',
      '.....obbo........obbo.....',
      '.....ooo..........ooo.....',
    ],
    [
      '......oo..........oo......',
      '.....oddo........oddo.....',
      '....oddo..oooooo..oddo....',
      '....oddoodlbbbldoodddo....',
      '.....oodbbbbbbbbdoo.......',
      '......obbgkbbbkgbbo.......',
      '......obbbbbbbbbbbo.......',
      '......obbdwwwwwdbbo.......',
      '.....oobbbbbbbbbbboo......',
      '....obbbbbbbbbbbbbbbo.....',
      '...obdbbbbbbbbbbbbbdbo....',
      '..obbbbbbbolllllobbbbbbo..',
      '.obbbbbbbolggggggobbbbbo..',
      'obbdbbbbbolggggggobbdbbbo.',
      'obbbbbbbbbolggggloobbbbbbo',
      'obbbbbbbbbbollllobbbbbbbbo',
      'obbbbbbbbbbbbbbbbbbbbbbbbo',
      '.obbbbbbbbbbbbbbbbbbbbbbo.',
      '.obbo.obbbbbbbbbbbbo.obbo.',
      '..obbo.obbbbbbbbbbo.obbo..',
      '..obbo.obbbbbbbbbo.obbbo..',
      '...obbo.obbbo.obbo.obbo...',
      '...oooo.obbo...obbo.ooo...',
      '.......obbo....obbo.......',
      '.......obo......obo.......',
      '......obbo......obbo......',
      '......ooo........ooo......',
    ],
  ],
};

// mush: 巨大キノコ(笠の斑点・つり目)(マッシュモム/ブルーマッシュモム)
const A_MUSH: SpriteDef = {
  palette: ARCH_PAL,
  frames: [
    [
      '......oooooooo......',
      '....oollbbbbbboo....',
      '...ollwwlbbbbbbbo...',
      '..ollwwbbbbbwwbbbo..',
      '..olbbbbbbbbwwbbbo..',
      '..obbbwwbbbbbbbdbo..',
      '..obdbwwddddddddbo..',
      '...oddddddddddddo...',
      '....obbbbbbbbbbo....',
      '....obkbbbbbbkbo....',
      '....obbkbbbbkbbo....',
      '....obbbdDDdbbbo....',
      '....obblwwwwlbbo....',
      '.....obbbbbbbbo.....',
      '......odo..odo......',
      '......oo....oo......',
    ],
    [
      '......oooooooo......',
      '....oollbbbbbboo....',
      '...ollwwlbbbbbbbo...',
      '..ollwwbbbbbwwbbbo..',
      '..olbbbbbbbbwwbbbo..',
      '..obbbwwbbbbbbbdbo..',
      '..obdbwwddddddddbo..',
      '...oddddddddddddo...',
      '....obbbbbbbbbbo....',
      '....obkbbbbbbkbo....',
      '....obbkbbbbkbbo....',
      '....obbbdDDdbbbo....',
      '....obblwwwwlbbo....',
      '.....obbbbbbbbo.....',
      '.....odo....odo.....',
      '....oo........oo....',
    ],
  ],
};

// ============================================================
// 武器(転職ごとに大型化するオーバーレイ)。穂先が上・握りが下の縦持ち。
// 戦士=鉾(ポールアーム) / 魔法使い=魔法の杖。すべてオリジナル意匠。
// ============================================================
// --- 戦士 1次: 鋼の槍 ---
const WEAP_W1: SpriteDef = {
  palette: { a: '#eef4ff', b: '#b8c8e0', c: '#6a7a98', g: '#f2c14e', G: '#b8902e', h: '#8a5a32', H: '#5b3a22' },
  frames: [[
    '....a....', '...aba...', '...aba...', '..abbba..', '..abcba..', '..abbba..',
    '...aba...', '...gGg...', '....g....', '....h....', '....H....', '....h....',
    '....H....', '....h....', '....H....', '....h....', '....H....', '....h....',
  ]],
};
// --- 戦士 2次: 鋼の長槍(十字鍔) ---
const WEAP_W2: SpriteDef = {
  palette: { a: '#dff0ff', b: '#8fb0d8', c: '#4a628f', g: '#cfe6ff', G: '#6a8ab0', h: '#6b4a32', H: '#43301f' },
  frames: [[
    '....a....', '....a....', '...aba...', '...aba...', '..abbba..', '..abcba..',
    '..abcba..', '..abbba..', '...aba...', '.GgggggG.', '....h....', '....H....',
    '....h....', '....H....', '....h....', '....H....', '....h....', '....H....',
    '....h....', '....H....',
  ]],
};
// --- 戦士 3次: 竜の戟(片側に斧刃) ---
const WEAP_W3: SpriteDef = {
  palette: { a: '#d8ffe8', b: '#3aa882', c: '#1f6b52', w: '#7ae0b0', g: '#e0c060', h: '#3a2a1a', H: '#241a10' },
  frames: [[
    '.....a....', '....aba...', '....aba...', '...abbba..', '..abbbbbg.', '.abwbbbbg.',
    '..abbbbbg.', '...abbba..', '....aba...', '....aga...', '.....g....', '.....h....',
    '.....H....', '.....h....', '.....H....', '.....h....', '.....H....', '.....h....',
    '.....H....', '.....h....', '.....H....',
  ]],
};
// --- 戦士 4次: 闇の薙刀(紫の輝き) ---
const WEAP_W4: SpriteDef = {
  palette: { a: '#d8b0ff', b: '#5a3a8f', c: '#2a1f44', w: '#b888ff', g: '#9a5ad8', h: '#241a36', H: '#150f22' },
  frames: [[
    '.....a....', '.....a....', '....aa....', '...aab....', '...abb....', '..aabbw...',
    '..abbbw...', '.aabbbbw..', '.abcccbw..', '.abbbbbw..', '..abbbb...', '...abb....',
    '...aba....', '....g.....', '....g.....', '....h.....', '....H.....', '....h.....',
    '....H.....', '....h.....', '....H.....', '....h.....', '....H.....',
  ]],
};
// --- 戦士 5次: 漆黒の大戟(黒×深紅) ---
const WEAP_W5: SpriteDef = {
  palette: { a: '#ff6a78', b: '#2a1020', c: '#120810', w: '#ff3040', g: '#e83a4a', h: '#1a1024', H: '#0d0814', e: '#ff9aa6' },
  frames: [[
    '......a....', '......a....', '.....ae....', '....aabe...', '....abbe...', '...aabbwe..',
    '...abbbwe..', '..aabbbbw..', '..abbbbww..', '.aabcccbw..', '.abbbbbbw..', '.abbbbbw...',
    '..abbbb....', '...abbb....', '...aba.....', '....g......', '....g......', '....g......',
    '....h......', '....H......', '....h......', '....H......', '....h......', '....H......',
    '....h......', '....H......',
  ]],
};
// --- 魔法使い 1次: 見習いの杖 ---
const WEAP_M1: SpriteDef = {
  palette: { c: '#9ad8ff', C: '#4a90c8', w: '#e8f6ff', g: '#f2c14e', h: '#8a5a32', H: '#5b3a22' },
  frames: [[
    '...c...', '..cwc..', '.ccCcc.', '.cCCCc.', '..ccc..', '...g...',
    '...h...', '...H...', '...h...', '...H...', '...h...', '...H...', '...h...', '...H...',
  ]],
};
// --- 魔法使い 2次: 蒼玉のロッド ---
const WEAP_M2: SpriteDef = {
  palette: { c: '#6ab0ff', C: '#2f6fc8', w: '#cfe8ff', g: '#cfe6ff', h: '#6b4a32', H: '#43301f' },
  frames: [[
    '..ccc..', '.ccccc.', '.cwCcc.', '.cCCCc.', '.ccccc.', '..ccc..', '...g...',
    '...h...', '...H...', '...h...', '...H...', '...h...', '...H...', '...h...', '...H...', '...h...',
  ]],
};
// --- 魔法使い 3次: 氷晶の杖 ---
const WEAP_M3: SpriteDef = {
  palette: { c: '#9ad8ff', C: '#4a90c8', w: '#e8f6ff', g: '#cfe6ff', h: '#5a7a9a', H: '#3a5570' },
  frames: [[
    '...w...', '...c...', '..cwc..', '..ccc..', '.ccwcc.', '.cCwCc.', '.ccwcc.',
    '..ccc..', '..cgc..', '...g...', '...h...', '...H...', '...h...', '...H...',
    '...h...', '...H...', '...h...', '...H...', '...h...',
  ]],
};
// --- 魔法使い 4次: 大魔導の杖(翼飾り) ---
const WEAP_M4: SpriteDef = {
  palette: { c: '#bfeaff', C: '#5aa0e0', w: '#ffffff', g: '#ffe45a', h: '#cfe0f0', H: '#9ac4e8', e: '#9ad8ff' },
  frames: [[
    '....w....', '...wcw...', 'e..ccc..e', 'ec.cwc.ce', 'ecccwccce', 'ec.cwc.ce',
    'e..ccc..e', '...wcw...', '....g....', '....g....', '....h....', '....H....',
    '....h....', '....H....', '....h....', '....H....', '....h....', '....H....', '....h....', '....H....',
  ]],
};
// --- 魔法使い 5次: 嵐氷の大杖 ---
const WEAP_M5: SpriteDef = {
  palette: { c: '#dff2ff', C: '#6ab0e8', w: '#ffffff', g: '#ffe45a', G: '#e0a830', h: '#cfe0f0', H: '#9ac4e8', e: '#6ae0ff', y: '#ffe45a' },
  frames: [[
    '.....w.....', '....wcw....', '...wcccw...', 'y.wccccw.y', 'yc.cwwc.cy', 'yccwwwwccy',
    'yc.cwwc.cy', 'y.wccccw.y', '...wcccw...', '....wcw....', '.....g.....', '....GgG....',
    '.....g.....', '.....h.....', '.....H.....', '.....h.....', '.....H.....', '.....h.....',
    '.....H.....', '.....h.....', '.....H.....', '.....h.....', '.....H.....',
  ]],
};

const SPRITES: Record<string, SpriteDef> = {
  warrior: WARRIOR,
  mage: MAGE,
  weap_w1: WEAP_W1, weap_w2: WEAP_W2, weap_w3: WEAP_W3, weap_w4: WEAP_W4, weap_w5: WEAP_W5,
  weap_m1: WEAP_M1, weap_m2: WEAP_M2, weap_m3: WEAP_M3, weap_m4: WEAP_M4, weap_m5: WEAP_M5,
  snail: SNAIL,
  mushroom: MUSHROOM,
  slime: SLIME,
  pig: PIG,
  bat: BAT,
  zombieshroom: ZOMBIESHROOM,
  mushmom: MUSHMOM,
  pinkbean: PINKBEAN,
  cygnus: CYGNUS,
  boss_mush: A_MUSH,
  boss_demon: A_DEMON,
  boss_drake: A_DRAKE,
  boss_golem: A_GOLEM,
  boss_beast: A_BEAST,
  boss_knight: A_KNIGHT,
  boss_witch: A_WITCH,
  boss_clown: A_CLOWN,
  boss_lord: A_LORD,
  boss_titan: A_TITAN,
  fx_slash: SLASH,
  fx_claw: CLAW,
  fx_fire: FIREBALL,
  fx_bolt: BOLT,
  fx_heal: HEAL,
  fx_orb: ORB,
  fx_feather: FEATHER,
  fx_star: STAR,
  fx_elquines: ELQUINES,
  fx_darkspirit: DARKSPIRIT,
  fx_icedragon: ICEDRAGON,
  portal: PORTAL,
  elixir: ELIXIR,
  fx_ice: ICE,
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

// 帽子の星(魔法使い用・上層)
const STAR_ROWS = [
  '................',
  '................',
  '.......z........',
  '......zzz.......',
  '.......z........',
];

// 角(ダークナイト用・上層)
const HORN_ROWS = [
  'd..............d',
  'dd............dd',
  '.d............d.',
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
  // ===== 戦士: ダークナイト系列 =====
  // 2次 スピアマン: 鋼の鎧 + 青マント
  {
    base: 'warrior',
    key: 'warrior2',
    palette: {
      r: '#7a96c4', R: '#4a628f', e: '#3a6ae8', b: '#3a4258', B: '#272e40',
      X: '#cfe6ff', x: '#8fb0d8',
    },
    under: { rows: CAPE_ROWS, palette: { c: '#3a5ac0' } },
  },
  // 3次 ドラゴンナイト: 竜鱗の青緑鎧 + 緑マント
  {
    base: 'warrior',
    key: 'warrior3',
    palette: {
      r: '#3a9c7a', R: '#1f6b52', e: '#7ae0b0', b: '#2a3a4a', B: '#1a2630',
      X: '#cfe6ff', x: '#8fb0d8', g: '#e0c060',
    },
    under: { rows: CAPE_ROWS, palette: { c: '#2a8c5a' } },
  },
  // 4次 ダークナイト: 漆黒紫の鎧 + 暗紫マント + 角
  {
    base: 'warrior',
    key: 'warrior4',
    palette: {
      r: '#4a3a6b', R: '#2a1f44', e: '#9a5ad8', b: '#241a36', B: '#150f22',
      X: '#b89ae8', x: '#7a5ac0', s: '#d8b89a', S: '#b89478', g: '#9a5ad8',
    },
    under: { rows: CAPE_ROWS, palette: { c: '#3a1f5a' } },
    over: { rows: HORN_ROWS, palette: { d: '#1a0f28' } },
  },
  // 5次 ダークナイト・極: 黒に深紅の輝き + 漆黒マント + 角
  {
    base: 'warrior',
    key: 'warrior5',
    palette: {
      r: '#241a30', R: '#120c1a', e: '#e83a4a', b: '#1a1024', B: '#0d0814',
      X: '#ff5a6a', x: '#c02a3a', s: '#d8b89a', S: '#b89478', g: '#e83a4a',
      h: '#3a1020', H: '#5a1828',
    },
    under: { rows: CAPE_ROWS, palette: { c: '#5a0a1a' } },
    over: { rows: HORN_ROWS, palette: { d: '#e83a4a' } },
  },
  // ===== 魔法使い: アークメイジ(氷雷)系列 =====
  // 2次 ウィザード: 紺青のローブ + 星付き帽子
  {
    base: 'mage',
    key: 'mage2',
    palette: {
      t: '#3a4ac4', T: '#26308f', r: '#4a5ad8', R: '#32409f', u: '#a4b8ff',
      j: '#6ae0ff', J: '#c8f4ff',
    },
    over: { rows: STAR_ROWS, palette: { z: '#6ae0ff' } },
  },
  // 3次 メイジ: 氷青のローブ + 星付き帽子
  {
    base: 'mage',
    key: 'mage3',
    palette: {
      t: '#3a8ad8', T: '#2660a0', w: '#d8f4ff', r: '#5ab0e8', R: '#3a80b8', u: '#bfeaff',
      j: '#ffe45a', J: '#fff4c0',
    },
    over: { rows: STAR_ROWS, palette: { z: '#ffe45a' } },
  },
  // 4次 アークメイジ: 白氷のローブ + 氷マント + 王冠
  {
    base: 'mage',
    key: 'mage4',
    palette: {
      t: '#dff0ff', T: '#a8cae8', w: '#ffffff', y: '#9ad8ff', Y: '#6ab0e0',
      r: '#cfe8ff', R: '#9ac4e8', u: '#ffffff', j: '#ffe45a', J: '#fff4c0',
    },
    under: { rows: CAPE_ROWS, palette: { c: '#6ab0e8' } },
    over: { rows: CROWN_ROWS, palette: { g: '#9ad8ff' } },
  },
  // 5次 アークメイジ・極: 白金氷のローブ + 氷雷マント + 王冠
  {
    base: 'mage',
    key: 'mage5',
    palette: {
      t: '#ffffff', T: '#cfe0f0', w: '#ffe45a', y: '#ffd24a', Y: '#e0a830',
      r: '#eaf6ff', R: '#bfdcf0', u: '#ffe45a', j: '#6ae0ff', J: '#c8f4ff',
    },
    under: { rows: CAPE_ROWS, palette: { c: '#9ad8ff' } },
    over: { rows: CROWN_ROWS, palette: { g: '#ffe45a' } },
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

  // ジェネシス用: 天から降る黄金の光の柱
  const pillar = scene.textures.createCanvas('fx_pillar_0', 14, 56)!;
  const pctx = pillar.getContext();
  const grad = pctx.createLinearGradient(0, 0, 14, 0);
  grad.addColorStop(0, 'rgba(255,210,74,0)');
  grad.addColorStop(0.25, 'rgba(255,210,74,0.55)');
  grad.addColorStop(0.5, 'rgba(255,250,220,0.95)');
  grad.addColorStop(0.75, 'rgba(255,210,74,0.55)');
  grad.addColorStop(1, 'rgba(255,210,74,0)');
  pctx.fillStyle = grad;
  pctx.fillRect(0, 0, 14, 56);
  pillar.refresh();
  // タイル
  makeTile(scene, 'tile_grass', 'grass');
  makeTile(scene, 'tile_sky', 'sky');
  makeTile(scene, 'tile_dark', 'dark');
  makeTile(scene, 'tile_void', 'void');
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
  for (const who of [
    'warrior', 'warrior2', 'warrior3', 'warrior4', 'warrior5',
    'mage', 'mage2', 'mage3', 'mage4', 'mage5',
  ]) {
    mk(`${who}_stand`, who, [0], 1);
    mk(`${who}_walk`, who, [1, 0, 2, 0], 10);
    mk(`${who}_attack`, who, [3], 1, 0);
  }
  // ボスアーキタイプの待機(浮遊・揺れ)アニメ
  for (const a of ['boss_mush', 'boss_demon', 'boss_drake', 'boss_golem', 'boss_beast', 'boss_knight', 'boss_witch', 'boss_clown', 'boss_lord', 'boss_titan']) {
    mk(`${a}_move`, a, [0, 1], 3);
  }
  mk('mushmom_move', 'mushmom', [0, 1], 3);
  mk('pinkbean_move', 'pinkbean', [0, 1], 3);
  mk('cygnus_move', 'cygnus', [0, 1], 4);
  mk('portal_spin', 'portal', [0, 1], 5);
  mk('fx_elquines_fly', 'fx_elquines', [0, 1], 8);
  mk('fx_darkspirit_idle', 'fx_darkspirit', [0, 1], 4);
  mk('fx_slash_play', 'fx_slash', [0, 1], 14, 0);
  mk('fx_claw_play', 'fx_claw', [0, 1], 14, 0);
  mk('fx_heal_play', 'fx_heal', [0, 1, 0, 1], 8, 0);
  mk('portal_spin2', 'portal', [0, 1], 8);
}
