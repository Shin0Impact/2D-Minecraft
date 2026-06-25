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

  resolvePhysics(entity) {
    const world = this.engine.world;
    const tileSize = world.tileSize;

    entity.x += entity.vx;

    let checkYPoints = [
      entity.y,
      entity.y + entity.height / 2,
      entity.y + entity.height - 1,
    ];

    if (entity.vx > 0) {
      let rightX = entity.x + entity.width;
      if (checkYPoints.some((y) => world.isTileSolidAt(rightX, y))) {
        entity.x = Math.floor(rightX / tileSize) * tileSize - entity.width;
        entity.vx = 0;
      }
    } else if (entity.vx < 0) {
      let leftX = entity.x;
      if (checkYPoints.some((y) => world.isTileSolidAt(leftX, y))) {
        entity.x = (Math.floor(leftX / tileSize) + 1) * tileSize;
        entity.vx = 0;
      }
    }

    let previousY = entity.y;
    entity.y += entity.vy;
    entity.isGrounded = false;

    let checkXPoints = [
      entity.x + 4,
      entity.x + entity.width / 2,
      entity.x + entity.width - 4,
    ];

    if (entity.vy > 0) {
      let feetY = entity.y + entity.height;
      let hitSolidGround = false;

      for (let x of checkXPoints) {
        if (world.isTileSolidAt(x, feetY, true)) {
          let isLeaf = world.getTileTypeAt?.(x, feetY) === "leaves";
          if (isLeaf) {
            if (
              previousY + entity.height <=
              Math.floor(feetY / tileSize) * tileSize
            ) {
              hitSolidGround = true;
              break;
            }
          } else {
            hitSolidGround = true;
            break;
          }
        }
      }

      if (hitSolidGround) {
        entity.y = Math.floor(feetY / tileSize) * tileSize - entity.height;
        entity.vy = 0;
        entity.isGrounded = true;
      }
    } else if (entity.vy < 0) {
      let headY = entity.y;
      if (checkXPoints.some((x) => world.isTileSolidAt(x, headY))) {
        entity.y = (Math.floor(headY / tileSize) + 1) * tileSize;
        entity.vy = 0;
      }
    }
  }
}
