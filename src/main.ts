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
  input: { activePointers: 4 },
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
