// Physics.js — moves entities, resolves collisions, handles water behaviour per theme

class PhysicsSystem {
  constructor(engine) {
    this.engine = engine;
  }

  // Simple AABB overlap test — used by combat and projectiles too
  checkCollision(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  // Centre check — used to set isInWater flag and enable swimming controls
  _inWater(entity) {
    const world = this.engine.world;
    const cx = entity.x + entity.width / 2;
    const cy = entity.y + entity.height / 2;
    return world.getTileTypeAt(cx, cy) === "water";
  }

  // Chest-level check — swim force only applies when meaningfully submerged
  // This stops the bobbing loop: entity exits water but swim force no longer fires
  _isSubmerged(entity) {
    const world = this.engine.world;
    const cx = entity.x + entity.width / 2;
    const cy = entity.y + entity.height * 0.3;
    return world.getTileTypeAt(cx, cy) === "water";
  }

  resolvePhysics(entity) {
    const engine = this.engine;
    const world = engine.world;
    const theme = engine.currentTheme;
    const tileSize = world.tileSize;
    const isPlayer = entity === engine.player;

    // Kill zone — anything that falls below the map is removed / kills the player
    if (entity.y > world.rows * tileSize + 100) {
      if (isPlayer) {
        engine.playerHealth = 0;
        engine.combat.renderHearts();
        document.getElementById("gameOverScreen").classList.remove("hidden");
        entity.vx = entity.vy = 0;
      } else {
        entity.DOMElement?.remove();
        const idx = engine.enemies.indexOf(entity);
        if (idx !== -1) engine.enemies.splice(idx, 1);
      }
      return;
    }

    const inWater = this._inWater(entity);
    entity.isInWater = inWater;

    // Apply the submerged CSS tint to enemies (player handles its own in render)
    if (!isPlayer && entity.DOMElement) {
      entity.DOMElement.classList.toggle(
        "submerged",
        inWater && theme === "forest",
      );
    }

    // Snow world: water is ice — player locks in place, others treat it as solid
    if (inWater && theme === "snow") {
      if (isPlayer) entity.isFrozen = true;
      entity.vx = entity.vy = 0;
      return;
    }
    if (isPlayer) entity.isFrozen = false;

    // Forest water: swim force only fires when chest is underwater, not just feet
    // This prevents the bob loop where entity exits then immediately re-triggers swim
    if (inWater && theme === "forest") {
      const submerged = this._isSubmerged(entity);
      if (submerged && entity.swimmingUp) {
        entity.vy = -5.5; // strong upward — carries entity fully clear of the surface
      } else if (inWater) {
        entity.vy += entity.gravity * 0.15; // gentle sink when not swimming
        entity.vy = Math.min(entity.vy, 1.2);
      }
      entity.vx *= 0.82;
    }

    // ── Horizontal ──────────────────────────────────────────────────────────
    entity.x += entity.vx;

    const checkY = [
      entity.y,
      entity.y + entity.height / 2,
      entity.y + entity.height - 1,
    ];

    if (entity.vx > 0) {
      const rx = entity.x + entity.width;
      if (checkY.some((y) => world.isTileSolidAt(rx, y, false, theme))) {
        entity.x = Math.floor(rx / tileSize) * tileSize - entity.width;
        entity.vx = 0;
      }
    } else if (entity.vx < 0) {
      const lx = entity.x;
      if (checkY.some((y) => world.isTileSolidAt(lx, y, false, theme))) {
        entity.x = (Math.floor(lx / tileSize) + 1) * tileSize;
        entity.vx = 0;
      }
    }

    // ── Vertical ────────────────────────────────────────────────────────────
    // Enemy gravity is handled entirely in Enemy.update() — don't add it here too.
    // Player gravity is handled in Player.update(). Physics only moves entities.

    const prevY = entity.y;
    entity.y += entity.vy;
    entity.isGrounded = false;

    const checkX = [
      entity.x + 4,
      entity.x + entity.width / 2,
      entity.x + entity.width - 4,
    ];

    if (entity.vy > 0) {
      const fy = entity.y + entity.height;
      let landed = false;

      for (const x of checkX) {
        if (world.isTileSolidAt(x, fy, true, theme)) {
          // Leaves: only land on them if falling onto the top, not passing through
          if (world.getTileTypeAt(x, fy) === "leaves") {
            if (prevY + entity.height > Math.floor(fy / tileSize) * tileSize)
              continue;
          }
          landed = true;
          break;
        }
      }

      if (landed) {
        entity.y =
          Math.floor((entity.y + entity.height) / tileSize) * tileSize -
          entity.height;
        entity.vy = 0;
        entity.isGrounded = true;
        if (isPlayer) entity.isFrozen = false;
      }
    } else if (entity.vy < 0) {
      const hy = entity.y;
      if (checkX.some((x) => world.isTileSolidAt(x, hy, false, theme))) {
        entity.y = (Math.floor(hy / tileSize) + 1) * tileSize;
        entity.vy = 0;
      }
    }
  }
}
