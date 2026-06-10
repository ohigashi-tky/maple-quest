import Phaser from 'phaser';
import { createAllTextures, createAllAnims } from '../sprites';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    createAllTextures(this);
    createAllAnims(this);
    this.scene.start('Title');
  }
}
