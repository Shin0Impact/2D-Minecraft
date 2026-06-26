class WorldGrid {
  constructor(rows = 60, cols = 80, tileSize = 45) {
    this.rows = rows;
    this.cols = cols;
    this.tileSize = tileSize;
    this.matrix = [];
    this.DOMElement = document.getElementById("worldGrid");
    this.theme = "forest"; // forest | desert | snow — visual skin only, same generation
  }

  // ─── Generation ───────────────────────────────────────────────────────────

  generate(theme = this.theme) {
    this.theme = theme;
    this.matrix = [];
    for (let r = 0; r < this.rows; r++) {
      this.matrix.push(new Array(this.cols).fill("air"));
    }
    this._buildTerrain();
    this._carveCavePockets();
    this._placeWaterPools();
    this._placeTrees();
    this._placeSurfaceRocks();
    this._placeUndergroundOres();
  }

  // ─── Terrain profile (sinusoidal heightmap) ───────────────────────────────

  _buildTerrain() {
    const BASE = 20; // average surface row
    const AMP = 4; // height variation in tiles
    const FREQ = 0.14; // wave frequency

    this._floorProfile = [];
    for (let c = 0; c < this.cols; c++) {
      const h = Math.round(
        BASE +
          Math.sin(c * FREQ) * AMP +
          Math.sin(c * FREQ * 2.1) * (AMP * 0.45) +
          Math.sin(c * FREQ * 0.47) * (AMP * 0.3),
      );
      this._floorProfile[c] = Math.max(8, Math.min(this.rows - 20, h));
    }

    // Theme picks which tile types fill the top layers
    const surface =
      this.theme === "snow"
        ? "snow"
        : this.theme === "desert"
          ? "sand"
          : "grass";
    const sub = this.theme === "desert" ? "sand" : "dirt";

    for (let c = 0; c < this.cols; c++) {
      const f = this._floorProfile[c];
      this.matrix[f][c] = surface;
      for (let r = f + 1; r < this.rows; r++) {
        this.matrix[r][c] = r < f + 5 ? sub : "stone";
      }
    }
  }

  // ─── Cave pockets ─────────────────────────────────────────────────────────

  _carveCavePockets() {
    // Random-walk tunnels scattered throughout the underground
    const NUM_CAVES = 18;
    for (let t = 0; t < NUM_CAVES; t++) {
      // Start somewhere underground (below dirt layer)
      const startC = 2 + Math.floor(Math.random() * (this.cols - 4));
      const floorR = this._floorProfile[startC];
      const startR =
        floorR + 6 + Math.floor(Math.random() * (this.rows - floorR - 10));

      let r = startR,
        c = startC;
      const steps = 25 + Math.floor(Math.random() * 40);
      const radius = 1 + Math.floor(Math.random() * 2); // 1 = narrow, 2 = wide

      for (let s = 0; s < steps; s++) {
        // Carve a blob at current position
        for (let dr = -radius; dr <= radius; dr++) {
          for (let dc = -radius; dc <= radius; dc++) {
            if (dr * dr + dc * dc > radius * radius + 0.5) continue; // circle shape
            const nr = r + dr,
              nc = c + dc;
            if (
              nr > floorR + 4 && // never break through to surface
              nr < this.rows - 1 && // keep bedrock row intact
              nc >= 0 &&
              nc < this.cols &&
              this.matrix[nr][nc] === "stone"
            ) {
              this.matrix[nr][nc] = "air";
            }
          }
        }
        // Drift in a mostly-horizontal direction
        const roll = Math.random();
        if (roll < 0.4) c = Math.min(this.cols - 1, c + 1);
        else if (roll < 0.8) c = Math.max(0, c - 1);
        else if (roll < 0.9) r = Math.min(this.rows - 2, r + 1);
        else r = Math.max(floorR + 5, r - 1);
      }
    }
  }

  // ─── Water pools ──────────────────────────────────────────────────────────

  _placeWaterPools() {
    // Desert has no water — it evaporates
    if (this.theme === "desert") return;
    for (let c = 2; c < this.cols - 2; c++) {
      const here = this._floorProfile[c];
      const left = this._floorProfile[c - 1];
      const right = this._floorProfile[c + 1];
      // A "dip" is where this column is lower than both neighbours
      if (here >= left && here >= right && Math.random() < 0.35) {
        // Fill pool width
        const poolW = 1 + Math.floor(Math.random() * 3);
        for (let dc = 0; dc < poolW && c + dc < this.cols - 1; dc++) {
          const pr = this._floorProfile[c + dc];
          if (this.matrix[pr][c + dc] !== "air") {
            this.matrix[pr][c + dc] = "water";
            this.matrix[pr + 1][c + dc] = "water";
          }
        }
        c += poolW; // skip ahead so pools don't stack
      }
    }

    // Underground pools — puddles on cave floors
    const UNDERGROUND_POOLS = 10;
    for (let i = 0; i < UNDERGROUND_POOLS; i++) {
      const c = 2 + Math.floor(Math.random() * (this.cols - 4));
      const floorR = this._floorProfile[c];
      // Find a cave air pocket somewhere mid-underground
      const startR =
        floorR + 8 + Math.floor(Math.random() * (this.rows - floorR - 14));
      // Look downward for the floor of a cave pocket
      for (let r = startR; r < this.rows - 2; r++) {
        if (this.matrix[r][c] === "air" && this.matrix[r + 1][c] === "stone") {
          // Place a small puddle
          const poolW = 1 + Math.floor(Math.random() * 3);
          for (let dc = 0; dc < poolW && c + dc < this.cols - 1; dc++) {
            if (
              this.matrix[r][c + dc] === "air" &&
              this.matrix[r + 1][c + dc] === "stone"
            ) {
              this.matrix[r][c + dc] = "water";
            }
          }
          break;
        }
      }
    }
  }

  // ─── Trees (forest/snow only) ─────────────────────────────────────────────

  _placeTrees() {
    if (this.theme === "desert") return;
    let lastTree = -5;
    for (let c = 2; c < this.cols - 2; c++) {
      const f = this._floorProfile[c];
      const surface = this.matrix[f][c];
      const isPlantable = surface === "grass" || surface === "snow";
      if (isPlantable && c - lastTree >= 4 && Math.random() < 0.22) {
        this._placeTree(f, c);
        lastTree = c;
      }
    }
  }

  _placeTree(floorRow, col) {
    const trunkH = 3 + Math.floor(Math.random() * 2);
    for (let i = 1; i <= trunkH; i++) {
      if (floorRow - i >= 0) this.matrix[floorRow - i][col] = "wood";
    }
    const top = floorRow - trunkH;
    const leafOffsets = [
      [0, -2],
      [0, -1],
      [0, 0],
      [0, 1],
      [0, 2],
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [-2, 0],
    ];
    for (const [dr, dc] of leafOffsets) {
      const r = top + dr,
        c = col + dc;
      if (
        r >= 0 &&
        r < this.rows &&
        c >= 0 &&
        c < this.cols &&
        this.matrix[r][c] === "air"
      ) {
        this.matrix[r][c] = "leaves";
      }
    }
  }

  // ─── Surface rock scatter ─────────────────────────────────────────────────

  _placeSurfaceRocks() {
    for (let c = 3; c < this.cols - 3; c++) {
      if (Math.random() < 0.07) {
        const f = this._floorProfile[c];
        const onSolid = ["grass", "dirt", "sand", "snow"].includes(
          this.matrix[f][c],
        );
        if (onSolid) {
          const h = 1 + Math.floor(Math.random() * 2);
          for (let i = 1; i <= h; i++) {
            if (f - i >= 0 && this.matrix[f - i][c] === "air") {
              this.matrix[f - i][c] = "stone";
            }
          }
        }
      }
    }
  }

  // ─── Underground ores ─────────────────────────────────────────────────────

  _placeOreVein(type, centerRow, centerCol, size) {
    for (let i = 0; i < size; i++) {
      const dr = Math.round((Math.random() - 0.5) * 4);
      const dc = Math.round((Math.random() - 0.5) * 4);
      const r = centerRow + dr,
        c = centerCol + dc;
      if (
        r > 0 &&
        r < this.rows &&
        c >= 0 &&
        c < this.cols &&
        this.matrix[r][c] === "stone"
      ) {
        this.matrix[r][c] = type;
      }
    }
  }

  _placeUndergroundOres() {
    const fp = this._floorProfile;
    const place = (type, count, minDepth, maxDepth, veinSize) => {
      for (let i = 0; i < count; i++) {
        const c = 1 + Math.floor(Math.random() * (this.cols - 2));
        const fR = fp[c];
        const r =
          fR + minDepth + Math.floor(Math.random() * (maxDepth - minDepth));
        if (r < this.rows - 1) this._placeOreVein(type, r, c, veinSize);
      }
    };
    place("coal", 22, 4, 12, 4);
    place("iron", 16, 8, 16, 3);
    place("gold", 10, 14, 20, 3);
    place(
      "diamond",
      7,
      22,
      this.rows - fp.reduce((a, b) => a + b, 0) / fp.length - 2,
      2,
    );
  }

  // ─── Rendering ────────────────────────────────────────────────────────────

  render() {
    this.DOMElement.innerHTML = "";
    this.DOMElement.style.display = "grid";
    this.DOMElement.style.gridTemplateColumns = `repeat(${this.cols}, ${this.tileSize}px)`;
    this.DOMElement.style.gridTemplateRows = `repeat(${this.rows}, ${this.tileSize}px)`;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const el = document.createElement("section");
        el.className = `tile ${this.matrix[r][c]}`;
        el.dataset.row = r;
        el.dataset.col = c;
        this.DOMElement.appendChild(el);
      }
    }
  }

  animateTile(row, col, animClass) {
    const el = this.DOMElement.querySelector(
      `[data-row="${row}"][data-col="${col}"]`,
    );
    if (!el) return;
    el.classList.add(animClass);
    el.addEventListener("animationend", () => el.classList.remove(animClass), {
      once: true,
    });
  }

  // ─── Collision helpers ────────────────────────────────────────────────────

  isTileSolidAt(pixelX, pixelY, allowLeaves = false, theme = "forest") {
    const col = Math.floor(pixelX / this.tileSize);
    const row = Math.floor(pixelY / this.tileSize);
    if (col < 0 || col >= this.cols) return true;
    if (row < 0 || row >= this.rows) return false;
    const tile = this.matrix[row][col];
    if (allowLeaves && tile === "leaves") return true;
    // Snow: frozen water is solid. Forest/desert: water is passable.
    if (tile === "water") return theme === "snow";
    return !["air", "leaves", "wood"].includes(tile);
  }

  getTileTypeAt(pixelX, pixelY) {
    const col = Math.floor(pixelX / this.tileSize);
    const row = Math.floor(pixelY / this.tileSize);
    if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
      return this.matrix[row][col];
    }
    return "air";
  }

  getSurfaceRow(col) {
    const safeCol = Math.max(0, Math.min(this.cols - 1, col));
    for (let r = 0; r < this.rows; r++) {
      if (this.matrix[r][safeCol] !== "air") return r;
    }
    return this.rows - 1;
  }
}
