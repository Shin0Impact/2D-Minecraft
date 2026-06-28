// Enemy.js — base class for all enemy types: zombie, skeleton, goblin

class Enemy {
  constructor(startX, startY, type, gridInstance) {
    this.x = startX;
    this.y = startY;
    this.width = 30;
    this.height = 45;
    this.type = type;
    this.grid = gridInstance;
    this.facing = "left";
    this.knockbackTimer = 0;
    this.jumpCooldownTimer = 0;
    this.isGrounded = false;
    this.isInWater = false;
    this.swimmingUp = false;
    this.vx = 0;
    this.vy = 0;
    this.gravity = 0.5;
    this.jumpForce = -10;
    this.attackCooldown = 0;

    // Each type gets different stats — one constructor handles all three
    if (type === "goblin") {
      this.health = 2;
      this.baseSpeed = 0.75;
      this.sightRange = 250; // far — goblin shoots from a distance
      this.attackRange = 25;
      this.attackRate = 210; // ~3.5 s between shots at 60fps
    } else if (type === "skeleton") {
      this.health = 2;
      this.baseSpeed = 0.85;
      this.sightRange = 25;
      this.attackRange = 25;
      this.attackRate = 90;
    } else {
      // zombie defaults
      this.health = 3;
      this.baseSpeed = 0.5;
      this.sightRange = 25;
      this.attackRange = 25;
      this.attackRate = 90;
    }

    // Skeletons avoid water; zombies wade through it
    this.canSwim = type !== "skeleton";

    this.DOMElement = document.createElement("article");
    this.DOMElement.className = `enemy ${this.type}`;
    document.getElementById("enemyContainer").appendChild(this.DOMElement);

    // Each enemy type groans randomly — volume scales with distance from player
    this._startAmbientSound();
  }

  // Schedules random ambient sounds for this enemy type
  _startAmbientSound() {
    const sounds = {
      zombie: { name: "zombie_say", minMs: 8000, maxMs: 15000 },
      skeleton: { name: "skeleton_say", minMs: 6000, maxMs: 12000 },
      goblin: { name: "goblin_laugh", minMs: 10000, maxMs: 20000 },
    };
    const cfg = sounds[this.type];
    if (!cfg) return;

    const schedule = () => {
      if (typeof Minecraft2D !== "undefined") {
        Minecraft2D.audio.playAt(cfg.name, this.x, this.y);
      }
      this._groanTimer = setTimeout(
        schedule,
        cfg.minMs + Math.random() * (cfg.maxMs - cfg.minMs),
      );
    };
    // Stagger first sound so all enemies don't groan at the same time on spawn
    this._groanTimer = setTimeout(schedule, 2000 + Math.random() * cfg.minMs);
  }

  applyKnockback(directionX) {
    this.vx = directionX * 6;
    this.vy = -4;
    this.knockbackTimer = 8;
    // Play hurt sound for this enemy type, scaled by distance
    const hurtSounds = {
      zombie: "zombie_hurt",
      skeleton: "skeleton_hurt",
      goblin: "goblin_hurt",
    };
    const snd = hurtSounds[this.type];
    if (snd && typeof Minecraft2D !== "undefined") {
      Minecraft2D.audio.playAt(snd, this.x, this.y);
    }
  }

  // Goblin delegates to ProjectileSystem — witch laugh on fire, arrow sound on release
  _fireArrow(playerTarget) {
    if (typeof Minecraft2D !== "undefined" && Minecraft2D.projectile) {
      Minecraft2D.audio.playAt("goblin_laugh", this.x, this.y);
      Minecraft2D.audio.play("arrow");
      Minecraft2D.projectile.fireEnemyArrow(this, playerTarget);
    }
  }

  // Returns true if the tile directly ahead at foot level is water
  _waterAhead() {
    const nextX = this.vx > 0 ? this.x + this.width + 2 : this.x - 2;
    const footY = this.y + this.height - 4;
    return this.grid.getTileTypeAt(nextX, footY) === "water";
  }

  update(playerTarget) {
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.jumpCooldownTimer > 0) this.jumpCooldownTimer--;

    if (this.knockbackTimer > 0) {
      this.knockbackTimer--;
      this.vx *= 0.9;
    } else {
      const ec = this.x + this.width / 2;
      const pc = playerTarget.x + playerTarget.width / 2;
      const hDist = Math.abs(ec - pc);
      const vDist = Math.abs(this.y - playerTarget.y);

      const inRange =
        hDist <= this.sightRange &&
        vDist < (this.type === "goblin" ? 200 : this.height);

      if (inRange) {
        // Stop and face the player; goblin fires an arrow
        this.vx = 0;
        this.facing = ec < pc ? "right" : "left";
        this.swimmingUp = false;
        if (this.type === "goblin" && this.attackCooldown === 0) {
          this._fireArrow(playerTarget);
          this.attackCooldown = this.attackRate;
        }
      } else {
        // Chase the player
        const dir = this.x < playerTarget.x ? 1 : -1;
        let speed = this.isInWater ? this.baseSpeed * 0.5 : this.baseSpeed;
        this.vx = dir * speed;
        this.facing = dir > 0 ? "right" : "left";

        // Skeleton turns back if water is in the way
        if (!this.canSwim && this._waterAhead()) {
          this.vx = 0;
        }

        if (this.isInWater && this.canSwim) {
          // Always swim upward while in water — Physics stops the force once chest clears surface
          this.swimmingUp = true;
        } else {
          this.swimmingUp = false;
          // Jump over solid obstacles — with a cooldown to avoid spam jumping
          if (this.isGrounded && Math.abs(this.vx) > 0) {
            const nextX = this.vx > 0 ? this.x + this.width + 2 : this.x - 2;
            const kneeY = this.y + this.height - 10;
            if (
              this.grid.isTileSolidAt(nextX, kneeY) &&
              this.jumpCooldownTimer === 0
            ) {
              this.vy = this.jumpForce;
              this.isGrounded = false;
              this.jumpCooldownTimer = 120;
            }
          }
        }
      }
    }

    // Skeleton always falls; swimming enemies have gravity suppressed while in water
    // This matches the original working logic exactly
    if (!this.isInWater || !this.canSwim) {
      this.vy += this.gravity;
    }
  }

  render() {
    this.DOMElement.style.left = `${this.x}px`;
    this.DOMElement.style.top = `${this.y}px`;
    // Flip sprite to face direction of travel
    this.DOMElement.style.transform =
      this.facing === "left" ? "scaleX(1)" : "scaleX(-1)";
    // Walking GIF swaps in via CSS when this class is present
    if (Math.abs(this.vx) > 0.05 && this.isGrounded) {
      this.DOMElement.classList.add("walking");
    } else {
      this.DOMElement.classList.remove("walking");
    }
  }
}
