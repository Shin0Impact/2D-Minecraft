// Mining.js — block breaking, block placing, and keeping the hotbar inventory count in sync

class MiningSystem {
  constructor(engine) {
    this.engine = engine;
    // Which tiles each tool can break — single source of truth used here and by HoverSystem
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

  // Shows/hides hotbar slots and updates their count labels
  updateInventoryUI() {
    const engine = this.engine;
    for (const item in engine.inventory) {
      const countEl = document.getElementById(`count-${item}`);
      if (!countEl) continue;
      const count = engine.inventory[item];
      countEl.textContent = count;
      const slot = countEl.closest(".tool-btn");
      if (!slot) continue;
      slot.style.display = count > 0 ? "flex" : "none";
      // If the now-empty slot was selected, fall back to sword
      if (count === 0 && engine.currentTool === `place-${item}`) {
        slot.classList.remove("active");
        engine.currentTool = "sword";
        document.querySelector('[data-tool="sword"]')?.classList.add("active");
      }
    }
  }

  // Returns true if this tool is allowed to break this tile type
  _canBreak(tool, tileType) {
    if (tool === "axe") return this.byAxe.includes(tileType);
    if (tool === "pickaxe") return this.byPickaxe.includes(tileType);
    if (tool === "shovel") return this.byShovel.includes(tileType);
    return false;
  }

  // Left-click with a mining tool — removes the tile and adds it to inventory
  executeEnvironmentMining(worldX, worldY) {
    const engine = this.engine;
    const world = engine.world;

    const col = Math.floor(worldX / world.tileSize);
    const row = Math.floor(worldY / world.tileSize);
    if (col < 0 || col >= world.cols || row < 0 || row >= world.rows) return;

    // Must be within reach of the player
    const px = engine.player.x + engine.player.width / 2;
    const py = engine.player.y + engine.player.height / 2;
    const tx = col * world.tileSize + world.tileSize / 2;
    const ty = row * world.tileSize + world.tileSize / 2;
    if (Math.hypot(tx - px, ty - py) > engine.mineRange) return;

    const tileType = world.matrix[row][col];
    if (!this._canBreak(engine.currentTool, tileType)) return;

    // Leaves have a 50% chance to drop an apple instead of the leaf block
    if (tileType === "leaves" && Math.random() < 0.5) {
      engine.inventory.apple++;
      this.updateInventoryUI();
      this._showDropText(
        "🍎 Apple!",
        col * world.tileSize,
        row * world.tileSize,
      );
    } else if (engine.inventory[tileType] !== undefined) {
      engine.inventory[tileType]++;
      this.updateInventoryUI();
    }

    world.animateTile(row, col, "tile-break");
    world.matrix[row][col] = "air";
    engine.audio.play("mine");
    world.render();
  }

  // Eating an apple heals one heart — called when player clicks the apple hotbar slot
  useApple() {
    const engine = this.engine;
    if (engine.inventory.apple <= 0) return;
    if (engine.playerHealth >= engine.maxHealth) return; // already full
    engine.inventory.apple--;
    engine.playerHealth++;
    engine.combat.renderHearts();
    engine.audio.play("place"); // satisfying nom sound
    this.updateInventoryUI();
  }

  // Floats a small text label above the broken tile then fades it out
  _showDropText(text, worldX, worldY) {
    const label = document.createElement("div");
    label.className = "drop-text";
    label.textContent = text;
    label.style.left = `${worldX}px`;
    label.style.top = `${worldY - 10}px`;
    document.getElementById("stage").appendChild(label);
    label.addEventListener("animationend", () => label.remove(), {
      once: true,
    });
  }

  // Left-click with a place-X tool — puts a block from inventory into the world
  executeBlockPlacement(worldX, worldY) {
    const engine = this.engine;
    const world = engine.world;

    const col = Math.floor(worldX / world.tileSize);
    const row = Math.floor(worldY / world.tileSize);
    if (col < 0 || col >= world.cols || row < 0 || row >= world.rows) return;
    if (world.matrix[row][col] !== "air") return;

    // Must be within reach
    const px = engine.player.x + engine.player.width / 2;
    const py = engine.player.y + engine.player.height / 2;
    const tx = col * world.tileSize + world.tileSize / 2;
    const ty = row * world.tileSize + world.tileSize / 2;
    if (Math.hypot(tx - px, ty - py) > engine.mineRange) return;

    // Can't place a block where the player is standing
    const blockBox = {
      x: col * world.tileSize,
      y: row * world.tileSize,
      width: world.tileSize,
      height: world.tileSize,
    };
    if (engine.physics.checkCollision(engine.player, blockBox)) return;

    const blockType = engine.currentTool.replace("place-", "");
    if (engine.inventory[blockType] > 0) {
      engine.inventory[blockType]--;
      this.updateInventoryUI();
      world.matrix[row][col] = blockType;
      engine.audio.play("place");
      world.render();
      world.animateTile(row, col, "tile-place");
    }
  }
}
