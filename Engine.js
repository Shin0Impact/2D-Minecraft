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
    this.currentTheme = "forest";
    this.currentWorldType = "forest";

    this.cameraX = 0;
    this.cameraY = 0;
    this.stageElement = null;

    this.inventory = {
      grass: 0, dirt: 0, stone: 0, wood: 0, leaves: 0,
      coal: 0, iron: 0, gold: 0, diamond: 0,
      sand: 0, snow: 0,
    };

    this.physics = new PhysicsSystem(this);
    this.combat  = new CombatSystem(this);
    this.mining  = new MiningSystem(this);
    this.camera  = new CameraSystem(this);

    this.hoveredTileElement = null;
  }

  init() {
    this.world.generate(this.currentWorldType);
    this.world.render();
    document.body.dataset.theme = this.currentTheme;

    this.stageElement = document.getElementById("stage");

    const spawnCol = 2;
    const spawnRow = this.world.getSurfaceRow(spawnCol);
    const spawnY = spawnRow * this.world.tileSize - 45;
    this.player = new Player(80, spawnY, this.world);

    this.spawnZombies();
    this.combat.renderHearts();
    this.setupToolBelt();
    this.mining.updateInventoryUI();
    this.setupThemePicker();
    this.setupWorldTypePicker();

    window.addEventListener("keydown", (e) => {
      if (!this.keysPressed[e.key]) this.keysPressed[e.key] = "JUST_PRESSED";
    });
    window.addEventListener("keyup", (e) => (this.keysPressed[e.key] = false));

    const gameWindow = document.getElementById("gameWindow");

    gameWindow.addEventListener("mousedown", (e) => {
      const rect = gameWindow.getBoundingClientRect();
      const worldX = (e.clientX - rect.left) + this.cameraX;
      const worldY = (e.clientY - rect.top)  + this.cameraY;

      if (this.currentTool === "sword") {
        this.combat.executePlayerAttack();
      } else if (this.currentTool.startsWith("place-")) {
        this.mining.executeBlockPlacement(worldX, worldY);
      } else {
        this.mining.executeEnvironmentMining(worldX, worldY);
      }
    });

    gameWindow.addEventListener("mousemove", (e) => this.updateTileHover(e, gameWindow));
    gameWindow.addEventListener("mouseleave", () => this.clearTileHover());

    document.getElementById("startGameBtn").addEventListener("click", () => {
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

  setupThemePicker() {
    document.querySelectorAll(".theme-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".theme-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentTheme = btn.dataset.theme;
        document.body.dataset.theme = this.currentTheme;
      });
    });
  }

  setupWorldTypePicker() {
    document.querySelectorAll(".worldtype-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".worldtype-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentWorldType = btn.dataset.worldtype;
      });
    });
  }

  spawnZombies() {
    this.enemies.forEach((e) => e.DOMElement.remove());
    this.enemies = [];

    const spawnCol = 12;
    const spawnRow = this.world.getSurfaceRow(spawnCol);
    const spawnY = spawnRow * this.world.tileSize - 45;
    this.enemies.push(new Enemy(spawnCol * this.world.tileSize, spawnY, "zombie", this.world));
  }

  resetWorld() {
    this.playerHealth = this.maxHealth;
    this.isInvincible = false;
    for (const block in this.inventory) this.inventory[block] = 0;

    this.world.DOMElement.innerHTML = "";
    this.world.generate(this.currentWorldType);
    this.world.render();

    const spawnCol = 2;
    const spawnRow = this.world.getSurfaceRow(spawnCol);
    this.player.x = 80;
    this.player.y = spawnRow * this.world.tileSize - 45;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.knockbackTimer = 0;

    this.spawnZombies();
    this.combat.renderHearts();
    this.mining.updateInventoryUI();

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

  // ─── Hover highlight ──────────────────────────────────────────────────────

  clearTileHover() {
    if (this.hoveredTileElement) {
      this.hoveredTileElement.classList.remove("tile-hover", "tile-hover-valid", "tile-hover-invalid");
      this.hoveredTileElement = null;
    }
  }

  updateTileHover(e, gameWindow) {
    const rect = gameWindow.getBoundingClientRect();
    const worldX = (e.clientX - rect.left) + this.cameraX;
    const worldY = (e.clientY - rect.top)  + this.cameraY;

    const tileCol = Math.floor(worldX / this.world.tileSize);
    const tileRow = Math.floor(worldY / this.world.tileSize);

    this.clearTileHover();
    if (this.currentTool === "sword") return;
    if (tileCol < 0 || tileCol >= this.world.cols || tileRow < 0 || tileRow >= this.world.rows) return;

    const tileEl = this.world.DOMElement.querySelector(`[data-row="${tileRow}"][data-col="${tileCol}"]`);
    if (!tileEl) return;

    const playerCenterX = this.player.x + this.player.width / 2;
    const playerCenterY = this.player.y + this.player.height / 2;
    const tileCenterX   = tileCol * this.world.tileSize + this.world.tileSize / 2;
    const tileCenterY   = tileRow * this.world.tileSize + this.world.tileSize / 2;
    const distance = Math.hypot(tileCenterX - playerCenterX, tileCenterY - playerCenterY);
    if (distance > this.mineRange) return;

    const tileType = this.world.matrix[tileRow][tileCol];
    if (tileType === "air") return;

    const byPickaxe = ["stone", "coal", "iron", "gold", "diamond", "water", "snow"];
    const byShovel  = ["grass", "dirt", "sand"];
    const byAxe     = ["wood", "leaves"];
    let canAct = false;

    if (this.currentTool.startsWith("place-")) {
      canAct = tileType === "air";
    } else if (this.currentTool === "axe")     { canAct = byAxe.includes(tileType); }
    else if (this.currentTool === "pickaxe")   { canAct = byPickaxe.includes(tileType); }
    else if (this.currentTool === "shovel")    { canAct = byShovel.includes(tileType); }

    tileEl.classList.add("tile-hover", canAct ? "tile-hover-valid" : "tile-hover-invalid");
    this.hoveredTileElement = tileEl;
  }

  // ─── Game loop ────────────────────────────────────────────────────────────

  tick() {
    const screensUp =
      !document.getElementById("landingPage").classList.contains("hidden") ||
      !document.getElementById("gameOverScreen").classList.contains("hidden");

    if (!screensUp) {
      this.player.update(this.keysPressed);
      this.enemies.forEach((z) => z.update(this.player));

      this.physics.resolvePhysics(this.player);
      this.enemies.forEach((z) => this.physics.resolvePhysics(z));

      this.enemies.forEach((enemy) => {
        const attackBox = {
          x: enemy.facing === "right"
            ? enemy.x + enemy.width / 2
            : enemy.x + enemy.width / 2 - enemy.attackRange,
          y: enemy.y + enemy.height / 3,
          width: enemy.attackRange,
          height: 10,
        };
        if (this.physics.checkCollision(this.player, attackBox) && enemy.attackCooldown === 0) {
          this.combat.takeDamage(enemy);
          enemy.attackCooldown = enemy.attackRate;
        }
      });
    }

    this.player.render();
    this.enemies.forEach((z) => z.render());
    this.camera.update();

    for (let key in this.keysPressed) {
      if (this.keysPressed[key] === "JUST_PRESSED") this.keysPressed[key] = "HELD";
    }

    requestAnimationFrame(() => this.tick());
  }
}

const Minecraft2D = new GameEngine();
Minecraft2D.init();
