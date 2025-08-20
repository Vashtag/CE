// src/main.js
import GameScene from './scenes/GameScene.js';
import BootScene from './scenes/BootScene.js';

const VIRTUAL_WIDTH = 400;
const VIRTUAL_HEIGHT = 225;

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0e1016',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: VIRTUAL_WIDTH,
    height: VIRTUAL_HEIGHT
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 800 },
      debug: false
    }
  },
  scene: [BootScene, GameScene]
};

new Phaser.Game(config);
