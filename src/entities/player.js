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

    this._wasE = false;
    this.removeFromWorld = false;

    this.isPlayer = true;
  }

  update() {
    if (this.state.status !== "playing") return;

    // Toggle hide (E) if overlapping a hide spot
    const eDown = !!this.game.keys["e"] || !!this.game.keys["E"];
    if (eDown && !this._wasE) {
      const spot = this.level.hideSpots.find(h => rectsIntersect(this, h));
      if (spot) this.hidden = !this.hidden;
    }
    this._wasE = eDown;

    // If hidden, don't move (simple + clear)
    if (this.hidden) return;

    let vx = 0, vy = 0;
    if (this.game.keys["w"] || this.game.keys["ArrowUp"]) vy -= 1;
    if (this.game.keys["s"] || this.game.keys["ArrowDown"]) vy += 1;
    if (this.game.keys["a"] || this.game.keys["ArrowLeft"]) vx -= 1;
    if (this.game.keys["d"] || this.game.keys["ArrowRight"]) vx += 1;

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) {
      vx *= 0.7071;
      vy *= 0.7071;
    }

    const dt = this.game.clockTick;
    const dx = vx * this.speed * dt;
    const dy = vy * this.speed * dt;

    moveWithWalls(this, dx, dy, this.level.walls);

    // Win condition: reach exit zone
    if (rectsIntersect(this, this.level.exitZone)) {
      this.state.status = "won";
    }
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
