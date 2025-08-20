# Cozy Express

A cozy, endless, build-your-own train side scroller (no combat), built with **Phaser 3**.  
Mechanics in this starter:
- **P1: Modular Train Synergies** (Dining↔Sleeper tips boost, Lounge↔Sleeper comfort bonus, Engine↔Lounge vibe ease).  
- **P3: On-board Mini-Jobs** (Boiler pressure, Tea brewing, Lounge vibe).
- **Endless vibe** with travel distance, simple biomes (Forest → Mountain → Coastline).
- **Rearrange carts** anytime (press **R**) to play with synergies.
- **LocalStorage** save (layout, coins, distance, options).

> Art is simple placeholder geometry so you can swap in pixel art later (Resurrect64 palette recommended).

## Controls
- **Left/Right / A/D**: Move
- **Up/W/Space**: Jump
- **E**: Interact (boiler/tea/vibe when nearby)
- **R**: Rearrangement mode (swap carts, apply, save)
- **F**: Toggle fullscreen
- **M**: Toggle music
- **ESC**: Pause menu

## Run locally
Just open `index.html` in a local server (most IDEs have a "Live Server"). Or from a terminal:
```bash
# Python 3
python -m http.server 8080
# then browse http://localhost:8080
```

## Deploy to GitHub Pages
1. Create a new repo (e.g., `cozy-express`).
2. Add/commit this folder and push.
3. In GitHub: **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: **main** (or `master`) / **root** (`/`), then **Save**.
4. Wait for the Pages URL to appear; it’ll look like `https://<user>.github.io/cozy-express/`.

> Tip: Include a `.nojekyll` file if you later add folders starting with `_` to avoid Jekyll processing.

## Swap art & audio later
- Replace the placeholder rectangles with pixel art sprites/tiles.
- Keep the **virtual resolution** at 400×225 for crisp pixels and scale to fullscreen automatically.
- Palette suggestion: **Resurrect64** for SNES/Stardew-like vibes.
