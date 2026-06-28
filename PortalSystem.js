// PortalSystem.js — tracks kill count, spawns the portal, handles diamond slot ritual

class PortalSystem {
  constructor(engine) {
    this.engine = engine;
    this.killCount = 0;
    this.killsNeeded = 10;
    this.diamondsNeeded = 5;
    this.diamondsFilled = 0;
    this.portalActive = false; // portal is visible and accepting diamonds
    this.portalX = 0; // world pixel position of the portal
    this.portalY = 0;
    this.DOMElement = null;
    this._pulseTimer = null;
  }

  // Called by Combat every time an enemy dies
  onEnemyKilled() {
    if (this.portalActive || this.engine.bossFight) return;
    this.killCount++;
    this._updateKillUI();
    if (this.killCount >= this.killsNeeded) this._spawnPortal();
  }

  // Places the portal structure in the world near the player
  _spawnPortal() {
    this.portalActive = true;
    this.diamondsFilled = 0;

    const engine = this.engine;
    const world = engine.world;

    // Find a flat surface spot about 15 cols to the right of the player
    const targetCol = Math.min(
      world.cols - 6,
      Math.floor(engine.player.x / world.tileSize) + 15,
    );
    const surfaceRow = world.getSurfaceRow(targetCol);

    // Portal is 3 tiles wide, 4 tiles tall — carved into the world as obsidian (stone)
    // Frame: stone border, interior: air with portal tile overlay
    const frameCol = targetCol;
    const frameRow = surfaceRow - 4;

    // Store position for click detection
    this.portalCol = frameCol + 1;
    this.portalRow = frameRow;
    this.portalX = (frameCol + 1) * world.tileSize;
    this.portalY = frameRow * world.tileSize;

    // Carve frame into world matrix
    for (let r = frameRow; r <= surfaceRow; r++) {
      for (let c = frameCol; c <= frameCol + 2; c++) {
        if (r >= 0 && r < world.rows && c >= 0 && c < world.cols) {
          const isFrame =
            r === frameRow ||
            r === surfaceRow ||
            c === frameCol ||
            c === frameCol + 2;
          world.matrix[r][c] = isFrame ? "stone" : "air";
        }
      }
    }
    world.render();

    // Overlay DOM portal element on top of the stage
    this.DOMElement = document.createElement("div");
    this.DOMElement.id = "portalOverlay";
    this.DOMElement.innerHTML = this._buildPortalHTML();
    document.getElementById("stage").appendChild(this.DOMElement);
    this._positionPortalDOM();

    this._showAnnouncement(
      "⚡ A portal has appeared! Walk right and fill it with 5 💎!",
    );
    engine.audio?.play("splash");
  }

  // Builds the inner HTML for the portal overlay
  _buildPortalHTML() {
    let slots = "";
    for (let i = 0; i < this.diamondsNeeded; i++) {
      slots += `<div class="portal-slot" id="portal-slot-${i}">💎</div>`;
    }
    return `
      <div class="portal-frame">
        <div class="portal-inner">
          <div class="portal-label">PORTAL</div>
          <div class="portal-slots">${slots}</div>
          <div class="portal-hint">Click with 💎 selected</div>
        </div>
      </div>`;
  }

  // Keeps the portal DOM element aligned with the world as camera moves
  _positionPortalDOM() {
    if (!this.DOMElement) return;
    const engine = this.engine;
    this.DOMElement.style.position = "absolute";
    this.DOMElement.style.left = `${this.portalX}px`;
    this.DOMElement.style.top = `${this.portalY}px`;
    this.DOMElement.style.zIndex = "20";
  }

  // Called from Engine mousedown when the player clicks with diamonds selected
  tryFillSlot(worldX, worldY) {
    if (!this.portalActive) return false;

    // Check click lands anywhere within the portal DOM element's world-space bounding box
    // Portal overlay is 90px wide x 180px tall, anchored at portalX/portalY
    const inPortal =
      worldX >= this.portalX &&
      worldX <= this.portalX + 90 &&
      worldY >= this.portalY &&
      worldY <= this.portalY + 180;
    if (!inPortal) return false;

    const engine = this.engine;

    if (engine.inventory.diamond < 1) {
      this._showAnnouncement("You need 💎 diamonds! Mine some first.");
      return true; // consumed the click even though nothing happened
    }

    engine.inventory.diamond--;
    engine.mining.updateInventoryUI();
    this.diamondsFilled++;

    const slot = document.getElementById(
      `portal-slot-${this.diamondsFilled - 1}`,
    );
    if (slot) slot.classList.add("filled");

    engine.audio?.play("place");

    if (this.diamondsFilled >= this.diamondsNeeded) {
      setTimeout(() => this._activateBoss(), 800);
    }
    return true;
  }

  _activateBoss() {
    if (this._pulseTimer) clearInterval(this._pulseTimer);
    if (this.DOMElement) this.DOMElement.remove();
    this._showAnnouncement("💀 THE BOSS AWAKENS! 💀");
    this.engine.audio?.pauseMusic();
    setTimeout(() => this.engine.enterBossArena(), 1500);
  }

  // Updates the kill counter HUD badge
  _updateKillUI() {
    let badge = document.getElementById("killBadge");
    if (!badge) return;
    const remaining = Math.max(0, this.killsNeeded - this.killCount);
    badge.textContent =
      remaining > 0 ? `☠️ ${remaining} kills to portal` : "⚡ Portal open!";
  }

  // Shows a temporary announcement banner inside the game window
  _showAnnouncement(msg) {
    let el = document.getElementById("announcement");
    if (!el) {
      el = document.createElement("div");
      el.id = "announcement";
      document.getElementById("gameWindow").appendChild(el);
    }
    el.textContent = msg;
    el.classList.remove("fade-out");
    void el.offsetWidth; // force reflow to restart animation
    el.classList.add("fade-out");
  }

  // Resets everything for a new game
  reset() {
    this.killCount = 0;
    this.diamondsFilled = 0;
    this.portalActive = false;
    if (this.DOMElement) {
      this.DOMElement.remove();
      this.DOMElement = null;
    }
    this._updateKillUI();
  }
}
