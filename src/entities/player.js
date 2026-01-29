// src/entities/player.js
class Player {
  constructor(game, level, state) {
    this.game = game;
    this.level = level;
    this.state = state;

    this.w = 26;
    this.h = 26;
    this.x = level.playerSpawn.x;
    this.y = level.playerSpawn.y;

    this.speed = 220; // pixels/sec
    this.hidden = false;


    this.removeFromWorld = false;

    this.isPlayer = true;
  }

  getRect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update() {
    if (this.state.status !== "playing") return;

    // If hidden, don't move (simple + clear)
    if (this.hidden) return;

    let vx = 0;
    let vy = 0;
    if (this.game.keys["w"] || this.game.keys["ArrowUp"]) vy -= 1;
    if (this.game.keys["s"] || this.game.keys["ArrowDown"]) vy += 1;
    if (this.game.keys["a"] || this.game.keys["ArrowLeft"]) vx -= 1;
    if (this.game.keys["d"] || this.game.keys["ArrowRight"]) vx += 1;

    // Normalize diagonal (and any combined input)
    if (vx !== 0 || vy !== 0) {
      const len = Math.hypot(vx, vy);
      vx /= len;
      vy /= len;
    }

    const dt = this.game.clockTick;
    const dx = vx * this.speed * dt;
    const dy = vy * this.speed * dt;

    moveWithWalls(this, dx, dy, this.level.walls);

  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.hidden ? 0.35 : 1.0;
    ctx.fillStyle = this.hidden ? "rgba(0,150,0,0.6)" : "rgba(0,180,0,1)";
    ctx.fillRect(
      this.x, 
      this.y, 
      this.w, 
      this.h
    );
    ctx.restore();
  }
}
