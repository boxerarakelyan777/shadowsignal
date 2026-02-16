// src/entities/controller.js
class GameController {
  constructor(game, state, level, player, options = {}) {
    this.game = game;
    this.state = state;
    this.level = level;
    this.player = player;
    this.options = options;
    this.removeFromWorld = false;
    this.holdTime = 0;
    this.holdInteraction = null;
    this.lastInteractionActionId = null;
    this.lastInteractionTarget = null;
    this.lastInteractionType = null;
    this.interactHeld = false;
    this.throwCooldown = 0;
    this.extractionDuration = 1.45;
    this.keycardSpawn = state.keycardSpawn
      ? { ...state.keycardSpawn }
      : (level.keycard ? { ...level.keycard } : null);

    const rockDefaults = (typeof TUNING !== "undefined" && TUNING.rock) ? TUNING.rock : {};
    this.maxThrowRange = this._num(rockDefaults.maxThrowRange, 250);
    this.throwSpeed = this._num(rockDefaults.throwSpeed, 760);
    this.throwArcHeight = this._num(rockDefaults.arcHeight, 18);
    this.noiseRadius = this._num(rockDefaults.noiseRadius, 120);
    this.impactVisualRadius = this._num(rockDefaults.impactVisualRadius, 14);
    this.noiseTTL = this._num(rockDefaults.noiseTTL, 0.7);
    this.throwCooldownDuration = this._num(rockDefaults.cooldown, 0.45);
    this.noiseEventSeq = this._num(state.noiseEventSeq, 0);
    this.vfxEventSeq = this._num(state.vfxEventSeq, 0);

    if (!Array.isArray(this.state.rockProjectiles)) this.state.rockProjectiles = [];
    if (!Array.isArray(this.state.vfxEvents)) this.state.vfxEvents = [];
    this.state.throwCharge = clamp(this._num(this.state.throwCharge, 1), 0, 1);
    if (!this.state.activeInteraction) this.state.activeInteraction = null;

    this.levelCatalog = Array.isArray(options.levelCatalog) ? options.levelCatalog : [];
    this.scheduleLevelLoad =
      typeof options.scheduleLevelLoad === "function" ? options.scheduleLevelLoad : null;
  }

  update() {
    const input = this.state.input;
    if (!input) return;
    const interact = this._readInteract(input);

    if (input.justPressed("g")) {
      this.state.debug = !this.state.debug;
    }

    if (this.state.status === "loading") {
      this._clearGameplayPrompt();
      this.state.message = "Loading level...";
      this.state.messageTimer = 0;
      this.game.click = null;
      input.update();
      return;
    }

    if (this.state.status === "splash") {
      this._clearGameplayPrompt();
      if (this._anyInputPressed(input)) {
        this.state.status = "menu";
        this.state.menuIndex = 0;
      }
      input.update();
      return;
    }

    if (this.state.status === "menu") {
      this._clearGameplayPrompt();
      const menuOptionsCount = 2;
      this.state.menuIndex = clamp(Number(this.state.menuIndex) || 0, 0, 1);
      this._updateMenuSelectionFromMouse();

      const clickedMenuIndex = this._consumeClickSelection(this.state.menuOptionRects);
      if (clickedMenuIndex >= 0) {
        this.state.menuIndex = clickedMenuIndex;
        this._activateMenuOption(clickedMenuIndex);
      } else if (this._isMenuUpPressed(input)) {
        this.state.menuIndex = (this.state.menuIndex + menuOptionsCount - 1) % menuOptionsCount;
      } else if (this._isMenuDownPressed(input)) {
        this.state.menuIndex = (this.state.menuIndex + 1) % menuOptionsCount;
      } else if (this._isConfirmPressed(input)) {
        this._activateMenuOption(this.state.menuIndex);
      } else if (this._isPauseTogglePressed(input)) {
        this.state.status = "splash";
      }
      input.update();
      return;
    }

    if (this.state.status === "level_select") {
      this._clearGameplayPrompt();
      this._updateLevelSelectionFromMouse();

      const clickedLevelIndex = this._consumeClickSelection(this.state.levelOptionRects);
      if (clickedLevelIndex >= 0) {
        this.state.selectedLevelIndex = clickedLevelIndex;
        this._queueLevelLoad(this.state.selectedLevelIndex, "playing");
        input.update();
        return;
      }

      if (this._isMenuUpPressed(input)) {
        this.state.selectedLevelIndex = this._wrappedLevelIndex(this.state.selectedLevelIndex - 1);
      } else if (this._isMenuDownPressed(input)) {
        this.state.selectedLevelIndex = this._wrappedLevelIndex(this.state.selectedLevelIndex + 1);
      } else if (this._isConfirmPressed(input)) {
        this._queueLevelLoad(this.state.selectedLevelIndex, "playing");
      } else if (this._isPauseTogglePressed(input)) {
        this.state.status = "menu";
      } else if (input.justPressed("c")) {
        this.state.status = "credits";
      }
      input.update();
      return;
    }

    if (this.state.status === "credits") {
      this._clearGameplayPrompt();
      if (this._isConfirmPressed(input) || this._isPauseTogglePressed(input)) {
        this.state.status = "menu";
      }
      input.update();
      return;
    }

    if (this.state.status === "paused") {
      this._updateFocusSelectionFromMouse();
      const clickedFocusIndex = this._consumeClickSelection(this.state.focusOptionRects);
      if (clickedFocusIndex >= 0) {
        this._activateFocusOption(clickedFocusIndex);
      } else if (this._isPauseTogglePressed(input) || input.justPressed("p")) {
        this._handleFocusAction("resume");
      } else if (input.justPressed("r")) {
        this._handleFocusAction("retry");
      } else if (input.justPressed("l")) {
        this._handleFocusAction("levels");
      } else if (input.justPressed("t")) {
        this._handleFocusAction("title");
      } else if (input.justPressed("c")) {
        this._handleFocusAction("credits");
      }
      this._clearGameplayPrompt();
      input.update();
      return;
    }

    if (this.state.status === "won") {
      this._updateFocusSelectionFromMouse();
      const clickedFocusIndex = this._consumeClickSelection(this.state.focusOptionRects);
      if (clickedFocusIndex >= 0) {
        this._activateFocusOption(clickedFocusIndex);
      } else if (input.justPressed("n")) {
        this._handleFocusAction("next");
      } else if (input.justPressed("r")) {
        this._handleFocusAction("retry");
      } else if (input.justPressed("l")) {
        this._handleFocusAction("levels");
      } else if (input.justPressed("t")) {
        this._handleFocusAction("title");
      }
      this._clearGameplayPrompt();
      input.update();
      return;
    }

    if (this.state.status === "extracting") {
      this._updateExtractionSequence(this.game.clockTick);
      this._clearGameplayPrompt();
      input.update();
      return;
    }

    if (this.state.status === "lost") {
      this._updateFocusSelectionFromMouse();
      const clickedFocusIndex = this._consumeClickSelection(this.state.focusOptionRects);
      if (clickedFocusIndex >= 0) {
        this._activateFocusOption(clickedFocusIndex);
      } else if (input.justPressed("r")) {
        this._handleFocusAction("retry");
      } else if (input.justPressed("l")) {
        this._handleFocusAction("levels");
      } else if (input.justPressed("t")) {
        this._handleFocusAction("title");
      }
      this._clearGameplayPrompt();
      input.update();
      return;
    }

    if (this.state.status !== "playing") {
      this._clearGameplayPrompt();
      input.update();
      return;
    }

    if (this._isPauseTogglePressed(input)) {
      this.state.status = "paused";
      this._clearGameplayPrompt();
      this.game.click = null;
      input.update();
      return;
    }

    if (input.justPressed("k")) {
      this.state.playerState = "CAPTURED";
      this.state.status = "lost";
      input.update();
      return;
    }

    const dt = this.game.clockTick;
    this.throwCooldown = Math.max(0, this.throwCooldown - dt);
    this.state.throwCharge = this._computeThrowCharge();
    this._updateNoiseEvents(dt);
    this._updateRockProjectiles(dt);
    this._updateVfxEvents(dt);

    if (this.state.messageTimer > 0) {
      this.state.messageTimer -= dt;
      if (this.state.messageTimer <= 0) {
        this.state.messageTimer = 0;
        this.state.message = "";
      }
    }

    if (this.game.click) {
      const click = this.game.click;
      this.game.click = null;
      this._handleThrowClick(click);
    }

    const interaction = getInteraction(this.player, this.level, this.state);

    const interactionChanged =
      interaction?.actionId !== this.lastInteractionActionId ||
      interaction?.target !== this.lastInteractionTarget ||
      interaction?.type !== this.lastInteractionType;

    if (interactionChanged && interaction?.actionId === "exit-locked") {
      this.state.message = "Finish the objective first.";
      this.state.messageTimer = 1.5;
    }

    const isHold = interaction?.type === "hold" && interaction?.actionId === "use-terminal";
    const sameHoldTarget =
      interaction &&
      this.holdInteraction &&
      interaction.actionId === this.holdInteraction.actionId &&
      interaction.target === this.holdInteraction.target &&
      interaction.type === this.holdInteraction.type;

    if (!interaction || !isHold || !sameHoldTarget) {
      this.holdTime = 0;
      if (this.state.terminalState === "DOWNLOADING") {
        this.state.terminalState = "INACTIVE";
        this.state.terminalProgress = 0;
      }
    }

    if (isHold) {
      if (interact.down) {
        this.holdTime += dt;
        const duration = interaction.holdDuration || 0;
        const progress = duration > 0 ? clamp(this.holdTime / duration, 0, 1) : 0;
        if (progress >= 1) {
          this._performInteraction(interaction);
          this.holdTime = 0;
        } else {
          this.state.terminalState = "DOWNLOADING";
          this.state.terminalProgress = progress;
        }
      } else {
        this.holdTime = 0;
        if (this.state.terminalState !== "COMPLETE") {
          this.state.terminalState = "INACTIVE";
          this.state.terminalProgress = 0;
        }
      }
    } else if (interaction && interact.pressed) {
      this._performInteraction(interaction);
    }

    let prompt = interaction?.prompt || "";
    if (interaction?.actionId === "use-terminal") {
      if (this.state.terminalState === "DOWNLOADING") {
        const pct = Math.round(this.state.terminalProgress * 100);
        prompt = `Downloading... ${pct}%`;
      } else {
        prompt = "Hold E: Download Data";
      }
    }
    this.state.uiPrompt = prompt;
    this.state.activeInteraction = this._buildActiveInteraction(interaction);

    this.holdInteraction = interaction;
    this.lastInteractionActionId = interaction?.actionId || null;
    this.lastInteractionTarget = interaction?.target || null;
    this.lastInteractionType = interaction?.type || null;

    input.update();
  }

  draw() {
    // no-op
  }

  resetLevel() {
    this.state.status = "playing";
    this.state.playerState = "NORMAL";
    this.state.playerExtracted = false;
    this.player.hidden = false;
    this.player.x = this.level.playerSpawn.x;
    this.player.y = this.level.playerSpawn.y;
    this.player.lastDir = { x: 1, y: 0 };

    this.state.hasKeycard = false;
    this.state.objectiveComplete = false;
    this.state.terminalComplete = false;
    this.state.terminalState = "INACTIVE";
    this.state.terminalProgress = 0;

    this._clearGameplayPrompt();
    this.state.message = "";
    this.state.messageTimer = 0;
    this.state.noise = null;
    this.state.noiseEvents = [];
    this.state.rockProjectiles = [];
    this.state.noiseEventSeq = 0;
    this.state.throwCharge = 1;
    this.state.vfxEvents = [];
    this.state.vfxEventSeq = 0;
    this.state.pendingExtraction = false;
    this.state.extractionFx = null;
    this.state.activeHideSpot = null;
    this.state.lastCaptureByGuardId = null;
    this.state.debugInfo = { guards: [] };
    this.game.click = null;
    this.game.keys = {};
    if (this.state.input) this.state.input.previousKeys = {};

    this.holdTime = 0;
    this.holdInteraction = null;
    this.lastInteractionActionId = null;
    this.lastInteractionTarget = null;
    this.lastInteractionType = null;
    this.interactHeld = false;
    this.throwCooldown = 0;
    this.noiseEventSeq = 0;
    this.vfxEventSeq = 0;

    if (this.keycardSpawn) {
      this.level.keycard = { ...this.keycardSpawn };
      this.state.keycardSpawn = { ...this.keycardSpawn };
    } else {
      this.level.keycard = null;
    }

    if (this.level.lockedDoor) {
      this.level.lockedDoor.locked = true;
      this.level.lockedDoor.state = "LOCKED";
      this.level.lockedDoor.openProgress = 0;
      if (!this.level.walls.some(w => this._rectMatches(w, this.level.lockedDoor))) {
        this.level.walls.push(this.level.lockedDoor);
      }
    }

    if (this.level.hideSpots && this.level.hideSpots.length) {
      for (const spot of this.level.hideSpots) {
        spot.occupied = false;
      }
    }

    const guards = this.game.entities.filter(e => e.isGuard);
    for (const guard of guards) {
      if (typeof guard.reset === "function") guard.reset();
    }
  }

  _isConfirmPressed(input) {
    return (
      input.justPressed("Enter") ||
      input.justPressed(" ") ||
      input.justPressed("Space") ||
      input.justPressed("Spacebar")
    );
  }

  _isPauseTogglePressed(input) {
    return input.justPressed("Escape") || input.justPressed("Esc");
  }

  _isMenuUpPressed(input) {
    return input.justPressed("ArrowUp") || input.justPressed("w");
  }

  _isMenuDownPressed(input) {
    return input.justPressed("ArrowDown") || input.justPressed("s");
  }

  _anyInputPressed(input) {
    if (this.game.click) {
      this.game.click = null;
      return true;
    }

    const currentKeys = this.game.keys || {};
    const previousKeys = input.previousKeys || {};
    for (const key of Object.keys(currentKeys)) {
      if (currentKeys[key] && !previousKeys[key]) return true;
    }
    return false;
  }

  _updateMenuSelectionFromMouse() {
    const hoveredIndex = this._hitTestSelection(this.state.menuOptionRects, this.game.mouse);
    if (hoveredIndex >= 0) {
      this.state.menuIndex = hoveredIndex;
    }
  }

  _updateLevelSelectionFromMouse() {
    const hoveredIndex = this._hitTestSelection(this.state.levelOptionRects, this.game.mouse);
    if (hoveredIndex >= 0) {
      this.state.selectedLevelIndex = hoveredIndex;
    }
  }

  _updateFocusSelectionFromMouse() {
    const hoveredIndex = this._hitTestSelection(this.state.focusOptionRects, this.game.mouse);
    this.state.focusIndex = hoveredIndex >= 0 ? hoveredIndex : -1;
  }

  _consumeClickSelection(optionRects) {
    if (!this.game.click) return -1;
    const clickPoint = this.game.click;
    this.game.click = null;
    return this._hitTestSelection(optionRects, clickPoint);
  }

  _hitTestSelection(optionRects, point) {
    if (!point || !Array.isArray(optionRects)) return -1;

    for (let i = 0; i < optionRects.length; i++) {
      const rect = optionRects[i];
      if (!rect) continue;
      if (
        point.x >= rect.x &&
        point.x <= rect.x + rect.w &&
        point.y >= rect.y &&
        point.y <= rect.y + rect.h
      ) {
        return i;
      }
    }
    return -1;
  }

  _activateMenuOption(index) {
    if (index === 0) {
      this.state.selectedLevelIndex = this.state.levelIndex;
      this.state.status = "level_select";
      return;
    }

    if (index === 1) {
      this.state.status = "credits";
    }
  }

  _activateFocusOption(index) {
    const options = Array.isArray(this.state.focusOptionRects) ? this.state.focusOptionRects : [];
    if (index < 0 || index >= options.length) return;
    const actionId = options[index]?.actionId || "";
    this._handleFocusAction(actionId);
  }

  _handleFocusAction(actionId) {
    if (actionId === "resume") {
      this.state.status = "playing";
      return;
    }

    if (actionId === "retry") {
      this.resetLevel();
      return;
    }

    if (actionId === "levels") {
      this.state.status = "level_select";
      return;
    }

    if (actionId === "title") {
      this.state.status = "splash";
      return;
    }

    if (actionId === "credits") {
      this.state.status = "credits";
      return;
    }

    if (actionId === "next") {
      const nextLevelIndex = this.state.levelIndex + 1;
      if (nextLevelIndex < this._levelCount()) {
        this._queueLevelLoad(nextLevelIndex, "playing");
      } else {
        this.state.status = "credits";
      }
    }
  }

  _queueLevelLoad(levelIndex, initialStatus) {
    const levelCount = this._levelCount();
    if (!levelCount) return;

    const safeIndex = clamp(levelIndex, 0, levelCount - 1);
    this.state.selectedLevelIndex = safeIndex;
    this._clearGameplayPrompt();
    this.state.message = "";
    this.state.messageTimer = 0;
    this.state.pendingExtraction = false;
    this.state.extractionFx = null;
    this.state.playerExtracted = false;
    this.interactHeld = false;
    this.game.click = null;

    if (this.scheduleLevelLoad) {
      this.state.status = "loading";
      this.scheduleLevelLoad(safeIndex, initialStatus || "playing");
      return;
    }

    this.state.levelIndex = safeIndex;
    this.state.status = initialStatus || "playing";
  }

  _wrappedLevelIndex(index) {
    const levelCount = this._levelCount();
    if (!levelCount) return 0;
    return ((index % levelCount) + levelCount) % levelCount;
  }

  _levelCount() {
    if (this.levelCatalog.length) return this.levelCatalog.length;
    return Math.max(1, this._num(this.state.levelCount, 1));
  }

  _handleThrowClick(click) {
    if (this.state.playerState !== "NORMAL" || this.throwCooldown > 0) return;

    const worldPoint = this._toWorldPoint(click);
    if (!worldPoint) return;

    const playerCenter = this._playerCenter();
    const target = this._computeThrowTarget(playerCenter.x, playerCenter.y, worldPoint.x, worldPoint.y);
    if (!target) return;

    this._spawnRockProjectile(playerCenter, target);
    this.throwCooldown = this.throwCooldownDuration;
    this.state.throwCharge = this._computeThrowCharge();
  }

  _spawnRockProjectile(start, target) {
    const dx = target.x - start.x;
    const dy = target.y - start.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return;

    const duration = clamp(dist / Math.max(1, this.throwSpeed), 0.08, 0.52);
    const arcHeight = clamp(this.throwArcHeight + dist * 0.035, 10, 28);

    if (!Array.isArray(this.state.rockProjectiles)) this.state.rockProjectiles = [];
    this.state.rockProjectiles.push({
      startX: start.x,
      startY: start.y,
      targetX: target.x,
      targetY: target.y,
      x: start.x,
      y: start.y,
      elapsed: 0,
      duration,
      arcHeight,
      arc: 0,
      radius: 3,
    });
  }

  _updateRockProjectiles(dt) {
    if (!Array.isArray(this.state.rockProjectiles) || !this.state.rockProjectiles.length) {
      this.state.rockProjectiles = [];
      return;
    }

    const active = [];
    for (const rock of this.state.rockProjectiles) {
      if (!rock) continue;

      rock.elapsed += dt;
      const t = clamp(rock.elapsed / Math.max(0.001, rock.duration), 0, 1);
      rock.x = this._lerp(rock.startX, rock.targetX, t);
      rock.y = this._lerp(rock.startY, rock.targetY, t);
      rock.arc = Math.sin(t * Math.PI) * rock.arcHeight;

      if (t >= 1) {
        this._emitRockImpact(rock.targetX, rock.targetY);
      } else {
        active.push(rock);
      }
    }
    this.state.rockProjectiles = active;
  }

  _emitRockImpact(x, y) {
    this.noiseEventSeq += 1;
    this.state.noiseEventSeq = this.noiseEventSeq;

    const noiseEvent = {
      id: this.noiseEventSeq,
      source: "rock",
      x,
      y,
      radius: this.noiseRadius,
      coreRadius: this.impactVisualRadius,
      ttl: this.noiseTTL,
      life: this.noiseTTL,
      createdAt: this.game.timer ? this.game.timer.gameTime : Date.now() / 1000,
    };

    if (!Array.isArray(this.state.noiseEvents)) this.state.noiseEvents = [];
    this.state.noiseEvents.push(noiseEvent);
    this.state.noise = noiseEvent;
    this._spawnVfxEvent("hit", x, y, { scale: 0.95, alpha: 0.98 });
    this._spawnVfxEvent("dust", x, y + 4, { scale: 1.06, alpha: 0.9 });
  }

  _updateNoiseEvents(dt) {
    if (!Array.isArray(this.state.noiseEvents) || !this.state.noiseEvents.length) {
      this.state.noiseEvents = [];
      this.state.noise = null;
      return;
    }

    for (const event of this.state.noiseEvents) {
      if (!Number.isFinite(event.life) || event.life <= 0) {
        event.life = Math.max(0.001, this._num(event.ttl, this.noiseTTL));
      }
      event.ttl -= dt;
    }

    this.state.noiseEvents = this.state.noiseEvents.filter(e => e.ttl > 0);
    this.state.noise = this.state.noiseEvents[this.state.noiseEvents.length - 1] || null;
  }

  _updateVfxEvents(dt) {
    if (!Array.isArray(this.state.vfxEvents) || !this.state.vfxEvents.length) {
      this.state.vfxEvents = [];
      return;
    }

    for (const event of this.state.vfxEvents) {
      if (!event) continue;
      event.elapsed = this._num(event.elapsed, 0) + dt;
    }

    this.state.vfxEvents = this.state.vfxEvents.filter(event => {
      if (!event) return false;
      const duration = Math.max(0.01, this._num(event.duration, 0.2));
      if (event.loop) return true;
      return event.elapsed < duration;
    });
  }

  _spawnVfxEvent(typeId, x, y, options = {}) {
    const spec = typeof getArtPackVfxSpec === "function"
      ? getArtPackVfxSpec(typeId)
      : null;
    if (!spec) return;

    this.vfxEventSeq += 1;
    this.state.vfxEventSeq = this.vfxEventSeq;

    const frames = Math.max(1, Math.round(this._num(spec.frames, 1)));
    const fps = Math.max(1, this._num(spec.fps, 12));
    const duration = frames / fps;

    if (!Array.isArray(this.state.vfxEvents)) this.state.vfxEvents = [];
    this.state.vfxEvents.push({
      id: this.vfxEventSeq,
      type: typeId,
      x,
      y,
      elapsed: 0,
      duration,
      frames,
      fps,
      frameW: Math.max(1, this._num(spec.frameW, 64)),
      frameH: Math.max(1, this._num(spec.frameH, 64)),
      loop: !!spec.loop,
      scale: Math.max(0.2, this._num(options.scale, 1)),
      alpha: clamp(this._num(options.alpha, 1), 0, 1),
    });
  }

  _performInteraction(interaction) {
    if (!interaction) return;

    const actionId = interaction.actionId || "";
    const hadKeycard = !!this.state.hasKeycard;
    const hadTerminalComplete = !!this.state.terminalComplete;
    const targetCenter = this._rectCenter(interaction.target);

    performInteraction(interaction, this.player, this.level, this.state);

    if (actionId === "pickup-keycard" && !hadKeycard && this.state.hasKeycard && targetCenter) {
      this._spawnVfxEvent("sparkle", targetCenter.x, targetCenter.y - 6, { scale: 1.08, alpha: 0.98 });
    } else if (actionId === "unlock-door") {
      if (this.level?.lockedDoor) this.level.lockedDoor.openProgress = 0;
      if (targetCenter) {
        this._spawnVfxEvent("dust", targetCenter.x, targetCenter.y + 6, { scale: 1.1, alpha: 0.8 });
        this._spawnVfxEvent("hit", targetCenter.x, targetCenter.y, { scale: 0.78, alpha: 0.75 });
      }
    } else if (actionId === "use-terminal" && !hadTerminalComplete && this.state.terminalComplete && targetCenter) {
      this._spawnVfxEvent("hit", targetCenter.x, targetCenter.y - 4, { scale: 0.74, alpha: 0.8 });
    } else if (actionId === "exit" && this.state.pendingExtraction) {
      this.state.pendingExtraction = false;
      this._startExtractionSequence(targetCenter || this._playerCenter());
    }
  }

  _startExtractionSequence(center) {
    if (!center) return;
    if (this.state.status !== "playing") return;

    this.player.x = center.x - this.player.w / 2;
    this.player.y = center.y - this.player.h / 2;
    this.player.hidden = false;

    this.state.playerState = "EXTRACTING";
    this.state.playerExtracted = false;
    this.state.status = "extracting";
    this.state.pendingExtraction = false;
    this.state.extractionFx = {
      x: center.x,
      y: center.y,
      elapsed: 0,
      duration: this.extractionDuration,
      lift: 132,
      spinTurns: 4.8,
    };
    this._clearGameplayPrompt();
  }

  _updateExtractionSequence(dt) {
    const fx = this.state.extractionFx;
    if (!fx) {
      this.state.status = "won";
      this.state.playerState = "EXTRACTED";
      this.state.playerExtracted = true;
      this.player.hidden = true;
      return;
    }

    const step = Math.max(0, this._num(dt, 0));
    fx.elapsed += step;
    const duration = Math.max(0.01, this._num(fx.duration, this.extractionDuration));
    if (fx.elapsed >= duration) {
      this.state.extractionFx = null;
      this.state.playerState = "EXTRACTED";
      this.state.playerExtracted = true;
      this.player.hidden = true;
      this.state.status = "won";
    }
  }

  _rectCenter(rect) {
    if (
      !rect ||
      !Number.isFinite(rect.x) ||
      !Number.isFinite(rect.y) ||
      !Number.isFinite(rect.w) ||
      !Number.isFinite(rect.h)
    ) {
      return null;
    }
    return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  }

  _buildActiveInteraction(interaction) {
    if (!interaction || !interaction.prompt) return null;

    const target = interaction.target;
    let worldX = null;
    let worldY = null;
    if (
      target &&
      Number.isFinite(target.x) &&
      Number.isFinite(target.y) &&
      Number.isFinite(target.w) &&
      Number.isFinite(target.h)
    ) {
      worldX = target.x + target.w / 2;
      worldY = target.y + target.h / 2;
    }

    return {
      actionId: interaction.actionId || null,
      type: interaction.type || null,
      prompt: interaction.prompt || "",
      worldX,
      worldY,
    };
  }

  _clearGameplayPrompt() {
    this.state.uiPrompt = "";
    this.state.activeInteraction = null;
  }

  _readInteract(input) {
    const down = !!input?.isDown("e");
    const pressed = down && !this.interactHeld;
    this.interactHeld = down;
    return { down, pressed };
  }

  _computeThrowCharge() {
    if (this.throwCooldownDuration <= 0) return 1;
    return clamp(1 - this.throwCooldown / this.throwCooldownDuration, 0, 1);
  }

  _playerCenter() {
    return {
      x: this.player.x + this.player.w / 2,
      y: this.player.y + this.player.h / 2,
    };
  }

  _toWorldPoint(click) {
    if (!click) return null;
    const cam = this.game.camera;
    return {
      x: click.x / cam.zoom + cam.x,
      y: click.y / cam.zoom + cam.y,
    };
  }

  _computeThrowTarget(fromX, fromY, toX, toY) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return null;

    const scale = dist > this.maxThrowRange ? this.maxThrowRange / dist : 1;
    const rawTarget = this._clampPointToLevel(fromX + dx * scale, fromY + dy * scale);
    const travelDist = Math.hypot(rawTarget.x - fromX, rawTarget.y - fromY);
    const steps = Math.max(6, Math.ceil(travelDist / 10));

    let last = this._clampPointToLevel(fromX, fromY);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const sample = this._clampPointToLevel(
        this._lerp(fromX, rawTarget.x, t),
        this._lerp(fromY, rawTarget.y, t)
      );

      if (typeof segmentIntersectsRect === "function") {
        const a = { x: last.x, y: last.y };
        const b = { x: sample.x, y: sample.y };
        const walls = Array.isArray(this.level?.walls) ? this.level.walls : [];
        let blocked = false;
        for (const wall of walls) {
          if (!wall) continue;
          if (wall.componentType === "lockedDoor" && (wall.locked === false || wall.state === "OPEN")) continue;
          if (segmentIntersectsRect(a, b, wall)) {
            blocked = true;
            break;
          }
        }
        if (blocked) break;
      }

      if (this._isPointInsideWall(sample.x, sample.y)) {
        break;
      }

      last = sample;
    }

    return last;
  }

  _clampPointToLevel(x, y) {
    const maxX = Math.max(0, this._num(this.level?.width, 0));
    const maxY = Math.max(0, this._num(this.level?.height, 0));
    return {
      x: clamp(x, 0, maxX),
      y: clamp(y, 0, maxY),
    };
  }

  _isPointInsideWall(x, y) {
    const walls = Array.isArray(this.level?.walls) ? this.level.walls : [];
    for (const wall of walls) {
      if (!wall) continue;
      if (wall.componentType === "lockedDoor" && (wall.locked === false || wall.state === "OPEN")) continue;
      if (x > wall.x && x < wall.x + wall.w && y > wall.y && y < wall.y + wall.h) {
        return true;
      }
    }
    return false;
  }

  _lerp(a, b, t) {
    return a + (b - a) * t;
  }

  _num(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  _rectMatches(a, b) {
    return !!a && !!b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
  }
}
