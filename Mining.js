class MiningSystem {
  constructor(engine) {
    this.engine = engine;
  }

  updateInventoryUI() {
    const engine = this.engine;
    for (const item in engine.inventory) {
      const counterElement = document.getElementById(`count-${item}`);
      if (counterElement) {
        const count = engine.inventory[item];
        counterElement.textContent = count;

        const buttonSlot = counterElement.closest(".tool-btn");
        if (buttonSlot) {
          if (count > 0) {
            buttonSlot.style.display = "flex";
          } else {
            buttonSlot.style.display = "none";

            if (engine.currentTool === `place-${item}`) {
              buttonSlot.classList.remove("active");
              engine.currentTool = "sword";
              const swordBtn = document.querySelector('[data-tool="sword"]');
              if (swordBtn) swordBtn.classList.add("active");
            }
          }
        }
      }
    }
  }

  executeEnvironmentMining(worldX, worldY) {
    const engine = this.engine;
    const world = engine.world;
    const playerCenterX = engine.player.x + engine.player.width / 2;
    const playerCenterY = engine.player.y + engine.player.height / 2;

    const tileCol = Math.floor(worldX / world.tileSize);
    const tileRow = Math.floor(worldY / world.tileSize);

    if (
      tileCol < 0 ||
      tileCol >= world.cols ||
      tileRow < 0 ||
      tileRow >= world.rows
    )
      return;

    const tileCenterX = tileCol * world.tileSize + world.tileSize / 2;
    const tileCenterY = tileRow * world.tileSize + world.tileSize / 2;

    const distance = Math.sqrt(
      Math.pow(tileCenterX - playerCenterX, 2) +
        Math.pow(tileCenterY - playerCenterY, 2),
    );
    if (distance > engine.mineRange) return;

    const tileType = world.matrix[tileRow][tileCol];
    let canBreak = false;

    const breakableByPickaxe = [
      "stone",
      "coal",
      "iron",
      "gold",
      "diamond",
      "water",
    ];

    if (
      engine.currentTool === "axe" &&
      (tileType === "wood" || tileType === "leaves")
    ) {
      canBreak = true;
    } else if (
      engine.currentTool === "pickaxe" &&
      breakableByPickaxe.includes(tileType)
    ) {
      canBreak = true;
    } else if (
      engine.currentTool === "shovel" &&
      (tileType === "grass" || tileType === "dirt")
    ) {
      canBreak = true;
    }

    if (canBreak) {
      if (engine.inventory[tileType] !== undefined) {
        engine.inventory[tileType]++;
        this.updateInventoryUI();
      }
      world.matrix[tileRow][tileCol] = "air";
      world.render();
    }
  }

  executeBlockPlacement(worldX, worldY) {
    const engine = this.engine;
    const world = engine.world;
    const playerCenterX = engine.player.x + engine.player.width / 2;
    const playerCenterY = engine.player.y + engine.player.height / 2;

    const tileCol = Math.floor(worldX / world.tileSize);
    const tileRow = Math.floor(worldY / world.tileSize);

    if (
      tileCol < 0 ||
      tileCol >= world.cols ||
      tileRow < 0 ||
      tileRow >= world.rows
    )
      return;
    if (world.matrix[tileRow][tileCol] !== "air") return;

    const tileCenterX = tileCol * world.tileSize + world.tileSize / 2;
    const tileCenterY = tileRow * world.tileSize + world.tileSize / 2;

    const distance = Math.sqrt(
      Math.pow(tileCenterX - playerCenterX, 2) +
        Math.pow(tileCenterY - playerCenterY, 2),
    );
    if (distance > engine.mineRange) return;

    const blockBox = {
      x: tileCol * world.tileSize,
      y: tileRow * world.tileSize,
      width: world.tileSize,
      height: world.tileSize,
    };
    if (engine.physics.checkCollision(engine.player, blockBox)) return;

    const blockType = engine.currentTool.replace("place-", "");

    if (engine.inventory[blockType] > 0) {
      engine.inventory[blockType]--;
      this.updateInventoryUI();

      world.matrix[tileRow][tileCol] = blockType;
      world.render();
    }
  }
}
