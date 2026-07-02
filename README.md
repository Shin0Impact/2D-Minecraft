# Minecraft 2D

A fully playable browser-based 2D Minecraft clone built with vanilla HTML, CSS, and JavaScript — no libraries, no canvas, just DOM elements.

<img width="1623" height="1253" alt="{AA633EE7-A480-44EC-8A72-E315607878E1}" src="https://github.com/user-attachments/assets/00339b3a-7858-455a-9aae-28f6e4d37572" />
<img width="1544" height="1237" alt="{10F71A4B-7F37-4D1E-83CD-E0676301BB31}" src="https://github.com/user-attachments/assets/d016c562-14ab-4d4b-bd4c-9fd63fad12a8" />
<img width="1569" height="1237" alt="{893CB147-3E85-4A69-8919-487B33107CE9}" src="https://github.com/user-attachments/assets/fbc9c46d-c0c4-4a1f-bc26-4de6800ffa57" />
<img width="1527" height="1258" alt="{7FB277D3-E8FE-40F0-A054-2D02723B1FF2}" src="https://github.com/user-attachments/assets/1dfc1a76-9bda-47d0-9f98-7f52bff76d89" />


---

## Description

This started as the base assignment — tool selection, tile mining, inventory, and a reset button — and grew into a complete game with a physics engine, multiple enemy types, procedural world generation, a full audio system, and a boss fight with bullet-hell mechanics.

The world is a 60×80 tile grid (2700×3600px) that scrolls with the camera. Everything runs in the browser with zero dependencies.

---

## Architecture

The codebase is split into focused single-responsibility files:

| File              | Responsibility                                                   |
| ----------------- | ---------------------------------------------------------------- |
| `World.js`        | Procedural terrain generation, tile matrix, collision helpers    |
| `Player.js`       | Keyboard input, movement, jump, water swimming                   |
| `Enemy.js`        | AI for zombie, skeleton, goblin — sight detection, memory, aggro |
| `Physics.js`      | AABB collision resolution, water physics per theme               |
| `Combat.js`       | Sword attack, damage, invincibility frames, hearts UI            |
| `Mining.js`       | Block breaking, placement, apple drops, inventory UI             |
| `Camera.js`       | Viewport scrolling clamped to world bounds                       |
| `Spawner.js`      | Off-screen enemy spawning with cap                               |
| `BucketTool.js`   | Water collection and placement                                   |
| `Projectile.js`   | Player bow and goblin arrows                                     |
| `HoverSystem.js`  | Green/red tile highlight based on active tool                    |
| `AudioSystem.js`  | Web Audio API SFX with distance falloff, HTML audio music        |
| `PortalSystem.js` | Kill tracking, portal spawn, diamond ritual                      |
| `BossWorld.js`    | Superflat arena generation for the boss fight                    |
| `BossEnemy.js`    | 3-phase boss with stomp, bullet patterns, skull minion           |
| `Engine.js`       | Game loop, system wiring, state, event handlers                  |

---

## Controls

| Input         | Action                           |
| ------------- | -------------------------------- |
| `A` / `←`     | Move left                        |
| `D` / `→`     | Move right                       |
| `W` / `Space` | Jump / Swim up                   |
| `E`           | Eat apple (heals 1 heart)        |
| `1`           | Sword                            |
| `2`           | Bow                              |
| `3`           | Axe                              |
| `4`           | Pickaxe                          |
| `5`           | Shovel                           |
| `6`           | Bucket                           |
| `Left Click`  | Use active tool on tile or enemy |

---

## Tools

| Tool       | Does                                                 |
| ---------- | ---------------------------------------------------- |
| ⚔️ Sword   | Melee attack — 3x damage during boss recovery window |
| 🏹 Bow     | Fires arrows — hits enemies and boss                 |
| 🪓 Axe     | Mines Wood and Leaves                                |
| ⛏️ Pickaxe | Mines Stone, Ores, Snow, Water                       |
| 🧹 Shovel  | Mines Grass, Dirt, Sand                              |
| 🪣 Bucket  | Collects and places water                            |
| 🍎 Apple   | Drops from Leaves (50% chance), heals 1 heart        |

---

## World Types

Choose before starting — same procedural generator, different visual skin and tile rules:

| World     | Surface      | Water                | Trees  |
| --------- | ------------ | -------------------- | ------ |
| 🌲 Forest | Grass + Dirt | Swimmable            | Yes    |
| 🏜️ Desert | Sand         | Evaporates instantly | No     |
| ❄️ Snow   | Snow         | Frozen solid         | Sparse |

All worlds have cave pockets, underground water pools, surface rocks, and ore veins at increasing depths (Coal → Iron → Gold → Diamond near bedrock).

---

## Enemies

| Enemy       | Behaviour                                           |
| ----------- | --------------------------------------------------- |
| 🧟 Zombie   | Chases and melee attacks. Swims through water.      |
| 💀 Skeleton | Faster, avoids water.                               |
| 👺 Goblin   | Fires arrows from a distance using witch laugh SFX. |

All enemies have line-of-sight detection (same floor level only), a 3-second memory after losing sight, and per-type ambient sounds that scale with distance.

---

## Extra Features

Everything below goes beyond the base requirements:

**Gameplay**

- Procedural world generation with sinusoidal terrain, cave pockets, water pools, ore veins
- Full physics engine — gravity, jump, knockback, leaf platform one-way collision
- Scrolling camera over a 60×80 tile world
- 3 world themes with different tile rules
- Water physics per theme — swim / freeze / evaporate
- Bucket tool with infinite water capacity
- Apple drops from leaves with heal mechanic
- Bow with directional arrows
- Enemy line-of-sight with memory system

**Combat & Enemies**

- 3 enemy types with distinct behaviours
- Goblin archer with projectile arrows
- Invincibility frames on player hit
- Distance-based enemy ambient sounds

**Boss Fight**

- Kill 10 enemies → portal spawns (changed to 5)
- Fill portal with 5 diamonds to enter the boss arena
- 3-phase Zombie Lord with state machine (Walk → Telegraph → Attack → Recover)
- Stomp attack: high jump, hover with landing shadow, amplified fall, shockwave
- Bullet patterns: aimed shots, ground sweep, spiral
- Phase 2: Skull Minion floats and fires independently
- Recovery window: glowing green — sword does 3x damage to incentivise melee
- Win screen on defeat, game pauses immediately so no post-win deaths

**Polish**

- Tile break and place animations
- Red/green hover highlight showing if tool matches tile
- Floating apple drop text
- Boss telegraph shake and recovery glow
- Stomp shadow marker on the floor
- Landing page with world picker and volume sliders
- Web Audio API SFX with spatial distance falloff
- Per-theme looping background music with crossfade

---

## What I Found Hard

connecting all the files together and remembering where a wrote what,
and keeping thinging of more stuff to add meant more work haha

---

## Known Bugs

You cant move using wasd with caplock on but honestly its such a small bug i focused on other things
sometimes there arent enough diamonds spawned in the world generation so u cant reach the boss

---

## Assignment Review

I really enjoyed making this game it was the most funassignment i did so far!
