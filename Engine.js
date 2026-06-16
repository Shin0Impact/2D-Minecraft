class GameEngine {
  constructor() {
    this.world = new WorldGrid(15, 20); // 15 rows high, 20 columns wide
    this.player = null;
    this.enemies = [];
    this.keysPressed = {};
  }

  init() {
    // Generate the tile values in data memory
    this.world.generate();
    // Render the visual grid layout based on our data matrix
    this.world.render();

    // this should be changed to a dynamic spawn system later, but for now we can hardcode a single player and enemy for testing
    this.player = new Player(80, 100, this.world);
    this.enemies.push(new Enemy(400, 100, "zombie", this.world));

    // Bind event handlers jumping is currently broken
    window.addEventListener("keydown", (e) => (this.keysPressed[e.key] = true));
    window.addEventListener("keyup", (e) => (this.keysPressed[e.key] = false));

    // Fire up the continuous engine loop process
    this.tick();
  }

  tick() {
    // Update positions mathematically in memory
    this.player.update(this.keysPressed);
    this.enemies.forEach((zombie) => zombie.update(this.player));

    // Render positions out to the screen
    this.player.render();
    this.enemies.forEach((zombie) => zombie.render());

    // Keep the frame loop cycling indefinitely which is good for movement but not jump yet
    requestAnimationFrame(() => this.tick());
  }
}

// Instantiate the Engine and start the simulation!
const Minecraft2D = new GameEngine();
Minecraft2D.init();
