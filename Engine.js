class GameEngine {
  constructor() {
    this.world = new WorldGrid(15, 20); // 15 rows high, 20 columns wide
    this.player = null;
    this.enemies = [];
    this.keysPressed = {};

    this.maxHealth = 5;
    this.playerHealth = this.maxHealth;
    this.isInvincible = false;
    this.invincibilityDuration = 1000; // 1 second immunity frames after taking damage
  }

  init() {
    // Generate the tile values in data memory
    this.world.generate();
    // Render the visual grid layout based on our data matrix
    this.world.render();

    // this should be changed to a dynamic spawn system later, but for now we can hardcode a single player and enemy for testing
    this.player = new Player(80, 100, this.world);
    this.enemies.push(new Enemy(400, 100, "zombie", this.world));

    // show player hp
    this.renderHearts();

    // Bind event handlers jumping is currently broken
    window.addEventListener("keydown", (e) => {
      // If the key wasn't already held down, flag it as a fresh press trigger
      if (!this.keysPressed[e.key]) {
        this.keysPressed[e.key] = "JUST_PRESSED";
      }
    });
    window.addEventListener("keyup", (e) => (this.keysPressed[e.key] = false));

    // Fire up the continuous engine loop process
    this.tick();
  }

  /* Render the player's health */
  renderHearts() {
    let heartUI = document.getElementById("heartUI");
    if (!heartUI) {
      // Create element layout container if missing
      heartUI = document.createElement("div");
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

  /* makes sure player and enemy dont overlap and also used for taking damage*/
  checkCollision(rect1, rect2) {
    const padding = 4; // 4px touch radius detection margin
    return (
      rect1.x - padding < rect2.x + rect2.width &&
      rect1.x + rect1.width + padding > rect2.x &&
      rect1.y - padding < rect2.y + rect2.height &&
      rect1.y + rect1.height + padding > rect2.y
    );
  }

  takeDamage(enemy) {
    if (this.isInvincible) return;

    this.playerHealth--;
    this.renderHearts();
    console.log(`Player hit! Remaining HP: ${this.playerHealth}`);

    if (this.playerHealth <= 0) {
      alert("Game Over! Restarting game world...");
      this.playerHealth = this.maxHealth;
      this.player.x = 80;
      this.player.y = 100;
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.knockbackTimer = 0;
      this.renderHearts();
      return;
    }

    // 🌪️ Calculate clean knockback vector direction
    const playerCenter = this.player.x + this.player.width / 2;
    const enemyCenter = enemy.x + enemy.width / 2;
    const pushDirection = playerCenter < enemyCenter ? -1 : 1;

    // Apply the pushback physics impulse force
    this.player.applyKnockback(pushDirection);

    // Trigger brief immunity window on hit
    this.isInvincible = true;
    this.player.DOMElement.classList.add("damaged");
    setTimeout(() => {
      this.isInvincible = false;
      this.player.DOMElement.classList.remove("damaged");
    }, this.invincibilityDuration);
  }

  tick() {
    // Update positions mathematically in memory
    this.player.update(this.keysPressed, this.enemies);
    this.enemies.forEach((zombie) => zombie.update(this.player));

    // Collision Check Loop
    this.enemies.forEach((enemy) => {
      if (this.checkCollision(this.player, enemy)) {
        this.takeDamage(enemy); // 🌟 Pass the enemy causing the damage here!
      }
    });

    // Render positions out to the screen
    this.player.render();
    this.enemies.forEach((zombie) => zombie.render());

    // Held key state updates
    for (let key in this.keysPressed) {
      if (this.keysPressed[key] === "JUST_PRESSED") {
        this.keysPressed[key] = "HELD";
      }
    }

    requestAnimationFrame(() => this.tick());
  }
}

// Instantiate the Engine and start the simulation!
const Minecraft2D = new GameEngine();
Minecraft2D.init();
