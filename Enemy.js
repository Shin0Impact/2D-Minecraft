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

    this.DOMElement = document.createElement("div");
    this.DOMElement.className = `enemy ${this.type}`;
    document.getElementById("enemyContainer").appendChild(this.DOMElement);
  }

  update(playerTarget) {
    // fol;low the player logic
    if (this.x < playerTarget.x) {
      this.x += this.vx;
    } else if (this.x > playerTarget.x) {
      this.x -= this.vx;
    }

    // gravity checks
    this.vy += 0.5;
    let feetY = this.y + this.height + this.vy;
    if (this.grid.isTileSolidAt(this.x, feetY)) {
      this.vy = 0;
    }
    this.y += this.vy;
  }

  render() {
    this.DOMElement.style.left = `${this.x}px`;
    this.DOMElement.style.top = `${this.y}px`;
  }
}
