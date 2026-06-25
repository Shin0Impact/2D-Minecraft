class WorldGrid {
  constructor(rows = 45, cols = 45, tileSize = 45) {
    this.rows = rows;
    this.cols = cols;
    this.tileSize = tileSize; // Updated to 45px so the 45px high player fits perfectly
    this.matrix = [];
    this.DOMElement = document.getElementById("worldGrid");
  }

  // Generates an expanded hard-coded layout configuration with diverse ore veins and pools
  generate() {
    this.matrix = [];

    // Initialize the base empty sky matrix
    for (let r = 0; r < this.rows; r++) {
      this.matrix.push(new Array(this.cols).fill("air"));
    }

    // Define a flat ground level baseline (giving more headroom above, and deeper caves below)
    const floorRow = 16;

    // Fill the standard subterranean ground layers across the expanded horizon
    for (let c = 0; c < this.cols; c++) {
      this.matrix[floorRow][c] = "grass";

      for (let r = floorRow + 1; r < this.rows; r++) {
        // Dirt fills the immediate layers underneath grass, deeper rows turn to stone
        this.matrix[r][c] = r < floorRow + 4 ? "dirt" : "stone";
      }
    }

    // Inject custom environmental structures, deep ore veins, and water pockets
    const structures = {
      stoneObstacles: [
        { row: floorRow - 1, col: 7, type: "stone" },
        { row: floorRow - 1, col: 8, type: "stone" },
        { row: floorRow - 2, col: 8, type: "stone" },
        { row: floorRow - 1, col: 9, type: "stone" },
      ],
      treeTrunk: [
        { row: floorRow - 1, col: 13, type: "wood" },
        { row: floorRow - 2, col: 13, type: "wood" },
        { row: floorRow - 3, col: 13, type: "wood" },
      ],
      treeLeaves: [
        { row: floorRow - 4, col: 11, type: "leaves" },
        { row: floorRow - 4, col: 12, type: "leaves" },
        { row: floorRow - 4, col: 13, type: "leaves" },
        { row: floorRow - 4, col: 14, type: "leaves" },
        { row: floorRow - 4, col: 15, type: "leaves" },
        { row: floorRow - 5, col: 12, type: "leaves" },
        { row: floorRow - 5, col: 13, type: "leaves" },
        { row: floorRow - 5, col: 14, type: "leaves" },
        { row: floorRow - 6, col: 13, type: "leaves" },
      ],
      // Deep resource deposits scattered inside lower stone layers
      coalVeins: [
        { row: floorRow + 5, col: 4, type: "coal" },
        { row: floorRow + 5, col: 5, type: "coal" },
        { row: floorRow + 6, col: 5, type: "coal" },
        { row: floorRow + 7, col: 22, type: "coal" },
        { row: floorRow + 8, col: 22, type: "coal" },
        { row: floorRow + 8, col: 23, type: "coal" },
      ],
      ironVeins: [
        { row: floorRow + 6, col: 10, type: "iron" },
        { row: floorRow + 7, col: 10, type: "iron" },
        { row: floorRow + 6, col: 11, type: "iron" },
        { row: floorRow + 8, col: 31, type: "iron" },
        { row: floorRow + 9, col: 31, type: "iron" },
      ],
      goldVeins: [
        { row: floorRow + 8, col: 15, type: "gold" },
        { row: floorRow + 9, col: 15, type: "gold" },
        { row: floorRow + 9, col: 16, type: "gold" },
        { row: floorRow + 7, col: 35, type: "gold" },
      ],
      diamondVeins: [
        { row: this.rows - 2, col: 18, type: "diamond" },
        { row: this.rows - 2, col: 19, type: "diamond" },
        { row: this.rows - 3, col: 19, type: "diamond" },
        { row: this.rows - 2, col: 28, type: "diamond" },
      ],
      // Hardcoded water bodies (carved into the surface floor profile)
      waterPools: [
        // Pool 1 (Left Area)
        { row: floorRow, col: 3, type: "water" },
        { row: floorRow, col: 4, type: "water" },
        { row: floorRow + 1, col: 3, type: "water" },
        { row: floorRow + 1, col: 4, type: "water" },
        // Pool 2 (Right Area)
        { row: floorRow, col: 25, type: "water" },
        { row: floorRow, col: 26, type: "water" },
        { row: floorRow, col: 27, type: "water" },
        { row: floorRow + 1, col: 25, type: "water" },
        { row: floorRow + 1, col: 26, type: "water" },
        { row: floorRow + 1, col: 27, type: "water" },
        { row: floorRow + 2, col: 26, type: "water" },
      ],
    };

    // Unpack and place all hard-coded asset structures onto the active map coordinates
    Object.values(structures)
      .flat()
      .forEach((tile) => {
        this.matrix[tile.row][tile.col] = tile.type;
      });
  }

  // Renders the layout grid frame wrapper structures out onto the game window
  render() {
    this.DOMElement.innerHTML = "";

    this.DOMElement.style.display = "grid";
    this.DOMElement.style.gridTemplateColumns = `repeat(${this.cols}, ${this.tileSize}px)`;
    this.DOMElement.style.gridTemplateRows = `repeat(${this.rows}, ${this.tileSize}px)`;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const tileType = this.matrix[r][c];

        const tileElement = document.createElement("section");
        tileElement.className = `tile ${tileType}`;
        tileElement.dataset.row = r;
        tileElement.dataset.col = c;

        this.DOMElement.appendChild(tileElement);
      }
    }
  }

  // Physical Bound Checker evaluating dynamic entity coordinate points
  isTileSolidAt(pixelX, pixelY, allowLeaves = false) {
    const col = Math.floor(pixelX / this.tileSize);
    const row = Math.floor(pixelY / this.tileSize);

    if (col < 0 || col >= this.cols) return true;
    if (row >= this.rows || row < 0) return false;

    const tile = this.matrix[row][col];

    if (allowLeaves && tile === "leaves") {
      return true;
    }

    // Added specific solid checks for minerals and water as requested
    const nonSolidTypes = ["air", "leaves", "wood"];
    return !nonSolidTypes.includes(tile);
  }

  // Helper utility fetching the internal identity strings of specific tiles
  getTileTypeAt(pixelX, pixelY) {
    const col = Math.floor(pixelX / this.tileSize);
    const row = Math.floor(pixelY / this.tileSize);

    if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
      return this.matrix[row][col];
    }
    return "air";
  }
}
