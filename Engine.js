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

    // Systems — each receives a reference back to this engine instance
    this.physics = new PhysicsSystem(this);
    this.combat = new CombatSystem(this);
    this.mining = new MiningSystem(this);
    this.camera = new CameraSystem(this);
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

    this.combat.renderHearts();
    this.setupToolBelt();
    this.mining.updateInventoryUI();

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
        this.combat.executePlayerAttack();
      } else if (this.currentTool.startsWith("place-")) {
        this.mining.executeBlockPlacement(worldX, worldY);
      } else {
        this.mining.executeEnvironmentMining(worldX, worldY);
      }
    });

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

  tick() {
    const screensUp =
      !document.getElementById("landingPage").classList.contains("hidden") ||
      !document.getElementById("gameOverScreen").classList.contains("hidden");

    if (!screensUp) {
      this.player.update(this.keysPressed);
      this.enemies.forEach((zombie) => zombie.update(this.player));

      this.physics.resolvePhysics(this.player);
      this.enemies.forEach((zombie) => this.physics.resolvePhysics(zombie));

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
          this.physics.checkCollision(this.player, enemyAttackBox) &&
          enemy.attackCooldown === 0
        ) {
          this.combat.takeDamage(enemy);
          enemy.attackCooldown = enemy.attackRate;
        }
      });
    }

    this.player.render();
    this.enemies.forEach((zombie) => zombie.render());
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
