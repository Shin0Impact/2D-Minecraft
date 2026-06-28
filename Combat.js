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

  // Sword swing — checks a rectangle in front of the player against every enemy
  executePlayerAttack() {
    const engine = this.engine;
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

    for (let i = engine.enemies.length - 1; i >= 0; i--) {
      const enemy = engine.enemies[i];
      if (engine.physics.checkCollision(attackBox, enemy)) {
        enemy.health -= 2; // sword hits hard
        if (enemy.health > 0) {
          enemy.applyKnockback(engine.player.facing === "right" ? 1 : -1);
        } else {
          enemy.DOMElement.remove();
          engine.enemies.splice(i, 1);
        }
      }
    }
  }

  // Called when an enemy touches or shoots the player
  takeDamage(enemy) {
    const engine = this.engine;
    if (engine.isInvincible) return;

    engine.playerHealth--;
    this.renderHearts();

    if (engine.playerHealth <= 0) {
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
