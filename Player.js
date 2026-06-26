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
    this.isInWater = false; // set each tick by PhysicsSystem
    this.isFrozen = false; // set by engine based on snow theme + water tile
    this.swimmingUp = false; // true when space held while in water
    this.grid = gridInstance;
    this.knockbackTimer = 0;
    this.facing = "right";
    this.DOMElement = document.getElementById("playerSprite");
  }

  applyKnockback(directionX) {
    this.vx = directionX * 8;
    this.vy = -6;
    this.isGrounded = false;
    this.knockbackTimer = 15;
  }

  update(keysPressed, theme) {
    // Frozen in snow water — no movement at all
    if (this.isFrozen) {
      this.vx = 0;
      return;
    }

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

    if (this.isInWater && theme === "forest") {
      // Physics handles gravity suppression and upward velocity.
      // We just track whether the player wants to swim up.
      this.swimmingUp = !!(keysPressed[" "] || keysPressed["w"]);
    } else {
      this.swimmingUp = false;
      // Normal jump
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

    // Gravity only added here when not in water — Physics owns it in water
    if (!this.isInWater) {
      this.vy += this.gravity;
    }
  }

  render() {
    this.DOMElement.style.left = `${this.x}px`;
    this.DOMElement.style.top = `${this.y}px`;
    this.DOMElement.style.transform =
      this.facing === "left" ? "scaleX(-1)" : "scaleX(1)";

    // Visual tint when submerged
    if (this.isFrozen) {
      this.DOMElement.classList.add("frozen");
      this.DOMElement.classList.remove("submerged");
    } else if (this.isInWater) {
      this.DOMElement.classList.add("submerged");
      this.DOMElement.classList.remove("frozen");
    } else {
      this.DOMElement.classList.remove("submerged", "frozen");
    }
  }
}
