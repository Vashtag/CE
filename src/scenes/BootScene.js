// src/scenes/BootScene.js
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // No external assets; we generate simple textures.
  }

  create() {
    this._makeBasicTextures();
    this.scene.start('Game');
  }

  _makeBasicTextures() {
    const g = this.add.graphics();

    // Player
    g.clear();
    g.fillStyle(0xf2e9de, 1);
    g.fillRect(0, 0, 10, 16);
    g.fillStyle(0x222222, 1);
    g.fillRect(2, 5, 2, 2);
    g.fillRect(6, 5, 2, 2);
    g.fillRect(3, 12, 4, 2); // shoes
    g.generateTexture('player', 10, 16);

    // Cart base textures (simple rounded rectangles + window hints)
    const makeCart = (key, body, stripe) => {
      const w = 160, h = 96;
      g.clear();
      // body
      g.fillStyle(body, 1);
      g.fillRect(0, 0, w, h);
      // stripe
      g.fillStyle(stripe, 1);
      g.fillRect(0, 16, w, 8);
      // windows (just decorative)
      g.fillStyle(0x1a2333, 1);
      for (let i = 0; i < 4; i++) {
        g.fillRect(16 + i*32, 32, 24, 16);
      }
      // floor
      g.fillStyle(0x1b1f27, 1);
      g.fillRect(0, h-10, w, 10);
      g.generateTexture(key, w, h);
    };

    makeCart('cart_engine', 0x5e503f, 0x9c6644);
    makeCart('cart_sleeper', 0x355c7d, 0x6c5b7b);
    makeCart('cart_dining', 0x8a5f3e, 0xc97b63);
    makeCart('cart_lounge', 0x6a3e8a, 0xa262c2);

    // Icons / UI
    g.clear();
    g.fillStyle(0xffe066, 1);
    g.fillRect(0,0,6,6);
    g.generateTexture('dot', 6, 6);

    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0,0,12,12);
    g.fillStyle(0x000000, 1);
    g.fillRect(2,2,8,8);
    g.generateTexture('btn', 12, 12);

    g.clear();
    g.fillStyle(0x7fd1b9, 1);
    g.fillRect(0,0,60,10);
    g.fillStyle(0x0b0d13, 1);
    g.fillRect(0,0,60,2);
    g.fillRect(0,8,60,2);
    g.generateTexture('bar', 60, 10);

    g.destroy();
  }
}
