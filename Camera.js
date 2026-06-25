class CameraSystem {
  constructor(engine) {
    this.engine = engine;
    this.viewWidth = 1040;
    this.viewHeight = 780;
  }

  update() {
    const engine = this.engine;

    engine.cameraX =
      engine.player.x + engine.player.width / 2 - this.viewWidth / 2;
    engine.cameraY =
      engine.player.y + engine.player.height / 2 - this.viewHeight / 2;

    const maxCameraX =
      engine.world.cols * engine.world.tileSize - this.viewWidth;
    const maxCameraY =
      engine.world.rows * engine.world.tileSize - this.viewHeight;

    engine.cameraX = Math.max(0, Math.min(engine.cameraX, maxCameraX));
    engine.cameraY = Math.max(0, Math.min(engine.cameraY, maxCameraY));

    engine.stageElement.style.transform = `translate(${-engine.cameraX}px, ${-engine.cameraY}px)`;
  }
}
