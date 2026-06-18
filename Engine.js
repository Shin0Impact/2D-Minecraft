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
    this.mineRange = 120;

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

    this.spawnZombies();

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

      if (this.currentTool === "sword") {
        this.executePlayerAttack();
      } else if (this.currentTool.startsWith("place-")) {
        this.executeBlockPlacement(worldX, worldY);
      } else {
        this.executeEnvironmentMining(worldX, worldY);
      }
    });

    document.getElementById("startGameBtn").addEventListener("click", () => {
      document.getElementById("landingPage").classList.add("hidden");
    });

    document.getElementById("respawnBtn").addEventListener("click", () => {
      document.getElementById("gameOverScreen").classList.add("hidden");
      this.resetWorld();
    });

    // Instant reset triggers without modal pop-ups and pops open instructions overlay screen
    document.getElementById("resetWorldBtn").addEventListener("click", () => {
      this.resetWorld();
      document.getElementById("landingPage").classList.remove("hidden");
    });

    this.tick();
  }

  spawnZombies() {
    this.enemies.forEach((enemy) => enemy.DOMElement.remove());
    this.enemies = [];

    let enemySpawnRow = 0;
    for (let r = 0; r < this.world.rows; r++) {
      if (this.world.matrix[r][12] !== "air") {
        enemySpawnRow = r;
        break;
      }
    }
    let enemySpawnY = enemySpawnRow * this.world.tileSize - 45;
    this.enemies.push(new Enemy(480, enemySpawnY, "zombie", this.world));
  }

  resetWorld() {
    this.playerHealth = this.maxHealth;
    this.isInvincible = false;

    for (const block in this.inventory) {
      this.inventory[block] = 0;
    }

    this.world.DOMElement.innerHTML = "";
    this.world.generate();
    this.world.render();

    let spawnRow = 0;
    for (let r = 0; r < this.world.rows; r++) {
      if (this.world.matrix[r][2] !== "air") {
        spawnRow = r;
        break;
      }
    }
    this.player.x = 80;
    this.player.y = spawnRow * this.world.tileSize - 45;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.knockbackTimer = 0;

    this.spawnZombies();
    this.renderHearts();
    this.updateInventoryUI();

    const activeToolButton = document.querySelector(".tool-btn.active");
    if (activeToolButton) activeToolButton.classList.remove("active");
    this.currentTool = "sword";
    const swordBtn = document.querySelector('[data-tool="sword"]');
    if (swordBtn) swordBtn.classList.add("active");
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

        const buttonSlot = counterElement.closest(".tool-btn");
        if (buttonSlot) {
          if (count > 0) {
            buttonSlot.style.display = "flex";
          } else {
            buttonSlot.style.display = "none";

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

  // Camera settings adjusted to map the new 1040x780 space boundaries correctly
  updateCamera() {
    const viewWidth = 1040;
    const viewHeight = 780;

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
    )
      return;

    const tileCenterX = tileCol * this.world.tileSize + this.world.tileSize / 2;
    const tileCenterY = tileRow * this.world.tileSize + this.world.tileSize / 2;

    const distance = Math.sqrt(
      Math.pow(tileCenterX - playerCenterX, 2) +
        Math.pow(tileCenterY - playerCenterY, 2),
    );
    if (distance > this.mineRange) return;

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
    )
      return;
    if (this.world.matrix[tileRow][tileCol] !== "air") return;

    const tileCenterX = tileCol * this.world.tileSize + this.world.tileSize / 2;
    const tileCenterY = tileRow * this.world.tileSize + this.world.tileSize / 2;

    const distance = Math.sqrt(
      Math.pow(tileCenterX - playerCenterX, 2) +
        Math.pow(tileCenterY - playerCenterY, 2),
    );
    if (distance > this.mineRange) return;

    const blockBox = {
      x: tileCol * this.world.tileSize,
      y: tileRow * this.world.tileSize,
      width: this.world.tileSize,
      height: this.world.tileSize,
    };
    if (this.checkCollision(this.player, blockBox)) return;

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
    entity.x += entity.vx;

    let checkYPoints = [
      entity.y,
      entity.y + entity.height / 2,
      entity.y + entity.height - 1,
    ];

    if (entity.vx > 0) {
      let rightX = entity.x + entity.width;
      if (checkYPoints.some((y) => this.world.isTileSolidAt(rightX, y))) {
        entity.x = Math.floor(rightX / tileSize) * tileSize - entity.width;
        entity.vx = 0;
      }
    } else if (entity.vx < 0) {
      let leftX = entity.x;
      if (checkYPoints.some((y) => this.world.isTileSolidAt(leftX, y))) {
        entity.x = (Math.floor(leftX / tileSize) + 1) * tileSize;
        entity.vx = 0;
      }
    }

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
            if (
              previousY + entity.height <=
              Math.floor(feetY / tileSize) * tileSize
            ) {
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
        entity.y = Math.floor(feetY / tileSize) * tileSize - entity.height;
        entity.vy = 0;
        entity.isGrounded = true;
      }
    } else if (entity.vy < 0) {
      let headY = entity.y;
      if (checkXPoints.some((x) => this.world.isTileSolidAt(x, headY))) {
        entity.y = (Math.floor(headY / tileSize) + 1) * tileSize;
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
          enemy.applyKnockback(this.player.facing === "right" ? 1 : -1);
        } else {
          enemy.DOMElement.remove();
          this.enemies.splice(i, 1);
        }
      }
    }
  }

  renderHearts() {
    let heartUI = document.getElementById("heartUI");
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
      document.getElementById("gameOverScreen").classList.remove("hidden");
    } else {
      this.player.applyKnockback(
        this.player.x + this.player.width / 2 < enemy.x + enemy.width / 2
          ? -1
          : 1,
      );
      this.isInvincible = true;
      this.player.DOMElement.classList.add("damaged");
      setTimeout(() => {
        this.isInvincible = false;
        this.player.DOMElement.classList.remove("damaged");
      }, this.invincibilityDuration);
    }
  }

  tick() {
    const screensUp =
      !document.getElementById("landingPage").classList.contains("hidden") ||
      !document.getElementById("gameOverScreen").classList.contains("hidden");

    if (!screensUp) {
      this.player.update(this.keysPressed);
      this.enemies.forEach((zombie) => zombie.update(this.player));

      this.resolvePhysics(this.player);
      this.enemies.forEach((zombie) => this.resolvePhysics(zombie));

      this.enemies.forEach((enemy) => {
        let enemyAttackBox = {
          x:
            enemy.facing === "right"
              ? enemy.x + enemy.width / 2
              : enemy.x + enemy.width / 2 - enemy.attackRange,
          y: enemy.y + enemy.height / 3,
          width: enemy.attackRange,
          height: 10,
        };

        if (
          this.checkCollision(this.player, enemyAttackBox) &&
          enemy.attackCooldown === 0
        ) {
          this.takeDamage(enemy);
          enemy.attackCooldown = enemy.attackRate;
        }
      });
    }

    this.player.render();
    this.enemies.forEach((zombie) => zombie.render());
    this.updateCamera();

    for (let key in this.keysPressed) {
      if (this.keysPressed[key] === "JUST_PRESSED")
        this.keysPressed[key] = "HELD";
    }

    requestAnimationFrame(() => this.tick());
  }
}

const Minecraft2D = new GameEngine();
Minecraft2D.init();
