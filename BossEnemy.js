// BossEnemy.js — Zombie Lord with Hollow Knight-style attack windows
//
// States: WALKING → TELEGRAPHING → (fires pattern) → RECOVERING → WALKING
//         JUMPING → (lands) → STOMP_SHOCKWAVE → RECOVERING
//
// Phase 1: walk + shoot + stomp
// Phase 2: same pace but spawns a SkullMinion that fires independently
// Phase 3: faster, shorter recovery window
//
// Recovery = bright green glow = sword does 3x damage — be close for this

class SkullMinion {
  // Slow-floating skull that tracks the player and fires every few seconds
  // Spawned once on phase 2 transition, stays alive until boss dies
  constructor(engine, startX, startY) {
    this.engine = engine;
    this.x = startX;
    this.y = startY;
    this.width = 30;
    this.height = 30;
    this.health = 4;
    this.shootTimer = 0;
    this.shootRate = 150; // fires every 2.5s

    this.DOMElement = document.createElement("div");
    this.DOMElement.className = "skull-minion";
    document.getElementById("stage").appendChild(this.DOMElement);
  }

  update(player) {
    // Float slowly toward the player
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const dx = player.x + player.width / 2 - cx;
    const dy = player.y + player.height / 2 - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > 80) {
      this.x += (dx / dist) * 0.8;
      this.y += (dy / dist) * 0.8;
    }

    // Fire aimed shot at the player
    this.shootTimer++;
    if (this.shootTimer >= this.shootRate) {
      this.shootTimer = 0;
      this._fire(player);
    }
  }

  _fire(player) {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const dx = player.x + player.width / 2 - cx;
    const dy = player.y + player.height / 2 - cy;
    const dist = Math.hypot(dx, dy);
    const spd = 3.5;
    const vx = (dx / dist) * spd;
    const vy = (dy / dist) * spd;
    // Reuse the boss bullet spawner via the global engine reference
    Minecraft2D.boss?._spawnBullet(cx, cy, vx, vy, "boss-bullet skull");
  }

  takeDamage(amount) {
    this.health -= amount;
    this.DOMElement.classList.add("boss-hit");
    setTimeout(() => this.DOMElement.classList.remove("boss-hit"), 80);
    if (this.health <= 0) this.remove();
  }

  remove() {
    this.DOMElement.remove();
    const idx = this.engine.skullMinions?.indexOf(this);
    if (idx !== undefined && idx !== -1)
      this.engine.skullMinions.splice(idx, 1);
  }

  render() {
    this.DOMElement.style.left = `${this.x}px`;
    this.DOMElement.style.top = `${this.y}px`;
  }
}

class BossEnemy {
  constructor(engine) {
    this.engine = engine;
    this.x = 2400;
    this.y = 0;
    this.width = 90;
    this.height = 135;
    this.vx = 0;
    this.vy = 0;
    this.gravity = 0.5;
    this.isGrounded = false;
    this.facing = "left";

    this.maxHealth = 60;
    this.health = this.maxHealth;
    this.phase = 1;

    // States: WALKING, TELEGRAPHING, RECOVERING, JUMPING, STOMP_LAND
    this.state = "WALKING";
    this.stateTimer = 0;
    this.jumpTarget = 0; // world-x the boss is jumping toward

    this.phaseConfig = {
      1: {
        walkSpeed: 1.2,
        telegraphFrames: 80,
        recoverFrames: 100,
        triggerDist: 160,
        patterns: ["ground-sweep", "aimed-pair", "stomp", "aimed-pair"],
      },
      2: {
        walkSpeed: 1.3,
        telegraphFrames: 70,
        recoverFrames: 85,
        triggerDist: 180,
        patterns: [
          "ground-sweep",
          "aimed-pair",
          "stomp",
          "aimed-triple",
          "stomp",
        ],
      },
      3: {
        walkSpeed: 1.8,
        telegraphFrames: 45,
        recoverFrames: 55,
        triggerDist: 200,
        patterns: ["aimed-triple", "stomp", "spiral", "ground-sweep", "stomp"],
      },
    };
    this.patternStep = 0;

    this.attackCooldown = 0;
    this.attackRate = 80;

    // Skull minion spawned on phase 2 — stored on engine so Combat can hit it
    engine.skullMinions = [];

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

  applyKnockback() {} // boss ignores knockback

  takeDamage(amount) {
    const actualDamage = this.state === "RECOVERING" ? amount * 3 : amount;
    this.health = Math.max(0, this.health - actualDamage);
    this._updateHealthBar();

    this.DOMElement.classList.add("boss-hit");
    setTimeout(() => this.DOMElement.classList.remove("boss-hit"), 100);

    if (this.health <= this.maxHealth * 0.66 && this.phase === 1) {
      this.phase = 2;
      this.engine.portal._showAnnouncement("💀 Phase 2 — A skull appears!");
      this._spawnSkullMinion();
    }
    if (this.health <= this.maxHealth * 0.33 && this.phase === 2) {
      this.phase = 3;
      this.engine.portal._showAnnouncement(
        "💀 FINAL PHASE — Stay close and slash!",
      );
    }

    if (this.health <= 0) this._die();
  }

  _spawnSkullMinion() {
    const skull = new SkullMinion(
      this.engine,
      this.x + this.width + 40,
      this.y - 60,
    );
    this.engine.skullMinions.push(skull);
  }

  _die() {
    // Clear skull minions on death
    this.engine.skullMinions.forEach((s) => s.DOMElement.remove());
    this.engine.skullMinions = [];
    this.engine.audio?.play("death");
    this.DOMElement.remove();
    document.getElementById("bossHealthBar")?.remove();
    this.engine.onBossDefeated();
  }

  update(player) {
    const cfg = this.phaseConfig[this.phase];
    const bossCenter = this.x + this.width / 2;
    const playerCenter = player.x + player.width / 2;
    const dist = Math.abs(bossCenter - playerCenter);

    this.stateTimer++;
    this.facing = bossCenter < playerCenter ? "right" : "left";

    // Update skull minions
    this.engine.skullMinions.forEach((s) => s.update(player));

    if (this.state === "WALKING") {
      this.vx = bossCenter < playerCenter ? cfg.walkSpeed : -cfg.walkSpeed;

      // Phase 2+: fire while walking so distance isn't safe
      if (this.phase >= 2 && this.stateTimer % 100 === 0) {
        this._fireAimed(player, 1);
      }

      if (dist <= cfg.triggerDist) {
        this.vx = 0;
        this._enterState("TELEGRAPHING");
      }
    } else if (this.state === "TELEGRAPHING") {
      this.vx = 0;
      this.DOMElement.classList.add("boss-telegraph");
      if (this.stateTimer >= cfg.telegraphFrames) {
        this.DOMElement.classList.remove("boss-telegraph");
        this._fireNextPattern(player);
        // Stomp pattern transitions to JUMPING, everything else goes to RECOVERING
      }
    } else if (this.state === "JUMPING") {
      // Air phase of the stomp — physics moves the boss, we steer horizontally
      const tx = this.jumpTarget;
      const bx = this.x + this.width / 2;
      this.vx = bx < tx ? 6 : -6;
      // Close enough horizontally or just landed — trigger shockwave
      if (this.isGrounded) {
        this.vx = 0;
        this._fireStompShockwave();
        this._enterState("STOMP_LAND");
      }
    } else if (this.state === "STOMP_LAND") {
      // Very brief slam-down pause before recovery
      this.vx = 0;
      if (this.stateTimer >= 20) {
        this._enterState("RECOVERING");
      }
    } else if (this.state === "RECOVERING") {
      this.vx = bossCenter < playerCenter ? 0.3 : -0.3;
      this.DOMElement.classList.add("boss-recovering");
      if (this.stateTimer >= cfg.recoverFrames) {
        this.DOMElement.classList.remove("boss-recovering");
        this._enterState("WALKING");
      }
    }

    // Gravity — only when not grounded
    if (!this.isGrounded) this.vy += this.gravity;

    // Melee contact
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (dist < 80 + player.width && this.attackCooldown === 0) {
      this.engine.combat.takeDamage(this);
      this.attackCooldown = this.attackRate;
    }
  }

  _enterState(s) {
    this.state = s;
    this.stateTimer = 0;
    if (s !== "RECOVERING") {
      this.DOMElement.classList.remove("boss-recovering");
    }
  }

  _fireNextPattern(player) {
    const cfg = this.phaseConfig[this.phase];
    const pattern = cfg.patterns[this.patternStep % cfg.patterns.length];
    this.patternStep++;

    if (pattern === "stomp") {
      this._beginStomp(player);
      // JUMPING state handles the rest — don't go to RECOVERING yet
    } else {
      if (pattern === "aimed-pair") this._fireAimed(player, 2);
      else if (pattern === "aimed-triple") this._fireAimed(player, 3);
      else if (pattern === "ground-sweep") this._fireGroundSweep();
      else if (pattern === "spiral") this._fireSpiral();
      this._enterState("RECOVERING");
    }
  }

  // Boss leaps toward the player — telegraph finishes, then this launches it
  _beginStomp(player) {
    this.DOMElement.classList.add("boss-stomp-crouch");
    setTimeout(() => {
      if (this.engine.bossDefeated) return;
      this.DOMElement.classList.remove("boss-stomp-crouch");
      this.jumpTarget = player.x + player.width / 2;
      this.vy = -14; // strong upward launch
      this.isGrounded = false;
      this._enterState("JUMPING");
    }, 300); // 300ms crouch before launching
  }

  // Shockwave on landing — low bullets spread left and right along the floor
  _fireStompShockwave() {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height - 5; // ground level
    // Left burst
    [-0.1, 0, 0.1].forEach((off, i) => {
      setTimeout(() => {
        if (this.engine.bossDefeated) return;
        this._spawnBullet(cx, cy, -5 + off, -0.5, "boss-bullet stomp");
      }, i * 60);
    });
    // Right burst
    [-0.1, 0, 0.1].forEach((off, i) => {
      setTimeout(() => {
        if (this.engine.bossDefeated) return;
        this._spawnBullet(cx, cy, 5 + off, -0.5, "boss-bullet stomp");
      }, i * 60);
    });
  }

  _chestPos() {
    return {
      cx: this.x + this.width / 2,
      cy: this.y + this.height * 0.4,
    };
  }

  _fireAimed(player, count) {
    const { cx, cy } = this._chestPos();
    const dx = player.x + player.width / 2 - cx;
    const dy = player.y + player.height / 2 - cy;
    const spd = 4.5;
    const base = Math.atan2(dy, dx);
    const offsets =
      count === 3 ? [-0.22, 0, 0.22] : count === 2 ? [-0.18, 0.18] : [0];
    offsets.forEach((off, i) => {
      setTimeout(() => {
        if (this.engine.bossDefeated) return;
        const a = base + off;
        this._spawnBullet(
          cx,
          cy,
          Math.cos(a) * spd,
          Math.sin(a) * spd,
          "boss-bullet aimed",
        );
      }, i * 200);
    });
  }

  _fireGroundSweep() {
    const { cx } = this._chestPos();
    const groundCy = this.y + this.height - 10;
    const spd = 5;
    const dir = this.facing === "right" ? 1 : -1;
    [-0.25, -0.1, 0, 0.1, 0.25].forEach((off, i) => {
      setTimeout(() => {
        if (this.engine.bossDefeated) return;
        this._spawnBullet(
          cx,
          groundCy,
          Math.cos(off) * spd * dir,
          Math.sin(Math.abs(off)) * spd * 0.2,
          "boss-bullet",
        );
      }, i * 100);
    });
  }

  _fireSpiral() {
    const { cx, cy } = this._chestPos();
    const count = 5;
    const step = (Math.PI * 2) / count;
    const offset = (this.patternStep * 0.6) % (Math.PI * 2);
    for (let i = 0; i < count; i++) {
      const a = step * i + offset;
      this._spawnBullet(
        cx,
        cy,
        Math.cos(a) * 2.8,
        Math.sin(a) * 2.8,
        "boss-bullet spiral",
      );
    }
  }

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
    }, 5000);
    const loop = setInterval(() => {
      if (engine.bossDefeated || engine.playerWon) {
        clearInterval(loop);
        clearTimeout(killTimer);
        bullet.remove();
        return;
      }
      bx += vx;
      by += vy;
      bullet.style.left = `${bx}px`;
      bullet.style.top = `${by}px`;

      if (engine.world.isTileSolidAt(bx + 6, by + 6)) {
        clearInterval(loop);
        clearTimeout(killTimer);
        bullet.remove();
        return;
      }
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
    this.engine.skullMinions.forEach((s) => s.render());
  }
}
