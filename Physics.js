class PhysicsSystem {
  constructor(engine) {
    this.engine = engine;
  }

  checkCollision(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }

  // Returns true if the entity's centre is inside a water tile
  _isEntityInWater(entity) {
    const world = this.engine.world;
    const cx = entity.x + entity.width / 2;
    const cy = entity.y + entity.height / 2;
    return world.getTileTypeAt(cx, cy) === "water";
  }

  resolvePhysics(entity) {
    const world = this.engine.world;
    const theme = this.engine.currentTheme;
    const tileSize = world.tileSize;
    const isPlayer = entity === this.engine.player;

    // ─── OUT OF BOUNDS VOID KILL ZONE ─────────────────────────────────────────
    const mapBottomPixelHeight = world.rows * world.tileSize;
    if (entity.y > mapBottomPixelHeight + 100) {
      if (isPlayer) {
        // Instantly kill player and bring up Game Over overlay
        this.engine.playerHealth = 0;
        this.engine.combat.renderHearts();
        document.getElementById("gameOverScreen").classList.remove("hidden");
        entity.vx = 0;
        entity.vy = 0;
        return;
      } else {
        // Remove entities/enemies gracefully if they fall out of bounds
        if (entity.DOMElement) entity.DOMElement.remove();
        const idx = this.engine.enemies.indexOf(entity);
        if (idx !== -1) this.engine.enemies.splice(idx, 1);
        return;
      }
    }

    // ── Water state detection ───────────────────────────────────────────────
    const inWater = this._isEntityInWater(entity);

    // FIX: Apply water state flags to ALL entities, not just the player
    entity.isInWater = inWater;

    if (entity.DOMElement) {
      if (inWater && theme === "forest") {
        entity.DOMElement.classList.add("submerged");
      } else {
        entity.DOMElement.classList.remove("submerged");
      }
    }

    // Snow theme: water is frozen — treat as solid, set frozen flag
    if (inWater && theme === "snow") {
      if (isPlayer) entity.isFrozen = true;
      entity.vx = 0;
      entity.vy = 0;
      return; // don't move at all while frozen solid
    } else {
      if (isPlayer) entity.isFrozen = false;
    }

    // Forest theme: swimming math now processed globally for player & enemies
    if (inWater && theme === "forest") {
      if (entity.swimmingUp) {
        // Holding space / swimming intent — strong upward pull, no gravity this frame
        entity.vy = -4.5;
      } else {
        // Not holding space — gentle sink with heavy drag
        entity.vy += entity.gravity * 0.15;
        entity.vy = Math.min(entity.vy, 1.2);
      }
      entity.vx *= 0.82; // water drag on horizontal
    }

    // ── Horizontal movement ─────────────────────────────────────────────────
    entity.x += entity.vx;

    const checkYPoints = [
      entity.y,
      entity.y + entity.height / 2,
      entity.y + entity.height - 1,
    ];

    if (entity.vx > 0) {
      const rightX = entity.x + entity.width;
      if (
        checkYPoints.some((y) => world.isTileSolidAt(rightX, y, false, theme))
      ) {
        entity.x = Math.floor(rightX / tileSize) * tileSize - entity.width;
        entity.vx = 0;
      }
    } else if (entity.vx < 0) {
      const leftX = entity.x;
      if (
        checkYPoints.some((y) => world.isTileSolidAt(leftX, y, false, theme))
      ) {
        entity.x = (Math.floor(leftX / tileSize) + 1) * tileSize;
        entity.vx = 0;
      }
    }

    // ── Vertical movement ───────────────────────────────────────────────────
    // FIX: Removed the duplicate 'entity.vy += entity.gravity;' command block
    // that forced double gravity accumulation onto non-player objects.

    const previousY = entity.y;
    entity.y += entity.vy;
    entity.isGrounded = false;

    const checkXPoints = [
      entity.x + 4,
      entity.x + entity.width / 2,
      entity.x + entity.width - 4,
    ];

    if (entity.vy > 0) {
      const feetY = entity.y + entity.height;
      let hitGround = false;

      for (const x of checkXPoints) {
        if (world.isTileSolidAt(x, feetY, true, theme)) {
          const isLeaf = world.getTileTypeAt(x, feetY) === "leaves";
          if (isLeaf) {
            if (
              previousY + entity.height <=
              Math.floor(feetY / tileSize) * tileSize
            ) {
              hitGround = true;
              break;
            }
          } else {
            hitGround = true;
            break;
          }
        }
      }

      if (hitGround) {
        entity.y = Math.floor(feetY / tileSize) * tileSize - entity.height;
        entity.vy = 0;
        entity.isGrounded = true;
        // If player was frozen and is now on solid ground above water, unfreeze
        if (isPlayer) entity.isFrozen = false;
      }
    } else if (entity.vy < 0) {
      const headY = entity.y;
      if (
        checkXPoints.some((x) => world.isTileSolidAt(x, headY, false, theme))
      ) {
        entity.y = (Math.floor(headY / tileSize) + 1) * tileSize;
        entity.vy = 0;
      }
    }
  }
}
