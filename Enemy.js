class Enemy {
  constructor(startX, startY, type, gridInstance) {
    this.x = startX;
    this.y = startY;
    this.width = 30;
    this.height = 45;
    this.type = type; // "zombie", "skeleton", or "goblin"
    this.grid = gridInstance;
    this.health = type === "goblin" ? 2 : 3;
    this.facing = "left";
    this.knockbackTimer = 0;
    this.isGrounded = false;

    // Dynamic stats based on enemy profiles
    if (this.type === "goblin") {
      this.sightRange = 250; // Sight line to stop and shoot arrows
      this.attackRange = 25; // Lower melee range so it doesn't instantly hit you via tick()
      this.attackRate = 210; // Slowed fire rate (~3.5 seconds at 60fps)
      this.baseSpeed = 0.75;
    } else {
      this.sightRange = 25; // Melee reach for skeletons/zombies
      this.attackRange = 25;
      this.attackRate = 90;
      this.baseSpeed = 0.5;
    }
    this.attackCooldown = 0;

    this.vx = 0;
    this.vy = 0;
    this.gravity = 0.5;

    // Water state variables for Physics.js
    this.isInWater = false;
    this.swimmingUp = false;

    // Jump parameters
    this.jumpForce = -10;
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

  // Helper method to spawn arrow projectiles for the Archer Goblin
  fireArrow(playerTarget) {
    const arrow = document.createElement("div");
    arrow.className = "arrow-projectile";

    // Spawn arrow near goblin center
    let arrowX = this.x + this.width / 2;
    let arrowY = this.y + this.height / 3;
    arrow.style.left = `${arrowX}px`;
    arrow.style.top = `${arrowY}px`;

    document.getElementById("stage").appendChild(arrow);

    // Calculate trajectory vector directly toward the player
    const dx = playerTarget.x + playerTarget.width / 2 - arrowX;
    const dy = playerTarget.y + playerTarget.height / 2 - arrowY;
    const dist = Math.hypot(dx, dy);

    const arrowSpeed = 5;
    const avx = (dx / dist) * arrowSpeed;
    const avy = (dy / dist) * arrowSpeed;

    // Calculate the angle in radians and convert to degrees to stop reverse flying bugs
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    arrow.style.transform = `rotate(${angle}deg)`;

    // Micro projectile loop running directly inside the window context
    const arrowInterval = setInterval(() => {
      const screensUp =
        !document.getElementById("landingPage").classList.contains("hidden") ||
        !document.getElementById("gameOverScreen").classList.contains("hidden");
      if (screensUp) return;

      arrowX += avx;
      arrowY += avy;
      arrow.style.left = `${arrowX}px`;
      arrow.style.top = `${arrowY}px`;

      // Check collision using bounding boxes manually
      const playerHitbox = {
        x: playerTarget.x,
        y: playerTarget.y,
        width: playerTarget.width,
        height: playerTarget.height,
      };
      const arrowHitbox = { x: arrowX, y: arrowY, width: 8, height: 8 };

      const hitPlayer =
        arrowHitbox.x < playerHitbox.x + playerHitbox.width &&
        arrowHitbox.x + arrowHitbox.width > playerHitbox.x &&
        arrowHitbox.y < playerHitbox.y + playerHitbox.height &&
        arrowHitbox.y + arrowHitbox.height > playerHitbox.y;

      // Handle impact
      if (hitPlayer) {
        clearInterval(arrowInterval);
        arrow.remove();

        // Route directly through the explicit global variable object 'Minecraft2D'
        if (typeof Minecraft2D !== "undefined" && Minecraft2D.combat) {
          Minecraft2D.combat.takeDamage(this);
        }
      }

      // Despawn arrow if it runs out of range or hits a tile layout wall
      if (this.grid.isTileSolidAt(arrowX, arrowY)) {
        clearInterval(arrowInterval);
        arrow.remove();
      }
    }, 1000 / 60);

    // Safety fallback: Clean up arrows that fly into space indefinitely after 4 seconds
    setTimeout(() => {
      clearInterval(arrowInterval);
      if (arrow.parentNode) arrow.remove();
    }, 4000);
  }

  update(playerTarget) {
    if (this.attackCooldown > 0) {
      this.attackCooldown--;
    }

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

      // Check if player is inside the entity's distinct vision sight line
      if (
        horizontalDistance <= this.sightRange &&
        verticalDistance < (this.type === "goblin" ? 200 : this.height)
      ) {
        this.vx = 0;
        this.facing = enemyCenter < playerCenter ? "right" : "left";
        this.swimmingUp = false;

        // Archer logic: Instead of contact melee damage, spawn an arrow projectile on cooldown
        if (this.type === "goblin" && this.attackCooldown === 0) {
          this.fireArrow(playerTarget);
          this.attackCooldown = this.attackRate;
        }
      } else {
        // Apply swimming horizontal speed modifiers uniformly
        let targetSpeed = this.isInWater
          ? this.baseSpeed * 0.5
          : this.baseSpeed;
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
        if (this.isInWater && this.type !== "skeleton") {
          if (this.y > playerTarget.y + 10) {
            this.swimmingUp = true;
          } else {
            this.swimmingUp = false;
          }
        } else {
          this.swimmingUp = false;

          if (this.isGrounded && Math.abs(this.vx) > 0) {
            let nextCheckX = this.vx > 0 ? this.x + this.width + 2 : this.x - 2;
            let kneeHeightY = this.y + this.height - 10;

            if (this.grid.isTileSolidAt(nextCheckX, kneeHeightY)) {
              if (this.jumpCooldownTimer === 0) {
                this.vy = this.jumpForce;
                this.isGrounded = false;
                this.jumpCooldownTimer = 120;
              }
            }
          }
        }
      }
    }

    if (!this.isInWater || this.type === "skeleton") {
      this.vy += this.gravity;
    }
  }

  render() {
    this.DOMElement.style.left = `${this.x}px`;
    this.DOMElement.style.top = `${this.y}px`;

    if (this.facing === "left") {
      this.DOMElement.style.transform = "scaleX(1)";
    } else {
      this.DOMElement.style.transform = "scaleX(-1)";
    }

    if (Math.abs(this.vx) > 0.05 && this.isGrounded) {
      this.DOMElement.classList.add("walking");
    } else {
      this.DOMElement.classList.remove("walking");
    }
  }
}
