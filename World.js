class WorldGrid {
  constructor(rows, cols, tileSize = 40) {
    this.rows = rows;
    this.cols = cols;
    this.tileSize = tileSize;
    this.matrix = [];
    this.DOMElement = document.getElementById("worldGrid");
  }

  // Generates a hard-coded layout configuration using a scannable visual template
  generate() {
    this.matrix = [];

    // Initialize the base empty sky matrix
    for (let r = 0; r < this.rows; r++) {
      this.matrix.push(new Array(this.cols).fill("air"));
    }

    // Define a flat ground level base line
    const floorRow = 9;

    // Fill the standard subterranean ground layers uniform across the horizon
    for (let c = 0; c < this.cols; c++) {
      this.matrix[floorRow][c] = "grass";

      for (let r = floorRow + 1; r < this.rows; r++) {
        this.matrix[r][c] = r < floorRow + 3 ? "dirt" : "stone";
      }
    }

    // Inject dedicated environmental features directly using structured key-value maps
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

    return tile !== "air" && tile !== "leaves" && tile !== "wood";
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
