import Phaser from 'phaser';
import BootScene from './scenes/Boot';
import TitleScene from './scenes/Title';
import GameScene from './scenes/Game';
import HudScene from './scenes/Hud';

export const VIEW_W = 540;
export const VIEW_H = 960;

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
