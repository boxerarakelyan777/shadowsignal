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
  constructor(game, level, state, artPackAssets = null, componentAssets = null) {
    this.game = game;
    this.level = level;
    this.state = state;
    this.removeFromWorld = false;
    this.uiTime = 0;
    this.viewCullPadding = 64;
    this.floorTileSize = 128;
    this.patternCache = new WeakMap();
    this.atlasRegionCache = new Map();
    this.artPack = (typeof ART_PACK !== "undefined") ? ART_PACK : null;
    this.artPackAssets = (artPackAssets && typeof artPackAssets === "object") ? artPackAssets : {};
    this.componentAssets = (componentAssets && typeof componentAssets === "object") ? componentAssets : {};
    this.uiArt = this._loadUiArt(UI_ART_PATHS);
    const componentPathMap = this._getComponentSpritePathMap();
    const componentFallbackMap = {};
    for (const path of Object.values(componentPathMap)) {
      if (!path || this.componentAssets[path]) continue;
      componentFallbackMap[path] = path;
    }
    this.componentArt = this._loadUiArt(componentFallbackMap);
    const artPackPathMap = this._getArtPackPathMap();
    const fallbackMap = {};
    for (const path of Object.values(artPackPathMap)) {
      if (!path || this.artPackAssets[path]) continue;
      fallbackMap[path] = path;
    }
    this.artPackFallbackArt = this._loadUiArt(fallbackMap);
    this.floorZones = this._buildFloorZones();
    this.floorStamps = this._buildFloorStamps();
    this.wallDecalStamps = this._buildWallDecalStamps();
  }

  update() {
    const dt = Number(this.game?.clockTick);
    if (Number.isFinite(dt) && dt > 0) {
      this.uiTime += dt;
      this._updateDoorVisuals(dt);
    }
  }

  draw(ctx, game) {
    const status = this.state.status;
    const drawWorld = !["splash", "menu", "level_select", "credits", "loading"].includes(status);
    if (drawWorld) {
      this._drawWorld(ctx);
      this._drawRockProjectiles(ctx);
      this._drawNoisePulse(ctx);
      this._drawWorldVfx(ctx);
      this._drawExtractionWorldFx(ctx);
      this._drawWorldPrompt(ctx);
    }

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

    if (!Array.isArray(this.state.menuOptionRects)) this.state.menuOptionRects = [];
    else this.state.menuOptionRects.length = 0;
    if (!Array.isArray(this.state.levelOptionRects)) this.state.levelOptionRects = [];
    else this.state.levelOptionRects.length = 0;
    if (!Array.isArray(this.state.focusOptionRects)) this.state.focusOptionRects = [];
    else this.state.focusOptionRects.length = 0;
    if (!Array.isArray(this.state.audioSliderRects)) this.state.audioSliderRects = [];
    else this.state.audioSliderRects.length = 0;

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

    const hasFocusModal = status === "paused" || status === "won" || status === "lost";
    this._drawGameplayHud(ctx, cw, ch, {
      drawPrompt: !hasFocusModal,
    });

    let focusModalBounds = null;

    if (status === "paused") {
      const audioSummary = this._buildAudioSummary();
      focusModalBounds = this._drawFocusModal(ctx, cw, ch, {
        title: "PAUSED",
        subtitle: audioSummary ? `Operation frozen - ${audioSummary}` : "Operation frozen",
        accent: "#7de0ff",
        audioSliders: true,
        audioSlidersTitle: "AUDIO MIX",
        buttons: [
          { label: "Resume", actionId: "resume" },
          { label: "Retry", actionId: "retry" },
          { label: "Levels", actionId: "levels" },
          { label: "Home", actionId: "home" },
          { label: "Credits", actionId: "credits" },
        ],
      });
    } else if (status === "won") {
      const hasNextLevel = this.state.levelIndex + 1 < this._num(this.state.levelCount, 1);
      const wonButtons = hasNextLevel
        ? [
            { label: "Next Level", actionId: "next" },
            { label: "Retry", actionId: "retry" },
            { label: "Levels", actionId: "levels" },
            { label: "Home", actionId: "home" },
            { label: "Credits", actionId: "credits" },
          ]
        : [
            { label: "Credits", actionId: "credits" },
            { label: "Retry", actionId: "retry" },
            { label: "Levels", actionId: "levels" },
            { label: "Home", actionId: "home" },
          ];
      focusModalBounds = this._drawFocusModal(ctx, cw, ch, {
        title: "MISSION COMPLETE",
        subtitle: "Extraction confirmed",
        accent: "#8ef0b0",
        audioSliders: true,
        audioSlidersTitle: "AUDIO MIX",
        buttons: wonButtons,
      });
    } else if (status === "lost") {
      const guardInfo = this.state.lastCaptureByGuardId !== null
        ? `Detected by guard ${this.state.lastCaptureByGuardId + 1}`
        : "Detection confirmed";
      focusModalBounds = this._drawFocusModal(ctx, cw, ch, {
        title: "MISSION FAILED",
        subtitle: guardInfo,
        accent: "#ff7a72",
        audioSliders: true,
        audioSlidersTitle: "AUDIO MIX",
        buttons: [
          { label: "Retry", actionId: "retry" },
          { label: "Levels", actionId: "levels" },
          { label: "Home", actionId: "home" },
          { label: "Credits", actionId: "credits" },
        ],
      });
    }

    if (hasFocusModal) {
      this._drawModalPromptToast(ctx, cw, ch, focusModalBounds, (this.state.message || "").toString());
    }

    ctx.restore();
  }

  _drawWorld(ctx) {
    const levelWidth = Math.max(1, this.level.width || 1);
    const levelHeight = Math.max(1, this.level.height || 1);
    const floorVariant = this._defaultFloorVariant();
    const wallVariant = this.level.wallVariant || "default";
    const lowPerf = this._isLowPerf();
    const floorVisual = this._getComponentVisual("floor", floorVariant);
    const view = this._getWorldViewBounds(this.viewCullPadding);
    const floorRect = view
      ? {
          x: Math.max(0, view.x),
          y: Math.max(0, view.y),
          w: Math.max(1, Math.min(levelWidth, view.x + view.w) - Math.max(0, view.x)),
          h: Math.max(1, Math.min(levelHeight, view.y + view.h) - Math.max(0, view.y)),
        }
      : { x: 0, y: 0, w: levelWidth, h: levelHeight };

    this._drawFloorSystem(ctx, floorRect, view, lowPerf);
    this._drawWorldGrid(ctx, levelWidth, levelHeight, floorVisual, view);
    if (!lowPerf) {
      this._drawWorldAmbient(ctx, levelWidth, levelHeight, view, floorVisual);
      this._drawFloorToneBreakup(ctx, levelWidth, levelHeight, view, floorVisual);
    }

    for (const w of this.level.walls || []) {
      if (!w) continue;
      const componentType = w.componentType || "wall";
      if (componentType !== "wall") continue;
      if (!this._rectInView(w, view)) continue;
      const wallVariantId = this._resolveWallVariant(w, wallVariant);
      const wallVisual = this._getComponentVisual("wall", wallVariantId);
      this._drawRectComponent(ctx, w, "wall", wallVariantId);
      this._drawWallDepth(ctx, w);
      if (!lowPerf) {
        this._drawWallTrim(ctx, w, wallVisual);
        this._drawWallGrounding(ctx, w, wallVisual);
        this._drawWallAo(ctx, w, wallVisual);
      }
    }
    if (!lowPerf) this._drawWallDecalStamps(ctx, view);

    for (const door of this._getLevelDoors()) {
      if (!door) continue;
      if (!this._rectInView(door, view)) continue;
      this._drawLockedDoor(ctx, door);
    }

    for (const h of this.level.hideSpots || []) {
      if (!h) continue;
      if (!this._rectInView(h, view)) continue;
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
      if (this._rectInView(this.level.terminal, view)) {
        const terminalVariant = this.state.objectiveComplete ? "complete" : "default";
        this._drawRectComponent(ctx, this.level.terminal, "terminal", terminalVariant);
        this._drawTerminalStateOverlay(ctx, this.level.terminal);
      }
    }

    for (const pickup of this._getLevelPickups()) {
      if (!pickup) continue;
      if (!this._rectInView(pickup, view)) continue;
      this._drawKeycardPickup(ctx, pickup);
    }

    if (this.level.exitZone) {
      if (this._rectInView(this.level.exitZone, view)) {
        this._drawRectComponent(ctx, this.level.exitZone, "exitZone", this.level.exitZone.variant || "default");
      }
    }

  }

  _defaultFloorVariant() {
    const candidate = (this.level?.floorVariant || "default").toString();
    const supported = ["default", "concrete", "ops", "secure"];
    if (supported.includes(candidate)) return candidate;
    return "default";
  }

  _getLevelDoors() {
    const doors = [];
    if (this.level?.lockedDoor) doors.push(this.level.lockedDoor);
    if (Array.isArray(this.level?.lockedDoors)) {
      for (const door of this.level.lockedDoors) {
        if (!door) continue;
        if (!doors.some(existing => this._rectMatches(existing, door))) {
          doors.push(door);
        }
      }
    }
    return doors;
  }

  _getLevelPickups() {
    const pickups = [];
    if (this.level?.keycard) pickups.push(this.level.keycard);
    if (Array.isArray(this.level?.pickups)) {
      for (const pickup of this.level.pickups) {
        if (!pickup) continue;
        if (!pickups.some(existing => this._rectMatches(existing, pickup))) {
          pickups.push(pickup);
        }
      }
    }
    return pickups;
  }

  _useFloorZones() {
    return this.level?.useFloorZones === true;
  }

  _floorTransitionsEnabled() {
    return this.level?.enableFloorTransitions === true;
  }

  _floorStampsEnabled() {
    return this.level?.enableFloorStamps === true;
  }

  _wallDecalsEnabled() {
    return this.level?.enableWallDecals !== false;
  }

  _buildFloorZones() {
    const levelW = Math.max(1, this._num(this.level?.width, 1));
    const levelH = Math.max(1, this._num(this.level?.height, 1));
    const defaultVariant = this._defaultFloorVariant();
    if (!this._useFloorZones()) {
      return [{
        id: "full_level",
        x: 0,
        y: 0,
        w: levelW,
        h: levelH,
        role: "default",
        priority: 0,
        variant: defaultVariant,
      }];
    }
    const input = Array.isArray(this.level?.floorZones) ? this.level.floorZones : [];
    const zones = [];

    const normalizeVariant = raw => {
      const variant = (raw || defaultVariant).toString();
      if (this._getComponentVisual("floor", variant)) return variant;
      return defaultVariant;
    };

    for (let i = 0; i < input.length; i++) {
      const zone = input[i];
      if (!zone) continue;
      const x = Math.max(0, Math.min(levelW, this._num(zone.x, 0)));
      const y = Math.max(0, Math.min(levelH, this._num(zone.y, 0)));
      const w = Math.max(1, Math.min(levelW - x, this._num(zone.w, 0)));
      const h = Math.max(1, Math.min(levelH - y, this._num(zone.h, 0)));
      const role = (zone.role || "default").toString();
      const priority = this._num(zone.priority, 0);
      zones.push({
        id: (zone.id || `${role}_${i}`).toString(),
        x,
        y,
        w,
        h,
        role,
        priority,
        variant: normalizeVariant(zone.variant || zone.floorVariant || defaultVariant),
      });
    }

    if (!zones.length) {
      zones.push({
        id: "full_level",
        x: 0,
        y: 0,
        w: levelW,
        h: levelH,
        role: "default",
        priority: 0,
        variant: defaultVariant,
      });
    }

    zones.sort((a, b) => {
      const prio = b.priority - a.priority;
      if (prio !== 0) return prio;
      const areaA = a.w * a.h;
      const areaB = b.w * b.h;
      return areaA - areaB;
    });

    return zones;
  }

  _getFloorZoneAt(worldX, worldY) {
    const zones = Array.isArray(this.floorZones) ? this.floorZones : [];
    for (const zone of zones) {
      if (!zone) continue;
      if (worldX >= zone.x && worldX < zone.x + zone.w && worldY >= zone.y && worldY < zone.y + zone.h) {
        return zone;
      }
    }
    return {
      id: "fallback",
      x: 0,
      y: 0,
      w: Math.max(1, this._num(this.level?.width, 1)),
      h: Math.max(1, this._num(this.level?.height, 1)),
      role: "default",
      variant: this._defaultFloorVariant(),
    };
  }

  _getFloorVariantAtTile(tileX, tileY) {
    const tileSize = this.floorTileSize;
    const worldX = tileX * tileSize + tileSize * 0.5;
    const worldY = tileY * tileSize + tileSize * 0.5;
    const zone = this._getFloorZoneAt(worldX, worldY);
    return (zone?.variant || this._defaultFloorVariant()).toString();
  }

  _drawFloorSystem(ctx, floorRect, view, lowPerf = false) {
    this._drawFloorBaseTiles(ctx, floorRect);
    this._drawFloorMacroLayers(ctx, floorRect, lowPerf);
    if (this._floorTransitionsEnabled()) {
      this._drawFloorTransitionBorders(ctx, floorRect, lowPerf);
    }
    if (!lowPerf && this._floorStampsEnabled()) {
      this._drawFloorStamps(ctx, view);
    }
  }

  _drawFloorBaseTiles(ctx, floorRect) {
    if (!floorRect || floorRect.w <= 0 || floorRect.h <= 0) return;

    const tileSize = this.floorTileSize;
    const startTX = Math.floor(floorRect.x / tileSize);
    const endTX = Math.ceil((floorRect.x + floorRect.w) / tileSize);
    const startTY = Math.floor(floorRect.y / tileSize);
    const endTY = Math.ceil((floorRect.y + floorRect.h) / tileSize);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let ty = startTY; ty < endTY; ty++) {
      for (let tx = startTX; tx < endTX; tx++) {
        const worldX = tx * tileSize;
        const worldY = ty * tileSize;
        const zone = this._getFloorZoneAt(worldX + tileSize * 0.5, worldY + tileSize * 0.5);
        const visual = this._getComponentVisual("floor", zone?.variant || this._defaultFloorVariant());
        if (!visual) continue;

        const basePaths = Array.isArray(visual.tileSpritePaths) && visual.tileSpritePaths.length
          ? visual.tileSpritePaths
          : (visual.spritePath ? [visual.spritePath] : []);
        if (!basePaths.length) continue;

        const seed = this._hashString(`${zone.variant}::base_tiles`);
        const cluster = Math.max(1, Math.round(this._num(visual.variantClusterTiles, 2)));
        const vx = Math.floor(tx / cluster);
        const vy = Math.floor(ty / cluster);
        const index = this._tileVariantIndex(vx, vy, basePaths.length, seed);
        const image = this._getComponentImage(basePaths[index]);
        if (!image) continue;
        ctx.drawImage(image, worldX, worldY, tileSize, tileSize);
      }
    }
    ctx.restore();
  }

  _drawFloorMacroLayers(ctx, floorRect, lowPerf = false) {
    if (!floorRect || floorRect.w <= 0 || floorRect.h <= 0) return;

    const zones = Array.isArray(this.floorZones) ? this.floorZones : [];
    for (const zone of zones) {
      if (!zone) continue;
      const zoneRect = this._intersectRect(floorRect, zone);
      if (!zoneRect) continue;

      const visual = this._getComponentVisual("floor", zone.variant);
      if (!visual) continue;
      const macroPaths = Array.isArray(visual.macroTileSpritePaths) && visual.macroTileSpritePaths.length
        ? visual.macroTileSpritePaths
        : (visual.macroSpritePath ? [visual.macroSpritePath] : []);
      if (!macroPaths.length) continue;

      let alpha = this._num(visual.macroAlpha, 0.1);
      if (zone.role === "spawn") alpha *= 1.15;
      if (zone.role === "secure") alpha *= 1.2;
      if (zone.role === "terminal") alpha *= 0.65;
      if (lowPerf) alpha *= 0.72;
      alpha = clamp(alpha, 0.03, 0.14);

      const layerVisual = {
        tileMode: "repeat",
        tileSpritePaths: macroPaths,
        tileW: Math.max(1, this._num(visual.macroTileW, 512)),
        tileH: Math.max(1, this._num(visual.macroTileH, 512)),
        tileAnchorX: 0,
        tileAnchorY: 0,
        tileVariantSeed: this._hashString(`${zone.id}::macro`),
        variantClusterTiles: 4,
        forceSingleTile: false,
        spritePixelSnap: true,
        spriteAlpha: alpha,
      };

      ctx.save();
      ctx.globalCompositeOperation = visual.macroBlend || "soft-light";
      this._drawSpriteFill(ctx, zoneRect, layerVisual, 1, { tileAnchorX: 0, tileAnchorY: 0 });
      ctx.restore();
    }
  }

  _getFloorTransitionAtlasPath(fromVariant, toVariant) {
    if (fromVariant === "ops" && toVariant === "concrete") {
      return "./assets/sprites/shadow_signal_environment_kit/final/floors/transitions/floor_transition_ops_to_concrete.png";
    }
    if (fromVariant === "concrete" && toVariant === "secure") {
      return "./assets/sprites/shadow_signal_environment_kit/final/floors/transitions/floor_transition_concrete_to_secure.png";
    }
    return "";
  }

  _getTransitionAtlasIndex(flags) {
    if (!flags) return -1;
    const north = !!flags.north;
    const south = !!flags.south;
    const west = !!flags.west;
    const east = !!flags.east;
    const nw = !!flags.nw;
    const ne = !!flags.ne;
    const sw = !!flags.sw;
    const se = !!flags.se;

    if (north && west) return 5;
    if (north && east) return 6;
    if (south && west) return 8;
    if (south && east) return 9;
    if (north) return 1;
    if (south) return 2;
    if (west) return 4;
    if (east) return 7;
    if (nw) return 5;
    if (ne) return 6;
    if (sw) return 8;
    if (se) return 9;
    return -1;
  }

  _drawFloorTransitionBorders(ctx, floorRect, lowPerf = false) {
    if (!floorRect || floorRect.w <= 0 || floorRect.h <= 0) return;

    const tileSize = this.floorTileSize;
    const startTX = Math.floor(floorRect.x / tileSize);
    const endTX = Math.ceil((floorRect.x + floorRect.w) / tileSize);
    const startTY = Math.floor(floorRect.y / tileSize);
    const endTY = Math.ceil((floorRect.y + floorRect.h) / tileSize);
    const alpha = lowPerf ? 0.12 : 0.2;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let ty = startTY; ty < endTY; ty++) {
      for (let tx = startTX; tx < endTX; tx++) {
        const fromVariant = this._getFloorVariantAtTile(tx, ty);
        const toVariant = fromVariant === "ops" ? "concrete" : (fromVariant === "concrete" ? "secure" : "");
        if (!toVariant) continue;

        const atlasPath = this._getFloorTransitionAtlasPath(fromVariant, toVariant);
        if (!atlasPath) continue;

        const flags = {
          north: this._getFloorVariantAtTile(tx, ty - 1) === toVariant,
          south: this._getFloorVariantAtTile(tx, ty + 1) === toVariant,
          west: this._getFloorVariantAtTile(tx - 1, ty) === toVariant,
          east: this._getFloorVariantAtTile(tx + 1, ty) === toVariant,
          nw: this._getFloorVariantAtTile(tx - 1, ty - 1) === toVariant,
          ne: this._getFloorVariantAtTile(tx + 1, ty - 1) === toVariant,
          sw: this._getFloorVariantAtTile(tx - 1, ty + 1) === toVariant,
          se: this._getFloorVariantAtTile(tx + 1, ty + 1) === toVariant,
        };

        const index = this._getTransitionAtlasIndex(flags);
        if (index < 0) continue;

        const sx = (index % 4) * 128;
        const sy = Math.floor(index / 4) * 128;
        const region = this._getAtlasRegionImage(atlasPath, sx, sy, 128, 128);
        if (!region) continue;

        const worldX = tx * tileSize;
        const worldY = ty * tileSize;
        ctx.globalAlpha = alpha;
        ctx.drawImage(region, worldX, worldY, tileSize, tileSize);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _buildFloorStamps() {
    if (!this._floorStampsEnabled()) return [];

    const stamps = [];
    const baseVisual = this._getComponentVisual("floor", this._defaultFloorVariant()) || {};
    const markingPath = baseVisual.markingSpritePath || "./assets/sprites/shadow_signal_environment_kit/final/floors/markings/floor_markings_hazard.png";
    const decalPath = baseVisual.decalSpritePath || "./assets/sprites/shadow_signal_environment_kit/final/floors/decals/floor_decals_common.png";
    const tileArea = this.floorTileSize * this.floorTileSize;
    const zones = Array.isArray(this.floorZones) ? this.floorZones : [];

    for (const zone of zones) {
      if (!zone) continue;
      const area = zone.w * zone.h;
      const baseCount = Math.max(1, Math.round(area / (tileArea * 28)));
      const role = (zone.role || "default").toString();

      if (role === "corridor") {
        this._addCorridorMarkings(stamps, zone, markingPath);
        this._addZoneEdgeDecals(stamps, zone, Math.max(1, Math.floor(baseCount * 0.4)), decalPath, 0.06, 0.13);
      } else if (role === "spawn") {
        this._addZoneEdgeDecals(stamps, zone, Math.max(1, Math.floor(baseCount * 0.32)), decalPath, 0.05, 0.11);
      } else if (role === "secure") {
        this._addZoneEdgeDecals(stamps, zone, Math.max(1, Math.floor(baseCount * 0.48)), decalPath, 0.06, 0.13);
        this._addSecureAccentMarkings(stamps, zone, markingPath);
      } else if (role === "terminal") {
        this._addZoneEdgeDecals(stamps, zone, Math.max(1, Math.floor(baseCount * 0.2)), decalPath, 0.04, 0.09);
      } else {
        this._addZoneEdgeDecals(stamps, zone, Math.max(1, Math.floor(baseCount * 0.26)), decalPath, 0.05, 0.1);
      }
    }

    for (const door of this._getLevelDoors()) {
      this._addDoorThresholdFloorStamps(stamps, door, markingPath, decalPath);
    }
    this._addObjectiveFloorDecals(stamps, decalPath);
    return stamps;
  }

  _addCorridorMarkings(stamps, zone, markingPath) {
    if (!stamps || !zone || !markingPath) return;
    const horizontal = zone.w >= zone.h;
    const step = 256;
    const seed = this._hashString(`${zone.id}::corridor_markings`);
    const flow = (zone.flow || "").toString().toLowerCase();

    if (horizontal) {
      const dirRotation = flow === "west" ? Math.PI * 0.5 : -Math.PI * 0.5;
      const y = zone.y + zone.h * 0.5;
      for (let x = zone.x + 96; x <= zone.x + zone.w - 96; x += step) {
        const row = this._tileHash(Math.floor(x), Math.floor(y), seed) % 8;
        this._pushMarkingStamp(stamps, markingPath, 1, row, x, y, 62, 0.14, dirRotation);
        this._pushMarkingStamp(stamps, markingPath, 2, row, x, y + 26, 58, 0.1, 0);
      }
      return;
    }

    const dirRotation = flow === "south" ? Math.PI : 0;
    const x = zone.x + zone.w * 0.5;
    for (let y = zone.y + 96; y <= zone.y + zone.h - 96; y += step) {
      const row = this._tileHash(Math.floor(x), Math.floor(y), seed) % 8;
      this._pushMarkingStamp(stamps, markingPath, 1, row, x, y, 62, 0.14, dirRotation);
      this._pushMarkingStamp(stamps, markingPath, 2, row, x + 26, y, 58, 0.1, -Math.PI * 0.5);
    }
  }

  _addSecureAccentMarkings(stamps, zone, markingPath) {
    if (!stamps || !zone || !markingPath) return;
    const seed = this._hashString(`${zone.id}::secure_markings`);
    const count = Math.max(1, Math.floor((zone.w * zone.h) / (this.floorTileSize * this.floorTileSize * 22)));
    for (let i = 0; i < count; i++) {
      const h = this._tileHash(i + seed, Math.floor(zone.x), Math.floor(zone.y));
      const x = zone.x + 64 + ((h >>> 8) % Math.max(1, Math.floor(zone.w - 128)));
      const y = zone.y + 64 + ((h >>> 18) % Math.max(1, Math.floor(zone.h - 128)));
      const row = h % 8;
      this._pushMarkingStamp(stamps, markingPath, 6, row, x, y, 52, 0.08, 0);
    }
  }

  _addDoorThresholdFloorStamps(stamps, door, markingPath, decalPath) {
    if (!stamps || !door || !markingPath) return;
    const cx = door.x + door.w * 0.5;
    const cy = door.y + door.h * 0.5;
    const vertical = door.h >= door.w;
    const row = this._tileHash(Math.floor(cx), Math.floor(cy), 191) % 8;

    if (vertical) {
      this._pushMarkingStamp(stamps, markingPath, 0, row, cx - 56, cy, 80, 0.2, Math.PI * 0.5);
      this._pushMarkingStamp(stamps, markingPath, 0, row, cx + 56, cy, 80, 0.2, Math.PI * 0.5);
      this._pushMarkingStamp(stamps, markingPath, 4, row, cx, door.y - 18, 84, 0.14, 0);
      this._pushMarkingStamp(stamps, markingPath, 4, row, cx, door.y + door.h + 18, 84, 0.14, 0);
    } else {
      this._pushMarkingStamp(stamps, markingPath, 0, row, cx, cy - 56, 80, 0.2, 0);
      this._pushMarkingStamp(stamps, markingPath, 0, row, cx, cy + 56, 80, 0.2, 0);
      this._pushMarkingStamp(stamps, markingPath, 4, row, door.x - 18, cy, 84, 0.14, -Math.PI * 0.5);
      this._pushMarkingStamp(stamps, markingPath, 4, row, door.x + door.w + 18, cy, 84, 0.14, -Math.PI * 0.5);
    }

    if (!decalPath) return;
    this._pushDecalStamp(stamps, decalPath, cx - 46, cy - 40, 88, 78, this._tileHash(Math.floor(cx), Math.floor(cy), 381), 0.09);
    this._pushDecalStamp(stamps, decalPath, cx - 28, cy + 24, 74, 66, this._tileHash(Math.floor(cx), Math.floor(cy), 577), 0.07);
  }

  _addObjectiveFloorDecals(stamps, decalPath) {
    if (!stamps || !decalPath) return;
    const objectives = [this.level?.terminal, ...this._getLevelPickups(), this.level?.exitZone];
    for (let i = 0; i < objectives.length; i++) {
      const target = objectives[i];
      if (!target) continue;
      const cx = target.x + target.w * 0.5;
      const cy = target.y + target.h * 0.5;
      const h = this._tileHash(Math.floor(cx), Math.floor(cy), 961 + i * 73);
      const dx = ((h & 255) / 255 - 0.5) * 26;
      const dy = (((h >>> 8) & 255) / 255 - 0.5) * 26;
      this._pushDecalStamp(stamps, decalPath, cx - 40 + dx, cy - 36 + dy, 72, 64, h, 0.07);
    }
  }

  _addZoneEdgeDecals(stamps, zone, count, decalPath, alphaMin, alphaMax) {
    if (!stamps || !zone || !decalPath || count <= 0) return;
    const seed = this._hashString(`${zone.id}::edge_decals`);
    for (let i = 0; i < count; i++) {
      const h = this._tileHash(i + seed, Math.floor(zone.x), Math.floor(zone.y));
      const side = h & 3;
      const rx = ((h >>> 8) & 1023) / 1023;
      const ry = ((h >>> 18) & 1023) / 1023;
      let x = zone.x + zone.w * 0.5;
      let y = zone.y + zone.h * 0.5;

      if (side === 0) {
        x = zone.x + 18 + rx * 36;
        y = zone.y + 18 + ry * Math.max(1, zone.h - 36);
      } else if (side === 1) {
        x = zone.x + zone.w - 54 + rx * 36;
        y = zone.y + 18 + ry * Math.max(1, zone.h - 36);
      } else if (side === 2) {
        x = zone.x + 18 + rx * Math.max(1, zone.w - 36);
        y = zone.y + 18 + ry * 36;
      } else {
        x = zone.x + 18 + rx * Math.max(1, zone.w - 36);
        y = zone.y + zone.h - 54 + ry * 36;
      }

      const w = 48 + ((h >>> 4) % 56);
      const hSize = 42 + ((h >>> 12) % 50);
      const alpha = alphaMin + (((h >>> 20) & 255) / 255) * (alphaMax - alphaMin);
      this._pushDecalStamp(stamps, decalPath, x, y, w, hSize, h, alpha);
    }
  }

  _pushMarkingStamp(stamps, path, cellCol, cellRow, centerX, centerY, size, alpha, rotation = 0) {
    if (!stamps || !path) return;
    const tile = 64;
    const x = centerX - size * 0.5;
    const y = centerY - size * 0.5;
    stamps.push({
      path,
      sx: Math.max(0, Math.floor(cellCol) * tile),
      sy: Math.max(0, Math.floor(cellRow % 8) * tile),
      sw: tile,
      sh: tile,
      x,
      y,
      w: size,
      h: size,
      alpha: clamp(this._num(alpha, 0.2), 0, 1),
      rotation: this._num(rotation, 0),
      blend: "source-over",
    });
  }

  _pushDecalStamp(stamps, path, x, y, w, h, seed, alpha) {
    if (!stamps || !path) return;
    const hashA = this._tileHash(seed | 0, Math.floor(x), Math.floor(y));
    const hashB = this._tileHash(Math.floor(w), Math.floor(h), seed | 0);
    const sw = 72 + (hashA % 180);
    const sh = 64 + ((hashA >>> 8) % 170);
    const maxX = Math.max(1, 1024 - sw);
    const maxY = Math.max(1, 1024 - sh);
    const sx = hashB % maxX;
    const sy = (hashB >>> 8) % maxY;
    const rotation = (((hashB >>> 20) & 255) / 255 - 0.5) * 0.24;

    stamps.push({
      path,
      sx,
      sy,
      sw,
      sh,
      x,
      y,
      w: Math.max(36, this._num(w, 72)),
      h: Math.max(30, this._num(h, 64)),
      alpha: clamp(this._num(alpha, 0.14), 0, 1),
      rotation,
      blend: "source-over",
    });
  }

  _drawFloorStamps(ctx, view) {
    const stamps = Array.isArray(this.floorStamps) ? this.floorStamps : [];
    if (!stamps.length) return;
    const maxStamps = this._isLowPerf() ? Math.min(18, stamps.length) : stamps.length;
    for (let i = 0; i < maxStamps; i++) {
      this._drawAtlasStamp(ctx, stamps[i], view);
    }
  }

  _buildWallDecalStamps() {
    if (!this._wallDecalsEnabled()) return [];

    const stamps = [];
    const visual = this._getComponentVisual("wall", "default");
    const path = visual?.decalSpritePath;
    if (!path) return stamps;

    const walls = Array.isArray(this.level?.walls) ? this.level.walls : [];
    const limit = 8;
    for (let i = 0; i < walls.length && stamps.length < limit; i++) {
      const wall = walls[i];
      if (!wall || wall.componentType !== "wall") continue;
      if (this._isBoundaryWall(wall)) continue;
      if (Math.max(wall.w, wall.h) < 120) continue;

      const hash = this._tileHash(Math.floor(wall.x), Math.floor(wall.y), 7331 + i * 13);
      if ((hash % 16) !== 0) continue;
      const horizontal = wall.w >= wall.h;
      const offset = 18 + ((hash >>> 6) % Math.max(1, Math.floor((horizontal ? wall.w : wall.h) - 64)));
      const x = horizontal ? (wall.x + offset) : (wall.x + wall.w * 0.2);
      const y = horizontal ? (wall.y + wall.h * 0.14) : (wall.y + offset);
      const w = horizontal ? 74 + ((hash >>> 16) % 38) : 62 + ((hash >>> 16) % 30);
      const h = horizontal ? 62 + ((hash >>> 21) % 32) : 74 + ((hash >>> 21) % 40);

      this._pushDecalStamp(stamps, path, x, y, w, h, hash, 0.08);
    }

    return stamps;
  }

  _drawWallDecalStamps(ctx, view) {
    const stamps = Array.isArray(this.wallDecalStamps) ? this.wallDecalStamps : [];
    for (const stamp of stamps) {
      this._drawAtlasStamp(ctx, stamp, view);
    }
  }

  _drawAtlasStamp(ctx, stamp, view = null) {
    if (!stamp || !stamp.path) return;
    if (view) {
      const radius = Math.max(stamp.w, stamp.h) * 0.6;
      const cx = stamp.x + stamp.w * 0.5;
      const cy = stamp.y + stamp.h * 0.5;
      if (cx + radius < view.x || cx - radius > view.x + view.w || cy + radius < view.y || cy - radius > view.y + view.h) {
        return;
      }
    }

    const region = this._getAtlasRegionImage(stamp.path, stamp.sx, stamp.sy, stamp.sw, stamp.sh);
    if (!region) return;

    const alpha = clamp(this._num(stamp.alpha, 1), 0, 1);
    const rotation = this._num(stamp.rotation, 0);
    const cx = stamp.x + stamp.w * 0.5;
    const cy = stamp.y + stamp.h * 0.5;

    ctx.save();
    if (stamp.blend) ctx.globalCompositeOperation = stamp.blend;
    if (alpha < 1) ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.translate(cx, cy);
    if (rotation) ctx.rotate(rotation);
    ctx.drawImage(region, -stamp.w * 0.5, -stamp.h * 0.5, stamp.w, stamp.h);
    ctx.restore();
  }

  _resolveWallVariant(wall, fallbackVariant = "default") {
    if (wall?.variant) return wall.variant;
    const fallback = (fallbackVariant || "default").toString();
    return this._getComponentVisual("wall", fallback) ? fallback : "default";
  }

  _isBoundaryWall(wall) {
    if (!wall) return false;
    const levelW = Math.max(1, this._num(this.level?.width, 1));
    const levelH = Math.max(1, this._num(this.level?.height, 1));
    return (
      wall.x <= 1 ||
      wall.y <= 1 ||
      wall.x + wall.w >= levelW - 1 ||
      wall.y + wall.h >= levelH - 1
    );
  }

  _intersectRect(a, b) {
    if (!a || !b) return null;
    const x1 = Math.max(this._num(a.x, 0), this._num(b.x, 0));
    const y1 = Math.max(this._num(a.y, 0), this._num(b.y, 0));
    const x2 = Math.min(this._num(a.x, 0) + this._num(a.w, 0), this._num(b.x, 0) + this._num(b.w, 0));
    const y2 = Math.min(this._num(a.y, 0) + this._num(a.h, 0), this._num(b.y, 0) + this._num(b.h, 0));
    if (x2 <= x1 || y2 <= y1) return null;
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }

  _drawWorldGrid(ctx, width, height, floorVisual = null, view = null) {
    if (floorVisual?.gridColor === false) return;

    const gridSize = Math.max(8, Math.round(this._num(floorVisual?.gridSize, 64)));
    const minX = Math.max(0, view ? view.x : 0);
    const minY = Math.max(0, view ? view.y : 0);
    const maxX = Math.min(width, view ? view.x + view.w : width);
    const maxY = Math.min(height, view ? view.y + view.h : height);
    const startX = Math.floor(minX / gridSize) * gridSize;
    const startY = Math.floor(minY / gridSize) * gridSize;

    ctx.save();
    const gridColor = floorVisual?.gridColor || "rgba(168, 205, 244, 0.04)";
    if (gridColor === "transparent" || gridColor === "none") {
      ctx.restore();
      return;
    }
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;

    for (let x = startX; x <= maxX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, minY);
      ctx.lineTo(x + 0.5, maxY);
      ctx.stroke();
    }

    for (let y = startY; y <= maxY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(minX, y + 0.5);
      ctx.lineTo(maxX, y + 0.5);
      ctx.stroke();
    }

    ctx.restore();
  }

  _drawWorldAmbient(ctx, width, height, view, floorVisual = null) {
    const minX = Math.max(0, view ? view.x : 0);
    const minY = Math.max(0, view ? view.y : 0);
    const maxX = Math.min(width, view ? view.x + view.w : width);
    const maxY = Math.min(height, view ? view.y + view.h : height);
    const w = Math.max(1, maxX - minX);
    const h = Math.max(1, maxY - minY);
    const levelW = Math.max(1, this._num(this.level?.width, width));
    const levelH = Math.max(1, this._num(this.level?.height, height));
    const keyX = levelW * 0.32;
    const keyY = levelH * 0.24;
    const baseDepth = this._num(floorVisual?.ambientDepth, 0.2);

    const radial = ctx.createRadialGradient(
      keyX,
      keyY,
      Math.min(levelW, levelH) * 0.12,
      keyX,
      keyY,
      Math.max(levelW, levelH) * 0.78
    );
    radial.addColorStop(0, `rgba(170, 206, 232, ${(0.018 + baseDepth * 0.018).toFixed(3)})`);
    radial.addColorStop(0.6, `rgba(76, 112, 142, ${(0.008 + baseDepth * 0.012).toFixed(3)})`);
    radial.addColorStop(1, `rgba(0, 0, 0, ${(0.03 + baseDepth * 0.06).toFixed(3)})`);

    const vertical = ctx.createLinearGradient(0, minY, 0, maxY);
    vertical.addColorStop(0, "rgba(166, 205, 233, 0.01)");
    vertical.addColorStop(0.52, "rgba(58, 92, 123, 0.003)");
    vertical.addColorStop(1, `rgba(0, 0, 0, ${(0.02 + baseDepth * 0.05).toFixed(3)})`);

    ctx.save();
    ctx.fillStyle = radial;
    ctx.fillRect(minX, minY, w, h);
    ctx.fillStyle = vertical;
    ctx.fillRect(minX, minY, w, h);
    ctx.restore();
  }

  _drawFloorToneBreakup(ctx, width, height, view, floorVisual = null) {
    const strength = Math.max(0, this._num(floorVisual?.toneBreakupStrength, 0));
    if (strength <= 0) return;

    const minX = Math.max(0, view ? view.x : 0);
    const minY = Math.max(0, view ? view.y : 0);
    const maxX = Math.min(width, view ? view.x + view.w : width);
    const maxY = Math.min(height, view ? view.y + view.h : height);
    const cellSize = Math.max(96, this._num(floorVisual?.toneBreakupCell, 320));
    const seed = this._num(
      floorVisual?.toneBreakupSeed,
      this._hashString((floorVisual?.spritePath || "floor") + "::tone_breakup")
    );

    const startX = Math.floor(minX / cellSize) - 1;
    const startY = Math.floor(minY / cellSize) - 1;
    const endX = Math.ceil(maxX / cellSize) + 1;
    const endY = Math.ceil(maxY / cellSize) + 1;

    ctx.save();
    for (let gy = startY; gy <= endY; gy++) {
      for (let gx = startX; gx <= endX; gx++) {
        const hash = this._tileHash(gx, gy, seed);
        const normalized = ((hash & 1023) / 1023) * 2 - 1;
        const magnitude = Math.abs(normalized);
        if (magnitude < 0.22) continue;

        const alpha = ((magnitude - 0.22) / 0.78) * strength;
        const jitterX = (((hash >>> 12) & 255) / 255 - 0.5) * 0.24;
        const jitterY = (((hash >>> 20) & 255) / 255 - 0.5) * 0.24;
        const radius = cellSize * (0.44 + (((hash >>> 8) & 255) / 255) * 0.32);
        const cx = (gx + 0.5 + jitterX) * cellSize;
        const cy = (gy + 0.5 + jitterY) * cellSize;

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        if (normalized >= 0) {
          ctx.globalCompositeOperation = "screen";
          grad.addColorStop(0, `rgba(138, 176, 206, ${alpha.toFixed(3)})`);
          grad.addColorStop(1, "rgba(138, 176, 206, 0)");
        } else {
          ctx.globalCompositeOperation = "multiply";
          grad.addColorStop(0, `rgba(8, 15, 24, ${alpha.toFixed(3)})`);
          grad.addColorStop(1, "rgba(8, 15, 24, 0)");
        }

        ctx.fillStyle = grad;
        ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      }
    }
    ctx.restore();
  }

  _drawWallDepth(ctx, wall) {
    if (!wall || wall.w <= 0 || wall.h <= 0) return;

    const thickness = Math.min(wall.w, wall.h);
    const bevel = Math.max(1, Math.min(7, thickness * 0.2));
    const isHorizontal = wall.w >= wall.h;

    ctx.save();
    if (isHorizontal) {
      const cast = ctx.createLinearGradient(0, wall.y + wall.h, 0, wall.y + wall.h + bevel * 2.3);
      cast.addColorStop(0, "rgba(0, 0, 0, 0.18)");
      cast.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = cast;
      ctx.fillRect(wall.x, wall.y + wall.h, wall.w, bevel * 2.3);

      const topLight = ctx.createLinearGradient(0, wall.y, 0, wall.y + bevel * 2.1);
      topLight.addColorStop(0, "rgba(224, 242, 255, 0.08)");
      topLight.addColorStop(1, "rgba(224, 242, 255, 0)");
      ctx.fillStyle = topLight;
      ctx.fillRect(wall.x, wall.y, wall.w, bevel * 2.1);

      ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
      ctx.fillRect(wall.x, wall.y + wall.h - 1, wall.w, Math.max(1, bevel * 0.9));
    } else {
      const cast = ctx.createLinearGradient(wall.x + wall.w, 0, wall.x + wall.w + bevel * 2.3, 0);
      cast.addColorStop(0, "rgba(0, 0, 0, 0.16)");
      cast.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = cast;
      ctx.fillRect(wall.x + wall.w, wall.y, bevel * 2.3, wall.h);

      const leftLight = ctx.createLinearGradient(wall.x, 0, wall.x + bevel * 2.1, 0);
      leftLight.addColorStop(0, "rgba(216, 237, 252, 0.07)");
      leftLight.addColorStop(1, "rgba(216, 237, 252, 0)");
      ctx.fillStyle = leftLight;
      ctx.fillRect(wall.x, wall.y, bevel * 2.1, wall.h);

      ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
      ctx.fillRect(wall.x + wall.w - 1, wall.y, Math.max(1, bevel * 0.9), wall.h);
    }
    ctx.strokeStyle = "rgba(10, 18, 28, 0.24)";
    ctx.lineWidth = 1;
    ctx.strokeRect(wall.x + 0.5, wall.y + 0.5, Math.max(0, wall.w - 1), Math.max(0, wall.h - 1));
    ctx.restore();
  }

  _drawWallTrim(ctx, wall, visual = null) {
    const trimPath = visual?.trimSpritePath;
    const trimAlpha = clamp(this._num(visual?.trimAlpha, 0), 0, 1);
    if (!trimPath || trimAlpha <= 0) return;
    if (!wall || wall.w <= 0 || wall.h <= 0) return;

    const isHorizontal = wall.w >= wall.h;
    if (isHorizontal) {
      const topBand = this._getAtlasRegionImage(trimPath, 0, 0, 64, 20);
      if (!topBand) return;
      const stripH = Math.max(2, Math.min(6, Math.round(wall.h * 0.28)));
      this._drawSpriteFill(
        ctx,
        { x: wall.x, y: wall.y, w: wall.w, h: stripH },
        {
          spriteImage: topBand,
          tileMode: "repeat",
          tileW: 64,
          tileH: stripH,
          spritePixelSnap: true,
          spriteAlpha: trimAlpha,
          variantClusterTiles: 1,
          tileAnchorX: 0,
          tileAnchorY: 0,
        },
        1,
        { tileAnchorX: 0, tileAnchorY: 0 }
      );
      return;
    }

    const sideBand = this._getAtlasRegionImage(trimPath, 156, 0, 8, 64);
    if (!sideBand) return;
    const stripW = Math.max(2, Math.min(5, Math.round(wall.w * 0.28)));
    this._drawSpriteFill(
      ctx,
      { x: wall.x, y: wall.y, w: stripW, h: wall.h },
      {
        spriteImage: sideBand,
        tileMode: "repeat",
        tileW: stripW,
        tileH: 64,
        spritePixelSnap: true,
        spriteAlpha: trimAlpha,
        variantClusterTiles: 1,
        tileAnchorX: 0,
        tileAnchorY: 0,
      },
      1,
      { tileAnchorX: 0, tileAnchorY: 0 }
    );
  }

  _drawWallGrounding(ctx, wall, visual = null) {
    const groundingPath = visual?.groundingSpritePath;
    const groundingAlpha = clamp(this._num(visual?.groundingAlpha, 0), 0, 1);
    if (!groundingPath || groundingAlpha <= 0) return;
    if (!wall || wall.w <= 0 || wall.h <= 0) return;

    const isHorizontal = wall.w >= wall.h;
    const strip = isHorizontal
      ? {
          x: wall.x,
          y: wall.y + wall.h - 1,
          w: wall.w,
          h: Math.max(2, Math.min(14, Math.round(wall.h * 0.7))),
        }
      : {
          x: wall.x + wall.w - 1,
          y: wall.y,
          w: Math.max(2, Math.min(14, Math.round(wall.w * 0.7))),
          h: wall.h,
        };

    this._drawSpriteFill(
      ctx,
      strip,
      {
        spritePath: groundingPath,
        tileMode: "repeat",
        tileW: 64,
        tileH: 64,
        spritePixelSnap: true,
        spriteAlpha: groundingAlpha,
        variantClusterTiles: 1,
        tileAnchorX: 0,
        tileAnchorY: 0,
      },
      1,
      { tileAnchorX: 0, tileAnchorY: 0 }
    );
  }

  _drawWallAo(ctx, wall, visual = null) {
    const aoPath = visual?.aoSpritePath;
    const aoAlpha = clamp(this._num(visual?.aoAlpha, 0), 0, 1);
    if (!aoPath || aoAlpha <= 0) return;
    if (!wall || wall.w <= 0 || wall.h <= 0) return;

    const isHorizontal = wall.w >= wall.h;
    const aoTile = isHorizontal
      ? this._getAtlasRegionImage(aoPath, 64, 64, 64, 64)
      : this._getAtlasRegionImage(aoPath, 0, 64, 64, 64);
    if (!aoTile) return;

    const strip = isHorizontal
      ? {
          x: wall.x,
          y: wall.y + wall.h - 1,
          w: wall.w,
          h: Math.max(2, Math.min(10, Math.round(wall.h * 0.45))),
        }
      : {
          x: wall.x + wall.w - 1,
          y: wall.y,
          w: Math.max(2, Math.min(10, Math.round(wall.w * 0.45))),
          h: wall.h,
        };

    this._drawSpriteFill(
      ctx,
      strip,
      {
        spriteImage: aoTile,
        tileMode: "repeat",
        tileW: 64,
        tileH: 64,
        spritePixelSnap: true,
        spriteAlpha: aoAlpha,
        variantClusterTiles: 1,
        tileAnchorX: 0,
        tileAnchorY: 0,
      },
      1,
      { tileAnchorX: 0, tileAnchorY: 0 }
    );
  }

  _getWorldViewBounds(padding = 0) {
    const camera = this.game?.camera;
    if (!camera) return null;
    const zoom = Math.max(0.001, this._num(camera.zoom, 1));
    const x = this._num(camera.x, 0) - padding;
    const y = this._num(camera.y, 0) - padding;
    const w = this._num(camera.width, 0) / zoom + padding * 2;
    const h = this._num(camera.height, 0) / zoom + padding * 2;
    return { x, y, w, h };
  }

  _rectInView(rect, view) {
    if (!rect || !view) return true;
    return !(
      rect.x + rect.w < view.x ||
      rect.x > view.x + view.w ||
      rect.y + rect.h < view.y ||
      rect.y > view.y + view.h
    );
  }

  _updateDoorVisuals(dt) {
    for (const door of this._getLevelDoors()) {
      if (!door) continue;
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
    this._drawDoorAccessPanel(ctx, door, isOpen);

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

  _drawDoorAccessPanel(ctx, door, isOpen) {
    const panel = this._getDoorAccessPanelRect(door);
    if (!panel) return;

    const pulse = 0.76 + 0.24 * Math.sin(this.uiTime * 6.8);
    const border = isOpen ? "rgba(165, 248, 204, 0.88)" : "rgba(255, 214, 148, 0.86)";
    const glow = isOpen ? "rgba(119, 236, 171, 0.28)" : "rgba(255, 198, 121, 0.24)";
    const led = isOpen ? `rgba(129, 244, 182, ${(0.8 + 0.2 * pulse).toFixed(3)})` : `rgba(255, 184, 113, ${(0.78 + 0.22 * pulse).toFixed(3)})`;

    ctx.save();
    ctx.fillStyle = "rgba(9, 16, 24, 0.92)";
    this._roundedRect(ctx, panel.x, panel.y, panel.w, panel.h, 3);
    ctx.fill();

    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    this._roundedRect(ctx, panel.x + 0.5, panel.y + 0.5, Math.max(0, panel.w - 1), Math.max(0, panel.h - 1), 3);
    ctx.stroke();

    ctx.fillStyle = "rgba(24, 39, 54, 0.86)";
    this._roundedRect(ctx, panel.x + 2, panel.y + 2, Math.max(1, panel.w - 4), Math.max(1, panel.h * 0.42), 2);
    ctx.fill();

    ctx.fillStyle = led;
    ctx.beginPath();
    ctx.arc(panel.x + panel.w * 0.5, panel.y + panel.h * 0.82, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const iconSize = Math.max(10, Math.min(panel.w, panel.h) - 5);
    const iconX = panel.x + (panel.w - iconSize) / 2;
    const iconY = panel.y + 1;
    const iconId = isOpen ? "door_unlocked" : "door_locked";
    this._drawUiIcon(ctx, iconId, iconX, iconY, iconSize, {
      alpha: 0.92,
      phase: isOpen ? 1.1 : 0.3,
    });

    const cable = this._getDoorPanelCable(panel, door);
    if (cable) {
      ctx.save();
      ctx.strokeStyle = glow;
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.moveTo(cable.x1, cable.y1);
      ctx.lineTo(cable.x2, cable.y2);
      ctx.stroke();
      ctx.restore();
    }
  }

  _getDoorAccessPanelRect(door) {
    if (!door || door.w <= 0 || door.h <= 0) return null;

    const cx = door.x + door.w / 2;
    const cy = door.y + door.h / 2;
    const axis = this._getDoorSlideAxis(door);

    let dirX = 0;
    let dirY = 0;
    const trigger = door.trigger;
    if (
      trigger &&
      Number.isFinite(trigger.x) &&
      Number.isFinite(trigger.y) &&
      Number.isFinite(trigger.w) &&
      Number.isFinite(trigger.h)
    ) {
      const tx = trigger.x + trigger.w / 2;
      const ty = trigger.y + trigger.h / 2;
      const dx = tx - cx;
      const dy = ty - cy;
      if (Math.abs(dx) >= Math.abs(dy)) dirX = dx >= 0 ? 1 : -1;
      else dirY = dy >= 0 ? 1 : -1;
    } else if (axis === "y") {
      dirX = -1;
    } else {
      dirY = -1;
    }

    if (dirX === 0 && dirY === 0) dirX = -1;

    const isVerticalDoor = door.h >= door.w;
    const panelW = isVerticalDoor ? 14 : 24;
    const panelH = isVerticalDoor ? 34 : 16;
    const gap = 7;

    let x;
    let y;
    if (dirX !== 0) {
      x = dirX > 0 ? door.x + door.w + gap : door.x - panelW - gap;
      y = cy - panelH / 2;
    } else {
      x = cx - panelW / 2;
      y = dirY > 0 ? door.y + door.h + gap : door.y - panelH - gap;
    }

    return {
      x: Math.round(x),
      y: Math.round(y),
      w: panelW,
      h: panelH,
    };
  }

  _getDoorPanelCable(panel, door) {
    if (!panel || !door) return null;

    const pcx = panel.x + panel.w / 2;
    const pcy = panel.y + panel.h / 2;
    const dcx = door.x + door.w / 2;
    const dcy = door.y + door.h / 2;
    const dx = dcx - pcx;
    const dy = dcy - pcy;

    if (Math.abs(dx) >= Math.abs(dy)) {
      return {
        x1: dx > 0 ? panel.x + panel.w : panel.x,
        y1: pcy,
        x2: dx > 0 ? door.x : door.x + door.w,
        y2: pcy,
      };
    }

    return {
      x1: pcx,
      y1: dy > 0 ? panel.y + panel.h : panel.y,
      x2: pcx,
      y2: dy > 0 ? door.y : door.y + door.h,
    };
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
    } else if (downloading) {
      ctx.fillStyle = `rgba(92, 218, 255, ${(0.16 + 0.1 * pulse).toFixed(3)})`;
      ctx.fillRect(x, y, w, h);

      const barW = Math.max(20, w - 6);
      const barH = 4;
      const barX = x + (w - barW) / 2;
      const barY = y + h - barH - 2;

      ctx.fillStyle = "rgba(7, 14, 22, 0.8)";
      this._roundedRect(ctx, barX, barY, barW, barH, 3);
      ctx.fill();
      ctx.fillStyle = "rgba(136, 228, 255, 0.96)";
      this._roundedRect(ctx, barX, barY, Math.max(2, barW * progress), barH, 3);
      ctx.fill();

      ctx.fillStyle = `rgba(139, 231, 255, ${(0.66 + 0.25 * pulse).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(cx, y + 5, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(255, 204, 129, 0.15)";
      ctx.fillRect(x, y, w, h);

      ctx.fillStyle = "rgba(255, 206, 122, 0.9)";
      ctx.beginPath();
      ctx.arc(cx, y + 5, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawWorldMarkers(ctx, view = null) {
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

    const skipMaterialLayers =
      !!options.skipMaterialLayers ||
      (this._isLowPerf() && (componentType === "floor" || componentType === "wall"));

    if (!spriteOnly && visual && !skipMaterialLayers) {
      this._drawMaterialSpriteLayers(ctx, rect, visual, alphaScale);
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
    if (!visual) return false;

    const tileImages = this._resolveTileImages(visual);
    const primaryImage = this._resolvePrimaryImage(visual);
    const fallbackTileImage = tileImages[0] || primaryImage;
    if (!primaryImage && !fallbackTileImage) return false;

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
    const pixelSnap = visual.spritePixelSnap !== false;

    ctx.save();
    if (spriteAlpha < 1) ctx.globalAlpha *= spriteAlpha;
    ctx.imageSmoothingEnabled = !pixelSnap;

    if (visual.tileMode === "repeat") {
      const tileSource = fallbackTileImage;
      const iw = tileSource?.naturalWidth || tileSource?.width;
      const ih = tileSource?.naturalHeight || tileSource?.height;
      if (!iw || !ih) {
        ctx.restore();
        return false;
      }

      const tileScale = Math.max(0.05, this._num(visual.tileScale, 1));
      const tileW = Math.max(1, this._num(visual.tileW, iw * tileScale));
      const tileH = Math.max(1, this._num(visual.tileH, ih * tileScale));
      const hasAnchorX = Number.isFinite(Number(options?.tileAnchorX)) || Number.isFinite(Number(visual?.tileAnchorX));
      const hasAnchorY = Number.isFinite(Number(options?.tileAnchorY)) || Number.isFinite(Number(visual?.tileAnchorY));
      const anchorX = hasAnchorX
        ? this._num(options?.tileAnchorX, this._num(visual?.tileAnchorX, 0))
        : drawRect.x;
      const anchorY = hasAnchorY
        ? this._num(options?.tileAnchorY, this._num(visual?.tileAnchorY, 0))
        : drawRect.y;
      const baseX = anchorX + spriteOffsetX;
      const baseY = anchorY + spriteOffsetY;
      const startX = baseX + Math.floor((drawRect.x - baseX) / tileW) * tileW;
      const startY = baseY + Math.floor((drawRect.y - baseY) / tileH) * tileH;
      const endX = drawRect.x + drawRect.w;
      const endY = drawRect.y + drawRect.h;

      ctx.beginPath();
      ctx.rect(drawRect.x, drawRect.y, drawRect.w, drawRect.h);
      ctx.clip();

      const variantSeed = this._num(visual.tileVariantSeed, this._hashString(visual.spritePath || ""));
      const variantClusterTiles = Math.max(1, Math.round(this._num(visual.variantClusterTiles, 1)));
      const canFastPatternFill =
        visual.usePatternFill === true && tileImages.length <= 1 && variantClusterTiles === 1;

      if (canFastPatternFill) {
        const pattern = this._getRepeatPattern(ctx, tileSource);
        const scaleX = tileW / iw;
        const scaleY = tileH / ih;

        if (pattern && typeof pattern.setTransform === "function" && typeof DOMMatrix !== "undefined") {
          const transform = new DOMMatrix();
          transform.a = scaleX;
          transform.d = scaleY;
          transform.e = baseX;
          transform.f = baseY;
          pattern.setTransform(transform);
          ctx.fillStyle = pattern;
          ctx.beginPath();
          ctx.rect(drawRect.x, drawRect.y, drawRect.w, drawRect.h);
          ctx.clip();
          ctx.fillRect(drawRect.x, drawRect.y, drawRect.w, drawRect.h);
          ctx.restore();
          return true;
        }
      }

      for (let y = startY; y < endY; y += tileH) {
        for (let x = startX; x < endX; x += tileW) {
          const tileX = Math.floor((x - baseX) / tileW);
          const tileY = Math.floor((y - baseY) / tileH);
          const variantX = Math.floor(tileX / variantClusterTiles);
          const variantY = Math.floor(tileY / variantClusterTiles);
          const image = tileImages.length
            ? tileImages[this._tileVariantIndex(variantX, variantY, tileImages.length, variantSeed)]
            : tileSource;

          let dx = x;
          let dy = y;
          let dw = tileW;
          let dh = tileH;
          if (pixelSnap) {
            dx = Math.round(dx);
            dy = Math.round(dy);
            dw = Math.round(dw);
            dh = Math.round(dh);
          }
          ctx.drawImage(image, dx, dy, dw, dh);
        }
      }
    } else if (visual.spriteMode === "contain") {
      const iw = primaryImage.naturalWidth || primaryImage.width;
      const ih = primaryImage.naturalHeight || primaryImage.height;
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
      if (pixelSnap) {
        dx = Math.round(dx);
        dy = Math.round(dy);
        dw = Math.round(dw);
        dh = Math.round(dh);
      }
      ctx.drawImage(primaryImage, dx, dy, dw, dh);
    } else {
      let dx = drawRect.x + spriteOffsetX;
      let dy = drawRect.y + spriteOffsetY;
      let dw = drawRect.w;
      let dh = drawRect.h;
      if (pixelSnap) {
        dx = Math.round(dx);
        dy = Math.round(dy);
        dw = Math.round(dw);
        dh = Math.round(dh);
      }
      ctx.drawImage(
        primaryImage,
        dx,
        dy,
        dw,
        dh
      );
    }

    ctx.restore();
    return true;
  }

  _drawMaterialSpriteLayers(ctx, rect, visual, alphaScale = 1) {
    const layers = [
      {
        spritePath: visual.macroSpritePath,
        tileSpritePaths: visual.macroTileSpritePaths,
        tileW: visual.macroTileW,
        tileH: visual.macroTileH,
        spriteAlpha: this._num(visual.macroAlpha, 0),
        blend: visual.macroBlend || null,
        tileAnchorX: this._num(visual.macroTileAnchorX, this._num(visual.tileAnchorX, NaN)),
        tileAnchorY: this._num(visual.macroTileAnchorY, this._num(visual.tileAnchorY, NaN)),
        tileVariantSeed: this._hashString((visual.spritePath || "") + "::macro"),
        variantClusterTiles: this._num(visual.macroVariantClusterTiles, 4),
      },
      {
        spritePath: visual.transitionSpritePath,
        tileSpritePaths: visual.transitionTileSpritePaths,
        tileW: visual.transitionTileW,
        tileH: visual.transitionTileH,
        spriteAlpha: this._num(visual.transitionAlpha, 0),
        blend: visual.transitionBlend || null,
        tileAnchorX: this._num(visual.transitionTileAnchorX, this._num(visual.tileAnchorX, NaN)),
        tileAnchorY: this._num(visual.transitionTileAnchorY, this._num(visual.tileAnchorY, NaN)),
        tileVariantSeed: this._hashString((visual.spritePath || "") + "::transition"),
        variantClusterTiles: this._num(visual.transitionVariantClusterTiles, 2),
      },
      {
        spritePath: visual.markingSpritePath,
        tileSpritePaths: visual.markingTileSpritePaths,
        tileW: visual.markingTileW,
        tileH: visual.markingTileH,
        spriteAlpha: this._num(visual.markingAlpha, 0),
        blend: visual.markingBlend || null,
        tileAnchorX: this._num(visual.markingTileAnchorX, this._num(visual.tileAnchorX, NaN)),
        tileAnchorY: this._num(visual.markingTileAnchorY, this._num(visual.tileAnchorY, NaN)),
        tileVariantSeed: this._hashString((visual.spritePath || "") + "::marking"),
        variantClusterTiles: this._num(visual.markingVariantClusterTiles, 4),
      },
      {
        spritePath: visual.decalSpritePath,
        tileSpritePaths: visual.decalTileSpritePaths,
        tileW: visual.decalTileW,
        tileH: visual.decalTileH,
        spriteAlpha: this._num(visual.decalAlpha, 0),
        blend: visual.decalBlend || null,
        tileAnchorX: this._num(visual.decalTileAnchorX, this._num(visual.tileAnchorX, NaN)),
        tileAnchorY: this._num(visual.decalTileAnchorY, this._num(visual.tileAnchorY, NaN)),
        tileVariantSeed: this._hashString((visual.spritePath || "") + "::decal"),
        variantClusterTiles: this._num(visual.decalVariantClusterTiles, 6),
      },
    ];

    for (const layer of layers) {
      if (!layer.spritePath && !Array.isArray(layer.tileSpritePaths)) continue;
      if (layer.spriteAlpha <= 0) continue;

      const layerVisual = {
        spritePath: layer.spritePath,
        tileSpritePaths: layer.tileSpritePaths,
        tileMode: "repeat",
        tileW: Math.max(1, this._num(layer.tileW, 128)),
        tileH: Math.max(1, this._num(layer.tileH, 128)),
        spritePixelSnap: true,
        spriteAlpha: layer.spriteAlpha,
        tileAnchorX: layer.tileAnchorX,
        tileAnchorY: layer.tileAnchorY,
        tileVariantSeed: layer.tileVariantSeed,
        forceSingleTile: false,
        variantClusterTiles: Math.max(1, Math.round(this._num(layer.variantClusterTiles, 1))),
      };

      ctx.save();
      if (layer.blend) ctx.globalCompositeOperation = layer.blend;
      this._drawSpriteFill(ctx, rect, layerVisual, alphaScale, {});
      ctx.restore();
    }
  }

  _resolvePrimaryImage(visual) {
    if (this._isDrawableImage(visual?.spriteImage)) return visual.spriteImage;
    const path = visual?.spritePath;
    if (!path) return null;
    return this._getComponentImage(path);
  }

  _resolveTileImages(visual) {
    const images = [];
    if (Array.isArray(visual?.tileImages)) {
      for (const image of visual.tileImages) {
        if (this._isDrawableImage(image)) images.push(image);
      }
    }
    if (this._isDrawableImage(visual?.spriteImage) && !images.includes(visual.spriteImage)) {
      images.unshift(visual.spriteImage);
    }
    const paths = [];
    if (Array.isArray(visual?.tileSpritePaths)) {
      for (const path of visual.tileSpritePaths) {
        if (typeof path === "string" && path) paths.push(path);
      }
    }

    if (typeof visual?.spritePath === "string" && visual.spritePath) {
      if (!paths.includes(visual.spritePath)) paths.unshift(visual.spritePath);
    }

    for (const path of paths) {
      const image = this._getComponentImage(path);
      if (!image) continue;
      if (!images.includes(image)) images.push(image);
    }
    if (visual?.forceSingleTile && images.length > 1) {
      return [images[0]];
    }
    return images;
  }

  _isDrawableImage(image) {
    if (!image || typeof image !== "object") return false;
    const w = Number(image.naturalWidth || image.width || 0);
    const h = Number(image.naturalHeight || image.height || 0);
    return Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0;
  }

  _tileVariantIndex(x, y, count, seed = 0) {
    if (!Number.isFinite(count) || count <= 1) return 0;
    return this._tileHash(x, y, seed) % count;
  }

  _tileHash(x, y, seed = 0) {
    const xi = x | 0;
    const yi = y | 0;
    let h = (xi * 374761393) ^ (yi * 668265263) ^ ((seed | 0) * 69069);
    h = (h ^ (h >>> 13)) >>> 0;
    h = Math.imul(h, 1274126177) >>> 0;
    return (h ^ (h >>> 16)) >>> 0;
  }

  _hashString(value) {
    const input = (value || "").toString();
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  _getRepeatPattern(ctx, image) {
    if (!image) return null;
    let pattern = this.patternCache.get(image) || null;
    if (!pattern) {
      pattern = ctx.createPattern(image, "repeat");
      if (pattern) this.patternCache.set(image, pattern);
    }
    return pattern;
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
    const settings = this.state?.audio && typeof this.state.audio.getSettingsSnapshot === "function"
      ? this.state.audio.getSettingsSnapshot()
      : null;
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

    const panelW = Math.min(960, cw * 0.86);
    const targetPanelH = settings ? 560 : 500;
    const panelH = Math.min(Math.max(targetPanelH, ch * 0.72), ch * 0.9);
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
    const buttonH = panelH < 500 ? 62 : 70;
    const buttonGap = panelH < 500 ? 14 : 18;
    const buttonX = centerX - buttonW / 2;
    const firstY = panelY + 146;

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

    if (settings) {
      this._drawMainMenuAudioSliders(ctx, panelX, panelY, panelW, panelH, settings);
    }

    ctx.fillStyle = "rgba(219, 235, 248, 0.88)";
    ctx.font = UI_FONTS.bodySmall;
    ctx.fillText("Drag sliders to tune volume", centerX, panelY + panelH - 62);
    ctx.fillText("Enter/Space/Click: Confirm  |  Esc: Back", centerX, panelY + panelH - 36);

    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  _drawMainMenuAudioSliders(ctx, panelX, panelY, panelW, panelH, settings) {
    if (!settings) return;

    const sectionH = 114;
    const sectionX = panelX + 24;
    const sectionW = Math.max(240, panelW - 48);
    const sectionY = panelY + panelH - sectionH - 88;
    const sectionBottomLimit = panelY + panelH - 72;
    const drawY = Math.min(sectionY, sectionBottomLimit - sectionH);
    this._drawAudioSliderSection(ctx, {
      x: sectionX,
      y: drawY,
      w: sectionW,
      h: sectionH,
      settings,
      title: "AUDIO MIX",
      compact: true,
    });
  }

  _drawAudioSliderSection(ctx, config = {}) {
    const x = this._num(config.x, 0);
    const y = this._num(config.y, 0);
    const w = Math.max(220, this._num(config.w, 240));
    const h = Math.max(102, this._num(config.h, 112));
    const settings = config.settings;
    if (!settings) return;
    const compact = !!config.compact;
    const title = (config.title || "AUDIO MIX").toString();
    const centerX = x + w / 2;

    ctx.save();
    ctx.fillStyle = "rgba(11, 23, 35, 0.54)";
    this._roundedRect(ctx, x, y, w, h, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(165, 224, 255, 0.36)";
    ctx.lineWidth = 1.1;
    this._roundedRect(ctx, x, y, w, h, 16);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(235, 247, 255, 0.94)";
    ctx.font = UI_FONTS.bodySmall;
    ctx.fillText(title, centerX, y + (compact ? 18 : 20));
    ctx.restore();

    const sliders = [
      { settingId: "music", label: "Music", value: this._num(settings.music, 0.2) },
      { settingId: "sfx", label: "SFX", value: this._num(settings.sfx, 0.6) },
      { settingId: "footsteps", label: "Footsteps", value: this._num(settings.footsteps, 0.34) },
    ];

    const contentPadding = compact ? 18 : 22;
    const sliderGap = compact ? 18 : 20;
    const sliderW = Math.max(
      compact ? 56 : 68,
      (w - contentPadding * 2 - sliderGap * (sliders.length - 1)) / sliders.length
    );
    const sliderStartX = x + (w - (sliderW * sliders.length + sliderGap * (sliders.length - 1))) / 2;
    const labelY = y + (compact ? 40 : 44);
    const trackY = y + (compact ? 72 : 78);
    const trackH = 8;
    const knobR = compact ? 9 : 10;

    for (let i = 0; i < sliders.length; i++) {
      const slider = sliders[i];
      const sx = sliderStartX + i * (sliderW + sliderGap);
      const value = clamp(this._num(slider.value, 0), 0, 1);
      const percent = Math.round(value * 100);
      const trackX = sx;
      const trackYTop = trackY - trackH / 2;
      const fillW = Math.max(trackH, sliderW * value);
      const knobX = trackX + sliderW * value;

      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(233, 245, 255, 0.95)";
      ctx.font = UI_FONTS.bodySmall;
      ctx.fillText(slider.label, sx, labelY);
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(255, 214, 130, 0.96)";
      ctx.fillText(`${percent}%`, sx + sliderW, labelY);

      ctx.fillStyle = "rgba(14, 26, 38, 0.96)";
      this._roundedRect(ctx, trackX, trackYTop, sliderW, trackH, trackH / 2);
      ctx.fill();

      const fill = ctx.createLinearGradient(trackX, trackYTop, trackX + sliderW, trackYTop);
      fill.addColorStop(0, "rgba(116, 210, 255, 0.96)");
      fill.addColorStop(1, "rgba(255, 197, 117, 0.96)");
      ctx.fillStyle = fill;
      this._roundedRect(ctx, trackX, trackYTop, fillW, trackH, trackH / 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 247, 232, 0.98)";
      ctx.strokeStyle = "rgba(75, 135, 172, 0.92)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(knobX, trackY, knobR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      this.state.audioSliderRects.push({
        settingId: slider.settingId,
        label: slider.label,
        x: trackX - 12,
        y: trackYTop - 14,
        w: sliderW + 24,
        h: trackH + 28,
        trackX,
        trackY: trackYTop,
        trackW: sliderW,
        trackH,
      });
    }
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

  _drawGameplayHud(ctx, cw, ch, options = {}) {
    const dpr = Math.max(1, this._num(window.devicePixelRatio, 1));
    const cssW = cw / dpr;
    const cssH = ch / dpr;
    const cssScale = clamp(Math.min(cssW / 1280, cssH / 720), 0.95, 1.24);
    const ui = dpr * cssScale;
    const bodyFont = `600 ${Math.round(18 * ui)}px "Rajdhani", "Trebuchet MS", sans-serif`;
    const smallFont = `500 ${Math.round(15 * ui)}px "Rajdhani", "Trebuchet MS", sans-serif`;
    const titleFont = `700 ${Math.round(21 * ui)}px "Rajdhani", "Trebuchet MS", sans-serif`;
    const objectiveFont = `600 ${Math.round(16 * ui)}px "Rajdhani", "Trebuchet MS", sans-serif`;

    const steps = this._buildObjectiveSteps();
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

    const drawPrompt = options?.drawPrompt !== false;
    const prompt = this.state.uiPrompt || this.state.message;
    if (drawPrompt && prompt) {
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

  _buildObjectiveSteps() {
    const customSteps = Array.isArray(this.level?.objectiveSteps) ? this.level.objectiveSteps : [];
    if (customSteps.length) {
      const evaluated = customSteps.map(step => this._evaluateObjectiveStep(step)).filter(Boolean);
      if (evaluated.length) return evaluated;
    }

    const hasKeycard = !!this.state.hasKeycard || !!this.state.hasBlueCard;
    const doors = this._getLevelDoors();
    const hasTerminal = !!this.level.terminal;
    const terminalDone = !hasTerminal || !!this.state.terminalComplete;
    const pickups = this._getLevelPickups();
    const needsKeycard = !!(pickups.length || doors.length);

    const steps = [];
    if (needsKeycard) {
      steps.push({ label: "Find keycard", done: hasKeycard, icon: "keycard" });
    }
    for (const door of doors) {
      const doorOpen = door.locked === false || door.state === "OPEN";
      steps.push({
        label: door.objectiveLabel || "Open secured door",
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
    return steps;
  }

  _evaluateObjectiveStep(step) {
    if (!step || typeof step !== "object") return null;
    const type = (step.type || "flag").toString();
    let done = false;
    let icon = step.icon || "objective";

    if (type === "flag") {
      done = !!this.state[(step.flag || "").toString()];
    } else if (type === "door") {
      const door = this._resolveStepDoor(step);
      done = !door || door.locked === false || door.state === "OPEN";
      icon = done ? "door_unlocked" : (step.icon || "door_locked");
    } else if (type === "terminal") {
      done = !!this.state.terminalComplete;
    } else if (type === "extract") {
      done = this.state.status === "extracting" || this.state.status === "won";
    } else if (type === "pickup") {
      done = !!this.state[(step.flag || "").toString()];
    } else {
      return null;
    }

    return {
      label: (step.label || "Objective").toString(),
      done,
      icon,
    };
  }

  _resolveStepDoor(step) {
    if (!step) return null;
    const doorId = (step.doorId || "").toString();
    if (doorId) {
      const byId = this._getLevelDoors().find(door => (door?.doorId || "").toString() === doorId);
      if (byId) return byId;
    }
    const index = Number(step.doorIndex);
    if (Number.isFinite(index)) {
      const doors = this._getLevelDoors();
      if (index >= 0 && index < doors.length) return doors[index];
    }
    return null;
  }

  _drawModalPromptToast(ctx, cw, ch, modalBounds, text) {
    const prompt = (text || "").trim();
    if (!prompt) return;

    const dpr = Math.max(1, this._num(window.devicePixelRatio, 1));
    const cssW = cw / dpr;
    const cssH = ch / dpr;
    const cssScale = clamp(Math.min(cssW / 1280, cssH / 720), 0.95, 1.24);
    const ui = dpr * cssScale;

    const promptW = Math.min(760 * ui, cw * 0.72);
    const promptH = 58 * ui;
    let promptX = (cw - promptW) / 2;
    let promptY = ch - promptH - 16 * ui;

    if (modalBounds && Number.isFinite(modalBounds.y) && Number.isFinite(modalBounds.h)) {
      const belowY = modalBounds.y + modalBounds.h + 14 * ui;
      if (belowY + promptH <= ch - 10 * ui) {
        promptY = belowY;
      } else {
        const insideY = modalBounds.y + modalBounds.h - promptH - 14 * ui;
        if (insideY >= modalBounds.y + 10 * ui) {
          promptY = insideY;
        }
      }
      if (Number.isFinite(modalBounds.x) && Number.isFinite(modalBounds.w)) {
        const centerX = modalBounds.x + modalBounds.w / 2;
        promptX = centerX - promptW / 2;
      }
    }

    promptX = Math.max(8 * ui, Math.min(cw - promptW - 8 * ui, promptX));
    promptY = Math.max(8 * ui, Math.min(ch - promptH - 8 * ui, promptY));

    this._drawGlassPanel(ctx, promptX, promptY, promptW, promptH, {
      border: "rgba(244, 233, 171, 0.95)",
      glow: "rgba(255, 206, 124, 0.58)",
      top: "rgba(23, 33, 45, 0.98)",
      bottom: "rgba(11, 18, 28, 0.99)",
      cornerRadius: 13 * ui,
    });

    this._drawUiIcon(ctx, "interact", promptX + 12 * ui, promptY + 14 * ui, 24 * ui, {
      alpha: 0.99,
    });

    ctx.fillStyle = "rgba(255, 249, 234, 0.99)";
    ctx.font = `600 ${Math.round(18 * ui)}px "Rajdhani", "Trebuchet MS", sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(prompt, promptX + 44 * ui, promptY + promptH / 2 + 1 * ui);
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  _drawFocusModal(ctx, cw, ch, data) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.48)";
    ctx.fillRect(0, 0, cw, ch);

    const buttons = Array.isArray(data.buttons) ? data.buttons.filter(Boolean) : [];
    const showAudioSliders = !!data.audioSliders;
    const audioSettings = showAudioSliders && this.state?.audio && typeof this.state.audio.getSettingsSnapshot === "function"
      ? this.state.audio.getSettingsSnapshot()
      : null;
    const audioSectionH = audioSettings ? 122 : 0;
    const columns = Math.min(2, Math.max(1, buttons.length));
    const rows = Math.max(1, Math.ceil(buttons.length / columns));
    const buttonH = 52;
    const gapY = 14;
    const totalButtonsH = rows * buttonH + (rows - 1) * gapY;

    const panelW = Math.min(760, cw * 0.74);
    const minPanelH = 246 + totalButtonsH + audioSectionH;
    const panelH = Math.min(Math.max(340, minPanelH), ch * 0.88);
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

    let contentY = panelY + 152;
    if (audioSettings) {
      this._drawAudioSliderSection(ctx, {
        x: panelX + 28,
        y: contentY,
        w: panelW - 56,
        h: audioSectionH,
        settings: audioSettings,
        title: data.audioSlidersTitle || "AUDIO MIX",
        compact: false,
      });
      contentY += audioSectionH + 16;
    }

    this.state.focusOptionRects = [];
    if (buttons.length) {
      const buttonW = Math.min(270, (panelW - 92) / columns);
      const gapX = 20;
      const buttonsTop = contentY;
      const buttonsBottom = panelY + panelH - 24;
      const buttonsAreaH = Math.max(buttonH, buttonsBottom - buttonsTop);
      const startY = buttonsTop + Math.max(0, (buttonsAreaH - totalButtonsH) / 2);
      const hovered = Number.isFinite(this.state.focusIndex) ? this.state.focusIndex : -1;

      for (let row = 0; row < rows; row++) {
        const rowStart = row * columns;
        const rowEnd = Math.min(buttons.length, rowStart + columns);
        const rowCount = rowEnd - rowStart;
        const rowW = rowCount * buttonW + Math.max(0, rowCount - 1) * gapX;
        const rowStartX = panelX + (panelW - rowW) / 2;

        for (let col = 0; col < rowCount; col++) {
          const i = rowStart + col;
          const rect = {
            x: rowStartX + col * (buttonW + gapX),
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
    }

    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
    return { x: panelX, y: panelY, w: panelW, h: panelH };
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
    ctx.shadowBlur = Math.max(0, this._num(style.shadowBlur, 14));
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

  _getComponentImage(path) {
    if (!path) return null;
    const preloaded = this.componentAssets[path];
    if (preloaded) return preloaded;
    const slot = this.componentArt[path];
    if (!slot || !slot.loaded || !slot.image) return null;
    return slot.image;
  }

  _getAtlasRegionImage(path, sx, sy, sw, sh) {
    if (!path) return null;
    const atlas = this._getComponentImage(path);
    if (!atlas || typeof document === "undefined") return null;

    const x = Math.max(0, Math.floor(this._num(sx, 0)));
    const y = Math.max(0, Math.floor(this._num(sy, 0)));
    const w = Math.max(1, Math.floor(this._num(sw, 1)));
    const h = Math.max(1, Math.floor(this._num(sh, 1)));
    const key = `${path}#${x},${y},${w},${h}`;

    const cached = this.atlasRegionCache.get(key);
    if (cached) return cached;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const regionCtx = canvas.getContext("2d");
    if (!regionCtx) return null;
    regionCtx.imageSmoothingEnabled = false;
    regionCtx.clearRect(0, 0, w, h);
    regionCtx.drawImage(atlas, x, y, w, h, 0, 0, w, h);
    this.atlasRegionCache.set(key, canvas);
    return canvas;
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

  _buildAudioSummary() {
    const audio = this.state?.audio;
    if (!audio || typeof audio.getSettingsSnapshot !== "function") return "";

    const settings = audio.getSettingsSnapshot();
    const music = Math.round(this._num(settings.music, 0) * 100);
    const sfx = Math.round(this._num(settings.sfx, 0) * 100);
    const steps = Math.round(this._num(settings.footsteps, 0) * 100);
    return `Music ${music}%  SFX ${sfx}%  Steps ${steps}%`;
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

  _rectMatches(a, b) {
    return !!a && !!b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
  }

  _isLowPerf() {
    const fps = this._num(this.game?.fps, 60);
    return fps < 52;
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
