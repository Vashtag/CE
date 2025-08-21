# Crosscrawl v1 — Roguelite Crossword (Room Demo)

This is a **web-first prototype** of the Crosscrawl concept: a roguelite layer on top of mini crosswords.
v1 focuses on a **single room** with these mechanics:

- **Focus (HP):** Wrong letters deal 1 damage. Hit 0 = run over.
- **Red Pencil (Relic):** If enabled, the **first wrong letter** in the room deals **0 damage**.
- **Fog of Clue (Curse):** If enabled, a clue for an entry is blurred until you place **any letter** in that entry.
- **Consumables:** `Check Letter` (verifies a cell) and `Reveal Letter` (fills the correct letter, costs 1 Focus).

Keyboard-first controls:
- Type letters to fill cells. Incorrect letters **do not stick** and will deal damage once per cell.
- **Arrow keys** move; **Space** toggles direction (Across/Down).
- **Tab** jumps to the next entry; **Backspace** clears a cell.

---

## Local dev

Just open `index.html` in a modern browser. No build step, no deps.

## Host on GitHub Pages

1. **Create a new repository** on GitHub (e.g., `crosscrawl-v1`).  
2. **Upload these files** (or clone locally and push):  
   - `index.html`  
   - `styles.css`  
   - `js/puzzles.js`  
   - `js/main.js`  
   - `README.md`  
   - `LICENSE` (MIT)
3. **Commit** the changes to the `main` branch.
4. Go to **Settings → Pages**:
   - Source: **Deploy from a branch**
   - Branch: **main**  
   - Folder: **/(root)**
5. Save. GitHub will publish your site at a URL like:  
   `https://<your-username>.github.io/crosscrawl-v1/`
6. Share the link and iterate!

> Tip: If Pages errors about `404`, give it a minute, then refresh your repo's Actions tab to confirm the build succeeded.

---

## Add more rooms (puzzles)

All puzzle data lives in `js/puzzles.js`. The v1 room is a **4×4 word square** (every row and column is a valid word). To add more rooms:

```js
window.CROSSCRAWL_PUZZLES.push({
  id: "room-002",
  title: "Word Square Mini 2",
  size: 4,
  grid: [
    "WALL",
    "AREA",
    "LEAD",
    "LADY"
  ],
  acrossClues: [
    "Barrier of bricks",
    "Open expanse",
    "Guide; also a heavy metal",
    "Noblewoman"
  ],
  downClues: [
    "Structure that divides rooms",
    "Field of study or region",
    "To be in charge (verb)",
    "Polite term for a woman"
  ]
});
```

> **Note:** v1 intentionally sticks to simple **word-square rooms** to keep the code small and the crossing logic bulletproof. The engine supports `#` as a block cell if you want to experiment with classic patterns.

---

## What’s next (suggested v1.1 / v2)

- **Map screen** with branching nodes (Normal/Elite/Shop/Rest/Mystery/Boss).
- **Relic & curse pools** with rarity and selectable modifiers.
- **Timer par** bonus and an after-action run summary.
- **Multiple rooms** per run and a basic shop to buy extra checks/reveals.
- **Accessibility**: screen reader cues for clues and cell states; larger font toggle.

---

## License

MIT — do what you like, attribution appreciated.
