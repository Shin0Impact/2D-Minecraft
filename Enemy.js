class Enemy {
  constructor(startX, startY, type, gridInstance) {
    this.x = startX;
    this.y = startY;
    this.width = 30;
    this.height = 45;
    this.vx = 0.5; // speed
    this.vy = 0;
    this.type = type; // "zombie", "skeleton", "creeper"
    this.grid = gridInstance;
    this.health = 3;
    this.facing = "left";
    this.knockbackTimer = 0;

    this.DOMElement = document.createElement("div");
    this.DOMElement.className = `enemy ${this.type}`;
    document.getElementById("enemyContainer").appendChild(this.DOMElement);
  }

  applyKnockback(directionX) {
    this.vx = directionX * 6; // Launch horizontal speed force
    this.vy = -4; // Launch slightly upward
    this.knockbackTimer = 8; // Increased slightly from 5 to feel much better
  }

  update(playerTarget) {
    if (this.knockbackTimer > 0) {
      this.knockbackTimer--;
      this.vx *= 0.9; // Gradually slow down horizontal slide

      // Predict next spot for quick environment solid tile collision check
      let nextX = this.x + this.vx;
      let checkX = this.vx > 0 ? nextX + this.width : nextX;
      if (!this.grid.isTileSolidAt(checkX, this.y + this.height / 2)) {
        this.x = nextX;
      } else {
        this.vx = 0; // stop sliding if hitting a wall
      }
    } else {
      // Normal behavior: Reset normal patrol speed when knockback expires
      this.vx = 0.5;

      // Follow the player horizontal logic (Only runs if NOT knocked back!)
      if (this.x < playerTarget.x) {
        this.x += this.vx;
        this.facing = "right";

        // Solid Block Check: If stepping forward forces an overlap, stop moving!
        if (
          this.x + this.width > playerTarget.x &&
          this.x < playerTarget.x + playerTarget.width &&
          this.y + this.height > playerTarget.y &&
          this.y < playerTarget.y + playerTarget.height
        ) {
          this.x = playerTarget.x - this.width; // Snap right against player left side boundary
        }
      } else if (this.x > playerTarget.x) {
        this.x -= this.vx;
        this.facing = "left";

        // solid Block Check: Mirroring wall contact pushback on the opposite side
        if (
          this.x < playerTarget.x + playerTarget.width &&
          this.x + this.width > playerTarget.x &&
          this.y + this.height > playerTarget.y &&
          this.y < playerTarget.y + playerTarget.height
        ) {
          this.x = playerTarget.x + playerTarget.width; // Snap right against player's right side boundary
        }
      }
    }

    // Gravity checks
    this.vy += 0.5;
    let feetY = this.y + this.height + this.vy;
    if (this.grid.isTileSolidAt(this.x + this.width / 2, feetY)) {
      this.vy = 0;
    }
    this.y += this.vy;
  }

  render() {
    this.DOMElement.style.left = `${this.x}px`;
    this.DOMElement.style.top = `${this.y}px`;
    this.DOMElement.classList.toggle("mirror-left", this.facing === "left");
    this.DOMElement.classList.toggle("mirror-right", this.facing === "right");
  }
}
