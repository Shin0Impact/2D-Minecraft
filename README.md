# Minecraft 2D

A browser-based 2D Minecraft clone built with vanilla HTML, CSS, and JavaScript — no libraries, no canvas, just DOM.

## Description

A fully playable 2D Minecraft-style game running entirely in the browser. The world is a 45×45 tile grid with terrain, ores, trees, and water pools. The player can mine blocks with the correct tool, collect them into an inventory, and place them back. On top of the base assignment, the game features a moving player with physics, a zombie enemy with chase AI, a scrolling camera, a full combat system with health and knockback, and several ore types beyond the basic three tiles.

## Architecture

The game is split across focused files:

| File         | Responsibility                          |
| ------------ | --------------------------------------- |
| `World.js`   | Tile grid generation and rendering      |
| `Player.js`  | Input handling, movement, jumping       |
| `Enemy.js`   | Zombie AI, pathfinding, attack          |
| `Physics.js` | Collision resolution for all entities   |
| `Combat.js`  | Attack, damage, hearts UI               |
| `Mining.js`  | Block breaking, placement, inventory UI |
| `Camera.js`  | Viewport scrolling                      |
| `Engine.js`  | Game loop, system wiring, event setup   |

## Controls

| Input                         | Action        |
| ----------------------------- | ------------- |
| `A` / `←`                     | Move left     |
| `D` / `→`                     | Move right    |
| `W` / `Space`                 | Jump          |
| `Left Click` (sword selected) | Attack zombie |
| `Left Click` (tool selected)  | Mine tile     |
| `Left Click` (block selected) | Place block   |

## Tools

| Tool       | Removes                                 |
| ---------- | --------------------------------------- |
| ⚔️ Sword   | Damages zombies                         |
| 🪓 Axe     | Wood and Leaves                         |
| ⛏️ Pickaxe | Stone, Coal, Iron, Gold, Diamond, Water |
| 🧹 Shovel  | Grass and Dirt                          |

## Extra Features

Beyond the base assignment requirements:

- **Physics engine** — gravity, jump, mid-air collision on all entities
- **Scrolling camera** — world is larger than the viewport, camera follows the player
- **Zombie enemy** — chases the player, jumps over obstacles, attacks on contact
- **Combat system** — sword attack with directional hitbox, knockback, invincibility frames
- **Health system** — 5 hearts displayed with full/empty heart sprites
- **Game over screen** — triggered on death, with respawn option
- **Ore variety** — Coal, Iron, Gold, Diamond veins at increasing depths
- **Water pools** — decorative non-solid water tiles mineable with pickaxe
- **Leaf platform physics** — player can land on top of leaves but pass through from below

## What I Found Hard

## Known Bugs

## Assignment Review
