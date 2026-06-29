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

  // Sword swing — checks in front of player against enemies OR boss
  executePlayerAttack() {
    const engine = this.engine;
    engine.audio.play("swing");
    const attackRange = 40;
    const attackBox = {
      x:
        engine.player.facing === "right"
          ? engine.player.x + engine.player.width
          : engine.player.x - attackRange,
      y: engine.player.y + (engine.player.height - attackRange) / 2,
      width: attackRange,
      height: attackRange,
    };

    // Boss fight — hit the boss
    if (engine.bossFight && engine.boss) {
      if (engine.physics.checkCollision(attackBox, engine.boss)) {
        engine.boss.takeDamage(2);
        engine.boss.applyKnockback(engine.player.facing === "right" ? 1 : -1);
      }
      return;
    }

    // Hit skull minions (phase 2)
    engine.skullMinions?.forEach((skull) => {
      if (engine.physics.checkCollision(attackBox, skull)) {
        skull.takeDamage(2);
      }
    });

    // Normal enemies
    for (let i = engine.enemies.length - 1; i >= 0; i--) {
      const enemy = engine.enemies[i];
      if (engine.physics.checkCollision(attackBox, enemy)) {
        enemy.health -= 2;
        if (enemy.health > 0) {
          enemy.applyKnockback(engine.player.facing === "right" ? 1 : -1);
        } else {
          if (enemy._groanTimer) clearTimeout(enemy._groanTimer);
          enemy.DOMElement.remove();
          engine.enemies.splice(i, 1);
          engine.portal?.onEnemyKilled(); // notify portal system
        }
      }
    }
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

    // Knock the player away from the attacker
    const knockDir =
      engine.player.x + engine.player.width / 2 < enemy.x + enemy.width / 2
        ? -1
        : 1;
    engine.player.applyKnockback(knockDir);

    // Invincibility window so one hit doesn't chain into another
    engine.isInvincible = true;
    engine.player.DOMElement.classList.add("damaged");
    setTimeout(() => {
      engine.isInvincible = false;
      engine.player.DOMElement.classList.remove("damaged");
    }, engine.invincibilityDuration);
  }
}
