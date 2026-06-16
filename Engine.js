class GameEngine {
  constructor() {
    this.world = new WorldGrid(15, 20);
    this.player = null;
    this.enemies = [];
    this.keysPressed = {};

    this.maxHealth = 5;
    this.playerHealth = this.maxHealth;
    this.isInvincible = false;
    this.invincibilityDuration = 1000;
  }

  init() {
    this.world.generate();
    this.world.render();

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

    window.addEventListener("keydown", (e) => {
      if (!this.keysPressed[e.key]) {
        this.keysPressed[e.key] = "JUST_PRESSED";
      }
    });
    window.addEventListener("keyup", (e) => (this.keysPressed[e.key] = false));

    const gameWindow = document.getElementById("gameWindow");
    gameWindow.addEventListener("mousedown", (e) => {
      const rect = gameWindow.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const playerCenter = this.player.x + this.player.width / 2;

      this.player.facing = mouseX < playerCenter ? "left" : "right";
      this.executePlayerAttack();
    });

    this.tick();
  }

  // Translates vectors over axes and resolves collision checking against environment grids.
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
    entity.y += entity.vy;
    entity.isGrounded = false;

    let checkXPoints = [
      entity.x + 4,
      entity.x + entity.width / 2,
      entity.x + entity.width - 4,
    ];
    if (entity.vy > 0) {
      let feetY = entity.y + entity.height;
      if (checkXPoints.some((x) => this.world.isTileSolidAt(x, feetY))) {
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

  // Emits a temporary physical collision zone to calculate standard sword strikes.
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

  // Generates semantic section container elements to handle active display updates.
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

  // Formulates intersection validation checks across bounding structures.
  checkCollision(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }

  // Deducts health metrics, initializes knockback variables, and tracks immunity states.
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

  // Continuous frame updating routine handling input tracking and range limits.
  tick() {
    this.player.update(this.keysPressed);
    this.enemies.forEach((zombie) => zombie.update(this.player));

    this.resolvePhysics(this.player);
    this.enemies.forEach((zombie) => this.resolvePhysics(zombie));

    this.enemies.forEach((enemy) => {
      let handHeight = 10;
      let targetY = enemy.y + enemy.height / 3;
      let targetX = 0;

      if (enemy.facing === "right") {
        targetX = enemy.x + enemy.width / 2;
      } else {
        targetX = enemy.x + enemy.width / 2 - enemy.attackRange;
      }

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
