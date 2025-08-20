// src/systems/miniGames.js
// Minimal micro-games rendered on a HUD overlay Graphics.
// Each mini returns a Promise resolved with a result object.
export function startBoilerMini(scene, opts = {}) {
  // Keep needle in green zone by holding E. 7 seconds.
  const duration = 7000;
  const ease = opts.ease || 0;
  const greenCenter = 55;
  const greenHalf = 10 + Math.floor(ease * 40); // widen with synergy
  let t0 = scene.time.now;
  let score = 0;
  let v = 50; // pressure 0..100

  const hud = scene.add.container(0,0).setScrollFactor(0);
  const g = scene.add.graphics().setScrollFactor(0);
  hud.add(g);

  const w = scene.scale.gameSize.width;
  const h = scene.scale.gameSize.height;
  const cx = w/2, cy = h/2 + 10;

  const text = scene.add.bitmapText ? null : scene.add.text(cx-60, cy-60, 'BOILER', {fontSize: '12px', color:'#ffe066'});
  if (text) hud.add(text);

  const keyE = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

  const update = (time, delta) => {
    // Physics of needle
    const holding = keyE.isDown;
    if (holding) v += 40 * (delta/1000);
    else v -= 18 * (delta/1000);
    // random drift
    v += (Math.random()-0.5) * 8 * (delta/1000);
    v = Phaser.Math.Clamp(v, 0, 100);

    // score when inside green
    if (Math.abs(v - greenCenter) <= greenHalf) score += delta;

    // draw
    g.clear();
    // panel
    g.fillStyle(0x0b0d13, 1).fillRect(cx-90, cy-20, 180, 40);
    // green zone
    const barX = cx-80, barW = 160, barY = cy-5;
    g.fillStyle(0x19311f, 1).fillRect(barX, barY, barW, 10);
    const gzL = Phaser.Math.Clamp((greenCenter-greenHalf)/100, 0, 1);
    const gzR = Phaser.Math.Clamp((greenCenter+greenHalf)/100, 0, 1);
    g.fillStyle(0x46c768, 1).fillRect(barX + gzL*barW, barY, (gzR-gzL)*barW, 10);
    // needle
    g.fillStyle(0xffe066, 1).fillRect(barX + (v/100)*barW - 1, barY-2, 2, 14);

    if (time - t0 >= duration) {
      scene.events.off('update', update);
      hud.destroy();
      const pct = Phaser.Math.Clamp(score / duration, 0, 1);
      const coins = Math.round(6 + 10*pct);
      const pressure = Math.round(40 + 40*pct);
      resolve({ coins, pressure });
    }
  };

  let resolve;
  const p = new Promise(res => resolve = res);
  scene.events.on('update', update);
  return p;
}

export function startTeaMini(scene, opts = {}) {
  // Hit E when pointer is in green wedge. 3 rounds.
  const rounds = 3;
  const speed = 2.2; // rotations/sec
  const ease = opts.ease || 0;
  const wedgeDeg = 40 + Math.floor(ease * 60);
  const results = [];

  const hud = scene.add.container(0,0).setScrollFactor(0);
  const g = scene.add.graphics().setScrollFactor(0);
  const w = scene.scale.gameSize.width;
  const h = scene.scale.gameSize.height;
  const cx = w/2, cy = h/2 + 6;

  const text = scene.add.text(cx-48, cy-64, 'TEA TIME', {fontSize:'12px', color:'#ffe066'});
  hud.add(text); hud.add(g);

  const keyE = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

  let theta = 0;
  let curr = 0; // 0..rounds-1
  let locked = false;

  const draw = () => {
    g.clear();
    // Dial
    g.fillStyle(0x0b0d13, 1).fillRect(cx-70, cy-40, 140, 80);
    const r = 26;
    // wedge
    const start = Phaser.Math.DegToRad(-wedgeDeg/2);
    const end = Phaser.Math.DegToRad(wedgeDeg/2);
    g.fillStyle(0x16311f,1).slice(cx,cy,r,start,end,true).fillPath();
    g.lineStyle(2, 0x46c768, 1).beginPath();
    g.arc(cx, cy, r, start, end); g.strokePath();
    // pointer
    const px = cx + Math.cos(theta)*r;
    const py = cy + Math.sin(theta)*r;
    g.lineStyle(2, 0xffe066, 1).beginPath();
    g.moveTo(cx, cy); g.lineTo(px, py); g.strokePath();
    // round dots
    for (let i=0;i<rounds;i++) {
      g.fillStyle(i<curr?0x46c768:0x333333,1).fillRect(cx-30 + i*20, cy+26, 14, 6);
    }
  };

  const update = (time, delta) => {
    theta += speed * 2*Math.PI * (delta/1000);
    theta %= Math.PI*2;
    if (Phaser.Input.Keyboard.JustDown(keyE) && !locked) {
      // success if near 0 angle (within wedge)
      const deg = Phaser.Math.RadToDeg((theta + Math.PI*2)%(Math.PI*2)) - 180; // center at 0
      const good = Math.abs(deg) <= wedgeDeg/2;
      results.push(good);
      curr++;
      locked = true;
      scene.time.delayedCall(250, () => locked=false);
      if (curr === rounds) {
        scene.events.off('update', update);
        hud.destroy();
        const wins = results.filter(Boolean).length;
        const coins = 2 + wins*4;
        const comfort = wins*3;
        resolve({ coins, comfort });
      }
    }
    draw();
  };

  let resolve; const p = new Promise(res => resolve = res);
  scene.events.on('update', update);
  return p;
}

export function startLoungeMini(scene, opts = {}) {
  // Keep vibe in the band by tapping E. 8 seconds.
  const duration = 8000;
  const ease = opts.ease || 0;
  const band = 12 + Math.floor(ease * 30);
  let t0 = scene.time.now;
  let v = 50;
  let score = 0;

  const hud = scene.add.container(0,0).setScrollFactor(0);
  const g = scene.add.graphics().setScrollFactor(0);
  hud.add(g);
  const w = scene.scale.gameSize.width;
  const h = scene.scale.gameSize.height;
  const cx = w/2, cy = h/2 + 10;

  const keyE = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

  const update = (time, delta) => {
    // target drifts
    const target = 60 + Math.sin(time/700)*10;
    // dynamics
    if (keyE.isDown) v += 50 * (delta/1000); else v -= 18*(delta/1000);
    v += (Math.random()-0.5)*10*(delta/1000);
    v = Phaser.Math.Clamp(v, 0, 100);

    if (Math.abs(v-target) <= band) score += delta;

    g.clear();
    g.fillStyle(0x0b0d13, 1).fillRect(cx-90, cy-20, 180, 40);
    const barX = cx-80, barW = 160, barY = cy-5;
    g.fillStyle(0x1c1e24, 1).fillRect(barX, barY, barW, 10);
    // band
    const tL = Phaser.Math.Clamp((target-band)/100, 0, 1);
    const tR = Phaser.Math.Clamp((target+band)/100, 0, 1);
    g.fillStyle(0x6a3e8a, 1).fillRect(barX + tL*barW, barY, (tR-tL)*barW, 10);
    // needle
    g.fillStyle(0xffe066, 1).fillRect(barX + (v/100)*barW - 1, barY-2, 2, 14);

    if (time - t0 >= duration) {
      scene.events.off('update', update);
      hud.destroy();
      const pct = Phaser.Math.Clamp(score / duration, 0, 1);
      const coins = Math.round(4 + 8*pct);
      const comfort = Math.round(4 + 6*pct);
      resolve({ coins, comfort });
    }
  };

  let resolve; const p = new Promise(res => resolve = res);
  scene.events.on('update', update);
  return p;
}
