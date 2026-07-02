// Combat.js — sword attacks, taking damage, invincibility frames, heart display

class CombatSystem {
  constructor(engine) {
    this.engine = engine;
  }

  // Redraws the heart row from scratch using current playerHealth
  renderHearts() {
    const engine = this.engine;
    const heartUI = document.getElementById("heartUI");
    heartUI.innerHTML = "";
    for (let i = 0; i < engine.maxHealth; i++) {
      const heart = document.createElement("span");
      heart.className = i < engine.playerHealth ? "heart full" : "heart empty";
      heartUI.appendChild(heart);
    }
  }

  // Normal swing: 70px reach, 2 damage
  // Charged swing (hold 500ms): 180px lunge, 4 damage, knockback doubled
  executePlayerAttack(charged = false) {
    const engine = this.engine;
    const player = engine.player;
    const dir = player.facing === "right" ? 1 : -1;

    const range = charged ? 180 : 70;
    const height = charged ? 60 : 50;
    const damage = charged ? 4 : 2;

    const attackBox = {
      x: dir === 1 ? player.x + player.width : player.x - range,
      y: player.y + (player.height - height) / 2,
      width: range,
      height: height,
    };

    engine.audio.play("swing");

    if (charged) {
      // Short lunge so the player closes the gap on release
      player.vx = dir * 10;
      player.vy = -2;
    }

    // Visual slash arc on stage
    this._showSlash(attackBox, charged);

    // Boss
    if (engine.bossFight && engine.boss) {
      if (engine.physics.checkCollision(attackBox, engine.boss)) {
        engine.boss.takeDamage(damage);
        engine.boss.applyKnockback(dir);
      }
      return;
    }

    // Skull minions
    engine.skullMinions?.forEach((skull) => {
      if (engine.physics.checkCollision(attackBox, skull))
        skull.takeDamage(damage);
    });

    // Normal enemies
    for (let i = engine.enemies.length - 1; i >= 0; i--) {
      const enemy = engine.enemies[i];
      if (engine.physics.checkCollision(attackBox, enemy)) {
        enemy.health -= damage;
        if (enemy.health > 0) {
          enemy.applyKnockback(dir * (charged ? 2 : 1));
        } else {
          if (enemy._groanTimer) clearTimeout(enemy._groanTimer);
          enemy.DOMElement.remove();
          engine.enemies.splice(i, 1);
          engine.portal?.onEnemyKilled();
        }
      }
    }
  }

  // Spawns a visible slash arc in the world that fades out instantly
  _showSlash(box, charged) {
    const el = document.createElement("div");
    el.className = charged ? "slash-effect slash-charged" : "slash-effect";
    el.style.left = `${box.x}px`;
    el.style.top = `${box.y}px`;
    el.style.width = `${box.width}px`;
    el.style.height = `${box.height}px`;
    document.getElementById("stage").appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }

  // Called when an enemy touches or shoots the player
  takeDamage(enemy) {
    const engine = this.engine;
    if (engine.isInvincible) return;

    engine.playerHealth--;
    engine.audio.play("hit");
    this.renderHearts();

    if (engine.playerHealth <= 0) {
      engine.audio.play("death");
      engine.audio.pauseMusic();
      document.getElementById("gameOverScreen").classList.remove("hidden");
      return;
    }

    const knockDir =
      engine.player.x + engine.player.width / 2 < enemy.x + enemy.width / 2
        ? -1
        : 1;
    engine.player.applyKnockback(knockDir);

    engine.isInvincible = true;
    engine.player.DOMElement.classList.add("damaged");
    setTimeout(() => {
      engine.isInvincible = false;
      engine.player.DOMElement.classList.remove("damaged");
    }, engine.invincibilityDuration);
  }
}
