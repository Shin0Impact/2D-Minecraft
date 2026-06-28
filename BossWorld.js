// BossWorld.js — generates the flat superflat arena used during the boss fight

class BossWorld {
  // Returns a flat 60x80 world matrix — stone floor, air above, bedrock bottom
  static generate(world) {
    const floorRow = world.rows - 4;

    for (let r = 0; r < world.rows; r++) {
      for (let c = 0; c < world.cols; c++) {
        if (r === world.rows - 1) world.matrix[r][c] = "bedrock";
        else if (r >= floorRow) world.matrix[r][c] = "stone";
        else world.matrix[r][c] = "air";
      }
    }

    // Surface layer is grass
    for (let c = 0; c < world.cols; c++) {
      world.matrix[floorRow][c] = "grass";
    }
  }
}
