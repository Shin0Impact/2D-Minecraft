// Projectile.js — arrow firing for both the player (bow) and goblin enemies

class ProjectileSystem {
  constructor(engine) {
    this.engine = engine;
  }

  // Player fires an arrow toward wherever they clicked (worldX/Y)
  firePlayerArrow(worldX, worldY) {
    const engine = this.engine;
    const arrow = document.createElement("div");
    arrow.className = "player-arrow-projectile";

    // Spawn at the player's chest
    let ax = engine.player.x + engine.player.width / 2;
    let ay = engine.player.y + engine.player.height / 3;
    arrow.style.left = `${ax}px`;
    arrow.style.top = `${ay}px`;
    engine.stageElement.appendChild(arrow);

    // Normalise direction vector then scale to arrow speed
    const dx = worldX - ax;
    const dy = worldY - ay;
    const dist = Math.hypot(dx, dy);
    const spd = 8;
    const avx = (dx / dist) * spd;
    const avy = (dy / dist) * spd;

    arrow.style.transform = `rotate(${Math.atan2(dy, dx) * (180 / Math.PI)}deg)`;
    engine.audio.play("arrow");
    this._runArrowLoop(arrow, ax, ay, avx, avy, null);
  }

  // Goblin fires an arrow toward the player — called from Enemy.fireArrow()
  fireEnemyArrow(goblin, playerTarget) {
    const engine = this.engine;
    const arrow = document.createElement("div");
    arrow.className = "arrow-projectile";

    let ax = goblin.x + goblin.width / 2;
    let ay = goblin.y + goblin.height / 3;
    arrow.style.left = `${ax}px`;
    arrow.style.top = `${ay}px`;
    document.getElementById("stage").appendChild(arrow);

    const dx = playerTarget.x + playerTarget.width / 2 - ax;
    const dy = playerTarget.y + playerTarget.height / 2 - ay;
    const dist = Math.hypot(dx, dy);
    const spd = 5;
    const avx = (dx / dist) * spd;
    const avy = (dy / dist) * spd;

    arrow.style.transform = `rotate(${Math.atan2(dy, dx) * (180 / Math.PI)}deg)`;
    // pass goblin as the attacker so takeDamage knows who hit the player
    this._runArrowLoop(arrow, ax, ay, avx, avy, goblin);
  }

  // Moves an arrow every frame, checks tile and player collision, then cleans up
  _runArrowLoop(arrow, startX, startY, avx, avy, attacker) {
    const engine = this.engine;
    const world = engine.world;
    const player = engine.player;
    let ax = startX;
    let ay = startY;
    let frame = 0; // skip collision for first 6 frames so arrow clears the shooter

    // Safety timeout — remove arrows that fly off into space after 4 s
    const killTimer = setTimeout(() => {
      clearInterval(loop);
      if (arrow.parentNode) arrow.remove();
    }, 4000);

    const loop = setInterval(() => {
      const screensUp =
        !document.getElementById("landingPage").classList.contains("hidden") ||
        !document.getElementById("gameOverScreen").classList.contains("hidden");
      if (screensUp) return;

      frame++;

      // Advance arrow position
      ax += avx;
      ay += avy;
      arrow.style.left = `${ax}px`;
      arrow.style.top = `${ay}px`;

      if (frame < 6) return; // let arrow travel away from shooter before checking hits

      // Only check the very tip of the arrow in the direction of travel
      // Checking the centre or origin caused false hits on the tile the arrow spawned in
      const tipX = avx >= 0 ? ax + 15 : ax - 1;
      const tipY = avy >= 0 ? ay + 6 : ay - 1;

      if (world.isTileSolidAt(tipX, tipY, false, engine.currentTheme)) {
        clearInterval(loop);
        clearTimeout(killTimer);
        arrow.remove();
        return;
      }

      // Hit the player — deal damage if this is an enemy arrow
      const arrowBox = { x: ax, y: ay, width: 8, height: 8 };
      const playerBox = {
        x: player.x,
        y: player.y,
        width: player.width,
        height: player.height,
      };

      if (engine.physics.checkCollision(arrowBox, playerBox)) {
        clearInterval(loop);
        clearTimeout(killTimer);
        arrow.remove();
        // Only enemy arrows damage the player; player arrows hitting the player are ignored
        if (attacker) engine.combat.takeDamage(attacker);
        return;
      }

      // Player arrow hitting an enemy
      if (!attacker) {
        // Hit the boss if in boss fight
        if (engine.bossFight && engine.boss) {
          if (engine.physics.checkCollision(arrowBox, engine.boss)) {
            clearInterval(loop);
            clearTimeout(killTimer);
            arrow.remove();
            engine.boss.takeDamage(1);
            return;
          }
        }
        // Hit a normal enemy
        for (let i = engine.enemies.length - 1; i >= 0; i--) {
          const enemy = engine.enemies[i];
          if (engine.physics.checkCollision(arrowBox, enemy)) {
            clearInterval(loop);
            clearTimeout(killTimer);
            arrow.remove();
            enemy.health--;
            if (enemy.health <= 0) {
              if (enemy._groanTimer) clearTimeout(enemy._groanTimer);
              enemy.DOMElement.remove();
              engine.enemies.splice(i, 1);
              engine.portal?.onEnemyKilled();
            } else {
              enemy.applyKnockback(avx > 0 ? 1 : -1);
            }
            return;
          }
        }
      }
    }, 1000 / 60);
  }
}
