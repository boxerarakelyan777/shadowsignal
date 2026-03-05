// src/entities/guard.js
class Guard {
  constructor(game, level, state, player, guardConfig = null, guardId = 0, spriteSet = null) {
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

    this.type = (fallbackConfig.type || "").toString().toUpperCase();

    this.x = numberOr(fallbackConfig.x, 0);
    this.y = numberOr(fallbackConfig.y, 0);
    this.startX = this.x;
    this.startY = this.y;

    const guardDefaults = (typeof TUNING !== "undefined" && TUNING.guard) ? TUNING.guard : {};
    const componentDefaults = getComponentDefaults("guard");

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

    this.visionRange = numberOr(
      fallbackConfig.visionRange,
      numberOr(guardDefaults.visionRange, 320)
    );

    let fovDeg = numberOr(
      fallbackConfig.fovDeg,
      numberOr(guardDefaults.fovDeg, 80)
    );

    if (this.type === "WIDE") {
      fovDeg = numberOr(fallbackConfig.fovDeg, Math.max(fovDeg, 110));
      this.patrolSpeed = numberOr(fallbackConfig.patrolSpeed, Math.min(this.patrolSpeed, 80));
      this.chaseSpeed = numberOr(fallbackConfig.chaseSpeed, Math.min(this.chaseSpeed, 110));
      this.returnSpeed = numberOr(fallbackConfig.returnSpeed, Math.min(this.returnSpeed, 90));
      this.visionRange = numberOr(fallbackConfig.visionRange, Math.max(this.visionRange, 360));
    } else if (this.type === "FAST") {
      fovDeg = numberOr(fallbackConfig.fovDeg, Math.min(fovDeg, 65));
      this.patrolSpeed = numberOr(fallbackConfig.patrolSpeed, Math.max(this.patrolSpeed, 105));
      this.chaseSpeed = numberOr(fallbackConfig.chaseSpeed, Math.max(this.chaseSpeed, 150));
      this.returnSpeed = numberOr(fallbackConfig.returnSpeed, Math.max(this.returnSpeed, 120));
      this.visionRange = numberOr(fallbackConfig.visionRange, Math.min(this.visionRange, 300));
    }

    this.fov = (fovDeg * Math.PI) / 180;

    const rawWaypoints = Array.isArray(fallbackConfig.waypoints) ? fallbackConfig.waypoints : [];
    this.waypoints = rawWaypoints
      .map(point => ({ x: Number(point?.x), y: Number(point?.y) }))
      .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
    this.wpIndex = numberOr(fallbackConfig.startWpIndex, 0);
    if (this.waypoints.length) {
      this.wpIndex = Math.max(0, Math.min(this.waypoints.length - 1, this.wpIndex));
    } else {
      this.wpIndex = 0;
    }
    this.startWpIndex = this.wpIndex;

    this.w = numberOr(fallbackConfig.w, numberOr(componentDefaults.w, 28));
    this.h = numberOr(fallbackConfig.h, numberOr(componentDefaults.h, 28));
    this.drawW = numberOr(fallbackConfig.drawW, numberOr(componentDefaults.drawW, 48));
    this.drawH = numberOr(fallbackConfig.drawH, numberOr(componentDefaults.drawH, 48));
    this.drawOffsetX = (this.w - this.drawW) / 2;
    this.drawOffsetY = (this.h - this.drawH) / 2;
    this.waypointReachDistance = numberOr(
      fallbackConfig.waypointReachDistance,
      numberOr(guardDefaults.waypointReachDistance, 8)
    );
    this.closeDetectRange = numberOr(
      fallbackConfig.closeDetectRange,
      numberOr(guardDefaults.closeDetectRange, 54)
    );
    this.stuckMoveThreshold = numberOr(
      fallbackConfig.stuckMoveThreshold,
      numberOr(guardDefaults.stuckMoveThreshold, 0.5)
    );
    this.stuckAdvanceDelay = numberOr(
      fallbackConfig.stuckAdvanceDelay,
      numberOr(guardDefaults.stuckAdvanceDelay, 0.35)
    );

    this.detection = 0;
    this.detectionTime = numberOr(
      fallbackConfig.detectionTime,
      numberOr(guardDefaults.detectionTime, 0.9)
    );
    this.detectionDecayTime = numberOr(
      fallbackConfig.detectionDecayTime,
      numberOr(guardDefaults.detectionDecayTime, 0.8)
    );
    this.alertDecayWhileHidden = numberOr(
      fallbackConfig.alertDecayWhileHidden,
      numberOr(guardDefaults.alertDecayWhileHidden, 0.25)
    );

    this.searchPauseDuration = numberOr(
      fallbackConfig.searchPauseDuration,
      numberOr(guardDefaults.searchPauseDuration, 0.55)
    );
    this.searchSweepCount = Math.max(
      2,
      Math.min(
        4,
        Math.round(
          numberOr(fallbackConfig.searchSweepCount, numberOr(guardDefaults.searchSweepCount, 3))
        )
      )
    );
    this.searchSweepRadius = numberOr(
      fallbackConfig.searchSweepRadius,
      numberOr(guardDefaults.searchSweepRadius, 90)
    );
    this.searchRotateSpeed = numberOr(
      fallbackConfig.searchRotateSpeed,
      numberOr(guardDefaults.searchRotateSpeed, 2.4)
    );

    this.investigatePauseDuration = numberOr(
      fallbackConfig.investigatePauseDuration,
      numberOr(guardDefaults.investigatePauseDuration, 1.4)
    );
    this.investigateRotateSpeed = numberOr(
      fallbackConfig.investigateRotateSpeed,
      numberOr(guardDefaults.investigateRotateSpeed, 2.0)
    );

    this.hideSpotCheckRadius = numberOr(
      fallbackConfig.hideSpotCheckRadius,
      numberOr(guardDefaults.hideSpotCheckRadius, 110)
    );

    this.hideSpotHidePriorityRadius = numberOr(
      fallbackConfig.hideSpotHidePriorityRadius,
      numberOr(guardDefaults.hideSpotHidePriorityRadius, 95)
    );

    this.radioRadius = numberOr(
      fallbackConfig.radioRadius,
      numberOr(guardDefaults.radioRadius, 420)
    );

    this.facing = 0;
    this.currentDirection = 0;

    this.aiState = "PATROL";
    this.mode = "CALM";

    this.investigateTarget = null;
    this.investigatePauseTimer = 0;

    this.lastSeen = null;
    this.lastSeenFacing = 0;

    this.searchPlan = [];
    this.searchIndex = 0;
    this.searchPauseTimer = 0;
    this.lastHeardNoiseId = -1;

    this.speed = this.patrolSpeed;

    this._stuckTimer = 0;
    this._lastX = this.x;
    this._lastY = this.y;

    this._wasHiddenPrev = false;

    this._actionStuckTimer = 0;
    this._actionStuckTimeout = numberOr(
      fallbackConfig.actionStuckTimeout,
      numberOr(guardDefaults.actionStuckTimeout, 0.85)
    );
    this._chaseStuckTimer = 0;
    this.unstickProbeScale = numberOr(
      fallbackConfig.unstickProbeScale,
      numberOr(guardDefaults.unstickProbeScale, 0.85)
    );

    this.removeFromWorld = false;
    this.isGuard = true;

    if (!this.state.debugInfo) this.state.debugInfo = {};
    if (!Array.isArray(this.state.debugInfo.guards)) this.state.debugInfo.guards = [];

    this.animState = "idle";
    this.lastAnimState = "idle";
    this.animations = {};

    const guardSprites = resolveGuardSpriteSet(spriteSet);
    if (guardSprites.walk) {
      this.animations.walk = new Animator(guardSprites.walk, 64, 64, 0.12, 8, true);
    }
    if (guardSprites.idle) {
      this.animations.idle = new Animator(guardSprites.idle, 64, 64, 0.15, 12, true);
    }
    if (guardSprites.attack) {
      this.animations.attack = new Animator(guardSprites.attack, 96, 96, 0.07, 7, false);
    }

    if (!this.animations.idle && this.animations.walk) {
      this.animations.idle = this.animations.walk;
    }
  }

  update() {
    if (this.state.status !== "playing") return;

    const dt = this.game.clockTick;
    let isMoving = false;

    const c = centerOf(this);
    const heardNoise = this._getHeardNoise(c);
    const heardNoiseId = numberOr(heardNoise?.id, -1);
    const isNewNoise = heardNoise && (
      heardNoiseId < 0 || heardNoiseId !== this.lastHeardNoiseId
    );

    const playerHiddenNow = (this.player.hidden || this.state.playerState === "HIDDEN");
    const justBecameHidden = playerHiddenNow && !this._wasHiddenPrev;

    if (justBecameHidden) {
      if (this.aiState === "CHASE" || this.detection > 0.25) {
        const hideSpot = this._getActiveOrNearestHideSpotCenter(centerOf(this.player), this.hideSpotHidePriorityRadius);
        if (hideSpot) {
          this.lastSeen = { x: hideSpot.x, y: hideSpot.y };
          this.lastSeenFacing = this.facing;
          this._enterSearch(this.lastSeen, this.lastSeenFacing, hideSpot);
        } else if (this.lastSeen) {
          this._enterSearch(this.lastSeen, this.lastSeenFacing, null);
        } else {
          this.aiState = "RETURN";
        }
      }
    }

    if (playerHiddenNow) {
      const decay = dt / Math.max(0.05, this.alertDecayWhileHidden);
      this.detection = clamp(this.detection - decay, 0, 1);

      if (this.aiState === "CHASE") {
        if (this.lastSeen) {
          this._enterSearch(this.lastSeen, this.lastSeenFacing, null);
        } else {
          this.aiState = "RETURN";
        }
      }
    }

    const visionSample = (!playerHiddenNow) ? this.canSeePlayerDetailed() : null;
    const canNoiseOverrideChase = this.aiState !== "CHASE" || !visionSample || !visionSample.sees;

    if (isNewNoise && canNoiseOverrideChase) {
      this.aiState = "INVESTIGATE";
      this.investigateTarget = { x: heardNoise.x, y: heardNoise.y };
      this.investigatePauseTimer = 0;
      if (heardNoiseId >= 0) this.lastHeardNoiseId = heardNoiseId;
    }

    if (!playerHiddenNow && visionSample) {
      if (visionSample.sees) {
        if (visionSample.closeDetect) {
          this.detection = 1;
        } else {
          const rise = dt / Math.max(0.05, this.detectionTime);
          this.detection = clamp(this.detection + rise, 0, 1);
        }
        this.lastSeen = { x: visionSample.playerCenter.x, y: visionSample.playerCenter.y };
        this.lastSeenFacing = this.facing;

        if (this.detection >= 1) {
          if (this.aiState !== "CHASE") {
            this.aiState = "CHASE";
            this._radioAlert(this.lastSeen);
          }
        } else {
          if (this.aiState === "PATROL" || this.aiState === "RETURN") {
            this.aiState = "INVESTIGATE";
            this.investigateTarget = { x: this.lastSeen.x, y: this.lastSeen.y };
            this.investigatePauseTimer = 0;
          }
        }
      } else {
        const decay = dt / Math.max(0.05, this.detectionDecayTime);
        this.detection = clamp(this.detection - decay, 0, 1);

        if (this.aiState === "CHASE") {
          if (this.lastSeen) {
            this._enterSearch(this.lastSeen, this.lastSeenFacing, null);
          } else {
            this.aiState = "RETURN";
          }
        }
      }
    }

    this.speed = this._speedForState();

    let target = null;

    if (this.aiState === "PATROL") {
      this.mode = "CALM";
      target = this.waypoints[this.wpIndex];
    } else if (this.aiState === "INVESTIGATE") {
      this.mode = "SUSPICIOUS";
      if (this.investigatePauseTimer <= 0 && this.investigateTarget) {
        target = this.investigateTarget;
      }
    } else if (this.aiState === "CHASE") {
      this.mode = "ALERT";
      target = centerOf(this.player);
    } else if (this.aiState === "SEARCH") {
      this.mode = "ALERT";
      if (this.searchPauseTimer <= 0 && this.searchPlan.length) {
        target = this.searchPlan[this.searchIndex];
      }
    } else if (this.aiState === "RETURN") {
      this.mode = "SUSPICIOUS";
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
        this._actionStuckTimer = 0;
      } else if (
        this.aiState === "SEARCH" &&
        dist < this.waypointReachDistance &&
        this.searchPauseTimer <= 0
      ) {
        this.searchPauseTimer = this.searchPauseDuration;
        this._actionStuckTimer = 0;
      } else if (this.aiState === "RETURN" && dist < this.waypointReachDistance) {
        this.aiState = "PATROL";
      } else if (dist >= 1) {
        const dirX = dx / dist;
        const dirY = dy / dist;
        this.facing = Math.atan2(dirY, dirX);
        this.currentDirection = getDirectionIndex(dirX, dirY);

        const mx = dirX * this.speed * dt;
        const my = dirY * this.speed * dt;
        const oldX = this.x;
        const oldY = this.y;
        moveWithWalls(this, mx, my, this.level.walls);

        let moved = Math.hypot(this.x - oldX, this.y - oldY);
        if (moved < this.stuckMoveThreshold) {
          const recovered = this._attemptRecoveryMove(dirX, dirY, target, dt);
          if (recovered > moved) moved = recovered;
        }
        const nextCenter = centerOf(this);
        const nextDist = Math.hypot(target.x - nextCenter.x, target.y - nextCenter.y);
        const madeProgress = (dist - nextDist) > 0.1;
        isMoving = moved > this.stuckMoveThreshold;

        if (
          (this.aiState === "PATROL" || this.aiState === "RETURN") &&
          (moved < this.stuckMoveThreshold || !madeProgress) &&
          this.waypoints.length
        ) {
          this._stuckTimer += dt;
          if (this._stuckTimer > this.stuckAdvanceDelay) {
            this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
            this._stuckTimer = 0;
          }
        } else if (this.aiState === "PATROL" || this.aiState === "RETURN") {
          this._stuckTimer = 0;
        }

        if (this.aiState === "CHASE") {
          if (moved < this.stuckMoveThreshold || !madeProgress) {
            this._chaseStuckTimer += dt;
            if (this._chaseStuckTimer > this._actionStuckTimeout) {
              const stillSeesPlayer = !!(visionSample && visionSample.sees);
              if (!stillSeesPlayer) {
                if (this.lastSeen) {
                  this._enterSearch(this.lastSeen, this.lastSeenFacing, null);
                } else {
                  this.aiState = "RETURN";
                }
              }
              this._chaseStuckTimer = 0;
            }
          } else {
            this._chaseStuckTimer = 0;
          }
        }

        if (this.aiState === "INVESTIGATE" || this.aiState === "SEARCH") {
          if (moved < this.stuckMoveThreshold || !madeProgress) {
            this._actionStuckTimer += dt;
            if (this._actionStuckTimer > this._actionStuckTimeout) {
              if (this.aiState === "INVESTIGATE") {
                this.investigatePauseTimer = Math.max(this.investigatePauseTimer, this.investigatePauseDuration);
              } else if (this.aiState === "SEARCH") {
                this.searchPauseTimer = Math.max(this.searchPauseTimer, this.searchPauseDuration);
              }
              this._actionStuckTimer = 0;
            }
          } else {
            this._actionStuckTimer = 0;
          }
        }
      }
    }

    if (this.aiState === "INVESTIGATE" && this.investigatePauseTimer > 0) {
      this.investigatePauseTimer -= dt;
      const spin = this.investigateRotateSpeed * dt;
      this.facing = normalizeAngle(this.facing + spin);
      this.currentDirection = getDirectionIndex(Math.cos(this.facing), Math.sin(this.facing));
      if (this.investigatePauseTimer <= 0) {
        this.investigatePauseTimer = 0;
        this.investigateTarget = null;
        this.aiState = "RETURN";
      }
    }

    if (this.aiState === "SEARCH" && this.searchPauseTimer > 0) {
      this.searchPauseTimer -= dt;
      const spin = this.searchRotateSpeed * dt;
      this.facing = normalizeAngle(this.facing + spin);
      this.currentDirection = getDirectionIndex(Math.cos(this.facing), Math.sin(this.facing));
      if (this.searchPauseTimer <= 0) {
        this.searchPauseTimer = 0;
        if (this.searchPlan.length) {
          this.searchIndex += 1;
          if (this.searchIndex >= this.searchPlan.length) {
            this.searchPlan = [];
            this.searchIndex = 0;
            this.aiState = "RETURN";
          }
        } else {
          this.aiState = "RETURN";
        }
      }
    }

    this._updateAnimationState(isMoving);
    const currentAnim = this._getCurrentAnimation();
    if (currentAnim) {
      const shouldAnimate = this.animState === "walk" ||
        this.animState === "attack" ||
        (this.animState === "idle" && this.animations.idle !== this.animations.walk);
      currentAnim.update(dt, shouldAnimate);
      if (this.animState === "attack" && currentAnim.isComplete) {
        this.animState = isMoving ? "walk" : "idle";
      }
    }

    if (this.state.audio && typeof this.state.audio.onGuardMovement === "function") {
      const playerCenter = centerOf(this.player);
      this.state.audio.onGuardMovement(
        this.guardId,
        isMoving,
        dt,
        this.aiState,
        this.state.status,
        c,
        playerCenter
      );
    }

    const debugInfo = this._getDebugSlot();
    debugInfo.id = this.guardId;
    debugInfo.name = this.name;
    debugInfo.aiState = this.aiState;
    debugInfo.mode = this.mode;
    debugInfo.hearsNoise = !!heardNoise;
    debugInfo.detection = this.detection;
    debugInfo.sees = false;
    debugInfo.inRange = false;
    debugInfo.inFov = false;
    debugInfo.hasLos = false;
    debugInfo.closeDetect = false;

    if (!playerHiddenNow && visionSample) {
      debugInfo.inRange = visionSample.inRange;
      debugInfo.inFov = visionSample.inFov;
      debugInfo.hasLos = visionSample.hasLos;
      debugInfo.closeDetect = visionSample.closeDetect;
      debugInfo.sees = visionSample.sees;
    }

    // Contact capture is always active while the player is visible (fair stealth baseline).
    if (!playerHiddenNow && rectsIntersect(this, this.player)) {
      if (this.animations.attack) {
        this.animState = "attack";
        this.lastAnimState = "attack";
        this.animations.attack.reset();
      }
      this.state.playerState = "CAPTURED";
      this.state.status = "lost";
      this.state.lastCaptureByGuardId = this.guardId;
      return;
    }

    this._wasHiddenPrev = playerHiddenNow;
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
    const closeDetect = hasLos && dist <= this.closeDetectRange;

    return {
      inRange,
      inFov,
      hasLos,
      closeDetect,
      sees: inRange && inFov && hasLos,
      guardCenter: g,
      playerCenter: p,
    };
  }

  draw(ctx) {
    const nonGameplayScreens = ["splash", "menu", "level_select", "credits", "loading"];
    if (nonGameplayScreens.includes(this.state.status)) return;

    const g = centerOf(this);
    this._drawVisionCone(ctx, g);

    const currentAnim = this._getCurrentAnimation();
    if (currentAnim) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      currentAnim.draw(
        ctx,
        this.x + this.drawOffsetX,
        this.y + this.drawOffsetY,
        this.drawW,
        this.drawH,
        this.currentDirection
      );
      ctx.restore();
    } else {
      ctx.fillStyle = this._bodyColor();
      ctx.fillRect(
        this.x + this.drawOffsetX,
        this.y + this.drawOffsetY,
        this.drawW,
        this.drawH
      );
    }

    this._drawStateBeacon(ctx, g);

    if (this.state.debug && !(this.player.hidden || this.state.playerState === "HIDDEN")) {
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
    this.mode = "CALM";
    this.speed = this.patrolSpeed;

    this.detection = 0;

    this.investigateTarget = null;
    this.investigatePauseTimer = 0;

    this.lastSeen = null;
    this.lastSeenFacing = 0;

    this.searchPlan = [];
    this.searchIndex = 0;
    this.searchPauseTimer = 0;
    this.lastHeardNoiseId = -1;

    this._wasHiddenPrev = false;

    this._actionStuckTimer = 0;
    this._chaseStuckTimer = 0;

    this.animState = "idle";
    this.lastAnimState = "idle";
    for (const animation of Object.values(this.animations)) {
      if (!animation) continue;
      animation.currentFrame = 0;
      animation.elapsedTime = 0;
      animation.isComplete = false;
    }
  }

  _enterSearch(lastSeen, facingAtLoss, hideSpotTarget = null) {
    this.aiState = "SEARCH";
    this.searchPlan = [];
    this.searchIndex = 0;
    this.searchPauseTimer = this.searchPauseDuration;
    this._actionStuckTimer = 0;

    const plan = [];

    const base = { x: lastSeen.x, y: lastSeen.y };
    plan.push(base);

    if (hideSpotTarget) {
      plan.push({ x: hideSpotTarget.x, y: hideSpotTarget.y });
    } else {
      const hs = this._nearestHideSpotCenterNear(base, this.hideSpotCheckRadius);
      if (hs) plan.push(hs);
    }

    const baseFacing = numberOr(facingAtLoss, this.facing);
    const spread = Math.max(0.3, Math.min(1.2, this.fov * 0.6));
    const step = this.searchSweepCount > 1 ? (spread / (this.searchSweepCount - 1)) : 0;
    const start = baseFacing - spread / 2;

    for (let i = 0; i < this.searchSweepCount; i++) {
      const a = start + step * i;
      const px = base.x + Math.cos(a) * this.searchSweepRadius;
      const py = base.y + Math.sin(a) * this.searchSweepRadius;
      plan.push({ x: px, y: py });
    }

    this.searchPlan = plan;
    this.searchIndex = 0;
    this.searchPauseTimer = this.searchPauseDuration;
  }

  _getActiveOrNearestHideSpotCenter(playerCenter, radius) {
    const a = this.state.activeHideSpot;
    if (a && Number.isFinite(a.x) && Number.isFinite(a.y) && Number.isFinite(a.w) && Number.isFinite(a.h)) {
      return { x: a.x + a.w / 2, y: a.y + a.h / 2 };
    }
    return this._nearestHideSpotCenterNear(playerCenter, radius);
  }

  _nearestHideSpotCenterNear(point, radius) {
    const spots = Array.isArray(this.level.hideSpots) ? this.level.hideSpots : [];
    if (!spots.length) return null;

    let best = null;
    let bestD = Infinity;

    for (const h of spots) {
      const cx = h.x + h.w / 2;
      const cy = h.y + h.h / 2;
      const dx = cx - point.x;
      const dy = cy - point.y;
      const d = Math.hypot(dx, dy);
      if (d <= radius && d < bestD) {
        bestD = d;
        best = { x: cx, y: cy };
      }
    }

    return best;
  }

  _radioAlert(lastSeen) {
    if (!lastSeen) return;
    const others = this._getOtherGuards();
    if (!others.length) return;

    const selfC = centerOf(this);

    for (const g of others) {
      const gc = centerOf(g);
      const dist = Math.hypot(gc.x - selfC.x, gc.y - selfC.y);
      if (dist <= this.radioRadius) {
        if (g.aiState === "CHASE") continue;
        g.lastSeen = { x: lastSeen.x, y: lastSeen.y };
        g.lastSeenFacing = this.lastSeenFacing;
        g.detection = Math.max(g.detection, 0.35);
        g.aiState = "INVESTIGATE";
        g.investigateTarget = { x: lastSeen.x, y: lastSeen.y };
        g.investigatePauseTimer = 0;
      }
    }
  }

  _getOtherGuards() {
    const list = Array.isArray(this.game.entities) ? this.game.entities : [];
    if (!list.length) return [];
    return list.filter(e => e && e.isGuard && e !== this);
  }

  _getHeardNoise(guardCenter) {
    const events = Array.isArray(this.state.noiseEvents) && this.state.noiseEvents.length
      ? this.state.noiseEvents
      : (this.state.noise ? [this.state.noise] : []);
    if (!events.length) return null;

    let best = null;
    let bestDist = Infinity;
    let bestId = -Infinity;

    for (const noise of events) {
      if (!noise) continue;
      const nx = Number(noise.x);
      const ny = Number(noise.y);
      const radius = numberOr(noise.radius, 0);
      if (!Number.isFinite(nx) || !Number.isFinite(ny) || radius <= 0) continue;

      const dx = nx - guardCenter.x;
      const dy = ny - guardCenter.y;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) continue;

      const noiseId = numberOr(noise.id, -1);
      const isCloser = dist < bestDist - 0.001;
      const sameDistance = Math.abs(dist - bestDist) <= 0.001;
      const isNewer = noiseId > bestId;
      if (!best || isCloser || (sameDistance && isNewer)) {
        best = noise;
        bestDist = dist;
        bestId = noiseId;
      }
    }

    return best;
  }

  _speedForState() {
    if (this.aiState === "CHASE") return this.chaseSpeed;
    if (this.aiState === "RETURN") return this.returnSpeed;
    if (this.aiState === "SEARCH") return this.returnSpeed;
    if (this.aiState === "INVESTIGATE") return this.patrolSpeed;
    return this.patrolSpeed;
  }

  _attemptRecoveryMove(dirX, dirY, target, dt) {
    if (!target) return 0;

    const startX = this.x;
    const startY = this.y;
    const probeStep = Math.max(1, this.speed * dt * this.unstickProbeScale);
    const targetDist = (x, y) => {
      const cx = x + this.w / 2;
      const cy = y + this.h / 2;
      return Math.hypot(target.x - cx, target.y - cy);
    };

    const startDist = targetDist(startX, startY);
    const probes = [
      { dx: -dirY * probeStep, dy: dirX * probeStep },
      { dx: dirY * probeStep, dy: -dirX * probeStep },
      { dx: Math.sign(dirX) * probeStep, dy: 0 },
      { dx: 0, dy: Math.sign(dirY) * probeStep },
    ];

    let best = null;

    for (const probe of probes) {
      if (probe.dx === 0 && probe.dy === 0) continue;

      this.x = startX;
      this.y = startY;
      moveWithWalls(this, probe.dx, probe.dy, this.level.walls);

      const moved = Math.hypot(this.x - startX, this.y - startY);
      if (moved <= this.stuckMoveThreshold * 0.5) continue;

      const dist = targetDist(this.x, this.y);
      const progress = startDist - dist;
      if (progress <= 0.05) continue;
      if (!best || dist < best.dist) {
        best = { x: this.x, y: this.y, moved, dist };
      }
    }

    if (best) {
      this.x = best.x;
      this.y = best.y;
      return best.moved;
    }

    this.x = startX;
    this.y = startY;
    return 0;
  }

  _updateAnimationState(isMoving) {
    const capturedByThisGuard = this.state.status === "lost" && this.state.lastCaptureByGuardId === this.guardId;
    const nextState = capturedByThisGuard && this.animations.attack
      ? "attack"
      : (isMoving ? "walk" : "idle");

    if (nextState !== this.animState) {
      this.animState = nextState;
      const animation = this._getCurrentAnimation();
      if (animation) animation.reset();
    }
    this.lastAnimState = this.animState;
  }

  _getCurrentAnimation() {
    if (this.animState === "attack" && this.animations.attack) return this.animations.attack;
    if (this.animState === "walk" && this.animations.walk) return this.animations.walk;
    if (this.animState === "idle" && this.animations.idle) return this.animations.idle;
    return this.animations.walk || this.animations.idle || this.animations.attack || null;
  }

  _drawVisionCone(ctx, guardCenter) {
    const cone = this._coneVisual();
    const left = this.facing - this.fov / 2;
    const right = this.facing + this.fov / 2;
    const points = this._buildVisionPolygon(guardCenter, left, right, this.visionRange);
    if (!points.length) return;

    ctx.save();
    const radial = ctx.createRadialGradient(
      guardCenter.x,
      guardCenter.y,
      8,
      guardCenter.x,
      guardCenter.y,
      this.visionRange
    );
    radial.addColorStop(0, cone.near);
    radial.addColorStop(0.64, cone.mid);
    radial.addColorStop(1, cone.far);
    ctx.fillStyle = radial;
    ctx.beginPath();
    ctx.moveTo(guardCenter.x, guardCenter.y);
    for (const point of points) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = cone.edge;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  _buildVisionPolygon(origin, leftAngle, rightAngle, maxDist) {
    const span = Math.max(0.0001, rightAngle - leftAngle);
    const rayCount = Math.max(56, Math.min(160, Math.round(maxDist / 4)));
    const blockingWalls = this._getVisionBlockingWalls();
    const points = [];
    for (let i = 0; i <= rayCount; i++) {
      const t = i / rayCount;
      const angle = leftAngle + span * t;
      points.push(this._castVisionRay(origin, angle, maxDist, blockingWalls));
    }
    return points;
  }

  _castVisionRay(origin, angle, maxDist, blockingWalls) {
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const endX = origin.x + dirX * maxDist;
    const endY = origin.y + dirY * maxDist;
    const rayMinX = Math.min(origin.x, endX);
    const rayMinY = Math.min(origin.y, endY);
    const rayMaxX = Math.max(origin.x, endX);
    const rayMaxY = Math.max(origin.y, endY);
    const eps = this._losEpsilon();

    let bestT = maxDist;
    for (const wall of blockingWalls) {
      if (!wall) continue;
      if (wall.x > rayMaxX || wall.x + wall.w < rayMinX || wall.y > rayMaxY || wall.y + wall.h < rayMinY) {
        continue;
      }
      const t = this._rayAabbHitDistance(origin.x, origin.y, dirX, dirY, maxDist, wall);
      if (t !== null && t >= 0 && t < bestT) {
        bestT = Math.max(0, t - eps * 2);
      }
    }

    return {
      x: origin.x + dirX * bestT,
      y: origin.y + dirY * bestT,
    };
  }

  _rayAabbHitDistance(originX, originY, dirX, dirY, maxDist, wall) {
    const inset = this._losInset();
    const minX = wall.x + inset;
    const minY = wall.y + inset;
    const maxX = wall.x + wall.w - inset;
    const maxY = wall.y + wall.h - inset;
    if (maxX <= minX || maxY <= minY) return null;

    const eps = this._losEpsilon();
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

  _losEpsilon() {
    if (typeof TUNING !== "undefined" && TUNING.los) {
      const value = Number(TUNING.los.epsilon);
      if (Number.isFinite(value) && value > 0) return value;
    }
    return 1e-6;
  }

  _losInset() {
    if (typeof TUNING !== "undefined" && TUNING.los) {
      const value = Number(TUNING.los.edgeInset);
      if (Number.isFinite(value) && value >= 0) return value;
    }
    return 0;
  }

  _drawStateBeacon(ctx, guardCenter) {
    const cone = this._coneVisual();
    const y = guardCenter.y - this.drawH * 0.3;
    const time = numberOr(this.game?.timer?.gameTime, 0);
    const pulse = 0.76 + 0.24 * Math.sin(time * 7.6 + this.guardId);

    ctx.save();
    ctx.fillStyle = cone.beaconFill;
    ctx.beginPath();
    ctx.arc(guardCenter.x, y, 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = cone.beaconStroke;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(guardCenter.x, y, 3.8 + pulse * 1.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  _bodyColor() {
    if (this.aiState === "CHASE") return "rgba(220,40,40,1)";
    if (this.aiState === "SEARCH") return "rgba(230,70,50,1)";
    if (this.aiState === "INVESTIGATE") return "rgba(210,110,20,1)";
    if (this.aiState === "RETURN") return "rgba(210,130,30,1)";
    return "rgba(180,0,0,1)";
  }

  _coneVisual() {
    if (this.aiState === "CHASE") {
      return {
        near: "rgba(255, 126, 102, 0.16)",
        mid: "rgba(255, 96, 74, 0.11)",
        far: "rgba(255, 86, 66, 0.025)",
        edge: "rgba(255, 145, 126, 0.28)",
        beaconFill: "rgba(255, 118, 96, 0.84)",
        beaconStroke: "rgba(255, 176, 160, 0.52)",
      };
    }
    if (this.aiState === "SEARCH") {
      return {
        near: "rgba(255, 146, 94, 0.14)",
        mid: "rgba(255, 126, 82, 0.1)",
        far: "rgba(255, 118, 74, 0.022)",
        edge: "rgba(255, 176, 128, 0.25)",
        beaconFill: "rgba(255, 151, 106, 0.82)",
        beaconStroke: "rgba(255, 210, 170, 0.5)",
      };
    }
    if (this.aiState === "INVESTIGATE" || this.detection > 0.01) {
      return {
        near: "rgba(255, 196, 96, 0.12)",
        mid: "rgba(255, 170, 80, 0.085)",
        far: "rgba(255, 156, 72, 0.02)",
        edge: "rgba(255, 208, 134, 0.22)",
        beaconFill: "rgba(255, 202, 112, 0.8)",
        beaconStroke: "rgba(255, 231, 174, 0.46)",
      };
    }
    return {
      near: "rgba(255, 214, 94, 0.08)",
      mid: "rgba(255, 199, 84, 0.06)",
      far: "rgba(255, 182, 74, 0.016)",
      edge: "rgba(255, 214, 129, 0.18)",
      beaconFill: "rgba(255, 214, 114, 0.74)",
      beaconStroke: "rgba(255, 238, 186, 0.4)",
    };
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

function resolveGuardSpriteSet(spriteSet) {
  if (!spriteSet) return { walk: null, idle: null, attack: null };

  const hasSetShape = typeof spriteSet === "object" &&
    ("walk" in spriteSet || "idle" in spriteSet || "attack" in spriteSet);
  if (hasSetShape) {
    return {
      walk: spriteSet.walk || null,
      idle: spriteSet.idle || null,
      attack: spriteSet.attack || null,
    };
  }

  return {
    walk: spriteSet,
    idle: null,
    attack: null,
  };
}
