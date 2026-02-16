// src/entities/level.js

// Optional art slots.
// Drop files into these paths to override gradient-only backgrounds.
const UI_ART_PATHS = Object.freeze({
  splash: (typeof UI_ASSETS !== "undefined" && UI_ASSETS.splashBackground)
    ? UI_ASSETS.splashBackground
    : "./assets/ui/splash-background.jpg",
  menu: (typeof UI_ASSETS !== "undefined" && UI_ASSETS.menuBackground)
    ? UI_ASSETS.menuBackground
    : "./assets/ui/menu-background.jpg",
});

const UI_FONTS = Object.freeze({
  title: '700 72px "Bebas Neue", "Oswald", "Impact", sans-serif',
  heading: '700 34px "Rajdhani", "Trebuchet MS", sans-serif',
  body: '600 18px "Rajdhani", "Trebuchet MS", sans-serif',
  bodySmall: '500 15px "Rajdhani", "Trebuchet MS", sans-serif',
  mono: '600 16px "Courier New", monospace',
});

class LevelRenderer {
  constructor(game, level, state, artPackAssets = null) {
    this.game = game;
    this.level = level;
    this.state = state;
    this.removeFromWorld = false;
    this.uiTime = 0;
    this.artPack = (typeof ART_PACK !== "undefined") ? ART_PACK : null;
    this.artPackAssets = (artPackAssets && typeof artPackAssets === "object") ? artPackAssets : {};
    this.uiArt = this._loadUiArt(UI_ART_PATHS);
    this.componentArt = this._loadUiArt(this._getComponentSpritePathMap());
    const artPackPathMap = this._getArtPackPathMap();
    const fallbackMap = {};
    for (const path of Object.values(artPackPathMap)) {
      if (!path || this.artPackAssets[path]) continue;
      fallbackMap[path] = path;
    }
    this.artPackFallbackArt = this._loadUiArt(fallbackMap);
  }

  update() {
    const dt = Number(this.game?.clockTick);
    if (Number.isFinite(dt) && dt > 0) {
      this.uiTime += dt;
      this._updateDoorVisuals(dt);
    }
  }

  draw(ctx, game) {
    this._drawWorld(ctx);
    this._drawRockProjectiles(ctx);
    this._drawNoisePulse(ctx);
    this._drawWorldVfx(ctx);
    this._drawExtractionWorldFx(ctx);
    this._drawWorldPrompt(ctx);

    if (game && Array.isArray(game.overlayDrawFns)) {
      game.overlayDrawFns.push((overlayCtx, overlayGame) => {
        this._drawOverlay(overlayCtx, overlayGame);
      });
      return;
    }

    this._drawOverlay(ctx, game);
  }

  _drawOverlay(ctx, game) {
    if (!ctx || !game) return;

    const cw = game.surfaceWidth || ctx.canvas.width;
    const ch = game.surfaceHeight || ctx.canvas.height;
    const status = this.state.status;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    this.state.menuOptionRects = [];
    this.state.levelOptionRects = [];
    this.state.focusOptionRects = [];

    if (status === "splash") {
      this._drawSceneBackground(ctx, cw, ch, "splash");
      this._drawSplashScreen(ctx, cw, ch);
      ctx.restore();
      return;
    }

    if (status === "menu") {
      this._drawSceneBackground(ctx, cw, ch, "menu");
      this._drawMainMenu(ctx, cw, ch);
      ctx.restore();
      return;
    }

    if (status === "level_select") {
      this._drawSceneBackground(ctx, cw, ch, "menu");
      this._drawLevelSelect(ctx, cw, ch);
      ctx.restore();
      return;
    }

    if (status === "credits") {
      this._drawSceneBackground(ctx, cw, ch, "menu");
      this._drawCredits(ctx, cw, ch);
      ctx.restore();
      return;
    }

    if (status === "loading") {
      this._drawSceneBackground(ctx, cw, ch, "menu");
      this._drawLoading(ctx, cw, ch);
      ctx.restore();
      return;
    }

    this._drawGameplayHud(ctx, cw, ch);

    if (status === "paused") {
      this._drawFocusModal(ctx, cw, ch, {
        title: "PAUSED",
        subtitle: "Operation frozen",
        accent: "#7de0ff",
        buttons: [
          { label: "Resume", actionId: "resume" },
          { label: "Retry", actionId: "retry" },
          { label: "Levels", actionId: "levels" },
          { label: "Title", actionId: "title" },
        ],
      });
    } else if (status === "won") {
      const hasNextLevel = this.state.levelIndex + 1 < this._num(this.state.levelCount, 1);
      this._drawFocusModal(ctx, cw, ch, {
        title: "MISSION COMPLETE",
        subtitle: "Extraction confirmed",
        accent: "#8ef0b0",
        buttons: [
          { label: hasNextLevel ? "Next Level" : "Credits", actionId: "next" },
          { label: "Retry", actionId: "retry" },
          { label: "Levels", actionId: "levels" },
          { label: "Title", actionId: "title" },
        ],
      });
    } else if (status === "lost") {
      const guardInfo = this.state.lastCaptureByGuardId !== null
        ? `Detected by guard ${this.state.lastCaptureByGuardId + 1}`
        : "Detection confirmed";
      this._drawFocusModal(ctx, cw, ch, {
        title: "MISSION FAILED",
        subtitle: guardInfo,
        accent: "#ff7a72",
        buttons: [
          { label: "Retry", actionId: "retry" },
          { label: "Levels", actionId: "levels" },
          { label: "Title", actionId: "title" },
        ],
      });
    }

    ctx.restore();
  }

  _drawWorld(ctx) {
    const levelWidth = Math.max(1, this.level.width || 1);
    const levelHeight = Math.max(1, this.level.height || 1);
    const floorVariant = this.level.floorVariant || "default";
    const floorVisual = this._getComponentVisual("floor", floorVariant);

    this._drawRectComponent(
      ctx,
      { x: 0, y: 0, w: levelWidth, h: levelHeight },
      "floor",
      floorVariant,
      { skipBorder: true }
    );
    this._drawWorldGrid(ctx, levelWidth, levelHeight, floorVisual);

    for (const w of this.level.walls || []) {
      if (!w) continue;
      const componentType = w.componentType || "wall";
      if (componentType !== "wall") continue;
      this._drawRectComponent(ctx, w, "wall", w.variant || "default");
    }

    if (this.level.lockedDoor) {
      this._drawLockedDoor(ctx, this.level.lockedDoor);
    }

    for (const h of this.level.hideSpots || []) {
      if (!h) continue;
      const occupied = this.state.activeHideSpot === h || !!h.occupied;
      this._drawRectComponent(
        ctx,
        h,
        "hideSpot",
        occupied ? "occupied" : "default",
        { skipBorder: true }
      );
    }

    if (this.level.terminal) {
      const terminalVariant = this.state.objectiveComplete ? "complete" : "default";
      this._drawRectComponent(ctx, this.level.terminal, "terminal", terminalVariant);
      this._drawTerminalStateOverlay(ctx, this.level.terminal);
    }

    if (this.level.keycard) {
      this._drawKeycardPickup(ctx, this.level.keycard);
    }

    if (this.level.exitZone) {
      this._drawRectComponent(ctx, this.level.exitZone, "exitZone", this.level.exitZone.variant || "default");
    }
  }

  _drawWorldGrid(ctx, width, height, floorVisual = null) {
    const gridSize = Math.max(8, Math.round(this._num(floorVisual?.gridSize, 64)));
    ctx.save();
    ctx.strokeStyle = floorVisual?.gridColor || "rgba(168, 205, 244, 0.04)";
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
    }

    ctx.restore();
  }

  _updateDoorVisuals(dt) {
    const door = this.level?.lockedDoor;
    if (!door) return;

    const isOpen = door.locked === false || door.state === "OPEN";
    const targetProgress = isOpen ? 1 : 0;
    const duration = Math.max(0.06, this._num(door.openDuration, 0.3));
    const current = clamp(this._num(door.openProgress, targetProgress), 0, 1);
    const step = dt / duration;

    if (targetProgress > current) {
      door.openProgress = Math.min(targetProgress, current + step);
    } else if (targetProgress < current) {
      door.openProgress = Math.max(targetProgress, current - step);
    } else {
      door.openProgress = targetProgress;
    }
  }

  _drawLockedDoor(ctx, door) {
    if (!door || door.w <= 0 || door.h <= 0) return;

    const isOpen = door.locked === false || door.state === "OPEN";
    const progress = clamp(this._num(door.openProgress, isOpen ? 1 : 0), 0, 1);

    const frameVariant = isOpen ? "open" : "locked";
    this._drawRectComponent(ctx, door, "lockedDoor", frameVariant, { alphaScale: isOpen ? 0.56 : 0.42 });

    const inset = 2;
    const innerRect = {
      x: door.x + inset,
      y: door.y + inset,
      w: Math.max(2, door.w - inset * 2),
      h: Math.max(2, door.h - inset * 2),
    };

    ctx.save();
    ctx.fillStyle = `rgba(7, 12, 19, ${(0.52 + progress * 0.3).toFixed(3)})`;
    ctx.fillRect(innerRect.x, innerRect.y, innerRect.w, innerRect.h);
    ctx.restore();

    const axis = this._getDoorSlideAxis(door);
    const motionType = this._getDoorMotionType(door);
    this._drawDoorPanels(ctx, innerRect, axis, motionType, progress, door);

    if (!isOpen) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 223, 178, 0.38)";
      ctx.lineWidth = 1;
      if (axis === "x") {
        const midX = door.x + door.w * 0.5 + 0.5;
        ctx.beginPath();
        ctx.moveTo(midX, door.y + 4);
        ctx.lineTo(midX, door.y + door.h - 4);
        ctx.stroke();
      } else {
        const midY = door.y + door.h * 0.5 + 0.5;
        ctx.beginPath();
        ctx.moveTo(door.x + 4, midY);
        ctx.lineTo(door.x + door.w - 4, midY);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  _getDoorSlideAxis(door) {
    if (door?.slideAxis === "x" || door?.slideAxis === "y") return door.slideAxis;
    return this._num(door?.w, 0) >= this._num(door?.h, 0) ? "x" : "y";
  }

  _getDoorMotionType(door) {
    if (door?.motionType === "single" || door?.motionType === "split") return door.motionType;
    return Math.max(this._num(door?.w, 0), this._num(door?.h, 0)) >= 96 ? "split" : "single";
  }

  _drawDoorPanels(ctx, rect, axis, motionType, progress, door = null) {
    if (!rect || rect.w <= 0 || rect.h <= 0) return;

    const seam = Math.min(8, Math.max(2, this._num((axis === "x" ? rect.w : rect.h) * 0.08, 4)));
    const seamHalf = seam / 2;

    if (motionType === "split") {
      if (axis === "x") {
        const half = rect.w * 0.5;
        const leftW = Math.max(2, half - seamHalf);
        const rightW = Math.max(2, rect.w - half - seamHalf);
        const travel = Math.max(6, leftW - 2);
        this._drawRectComponent(
          ctx,
          { x: rect.x - travel * progress, y: rect.y, w: leftW, h: rect.h },
          "lockedDoor",
          "locked"
        );
        this._drawRectComponent(
          ctx,
          { x: rect.x + half + seamHalf + travel * progress, y: rect.y, w: rightW, h: rect.h },
          "lockedDoor",
          "locked"
        );
      } else {
        const half = rect.h * 0.5;
        const topH = Math.max(2, half - seamHalf);
        const bottomH = Math.max(2, rect.h - half - seamHalf);
        const travel = Math.max(6, topH - 2);
        this._drawRectComponent(
          ctx,
          { x: rect.x, y: rect.y - travel * progress, w: rect.w, h: topH },
          "lockedDoor",
          "locked"
        );
        this._drawRectComponent(
          ctx,
          { x: rect.x, y: rect.y + half + seamHalf + travel * progress, w: rect.w, h: bottomH },
          "lockedDoor",
          "locked"
        );
      }
      return;
    }

    const direction = this._getDoorSlideDirection(door, axis, rect);
    if (axis === "x") {
      const travel = Math.max(6, rect.w - Math.max(10, rect.w * 0.28));
      this._drawRectComponent(
        ctx,
        { x: rect.x + travel * progress * direction, y: rect.y, w: rect.w, h: rect.h },
        "lockedDoor",
        "locked"
      );
    } else {
      const travel = Math.max(6, rect.h - Math.max(10, rect.h * 0.28));
      this._drawRectComponent(
        ctx,
        { x: rect.x, y: rect.y + travel * progress * direction, w: rect.w, h: rect.h },
        "lockedDoor",
        "locked"
      );
    }
  }

  _getDoorSlideDirection(door, axis, rect) {
    const explicit = door?.slideDirection;
    if (typeof explicit === "number" && Number.isFinite(explicit) && explicit !== 0) {
      return explicit > 0 ? 1 : -1;
    }

    if (axis === "x") {
      if (explicit === "left") return -1;
      if (explicit === "right") return 1;
    } else {
      if (explicit === "up") return -1;
      if (explicit === "down") return 1;
    }

    const centerX = rect.x + rect.w * 0.5;
    const centerY = rect.y + rect.h * 0.5;

    if (axis === "x") {
      const probe = Math.max(14, rect.w * 0.65);
      const leftBlocked = this._isPointBlockedByWall(centerX - probe, centerY, door);
      const rightBlocked = this._isPointBlockedByWall(centerX + probe, centerY, door);
      if (leftBlocked && !rightBlocked) return 1;
      if (rightBlocked && !leftBlocked) return -1;

      const levelWidth = Math.max(0, this._num(this.level?.width, 0));
      const leftSpace = Math.max(0, centerX);
      const rightSpace = Math.max(0, levelWidth - centerX);
      return rightSpace >= leftSpace ? 1 : -1;
    }

    const probe = Math.max(14, rect.h * 0.65);
    const upBlocked = this._isPointBlockedByWall(centerX, centerY - probe, door);
    const downBlocked = this._isPointBlockedByWall(centerX, centerY + probe, door);
    if (upBlocked && !downBlocked) return 1;
    if (downBlocked && !upBlocked) return -1;

    const levelHeight = Math.max(0, this._num(this.level?.height, 0));
    const upSpace = Math.max(0, centerY);
    const downSpace = Math.max(0, levelHeight - centerY);
    return downSpace >= upSpace ? 1 : -1;
  }

  _isPointBlockedByWall(x, y, excludeDoor = null) {
    const walls = Array.isArray(this.level?.walls) ? this.level.walls : [];
    for (const wall of walls) {
      if (!wall) continue;
      if (excludeDoor && wall.x === excludeDoor.x && wall.y === excludeDoor.y && wall.w === excludeDoor.w && wall.h === excludeDoor.h) {
        continue;
      }
      if (wall.componentType === "lockedDoor" && (wall.locked === false || wall.state === "OPEN")) continue;
      if (x > wall.x && x < wall.x + wall.w && y > wall.y && y < wall.y + wall.h) return true;
    }
    return false;
  }

  _drawTerminalStateOverlay(ctx, terminal) {
    if (!terminal || terminal.w <= 0 || terminal.h <= 0) return;

    const terminalState = (this.state.terminalState || "INACTIVE").toString().toUpperCase();
    const complete = !!this.state.terminalComplete || terminalState === "COMPLETE" || !!this.state.objectiveComplete;
    const downloading = !complete && terminalState === "DOWNLOADING";
    const progress = clamp(this._num(this.state.terminalProgress, 0), 0, 1);
    const pulse = 0.7 + 0.3 * Math.sin(this.uiTime * 6.2);

    const inset = 2;
    const x = terminal.x + inset;
    const y = terminal.y + inset;
    const w = Math.max(4, terminal.w - inset * 2);
    const h = Math.max(4, terminal.h - inset * 2);
    const cx = terminal.x + terminal.w / 2;

    ctx.save();
    if (complete) {
      ctx.fillStyle = "rgba(76, 202, 142, 0.22)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = `rgba(149, 255, 199, ${(0.46 + 0.2 * pulse).toFixed(3)})`;
      ctx.lineWidth = 1.8;
      ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, w - 1), Math.max(0, h - 1));

      const markY = terminal.y - 6;
      ctx.strokeStyle = "rgba(169, 255, 209, 0.92)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 6, markY);
      ctx.lineTo(cx - 1.5, markY + 4.5);
      ctx.lineTo(cx + 7, markY - 4);
      ctx.stroke();
    } else if (downloading) {
      ctx.fillStyle = `rgba(92, 218, 255, ${(0.16 + 0.1 * pulse).toFixed(3)})`;
      ctx.fillRect(x, y, w, h);

      const barW = Math.max(58, terminal.w + 34);
      const barH = 6;
      const barX = cx - barW / 2;
      const barY = terminal.y - 12;

      ctx.fillStyle = "rgba(7, 14, 22, 0.8)";
      this._roundedRect(ctx, barX, barY, barW, barH, 3);
      ctx.fill();
      ctx.fillStyle = "rgba(136, 228, 255, 0.96)";
      this._roundedRect(ctx, barX, barY, Math.max(2, barW * progress), barH, 3);
      ctx.fill();

      ctx.font = '600 10px "Rajdhani", "Trebuchet MS", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = "rgba(214, 244, 255, 0.95)";
      ctx.fillText(`${Math.round(progress * 100)}%`, cx, barY - 2);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";

      ctx.fillStyle = `rgba(139, 231, 255, ${(0.66 + 0.25 * pulse).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(cx, terminal.y - 7, 2.8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(255, 204, 129, 0.15)";
      ctx.fillRect(x, y, w, h);

      ctx.fillStyle = "rgba(255, 206, 122, 0.9)";
      ctx.beginPath();
      ctx.arc(cx, terminal.y - 7, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawWorldMarkers(ctx) {
    return;
  }

  _drawFloatingWorldIcon(ctx, iconId, centerX, topY, options = {}) {
    return;
  }

  _drawRectComponent(ctx, rect, componentType, variant = "default", options = {}) {
    if (!rect || rect.w <= 0 || rect.h <= 0) return;

    const visual = this._getComponentVisual(componentType, variant);
    const alphaScale = this._num(options.alphaScale, 1);
    const spriteOnly = !!visual?.spriteOnly;

    const drewSprite = this._drawSpriteFill(ctx, rect, visual, alphaScale, options);
    if (!drewSprite && !spriteOnly) {
      const fillAlpha = this._num(visual?.alpha, 1) * alphaScale;
      ctx.save();
      if (fillAlpha < 1) ctx.globalAlpha *= fillAlpha;

      if (visual && Array.isArray(visual.gradientStops) && visual.gradientStops.length >= 2) {
        ctx.fillStyle = this._createGradient(ctx, rect, visual.gradientStops, visual.gradientAxis);
      } else {
        ctx.fillStyle = visual?.fill || "rgba(80, 80, 80, 1)";
      }
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
    }

    if (!spriteOnly && visual?.overlay) {
      ctx.save();
      ctx.fillStyle = visual.overlay;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
    }

    if (!options.skipBorder && !spriteOnly) {
      const borderColor = visual?.borderColor;
      const borderWidth = this._num(visual?.borderWidth, 0);
      if (borderColor && borderWidth > 0) {
        const inset = borderWidth / 2;
        ctx.save();
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.strokeRect(
          rect.x + inset,
          rect.y + inset,
          Math.max(0, rect.w - borderWidth),
          Math.max(0, rect.h - borderWidth)
        );
        ctx.restore();
      }
    }
  }

  _drawSpriteFill(ctx, rect, visual, alphaScale = 1, options = {}) {
    if (!visual || !visual.spritePath) return false;
    const slot = this.componentArt[visual.spritePath];
    if (!slot || !slot.loaded || !slot.image) return false;

    const spriteAlpha = this._num(visual.spriteAlpha, 1) * alphaScale;
    const spriteOffsetX = this._num(visual.spriteOffsetX, 0);
    const spriteOffsetY = this._num(visual.spriteOffsetY, 0);
    const inset = Math.max(0, this._num(options.spriteInset, this._num(visual.spriteInset, 0)));
    const drawRect = {
      x: rect.x + inset,
      y: rect.y + inset,
      w: Math.max(1, rect.w - inset * 2),
      h: Math.max(1, rect.h - inset * 2),
    };
    ctx.save();
    if (spriteAlpha < 1) ctx.globalAlpha *= spriteAlpha;
    ctx.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
    if (visual.tileMode === "repeat") {
      const pattern = ctx.createPattern(slot.image, "repeat");
      if (!pattern) {
        ctx.restore();
        return false;
      }
      ctx.translate(rect.x, rect.y);
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, rect.w, rect.h);
    } else if (visual.spriteMode === "contain") {
      const iw = slot.image.naturalWidth || slot.image.width;
      const ih = slot.image.naturalHeight || slot.image.height;
      if (!iw || !ih) {
        ctx.restore();
        return false;
      }
      const maxScale = this._num(visual.spriteMaxScale, Number.POSITIVE_INFINITY);
      const scale = Math.min(Math.min(drawRect.w / iw, drawRect.h / ih), maxScale);
      let dw = iw * scale;
      let dh = ih * scale;
      let dx = drawRect.x + (drawRect.w - dw) / 2 + spriteOffsetX;
      let dy = drawRect.y + (drawRect.h - dh) / 2 + spriteOffsetY;
      if (visual.spritePixelSnap !== false) {
        dx = Math.round(dx);
        dy = Math.round(dy);
        dw = Math.round(dw);
        dh = Math.round(dh);
      }
      ctx.drawImage(slot.image, dx, dy, dw, dh);
    } else {
      let dx = drawRect.x + spriteOffsetX;
      let dy = drawRect.y + spriteOffsetY;
      let dw = drawRect.w;
      let dh = drawRect.h;
      if (visual.spritePixelSnap !== false) {
        dx = Math.round(dx);
        dy = Math.round(dy);
        dw = Math.round(dw);
        dh = Math.round(dh);
      }
      ctx.drawImage(
        slot.image,
        dx,
        dy,
        dw,
        dh
      );
    }

    ctx.restore();
    return true;
  }

  _createGradient(ctx, rect, stops, axis = "y") {
    let gradient;
    if (axis === "x") {
      gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y);
    } else if (axis === "diag") {
      gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    } else {
      gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    }

    const denominator = Math.max(1, stops.length - 1);
    for (let i = 0; i < stops.length; i++) {
      gradient.addColorStop(i / denominator, stops[i]);
    }
    return gradient;
  }

  _getComponentVisual(componentType, variant) {
    if (typeof getComponentVisual !== "function") return null;
    return getComponentVisual(componentType, variant);
  }

  _drawRockProjectiles(ctx) {
    const rocks = Array.isArray(this.state.rockProjectiles) ? this.state.rockProjectiles : [];
    if (!rocks.length) return;

    for (const rock of rocks) {
      if (!rock) continue;

      const x = this._num(rock.x, 0);
      const y = this._num(rock.y, 0);
      const arc = Math.max(0, this._num(rock.arc, 0));
      const r = Math.max(2, this._num(rock.radius, 3));

      ctx.save();
      ctx.fillStyle = "rgba(5, 12, 20, 0.28)";
      ctx.beginPath();
      ctx.ellipse(x, y + 1, r + 2, Math.max(1, r * 0.9), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = "rgba(210, 218, 230, 0.96)";
      ctx.strokeStyle = "rgba(84, 98, 116, 0.95)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y - arc, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  _drawNoisePulse(ctx) {
    if (!this.state.noise) return;

    const noise = this.state.noise;
    const ttl = Math.max(0, this._num(noise.ttl, 0));
    const life = Math.max(0.001, this._num(noise.life, ttl || 1));
    const age = clamp(1 - ttl / life, 0, 1);
    const fade = 1 - age;
    const radius = Math.max(8, this._num(noise.radius, 110));
    const coreRadius = Math.max(4, this._num(noise.coreRadius, 14));
    const pulseRadius = coreRadius + age * Math.min(radius, coreRadius * 5);
    const corePulse = 0.8 + 0.2 * Math.sin(this.uiTime * 18);

    ctx.save();
    ctx.fillStyle = `rgba(198, 232, 255, ${(0.66 * fade).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(noise.x, noise.y, coreRadius * corePulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(141, 225, 255, ${(0.9 * fade).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(noise.x, noise.y, pulseRadius, 0, Math.PI * 2);
    ctx.stroke();

    if (radius > pulseRadius + 8) {
      ctx.setLineDash([6, 8]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = `rgba(138, 213, 255, ${(0.24 * fade).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(noise.x, noise.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  _drawWorldVfx(ctx) {
    const events = Array.isArray(this.state.vfxEvents) ? this.state.vfxEvents : [];
    if (!events.length) return;

    for (const event of events) {
      if (!event || !event.type) continue;
      const spec = this.artPack?.vfx?.[event.type];
      if (!spec || !spec.path) continue;
      const sprite = this._getArtImage(spec.path);
      if (!sprite) continue;

      const frames = Math.max(1, Math.round(this._num(event.frames, spec.frames || 1)));
      const fps = Math.max(1, this._num(event.fps, spec.fps || 12));
      const frameW = Math.max(1, this._num(event.frameW, spec.frameW || 64));
      const frameH = Math.max(1, this._num(event.frameH, spec.frameH || 64));
      const loop = !!event.loop;
      const elapsed = Math.max(0, this._num(event.elapsed, 0));
      const frame = loop
        ? Math.floor(elapsed * fps) % frames
        : Math.min(frames - 1, Math.floor(elapsed * fps));
      const scale = Math.max(0.2, this._num(event.scale, 1));
      const alpha = clamp(this._num(event.alpha, 1), 0, 1);
      const drawW = frameW * scale;
      const drawH = frameH * scale;
      const drawX = this._num(event.x, 0) - drawW / 2;
      const drawY = this._num(event.y, 0) - drawH / 2;

      ctx.save();
      if (alpha < 1) ctx.globalAlpha *= alpha;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        sprite,
        frame * frameW,
        0,
        frameW,
        frameH,
        drawX,
        drawY,
        drawW,
        drawH
      );
      ctx.restore();
    }
  }

  _drawExtractionWorldFx(ctx) {
    if (this.state.status !== "extracting") return;
    const fx = this.state.extractionFx;
    if (!fx) return;

    const duration = Math.max(0.01, this._num(fx.duration, 1.45));
    const t = clamp(this._num(fx.elapsed, 0) / duration, 0, 1);
    const launch = clamp((t - 0.14) / 0.62, 0, 1);
    const pulse = 0.5 + 0.5 * Math.sin(this.uiTime * 17.6);
    const centerX = this._num(fx.x, 0);
    const centerY = this._num(fx.y, 0);

    const core = ctx.createRadialGradient(centerX, centerY, 4, centerX, centerY, 28 + 30 * launch);
    core.addColorStop(0, "rgba(162, 241, 255, 0.44)");
    core.addColorStop(0.7, "rgba(99, 202, 236, 0.2)");
    core.addColorStop(1, "rgba(57, 126, 168, 0)");
    ctx.save();
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 28 + 30 * launch, 0, Math.PI * 2);
    ctx.fill();

    const beamH = 26 + 180 * launch;
    const beamW = 10 + 16 * launch + pulse * 4;
    const beamY = centerY - beamH;
    const beam = ctx.createLinearGradient(centerX, centerY + 14, centerX, beamY);
    beam.addColorStop(0, "rgba(100, 206, 244, 0.28)");
    beam.addColorStop(0.45, "rgba(142, 231, 255, 0.32)");
    beam.addColorStop(1, "rgba(196, 248, 255, 0)");
    ctx.fillStyle = beam;
    ctx.fillRect(centerX - beamW / 2, beamY, beamW, beamH + 14);

    const ringA = 14 + 52 * launch + pulse * 5;
    const ringB = 10 + 38 * launch + (1 - pulse) * 5;
    ctx.strokeStyle = `rgba(146, 233, 255, ${(0.28 + 0.26 * (1 - t)).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 2, ringA, Math.max(8, ringA * 0.44), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(113, 218, 246, ${(0.2 + 0.18 * (1 - t)).toFixed(3)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 2, ringB, Math.max(7, ringB * 0.42), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  _drawWorldPrompt(ctx) {
    if (this.state.status !== "playing") return;
    const interaction = this.state.activeInteraction;
    if (!interaction || !interaction.actionId) return;

    const spec = this.artPack?.worldPrompts?.interact;
    if (!spec || !spec.path) return;
    const sprite = this._getArtImage(spec.path);
    if (!sprite) return;

    let worldX = this._num(interaction.worldX, NaN);
    let worldY = this._num(interaction.worldY, NaN);
    if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) {
      const player = this._getPlayerEntity();
      if (!player) return;
      worldX = player.x + player.w / 2;
      worldY = player.y - 2;
    }

    const frames = Math.max(1, this._num(spec.frames, 3));
    const fps = Math.max(1, this._num(spec.fps, 8));
    const frameW = Math.max(1, this._num(spec.frameW, 64));
    const frameH = Math.max(1, this._num(spec.frameH, 64));
    const frame = Math.floor(this.uiTime * fps) % frames;
    const bob = Math.sin(this.uiTime * 5.2) * 3;
    const drawSize = 54;

    ctx.save();
    ctx.globalAlpha *= 0.96;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      sprite,
      frame * frameW,
      0,
      frameW,
      frameH,
      worldX - drawSize / 2,
      worldY - drawSize - 16 + bob,
      drawSize,
      drawSize
    );
    ctx.restore();
  }

  _drawKeycardPickup(ctx, keycard) {
    if (!keycard) return;

    const spec = this.artPack?.pickups?.keycard;
    if (spec && spec.path) {
      const sprite = this._getArtImage(spec.path);
      if (sprite) {
        const frames = Math.max(1, this._num(spec.frames, 4));
        const fps = Math.max(1, this._num(spec.fps, 8));
        const frameW = Math.max(1, this._num(spec.frameW, 32));
        const frameH = Math.max(1, this._num(spec.frameH, 32));
        const frame = Math.floor(this.uiTime * fps) % frames;
        const bounce = Math.sin(this.uiTime * 5.2) * 2.3;
        const drawSize = Math.max(36, Math.max(keycard.w || 0, keycard.h || 0) + 10);
        const centerX = keycard.x + keycard.w / 2;
        const centerY = keycard.y + keycard.h / 2;

        ctx.save();
        ctx.fillStyle = "rgba(255, 222, 128, 0.28)";
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 8, drawSize * 0.44, drawSize * 0.23, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          sprite,
          frame * frameW,
          0,
          frameW,
          frameH,
          centerX - drawSize / 2,
          centerY - drawSize / 2 - 3 + bounce,
          drawSize,
          drawSize
        );
        ctx.restore();
        return;
      }
    }

    const shimmer = 0.7 + 0.3 * Math.sin(this.uiTime * 6);
    this._drawRectComponent(
      ctx,
      keycard,
      "keycard",
      keycard.variant || "default",
      { alphaScale: shimmer }
    );
  }

  _drawSceneBackground(ctx, cw, ch, mode) {
    const gradient = ctx.createLinearGradient(0, 0, cw, ch);
    if (mode === "splash") {
      gradient.addColorStop(0, "#0b1a2b");
      gradient.addColorStop(0.55, "#10253a");
      gradient.addColorStop(1, "#1b2f42");
    } else {
      gradient.addColorStop(0, "#081420");
      gradient.addColorStop(0.5, "#0e2133");
      gradient.addColorStop(1, "#182939");
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, cw, ch);

    this._drawBackgroundArt(ctx, cw, ch, mode);

    const sweepX = (this.uiTime * 120) % (cw + 380) - 260;
    ctx.save();
    ctx.translate(sweepX, 0);
    const sweepGradient = ctx.createLinearGradient(0, 0, 260, 0);
    sweepGradient.addColorStop(0, "rgba(255,255,255,0)");
    sweepGradient.addColorStop(0.5, "rgba(138, 219, 255, 0.18)");
    sweepGradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sweepGradient;
    ctx.fillRect(0, 0, 260, ch);
    ctx.restore();

    ctx.save();
    for (let i = -ch; i < cw + ch; i += 74) {
      ctx.strokeStyle = "rgba(176, 220, 255, 0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(i + 0.5, 0);
      ctx.lineTo(i - ch + 0.5, ch);
      ctx.stroke();
    }
    ctx.restore();

    const vignette = ctx.createRadialGradient(
      cw * 0.5,
      ch * 0.45,
      Math.min(cw, ch) * 0.18,
      cw * 0.5,
      ch * 0.5,
      Math.max(cw, ch) * 0.75
    );
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.52)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, cw, ch);
  }

  _drawBackgroundArt(ctx, cw, ch, mode) {
    const slot = mode === "splash" ? this.uiArt.splash : this.uiArt.menu;
    if (!slot || !slot.loaded || !slot.image) return;

    ctx.save();
    ctx.globalAlpha = 0.34;
    this._drawImageCover(ctx, slot.image, 0, 0, cw, ch);
    ctx.restore();
  }

  _drawImageCover(ctx, img, x, y, w, h) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;

    const scale = Math.max(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = x + (w - dw) / 2;
    const dy = y + (h - dh) / 2;

    ctx.drawImage(img, dx, dy, dw, dh);
  }

  _drawSplashScreen(ctx, cw, ch) {
    const panelW = Math.min(900, cw * 0.8);
    const panelH = Math.min(460, ch * 0.6);
    const panelX = (cw - panelW) / 2;
    const panelY = (ch - panelH) / 2;
    const centerX = panelX + panelW / 2;

    this._drawGlassPanel(ctx, panelX, panelY, panelW, panelH, {
      border: "rgba(175, 230, 255, 0.6)",
      glow: "rgba(109, 201, 255, 0.38)",
      top: "rgba(17, 40, 61, 0.9)",
      bottom: "rgba(10, 23, 35, 0.92)",
      cornerRadius: 24,
    });

    const pulse = 0.75 + 0.25 * Math.sin(this.uiTime * 4.4);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const titleY = panelY + panelH * 0.4;
    const taglineY = panelY + panelH * 0.57;

    ctx.fillStyle = "rgba(255, 249, 234, 0.98)";
    ctx.font = UI_FONTS.title;
    ctx.fillText("SHADOW SIGNAL", centerX, titleY);

    ctx.fillStyle = `rgba(255, 213, 133, ${(0.72 * pulse).toFixed(3)})`;
    ctx.font = UI_FONTS.heading;
    ctx.fillText("INFILTRATE. DISTRACT. EXTRACT.", centerX, taglineY);

    const ctaH = 58;
    const ctaW = Math.min(460, panelW * 0.74);
    const ctaX = centerX - ctaW / 2;
    const ctaY = panelY + panelH * 0.72;

    this._drawButton(ctx, {
      x: ctaX,
      y: ctaY,
      w: ctaW,
      h: ctaH,
      label: "PRESS ANY KEY TO START",
      selected: true,
      bright: true,
    });

    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  _drawMainMenu(ctx, cw, ch) {
    const selectedIndex = clamp(Number(this.state.menuIndex) || 0, 0, 1);
    const options = [
      {
        title: "Start Game",
        subtitle: "Choose level and begin the mission",
      },
      {
        title: "Credits",
        subtitle: "View team and project contributors",
      },
    ];

    const panelW = Math.min(940, cw * 0.84);
    const panelH = Math.min(520, ch * 0.74);
    const panelX = (cw - panelW) / 2;
    const panelY = (ch - panelH) / 2;

    this._drawGlassPanel(ctx, panelX, panelY, panelW, panelH, {
      border: "rgba(186, 236, 255, 0.7)",
      glow: "rgba(104, 202, 255, 0.36)",
      top: "rgba(16, 35, 55, 0.9)",
      bottom: "rgba(9, 21, 33, 0.94)",
      cornerRadius: 26,
    });

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const centerX = panelX + panelW / 2;
    ctx.fillStyle = "rgba(255, 251, 239, 0.99)";
    ctx.font = UI_FONTS.heading;
    ctx.fillText("MAIN MENU", centerX, panelY + 74);

    ctx.fillStyle = "rgba(208, 229, 247, 0.9)";
    ctx.font = UI_FONTS.bodySmall;
    ctx.fillText("Use W/S, Arrow Keys, or Mouse to select", centerX, panelY + 110);

    const buttonW = Math.min(560, panelW * 0.72);
    const buttonH = 78;
    const buttonGap = 22;
    const totalButtonsH = options.length * buttonH + (options.length - 1) * buttonGap;
    const buttonX = centerX - buttonW / 2;
    const firstY = panelY + panelH * 0.56 - totalButtonsH / 2;

    for (let i = 0; i < options.length; i++) {
      const y = firstY + i * (buttonH + buttonGap);
      const rect = { x: buttonX, y, w: buttonW, h: buttonH };
      this.state.menuOptionRects.push(rect);

      this._drawButton(ctx, {
        ...rect,
        label: options[i].title,
        subtitle: options[i].subtitle,
        selected: i === selectedIndex,
      });
    }

    ctx.fillStyle = "rgba(219, 235, 248, 0.88)";
    ctx.font = UI_FONTS.bodySmall;
    ctx.fillText("Enter/Space/Click: Confirm  |  Esc: Back", centerX, panelY + panelH - 40);

    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  _drawLevelSelect(ctx, cw, ch) {
    const levels = Array.isArray(this.state.levelMeta) ? this.state.levelMeta : [];
    const selectedIndex = clamp(
      Number(this.state.selectedLevelIndex) || 0,
      0,
      Math.max(0, levels.length - 1)
    );

    const panelW = Math.min(980, cw * 0.86);
    const panelH = Math.min(560, ch * 0.78);
    const panelX = (cw - panelW) / 2;
    const panelY = (ch - panelH) / 2;
    const centerX = panelX + panelW / 2;

    this._drawGlassPanel(ctx, panelX, panelY, panelW, panelH, {
      border: "rgba(175, 230, 255, 0.65)",
      glow: "rgba(88, 179, 240, 0.32)",
      top: "rgba(15, 35, 53, 0.88)",
      bottom: "rgba(8, 19, 30, 0.94)",
      cornerRadius: 24,
    });

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "rgba(255, 251, 239, 0.98)";
    ctx.font = UI_FONTS.heading;
    ctx.fillText("LEVEL SELECT", centerX, panelY + 66);

    const itemW = Math.min(660, panelW * 0.76);
    const itemH = 52;
    const itemGap = 14;
    const itemX = centerX - itemW / 2;

    this.state.levelOptionRects = [];

    if (!levels.length) {
      ctx.fillStyle = "rgba(215, 231, 244, 0.9)";
      ctx.font = UI_FONTS.body;
      ctx.fillText("No levels available", centerX, panelY + panelH / 2);
    } else {
      const totalListH = levels.length * itemH + (levels.length - 1) * itemGap;
      const listTop = panelY + 124;
      const listBottom = panelY + panelH - 106;
      const listAreaH = Math.max(itemH, listBottom - listTop);
      let itemY = listTop + Math.max(0, (listAreaH - totalListH) / 2);

      for (let i = 0; i < levels.length; i++) {
        const name = levels[i].name || `Level ${i + 1}`;
        const rect = { x: itemX, y: itemY, w: itemW, h: itemH };
        this.state.levelOptionRects.push(rect);

        const selected = i === selectedIndex;
        const fill = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
        if (selected) {
          fill.addColorStop(0, "rgba(255, 222, 143, 0.98)");
          fill.addColorStop(1, "rgba(255, 185, 101, 0.96)");
        } else {
          fill.addColorStop(0, "rgba(207, 222, 239, 0.92)");
          fill.addColorStop(1, "rgba(173, 195, 218, 0.88)");
        }

        ctx.fillStyle = fill;
        this._roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 13);
        ctx.fill();

        ctx.lineWidth = selected ? 2.5 : 1.2;
        ctx.strokeStyle = selected ? "rgba(255, 255, 246, 0.95)" : "rgba(120, 141, 160, 0.75)";
        this._roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 13);
        ctx.stroke();

        ctx.fillStyle = "rgba(22, 31, 39, 0.96)";
        ctx.font = UI_FONTS.body;
        ctx.fillText(`${i + 1}. ${name}`, centerX, rect.y + rect.h / 2 + 1);

        itemY += itemH + itemGap;
      }
    }

    ctx.fillStyle = "rgba(219, 235, 248, 0.9)";
    ctx.font = UI_FONTS.bodySmall;
    ctx.fillText("W/S or Arrow Keys or Mouse: Select", centerX, panelY + panelH - 64);
    ctx.fillText("Enter/Space/Click: Start  |  Esc: Menu  |  C: Credits", centerX, panelY + panelH - 36);

    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  _drawCredits(ctx, cw, ch) {
    const panelW = Math.min(920, cw * 0.82);
    const panelH = Math.min(530, ch * 0.74);
    const panelX = (cw - panelW) / 2;
    const panelY = (ch - panelH) / 2;
    const centerX = panelX + panelW / 2;

    this._drawGlassPanel(ctx, panelX, panelY, panelW, panelH, {
      border: "rgba(176, 230, 255, 0.66)",
      glow: "rgba(95, 192, 245, 0.34)",
      top: "rgba(15, 34, 52, 0.9)",
      bottom: "rgba(8, 19, 30, 0.95)",
      cornerRadius: 24,
    });

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "rgba(255, 249, 235, 0.98)";
    ctx.font = UI_FONTS.heading;
    ctx.fillText("CREDITS", centerX, panelY + 66);

    ctx.fillStyle = "rgba(213, 233, 249, 0.9)";
    ctx.font = UI_FONTS.body;
    ctx.fillText("Shadow Signal - Team Project", centerX, panelY + 116);

    const names = [
      "Rudolf Arakelyan",
      "Kevin Kamau",
      "Benjamin Petrik",
      "Waleid Sami",
    ];

    const rowGap = 64;
    const totalNamesH = names.length * rowGap;
    const namesTop = panelY + 170;
    const namesBottom = panelY + panelH - 96;
    const namesAreaH = Math.max(rowGap, namesBottom - namesTop);
    let y = namesTop + Math.max(0, (namesAreaH - totalNamesH) / 2) + rowGap / 2;
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const glow = 0.68 + 0.32 * Math.sin(this.uiTime * 2 + i * 0.65);
      ctx.fillStyle = `rgba(255, 222, 149, ${glow.toFixed(3)})`;
      ctx.font = '700 30px "Rajdhani", "Trebuchet MS", sans-serif';
      ctx.fillText(name, centerX, y);
      y += rowGap;
    }

    ctx.fillStyle = "rgba(219, 235, 248, 0.9)";
    ctx.font = UI_FONTS.bodySmall;
    ctx.fillText("Press Enter/Space/Esc to return", centerX, panelY + panelH - 38);

    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  _drawLoading(ctx, cw, ch) {
    const panelW = Math.min(600, cw * 0.64);
    const panelH = Math.min(220, ch * 0.32);
    const panelX = (cw - panelW) / 2;
    const panelY = (ch - panelH) / 2;
    const centerX = panelX + panelW / 2;

    this._drawGlassPanel(ctx, panelX, panelY, panelW, panelH, {
      border: "rgba(176, 230, 255, 0.55)",
      glow: "rgba(90, 186, 240, 0.25)",
      top: "rgba(14, 32, 49, 0.86)",
      bottom: "rgba(8, 18, 28, 0.93)",
      cornerRadius: 20,
    });

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const spin = this.uiTime * 3;
    const cx = centerX;
    const cy = panelY + panelH * 0.35;
    const radius = 24;

    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(133, 217, 255, 0.95)";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, spin, spin + Math.PI * 1.35);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 199, 116, 0.95)";
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 9, -spin * 1.2, -spin * 1.2 + Math.PI * 1.1);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 249, 235, 0.97)";
    ctx.font = UI_FONTS.heading;
    ctx.fillText("LOADING", centerX, panelY + panelH * 0.68);

    ctx.fillStyle = "rgba(214, 233, 248, 0.88)";
    ctx.font = UI_FONTS.bodySmall;
    ctx.fillText("Preparing mission data...", centerX, panelY + panelH - 36);

    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  _drawGameplayHud(ctx, cw, ch) {
    const dpr = Math.max(1, this._num(window.devicePixelRatio, 1));
    const cssW = cw / dpr;
    const cssH = ch / dpr;
    const cssScale = clamp(Math.min(cssW / 1280, cssH / 720), 0.95, 1.24);
    const ui = dpr * cssScale;
    const bodyFont = `600 ${Math.round(18 * ui)}px "Rajdhani", "Trebuchet MS", sans-serif`;
    const smallFont = `500 ${Math.round(15 * ui)}px "Rajdhani", "Trebuchet MS", sans-serif`;
    const titleFont = `700 ${Math.round(21 * ui)}px "Rajdhani", "Trebuchet MS", sans-serif`;
    const objectiveFont = `600 ${Math.round(16 * ui)}px "Rajdhani", "Trebuchet MS", sans-serif`;

    const hasKeycard = !!this.state.hasKeycard;
    const hasDoor = !!this.level.lockedDoor;
    const doorOpen = !hasDoor || this.level.lockedDoor.locked === false || this.level.lockedDoor.state === "OPEN";
    const hasTerminal = !!this.level.terminal;
    const terminalDone = !hasTerminal || !!this.state.terminalComplete;
    const needsKeycard = !!(this.level.keycard || hasDoor);
    const keycardDone = !needsKeycard || hasKeycard || (hasDoor && doorOpen);

    const steps = [];
    if (needsKeycard) steps.push({ label: "Find keycard", done: keycardDone, icon: "keycard" });
    if (hasDoor) {
      steps.push({
        label: "Open secured door",
        done: doorOpen,
        icon: doorOpen ? "door_unlocked" : "door_locked",
      });
    }
    if (hasTerminal) {
      steps.push({
        label: "Download terminal data",
        done: terminalDone,
        icon: "objective",
      });
    }
    const extractionDone = this.state.status === "extracting" || this.state.status === "won";
    steps.push({ label: "Reach extraction", done: extractionDone, icon: "objective" });
    const completedSteps = steps.reduce((count, step) => count + (step.done ? 1 : 0), 0);

    const leftX = 18 * ui;
    const leftY = 14 * ui;
    const leftW = Math.min(520 * ui, cw * 0.46);
    const leftRowH = 38 * ui;
    const leftHeaderH = 44 * ui;
    const leftH = leftHeaderH + steps.length * leftRowH + 12 * ui;

    this._drawGlassPanel(ctx, leftX, leftY, leftW, leftH, {
      border: "rgba(169, 220, 250, 0.54)",
      glow: "rgba(89, 164, 214, 0.24)",
      top: "rgba(11, 27, 41, 0.85)",
      bottom: "rgba(7, 17, 27, 0.93)",
      cornerRadius: 14 * ui,
    });

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(245, 249, 255, 0.97)";
    ctx.font = titleFont;
    ctx.fillText("MISSION OBJECTIVES", leftX + 16 * ui, leftY + 24 * ui);
    ctx.textAlign = "right";
    ctx.fillStyle = completedSteps === steps.length
      ? "rgba(145, 233, 175, 0.98)"
      : "rgba(255, 212, 128, 0.98)";
    ctx.font = smallFont;
    ctx.fillText(`${completedSteps}/${steps.length} COMPLETE`, leftX + leftW - 14 * ui, leftY + 24 * ui);
    ctx.textAlign = "left";

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const rowY = leftY + leftHeaderH + i * leftRowH + 2 * ui;
      const rowH = leftRowH - 4 * ui;
      const rowX = leftX + 9 * ui;
      const rowW = leftW - 18 * ui;
      const stepY = rowY + rowH / 2;
      const iconSize = 22 * ui;

      ctx.save();
      ctx.fillStyle = step.done
        ? "rgba(84, 158, 108, 0.2)"
        : "rgba(176, 129, 71, 0.18)";
      this._roundedRect(ctx, rowX, rowY, rowW, rowH, 8 * ui);
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = step.done
        ? "rgba(145, 233, 175, 0.42)"
        : "rgba(255, 212, 128, 0.36)";
      this._roundedRect(ctx, rowX, rowY, rowW, rowH, 8 * ui);
      ctx.stroke();
      ctx.restore();

      this._drawUiIcon(ctx, step.icon || "objective", rowX + 8 * ui, rowY + (rowH - iconSize) / 2, iconSize, {
        alpha: step.done ? 0.98 : 0.86,
        phase: i * 0.45,
      });

      ctx.fillStyle = step.done ? "rgba(208, 246, 221, 0.99)" : "rgba(247, 238, 218, 0.98)";
      ctx.font = objectiveFont;
      ctx.fillText(step.label, rowX + 8 * ui + iconSize + 10 * ui, stepY);

      const statusLabel = step.done ? "COMPLETE" : "PENDING";
      const statusPad = 18 * ui;
      const statusW = Math.max(96 * ui, ctx.measureText(statusLabel).width + statusPad);
      const statusX = rowX + rowW - statusW - 8 * ui;
      const statusH = 22 * ui;
      const statusY = rowY + (rowH - statusH) / 2;

      ctx.save();
      ctx.fillStyle = step.done
        ? "rgba(76, 200, 140, 0.3)"
        : "rgba(235, 170, 98, 0.28)";
      this._roundedRect(ctx, statusX, statusY, statusW, statusH, 6 * ui);
      ctx.fill();
      ctx.strokeStyle = step.done
        ? "rgba(146, 245, 193, 0.56)"
        : "rgba(255, 218, 153, 0.52)";
      ctx.lineWidth = 1;
      this._roundedRect(ctx, statusX, statusY, statusW, statusH, 6 * ui);
      ctx.stroke();
      ctx.restore();

      ctx.textAlign = "center";
      ctx.fillStyle = step.done ? "rgba(187, 255, 220, 0.98)" : "rgba(255, 235, 197, 0.98)";
      ctx.font = `700 ${Math.round(12 * ui)}px "Rajdhani", "Trebuchet MS", sans-serif`;
      ctx.fillText(statusLabel, statusX + statusW / 2, stepY);
      ctx.textAlign = "left";
    }

    const alertRatio = this._getAlertRatio();
    const alertLabel = alertRatio >= 0.95 ? "ALERT" : (alertRatio >= 0.35 ? "SUSPICIOUS" : "CLEAR");
    const batteryRatio = clamp(this._num(this.state.throwCharge, 1), 0, 1);
    const batteryPercent = Math.round(batteryRatio * 100);
    const visibility = this._getVisibilityStatus();

    const rightW = Math.min(420 * ui, cw * 0.36);
    const rightX = cw - rightW - 18 * ui;
    const rightY = 14 * ui;
    const rightRowH = 34 * ui;
    const rightH = 48 * ui + rightRowH * 3 + 10 * ui;

    this._drawGlassPanel(ctx, rightX, rightY, rightW, rightH, {
      border: "rgba(181, 225, 252, 0.54)",
      glow: "rgba(97, 176, 228, 0.22)",
      top: "rgba(11, 27, 41, 0.85)",
      bottom: "rgba(8, 18, 28, 0.93)",
      cornerRadius: 12 * ui,
    });

    this._drawUiIcon(ctx, "pause", rightX + 10 * ui, rightY + 8 * ui, 22 * ui, { alpha: 0.97 });
    ctx.fillStyle = "rgba(230, 242, 251, 0.96)";
    ctx.font = bodyFont;
    ctx.fillText("Esc Pause", rightX + 38 * ui, rightY + 20 * ui);

    const rows = [
      {
        icon: "warning",
        label: "Threat",
        value: alertLabel,
        ratio: alertRatio,
        valueColor: "rgba(241, 247, 255, 0.97)",
        stops: ["#73dfff", "#ffc86f", "#ff7070"],
      },
      {
        icon: "battery",
        label: "Throw",
        value: `${batteryPercent}%`,
        ratio: batteryRatio,
        valueColor: batteryRatio < 0.34 ? "rgba(255, 157, 128, 0.96)" : "rgba(209, 243, 222, 0.96)",
        stops: ["#ff826c", "#ffd06f", "#8df0b8"],
      },
      {
        icon: "eye",
        label: "Visibility",
        value: visibility.label,
        ratio: visibility.ratio,
        valueColor: visibility.valueColor,
        stops: visibility.stops,
      },
    ];

    let statusY = rightY + 50 * ui;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      this._drawUiIcon(ctx, row.icon, rightX + 10 * ui, statusY - 11 * ui, 22 * ui, {
        alpha: 0.96,
        phase: 0.2 + i * 0.35,
      });

      ctx.fillStyle = "rgba(227, 241, 252, 0.97)";
      ctx.font = smallFont;
      ctx.fillText(row.label, rightX + 38 * ui, statusY);

      const barX = rightX + rightW * 0.38;
      const barW = rightW * 0.38;
      const barY = statusY - 8 * ui;
      const barH = 13 * ui;

      ctx.fillStyle = "rgba(14, 23, 31, 0.96)";
      this._roundedRect(ctx, barX, barY, barW, barH, 6 * ui);
      ctx.fill();

      const fillW = Math.max(0, Math.min(barW, barW * row.ratio));
      if (fillW > 0.5) {
        const fill = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        fill.addColorStop(0, row.stops[0]);
        fill.addColorStop(0.56, row.stops[1]);
        fill.addColorStop(1, row.stops[2]);
        ctx.fillStyle = fill;
        this._roundedRect(ctx, barX, barY, fillW, barH, 6 * ui);
        ctx.fill();
      }

      ctx.textAlign = "right";
      ctx.fillStyle = row.valueColor;
      ctx.font = smallFont;
      ctx.fillText(row.value, rightX + rightW - 12 * ui, statusY);
      ctx.textAlign = "left";
      statusY += rightRowH;
    }

    const prompt = this.state.uiPrompt || this.state.message;
    if (prompt) {
      const promptW = Math.min(820 * ui, cw * 0.8);
      const promptH = 56 * ui;
      const promptX = (cw - promptW) / 2;
      const promptY = ch - promptH - 18 * ui;

      this._drawGlassPanel(ctx, promptX, promptY, promptW, promptH, {
        border: "rgba(184, 233, 255, 0.58)",
        glow: "rgba(91, 183, 240, 0.24)",
        top: "rgba(13, 30, 45, 0.87)",
        bottom: "rgba(8, 19, 30, 0.93)",
        cornerRadius: 12 * ui,
      });

      this._drawUiIcon(ctx, "interact", promptX + 12 * ui, promptY + 14 * ui, 24 * ui, {
        alpha: 0.98,
      });

      ctx.fillStyle = "rgba(241, 247, 255, 0.98)";
      ctx.font = bodyFont;
      ctx.textAlign = "left";
      ctx.fillText(prompt, promptX + 44 * ui, promptY + promptH / 2 + 1);
    }

    if (this.state.debug && this.state.debugInfo && Array.isArray(this.state.debugInfo.guards)) {
      let y = leftY + leftH + 16 * ui;
      for (const guardInfo of this.state.debugInfo.guards) {
        if (!guardInfo) continue;
        const label = guardInfo.name || `Guard ${guardInfo.id + 1}`;
        ctx.fillStyle = "rgba(226, 239, 250, 0.93)";
        ctx.font = `600 ${14 * ui}px "Courier New", monospace`;
        ctx.fillText(`${label}: ${guardInfo.aiState || "?"}`, leftX + 2 * ui, y);
        y += 18 * ui;
      }
    }
  }

  _drawFocusModal(ctx, cw, ch, data) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.48)";
    ctx.fillRect(0, 0, cw, ch);

    const panelW = Math.min(760, cw * 0.74);
    const panelH = Math.min(340, ch * 0.48);
    const panelX = (cw - panelW) / 2;
    const panelY = (ch - panelH) / 2;
    const centerX = panelX + panelW / 2;

    this._drawGlassPanel(ctx, panelX, panelY, panelW, panelH, {
      border: "rgba(203, 232, 255, 0.72)",
      glow: `${data.accent || "rgba(125, 224, 255, 0.35)"}`,
      top: "rgba(15, 35, 52, 0.94)",
      bottom: "rgba(8, 20, 31, 0.97)",
      cornerRadius: 22,
    });

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "rgba(255, 251, 237, 0.99)";
    ctx.font = UI_FONTS.heading;
    ctx.fillText(data.title || "STATUS", centerX, panelY + 78);

    ctx.fillStyle = data.accent || "rgba(174, 231, 255, 0.95)";
    ctx.font = UI_FONTS.body;
    ctx.fillText(data.subtitle || "", centerX, panelY + 122);

    const buttons = Array.isArray(data.buttons) ? data.buttons.filter(Boolean) : [];
    this.state.focusOptionRects = [];
    if (buttons.length) {
      const columns = Math.min(2, buttons.length);
      const rows = Math.ceil(buttons.length / columns);
      const buttonW = Math.min(270, (panelW - 92) / columns);
      const buttonH = 52;
      const gapX = 20;
      const gapY = 14;
      const totalRowW = columns * buttonW + (columns - 1) * gapX;
      const totalButtonsH = rows * buttonH + (rows - 1) * gapY;
      const startX = panelX + (panelW - totalRowW) / 2;
      const buttonsTop = panelY + 158;
      const buttonsBottom = panelY + panelH - 24;
      const buttonsAreaH = Math.max(buttonH, buttonsBottom - buttonsTop);
      const startY = buttonsTop + Math.max(0, (buttonsAreaH - totalButtonsH) / 2);
      const hovered = Number.isFinite(this.state.focusIndex) ? this.state.focusIndex : -1;

      for (let i = 0; i < buttons.length; i++) {
        const col = i % columns;
        const row = Math.floor(i / columns);
        const rect = {
          x: startX + col * (buttonW + gapX),
          y: startY + row * (buttonH + gapY),
          w: buttonW,
          h: buttonH,
          actionId: buttons[i].actionId || "",
        };
        this.state.focusOptionRects.push(rect);
        this._drawButton(ctx, {
          x: rect.x,
          y: rect.y,
          w: rect.w,
          h: rect.h,
          label: buttons[i].label || "",
          selected: hovered === i,
          bright: hovered === i,
        });
      }
    }

    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  _drawButton(ctx, data) {
    const x = data.x;
    const y = data.y;
    const w = data.w;
    const h = data.h;
    const selected = !!data.selected;
    const bright = !!data.bright;

    const fill = ctx.createLinearGradient(x, y, x + w, y + h);
    if (selected && bright) {
      fill.addColorStop(0, "rgba(255, 218, 133, 0.97)");
      fill.addColorStop(1, "rgba(255, 176, 96, 0.95)");
    } else if (selected) {
      fill.addColorStop(0, "rgba(255, 214, 130, 0.97)");
      fill.addColorStop(1, "rgba(255, 182, 107, 0.94)");
    } else {
      fill.addColorStop(0, "rgba(204, 221, 238, 0.92)");
      fill.addColorStop(1, "rgba(158, 183, 208, 0.9)");
    }

    ctx.fillStyle = fill;
    this._roundedRect(ctx, x, y, w, h, 14);
    ctx.fill();

    ctx.lineWidth = selected ? 2.4 : 1.3;
    ctx.strokeStyle = selected ? "rgba(255, 252, 240, 0.96)" : "rgba(103, 125, 145, 0.8)";
    this._roundedRect(ctx, x, y, w, h, 14);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "rgba(17, 28, 39, 0.96)";
    ctx.font = UI_FONTS.body;

    if (data.subtitle) {
      ctx.fillText(data.label || "", x + w / 2, y + h * 0.38);
      ctx.fillStyle = "rgba(37, 55, 73, 0.88)";
      ctx.font = UI_FONTS.bodySmall;
      ctx.fillText(data.subtitle, x + w / 2, y + h * 0.72);
    } else {
      ctx.fillText(data.label || "", x + w / 2, y + h / 2 + 1);
    }

    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  _drawGlassPanel(ctx, x, y, w, h, style) {
    const fill = ctx.createLinearGradient(x, y, x, y + h);
    fill.addColorStop(0, style.top || "rgba(16, 34, 50, 0.9)");
    fill.addColorStop(1, style.bottom || "rgba(8, 18, 29, 0.92)");

    ctx.save();
    ctx.shadowColor = style.glow || "rgba(89, 164, 214, 0.25)";
    ctx.shadowBlur = 22;
    ctx.fillStyle = fill;
    this._roundedRect(ctx, x, y, w, h, style.cornerRadius || 16);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = style.border || "rgba(173, 222, 250, 0.58)";
    ctx.lineWidth = 1.8;
    this._roundedRect(ctx, x, y, w, h, style.cornerRadius || 16);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;
    this._roundedRect(ctx, x + 1, y + 1, Math.max(0, w - 2), Math.max(0, h - 2), Math.max(4, (style.cornerRadius || 16) - 2));
    ctx.stroke();
  }

  _roundedRect(ctx, x, y, w, h, r) {
    const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  _drawUiIcon(ctx, iconId, x, y, size, options = {}) {
    const spec = typeof getArtPackUiIconSpec === "function"
      ? getArtPackUiIconSpec(iconId)
      : null;
    if (!spec || !spec.path) return false;

    const sprite = this._getArtImage(spec.path);
    if (!sprite) return false;

    const frameW = Math.max(1, this._num(spec.frameW, 32));
    const frameH = Math.max(1, this._num(spec.frameH, 32));
    const frames = Math.max(1, Math.round(this._num(spec.frames, 1)));
    const fps = Math.max(1, this._num(spec.fps, 8));
    const phase = this._num(options.phase, 0);
    const elapsed = this.uiTime + phase;
    const frame = Math.floor(elapsed * fps) % frames;
    const alpha = clamp(this._num(options.alpha, 1), 0, 1);
    const drawX = Math.round(x);
    const drawY = Math.round(y);
    const drawSize = Math.max(1, Math.round(size));

    ctx.save();
    if (alpha < 1) ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      sprite,
      frame * frameW,
      0,
      frameW,
      frameH,
      drawX,
      drawY,
      drawSize,
      drawSize
    );
    ctx.restore();
    return true;
  }

  _drawPickupIcon(ctx, pickupId, x, y, size, options = {}) {
    const spec = typeof getArtPackPickupSpec === "function"
      ? getArtPackPickupSpec(pickupId)
      : null;
    if (!spec || !spec.path) return false;

    const sprite = this._getArtImage(spec.path);
    if (!sprite) return false;

    const frameW = Math.max(1, this._num(spec.frameW, 32));
    const frameH = Math.max(1, this._num(spec.frameH, 32));
    const frames = Math.max(1, Math.round(this._num(spec.frames, 1)));
    const fps = Math.max(1, this._num(spec.fps, 8));
    const phase = this._num(options.phase, 0);
    const frame = Math.floor((this.uiTime + phase) * fps) % frames;
    const alpha = clamp(this._num(options.alpha, 1), 0, 1);
    const drawX = Math.round(x);
    const drawY = Math.round(y);
    const drawSize = Math.max(1, Math.round(size));

    ctx.save();
    if (alpha < 1) ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      sprite,
      frame * frameW,
      0,
      frameW,
      frameH,
      drawX,
      drawY,
      drawSize,
      drawSize
    );
    ctx.restore();
    return true;
  }

  _getArtPackPathMap() {
    const map = {};
    if (typeof listArtPackSpritePaths !== "function") return map;
    for (const path of listArtPackSpritePaths()) {
      if (!path) continue;
      map[path] = path;
    }
    return map;
  }

  _getArtImage(path) {
    if (!path) return null;
    const preloaded = this.artPackAssets[path];
    if (preloaded) return preloaded;

    const slot = this.artPackFallbackArt[path];
    if (slot && slot.loaded && slot.image) return slot.image;
    return null;
  }

  _getPlayerEntity() {
    const entities = Array.isArray(this.game?.entities) ? this.game.entities : [];
    for (const entity of entities) {
      if (entity && entity.isPlayer) return entity;
    }
    return null;
  }

  _getAlertRatio() {
    const guards = this.state?.debugInfo?.guards;
    if (!Array.isArray(guards) || !guards.length) return 0;

    let maxDetection = 0;
    let chaseActive = false;

    for (const guard of guards) {
      if (!guard) continue;
      const detection = Number(guard.detection);
      if (Number.isFinite(detection)) {
        maxDetection = Math.max(maxDetection, detection);
      }
      if (guard.aiState === "CHASE") chaseActive = true;
    }

    if (chaseActive) return 1;
    return clamp(maxDetection, 0, 1);
  }

  _getVisibilityStatus() {
    const hidden = this.state?.playerState === "HIDDEN";
    if (hidden) {
      return {
        label: "HIDDEN",
        ratio: 1,
        valueColor: "rgba(145, 233, 175, 0.96)",
        stops: ["#56cc9d", "#82e0be", "#b9f4dc"],
      };
    }

    const guards = this.state?.debugInfo?.guards;
    if (!Array.isArray(guards) || !guards.length) {
      return {
        label: "CLEAR",
        ratio: 0.2,
        valueColor: "rgba(198, 241, 222, 0.96)",
        stops: ["#4fa77a", "#72c295", "#9adab6"],
      };
    }

    let chaseActive = false;
    let seenNow = false;
    let watchedNow = false;
    let maxDetection = 0;

    for (const guard of guards) {
      if (!guard) continue;
      if (guard.aiState === "CHASE") chaseActive = true;
      if (guard.sees) seenNow = true;
      if (guard.inRange && guard.inFov) watchedNow = true;

      const detection = Number(guard.detection);
      if (Number.isFinite(detection)) {
        maxDetection = Math.max(maxDetection, detection);
      }
    }

    if (chaseActive || seenNow) {
      return {
        label: "EXPOSED",
        ratio: 1,
        valueColor: "rgba(255, 169, 160, 0.98)",
        stops: ["#ff7164", "#ff9d68", "#ffd081"],
      };
    }

    if (watchedNow || maxDetection >= 0.35) {
      return {
        label: "WATCHED",
        ratio: Math.max(0.45, clamp(maxDetection, 0, 1)),
        valueColor: "rgba(255, 220, 155, 0.98)",
        stops: ["#ff9e67", "#ffd173", "#ffe8a1"],
      };
    }

    return {
      label: "CLEAR",
      ratio: Math.max(0.12, clamp(maxDetection * 0.4, 0, 1)),
      valueColor: "rgba(198, 241, 222, 0.96)",
      stops: ["#4fa77a", "#72c295", "#9adab6"],
    };
  }

  _getComponentSpritePathMap() {
    const map = {};
    if (typeof listComponentSpritePaths !== "function") return map;
    const paths = listComponentSpritePaths();
    for (const path of paths) {
      if (!path) continue;
      map[path] = path;
    }
    return map;
  }

  _num(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  _loadUiArt(pathMap) {
    const slots = {};
    if (typeof Image === "undefined" || !pathMap) return slots;

    for (const [key, path] of Object.entries(pathMap)) {
      if (!path) continue;
      const image = new Image();
      const slot = { image, path, loaded: false };
      image.onload = () => {
        slot.loaded = true;
      };
      image.onerror = () => {
        slot.loaded = false;
      };
      image.src = path;
      slots[key] = slot;
    }

    return slots;
  }
}
