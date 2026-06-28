// BossEnemy.js — the giant zombie boss with bullet-hell projectile patterns

class BossEnemy {
  constructor(engine) {
    this.engine = engine;
    this.x = 1200; // placed well to the right of player spawn in the flat arena
    this.y = 200;
    this.width = 90; // 3x normal zombie size
    this.height = 135;
    this.vx = 0;
    this.vy = 0;
    this.gravity = 0.3;
    this.isGrounded = false;
    this.facing = "left";

    this.maxHealth = 80;
    this.health = this.maxHealth;
    this.phase = 1; // phases 1-3, gets harder as health drops

    // Bullet hell state
    this.shootTimer = 0;
    this.shootRate = 90; // frames between volleys
    this.patternStep = 0; // cycles through attack patterns

    // Melee
    this.attackRange = 80;
    this.attackCooldown = 0;
    this.attackRate = 60;

    // Slow walk toward the player
    this.baseSpeed = 0.6;

    this.DOMElement = document.createElement("article");
    this.DOMElement.id = "bossSprite";
    this.DOMElement.className = "boss-enemy";
    document.getElementById("enemyContainer").appendChild(this.DOMElement);

    this._buildHealthBar();
  }

  _buildHealthBar() {
    const bar = document.createElement("div");
    bar.id = "bossHealthBar";
    bar.innerHTML = `
      <div class="boss-name">💀 ZOMBIE LORD</div>
      <div class="boss-bar-track">
        <div class="boss-bar-fill" id="bossBarFill"></div>
      </div>`;
    document.getElementById("gameWindow").appendChild(bar);
  }

  _updateHealthBar() {
    const fill = document.getElementById("bossBarFill");
    if (fill) fill.style.width = `${(this.health / this.maxHealth) * 100}%`;
  }

  applyKnockback(dx) {
    // Boss barely flinches — tiny knockback only
    this.vx = dx * 1.5;
    this.vy = -1;
  }

  takeDamage(amount) {
    this.health -= amount;
    this._updateHealthBar();

    // Flash red
    this.DOMElement.classList.add("boss-hit");
    setTimeout(() => this.DOMElement.classList.remove("boss-hit"), 120);

    // Phase transitions
    if (this.health <= this.maxHealth * 0.66 && this.phase === 1) {
      this.phase = 2;
      this.shootRate = 60; // faster
      this.baseSpeed = 1.0;
      this.engine.portal._showAnnouncement("💀 Phase 2! It's getting angry!");
    }
    if (this.health <= this.maxHealth * 0.33 && this.phase === 2) {
      this.phase = 3;
      this.shootRate = 40; // much faster
      this.baseSpeed = 1.5;
      this.engine.portal._showAnnouncement("💀 FINAL PHASE! Dodge everything!");
    }

    if (this.health <= 0) this._die();
  }

  _die() {
    this.engine.audio?.play("death");
    this.DOMElement.remove();
    document.getElementById("bossHealthBar")?.remove();
    this.engine.onBossDefeated();
  }

  update(player) {
    // Walk slowly toward the player
    const bossCenter = this.x + this.width / 2;
    const playerCenter = player.x + player.width / 2;
    const dist = Math.abs(bossCenter - playerCenter);

    if (dist > this.attackRange + 20) {
      this.vx = bossCenter < playerCenter ? this.baseSpeed : -this.baseSpeed;
      this.facing = bossCenter < playerCenter ? "right" : "left";
    } else {
      this.vx = 0;
    }

    // Gravity
    if (!this.isGrounded) this.vy += this.gravity;

    // Melee
    if (this.attackCooldown > 0) this.attackCooldown--;
    const overlap = dist < this.attackRange + player.width;
    if (overlap && this.attackCooldown === 0) {
      this.engine.combat.takeDamage(this);
      this.attackCooldown = this.attackRate;
    }

    // Bullet hell shooting
    this.shootTimer++;
    if (this.shootTimer >= this.shootRate) {
      this.shootTimer = 0;
      this._firePattern(player);
    }
  }

  _firePattern(player) {
    const patterns = [
      () => this._fireSpread(8, 360), // ring burst
      () => this._fireAimed(player, 3), // triple aimed shot
      () => this._fireSpread(4, 180), // front fan
      () => this._fireSpiral(12), // spiral
    ];
    const phasePatterns = {
      1: [0, 2], // ring and fan
      2: [0, 1, 2], // add aimed shots
      3: [0, 1, 2, 3], // all patterns including spiral
    };
    const available = phasePatterns[this.phase];
    const choice = available[this.patternStep % available.length];
    patterns[choice]();
    this.patternStep++;
  }

  // Fires count bullets evenly spread across spreadDeg degrees
  _fireSpread(count, spreadDeg) {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 3;
    const startRad = (-spreadDeg / 2) * (Math.PI / 180);
    const stepRad = (spreadDeg / (count - 1 || 1)) * (Math.PI / 180);
    for (let i = 0; i < count; i++) {
      const angle = startRad + stepRad * i - Math.PI / 2;
      this._spawnBullet(
        cx,
        cy,
        Math.cos(angle) * 4,
        Math.sin(angle) * 4,
        "boss-bullet",
      );
    }
  }

  // Fires count bullets aimed directly at the player with slight angle spread
  _fireAimed(player, count) {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 3;
    const dx = player.x + player.width / 2 - cx;
    const dy = player.y + player.height / 2 - cy;
    const base = Math.atan2(dy, dx);
    const offsets = count === 3 ? [-0.2, 0, 0.2] : [0];
    offsets.forEach((off) => {
      const a = base + off;
      this._spawnBullet(
        cx,
        cy,
        Math.cos(a) * 5,
        Math.sin(a) * 5,
        "boss-bullet aimed",
      );
    });
  }

  // Fires bullets in a rotating spiral pattern
  _fireSpiral(count) {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 3;
    const step = (Math.PI * 2) / count;
    const offset = (this.patternStep * 0.3) % (Math.PI * 2); // rotates each volley
    for (let i = 0; i < count; i++) {
      const a = step * i + offset;
      this._spawnBullet(
        cx,
        cy,
        Math.cos(a) * 3.5,
        Math.sin(a) * 3.5,
        "boss-bullet spiral",
      );
    }
  }

  // Creates a bullet DOM element and runs its movement loop
  _spawnBullet(startX, startY, vx, vy, cssClass) {
    const engine = this.engine;
    const bullet = document.createElement("div");
    bullet.className = cssClass;
    document.getElementById("stage").appendChild(bullet);

    let bx = startX,
      by = startY;
    bullet.style.left = `${bx}px`;
    bullet.style.top = `${by}px`;

    const killTimer = setTimeout(() => {
      clearInterval(loop);
      bullet.remove();
    }, 4000);

    const loop = setInterval(() => {
      const screensUp = !document
        .getElementById("gameOverScreen")
        .classList.contains("hidden");
      if (screensUp || engine.bossDefeated) {
        clearInterval(loop);
        clearTimeout(killTimer);
        bullet.remove();
        return;
      }

      bx += vx;
      by += vy;
      bullet.style.left = `${bx}px`;
      bullet.style.top = `${by}px`;

      // Hit solid tile
      if (engine.world.isTileSolidAt(bx + 6, by + 6)) {
        clearInterval(loop);
        clearTimeout(killTimer);
        bullet.remove();
        return;
      }

      // Hit player
      const pb = engine.player;
      const hit =
        bx < pb.x + pb.width &&
        bx + 12 > pb.x &&
        by < pb.y + pb.height &&
        by + 12 > pb.y;
      if (hit) {
        clearInterval(loop);
        clearTimeout(killTimer);
        bullet.remove();
        engine.combat.takeDamage(this);
      }
    }, 1000 / 60);
  }

  render() {
    this.DOMElement.style.left = `${this.x}px`;
    this.DOMElement.style.top = `${this.y}px`;
    this.DOMElement.style.transform =
      this.facing === "left" ? "scaleX(1)" : "scaleX(-1)";
  }
}
