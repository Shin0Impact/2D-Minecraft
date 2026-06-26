class CombatSystem {
  constructor(engine) {
    this.engine = engine;
  }

  renderHearts() {
    const engine = this.engine;
    let heartUI = document.getElementById("heartUI");
    heartUI.innerHTML = "";
    for (let i = 0; i < engine.maxHealth; i++) {
      const heart = document.createElement("span");
      heart.className = i < engine.playerHealth ? "heart full" : "heart empty";
      heartUI.appendChild(heart);
    }
  }

  executePlayerAttack() {
    const engine = this.engine;
    const attackRange = 40;
    let attackHitbox = {
      x:
        engine.player.facing === "right"
          ? engine.player.x + engine.player.width
          : engine.player.x - attackRange,
      y: engine.player.y + (engine.player.height - attackRange) / 2,
      width: attackRange,
      height: attackRange,
    };

    for (let i = engine.enemies.length - 1; i >= 0; i--) {
      let enemy = engine.enemies[i];
      if (engine.physics.checkCollision(attackHitbox, enemy)) {
        enemy.health -= 2;
        if (enemy.health > 0) {
          enemy.applyKnockback(engine.player.facing === "right" ? 1 : -1);
        } else {
          enemy.DOMElement.remove();
          engine.enemies.splice(i, 1);
        }
      }
    }
  }

  takeDamage(enemy) {
    const engine = this.engine;
    if (engine.isInvincible) return;

    engine.playerHealth--;
    this.renderHearts();

    if (engine.playerHealth <= 0) {
      document.getElementById("gameOverScreen").classList.remove("hidden");
    } else {
      engine.player.applyKnockback(
        engine.player.x + engine.player.width / 2 < enemy.x + enemy.width / 2
          ? -1
          : 1,
      );
      engine.isInvincible = true;
      engine.player.DOMElement.classList.add("damaged");
      setTimeout(() => {
        engine.isInvincible = false;
        engine.player.DOMElement.classList.remove("damaged");
      }, engine.invincibilityDuration);
    }
  }
}
