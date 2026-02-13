# Shadow Signal (TCSS 491)

**Shadow Signal** is a 2D **top-down stealth infiltration** web game built using the **TCSS 491 provided engine** (`algorithm0r/Empty--GameEngine`) — a bare-bones HTML5 Canvas game loop + input + asset manager.

Repo: `boxerarakelyan777/shadowsignal`

---

## Tech Stack (Course Required)

- **Language:** JavaScript (ES6)
- **Engine:** `Empty--GameEngine` (Canvas + `GameEngine` + `AssetManager`)
- **Hosting:** GitHub Pages (static deploy from branch)
- **Local Dev:** any local static server (Python or VS Code Live Server)

---

## Final Art Requirement (Must-Have)

Final release target: the game must be fully sprite-based.

- [ ] Floor and wall rendering uses sprite/tile assets (no plain color block world in final).
- [ ] Player and guard visuals use sprite sheets/animations in all gameplay states.
- [ ] Interactables (door, keycard, terminal, hide spots, exit) use sprites.
- [ ] UI screens (splash/menu/level select/credits/pause/win/loss) use final art assets.
- [ ] Rectangle/debug rendering remains only as development fallback, not final presentation.

---

## Global Component System

The project now uses a central component registry so one change can update many places.

- `src/config/components.js` holds shared defaults, visual styles, sprite paths, and prefab builders.
- Levels use prefab creators (`createWall`, `createHideSpot`, `createTerminal`, etc.) instead of raw objects.
- `normalizeLevelComponents(level)` runs on level load in `main.js` to apply defaults consistently.
- `LevelRenderer` reads component visuals from the registry, so changing a visual token in one file updates all matching components.
- Player and guard baseline settings also read centralized defaults from the component registry.

---

## Quick Start (All OS)

### 1) Clone + checkout `dev`
```bash
git clone https://github.com/boxerarakelyan777/shadowsignal.git
cd shadowsignal
git checkout dev
```

### 2) Run a local server

**Option A (Python — recommended):**
```bash
python3 -m http.server 8000
```
Open:
- http://localhost:8000

**Option B (VS Code Live Server):**
- Install extension: **Live Server**
- Right-click `index.html` → **Open with Live Server**
---

## Controls (Current Prototype)

- **Move:** `WASD` or Arrow Keys  
- **Interact / Hide toggle:** `E` (while standing on a hide spot)

---

## Project Structure

```
/
  index.html
  main.js
  assetmanager.js
  gameengine.js
  timer.js
  util.js
  assets/
    sprites/
    audio/
  src/
    entities/
      player.js
      guard.js
      level.js
    systems/
      collision.js
      vision.js
    levels/
      testLevel.js
```

### Key Files
- **`index.html`**: loads engine scripts and our game scripts (order matters)
- **`main.js`**: game bootstrap (creates engine, loads level, adds entities)
- **`src/levels/testLevel.js`**: rectangle-based test level layout (walls, exit, hide spots, guard waypoints)
- **`src/systems/collision.js`**: AABB collision + movement resolution against wall rectangles
- **`src/systems/vision.js`**: FOV + line-of-sight (segment vs wall-rect)
- **`src/entities/*.js`**: Player / Guard / LevelRenderer




## GitHub Pages Deployment (Static)

This project is static HTML/JS (no build step). Pages should be configured as:

**Repo → Settings → Pages**
- **Source:** Deploy from a branch  
- **Branch:** `main`  
- **Folder:** `/ (root)`

Live URL (expected):
- https://boxerarakelyan777.github.io/shadowsignal/
