// BucketTool.js — handles collecting and placing water with the bucket

class BucketTool {
  constructor(engine) {
    this.engine = engine;
  }

  // Click on water to collect it, click on air to place it
  use(worldX, worldY) {
    const engine = this.engine;
    const world = engine.world;

    const tileCol = Math.floor(worldX / world.tileSize);
    const tileRow = Math.floor(worldY / world.tileSize);
    if (
      tileCol < 0 ||
      tileCol >= world.cols ||
      tileRow < 0 ||
      tileRow >= world.rows
    )
      return;

    // Must be within mining range of the player
    const px = engine.player.x + engine.player.width / 2;
    const py = engine.player.y + engine.player.height / 2;
    const tx = tileCol * world.tileSize + world.tileSize / 2;
    const ty = tileRow * world.tileSize + world.tileSize / 2;
    if (Math.hypot(tx - px, ty - py) > engine.mineRange) return;

    const tileType = world.matrix[tileRow][tileCol];

    if (engine.bucketContents === "empty" && tileType === "water") {
      // Scoop up the water tile
      world.matrix[tileRow][tileCol] = "air";
      world.render();
      engine.bucketContents = "water";
      engine.audio.play("splash");
      this.updateUI();
    } else if (engine.bucketContents === "water" && tileType === "air") {
      // Desert: water evaporates instantly
      if (engine.currentTheme === "desert") {
        this._showEvaporation(tileCol, tileRow);
      } else {
        world.matrix[tileRow][tileCol] = "water";
        world.render();
        world.animateTile(tileRow, tileCol, "tile-place");
        engine.audio.play("splash");
      }
      engine.bucketContents = "empty";
      this.updateUI();
    }
  }

  // Flashes a CSS animation on the tile then removes it — desert only
  _showEvaporation(col, row) {
    const el = this.engine.world.DOMElement.querySelector(
      `[data-row="${row}"][data-col="${col}"]`,
    );
    if (!el) return;
    el.classList.add("tile-evaporate");
    el.addEventListener(
      "animationend",
      () => el.classList.remove("tile-evaporate"),
      { once: true },
    );
  }

  // Syncs the hotbar button emoji and tooltip to match bucket state
  updateUI() {
    const btn = document.querySelector('[data-tool="bucket"]');
    if (!btn) return;
    const full = this.engine.bucketContents === "water";
    btn.textContent = full ? "🪣💧" : "🪣";
    btn.title = full ? "Bucket (Full)" : "Bucket (Empty)";
  }
}
