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
    this.health = 1;
    this.facing = "left";

    this.DOMElement = document.createElement("div");
    this.DOMElement.className = `enemy ${this.type}`;
    document.getElementById("enemyContainer").appendChild(this.DOMElement);
  }

  update(playerTarget) {
    // Follow the player horizontal logic
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
