class GameEngine {
  constructor() {
    this.world = new WorldGrid(60, 80, 45);
    this.player = null;
    this.enemies = [];
    this.keysPressed = {};

    this.maxHealth = 5;
    this.playerHealth = this.maxHealth;
    this.isInvincible = false;
    this.invincibilityDuration = 1000;

    this.currentTool = "sword";
    this.mineRange = 120;
    this.currentTheme = "forest";

    // Bucket: "empty" or "water"
    this.bucketContents = "empty";

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
      sand: 0,
      snow: 0,
    };

    this.physics = new PhysicsSystem(this);
    this.combat = new CombatSystem(this);
    this.mining = new MiningSystem(this);
    this.camera = new CameraSystem(this);

    this.hoveredTileElement = null;
  }

  init() {
    this.world.generate(this.currentTheme);
    this.world.render();
    document.body.dataset.theme = this.currentTheme;

    this.stageElement = document.getElementById("stage");

    const spawnCol = 2;
    const spawnRow = this.world.getSurfaceRow(spawnCol);
    this.player = new Player(
      80,
      spawnRow * this.world.tileSize - 45,
      this.world,
    );

    this.spawnZombies();

    // Start our dynamic off-screen spawning generator loop
    this._startOffScreenSpawner();

    this.combat.renderHearts();
    this.setupToolBelt();
    this.mining.updateInventoryUI();
    this.setupThemePicker();

    window.addEventListener("keydown", (e) => {
      if (!this.keysPressed[e.key]) this.keysPressed[e.key] = "JUST_PRESSED";
    });
    window.addEventListener("keyup", (e) => (this.keysPressed[e.key] = false));

    const gameWindow = document.getElementById("gameWindow");

    window.addEventListener("keydown", (e) => {
      // Create a dictionary mapping keys to your exact dataset tool names
      const toolMapping = {
        1: "sword",
        2: "bow",
        3: "axe",
        4: "pickaxe",
        5: "shovel",
        6: "bucket",
        // If you have building tools (e.g. "place-dirt"), you can map them here too! (e.g., "7": "place-dirt")
      };

      // Check if the pressed key is one of our mapped numbers
      if (toolMapping[e.key]) {
        const targetTool = toolMapping[e.key];

        // 1. Update the engine's active tool state
        this.currentTool = targetTool;

        // 2. Clear out the visual ".active" styling from all toolbelt buttons
        const buttons = document.querySelectorAll(".tool-btn");
        buttons.forEach((btn) => btn.classList.remove("active"));

        // 3. Find the specific button element matching this tool and highlight it
        const targetButton = document.querySelector(
          `[data-tool="${targetTool}"]`,
        );
        if (targetButton) {
          targetButton.classList.add("active");
        }
      }
    });

    gameWindow.addEventListener("mousedown", (e) => {
      const rect = gameWindow.getBoundingClientRect();
      const worldX = e.clientX - rect.left + this.cameraX;
      const worldY = e.clientY - rect.top + this.cameraY;

      if (this.currentTool === "sword") {
        this.combat.executePlayerAttack();
      } else if (this.currentTool === "bow") {
        // Player Ranged Bow Logic
        this.firePlayerArrow(worldX, worldY);
      } else if (this.currentTool === "bucket") {
        this.executeBucketAction(worldX, worldY);
      } else if (this.currentTool.startsWith("place-")) {
        this.mining.executeBlockPlacement(worldX, worldY);
      } else {
        this.mining.executeEnvironmentMining(worldX, worldY);
      }
    });

    gameWindow.addEventListener("mousemove", (e) =>
      this.updateTileHover(e, gameWindow),
    );
    gameWindow.addEventListener("mouseleave", () => this.clearTileHover());

    document.getElementById("startGameBtn").addEventListener("click", () => {
      this.resetWorld();
      document.getElementById("landingPage").classList.add("hidden");
    });

    document.getElementById("respawnBtn").addEventListener("click", () => {
      document.getElementById("gameOverScreen").classList.add("hidden");
      this.resetWorld();
    });

    document.getElementById("resetWorldBtn").addEventListener("click", () => {
      this.resetWorld();
      document.getElementById("landingPage").classList.remove("hidden");
    });

    this.tick();
  }

  // ── Theme picker ────────────────────────────────────────────────────────────

  setupThemePicker() {
    document.querySelectorAll(".theme-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".theme-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentTheme = btn.dataset.theme;
        document.body.dataset.theme = this.currentTheme;
      });
    });
  }

  // ── Bucket tool ─────────────────────────────────────────────────────────────

  executeBucketAction(worldX, worldY) {
    const world = this.world;
    const playerCenterX = this.player.x + this.player.width / 2;
    const playerCenterY = this.player.y + this.player.height / 2;

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
    if (
      Math.hypot(tileCenterX - playerCenterX, tileCenterY - playerCenterY) >
      this.mineRange
    )
      return;

    const tileType = world.matrix[tileRow][tileCol];

    if (this.bucketContents === "empty" && tileType === "water") {
      world.matrix[tileRow][tileCol] = "air";
      world.render();
      this.bucketContents = "water";
      this.updateBucketUI();
    } else if (this.bucketContents === "water" && tileType === "air") {
      if (this.currentTheme === "desert") {
        this._showEvaporationEffect(tileCol, tileRow);
      } else {
        world.matrix[tileRow][tileCol] = "water";
        world.render();
        world.animateTile(tileRow, tileCol, "tile-place");
      }
      this.bucketContents = "empty";
      this.updateBucketUI();
    }
  }

  _showEvaporationEffect(col, row) {
    const tileEl = this.world.DOMElement.querySelector(
      `[data-row="${row}"][data-col="${col}"]`,
    );
    if (!tileEl) return;
    tileEl.classList.add("tile-evaporate");
    tileEl.addEventListener(
      "animationend",
      () => tileEl.classList.remove("tile-evaporate"),
      { once: true },
    );
  }

  updateBucketUI() {
    const btn = document.querySelector('[data-tool="bucket"]');
    if (!btn) return;
    const full = this.bucketContents === "water";
    btn.textContent = full ? "🪣💧" : "🪣";
    btn.title = full ? "Bucket (Full)" : "Bucket (Empty)";
  }

  // ── Player Arrow firing logic ────────────────────────────────────────────────

  firePlayerArrow(targetX, targetY) {
    const arrow = document.createElement("div");
    arrow.className = "player-arrow-projectile";

    let arrowX = this.player.x + this.player.width / 2;
    let arrowY = this.player.y + this.player.height / 3;
    arrow.style.left = `${arrowX}px`;
    arrow.style.top = `${arrowY}px`;

    this.stageElement.appendChild(arrow);

    const dx = targetX - arrowX;
    const dy = targetY - arrowY;
    const dist = Math.hypot(dx, dy);

    const arrowSpeed = 8;
    const avx = (dx / dist) * arrowSpeed;
    const avy = (dy / dist) * arrowSpeed;

    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    arrow.style.transform = `rotate(${angle}deg)`;

    const arrowInterval = setInterval(() => {
      const screensUp =
        !document.getElementById("landingPage").classList.contains("hidden") ||
        !document.getElementById("gameOverScreen").classList.contains("hidden");
      if (screensUp) return;

      arrowX += avx;
      arrowY += avy;
      arrow.style.left = `${arrowX}px`;
      arrow.style.top = `${arrowY}px`;

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];

        const enemyHitbox = {
          x: enemy.x,
          y: enemy.y,
          width: enemy.width,
          height: enemy.height,
        };
        const arrowHitbox = { x: arrowX, y: arrowY, width: 8, height: 8 };

        const hitEnemy =
          arrowHitbox.x < enemyHitbox.x + enemyHitbox.width &&
          arrowHitbox.x + arrowHitbox.width > enemyHitbox.x &&
          arrowHitbox.y < enemyHitbox.y + enemyHitbox.height &&
          arrowHitbox.y + arrowHitbox.height > enemyHitbox.y;

        if (hitEnemy) {
          clearInterval(arrowInterval);
          arrow.remove();

          const damageDirection = avx > 0 ? 1 : -1;
          enemy.applyKnockback(damageDirection);
          enemy.health -= 1;

          if (enemy.health <= 0) {
            enemy.DOMElement.remove();
            this.enemies.splice(i, 1);
          }
          return;
        }
      }

      if (this.world.isTileSolidAt(arrowX, arrowY)) {
        clearInterval(arrowInterval);
        arrow.remove();
      }
    }, 1000 / 60);

    setTimeout(() => {
      clearInterval(arrowInterval);
      if (arrow.parentNode) arrow.remove();
    }, 4000);
  }

  // ── Enemy Spawning Setup ─────────────────────────────────────────────────────

  spawnZombies() {
    this.enemies.forEach((e) => {
      if (e.DOMElement) e.DOMElement.remove();
    });
    this.enemies = [];

    // ONLY ONE SINGLE STARTING ZOMBIE (Col 12)
    const zombieCol = 12;
    const zombieRow = this.world.getSurfaceRow(zombieCol);
    const firstZombie = new Enemy(
      zombieCol * this.world.tileSize,
      zombieRow * this.world.tileSize - 45,
      "zombie",
      this.world,
    );

    const spawnZ = document.createElement("div");
    spawnZ.className = `enemy ${firstZombie.type}`;
    this.stageElement.appendChild(spawnZ);
    firstZombie.DOMElement = spawnZ;

    this.enemies.push(firstZombie);
  }

  // ── Procedural Off-Screen Spawner Engine ─────────────────────────────────────

  _startOffScreenSpawner() {
    setInterval(() => {
      // LIMIT ACTIVE SPAWNS TO A MAXIMUM OF 3 EXTRA ENEMIES AT ANY GIVEN TIME
      if (this.enemies.length >= 3) return;

      const world = this.world;
      const cameraLeft = this.cameraX;
      const cameraRight = this.cameraX + this.camera.viewWidth;
      const cameraTop = this.cameraY;
      const cameraBottom = this.cameraY + this.camera.viewHeight;

      let validSpawnLocations = [];

      for (let r = 0; r < world.rows - 1; r++) {
        for (let c = 0; c < world.cols; c++) {
          const currentTile = world.matrix[r][c];
          const tileBelow = world.matrix[r + 1][c];

          if (currentTile === "air") {
            const isSolidGround = !["air", "leaves", "wood", "water"].includes(
              tileBelow,
            );

            if (isSolidGround) {
              const pixelX = c * world.tileSize;
              const pixelY = r * world.tileSize - 5;

              const isOffScreen =
                pixelX < cameraLeft ||
                pixelX > cameraRight ||
                pixelY < cameraTop ||
                pixelY > cameraBottom;

              if (isOffScreen) {
                validSpawnLocations.push({ x: pixelX, y: pixelY });
              }
            }
          }
        }
      }

      if (validSpawnLocations.length > 0) {
        const choice =
          validSpawnLocations[
            Math.floor(Math.random() * validSpawnLocations.length)
          ];
        const types = ["zombie", "skeleton", "goblin"];
        const selectedType = types[Math.floor(Math.random() * types.length)];

        const newEnemy = new Enemy(choice.x, choice.y, selectedType, world);

        const enemyEl = document.createElement("div");
        enemyEl.className = `enemy ${newEnemy.type}`;
        this.stageElement.appendChild(enemyEl);
        newEnemy.DOMElement = enemyEl;

        this.enemies.push(newEnemy);
      }
    }, 5000);
  }

  // ── World reset ─────────────────────────────────────────────────────────────

  resetWorld() {
    this.playerHealth = this.maxHealth;
    this.isInvincible = false;
    this.bucketContents = "empty";
    for (const block in this.inventory) this.inventory[block] = 0;

    this.world.DOMElement.innerHTML = "";
    this.world.generate(this.currentTheme);
    this.world.render();
    document.body.dataset.theme = this.currentTheme;

    const spawnCol = 2;
    const spawnRow = this.world.getSurfaceRow(spawnCol);
    this.player.x = 80;
    this.player.y = spawnRow * this.world.tileSize - 45;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.knockbackTimer = 0;
    this.player.isInWater = false;
    this.player.isFrozen = false;

    this.spawnZombies();
    this.combat.renderHearts();
    this.mining.updateInventoryUI();
    this.updateBucketUI();

    const activeToolButton = document.querySelector(".tool-btn.active");
    if (activeToolButton) activeToolButton.classList.remove("active");
    this.currentTool = "sword";
    document.querySelector('[data-tool="sword"]')?.classList.add("active");
  }

  // ── Toolbelt ────────────────────────────────────────────────────────────────

  setupToolBelt() {
    const buttons = document.querySelectorAll(".tool-btn");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("active"));
        this.currentTool = btn.dataset.tool;
        btn.classList.add("active");
      });
    });
    this.updateBucketUI();
  }

  // ── Hover highlight ─────────────────────────────────────────────────────────

  clearTileHover() {
    if (this.hoveredTileElement) {
      this.hoveredTileElement.classList.remove(
        "tile-hover",
        "tile-hover-valid",
        "tile-hover-invalid",
      );
      this.hoveredTileElement = null;
    }
  }

  updateTileHover(e, gameWindow) {
    const rect = gameWindow.getBoundingClientRect();
    const worldX = e.clientX - rect.left + this.cameraX;
    const worldY = e.clientY - rect.top + this.cameraY;

    const tileCol = Math.floor(worldX / this.world.tileSize);
    const tileRow = Math.floor(worldY / this.world.tileSize);

    this.clearTileHover();
    if (this.currentTool === "sword" || this.currentTool === "bow") return;
    if (
      tileCol < 0 ||
      tileCol >= this.world.cols ||
      tileRow < 0 ||
      tileRow >= this.world.rows
    )
      return;

    const tileEl = this.world.DOMElement.querySelector(
      `[data-row="${tileRow}"][data-col="${tileCol}"]`,
    );
    if (!tileEl) return;

    const playerCenterX = this.player.x + this.player.width / 2;
    const playerCenterY = this.player.y + this.player.height / 2;
    const tileCenterX = tileCol * this.world.tileSize + this.world.tileSize / 2;
    const tileCenterY = tileRow * this.world.tileSize + this.world.tileSize / 2;
    if (
      Math.hypot(tileCenterX - playerCenterX, tileCenterY - playerCenterY) >
      this.mineRange
    )
      return;

    const tileType = this.world.matrix[tileRow][tileCol];
    if (tileType === "air") return;

    const byPickaxe = [
      "stone",
      "coal",
      "iron",
      "gold",
      "diamond",
      "water",
      "snow",
    ];
    const byShovel = ["grass", "dirt", "sand"];
    const byAxe = ["wood", "leaves"];
    let canAct = false;

    if (this.currentTool === "bucket") {
      canAct =
        (this.bucketContents === "empty" && tileType === "water") ||
        (this.bucketContents === "water" && tileType === "air");
    } else if (this.currentTool.startsWith("place-")) {
      canAct = tileType === "air";
    } else if (this.currentTool === "axe") {
      canAct = byAxe.includes(tileType);
    } else if (this.currentTool === "pickaxe") {
      canAct = byPickaxe.includes(tileType);
    } else if (this.currentTool === "shovel") {
      canAct = byShovel.includes(tileType);
    }

    tileEl.classList.add(
      "tile-hover",
      canAct ? "tile-hover-valid" : "tile-hover-invalid",
    );
    this.hoveredTileElement = tileEl;
  }

  // ── Game loop ───────────────────────────────────────────────────────────────

  tick() {
    const screensUp =
      !document.getElementById("landingPage").classList.contains("hidden") ||
      !document.getElementById("gameOverScreen").classList.contains("hidden");

    if (!screensUp) {
      this.player.update(this.keysPressed, this.currentTheme);
      this.enemies.forEach((z) => z.update(this.player));

      this.physics.resolvePhysics(this.player);
      this.enemies.forEach((z) => this.physics.resolvePhysics(z));

      this.enemies.forEach((enemy) => {
        const attackBox = {
          x:
            enemy.facing === "right"
              ? enemy.x + enemy.width / 2
              : enemy.x + enemy.width / 2 - enemy.attackRange,
          y: enemy.y + enemy.height / 3,
          width: enemy.attackRange,
          height: 10,
        };
        if (
          this.physics.checkCollision(this.player, attackBox) &&
          enemy.attackCooldown === 0
        ) {
          this.combat.takeDamage(enemy);
          enemy.attackCooldown = enemy.attackRate;
        }
      });
    }

    this.player.render();
    this.enemies.forEach((z) => z.render());
    this.camera.update();

    for (let key in this.keysPressed) {
      if (this.keysPressed[key] === "JUST_PRESSED")
        this.keysPressed[key] = "HELD";
    }

    requestAnimationFrame(() => this.tick());
  }
}

const Minecraft2D = new GameEngine();
Minecraft2D.init();
