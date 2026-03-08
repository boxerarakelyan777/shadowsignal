// src/entities/camera.js
class SecurityCamera {
  constructor(game, level, state, player, config = {}, cameraId = 0) {
    this.game = game;
    this.level = level;
    this.state = state;
    this.player = player;
    this.cameraId = cameraId;

    this.x = numberOr(config.x, 0);
    this.y = numberOr(config.y, 0);
    this.w = numberOr(config.w, 28);
    this.h = numberOr(config.h, 28);

    this.name = config.name || `Camera ${cameraId + 1}`;

    this.baseFacing = numberOr(config.facing, 0);
    this.facing = this.baseFacing;

    this.visionRange = numberOr(config.visionRange, 300);

    this.fovDeg = numberOr(config.fovDeg, 60);
    this.fov = (this.fovDeg * Math.PI) / 180;

    this.sweepDeg = numberOr(config.sweepDeg, 90);
    this.sweep = (this.sweepDeg * Math.PI) / 180;

    this.minAngle = normalizeAngle(this.baseFacing - this.sweep / 2);
    this.maxAngle = normalizeAngle(this.baseFacing + this.sweep / 2);

    this.panSpeed = numberOr(config.panSpeed, 1.15);
    this.panDir = numberOr(config.startDirection, 1) >= 0 ? 1 : -1;

    this.closeDetectRange = numberOr(config.closeDetectRange, 46);

    this.detection = 0;
    this.detectionTime = numberOr(config.detectionTime, 0.55);
    this.detectionDecayTime = numberOr(config.detectionDecayTime, 0.4);

    this.alertRadius = numberOr(config.alertRadius, 540);
    this.alertCooldown = numberOr(config.alertCooldown, 1.1);
    this.cooldown = 0;

    this.disabled = !!config.disabled;
    this.removeFromWorld = false;
    this.isSecurityCamera = true;
  }

  update() {
    if (this.state.status !== "playing") return;
    if (this.disabled) return;

    const dt = this.game.clockTick;

    if (this.cooldown > 0) {
      this.cooldown -= dt;
      if (this.cooldown < 0) this.cooldown = 0;
    }

    this._updatePan(dt);

    const playerHiddenNow = this.player.hidden || this.state.playerState === "HIDDEN";
    let visionSample = null;

    if (!playerHiddenNow) {
      visionSample = this.canSeePlayerDetailed();

      if (visionSample.sees) {
        if (visionSample.closeDetect) {
          this.detection = 1;
        } else {
          const rise = dt / Math.max(0.05, this.detectionTime);
          this.detection = clamp(this.detection + rise, 0, 1);
        }
      } else {
        const decay = dt / Math.max(0.05, this.detectionDecayTime);
        this.detection = clamp(this.detection - decay, 0, 1);
      }
    } else {
      const decay = dt / Math.max(0.05, this.detectionDecayTime);
      this.detection = clamp(this.detection - decay, 0, 1);
    }

    if (!playerHiddenNow && visionSample && visionSample.sees && this.detection >= 1 && this.cooldown <= 0) {
      this._alertGuards(visionSample.playerCenter);
      this._emitNoise(visionSample.playerCenter);
      this.cooldown = this.alertCooldown;
    }

    if (!this.state.debugInfo) this.state.debugInfo = {};
    if (!Array.isArray(this.state.debugInfo.cameras)) this.state.debugInfo.cameras = [];

    this.state.debugInfo.cameras[this.cameraId] = {
      id: this.cameraId,
      name: this.name,
      detection: this.detection,
      sees: !!visionSample?.sees,
      inRange: !!visionSample?.inRange,
      inFov: !!visionSample?.inFov,
      hasLos: !!visionSample?.hasLos,
      disabled: this.disabled,
    };
  }

  canSeePlayerDetailed() {
    const c = centerOf(this);
    const p = centerOf(this.player);

    const vx = p.x - c.x;
    const vy = p.y - c.y;
    const dist = Math.hypot(vx, vy);

    const inRange = dist <= this.visionRange;

    const angleToPlayer = Math.atan2(vy, vx);
    const diff = Math.abs(normalizeAngle(angleToPlayer - this.facing));
    const inFov = diff <= this.fov / 2;

    const hasLos = inRange && inFov ? hasLineOfSight(c, p, this.level.walls) : false;
    const closeDetect = hasLos && dist <= this.closeDetectRange;

    return {
      inRange,
      inFov,
      hasLos,
      closeDetect,
      sees: inRange && inFov && hasLos,
      cameraCenter: c,
      playerCenter: p,
    };
  }

  draw(ctx) {
    const nonGameplayScreens = ["splash", "menu", "level_select", "credits", "loading"];
    if (nonGameplayScreens.includes(this.state.status)) return;
    if (this.disabled) return;

    const c = centerOf(this);
    this._drawVisionCone(ctx, c);

    let bodyColor = "rgba(90, 180, 255, 1)";
    if (this.detection >= 1) bodyColor = "rgba(255, 90, 90, 1)";
    else if (this.detection > 0.01) bodyColor = "rgba(255, 200, 90, 1)";

    ctx.save();

    ctx.fillStyle = "rgba(20, 30, 42, 0.95)";
    ctx.fillRect(this.x - 2, this.y - 2, this.w + 4, this.h + 4);

    ctx.fillStyle = bodyColor;
    ctx.fillRect(this.x, this.y, this.w, this.h);

    ctx.strokeStyle = "rgba(235, 245, 255, 0.95)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(
      c.x + Math.cos(this.facing) * Math.max(10, this.w * 0.85),
      c.y + Math.sin(this.facing) * Math.max(10, this.h * 0.85)
    );
    ctx.stroke();

    ctx.restore();
  }

  reset() {
    this.facing = this.baseFacing;
    this.panDir = 1;
    this.detection = 0;
    this.cooldown = 0;
    this.disabled = false;
  }

  _updatePan(dt) {
    this.facing += this.panDir * this.panSpeed * dt;

    const rel = normalizeAngle(this.facing - this.baseFacing);
    const halfSweep = this.sweep / 2;

    if (rel > halfSweep) {
      this.facing = this.baseFacing + halfSweep;
      this.panDir = -1;
    } else if (rel < -halfSweep) {
      this.facing = this.baseFacing - halfSweep;
      this.panDir = 1;
    }

    this.facing = normalizeAngle(this.facing);
  }

  _alertGuards(target) {
    const list = Array.isArray(this.game.entities) ? this.game.entities : [];
    const guards = list.filter(entity => entity && entity.isGuard);

    for (const guard of guards) {
      const gc = centerOf(guard);
      const dist = Math.hypot(gc.x - target.x, gc.y - target.y);
      if (dist > this.alertRadius) continue;
      if (guard.aiState === "CHASE") continue;

      guard.lastSeen = { x: target.x, y: target.y };
      guard.lastSeenFacing = this.facing;
      guard.detection = Math.max(guard.detection, 0.45);
      guard.aiState = "INVESTIGATE";
      guard.investigateTarget = { x: target.x, y: target.y };
      guard.investigatePauseTimer = 0;
    }
  }

  _emitNoise(target) {
    if (!Array.isArray(this.state.noiseEvents)) this.state.noiseEvents = [];

    const nextId = numberOr(this.state.nextNoiseId, 1);
    this.state.nextNoiseId = nextId + 1;

    const noise = {
      id: nextId,
      x: target.x,
      y: target.y,
      radius: this.alertRadius,
      ttl: 0.55,
      life: 0.55,
      source: "camera",
    };

    this.state.noise = noise;
    this.state.noiseEvents.push(noise);
  }

  _drawVisionCone(ctx, origin) {
    const left = this.facing - this.fov / 2;
    const right = this.facing + this.fov / 2;
    const points = this._buildVisionPolygon(origin, left, right, this.visionRange);
    if (!points.length) return;

    ctx.save();

    const radial = ctx.createRadialGradient(
      origin.x,
      origin.y,
      8,
      origin.x,
      origin.y,
      this.visionRange
    );

    if (this.detection >= 1) {
      radial.addColorStop(0, "rgba(255, 120, 110, 0.18)");
      radial.addColorStop(0.65, "rgba(255, 88, 78, 0.11)");
      radial.addColorStop(1, "rgba(255, 72, 60, 0.02)");
      ctx.strokeStyle = "rgba(255, 150, 140, 0.30)";
    } else if (this.detection > 0.01) {
      radial.addColorStop(0, "rgba(255, 210, 100, 0.14)");
      radial.addColorStop(0.65, "rgba(255, 182, 88, 0.09)");
      radial.addColorStop(1, "rgba(255, 160, 76, 0.02)");
      ctx.strokeStyle = "rgba(255, 220, 150, 0.24)";
    } else {
      radial.addColorStop(0, "rgba(110, 205, 255, 0.12)");
      radial.addColorStop(0.65, "rgba(98, 178, 255, 0.07)");
      radial.addColorStop(1, "rgba(78, 150, 255, 0.016)");
      ctx.strokeStyle = "rgba(150, 220, 255, 0.20)";
    }

    ctx.fillStyle = radial;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    for (const point of points) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.closePath();
    ctx.fill();

    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    ctx.restore();
  }

  _buildVisionPolygon(origin, leftAngle, rightAngle, maxDist) {
    const span = Math.max(0.0001, rightAngle - leftAngle);
    const rayCount = Math.max(42, Math.min(110, Math.round(maxDist / 5)));
    const walls = this._getVisionBlockingWalls();
    const points = [];

    for (let i = 0; i <= rayCount; i++) {
      const t = i / rayCount;
      const angle = leftAngle + span * t;
      points.push(this._castVisionRay(origin, angle, maxDist, walls));
    }

    return points;
  }

  _castVisionRay(origin, angle, maxDist, walls) {
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const endX = origin.x + dirX * maxDist;
    const endY = origin.y + dirY * maxDist;
    const rayMinX = Math.min(origin.x, endX);
    const rayMinY = Math.min(origin.y, endY);
    const rayMaxX = Math.max(origin.x, endX);
    const rayMaxY = Math.max(origin.y, endY);

    let bestT = maxDist;

    for (const wall of walls) {
      if (!wall) continue;
      if (wall.x > rayMaxX || wall.x + wall.w < rayMinX || wall.y > rayMaxY || wall.y + wall.h < rayMinY) {
        continue;
      }

      const t = this._rayAabbHitDistance(origin.x, origin.y, dirX, dirY, maxDist, wall);
      if (t !== null && t >= 0 && t < bestT) {
        bestT = Math.max(0, t - 1e-6);
      }
    }

    return {
      x: origin.x + dirX * bestT,
      y: origin.y + dirY * bestT,
    };
  }

  _rayAabbHitDistance(originX, originY, dirX, dirY, maxDist, wall) {
    const minX = wall.x;
    const minY = wall.y;
    const maxX = wall.x + wall.w;
    const maxY = wall.y + wall.h;
    const eps = 1e-6;

    let tMin = 0;
    let tMax = maxDist;

    if (Math.abs(dirX) <= eps) {
      if (originX <= minX || originX >= maxX) return null;
    } else {
      let tx1 = (minX - originX) / dirX;
      let tx2 = (maxX - originX) / dirX;
      if (tx1 > tx2) {
        const temp = tx1;
        tx1 = tx2;
        tx2 = temp;
      }
      tMin = Math.max(tMin, tx1);
      tMax = Math.min(tMax, tx2);
      if (tMax < tMin) return null;
    }

    if (Math.abs(dirY) <= eps) {
      if (originY <= minY || originY >= maxY) return null;
    } else {
      let ty1 = (minY - originY) / dirY;
      let ty2 = (maxY - originY) / dirY;
      if (ty1 > ty2) {
        const temp = ty1;
        ty1 = ty2;
        ty2 = temp;
      }
      tMin = Math.max(tMin, ty1);
      tMax = Math.min(tMax, ty2);
      if (tMax < tMin) return null;
    }

    if (tMax < 0 || tMin > maxDist) return null;
    return Math.max(0, tMin);
  }

  _getVisionBlockingWalls() {
    const walls = Array.isArray(this.level?.walls) ? this.level.walls : [];
    return walls.filter(wall => {
      if (!wall) return false;
      if (
        !Number.isFinite(wall.x) ||
        !Number.isFinite(wall.y) ||
        !Number.isFinite(wall.w) ||
        !Number.isFinite(wall.h) ||
        wall.w <= 0 ||
        wall.h <= 0
      ) {
        return false;
      }
      if (wall.componentType === "lockedDoor" && (wall.locked === false || wall.state === "OPEN")) {
        return false;
      }
      return true;
    });
  }
}

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}