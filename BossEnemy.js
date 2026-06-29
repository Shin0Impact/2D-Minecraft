// BossEnemy.js — Zombie Lord boss with Hollow Knight-style attack windows
//
// State machine: WALKING → TELEGRAPHING → ATTACKING → RECOVERING → WALKING
//
// Design philosophy:
// - Bullets are readable with clear gaps — avoidable with skill
// - RECOVERING state is a glowing open window — sword does 3x damage here
// - Boss walks close before telegraphing — forces the player to engage at melee range
// - Arrow spam from distance is punished: boss fires aimed shots while walking toward you

class BossEnemy {
  constructor(engine) {
    this.engine = engine;
    this.x = 2400; // starts far right of the arena
    this.y = 0; // snapped to floor by physics on first tick
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

    // State machine
    this.state = "WALKING";
    this.stateTimer = 0;

    // Per-phase tuning
    // telegraphFrames: how long the warning shake lasts before firing
    // recoverFrames: how long the open window lasts — longer = more reward for staying close
    // triggerDist: how close boss gets before stopping to attack
    this.phaseConfig = {
      1: {
        walkSpeed: 1.2,
        telegraphFrames: 80,
        recoverFrames: 100,
        triggerDist: 160,
        patterns: ["ground-sweep", "aimed-pair"],
      },
      2: {
        walkSpeed: 1.8,
        telegraphFrames: 60,
        recoverFrames: 75,
        triggerDist: 180,
        patterns: ["aimed-triple", "ground-sweep", "aimed-pair"],
      },
      3: {
        walkSpeed: 2.4,
        telegraphFrames: 45,
        recoverFrames: 55,
        triggerDist: 200,
        patterns: ["aimed-triple", "spiral", "ground-sweep"],
      },
    };
    this.patternStep = 0;

    // Melee contact — touching the boss hurts
    this.attackCooldown = 0;
    this.attackRate = 80;

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

  // Boss doesn't get knocked back — keeps the pacing clean
  applyKnockback() {}

  takeDamage(amount) {
    // 3x damage during recovery window — the core incentive to stay close and sword
    const actualDamage = this.state === "RECOVERING" ? amount * 3 : amount;
    this.health = Math.max(0, this.health - actualDamage);
    this._updateHealthBar();

    this.DOMElement.classList.add("boss-hit");
    setTimeout(() => this.DOMElement.classList.remove("boss-hit"), 100);

    if (this.health <= this.maxHealth * 0.66 && this.phase === 1) {
      this.phase = 2;
      this.engine.portal._showAnnouncement("💀 Phase 2 — faster and angrier!");
    }
    if (this.health <= this.maxHealth * 0.33 && this.phase === 2) {
      this.phase = 3;
      this.engine.portal._showAnnouncement(
        "💀 FINAL PHASE — stay close and slash hard!",
      );
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
    const cfg = this.phaseConfig[this.phase];
    const bossCenter = this.x + this.width / 2;
    const playerCenter = player.x + player.width / 2;
    const dist = Math.abs(bossCenter - playerCenter);

    this.stateTimer++;
    this.facing = bossCenter < playerCenter ? "right" : "left";

    // ── State machine ────────────────────────────────────────────────────────

    if (this.state === "WALKING") {
      // Walk toward player; fires aimed shots while walking in phase 2+ so distance isn't safe
      this.vx = bossCenter < playerCenter ? cfg.walkSpeed : -cfg.walkSpeed;

      // Phase 2+: shoot aimed bullets while walking — punishes cowarding with arrows
      if (this.phase >= 2 && this.stateTimer % 90 === 0) {
        this._fireAimed(player, 1);
      }

      // Close enough — stop and telegraph
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
        this._enterState("RECOVERING"); // go straight to recovery — bullets are in the air
      }
    } else if (this.state === "RECOVERING") {
      // Stunned and glowing — stand still so the player can move in and sword
      // Boss slightly drifts toward player so it doesn't get stuck at the edges
      this.vx = bossCenter < playerCenter ? 0.3 : -0.3;
      this.DOMElement.classList.add("boss-recovering");
      if (this.stateTimer >= cfg.recoverFrames) {
        this.DOMElement.classList.remove("boss-recovering");
        this._enterState("WALKING");
      }
    }

    // Gravity
    if (!this.isGrounded) this.vy += this.gravity;

    // Melee contact damage
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (dist < 80 + player.width && this.attackCooldown === 0) {
      this.engine.combat.takeDamage(this);
      this.attackCooldown = this.attackRate;
    }
  }

  _enterState(s) {
    this.state = s;
    this.stateTimer = 0;
  }

  _fireNextPattern(player) {
    const cfg = this.phaseConfig[this.phase];
    const pattern = cfg.patterns[this.patternStep % cfg.patterns.length];
    this.patternStep++;
    if (pattern === "aimed-pair") this._fireAimed(player, 2);
    else if (pattern === "aimed-triple") this._fireAimed(player, 3);
    else if (pattern === "ground-sweep") this._fireGroundSweep();
    else if (pattern === "spiral") this._fireSpiral();
  }

  // Bullets fired from the boss's chest — grounded chest level, not floating above
  _chestPos() {
    return {
      cx: this.x + this.width / 2,
      cy: this.y + this.height * 0.4, // 40% from top = chest on a grounded entity
    };
  }

  // Aimed bullets with clear gaps between them — fired in sequence so player sees each one
  _fireAimed(player, count) {
    const { cx, cy } = this._chestPos();
    const dx = player.x + player.width / 2 - cx;
    const dy = player.y + player.height / 2 - cy;
    const spd = 4.5;
    const base = Math.atan2(dy, dx);

    // Spread gives visible gaps to dash through
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
      }, i * 200); // 200ms gap between each — very readable
    });
  }

  // Low arc of bullets along the floor — jump over them
  // The clear gap above the arc is the obvious dodge
  _fireGroundSweep() {
    const { cx, cy } = this._chestPos();
    const groundCy = cy + this.height * 0.4; // fire from even lower — floor level
    const spd = 5;
    const dir = this.facing === "right" ? 1 : -1;

    // Five shallow angles — all travel mostly horizontally near the ground
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

  // Slow outward spiral — weave through the gaps, encourages constant movement
  _fireSpiral() {
    const { cx, cy } = this._chestPos();
    const count = 5; // fewer = more readable gaps
    const step = (Math.PI * 2) / count;
    const offset = (this.patternStep * 0.6) % (Math.PI * 2); // rotates each volley
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
      if (
        !document
          .getElementById("gameOverScreen")
          .classList.contains("hidden") ||
        engine.bossDefeated
      ) {
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
  }
}
