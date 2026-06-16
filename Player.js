class Player {
  constructor(startX, startY, gridInstance) {
    this.x = startX;
    this.y = startY;
    this.width = 30;
    this.height = 45;
    this.vx = 0;
    this.vy = 0;
    this.speed = 3;
    this.gravity = 0.5;
    this.jumpForce = -10;
    this.isGrounded = false;
    this.grid = gridInstance;
    this.knockbackTimer = 0;
    this.facing = "right";
    this.DOMElement = document.getElementById("playerSprite");
  }

  // Processes impact dynamics across multiple execution ticks.
  applyKnockback(directionX) {
    this.vx = directionX * 8;
    this.vy = -6;
    this.isGrounded = false;
    this.knockbackTimer = 15;
  }

  // Collects interface states to modify intent velocity fields.
  update(keysPressed) {
    if (this.knockbackTimer > 0) {
      this.knockbackTimer--;
      this.vx *= 0.92;
    } else {
      if (keysPressed["d"] || keysPressed["ArrowRight"]) {
        this.vx = this.speed;
        this.facing = "right";
      } else if (keysPressed["a"] || keysPressed["ArrowLeft"]) {
        this.vx = -this.speed;
        this.facing = "left";
      } else {
        this.vx = 0;
      }
    }

    this.vy += this.gravity;

    if (
      (keysPressed[" "] === "JUST_PRESSED" ||
        keysPressed["w"] === "JUST_PRESSED") &&
      this.isGrounded &&
      this.knockbackTimer === 0
    ) {
      this.vy = this.jumpForce;
      this.isGrounded = false;
    }
  }

  // Adjusts visual placement vectors on-screen and mirrors components dynamically.
  render() {
    this.DOMElement.style.left = `${this.x}px`;
    this.DOMElement.style.top = `${this.y}px`;

    if (this.facing === "left") {
      this.DOMElement.style.transform = "scaleX(-1)";
    } else {
      this.DOMElement.style.transform = "scaleX(1)";
    }
  }
}
