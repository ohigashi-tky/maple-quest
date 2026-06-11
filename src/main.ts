import Phaser from 'phaser';
import BootScene from './scenes/Boot';
import TitleScene from './scenes/Title';
import GameScene from './scenes/Game';
import HudScene from './scenes/Hud';

export const VIEW_W = 540;

// 端末の画面比率に合わせて論理解像度の高さを決める(スマホで黒帯を出さないため)。
// 横長(PC)では 960 に収めて左右レターボックスにする。
function computeViewH(): number {
  const aspect = window.innerHeight / Math.max(1, window.innerWidth);
  const h = Math.round((VIEW_W * aspect) / 2) * 2;
  return Math.max(960, Math.min(1200, h));
}

export const VIEW_H = computeViewH();

// ホーム画面追加(スタンドアロンPWA)で起動しているか
function isStandalone(): boolean {
  try {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
      || (navigator as unknown as { standalone?: boolean }).standalone === true;
  } catch { return false; }
}

// iPhoneのセーフエリア(ダイナミックアイランド/ステータスバー)を避けるための上部余白(ゲーム内座標)
function computeSafeTop(): number {
  let insetPx = 0;
  try {
    // padding-top に env() を当てて computed style から確実に解決値(px)を読む
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px);';
    document.body.appendChild(probe);
    insetPx = parseFloat(getComputedStyle(probe).paddingTop) || 0;
    probe.remove();
  } catch { /* ignore */ }

  // スタンドアロン起動なのに env が取れない端末向けのフォールバック
  // (ノッチ/ダイナミックアイランド相当の最低余白を確保)
  if (isStandalone() && insetPx < 20) {
    insetPx = Math.max(insetPx, 50);
  }
  // 画面CSSピクセル→ゲーム内座標へ変換(縦は画面いっぱいに描画)
  const units = insetPx * VIEW_H / Math.max(1, window.innerHeight);
  return Math.round(units);
}
export const SAFE_TOP = computeSafeTop();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: VIEW_W,
  height: VIEW_H,
  parent: 'app',
  backgroundColor: '#1a1430',
  pixelArt: true,
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 900 }, debug: false },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 6 },
  scene: [BootScene, TitleScene, GameScene, HudScene],
};

const game = new Phaser.Game(config);
// E2Eテスト・デバッグ用フック
(window as unknown as Record<string, unknown>).__PHASER_GAME__ = game;

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
