// src/entities/guard.js
class Guard {
  constructor(game, level, state, player, guardConfig = null, guardId = 0) {
    this.game = game;
    this.level = level;
    this.state = state;
    this.player = player;
    this.guardId = guardId;

    const fallbackConfig =
      guardConfig ||
      level.guard ||
      (Array.isArray(level.guards) ? level.guards[0] : null) ||
      {};

    this.config = fallbackConfig;
    this.name = fallbackConfig.name || `Guard ${guardId + 1}`;

    this.x = numberOr(fallbackConfig.x, 0);
    this.y = numberOr(fallbackConfig.y, 0);
    this.w = numberOr(fallbackConfig.w, 28);
    this.h = numberOr(fallbackConfig.h, 28);
    this.startX = this.x;
    this.startY = this.y;

    const guardDefaults = (typeof TUNING !== "undefined" && TUNING.guard) ? TUNING.guard : {};

    this.patrolSpeed = numberOr(
      fallbackConfig.patrolSpeed,
      numberOr(guardDefaults.patrolSpeed, 90)
    );
    this.chaseSpeed = numberOr(
      fallbackConfig.chaseSpeed,
      numberOr(guardDefaults.chaseSpeed, this.patrolSpeed)
    );
    this.returnSpeed = numberOr(
      fallbackConfig.returnSpeed,
      numberOr(guardDefaults.returnSpeed, this.patrolSpeed)
    );
    this.speed = this.patrolSpeed;

    this.waypoints = Array.isArray(fallbackConfig.waypoints) ? fallbackConfig.waypoints : [];
    this.wpIndex = numberOr(fallbackConfig.startWpIndex, 0);
    if (this.waypoints.length) {
      this.wpIndex = Math.max(0, Math.min(this.waypoints.length - 1, this.wpIndex));
    } else {
      this.wpIndex = 0;
    }
    this.startWpIndex = this.wpIndex;

    this.visionRange = numberOr(
      fallbackConfig.visionRange,
      numberOr(guardDefaults.visionRange, 320)
    );
    const fovDeg = numberOr(fallbackConfig.fovDeg, numberOr(guardDefaults.fovDeg, 80));
    this.fov = (fovDeg * Math.PI) / 180;
    this.waypointReachDistance = numberOr(
      fallbackConfig.waypointReachDistance,
      numberOr(guardDefaults.waypointReachDistance, 8)
    );
    this.stuckMoveThreshold = numberOr(
      fallbackConfig.stuckMoveThreshold,
      numberOr(guardDefaults.stuckMoveThreshold, 0.5)
    );
    this.stuckAdvanceDelay = numberOr(
      fallbackConfig.stuckAdvanceDelay,
      numberOr(guardDefaults.stuckAdvanceDelay, 0.35)
    );
    this.facing = 0;

    this.aiState = "PATROL";
    this.investigateTarget = null;
    this.investigatePauseTimer = 0;
    this.investigatePauseDuration = numberOr(fallbackConfig.investigatePauseDuration, 0.6);

    this._stuckTimer = 0;
    this._lastX = this.x;
    this._lastY = this.y;

    this.removeFromWorld = false;
    this.isGuard = true;

    if (!this.state.debugInfo) this.state.debugInfo = {};
    if (!Array.isArray(this.state.debugInfo.guards)) this.state.debugInfo.guards = [];
  }

  update() {
    if (this.state.status !== "playing") return;
    this.speed = this._speedForState();
    const dt = this.game.clockTick;

    if (this.player.hidden || this.state.playerState === "HIDDEN") {
      if (this.aiState === "CHASE") {
        this.aiState = "RETURN";
      }
    }

    const c = centerOf(this);
    const heardNoise = this._getHeardNoise(c);

    if (heardNoise && this.aiState !== "CHASE") {
      this.aiState = "INVESTIGATE";
      this.investigateTarget = { x: heardNoise.x, y: heardNoise.y };
      this.investigatePauseTimer = 0;
    }

    let target = null;

    if (this.aiState === "PATROL") {
      target = this.waypoints[this.wpIndex];
    } else if (this.aiState === "INVESTIGATE") {
      if (this.investigatePauseTimer <= 0 && this.investigateTarget) {
        target = this.investigateTarget;
      }
    } else if (this.aiState === "CHASE") {
      target = centerOf(this.player);
    } else if (this.aiState === "RETURN") {
      target = this.waypoints[this.wpIndex];
    }

    if (target) {
      const dx = target.x - c.x;
      const dy = target.y - c.y;
      const dist = Math.hypot(dx, dy);

      if (
        this.aiState === "PATROL" &&
        dist < this.waypointReachDistance &&
        this.waypoints.length
      ) {
        this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
      } else if (
        this.aiState === "INVESTIGATE" &&
        dist < this.waypointReachDistance &&
        this.investigatePauseTimer <= 0
      ) {
        this.investigatePauseTimer = this.investigatePauseDuration;
      } else if (this.aiState === "RETURN" && dist < this.waypointReachDistance) {
        this.aiState = "PATROL";
      } else if (dist >= 1) {
        const dirX = dx / dist;
        const dirY = dy / dist;
        this.facing = Math.atan2(dirY, dirX);

        const mx = dirX * this.speed * dt;
        const my = dirY * this.speed * dt;

        const oldX = this.x;
        const oldY = this.y;

        moveWithWalls(this, mx, my, this.level.walls);

        const moved = Math.hypot(this.x - oldX, this.y - oldY);
        if (
          this.aiState === "PATROL" &&
          moved < this.stuckMoveThreshold &&
          this.waypoints.length
        ) {
          this._stuckTimer += dt;
          if (this._stuckTimer > this.stuckAdvanceDelay) {
            this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
            this._stuckTimer = 0;
          }
        } else if (this.aiState === "PATROL") {
          this._stuckTimer = 0;
        }
      }
    }

    if (this.aiState === "INVESTIGATE" && this.investigatePauseTimer > 0) {
      this.investigatePauseTimer -= dt;
      if (this.investigatePauseTimer <= 0) {
        this.investigatePauseTimer = 0;
        this.investigateTarget = null;
        this.aiState = "RETURN";
      }
    }

    const debugInfo = this._getDebugSlot();
    debugInfo.id = this.guardId;
    debugInfo.name = this.name;
    debugInfo.aiState = this.aiState;
    debugInfo.hearsNoise = !!heardNoise;
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
        this.state.lastCaptureByGuardId = this.guardId;
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
    ctx.fillStyle = this._bodyColor();
    ctx.fillRect(this.x, this.y, this.w, this.h);

    const g = centerOf(this);
    const left = this.facing - this.fov / 2;
    const right = this.facing + this.fov / 2;

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = this._coneColor();
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
    this.aiState = "PATROL";
    this.speed = this.patrolSpeed;
    this.investigateTarget = null;
    this.investigatePauseTimer = 0;
  }

  _getHeardNoise(guardCenter) {
    const noise = this.state.noise;
    if (!noise) return null;

    const radius = numberOr(noise.radius, 0);
    const dx = noise.x - guardCenter.x;
    const dy = noise.y - guardCenter.y;
    const dist = Math.hypot(dx, dy);
    return dist <= radius ? noise : null;
  }

  _speedForState() {
    if (this.aiState === "CHASE") return this.chaseSpeed;
    if (this.aiState === "RETURN") return this.returnSpeed;
    if (this.aiState === "INVESTIGATE") return this.patrolSpeed;
    return this.patrolSpeed;
  }

  _bodyColor() {
    if (this.aiState === "CHASE") return "rgba(220,40,40,1)";
    if (this.aiState === "INVESTIGATE") return "rgba(210,110,20,1)";
    if (this.aiState === "RETURN") return "rgba(210,130,30,1)";
    return "rgba(180,0,0,1)";
  }

  _coneColor() {
    if (this.aiState === "CHASE") return "rgba(255,80,60,1)";
    if (this.aiState === "INVESTIGATE") return "rgba(255,150,50,1)";
    if (this.aiState === "RETURN") return "rgba(255,170,40,1)";
    return "rgba(255,200,0,1)";
  }

  _getDebugSlot() {
    const debugInfo = this.state.debugInfo || (this.state.debugInfo = {});
    if (!Array.isArray(debugInfo.guards)) debugInfo.guards = [];
    if (!debugInfo.guards[this.guardId]) debugInfo.guards[this.guardId] = {};
    return debugInfo.guards[this.guardId];
  }
}

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
