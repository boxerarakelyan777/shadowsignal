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
    this.visualClock = 0;
    this.eyeIconSpec = resolveUiIconSpec("eye");
    this.warningIconSpec = resolveUiIconSpec("warning");
    this.eyeIconImage = resolveSprite(this.eyeIconSpec?.path);
    this.warningIconImage = resolveSprite(this.warningIconSpec?.path);

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
    this.startPanDir = numberOr(config.startDirection, 1) >= 0 ? 1 : -1;
    this.panDir = this.startPanDir;
    this.edgePauseDuration = Math.max(0, numberOr(config.edgePauseDuration, 0.28));
    this.edgePauseTimer = 0;

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
    this.visualClock += dt;

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
    this._drawBody(ctx, c);
    this._drawStatusGlyph(ctx, c);
  }

  reset() {
    this.facing = this.baseFacing;
    this.panDir = this.startPanDir;
    this.edgePauseTimer = 0;
    this.detection = 0;
    this.cooldown = 0;
    this.disabled = false;
  }

  _updatePan(dt) {
    if (this.edgePauseTimer > 0) {
      this.edgePauseTimer -= dt;
      if (this.edgePauseTimer > 0) return;
      this.edgePauseTimer = 0;
    }

    this.facing += this.panDir * this.panSpeed * dt;

    const rel = normalizeAngle(this.facing - this.baseFacing);
    const halfSweep = this.sweep / 2;

    if (rel > halfSweep) {
      this.facing = this.baseFacing + halfSweep;
      this.panDir = -1;
      this.edgePauseTimer = this.edgePauseDuration;
    } else if (rel < -halfSweep) {
      this.facing = this.baseFacing - halfSweep;
      this.panDir = 1;
      this.edgePauseTimer = this.edgePauseDuration;
    }

    this.facing = normalizeAngle(this.facing);
  }

  _drawBody(ctx, center) {
    const alertAmount = clamp(this.detection, 0, 1);
    const pulse = 0.5 + Math.sin(this.visualClock * 8 + this.cameraId * 0.9) * 0.5;
    const housingW = this.w * 1.16;
    const housingH = this.h * 0.82;
    const lensR = Math.max(5.6, this.h * 0.24);
    const armW = this.w * 0.5;
    const armH = Math.max(6, this.h * 0.3);

    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(this.facing);

    // Wall mount arm and joint.
    ctx.fillStyle = "rgba(15, 23, 32, 0.95)";
    roundedRectPath(ctx, -housingW * 0.92, -armH * 0.5, armW, armH, Math.max(2, armH * 0.24));
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-housingW * 0.43, 0, Math.max(4, this.h * 0.18), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(36, 56, 74, 0.95)";
    ctx.fill();

    // Camera housing.
    const housingGrad = ctx.createLinearGradient(-housingW * 0.3, -housingH, housingW * 0.9, housingH);
    housingGrad.addColorStop(0, "rgba(56, 76, 98, 0.96)");
    housingGrad.addColorStop(0.55, "rgba(31, 47, 66, 0.96)");
    housingGrad.addColorStop(1, "rgba(18, 28, 42, 0.96)");
    roundedRectPath(
      ctx,
      -housingW * 0.34,
      -housingH * 0.5,
      housingW,
      housingH,
      Math.max(3, housingH * 0.3)
    );
    ctx.fillStyle = housingGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(175, 228, 255, 0.32)";
    ctx.lineWidth = 1.25;
    ctx.stroke();

    // Lens assembly.
    const lensX = housingW * 0.33;
    ctx.beginPath();
    ctx.arc(lensX, 0, lensR * 1.28, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(9, 16, 24, 0.96)";
    ctx.fill();

    const lensGrad = ctx.createRadialGradient(
      lensX - lensR * 0.45,
      -lensR * 0.35,
      lensR * 0.12,
      lensX,
      0,
      lensR * 1.15
    );
    if (alertAmount >= 1) {
      lensGrad.addColorStop(0, "rgba(255, 158, 150, 0.95)");
      lensGrad.addColorStop(0.35, "rgba(255, 86, 82, 0.92)");
      lensGrad.addColorStop(1, "rgba(89, 24, 22, 0.95)");
    } else if (alertAmount > 0.02) {
      lensGrad.addColorStop(0, "rgba(255, 228, 180, 0.95)");
      lensGrad.addColorStop(0.36, "rgba(255, 176, 92, 0.9)");
      lensGrad.addColorStop(1, "rgba(88, 54, 24, 0.95)");
    } else {
      lensGrad.addColorStop(0, "rgba(178, 240, 255, 0.95)");
      lensGrad.addColorStop(0.36, "rgba(96, 184, 255, 0.88)");
      lensGrad.addColorStop(1, "rgba(24, 52, 88, 0.95)");
    }
    ctx.beginPath();
    ctx.arc(lensX, 0, lensR, 0, Math.PI * 2);
    ctx.fillStyle = lensGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(210, 240, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Lens icon overlay reads more like a "device" than a plain block.
    const eyeSize = lensR * 1.25;
    this._drawUiIcon(
      ctx,
      this.eyeIconImage,
      this.eyeIconSpec,
      lensX - eyeSize * 0.5,
      -eyeSize * 0.5,
      eyeSize,
      eyeSize,
      0.8 + alertAmount * 0.2
    );

    // Status light beacon.
    const beaconX = -housingW * 0.04;
    const beaconY = -housingH * 0.34;
    const beaconR = Math.max(2.2, this.h * 0.11 + pulse * 0.7);
    ctx.beginPath();
    ctx.arc(beaconX, beaconY, beaconR, 0, Math.PI * 2);
    if (alertAmount >= 1) ctx.fillStyle = `rgba(255, 104, 96, ${0.9 + pulse * 0.08})`;
    else if (alertAmount > 0.02) ctx.fillStyle = `rgba(255, 196, 92, ${0.78 + pulse * 0.12})`;
    else ctx.fillStyle = `rgba(102, 210, 255, ${0.6 + pulse * 0.2})`;
    ctx.fill();

    // Facing pointer.
    ctx.strokeStyle = "rgba(232, 246, 255, 0.76)";
    ctx.lineWidth = 1.35;
    ctx.beginPath();
    ctx.moveTo(lensX + lensR * 0.35, 0);
    ctx.lineTo(lensX + lensR * 1.35, 0);
    ctx.stroke();

    ctx.restore();
  }

  _drawStatusGlyph(ctx, center) {
    if (!this.warningIconImage || !this.warningIconSpec || this.detection <= 0.45) return;

    const pulse = 0.55 + Math.sin(this.visualClock * 7 + this.cameraId * 0.6) * 0.45;
    const size = Math.max(12, this.w * 0.88);
    const alpha = Math.min(1, 0.34 + this.detection * 0.56) * (0.72 + pulse * 0.28);
    this._drawUiIcon(
      ctx,
      this.warningIconImage,
      this.warningIconSpec,
      center.x - size * 0.5,
      center.y - this.h * 1.38,
      size,
      size,
      alpha
    );
  }

  _drawUiIcon(ctx, image, spec, x, y, w, h, alpha = 1) {
    if (!image || !spec || alpha <= 0) return;

    const frameW = Math.max(1, numberOr(spec.frameW, 32));
    const frameH = Math.max(1, numberOr(spec.frameH, frameW));
    const frames = Math.max(1, numberOr(spec.frames, 1));
    const fps = Math.max(1, numberOr(spec.fps, 8));
    const frame = Math.floor(this.visualClock * fps) % frames;

    ctx.save();
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, frame * frameW, 0, frameW, frameH, x, y, w, h);
    ctx.restore();
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

function resolveUiIconSpec(iconId) {
  if (typeof getArtPackUiIconSpec !== "function") return null;
  return getArtPackUiIconSpec(iconId) || null;
}

function resolveSprite(path) {
  if (!path || typeof ASSET_MANAGER === "undefined") return null;
  return ASSET_MANAGER.getAsset(path) || null;
}

function roundedRectPath(ctx, x, y, w, h, radius) {
  const r = Math.max(0, Math.min(radius, Math.abs(w) * 0.5, Math.abs(h) * 0.5));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
