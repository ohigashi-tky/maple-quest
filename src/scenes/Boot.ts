import Phaser from 'phaser';
import { createAllTextures, createAllAnims, createDamageDigits } from '../sprites';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    createAllTextures(this);
    createAllAnims(this);
    createDamageDigits(this);
    this.scene.start('Title');
  }
}
