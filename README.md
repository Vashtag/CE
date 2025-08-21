# CROSSCRAWL — Roguelite Crossword (v1)

A tiny, static, web-based prototype that mixes **roguelite** vibes with **crossword** play. No build tools, no backend — just HTML/CSS/JS. Perfect for GitHub Pages.

> This v1 is deliberately small: 3 rooms per run, **Red Pencil** relic (first wrong is free per room), and a **Fog of Clue** curse (clues are hidden unless you Peek for 1 Focus).

---

## ✨ Features in v1
- 3-room run (mini 5×5 grids).
- **Focus (HP)**: wrong letters cost 1 Focus.
- **Relic:** Red Pencil — first wrong letter per room deals 0 damage.
- **Curse:** Fog of Clue — clues are hidden; you can “Peek” at the current clue for 1 Focus.
- **Consumables:** Checks (validate a typed letter) and Reveals (fill a letter).
- Keyboard-first UX (letters, arrows, Backspace, Tab/Shift+Tab, Space).  
- High-contrast mode.
- Local high score.

---

## 🗂️ Project Structure
```
crosscrawl-v1/
├── index.html
├── style.css
├── js/
│   ├── main.js
│   └── puzzles.js
└── assets/   (optional)
```

---

## ▶️ Run Locally
Just open `index.html` in a modern browser — no server needed.

For a quick local server (optional), in the folder:
```bash
python3 -m http.server 8000
```
Then visit `http://localhost:8000`.

---

## 🚀 Deploy to GitHub Pages
1. Create a new GitHub repo (e.g., `crosscrawl-v1`).  
2. Add these files and push:
   ```bash
   git init
   git add .
   git commit -m "CROSSCRAWL v1"
   git branch -M main
   git remote add origin https://github.com/<your-username>/crosscrawl-v1.git
   git push -u origin main
   ```
3. In the GitHub repo: **Settings → Pages**  
   - **Source:** `Deploy from a branch`  
   - **Branch:** `main` / `/ (root)`  
   - Save.  
4. Wait a moment; your site will be live at:  
   `https://<your-username>.github.io/crosscrawl-v1/`

---

## 🧩 Adding Puzzles
Open `js/puzzles.js`. Each puzzle is:

```js
{
  id: "p7",
  size: 5,
  rows: ["ALERT", "ON#ME", "TEASE", "IN#TO", "START"],
  across: [
    { no: 1, row: 0, col: 0, len: 5, answer: "ALERT", clue: "Warn" },
    // each across entry = starting row/col, length, answer, and clue
  ]
}
```

- `rows` is an array of **length `size`** where each string is exactly `size` characters. Use `#` for black squares.  
- Across entries must match the `rows` data (start positions and lengths).  
- This v1 uses **across clues only**; down clues aren’t shown yet.

Tip: keep mini grids simple (5×5), and use common words, especially for the short (2-letter) entries.

---

## 🧱 Mechanics Notes
- **Focus loss** happens on wrong letter placements.  
- **Red Pencil** absorbs the **first** wrong letter per room.  
- **Peek Clue** (Fog of Clue) reveals the current clue for 1 Focus.  
- **Check** indicates if your typed letter is correct (no damage).  
- **Reveal** fills the selected cell with the correct letter (limited uses).  
- **Scoring:** correct letters − wrongs + time bonus (par = 120s).

---

## 🗺️ What’s next (Milestone 2+ ideas)
- Branching map with Normal/Elite/Shop/Rest rooms
- More relics & curses (synergies!)
- Down clues + clue types (defs, light wordplay)
- Better scoring, streaks, and daily seeds
- Accessibility polish (screen reader focus flow)

---

## 📄 License
MIT — feel free to remix. See `LICENSE`.
