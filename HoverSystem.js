// HoverSystem.js — highlights the tile under the mouse with green (can act) or red (wrong tool)

class HoverSystem {
  constructor(engine) {
    this.engine = engine;
    this.hoveredTileElement = null;

    // Which tiles each tool can break
    this.byPickaxe = [
      "stone",
      "coal",
      "iron",
      "gold",
      "diamond",
      "water",
      "snow",
    ];
    this.byShovel = ["grass", "dirt", "sand"];
    this.byAxe = ["wood", "leaves"];
  }

  // Removes the highlight classes from whichever tile was last highlighted
  clear() {
    if (this.hoveredTileElement) {
      this.hoveredTileElement.classList.remove(
        "tile-hover",
        "tile-hover-valid",
        "tile-hover-invalid",
      );
      this.hoveredTileElement = null;
    }
  }

  // Called on every mousemove — figures out which tile the cursor is over and highlights it
  update(e, gameWindow) {
    const engine = this.engine;
    const rect = gameWindow.getBoundingClientRect();
    const worldX = e.clientX - rect.left + engine.cameraX;
    const worldY = e.clientY - rect.top + engine.cameraY;

    const tileCol = Math.floor(worldX / engine.world.tileSize);
    const tileRow = Math.floor(worldY / engine.world.tileSize);

    this.clear();

    // Sword and bow don't target tiles, so skip highlighting for them
    if (engine.currentTool === "sword" || engine.currentTool === "bow") return;
    if (
      tileCol < 0 ||
      tileCol >= engine.world.cols ||
      tileRow < 0 ||
      tileRow >= engine.world.rows
    )
      return;

    const tileEl = engine.world.DOMElement.querySelector(
      `[data-row="${tileRow}"][data-col="${tileCol}"]`,
    );
    if (!tileEl) return;

    // No highlight if the tile is out of reach
    const px = engine.player.x + engine.player.width / 2;
    const py = engine.player.y + engine.player.height / 2;
    const tx = tileCol * engine.world.tileSize + engine.world.tileSize / 2;
    const ty = tileRow * engine.world.tileSize + engine.world.tileSize / 2;
    if (Math.hypot(tx - px, ty - py) > engine.mineRange) return;

    const tileType = engine.world.matrix[tileRow][tileCol];
    if (tileType === "air") return;

    const canAct = this._canActOnTile(
      engine.currentTool,
      tileType,
      engine.bucketContents,
    );
    tileEl.classList.add(
      "tile-hover",
      canAct ? "tile-hover-valid" : "tile-hover-invalid",
    );
    this.hoveredTileElement = tileEl;
  }

  // Returns true if the active tool can do something to this tile type
  _canActOnTile(tool, tileType, bucketContents) {
    if (tool === "bucket")
      return (
        (bucketContents === "empty" && tileType === "water") ||
        (bucketContents === "water" && tileType === "air")
      );
    if (tool.startsWith("place-")) return tileType === "air";
    if (tool === "axe") return this.byAxe.includes(tileType);
    if (tool === "pickaxe") return this.byPickaxe.includes(tileType);
    if (tool === "shovel") return this.byShovel.includes(tileType);
    return false;
  }
}
