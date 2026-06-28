// Player.js — reads keyboard input, updates velocity, tracks state flags

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
    this.isInWater = false; // set by PhysicsSystem each tick
    this.isFrozen = false; // true when standing in frozen water (snow world)
    this.swimmingUp = false; // true while space is held in water
    this.grid = gridInstance;
    this.knockbackTimer = 0;
    this.facing = "right";
    this.DOMElement = document.getElementById("playerSprite");
  }

  // Launches the player backward — called by CombatSystem on hit
  applyKnockback(directionX) {
    this.vx = directionX * 8;
    this.vy = -6;
    this.isGrounded = false;
    this.knockbackTimer = 15;
  }

  update(keysPressed, theme) {
    // Frozen solid — no control at all
    if (this.isFrozen) {
      this.vx = 0;
      return;
    }

    // Knockback overrides normal movement for a few frames, then fades
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
      // PhysicsSystem handles the actual upward velocity; we just signal intent here
      this.swimmingUp = !!(keysPressed[" "] || keysPressed["w"]);
    } else {
      this.swimmingUp = false;
      // Standard jump — only triggers on the first frame the key is pressed
      if (
        (keysPressed[" "] === "JUST_PRESSED" ||
          keysPressed["w"] === "JUST_PRESSED") &&
        this.isGrounded &&
        this.knockbackTimer === 0
      ) {
        this.vy = this.jumpForce;
        this.isGrounded = false;
        if (typeof Minecraft2D !== "undefined") Minecraft2D.audio.play("jump");
      }
    }

    // Gravity is added here for land; PhysicsSystem takes over when in water
    if (!this.isInWater) this.vy += this.gravity;
  }

  render() {
    this.DOMElement.style.left = `${this.x}px`;
    this.DOMElement.style.top = `${this.y}px`;
    this.DOMElement.style.transform =
      this.facing === "left" ? "scaleX(-1)" : "scaleX(1)";

    // Walking GIF is triggered via CSS — only swap while moving on the ground
    if (Math.abs(this.vx) > 0.01 && this.isGrounded) {
      this.DOMElement.classList.add("walking");
    } else {
      this.DOMElement.classList.remove("walking");
    }

    // Visual tints for water and freeze states
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
