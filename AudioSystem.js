// AudioSystem.js — music and SFX with distance-based volume falloff
// SFX: Web Audio API (low latency, per-sound GainNodes for spatial volume)
// Music: HTML audio elements (looping tracks, crossfade on theme switch)

class AudioSystem {
  constructor() {
    this.ctx = null;
    this.masterSfx = null; // master sfx gain — controlled by the slider
    this.sfxVolume = 0.5;
    this.musicVolume = 0.35;

    // How far (world pixels) sound can be heard at all
    this.maxHearDistance = 600;

    this.currentMusic = null;
    this.currentTrack = null;

    this.musicTracks = {
      forest: this._makeAudio("Audio/music/game/creative/biome_fest.ogg"),
      desert: this._makeAudio("Audio/music/game/creative/haunt_muskie.ogg"),
      snow: this._makeAudio("Audio/music/game/creative/aria_math.ogg"),
    };

    // Every sound the game uses — paths match mcasset.cloud 1.0 folder structure
    this.sfxFiles = {
      // Player actions
      swing: "Audio/random/wood_click.ogg",
      hit: "Audio/damage/hit1.ogg",
      mine: "Audio/dig/stone1.ogg",
      place: "Audio/dig/gravel1.ogg",
      arrow: "Audio/random/bow.ogg",
      jump: "Audio/damage/fallsmall.ogg",
      death: "Audio/damage/fallbig.ogg",
      // Water
      splash: "Audio/liquid/splash.ogg",
      swim: "Audio/liquid/swim1.ogg",
      // Zombie
      zombie_say: "Audio/mob/zombie/say1.ogg",
      zombie_hurt: "Audio/mob/zombie/hurt1.ogg",
      // Skeleton
      skeleton_say: "Audio/mob/skeleton/say1.ogg",
      skeleton_hurt: "Audio/mob/skeleton/hurt1.ogg",
      skeleton_walk: "Audio/mob/skeleton/step1.ogg",
      // Goblin (uses witch sounds)
      goblin_laugh: "Audio/mob/witch/laugh1.ogg",
      goblin_hurt: "Audio/mob/witch/hurt1.ogg",
    };

    this._sfxCache = {};
  }

  // Must be called on first user gesture — browsers block AudioContext before that
  resume() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterSfx = this.ctx.createGain();
    this.masterSfx.gain.value = this.sfxVolume;
    this.masterSfx.connect(this.ctx.destination);
  }

  // Plays a sound at full volume — for UI events (swing, mine, jump, death etc.)
  play(name) {
    this._playWithGain(name, 1.0);
  }

  // Plays a sound scaled by distance from the player — for enemy ambient sounds
  // worldX/Y: the enemy's pixel position in world space
  playAt(name, worldX, worldY) {
    if (!Minecraft2D?.player) {
      this.play(name);
      return;
    }

    const px = Minecraft2D.player.x + Minecraft2D.player.width / 2;
    const py = Minecraft2D.player.y + Minecraft2D.player.height / 2;
    const dist = Math.hypot(worldX - px, worldY - py);

    // Beyond max distance — silent
    if (dist >= this.maxHearDistance) return;

    // Linear falloff: 1.0 at distance 0, 0.0 at maxHearDistance
    const vol = 1 - dist / this.maxHearDistance;
    this._playWithGain(name, vol);
  }

  // Internal — plays a cached buffer through a one-shot GainNode at a specific volume
  _playWithGain(name, volume) {
    if (!this.ctx) return;
    const url = this.sfxFiles[name];
    if (!url) return;

    const fire = (buffer) => {
      const gain = this.ctx.createGain();
      gain.gain.value = Math.max(0, Math.min(1, volume));
      gain.connect(this.masterSfx);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(gain);
      src.start();
    };

    if (this._sfxCache[name]) {
      fire(this._sfxCache[name]);
      return;
    }

    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((buf) => this.ctx.decodeAudioData(buf))
      .then((decoded) => {
        this._sfxCache[name] = decoded;
        fire(decoded);
      })
      .catch(() => {});
  }

  // Starts music for a theme — handles already-playing, paused, and new-track cases
  playMusic(theme) {
    const track = this.musicTracks[theme];
    if (!track) return;

    if (track === this.currentMusic && !this.currentMusic.paused) return;

    if (track === this.currentMusic && this.currentMusic.paused) {
      track.play().catch(() => {});
      this._fadeHTMLAudio(track, track.volume, this.musicVolume, 600);
      return;
    }

    if (this.currentMusic) {
      const old = this.currentMusic;
      this._fadeHTMLAudio(old, old.volume, 0, 700, () => {
        old.pause();
        old.currentTime = 0;
      });
    }

    this.currentMusic = track;
    this.currentTrack = theme;
    track.volume = 0;
    track.currentTime = 0;
    track.play().catch(() => {});
    this._fadeHTMLAudio(track, 0, this.musicVolume, 1000);
  }

  pauseMusic() {
    if (!this.currentMusic || this.currentMusic.paused) return;
    const t = this.currentMusic;
    this._fadeHTMLAudio(t, t.volume, 0, 500, () => t.pause());
  }

  setSfxVolume(v) {
    this.sfxVolume = v;
    if (this.masterSfx) this.masterSfx.gain.value = v;
  }

  setMusicVolume(v) {
    this.musicVolume = v;
    if (this.currentMusic) this.currentMusic.volume = v;
  }

  _fadeHTMLAudio(el, from, to, ms, onDone) {
    const steps = 20;
    const stepMs = ms / steps;
    const delta = (to - from) / steps;
    let vol = from,
      count = 0;
    const t = setInterval(() => {
      count++;
      vol = Math.max(0, Math.min(1, vol + delta));
      el.volume = vol;
      if (count >= steps) {
        clearInterval(t);
        if (onDone) onDone();
      }
    }, stepMs);
  }

  _makeAudio(src) {
    const el = new Audio(src);
    el.loop = true;
    el.volume = 0;
    return el;
  }
}
