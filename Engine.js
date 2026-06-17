class GameEngine {
  constructor() {
    this.world = new WorldGrid(45, 45, 45);
    this.player = null;
    this.enemies = [];
    this.keysPressed = {};

    this.maxHealth = 5;
    this.playerHealth = this.maxHealth;
    this.isInvincible = false;
    this.invincibilityDuration = 1000;

    this.currentTool = "sword";
    this.mineRange = 120; // Allows cleaner building angles around player borders

    this.cameraX = 0;
    this.cameraY = 0;
    this.stageElement = null;

    this.inventory = {
      grass: 0,
      dirt: 0,
      stone: 0,
      wood: 0,
      leaves: 0,
      coal: 0,
      iron: 0,
      gold: 0,
      diamond: 0,
    };
  }

  init() {
    this.world.generate();
    this.world.render();

    this.stageElement = document.getElementById("stage");

    let spawnRow = 0;
    for (let r = 0; r < this.world.rows; r++) {
      if (this.world.matrix[r][2] !== "air") {
        spawnRow = r;
        break;
      }
    }
    let spawnY = spawnRow * this.world.tileSize - 45;
    this.player = new Player(80, spawnY, this.world);

    let enemySpawnRow = 0;
    for (let r = 0; r < this.world.rows; r++) {
      if (this.world.matrix[r][12] !== "air") {
        enemySpawnRow = r;
        break;
      }
    }
    let enemySpawnY = enemySpawnRow * this.world.tileSize - 45;
    this.enemies.push(new Enemy(480, enemySpawnY, "zombie", this.world));

    this.renderHearts();
    this.setupToolBelt();
    this.updateInventoryUI();

    window.addEventListener("keydown", (e) => {
      if (!this.keysPressed[e.key]) {
        this.keysPressed[e.key] = "JUST_PRESSED";
      }
    });
    window.addEventListener("keyup", (e) => (this.keysPressed[e.key] = false));

    const gameWindow = document.getElementById("gameWindow");
    gameWindow.addEventListener("mousedown", (e) => {
      const rect = gameWindow.getBoundingClientRect();

      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      const worldX = screenX + this.cameraX;
      const worldY = screenY + this.cameraY;

      const playerCenter = this.player.x + this.player.width / 2;
      this.player.facing = worldX < playerCenter ? "left" : "right";

      if (this.currentTool === "sword") {
        this.executePlayerAttack();
      } else if (this.currentTool.startsWith("place-")) {
        this.executeBlockPlacement(worldX, worldY);
      } else {
        this.executeEnvironmentMining(worldX, worldY);
      }
    });

    this.tick();
  }

  setupToolBelt() {
    const buttons = document.querySelectorAll(".tool-btn");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("active"));
        this.currentTool = btn.dataset.tool;
        btn.classList.add("active");
      });
    });
  }

  updateInventoryUI() {
    for (const item in this.inventory) {
      const counterElement = document.getElementById(`count-${item}`);
      if (counterElement) {
        const count = this.inventory[item];
        counterElement.textContent = count;

        // Grab the parent hotbar button slot
        const buttonSlot = counterElement.closest(".tool-btn");
        if (buttonSlot) {
          if (count > 0) {
            buttonSlot.style.display = "flex"; // Show item slot when quantity > 0
          } else {
            buttonSlot.style.display = "none"; // Hide item slot when quantity is 0

            // If the player is currently selecting this item block but ran out, switch back to sword safely
            if (this.currentTool === `place-${item}`) {
              buttonSlot.classList.remove("active");
              this.currentTool = "sword";
              const swordBtn = document.querySelector('[data-tool="sword"]');
              if (swordBtn) swordBtn.classList.add("active");
            }
          }
        }
      }
    }
  }

  updateCamera() {
    const viewWidth = 800;
    const viewHeight = 600;

    this.cameraX = this.player.x + this.player.width / 2 - viewWidth / 2;
    this.cameraY = this.player.y + this.player.height / 2 - viewHeight / 2;

    const maxCameraX = this.world.cols * this.world.tileSize - viewWidth;
    const maxCameraY = this.world.rows * this.world.tileSize - viewHeight;

    this.cameraX = Math.max(0, Math.min(this.cameraX, maxCameraX));
    this.cameraY = Math.max(0, Math.min(this.cameraY, maxCameraY));

    this.stageElement.style.transform = `translate(${-this.cameraX}px, ${-this.cameraY}px)`;
  }

  executeEnvironmentMining(worldX, worldY) {
    const playerCenterX = this.player.x + this.player.width / 2;
    const playerCenterY = this.player.y + this.player.height / 2;

    const tileCol = Math.floor(worldX / this.world.tileSize);
    const tileRow = Math.floor(worldY / this.world.tileSize);

    if (
      tileCol < 0 ||
      tileCol >= this.world.cols ||
      tileRow < 0 ||
      tileRow >= this.world.rows
    ) {
      return;
    }

    const tileCenterX = tileCol * this.world.tileSize + this.world.tileSize / 2;
    const tileCenterY = tileRow * this.world.tileSize + this.world.tileSize / 2;

    const deltaX = tileCenterX - playerCenterX;
    const deltaY = tileCenterY - playerCenterY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > this.mineRange) {
      return;
    }

    const tileType = this.world.matrix[tileRow][tileCol];
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
      this.currentTool === "axe" &&
      (tileType === "wood" || tileType === "leaves")
    ) {
      canBreak = true;
    } else if (
      this.currentTool === "pickaxe" &&
      breakableByPickaxe.includes(tileType)
    ) {
      canBreak = true;
    } else if (
      this.currentTool === "shovel" &&
      (tileType === "grass" || tileType === "dirt")
    ) {
      canBreak = true;
    }

    if (canBreak) {
      if (this.inventory[tileType] !== undefined) {
        this.inventory[tileType]++;
        this.updateInventoryUI();
      }

      this.world.matrix[tileRow][tileCol] = "air";
      this.world.render();
    }
  }

  executeBlockPlacement(worldX, worldY) {
    const playerCenterX = this.player.x + this.player.width / 2;
    const playerCenterY = this.player.y + this.player.height / 2;

    const tileCol = Math.floor(worldX / this.world.tileSize);
    const tileRow = Math.floor(worldY / this.world.tileSize);

    if (
      tileCol < 0 ||
      tileCol >= this.world.cols ||
      tileRow < 0 ||
      tileRow >= this.world.rows
    ) {
      return;
    }

    if (this.world.matrix[tileRow][tileCol] !== "air") {
      return;
    }

    const tileCenterX = tileCol * this.world.tileSize + this.world.tileSize / 2;
    const tileCenterY = tileRow * this.world.tileSize + this.world.tileSize / 2;

    const deltaX = tileCenterX - playerCenterX;
    const deltaY = tileCenterY - playerCenterY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > this.mineRange) {
      return;
    }

    const blockBox = {
      x: tileCol * this.world.tileSize,
      y: tileRow * this.world.tileSize,
      width: this.world.tileSize,
      height: this.world.tileSize,
    };
    if (this.checkCollision(this.player, blockBox)) {
      return;
    }

    const blockType = this.currentTool.replace("place-", "");

    if (this.inventory[blockType] > 0) {
      this.inventory[blockType]--;
      this.updateInventoryUI();

      this.world.matrix[tileRow][tileCol] = blockType;
      this.world.render();
    }
  }

  resolvePhysics(entity) {
    const tileSize = this.world.tileSize;

    // --- HORIZONTAL AXIS ---
    entity.x += entity.vx;

    let checkYPoints = [
      entity.y,
      entity.y + entity.height / 2,
      entity.y + entity.height - 1,
    ];

    if (entity.vx > 0) {
      let rightX = entity.x + entity.width;
      if (checkYPoints.some((y) => this.world.isTileSolidAt(rightX, y))) {
        let tileCol = Math.floor(rightX / tileSize);
        entity.x = tileCol * tileSize - entity.width;
        entity.vx = 0;
      }
    } else if (entity.vx < 0) {
      let leftX = entity.x;
      if (checkYPoints.some((y) => this.world.isTileSolidAt(leftX, y))) {
        let tileCol = Math.floor(leftX / tileSize);
        entity.x = (tileCol + 1) * tileSize;
        entity.vx = 0;
      }
    }

    // --- VERTICAL AXIS ---
    let previousY = entity.y;
    entity.y += entity.vy;
    entity.isGrounded = false;

    let checkXPoints = [
      entity.x + 4,
      entity.x + entity.width / 2,
      entity.x + entity.width - 4,
    ];

    if (entity.vy > 0) {
      let feetY = entity.y + entity.height;
      let hitSolidGround = false;

      for (let x of checkXPoints) {
        if (this.world.isTileSolidAt(x, feetY, true)) {
          let isLeaf = this.world.getTileTypeAt?.(x, feetY) === "leaves";

          if (isLeaf) {
            let priorFeetY = previousY + entity.height;
            let tileRow = Math.floor(feetY / tileSize);
            let leafTopY = tileRow * tileSize;

            if (priorFeetY <= leafTopY) {
              hitSolidGround = true;
              break;
            }
          } else {
            hitSolidGround = true;
            break;
          }
        }
      }

      if (hitSolidGround) {
        let tileRow = Math.floor(feetY / tileSize);
        entity.y = tileRow * tileSize - entity.height;
        entity.vy = 0;
        entity.isGrounded = true;
      }
    } else if (entity.vy < 0) {
      let headY = entity.y;
      if (checkXPoints.some((x) => this.world.isTileSolidAt(x, headY))) {
        let tileRow = Math.floor(headY / tileSize);
        entity.y = (tileRow + 1) * tileSize;
        entity.vy = 0;
      }
    }
  }

  executePlayerAttack() {
    const attackRange = 40;
    let attackHitbox = {
      x:
        this.player.facing === "right"
          ? this.player.x + this.player.width
          : this.player.x - attackRange,
      y: this.player.y + (this.player.height - attackRange) / 2,
      width: attackRange,
      height: attackRange,
    };

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      let enemy = this.enemies[i];
      if (this.checkCollision(attackHitbox, enemy)) {
        enemy.health--;
        if (enemy.health > 0) {
          let pushDirection = this.player.facing === "right" ? 1 : -1;
          enemy.applyKnockback(pushDirection);
        } else {
          enemy.DOMElement.remove();
          this.enemies.splice(i, 1);
        }
      }
    }
  }

  renderHearts() {
    let heartUI = document.getElementById("heartUI");
    if (!heartUI) {
      heartUI = document.createElement("section");
      heartUI.id = "heartUI";
      document.getElementById("gameWindow").appendChild(heartUI);
    }
    heartUI.innerHTML = "";
    for (let i = 0; i < this.maxHealth; i++) {
      const heart = document.createElement("span");
      heart.className = i < this.playerHealth ? "heart full" : "heart empty";
      heartUI.appendChild(heart);
    }
  }

  checkCollision(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }

  takeDamage(enemy) {
    if (this.isInvincible) return;

    this.playerHealth--;
    this.renderHearts();

    if (this.playerHealth <= 0) {
      alert("Game Over!");
      this.playerHealth = this.maxHealth;
      this.player.x = 80;
      this.player.y = 100;
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.knockbackTimer = 0;
      this.renderHearts();
    } else {
      const playerCenter = this.player.x + this.player.width / 2;
      const enemyCenter = enemy.x + enemy.width / 2;
      const pushDirection = playerCenter < enemyCenter ? -1 : 1;

      this.player.applyKnockback(pushDirection);

      this.isInvincible = true;
      this.player.DOMElement.classList.add("damaged");
      setTimeout(() => {
        this.isInvincible = false;
        this.player.DOMElement.classList.remove("damaged");
      }, this.invincibilityDuration);
    }
  }

  tick() {
    this.player.update(this.keysPressed);
    this.enemies.forEach((zombie) => zombie.update(this.player));

    this.resolvePhysics(this.player);
    this.enemies.forEach((zombie) => this.resolvePhysics(zombie));

    this.enemies.forEach((enemy) => {
      let handHeight = 10;
      let targetY = enemy.y + enemy.height / 3;
      let targetX =
        enemy.facing === "right"
          ? enemy.x + enemy.width / 2
          : enemy.x + enemy.width / 2 - enemy.attackRange;

      let enemyAttackBox = {
        x: targetX,
        y: targetY,
        width: enemy.attackRange,
        height: handHeight,
      };

      if (
        this.checkCollision(this.player, enemyAttackBox) &&
        enemy.attackCooldown === 0
      ) {
        this.takeDamage(enemy);
        enemy.attackCooldown = enemy.attackRate;
      }
    });

    this.player.render();
    this.enemies.forEach((zombie) => zombie.render());

    this.updateCamera();

    for (let key in this.keysPressed) {
      if (this.keysPressed[key] === "JUST_PRESSED") {
        this.keysPressed[key] = "HELD";
      }
    }

    requestAnimationFrame(() => this.tick());
  }
}

const Minecraft2D = new GameEngine();
Minecraft2D.init();
