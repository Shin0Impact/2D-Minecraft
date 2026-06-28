// Camera.js — keeps the player centered in the viewport by translating the stage element

class CameraSystem {
  constructor(engine) {
    this.engine = engine;
    this.viewWidth = 1040;
    this.viewHeight = 780;
  }

  update() {
    const engine = this.engine;

    // Target: player center sits in the middle of the viewport
    engine.cameraX =
      engine.player.x + engine.player.width / 2 - this.viewWidth / 2;
    engine.cameraY =
      engine.player.y + engine.player.height / 2 - this.viewHeight / 2;

    // Clamp so the camera never shows outside the world boundaries
    const maxX = engine.world.cols * engine.world.tileSize - this.viewWidth;
    const maxY = engine.world.rows * engine.world.tileSize - this.viewHeight;
    engine.cameraX = Math.max(0, Math.min(engine.cameraX, maxX));
    engine.cameraY = Math.max(0, Math.min(engine.cameraY, maxY));

    // A CSS translate on the stage moves everything at once — no per-element positioning needed
    engine.stageElement.style.transform = `translate(${-engine.cameraX}px, ${-engine.cameraY}px)`;
  }
}
