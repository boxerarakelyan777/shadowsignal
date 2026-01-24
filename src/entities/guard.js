// src/entities/guard.js
class Guard {
  constructor(game, level, state, player) {
    this.game = game;
    this.level = level;
    this.state = state;
    this.player = player;

    this.x = level.guard.x;
    this.y = level.guard.y;
    this.w = level.guard.w;
    this.h = level.guard.h;

    this.speed = 140;
    this.waypoints = level.guard.waypoints;
    this.wpIndex = 0;

    // Vision parameters (V1)
    this.visionRange = 320;
    this.fov = (80 * Math.PI) / 180; // 80 degrees
    this.facing = 0;

    // Debug
    this._stuckTimer = 0;
    this._lastX = this.x;
    this._lastY = this.y;

    this.removeFromWorld = false;

    // Ensure debug object exists
    if (!this.state.debug) this.state.debug = {};
  }

  update() {
    if (this.state.status !== "playing") return;

    // Patrol toward current waypoint
    const target = this.waypoints[this.wpIndex];
    const c = centerOf(this);
    const dx = target.x - c.x;
    const dy = target.y - c.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 8) {
      this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
    } else {
      const dirX = dx / dist;
      const dirY = dy / dist;
      this.facing = Math.atan2(dirY, dirX);

      const dt = this.game.clockTick;
      const mx = dirX * this.speed * dt;
      const my = dirY * this.speed * dt;

      const oldX = this.x;
      const oldY = this.y;

      moveWithWalls(this, mx, my, this.level.walls);

      // Unstuck: if we didn't move, skip to next waypoint after a short time
      const moved = Math.hypot(this.x - oldX, this.y - oldY);
      if (moved < 0.5) {
        this._stuckTimer += dt;
        if (this._stuckTimer > 0.35) {
          this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
          this._stuckTimer = 0;
        }
      } else {
        this._stuckTimer = 0;
      }
    }

    // Detection check (ignore if player hidden)
    const debug = this.state.debug;
    debug.sees = false;
    debug.inRange = false;
    debug.inFov = false;
    debug.hasLos = false;

    if (!this.player.hidden) {
      const result = this.canSeePlayerDetailed();
      debug.inRange = result.inRange;
      debug.inFov = result.inFov;
      debug.hasLos = result.hasLos;
      debug.sees = result.sees;

      if (result.sees) {
        this.state.status = "lost";
      }
    }
  }

  canSeePlayerDetailed() {
    const g = centerOf(this);
    const p = centerOf(this.player);

    const vx = p.x - g.x;
    const vy = p.y - g.y;
    const dist = Math.hypot(vx, vy);

    const inRange = dist <= this.visionRange;

    const angleToP = Math.atan2(vy, vx);
    const diff = Math.abs(normalizeAngle(angleToP - this.facing));
    const inFov = diff <= this.fov / 2;

    const hasLos = inRange && inFov ? hasLineOfSight(g, p, this.level.walls) : false;

    return {
      inRange,
      inFov,
      hasLos,
      sees: inRange && inFov && hasLos,
      guardCenter: g,
      playerCenter: p,
    };
  }

  draw(ctx) {
    // Guard body
    ctx.fillStyle = "rgba(180,0,0,1)";
    ctx.fillRect(this.x, this.y, this.w, this.h);

    // Vision cone
    const g = centerOf(this);
    const left = this.facing - this.fov / 2;
    const right = this.facing + this.fov / 2;

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "rgba(255,200,0,1)";
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(left) * this.visionRange, g.y + Math.sin(left) * this.visionRange);
    ctx.lineTo(g.x + Math.cos(right) * this.visionRange, g.y + Math.sin(right) * this.visionRange);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Debug LOS line if in range+fov (green = LOS, red = blocked)
    if (!this.player.hidden) {
      const res = this.canSeePlayerDetailed();
      if (res.inRange && res.inFov) {
        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = res.hasLos ? "rgba(0,180,0,0.9)" : "rgba(220,0,0,0.9)";
        ctx.beginPath();
        ctx.moveTo(res.guardCenter.x, res.guardCenter.y);
        ctx.lineTo(res.playerCenter.x, res.playerCenter.y);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}
