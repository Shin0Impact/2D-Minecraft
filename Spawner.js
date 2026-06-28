// Spawner.js — controls when and where enemies appear in the world

class SpawnerSystem {
  constructor(engine) {
    this.engine = engine;
    // max enemies alive at once (includes the first zombie)
    this.maxEnemies = 4;
    // how often the off-screen spawner runs (ms)
    this.spawnInterval = 5000;
    this._spawnerTimer = null;
  }

  // Places the guaranteed first zombie near spawn, then starts the repeating spawner
  start() {
    this._placeInitialZombie();
    this._spawnerTimer = setInterval(
      () => this._trySpawn(),
      this.spawnInterval,
    );
  }

  // Clears all enemies and restarts from scratch — called on world reset
  reset() {
    const engine = this.engine;
    engine.enemies.forEach((e) => e.DOMElement.remove());
    engine.enemies = [];
    if (this._spawnerTimer) clearInterval(this._spawnerTimer);
    this.start();
  }

  // Drops a zombie just off to the right of the player spawn column
  _placeInitialZombie() {
    const engine = this.engine;
    const col = 12;
    const row = engine.world.getSurfaceRow(col);
    const enemy = new Enemy(
      col * engine.world.tileSize,
      row * engine.world.tileSize - 45,
      "zombie",
      engine.world,
    );
    engine.enemies.push(enemy);
  }

  // Runs every spawnInterval — picks a random off-screen tile and drops an enemy there
  _trySpawn() {
    const engine = this.engine;
    // don't spawn while a menu is showing
    const screensUp =
      !document.getElementById("landingPage").classList.contains("hidden") ||
      !document.getElementById("gameOverScreen").classList.contains("hidden");
    if (screensUp) return;
    if (engine.enemies.length >= this.maxEnemies) return;

    const world = engine.world;
    const left = engine.cameraX;
    const right = engine.cameraX + engine.camera.viewWidth;
    const top = engine.cameraY;
    const bottom = engine.cameraY + engine.camera.viewHeight;

    // Collect every air tile that has solid ground beneath it AND is off-screen
    const candidates = [];
    for (let r = 0; r < world.rows - 1; r++) {
      for (let c = 0; c < world.cols; c++) {
        if (world.matrix[r][c] !== "air") continue;
        const below = world.matrix[r + 1][c];
        if (["air", "leaves", "wood", "water"].includes(below)) continue;
        const px = c * world.tileSize;
        const py = r * world.tileSize - 5;
        if (px < left || px > right || py < top || py > bottom) {
          candidates.push({ x: px, y: py });
        }
      }
    }

    if (candidates.length === 0) return;

    const spot = candidates[Math.floor(Math.random() * candidates.length)];
    const types = ["zombie", "skeleton", "goblin"];
    const type = types[Math.floor(Math.random() * types.length)];
    const enemy = new Enemy(spot.x, spot.y, type, world);
    engine.enemies.push(enemy);
  }
}
