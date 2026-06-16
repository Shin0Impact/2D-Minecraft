class Enemy {
  constructor(startX, startY, type, gridInstance) {
    this.x = startX;
    this.y = startY;
    this.width = 30;
    this.height = 45;
    this.vx = 0.5;
    this.vy = 0;
    this.gravity = 0.5;
    this.type = type;
    this.grid = gridInstance;
    this.health = 3;
    this.facing = "left";
    this.knockbackTimer = 0;
    this.isGrounded = false;

    this.attackRange = 25;
    this.attackCooldown = 0;
    this.attackRate = 90;
    // Jumping power variable matching standard tile grid acceleration
    this.jumpForce = -8;

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
      } else {
        // Track the current movement intent speed setting
        let targetSpeed = 0.5;
        if (this.x < playerTarget.x) {
          this.vx = targetSpeed;
          this.facing = "right";
        } else if (this.x > playerTarget.x) {
          this.vx = -targetSpeed;
          this.facing = "left";
        } else {
          this.vx = 0;
        }

        // Jump if moving toward a target but horizontal position was stopped by solid terrain
        if (this.isGrounded && Math.abs(this.vx) > 0) {
          let nextCheckX = this.vx > 0 ? this.x + this.width + 2 : this.x - 2;
          let kneeHeightY = this.y + this.height - 10;

          if (this.grid.isTileSolidAt(nextCheckX, kneeHeightY)) {
            this.vy = this.jumpForce;
            this.isGrounded = false;
          }
        }
      }
    }

    this.vy += this.gravity;
  }

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
