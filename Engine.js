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
    this.audio = new AudioSystem();
    this.portal = new PortalSystem(this);

    // Boss fight state — separate from normal gameplay
    this.bossFight = false;
    this.bossDefeated = false;
    this.boss = null;
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
      else if (this.currentTool.startsWith("place-")) {
        // Portal slots take priority over normal block placement when active
        if (
          this.currentTool === "place-diamond" &&
          this.portal.tryFillSlot(worldX, worldY)
        )
          return;
        this.mining.executeBlockPlacement(worldX, worldY);
      } else this.mining.executeEnvironmentMining(worldX, worldY);
    });

    gw.addEventListener("mousemove", (e) => this.hover.update(e, gw));
    gw.addEventListener("mouseleave", () => this.hover.clear());
  }

  // Wires up the three overlay buttons: Start, Respawn, Reset
  _setupUIButtons() {
    document.getElementById("startGameBtn").addEventListener("click", () => {
      this.audio.resume();
      this.resetWorld();
      document.getElementById("landingPage").classList.add("hidden");
      this.audio.playMusic(this.currentTheme);
    });
    document.getElementById("respawnBtn").addEventListener("click", () => {
      document.getElementById("gameOverScreen").classList.add("hidden");
      this.resetWorld();
      this.audio.playMusic(this.currentTheme); // resumes paused track or crossfades to new theme
    });
    document.getElementById("resetWorldBtn").addEventListener("click", () => {
      this.resetWorld();
      document.getElementById("landingPage").classList.remove("hidden");
      this.audio.pauseMusic();
    });

    document.getElementById("playAgainBtn")?.addEventListener("click", () => {
      document.getElementById("winScreen").classList.add("hidden");
      this.resetWorld();
      this.audio.playMusic(this.currentTheme);
    });
    document.getElementById("musicVol")?.addEventListener("input", (e) => {
      this.audio.setMusicVolume(parseFloat(e.target.value));
    });
    document.getElementById("sfxVol")?.addEventListener("input", (e) => {
      this.audio.setSfxVolume(parseFloat(e.target.value));
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
    this.portal.reset();
    this.bossFight = false;
    this.bossDefeated = false;
    if (this.boss) {
      this.boss.DOMElement?.remove();
      this.boss = null;
    }
    document.getElementById("bossHealthBar")?.remove();
    // Clear any stray boss bullets
    document.querySelectorAll(".boss-bullet").forEach((b) => b.remove());
    this.combat.renderHearts();
    this.mining.updateInventoryUI();
    this.bucket.updateUI();
    this._selectTool("sword");
  }

  // Transitions from the normal world into the boss arena
  enterBossArena() {
    this.bossFight = true;
    this.spawner.reset(); // clear normal enemies

    // Rebuild world as superflat
    this.world.DOMElement.innerHTML = "";
    BossWorld.generate(this.world);
    this.world.render();
    document.body.dataset.theme = "cave"; // dark sky for boss arena

    // Place player on the left side of the flat arena
    const floorRow = this.world.rows - 4;
    this.player.x = 3 * this.world.tileSize;
    this.player.y = floorRow * this.world.tileSize - this.player.height;
    this.player.vx = 0;
    this.player.vy = 0;

    // Restore full health for the boss fight
    this.playerHealth = this.maxHealth;
    this.combat.renderHearts();

    // Spawn the boss
    this.boss = new BossEnemy(this);
    this.audio?.playMusic("desert"); // reuse desert track as boss music
    this.portal._showAnnouncement("⚔️ Defeat the Zombie Lord!");
  }

  // Called by BossEnemy when health reaches 0
  onBossDefeated() {
    this.bossDefeated = true;
    this.bossFight = false;
    this.boss = null;
    document.getElementById("bossHealthBar")?.remove();
    document.querySelectorAll(".boss-bullet").forEach((b) => b.remove());
    this.portal._showAnnouncement("🏆 YOU WIN! The Zombie Lord is defeated!");
    this.audio?.playMusic(this.currentTheme);
    // Show a win screen after 3 seconds
    setTimeout(() => {
      document.getElementById("winScreen").classList.remove("hidden");
    }, 3000);
  }

  // Main loop — runs ~60 times per second via requestAnimationFrame
  tick() {
    const paused =
      !document.getElementById("landingPage").classList.contains("hidden") ||
      !document.getElementById("gameOverScreen").classList.contains("hidden");

    if (!paused) {
      this.player.update(this.keysPressed, this.currentTheme);

      if (this.bossFight && this.boss) {
        // Boss fight — update and physics for boss only, no normal enemies
        this.boss.update(this.player);
        this.physics.resolvePhysics(this.player);
        this.physics.resolvePhysics(this.boss);
        // Player sword hit against boss
        if (this.currentTool === "sword") {
          // handled in executePlayerAttack via combat system
        }
      } else {
        // Normal gameplay
        this.enemies.forEach((e) => e.update(this.player));
        this.physics.resolvePhysics(this.player);
        this.enemies.forEach((e) => this.physics.resolvePhysics(e));

        this.enemies.forEach((enemy) => {
          if (enemy.type === "goblin") return;
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
    }

    this.player.render();
    if (this.bossFight && this.boss) {
      this.boss.render();
    } else {
      this.enemies.forEach((e) => e.render());
    }
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
