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
  constructor(game, level, state) {
    this.game = game;
    this.level = level;
    this.state = state;
    this.removeFromWorld = false;
    this.uiTime = 0;
    this.uiArt = this._loadUiArt(UI_ART_PATHS);
    this.componentArt = this._loadUiArt(this._getComponentSpritePathMap());
  }

  update() {
    const dt = Number(this.game?.clockTick);
    if (Number.isFinite(dt) && dt > 0) {
      this.uiTime += dt;
    }
  }

  draw(ctx, game) {
    this._drawWorld(ctx);
    this._drawRockProjectiles(ctx);
    this._drawNoisePulse(ctx);

    const cw = game.surfaceWidth || ctx.canvas.width;
    const ch = game.surfaceHeight || ctx.canvas.height;
    const status = this.state.status;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    this.state.menuOptionRects = [];
    this.state.levelOptionRects = [];

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
        details: ["Esc/P: Resume", "R: Retry", "L: Levels", "T: Title"],
        accent: "#7de0ff",
      });
    } else if (status === "won") {
      this._drawFocusModal(ctx, cw, ch, {
        title: "MISSION COMPLETE",
        subtitle: "Extraction confirmed",
        details: ["N: Next Level", "R: Retry", "L: Levels", "T: Title"],
        accent: "#8ef0b0",
      });
    } else if (status === "lost") {
      const guardInfo = this.state.lastCaptureByGuardId !== null
        ? `Detected by guard ${this.state.lastCaptureByGuardId + 1}`
        : "Detection confirmed";
      this._drawFocusModal(ctx, cw, ch, {
        title: "MISSION FAILED",
        subtitle: guardInfo,
        details: ["R: Retry", "L: Levels", "T: Title"],
        accent: "#ff7a72",
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
      const d = this.level.lockedDoor;
      const doorVariant = (d.locked === false || d.state === "OPEN") ? "open" : "locked";
      this._drawRectComponent(ctx, d, "lockedDoor", doorVariant);
    }

    for (const h of this.level.hideSpots || []) {
      if (!h) continue;
      const hideVariant = h.occupied ? "occupied" : (h.variant || "default");
      this._drawRectComponent(ctx, h, "hideSpot", hideVariant);
    }

    if (this.level.terminal) {
      const terminalVariant = this.state.objectiveComplete ? "complete" : "default";
      this._drawRectComponent(ctx, this.level.terminal, "terminal", terminalVariant);
    }

    if (this.level.keycard) {
      const shimmer = 0.7 + 0.3 * Math.sin(this.uiTime * 6);
      this._drawRectComponent(
        ctx,
        this.level.keycard,
        "keycard",
        this.level.keycard.variant || "default",
        { alphaScale: shimmer }
      );
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

  _drawRectComponent(ctx, rect, componentType, variant = "default", options = {}) {
    if (!rect || rect.w <= 0 || rect.h <= 0) return;

    const visual = this._getComponentVisual(componentType, variant);
    const alphaScale = this._num(options.alphaScale, 1);

    const drewSprite = this._drawSpriteFill(ctx, rect, visual, alphaScale);
    if (!drewSprite) {
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

    if (visual?.overlay) {
      ctx.save();
      ctx.fillStyle = visual.overlay;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
    }

    if (!options.skipBorder) {
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

  _drawSpriteFill(ctx, rect, visual, alphaScale = 1) {
    if (!visual || !visual.spritePath) return false;
    const slot = this.componentArt[visual.spritePath];
    if (!slot || !slot.loaded || !slot.image) return false;

    const spriteAlpha = this._num(visual.spriteAlpha, 1) * alphaScale;
    ctx.save();
    if (spriteAlpha < 1) ctx.globalAlpha *= spriteAlpha;

    if (visual.tileMode === "repeat") {
      const pattern = ctx.createPattern(slot.image, "repeat");
      if (!pattern) {
        ctx.restore();
        return false;
      }
      ctx.translate(rect.x, rect.y);
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, rect.w, rect.h);
    } else {
      ctx.drawImage(slot.image, rect.x, rect.y, rect.w, rect.h);
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
    const panelH = Math.min(430, ch * 0.56);
    const panelX = (cw - panelW) / 2;
    const panelY = (ch - panelH) / 2 - 24;

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

    ctx.fillStyle = "rgba(194, 235, 255, 0.94)";
    ctx.font = UI_FONTS.body;
    ctx.fillText("TCSS 491 STEALTH OPERATIONS", cw / 2, panelY + 66);

    ctx.fillStyle = "rgba(255, 249, 234, 0.98)";
    ctx.font = UI_FONTS.title;
    ctx.fillText("SHADOW SIGNAL", cw / 2, panelY + panelH * 0.44);

    ctx.fillStyle = `rgba(255, 213, 133, ${(0.72 * pulse).toFixed(3)})`;
    ctx.font = UI_FONTS.heading;
    ctx.fillText("INFILTRATE. DISTRACT. EXTRACT.", cw / 2, panelY + panelH * 0.62);

    const ctaH = 54;
    const footerY = panelY + panelH - 24;
    const ctaY = footerY - ctaH - 20;
    const ctaW = Math.min(420, panelW * 0.72);
    const ctaX = cw / 2 - ctaW / 2;

    this._drawButton(ctx, {
      x: ctaX,
      y: ctaY,
      w: ctaW,
      h: ctaH,
      label: "PRESS ANY KEY TO START",
      selected: true,
      bright: true,
    });

    ctx.fillStyle = "rgba(214, 231, 246, 0.9)";
    ctx.font = UI_FONTS.bodySmall;
    ctx.fillText(
      "WASD move | E interact | Left click throw rock | Esc pause",
      cw / 2,
      footerY
    );

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
    ctx.fillStyle = "rgba(255, 251, 239, 0.99)";
    ctx.font = UI_FONTS.heading;
    ctx.fillText("MAIN MENU", cw / 2, panelY + 72);

    ctx.fillStyle = "rgba(208, 229, 247, 0.9)";
    ctx.font = UI_FONTS.bodySmall;
    ctx.fillText("Use W/S, Arrow Keys, or Mouse to select", cw / 2, panelY + 108);

    const buttonW = Math.min(560, panelW * 0.72);
    const buttonH = 78;
    const buttonX = cw / 2 - buttonW / 2;
    const firstY = panelY + 168;
    const buttonGap = 106;

    for (let i = 0; i < options.length; i++) {
      const y = firstY + i * buttonGap;
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
    ctx.fillText("Enter/Space/Click: Confirm  |  Esc: Back", cw / 2, panelY + panelH - 42);

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
    ctx.fillText("LEVEL SELECT", cw / 2, panelY + 66);

    const itemW = Math.min(660, panelW * 0.76);
    const itemH = 50;
    const itemX = cw / 2 - itemW / 2;
    let itemY = panelY + 122;

    this.state.levelOptionRects = [];

    if (!levels.length) {
      ctx.fillStyle = "rgba(215, 231, 244, 0.9)";
      ctx.font = UI_FONTS.body;
      ctx.fillText("No levels available", cw / 2, panelY + panelH / 2);
    } else {
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
        ctx.fillText(`${i + 1}. ${name}`, cw / 2, rect.y + rect.h / 2 + 1);

        itemY += 64;
      }
    }

    ctx.fillStyle = "rgba(219, 235, 248, 0.9)";
    ctx.font = UI_FONTS.bodySmall;
    ctx.fillText("W/S or Arrow Keys or Mouse: Select", cw / 2, panelY + panelH - 64);
    ctx.fillText("Enter/Space/Click: Start  |  Esc: Menu  |  C: Credits", cw / 2, panelY + panelH - 36);

    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  _drawCredits(ctx, cw, ch) {
    const panelW = Math.min(920, cw * 0.82);
    const panelH = Math.min(530, ch * 0.74);
    const panelX = (cw - panelW) / 2;
    const panelY = (ch - panelH) / 2;

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
    ctx.fillText("CREDITS", cw / 2, panelY + 66);

    ctx.fillStyle = "rgba(213, 233, 249, 0.9)";
    ctx.font = UI_FONTS.body;
    ctx.fillText("Shadow Signal - Team Project", cw / 2, panelY + 116);

    const names = [
      "Rudolf Arakelyan",
      "Kevin Kamau",
      "Benjamin Petrik",
      "Waleid Sami",
    ];

    let y = panelY + 186;
    for (const name of names) {
      const glow = 0.68 + 0.32 * Math.sin(this.uiTime * 2 + y * 0.01);
      ctx.fillStyle = `rgba(255, 222, 149, ${glow.toFixed(3)})`;
      ctx.font = '700 30px "Rajdhani", "Trebuchet MS", sans-serif';
      ctx.fillText(name, cw / 2, y);
      y += 66;
    }

    ctx.fillStyle = "rgba(219, 235, 248, 0.9)";
    ctx.font = UI_FONTS.bodySmall;
    ctx.fillText("Press Enter/Space/Esc to return", cw / 2, panelY + panelH - 38);

    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  _drawLoading(ctx, cw, ch) {
    const panelW = Math.min(600, cw * 0.64);
    const panelH = Math.min(220, ch * 0.32);
    const panelX = (cw - panelW) / 2;
    const panelY = (ch - panelH) / 2;

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
    const cx = cw / 2;
    const cy = panelY + 76;
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
    ctx.fillText("LOADING", cw / 2, panelY + 146);

    ctx.fillStyle = "rgba(214, 233, 248, 0.88)";
    ctx.font = UI_FONTS.bodySmall;
    ctx.fillText("Preparing mission data...", cw / 2, panelY + panelH - 36);

    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  _drawGameplayHud(ctx, cw, ch) {
    const hasKeycard = !!this.state.hasKeycard;
    const hasDoor = !!this.level.lockedDoor;
    const doorOpen = !hasDoor || this.level.lockedDoor.locked === false || this.level.lockedDoor.state === "OPEN";
    const hasTerminal = !!this.level.terminal;
    const terminalDone = !hasTerminal || !!this.state.terminalComplete;
    const needsKeycard = !!(this.level.keycard || hasDoor);
    const keycardDone = !needsKeycard || hasKeycard || (hasDoor && doorOpen);

    const steps = [];
    if (needsKeycard) steps.push({ label: "Find keycard", done: keycardDone });
    if (hasDoor) steps.push({ label: "Open secured door", done: doorOpen });
    if (hasTerminal) steps.push({ label: "Download terminal data", done: terminalDone });
    steps.push({ label: "Reach extraction", done: this.state.status === "won" });

    const panelX = 18;
    const panelY = 16;
    const panelW = Math.min(420, cw * 0.42);
    const panelH = 44 + steps.length * 28;

    this._drawGlassPanel(ctx, panelX, panelY, panelW, panelH, {
      border: "rgba(169, 220, 250, 0.5)",
      glow: "rgba(89, 164, 214, 0.2)",
      top: "rgba(11, 27, 41, 0.82)",
      bottom: "rgba(7, 17, 27, 0.9)",
      cornerRadius: 14,
    });

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "rgba(245, 249, 255, 0.95)";
    ctx.font = UI_FONTS.body;
    ctx.fillText("MISSION OBJECTIVES", panelX + 16, panelY + 20);

    let lineY = panelY + 48;
    for (const step of steps) {
      ctx.fillStyle = step.done ? "rgba(140, 233, 174, 0.95)" : "rgba(255, 214, 135, 0.95)";
      ctx.beginPath();
      ctx.arc(panelX + 14, lineY, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = step.done ? "rgba(208, 246, 221, 0.98)" : "rgba(247, 238, 218, 0.97)";
      ctx.font = UI_FONTS.bodySmall;
      ctx.fillText(step.label, panelX + 26, lineY);
      lineY += 28;
    }

    const alertRatio = this._getAlertRatio();
    const meterW = Math.min(260, cw * 0.27);
    const meterH = 58;
    const meterX = cw - meterW - 20;
    const meterY = 18;

    this._drawGlassPanel(ctx, meterX, meterY, meterW, meterH, {
      border: "rgba(181, 225, 252, 0.48)",
      glow: "rgba(97, 176, 228, 0.18)",
      top: "rgba(11, 27, 41, 0.8)",
      bottom: "rgba(8, 18, 28, 0.9)",
      cornerRadius: 12,
    });

    const meterInnerX = meterX + 16;
    const meterInnerY = meterY + 30;
    const meterInnerW = meterW - 32;
    const meterInnerH = 14;

    ctx.fillStyle = "rgba(14, 23, 31, 0.95)";
    this._roundedRect(ctx, meterInnerX, meterInnerY, meterInnerW, meterInnerH, 6);
    ctx.fill();

    const fillW = Math.max(0, Math.min(meterInnerW, meterInnerW * alertRatio));
    const meterFill = ctx.createLinearGradient(meterInnerX, 0, meterInnerX + meterInnerW, 0);
    meterFill.addColorStop(0, "#73dfff");
    meterFill.addColorStop(0.6, "#ffc86f");
    meterFill.addColorStop(1, "#ff7070");
    ctx.fillStyle = meterFill;
    this._roundedRect(ctx, meterInnerX, meterInnerY, fillW, meterInnerH, 6);
    ctx.fill();

    ctx.fillStyle = "rgba(241, 247, 255, 0.95)";
    ctx.font = UI_FONTS.bodySmall;
    const alertLabel = alertRatio >= 0.95 ? "ALERT" : (alertRatio >= 0.35 ? "SUSPICIOUS" : "CLEAR");
    ctx.fillText(`Threat: ${alertLabel}`, meterX + 16, meterY + 18);

    const hidden = this.state.playerState === "HIDDEN";
    ctx.fillStyle = hidden ? "rgba(145, 233, 175, 0.94)" : "rgba(245, 196, 122, 0.94)";
    ctx.font = UI_FONTS.bodySmall;
    ctx.textAlign = "right";
    ctx.fillText(hidden ? "Hidden" : "Visible", meterX + meterW - 16, meterY + 18);
    ctx.textAlign = "left";

    const prompt = this.state.uiPrompt || this.state.message;
    if (prompt) {
      const promptW = Math.min(700, cw * 0.75);
      const promptH = 48;
      const promptX = (cw - promptW) / 2;
      const promptY = ch - promptH - 20;

      this._drawGlassPanel(ctx, promptX, promptY, promptW, promptH, {
        border: "rgba(184, 233, 255, 0.56)",
        glow: "rgba(91, 183, 240, 0.2)",
        top: "rgba(13, 30, 45, 0.84)",
        bottom: "rgba(8, 19, 30, 0.9)",
        cornerRadius: 12,
      });

      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(241, 247, 255, 0.96)";
      ctx.font = UI_FONTS.body;
      ctx.fillText(prompt, cw / 2, promptY + promptH / 2 + 1);
      ctx.textAlign = "left";
    }

    if (this.state.debug && this.state.debugInfo && Array.isArray(this.state.debugInfo.guards)) {
      let y = panelY + panelH + 18;
      for (const guardInfo of this.state.debugInfo.guards) {
        if (!guardInfo) continue;
        const label = guardInfo.name || `Guard ${guardInfo.id + 1}`;
        ctx.fillStyle = "rgba(226, 239, 250, 0.9)";
        ctx.font = UI_FONTS.mono;
        ctx.fillText(`${label}: ${guardInfo.aiState || "?"}`, panelX + 2, y);
        y += 19;
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
    ctx.fillText(data.title || "STATUS", cw / 2, panelY + 78);

    ctx.fillStyle = data.accent || "rgba(174, 231, 255, 0.95)";
    ctx.font = UI_FONTS.body;
    ctx.fillText(data.subtitle || "", cw / 2, panelY + 122);

    ctx.fillStyle = "rgba(225, 240, 252, 0.92)";
    ctx.font = UI_FONTS.bodySmall;
    const details = Array.isArray(data.details) ? data.details : [];

    let y = panelY + 178;
    for (const row of details) {
      ctx.fillText(row, cw / 2, y);
      y += 30;
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
