// src/entities/guard.js
class Guard {
  constructor(game, level, state, player, spritesheet) {
    this.game = game;
    this.level = level;
    this.state = state;
    this.player = player;

    this.x = level.guard.x;
    this.y = level.guard.y;
    this.w = level.guard.w;
    this.h = level.guard.h;
    this.startX = this.x;
    this.startY = this.y;

    this.speed = 90;
    this.waypoints = level.guard.waypoints || [];
    this.wpIndex = 0;
    this.startWpIndex = this.wpIndex;

    this.visionRange = 320;
    this.fov = (80 * Math.PI) / 180;
    this.facing = 0;

    this.currentDirection = 0; //<- animator

    this.aiState = "PATROL";

    this._stuckTimer = 0;
    this._lastX = this.x;
    this._lastY = this.y;

    this.removeFromWorld = false;
    this.isGuard = true;

    if (!this.state.debugInfo) this.state.debugInfo = {};

    if(spritesheet) {
      this.animator = new Animator(
        spritesheet, 
        64, 
        64, 
        0.12, 
        8);
    } else {
      this.animator = null;
    }
  }

  update() {
    if (this.state.status !== "playing") return;

    let isMoving = false;

    // 🔴 IMPORTANT FIX: hiding immediately breaks chase
    if (this.player.hidden || this.state.playerState === "HIDDEN") {
      if (this.aiState === "CHASE") {
        this.aiState = "RETURN";
      }
    }

    const c = centerOf(this);
    const noise = this.state.noise;

    let target = null;

    if (this.aiState === "PATROL") {
      target = noise
        ? { x: noise.x, y: noise.y }
        : this.waypoints[this.wpIndex];
    } else if (this.aiState === "CHASE") {
      target = centerOf(this.player);
    } else if (this.aiState === "RETURN") {
      target = this.waypoints[this.wpIndex];
    }

    if (target) {
      const dx = target.x - c.x;
      const dy = target.y - c.y;
      const dist = Math.hypot(dx, dy);

      if (this.aiState === "PATROL" && !noise && dist < 8 && this.waypoints.length) {
        this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
      } else if (this.aiState === "RETURN" && dist < 8) {
        this.aiState = "PATROL";
      } else if (dist >= 1) {
        const dirX = dx / dist;
        const dirY = dy / dist;
        this.facing = Math.atan2(dirY, dirX);
        this.currentDirection = getDirectionIndex(dirX, dirY); 

        const dt = this.game.clockTick;
        const mx = dirX * this.speed * dt;
        const my = dirY * this.speed * dt;
        const oldX = this.x;
        const oldY = this.y;
        moveWithWalls(this, mx, my, this.level.walls);

        const moved = Math.hypot(this.x - oldX, this.y - oldY);
        isMoving = moved > 0.5;

        if (this.aiState === "PATROL" && !noise && moved < 0.5 && this.waypoints.length) {
          this._stuckTimer += dt;
          if (this._stuckTimer > 0.35) {
            this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
            this._stuckTimer = 0;
          }
        } else if (this.aiState === "PATROL") {
          this._stuckTimer = 0;
        }
      }
    }

    if(this.animator){
      this.animator.update(this.game.clockTick, isMoving);
    }

    const debugInfo = this.state.debugInfo || (this.state.debugInfo = {});
    debugInfo.sees = false;
    debugInfo.inRange = false;
    debugInfo.inFov = false;
    debugInfo.hasLos = false;

    if (!(this.player.hidden || this.state.playerState === "HIDDEN")) {
      const result = this.canSeePlayerDetailed();
      debugInfo.inRange = result.inRange;
      debugInfo.inFov = result.inFov;
      debugInfo.hasLos = result.hasLos;
      debugInfo.sees = result.sees;

      if (result.sees) {
        this.aiState = "CHASE";
      } else if (this.aiState === "CHASE") {
        this.aiState = "RETURN";
      }

      if (this.aiState === "CHASE" && rectsIntersect(this, this.player)) {
        this.state.playerState = "CAPTURED";
        this.state.status = "lost";
        return;
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
    if(this.animator) {
      this.animator.draw(
        ctx, 
        this.x, 
        this.y, 
        48, 48, 
        this.currentDirection
      );
    } else {
      ctx.fillStyle = "rgba(180,0,0,1)";
      ctx.fillRect(this.x, this.y, this.w, this.h);
    }

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

    if (!(this.player.hidden || this.state.playerState === "HIDDEN")) {
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

  reset() {
    this.x = this.startX;
    this.y = this.startY;
    this.wpIndex = this.startWpIndex;
    this._stuckTimer = 0;
    this._lastX = this.startX;
    this._lastY = this.startY;
    this.facing = 0;
    this.currentDirection = 0;
    this.aiState = "PATROL";
    if(this.animator) {
      this.animator.currentFrame = 0;
      this.animator.elapsedTime = 0;
    }
  }
}