class Player {
  constructor(startX, startY, gridInstance) {
    this.x = startX;
    this.y = startY;
    this.width = 30;
    this.height = 45;
    this.vx = 0;
    this.vy = 0;
    this.speed = 4;
    this.gravity = 0.5;
    this.jumpForce = -10;
    this.isGrounded = false;
    this.grid = gridInstance; // currently broken

    this.DOMElement = document.getElementById("playerSprite");
  }

  update(keysPressed) {
    // movement logic based on key presses
    if (keysPressed["d"] || keysPressed["ArrowRight"]) this.vx = this.speed;
    else if (keysPressed["a"] || keysPressed["ArrowLeft"])
      this.vx = -this.speed;
    else this.vx = 0;

    // Gravity
    this.vy += this.gravity;

    // Jump broken
    if ((keysPressed[" "] || keysPressed["w"]) && this.isGrounded) {
      this.vy = this.jumpForce;
      this.isGrounded = false;
    }

    // 4. Ground Collision
    let feetY = this.y + this.height + this.vy;
    let leftFootX = this.x;
    let rightFootX = this.x + this.width;

    if (
      this.grid.isTileSolidAt(leftFootX, feetY) ||
      this.grid.isTileSolidAt(rightFootX, feetY)
    ) {
      this.vy = 0;
      this.isGrounded = true;
    }

    // Apply computed offsets to raw coordinates
    this.x += this.vx;
    this.y += this.vy;
  }

  render() {
    // Push the updated mathematical states cleanly to CSS properties
    this.DOMElement.style.left = `${this.x}px`;
    this.DOMElement.style.top = `${this.y}px`;
  }
}
