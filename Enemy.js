class Enemy {
  constructor(startX, startY, type, gridInstance) {
    this.x = startX;
    this.y = startY;
    this.width = 30;
    this.height = 45;
    this.vx = 0.5;
    this.vy = 0;
    this.gravity = 0.5;
    this.type = type; // "zombie" or "skeleton"
    this.grid = gridInstance;
    this.health = 3;
    this.facing = "left";
    this.knockbackTimer = 0;
    this.isGrounded = false;
    this.attackRange = 25;
    this.attackCooldown = 0;
    this.attackRate = 90;

    // Water state variables to communicate with Physics system
    this.isInWater = false;
    this.swimmingUp = false;

    // Jump height matches player (-10)
    this.jumpForce = -10;

    // Land-jump interval delay (4x slower)
    this.jumpCooldownTimer = 0;

    this.DOMElement = document.createElement("article");
    this.DOMElement.className = `enemy ${this.type}`;
    document.getElementById("enemyContainer").appendChild(this.DOMElement);
  }

  applyKnockback(directionX) {
    this.vx = directionX * 6;
    this.vy = -4;
    this.knockbackTimer = 8;
  }

  update(playerTarget) {
    if (this.attackCooldown > 0) {
      this.attackCooldown--;
    }

    // Process jump cooldown tick rate
    if (this.jumpCooldownTimer > 0) {
      this.jumpCooldownTimer--;
    }

    if (this.knockbackTimer > 0) {
      this.knockbackTimer--;
      this.vx *= 0.9;
    } else {
      const enemyCenter = this.x + this.width / 2;
      const playerCenter = playerTarget.x + playerTarget.width / 2;
      const horizontalDistance = Math.abs(enemyCenter - playerCenter);
      const verticalDistance = Math.abs(this.y - playerTarget.y);

      if (
        horizontalDistance <= this.attackRange &&
        verticalDistance < this.height
      ) {
        this.vx = 0;
        this.facing = enemyCenter < playerCenter ? "right" : "left";
        this.swimmingUp = false;
      } else {
        // Run slower when moving through water drag
        let targetSpeed = this.isInWater ? 0.25 : 0.5;
        if (this.x < playerTarget.x) {
          this.vx = targetSpeed;
          this.facing = "right";
        } else if (this.x > playerTarget.x) {
          this.vx = -targetSpeed;
          this.facing = "left";
        } else {
          this.vx = 0;
        }

        // ─── STATE MACHINE: WATER TRACKING VS LAND RUNNING ───────────────────
        // Skeleton logic completely bypasses swimming controls
        if (this.isInWater && this.type !== "skeleton") {
          // WATER MODE (Zombie): Hold space (swim up) if player is higher up
          if (this.y > playerTarget.y + 10) {
            this.swimmingUp = true;
          } else {
            this.swimmingUp = false;
          }
        } else {
          // LAND MODE / SKELETON WATER OVERRIDE
          this.swimmingUp = false;

          if (this.isGrounded && Math.abs(this.vx) > 0) {
            let nextCheckX = this.vx > 0 ? this.x + this.width + 2 : this.x - 2;
            let kneeHeightY = this.y + this.height - 10;

            if (this.grid.isTileSolidAt(nextCheckX, kneeHeightY)) {
              if (this.jumpCooldownTimer === 0) {
                this.vy = this.jumpForce;
                this.isGrounded = false;
                this.jumpCooldownTimer = 120; // 2-second delay pacing
              }
            }
          }
        }
      }
    }

    // Apply falling gravity to land entities and non-swimming skeletons
    if (!this.isInWater || this.type === "skeleton") {
      this.vy += this.gravity;
    }
  }

  render() {
    this.DOMElement.style.left = `${this.x}px`;
    this.DOMElement.style.top = `${this.y}px`;

    // Your fixed visual orientation flip logic
    if (this.facing === "left") {
      this.DOMElement.style.transform = "scaleX(1)";
    } else {
      this.DOMElement.style.transform = "scaleX(-1)";
    }

    // Trigger universal walking state class
    if (Math.abs(this.vx) > 0.05 && this.isGrounded) {
      this.DOMElement.classList.add("walking");
    } else {
      this.DOMElement.classList.remove("walking");
    }
  }
}
