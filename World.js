class WorldGrid {
  constructor(rows = 45, cols = 45, tileSize = 45) {
    this.rows = rows;
    this.cols = cols;
    this.tileSize = tileSize;
    this.matrix = [];
    this.DOMElement = document.getElementById("worldGrid");
    this.worldType = "forest"; // forest | desert | cave
  }

  // ─── Procedural Generation ────────────────────────────────────────────────

  generate(worldType = this.worldType) {
    this.worldType = worldType;
    this.matrix = [];
    for (let r = 0; r < this.rows; r++) {
      this.matrix.push(new Array(this.cols).fill("air"));
    }

    if (worldType === "desert") {
      this._generateDesert();
    } else if (worldType === "cave") {
      this._generateCave();
    } else {
      this._generateForest();
    }
  }

  // Weighted random helper
  _weighted(options) {
    const total = options.reduce((sum, o) => sum + o.weight, 0);
    let roll = Math.random() * total;
    for (const o of options) {
      roll -= o.weight;
      if (roll <= 0) return o.value;
    }
    return options[options.length - 1].value;
  }

  // Perlin-like smooth terrain using sine waves
  _getTerrainHeight(col, baseRow, amplitude, frequency) {
    return Math.round(
      baseRow + Math.sin(col * frequency) * amplitude +
      Math.sin(col * frequency * 2.3) * (amplitude * 0.4)
    );
  }

  _placeOreVein(type, centerRow, centerCol, size) {
    for (let i = 0; i < size; i++) {
      const dr = Math.round((Math.random() - 0.5) * 3);
      const dc = Math.round((Math.random() - 0.5) * 3);
      const r = centerRow + dr;
      const c = centerCol + dc;
      if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
        if (this.matrix[r][c] === "stone") {
          this.matrix[r][c] = type;
        }
      }
    }
  }

  _placeTree(floorRow, col) {
    const trunkHeight = 3 + Math.floor(Math.random() * 2);
    for (let i = 1; i <= trunkHeight; i++) {
      if (floorRow - i >= 0) this.matrix[floorRow - i][col] = "wood";
    }
    const leafTop = floorRow - trunkHeight;
    const leafPattern = [
      [0, -2],[0, -1],[0, 0],[0, 1],[0, 2],
      [-1,-1],[-1, 0],[-1, 1],
      [-2, 0],
    ];
    for (const [dr, dc] of leafPattern) {
      const r = leafTop + dr;
      const c = col + dc;
      if (r >= 0 && r < this.rows && c >= 0 && c < this.cols && this.matrix[r][c] === "air") {
        this.matrix[r][c] = "leaves";
      }
    }
  }

  _generateForest() {
    const baseFloor = 16;
    const amplitude = 3;
    const frequency = 0.18;

    // Build terrain profile
    const floorProfile = [];
    for (let c = 0; c < this.cols; c++) {
      floorProfile[c] = this._getTerrainHeight(c, baseFloor, amplitude, frequency);
    }

    // Fill terrain
    for (let c = 0; c < this.cols; c++) {
      const floorRow = floorProfile[c];
      this.matrix[floorRow][c] = "grass";
      for (let r = floorRow + 1; r < this.rows; r++) {
        this.matrix[r][c] = r < floorRow + 4 ? "dirt" : "stone";
      }
    }

    // Water pools in low spots
    for (let c = 2; c < this.cols - 2; c++) {
      const here = floorProfile[c];
      const left = floorProfile[c - 1];
      const right = floorProfile[c + 1];
      if (here > left && here > right && Math.random() < 0.4) {
        this.matrix[here][c] = "water";
        this.matrix[here + 1][c] = "water";
      }
    }

    // Trees — only on grass, not adjacent to each other
    let lastTree = -4;
    for (let c = 2; c < this.cols - 2; c++) {
      const floorRow = floorProfile[c];
      if (
        this.matrix[floorRow][c] === "grass" &&
        c - lastTree >= 4 &&
        Math.random() < 0.25
      ) {
        this._placeTree(floorRow, c);
        lastTree = c;
      }
    }

    // Stone obstacles on surface
    for (let c = 3; c < this.cols - 3; c++) {
      if (Math.random() < 0.08) {
        const floorRow = floorProfile[c];
        if (this.matrix[floorRow][c] === "grass") {
          const height = 1 + Math.floor(Math.random() * 2);
          for (let i = 1; i <= height; i++) {
            if (floorRow - i >= 0) this.matrix[floorRow - i][c] = "stone";
          }
        }
      }
    }

    this._placeUndergroundOres(floorProfile);
  }

  _generateDesert() {
    const baseFloor = 15;
    const amplitude = 2;
    const frequency = 0.12;

    const floorProfile = [];
    for (let c = 0; c < this.cols; c++) {
      floorProfile[c] = this._getTerrainHeight(c, baseFloor, amplitude, frequency);
    }

    for (let c = 0; c < this.cols; c++) {
      const floorRow = floorProfile[c];
      this.matrix[floorRow][c] = "sand";
      for (let r = floorRow + 1; r < this.rows; r++) {
        this.matrix[r][c] = r < floorRow + 5 ? "sand" : "stone";
      }
    }

    // Sand dunes / rock formations
    for (let c = 3; c < this.cols - 3; c++) {
      if (Math.random() < 0.12) {
        const floorRow = floorProfile[c];
        const height = 1 + Math.floor(Math.random() * 3);
        for (let i = 1; i <= height; i++) {
          if (floorRow - i >= 0) this.matrix[floorRow - i][c] = "sand";
        }
      }
    }

    // Occasional stone outcrops
    for (let c = 4; c < this.cols - 4; c++) {
      if (Math.random() < 0.06) {
        const floorRow = floorProfile[c];
        this.matrix[floorRow - 1][c] = "stone";
        if (Math.random() < 0.5 && c + 1 < this.cols) this.matrix[floorRow - 1][c + 1] = "stone";
      }
    }

    this._placeUndergroundOres(floorProfile);
  }

  _generateCave() {
    // Starts fully filled with stone, then carves caves
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.matrix[r][c] = r < 3 ? "air" : "stone";
      }
    }

    // Thin dirt + snow surface
    const baseFloor = 4;
    for (let c = 0; c < this.cols; c++) {
      this.matrix[baseFloor][c] = "snow";
      this.matrix[baseFloor + 1][c] = "dirt";
    }

    // Carve cave tunnels using random walks
    const numTunnels = 6;
    for (let t = 0; t < numTunnels; t++) {
      let r = 8 + Math.floor(Math.random() * (this.rows - 16));
      let c = Math.floor(Math.random() * this.cols);
      const steps = 80 + Math.floor(Math.random() * 80);
      for (let s = 0; s < steps; s++) {
        const radius = 1 + Math.floor(Math.random() * 2);
        for (let dr = -radius; dr <= radius; dr++) {
          for (let dc = -radius; dc <= radius; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 5 && nr < this.rows - 1 && nc >= 0 && nc < this.cols) {
              this.matrix[nr][nc] = "air";
            }
          }
        }
        const dir = Math.floor(Math.random() * 4);
        if (dir === 0) r = Math.max(6, r - 1);
        else if (dir === 1) r = Math.min(this.rows - 3, r + 1);
        else if (dir === 2) c = Math.max(0, c - 1);
        else c = Math.min(this.cols - 1, c + 1);
      }
    }

    // Carve a flat walkable entry area near spawn
    const entryFloor = 8;
    for (let c = 0; c < 10; c++) {
      for (let r = entryFloor; r < entryFloor + 5; r++) {
        this.matrix[r][c] = "air";
      }
      this.matrix[entryFloor + 5][c] = "stone";
    }

    // Underground ores — abundant in cave world
    const caveFloorProfile = new Array(this.cols).fill(entryFloor + 5);
    this._placeUndergroundOres(caveFloorProfile, 1.8);
  }

  _placeUndergroundOres(floorProfile, densityMultiplier = 1) {
    const avgFloor = Math.round(floorProfile.reduce((a, b) => a + b, 0) / floorProfile.length);

    // Coal — shallow
    const coalCount = Math.round(8 * densityMultiplier);
    for (let i = 0; i < coalCount; i++) {
      const c = 1 + Math.floor(Math.random() * (this.cols - 2));
      const minR = floorProfile[c] + 4;
      const r = minR + Math.floor(Math.random() * 8);
      if (r < this.rows) this._placeOreVein("coal", r, c, 3 + Math.floor(Math.random() * 3));
    }

    // Iron — mid depth
    const ironCount = Math.round(6 * densityMultiplier);
    for (let i = 0; i < ironCount; i++) {
      const c = 1 + Math.floor(Math.random() * (this.cols - 2));
      const minR = floorProfile[c] + 7;
      const r = minR + Math.floor(Math.random() * 8);
      if (r < this.rows) this._placeOreVein("iron", r, c, 2 + Math.floor(Math.random() * 3));
    }

    // Gold — deeper
    const goldCount = Math.round(4 * densityMultiplier);
    for (let i = 0; i < goldCount; i++) {
      const c = 1 + Math.floor(Math.random() * (this.cols - 2));
      const minR = floorProfile[c] + 12;
      const r = minR + Math.floor(Math.random() * 6);
      if (r < this.rows) this._placeOreVein("gold", r, c, 2 + Math.floor(Math.random() * 2));
    }

    // Diamond — near bedrock
    const diamondCount = Math.round(3 * densityMultiplier);
    for (let i = 0; i < diamondCount; i++) {
      const c = 1 + Math.floor(Math.random() * (this.cols - 2));
      const r = this.rows - 2 - Math.floor(Math.random() * 4);
      this._placeOreVein("diamond", r, c, 2 + Math.floor(Math.random() * 2));
    }
  }

  // ─── Rendering ────────────────────────────────────────────────────────────

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

  // Animates a tile break/place by briefly adding a CSS class
  animateTile(row, col, animClass) {
    const tileEl = this.DOMElement.querySelector(
      `[data-row="${row}"][data-col="${col}"]`
    );
    if (!tileEl) return;
    tileEl.classList.add(animClass);
    tileEl.addEventListener("animationend", () => tileEl.classList.remove(animClass), { once: true });
  }

  // ─── Collision helpers ────────────────────────────────────────────────────

  isTileSolidAt(pixelX, pixelY, allowLeaves = false) {
    const col = Math.floor(pixelX / this.tileSize);
    const row = Math.floor(pixelY / this.tileSize);

    if (col < 0 || col >= this.cols) return true;
    if (row >= this.rows || row < 0) return false;

    const tile = this.matrix[row][col];

    if (allowLeaves && tile === "leaves") return true;

    const nonSolidTypes = ["air", "leaves", "wood", "water"];
    return !nonSolidTypes.includes(tile);
  }

  getTileTypeAt(pixelX, pixelY) {
    const col = Math.floor(pixelX / this.tileSize);
    const row = Math.floor(pixelY / this.tileSize);
    if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
      return this.matrix[row][col];
    }
    return "air";
  }

  // Returns the surface row for a given column (first non-air from top)
  getSurfaceRow(col) {
    for (let r = 0; r < this.rows; r++) {
      if (this.matrix[r][col] !== "air") return r;
    }
    return this.rows - 1;
  }
}
