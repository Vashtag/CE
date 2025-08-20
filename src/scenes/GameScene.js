// src/scenes/GameScene.js
import { computeSynergy } from '../systems/synergy.js';
import { loadSave, saveState } from '../systems/save.js';
import { startBoilerMini, startTeaMini, startLoungeMini } from '../systems/miniGames.js';

const VIRTUAL_WIDTH = 400;
const VIRTUAL_HEIGHT = 225;
const FLOOR_Y = 185;
const CAR_W = 160;
const CAR_H = 96;
const GAP = 8;

const CART_DEFS = {
  engine: { key: 'cart_engine', label: 'Engine', interact: { x: 50, type: 'boiler' } },
  sleeper: { key: 'cart_sleeper', label: 'Sleeper', interact: { x: 80, type: 'rest' } },
  dining: { key: 'cart_dining', label: 'Dining', interact: { x: 80, type: 'tea' } },
  lounge: { key: 'cart_lounge', label: 'Lounge', interact: { x: 90, type: 'vibe' } }
};

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    // Load / defaults
    const save = loadSave();
    this.state = {
      layout: save?.layout || ['engine','sleeper','dining','lounge'],
      coins: save?.coins ?? 20,
      distance: save?.distance ?? 0,
      biome: save?.biome || 'forest',
      musicOn: save?.musicOn ?? true,
      unlocked: save?.unlocked || { steam: true, diesel: false, electric: false },
      comfort: 55,
      tipsMul: 1.0,
      ease: 0,
      pressure: save?.pressure ?? 50
    };

    this._makeBackground();
    this._buildTrain();
    this._makePlayer();
    this._makeUI();
    this._wireInputs();
    this._recalcSynergy();
    this._setupAutoSave();

    // loop timers
    this.lastTick = this.time.now;
    this.lastRevenue = this.time.now;
    this.musicNode = null;
    if (this.state.musicOn) this._startMusic();
  }

  _makeBackground() {
    // Very simple parallax rectangles
    this.sky = this.add.rectangle(0,0,VIRTUAL_WIDTH,VIRTUAL_HEIGHT,0x0b1220).setOrigin(0,0).setScrollFactor(0);
    this.far = this.add.tileSprite(0, 60, VIRTUAL_WIDTH, 40, 'dot').setOrigin(0,0).setScrollFactor(0);
    this.mid = this.add.tileSprite(0, 90, VIRTUAL_WIDTH, 30, 'dot').setOrigin(0,0).setScrollFactor(0);
    this.near = this.add.tileSprite(0, 120, VIRTUAL_WIDTH, 60, 'dot').setOrigin(0,0).setScrollFactor(0);

    this._applyBiomeColors('forest');
  }

  _applyBiomeColors(name) {
    this.state.biome = name;
    if (name === 'forest') {
      this.sky.fillColor = 0x0b1220;
      this.far.tint = 0x1b3a2e; this.mid.tint = 0x24533e; this.near.tint = 0x2f6f51;
    } else if (name === 'mountain') {
      this.sky.fillColor = 0x111421;
      this.far.tint = 0x333b4d; this.mid.tint = 0x44546e; this.near.tint = 0x556d8f;
    } else if (name === 'coast') {
      this.sky.fillColor = 0x0b1a2b;
      this.far.tint = 0x1a4a7a; this.mid.tint = 0x2479b3; this.near.tint = 0x2fa9ec;
    }
  }

  _buildTrain() {
    // Clear previous
    if (this.floorGroup) this.floorGroup.clear(true,true);
    if (this.carts) this.carts.forEach(c => c.destroy());
    this.floorGroup = this.physics.add.staticGroup();
    this.carts = [];

    // Build carts from layout
    const L = this.state.layout.length;
    const totalWidth = L * CAR_W + (L-1)*GAP;
    let x0 = 20;

    for (let i = 0; i < L; i++) {
      const type = this.state.layout[i];
      const def = CART_DEFS[type];
      const x = x0 + i*(CAR_W+GAP);
      const y = FLOOR_Y - CAR_H + 8;

      // cart sprite
      const spr = this.add.sprite(x, y, def.key).setOrigin(0,0);
      this.carts.push({ type, x, y, spr, def });

      // floor collider
      const floor = this.add.rectangle(x+CAR_W/2, FLOOR_Y-6, CAR_W, 6, 0x000000, 0);
      this.physics.add.existing(floor, true);
      this.floorGroup.add(floor);

      // left/right walls (thin, to keep inside cart)
      const lw = this.add.rectangle(x-2, FLOOR_Y-28, 4, CAR_H-30, 0x000000, 0);
      const rw = this.add.rectangle(x+CAR_W+2, FLOOR_Y-28, 4, CAR_H-30, 0x000000, 0);
      this.physics.add.existing(lw, true); this.physics.add.existing(rw, true);
      this.floorGroup.add(lw); this.floorGroup.add(rw);

      // interaction point
      const ix = x + def.interact.x;
      const iy = FLOOR_Y - 20;
      const icon = this.add.sprite(ix, iy-18, 'dot').setVisible(false);
      this.carts[i].ix = ix; this.carts[i].iy = iy; this.carts[i].icon = icon;
      this.carts[i].iType = def.interact.type;
    }

    // World bounds & camera
    const worldWidth = totalWidth + 40;
    this.physics.world.setBounds(0, 0, worldWidth, VIRTUAL_HEIGHT);
    this.cameras.main.setBounds(0, 0, worldWidth, VIRTUAL_HEIGHT);
  }

  _makePlayer() {
    const spawnX = this.carts[1].x + 40;
    const spawnY = FLOOR_Y - 20;

    this.player = this.physics.add.sprite(spawnX, spawnY, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(10, 16);
    this.player.body.setOffset(0, 0);
    this.physics.add.collider(this.player, this.floorGroup);

    // camera follow
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  _makeUI() {
    this.ui = {};
    this.ui.text = this.add.text(6, 6, '', { fontSize: '12px', color: '#e6e6e6' }).setScrollFactor(0);
    this.ui.bottom = this.add.text(6, VIRTUAL_HEIGHT-16, 'E: interact  R: rearrange  F: fullscreen  M: music  ESC: pause', { fontSize: '10px', color: '#999' }).setScrollFactor(0);
    this._refreshUI();
  }

  _refreshUI() {
    this.ui.text.setText(
      `Coins: ${this.state.coins}   Dist: ${Math.floor(this.state.distance)}m   Biome: ${this.state.biome}
Comfort: ${Math.round(this.state.comfort)}   Tips x${this.state.tipsMul.toFixed(2)}   Pressure: ${Math.round(this.state.pressure)}`
    );
  }

  _wireInputs() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,E,R,F,M,ESC');

    this.input.keyboard.on('keydown-F', () => {
      if (this.scale.isFullscreen) this.scale.stopFullscreen(); else this.scale.startFullscreen();
    });
    this.input.keyboard.on('keydown-M', () => {
      this.state.musicOn = !this.state.musicOn;
      if (this.state.musicOn) this._startMusic(); else this._stopMusic();
      this._save();
    });
    this.input.keyboard.on('keydown-R', () => this._openRearrange());
    this.input.keyboard.on('keydown-ESC', () => this._togglePause());
  }

  _togglePause() {
    this.paused = !this.paused;
    if (this.paused) {
      this.pauseText = this.add.text(100, 100, 'Paused', {fontSize:'16px', color:'#ffe066'}).setScrollFactor(0);
    } else {
      this.pauseText?.destroy();
    }
  }

  _setupAutoSave() {
    this.time.addEvent({
      delay: 10000,
      loop: true,
      callback: () => this._save()
    });
    window.addEventListener('beforeunload', () => this._save());
  }

  _save() {
    saveState({
      layout: this.state.layout,
      coins: this.state.coins,
      distance: this.state.distance,
      biome: this.state.biome,
      musicOn: this.state.musicOn,
      pressure: this.state.pressure,
      unlocked: this.state.unlocked
    });
  }

  _recalcSynergy() {
    const s = computeSynergy(this.state.layout);
    this.state.tipsMul = s.tipsMul;
    this.state.ease = s.ease;
    this.state.comfortBase = 55 + s.comfortBonus;
  }

  update(time, delta) {
    if (this.paused) return;

    // Player controls
    const onGround = this.player.body.onFloor();
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keys.W) || Phaser.Input.Keyboard.JustDown(this.cursors.space);

    const speed = 90;
    if (left) this.player.setVelocityX(-speed);
    else if (right) this.player.setVelocityX(speed);
    else this.player.setVelocityX(0);
    if (up && onGround) this.player.setVelocityY(-250);

    // Close E prompt by default
    this.carts.forEach(c => c.icon.setVisible(false));

    // Interaction prompt when near an interact point
    const p = this.player;
    for (const cart of this.carts) {
      const dx = Math.abs(p.x - cart.ix); const dy = Math.abs(p.y - cart.iy);
      if (dx < 16 && dy < 24) {
        cart.icon.setVisible(true);
        // Start interaction
        if (Phaser.Input.Keyboard.JustDown(this.keys.E) && !this.miniActive) {
          if (cart.iType === 'boiler') this._startBoiler();
          else if (cart.iType === 'tea') this._startTea();
          else if (cart.iType === 'vibe') this._startLounge();
          else if (cart.iType === 'rest') this._rest();
          break;
        }
      }
    }

    // Travel & revenue
    const dt = delta/1000;
    // pressure trends toward 45 over time unless maintained
    this.state.pressure += (45 - this.state.pressure) * 0.05 * dt;
    this.state.pressure = Phaser.Math.Clamp(this.state.pressure, 0, 100);
    // speed from pressure
    const trainSpeed = 0.8 + (this.state.pressure/100)*1.2; // 0.8..2.0 m/s (virtual)
    this.state.distance += trainSpeed * 10 * dt;

    // Parallax scroll (fake outside)
    this.far.tilePositionX += trainSpeed * 2 * dt;
    this.mid.tilePositionX += trainSpeed * 8 * dt;
    this.near.tilePositionX += trainSpeed * 16 * dt;

    // comfort drifts to base + vibe contributions when mini-games ran recently
    const comfortTarget = this.state.comfortBase + (this.vibeBonus || 0);
    this.state.comfort += (comfortTarget - this.state.comfort) * 0.5 * dt;
    this.state.comfort = Phaser.Math.Clamp(this.state.comfort, 0, 100);

    // revenue tick (every ~2s)
    if (time - this.lastRevenue > 2000) {
      this.lastRevenue = time;
      const baseFare = 1.2;
      const tips = baseFare * (this.state.comfort/100) * (this.state.tipsMul - 1);
      const earn = baseFare + tips;
      this.state.coins += Math.round(earn);
    }

    // Simple biome switch by distance
    if (this.state.distance > 1200 && this.state.biome === 'forest') this._applyBiomeColors('mountain');
    if (this.state.distance > 2400 && this.state.biome === 'mountain') this._applyBiomeColors('coast');

    this._refreshUI();
  }

  async _startBoiler() {
    this.miniActive = true;
    const res = await startBoilerMini(this, { ease: this.state.ease });
    this.state.coins += res.coins;
    this.state.pressure = res.pressure;
    this._refreshUI();
    this.miniActive = false;
    this._beep(220, 0.08);
  }

  async _startTea() {
    this.miniActive = true;
    const res = await startTeaMini(this, { ease: this.state.ease });
    this.state.coins += res.coins;
    this.state.comfort += res.comfort;
    this._refreshUI();
    this.miniActive = false;
    this._beep(660, 0.06);
  }

  async _startLounge() {
    this.miniActive = true;
    const res = await startLoungeMini(this, { ease: this.state.ease });
    this.state.coins += res.coins;
    this.vibeBonus = res.comfort; // temp buff, lerped in update
    this.time.delayedCall(15000, () => { this.vibeBonus = 0; });
    this._refreshUI();
    this.miniActive = false;
    this._beep(330, 0.06);
  }

  _rest() {
    // Small comfort bump
    this.state.comfort = Math.min(100, this.state.comfort + 4);
    this._refreshUI();
    this._beep(440, 0.04);
  }

  _openRearrange() {
    if (this.miniActive) return;
    this.paused = true;
    const overlay = this.add.rectangle(0,0,VIRTUAL_WIDTH,VIRTUAL_HEIGHT,0x000000,0.6).setOrigin(0,0).setScrollFactor(0);
    const panel = this.add.rectangle(10, 40, VIRTUAL_WIDTH-20, 140, 0x0b0d13, 1).setOrigin(0,0).setScrollFactor(0);
    const title = this.add.text(18, 46, 'Rearrange Carts (Q/E swap, ENTER apply, ESC cancel)', {fontSize:'12px', color:'#ffe066'}).setScrollFactor(0);

    let arr = this.state.layout.slice();
    let idx = 0;
    const slots = [];

    const draw = () => {
      slots.forEach(s => s.forEach(o => o.destroy()));
      slots.length = 0;
      for (let i=0;i<arr.length;i++) {
        const x = 24 + i* (VIRTUAL_WIDTH-48)/(arr.length-1);
        const y = 120;
        const def = CART_DEFS[arr[i]];
        const spr = this.add.sprite(x-30, y-24, def.key).setScrollFactor(0).setScale(0.36).setOrigin(0,0);
        const lbl = this.add.text(x-30, y+18, def.label, {fontSize:'10px', color:i===idx?'#ffe066':'#aaa'}).setScrollFactor(0);
        slots.push([spr,lbl]);
      }
    };
    draw();

    const keys = this.input.keyboard.addKeys('Q,E,ENTER,ESC');
    const onKey = (ev) => {
      if (ev.code === 'ArrowLeft' || ev.code === 'KeyA') idx = (idx+arr.length-1)%arr.length;
      if (ev.code === 'ArrowRight' || ev.code === 'KeyD') idx = (idx+1)%arr.length;
      if (ev.code === 'KeyQ') { if (idx>0) [arr[idx-1],arr[idx]] = [arr[idx],arr[idx-1]]; idx--; }
      if (ev.code === 'KeyE') { if (idx<arr.length-1) [arr[idx+1],arr[idx]] = [arr[idx],arr[idx+1]]; idx++; }
      if (ev.code === 'Enter') {
        this.state.layout = arr;
        this._recalcSynergy();
        // rebuild train preserving approximate player position (by cart index)
        const cartIdx = Math.min(Math.floor((this.player.x-20)/(CAR_W+GAP)), this.state.layout.length-1);
        const relX = this.player.x - (20 + cartIdx*(CAR_W+GAP));
        this._buildTrain();
        const nx = 20 + cartIdx*(CAR_W+GAP) + relX;
        this.player.setX(nx); this.player.setY(FLOOR_Y-20); this.physics.world.resume();
        cleanup();
      }
      if (ev.code === 'Escape') cleanup();
      draw();
    };
    this.input.keyboard.on('keydown', onKey);

    const cleanup = () => {
      this.input.keyboard.off('keydown', onKey);
      overlay.destroy(); panel.destroy(); title.destroy();
      slots.forEach(s => s.forEach(o => o.destroy()));
      this.paused = false;
      this._beep(500, 0.05);
    };
  }

  _startMusic() {
    if (this.musicNode) return;
    const ctx = this.sound.context;
    if (!ctx) return;
    const o1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    o1.type = 'triangle';
    o1.frequency.value = 220;
    g1.gain.value = 0.0008;
    o1.connect(g1).connect(ctx.destination);
    o1.start();
    this.musicNode = { o1, g1 };
  }

  _stopMusic() {
    if (!this.musicNode) return;
    const { o1, g1 } = this.musicNode;
    try { o1.stop(); } catch {}
    g1.disconnect();
    this.musicNode = null;
  }

  _beep(freq=440, dur=0.05) {
    const ctx = this.sound.context;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.value = 0.02;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    setTimeout(() => { try { osc.stop(); } catch {} gain.disconnect(); }, Math.floor(dur*1000));
  }
}
