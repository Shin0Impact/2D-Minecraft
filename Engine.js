// Engine.js — the hub: owns all state, wires systems together, runs the game loop

class GameEngine {
  constructor() {
    this.world = new WorldGrid(60, 80, 45);
    this.player = null;
    this.enemies = [];
    this.keysPressed = {};

    // Player health
    this.maxHealth = 5;
    this.playerHealth = this.maxHealth;
    this.isInvincible = false;
    this.invincibilityDuration = 1000;

    // Tool state
    this.currentTool = "sword";
    this.mineRange = 120;
    this.currentTheme = "forest";
    this.bucketContents = "empty"; // "empty" | "water"

    // Camera offset — updated by CameraSystem each tick
    this.cameraX = 0;
    this.cameraY = 0;
    this.stageElement = null;

    // Block counts for the hotbar
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

    // All systems receive a reference to this engine so they can read/write shared state
    this.physics = new PhysicsSystem(this);
    this.combat = new CombatSystem(this);
    this.mining = new MiningSystem(this);
    this.camera = new CameraSystem(this);
    this.spawner = new SpawnerSystem(this);
    this.bucket = new BucketTool(this);
    this.projectile = new ProjectileSystem(this);
    this.hover = new HoverSystem(this);
  }

  init() {
    this.world.generate(this.currentTheme);
    this.world.render();
    document.body.dataset.theme = this.currentTheme;

    this.stageElement = document.getElementById("stage");

    // Spawn the player just above the first solid column
    const spawnCol = 2;
    const spawnRow = this.world.getSurfaceRow(spawnCol);
    this.player = new Player(
      80,
      spawnRow * this.world.tileSize - 45,
      this.world,
    );

    this.spawner.start();
    this.combat.renderHearts();
    this.setupToolBelt();
    this.mining.updateInventoryUI();
    this.setupThemePicker();
    this._setupKeyboardShortcuts();
    this._setupMouseEvents();
    this._setupUIButtons();

    this.tick();
  }

  // Maps number keys 1-6 to tools so players don't have to click the hotbar
  _setupKeyboardShortcuts() {
    const toolMap = {
      1: "sword",
      2: "bow",
      3: "axe",
      4: "pickaxe",
      5: "shovel",
      6: "bucket",
    };
    window.addEventListener("keydown", (e) => {
      if (!this.keysPressed[e.key]) this.keysPressed[e.key] = "JUST_PRESSED";
      if (toolMap[e.key]) this._selectTool(toolMap[e.key]);
    });
    window.addEventListener("keyup", (e) => (this.keysPressed[e.key] = false));
  }

  // All click and hover events on the game viewport
  _setupMouseEvents() {
    const gw = document.getElementById("gameWindow");

    gw.addEventListener("mousedown", (e) => {
      const rect = gw.getBoundingClientRect();
      const worldX = e.clientX - rect.left + this.cameraX;
      const worldY = e.clientY - rect.top + this.cameraY;

      if (this.currentTool === "sword") this.combat.executePlayerAttack();
      else if (this.currentTool === "bow")
        this.projectile.firePlayerArrow(worldX, worldY);
      else if (this.currentTool === "bucket") this.bucket.use(worldX, worldY);
      else if (this.currentTool.startsWith("place-"))
        this.mining.executeBlockPlacement(worldX, worldY);
      else this.mining.executeEnvironmentMining(worldX, worldY);
    });

    gw.addEventListener("mousemove", (e) => this.hover.update(e, gw));
    gw.addEventListener("mouseleave", () => this.hover.clear());
  }

  // Wires up the three overlay buttons: Start, Respawn, Reset
  _setupUIButtons() {
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
  }

  // Landing page world picker — only previews sky; world generates on Start/Reset
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

  // Clicking a hotbar slot sets the active tool and updates the highlight border
  setupToolBelt() {
    const buttons = document.querySelectorAll(".tool-btn");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => this._selectTool(btn.dataset.tool));
    });
    this.bucket.updateUI();
  }

  // Central tool-switch: updates engine state + hotbar highlight in one place
  _selectTool(toolName) {
    this.currentTool = toolName;
    document
      .querySelectorAll(".tool-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelector(`[data-tool="${toolName}"]`)
      ?.classList.add("active");
  }

  // Tears down and rebuilds the entire world with the currently selected theme
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

    this.spawner.reset();
    this.combat.renderHearts();
    this.mining.updateInventoryUI();
    this.bucket.updateUI();
    this._selectTool("sword");
  }

  // Main loop — runs ~60 times per second via requestAnimationFrame
  tick() {
    const paused =
      !document.getElementById("landingPage").classList.contains("hidden") ||
      !document.getElementById("gameOverScreen").classList.contains("hidden");

    if (!paused) {
      this.player.update(this.keysPressed, this.currentTheme);
      this.enemies.forEach((e) => e.update(this.player));

      this.physics.resolvePhysics(this.player);
      this.enemies.forEach((e) => this.physics.resolvePhysics(e));

      // Check melee contact between each enemy's attack box and the player
      this.enemies.forEach((enemy) => {
        if (enemy.type === "goblin") return; // goblin attacks via arrows, not melee
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
    this.enemies.forEach((e) => e.render());
    this.camera.update();

    // Downgrade JUST_PRESSED to HELD so single-frame actions don't repeat
    for (const key in this.keysPressed) {
      if (this.keysPressed[key] === "JUST_PRESSED")
        this.keysPressed[key] = "HELD";
    }

    requestAnimationFrame(() => this.tick());
  }
}

const Minecraft2D = new GameEngine();
Minecraft2D.init();
