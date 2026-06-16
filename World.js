class WorldGrid {
  constructor(rows, cols, tileSize = 40) {
    this.rows = rows;
    this.cols = cols;
    this.tileSize = tileSize;
    this.matrix = [];
    this.DOMElement = document.getElementById("worldGrid");
  }

  // Generate the initial map structure in memory need to be random later
  generate() {
    this.matrix = []; // Clear array for clean generation/resets

    for (let r = 0; r < this.rows; r++) {
      let rowArray = [];
      for (let c = 0; c < this.cols; c++) {
        // Build layers from top to bottom
        if (r < 8) {
          rowArray.push("air");
        } else if (r === 8) {
          rowArray.push("grass");
        } else if (r < 12) {
          rowArray.push("dirt");
        } else {
          rowArray.push("stone");
        }
      }
      this.matrix.push(rowArray);
    }
  }

  // Render the grid out
  render() {
    // Clear out any old tiles first
    this.DOMElement.innerHTML = "";

    // Configure the layout size matching our columns and rows
    this.DOMElement.style.display = "grid";
    this.DOMElement.style.gridTemplateColumns = `repeat(${this.cols}, ${this.tileSize}px)`;
    this.DOMElement.style.gridTemplateRows = `repeat(${this.rows}, ${this.tileSize}px)`;

    // Loop through our data matrix and create custom visual elements
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const tileType = this.matrix[r][c];

        // Create a new HTML element for each tile and assign the appropriate class
        const tileElement = document.createElement("section");
        tileElement.className = `tile ${tileType}`;

        // Save coordinates directly onto the element for easy clicking later
        tileElement.dataset.row = r;
        tileElement.dataset.col = c;

        this.DOMElement.appendChild(tileElement);
      }
    }
  }

  // Physical Bound Checker: currently broken
  isTileSolidAt(pixelX, pixelY) {
    const col = Math.floor(pixelX / this.tileSize);
    const row = Math.floor(pixelY / this.tileSize);

    // Make sure the player/enemy hasn't fallen out of map array bounds
    if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
      const blockType = this.matrix[row][col];
      // Air is passable, everything else blocks physical entities
      return blockType !== "air";
    }
    return false;
  }
}
