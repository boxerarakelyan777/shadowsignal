// src/entities/player.js
class Player {
  constructor(game, level, state, spritesheet) {
    this.game = game;
    this.level = level;
    this.state = state;

    // Collision box slightly smaller than the visual size for fair corners.
    this.w = 22;
    this.h = 22;
    this.drawW = 48;
    this.drawH = 48;
    this.drawOffsetX = (this.w - this.drawW) / 2;
    this.drawOffsetY = (this.h - this.drawH) / 2;
    this.x = level.playerSpawn.x;
    this.y = level.playerSpawn.y;

    this.speed = 220; // pixels/sec
    this.hidden = false;
    this.lastDir = { x: 1, y: 0 };


    this.removeFromWorld = false;

    this.isPlayer = true;

    if (spritesheet) { // adds spritesheet if it exists
      this.animator = new Animator(
        spritesheet, 
        64, 
        64, 
        0.1, 
        8);
    } else {
      this.animator = null;
    }
  }

  getRect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  get bounds() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update() {
    if (this.state.status !== "playing") return;
    if (this.state.playerState !== "NORMAL") return;
    // If hidden, don't move (simple + clear)
    if (this.hidden) return;

    let vx = 0;
    let vy = 0;
    if (this.game.keys["w"] || this.game.keys["ArrowUp"]) vy -= 1;
    if (this.game.keys["s"] || this.game.keys["ArrowDown"]) vy += 1;
    if (this.game.keys["a"] || this.game.keys["ArrowLeft"]) vx -= 1;
    if (this.game.keys["d"] || this.game.keys["ArrowRight"]) vx += 1;

    // Normalize diagonal (and any combined input)
    const isMoving = vx !== 0 || vy !== 0;
    if(isMoving){
      const len = Math.hypot(vx, vy);
      vx /= len;
      vy /= len;
      this.lastDir = { x: vx, y: vy };
      this.currentDirection = getDirectionIndex(vx, vy); //sends the direction index
    }

    const dt = this.game.clockTick;
    const dx = vx * this.speed * dt;
    const dy = vy * this.speed * dt;

    moveWithWalls(this, dx, dy, this.level.walls);

    if(this.animator) {
      this.animator.update(dt, isMoving);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.hidden ? 0.35 : 1.0;

    //draw the player, else fall back to rect
    if(this.animator) {
      this.animator.draw(
        ctx,
        this.x + this.drawOffsetX,
        this.y + this.drawOffsetY,
        this.drawW,
        this.drawH,
        this.currentDirection
      );
    } else {
      ctx.fillStyle = this.hidden ? "rgba(0,150,0,0.6)" : "rgba(0,180,0,1)";
      ctx.fillRect(
        this.x + this.drawOffsetX,
        this.y + this.drawOffsetY,
        this.drawW,
        this.drawH
      );
    }

    ctx.restore();
  }
}
