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
    this.knockbackTimer = 0;

    this.DOMElement = document.getElementById("playerSprite");
  }

  //knockback mechanic
  applyKnockback(directionX) {
    this.vx = directionX * 8; // Launch horizontally (positive = right, negative = left)
    this.vy = -6; // Launch slightly upward into the air
    this.isGrounded = false;
    this.knockbackTimer = 5; // Number of frames player loses steering control
  }

  update(keysPressed, enemiesList = []) {
    // nockback timer countdown or normal input tracking
    if (this.knockbackTimer > 0) {
      this.knockbackTimer--;
      this.vx *= 0.92; // Gradually slow down horizontally in mid-air
    } else {
      // Horizontal movement logic based on key presses
      if (keysPressed["d"] || keysPressed["ArrowRight"]) this.vx = this.speed;
      else if (keysPressed["a"] || keysPressed["ArrowLeft"])
        this.vx = -this.speed;
      else this.vx = 0;

      // SOLID ENTITY CHECK
      if (this.vx !== 0) {
        let nextX = this.x + this.vx;
        enemiesList.forEach((enemy) => {
          if (
            nextX < enemy.x + enemy.width &&
            nextX + this.width > enemy.x &&
            this.y < enemy.y + enemy.height &&
            this.y + this.height > enemy.y
          ) {
            this.vx = 0; // Prevent pushing the enemy manually
          }
        });
      }
    }

    // Gravity
    this.vy += this.gravity;

    // Jump Check (single press check)
    if (
      (keysPressed[" "] === "JUST_PRESSED" ||
        keysPressed["w"] === "JUST_PRESSED") &&
      this.isGrounded &&
      this.knockbackTimer === 0
    ) {
      this.vy = this.jumpForce;
      this.isGrounded = false;
    }

    // 4. Ground Collision
    let feetY = this.y + this.height + this.vy;
    let leftFootX = this.x + 4; // Inward offset to stop edge sticking
    let rightFootX = this.x + this.width - 4;

    if (
      this.grid.isTileSolidAt(leftFootX, feetY) ||
      this.grid.isTileSolidAt(rightFootX, feetY)
    ) {
      this.vy = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    // Apply movement speeds
    this.x += this.vx;
    this.y += this.vy;
  }

  render() {
    // Push the updated mathematical states cleanly to CSS properties
    this.DOMElement.style.left = `${this.x}px`;
    this.DOMElement.style.top = `${this.y}px`;
  }
}
