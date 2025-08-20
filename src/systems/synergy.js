// src/systems/synergy.js
export function computeSynergy(layout) {
  // layout: array of cart type strings: 'engine','sleeper','dining','lounge'
  let tipsMul = 1.0;
  let comfortBonus = 0; // +N (0..??) to base comfort (0..100)
  let ease = 0.0;       // widens green zone in some mini-games

  for (let i = 0; i < layout.length - 1; i++) {
    const a = layout[i], b = layout[i+1];
    const set = new Set([a,b]);
    if (set.has('dining') && set.has('sleeper')) tipsMul += 0.15; // diner tips
    if (set.has('lounge') && set.has('sleeper')) comfortBonus += 10; // cozy sleep vibes
    if (set.has('engine') && set.has('lounge')) ease += 0.05; // music carries, easier lounge
  }
  return { tipsMul, comfortBonus, ease };
}
