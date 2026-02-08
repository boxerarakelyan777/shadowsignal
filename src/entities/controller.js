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
    this.throwCooldown = 0;
    this.keycardSpawn = state.keycardSpawn
      ? { ...state.keycardSpawn }
      : (level.keycard ? { ...level.keycard } : null);

    const rockDefaults = (typeof TUNING !== "undefined" && TUNING.rock) ? TUNING.rock : {};
    this.maxThrowRange = this._num(rockDefaults.maxThrowRange, 250);
    this.noiseRadius = this._num(rockDefaults.noiseRadius, 160);
    this.noiseTTL = this._num(rockDefaults.noiseTTL, 1.0);
    this.throwCooldownDuration = this._num(rockDefaults.cooldown, 0.5);

    this.levelCatalog = Array.isArray(options.levelCatalog) ? options.levelCatalog : [];
    this.scheduleLevelLoad =
      typeof options.scheduleLevelLoad === "function" ? options.scheduleLevelLoad : null;
  }

  update() {
    const input = this.state.input;
    if (!input) return;

    if (input.justPressed("g")) {
      this.state.debug = !this.state.debug;
    }

    if (this.state.status === "loading") {
      this.state.uiPrompt = "";
      this.state.message = "Loading level...";
      this.state.messageTimer = 0;
      this.game.click = null;
      input.update();
      return;
    }

    if (this.state.status === "splash") {
      if (this._anyInputPressed(input)) {
        this.state.status = "menu";
        this.state.menuIndex = 0;
      }
      input.update();
      return;
    }

    if (this.state.status === "menu") {
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
      if (this._isConfirmPressed(input) || this._isPauseTogglePressed(input)) {
        this.state.status = "menu";
      }
      input.update();
      return;
    }

    if (this.state.status === "paused") {
      if (this._isPauseTogglePressed(input) || input.justPressed("p")) {
        this.state.status = "playing";
      } else if (input.justPressed("r")) {
        this.resetLevel();
      } else if (input.justPressed("l")) {
        this.state.status = "level_select";
      } else if (input.justPressed("t")) {
        this.state.status = "splash";
      } else if (input.justPressed("c")) {
        this.state.status = "credits";
      }
      this.state.uiPrompt = "";
      this.game.click = null;
      input.update();
      return;
    }

    if (this.state.status === "won") {
      if (input.justPressed("n")) {
        const nextLevelIndex = this.state.levelIndex + 1;
        if (nextLevelIndex < this._levelCount()) {
          this._queueLevelLoad(nextLevelIndex, "playing");
        } else {
          this.state.status = "credits";
        }
      } else if (input.justPressed("r")) {
        this.resetLevel();
      } else if (input.justPressed("l")) {
        this.state.status = "level_select";
      } else if (input.justPressed("t")) {
        this.state.status = "splash";
      }
      this.state.uiPrompt = "";
      this.game.click = null;
      input.update();
      return;
    }

    if (this.state.status === "lost") {
      if (input.justPressed("r")) {
        this.resetLevel();
      } else if (input.justPressed("l")) {
        this.state.status = "level_select";
      } else if (input.justPressed("t")) {
        this.state.status = "splash";
      }
      this.state.uiPrompt = "";
      this.game.click = null;
      input.update();
      return;
    }

    if (this.state.status !== "playing") {
      input.update();
      return;
    }

    if (this._isPauseTogglePressed(input)) {
      this.state.status = "paused";
      this.state.uiPrompt = "";
      this.game.click = null;
      input.update();
      return;
    }

    if (input.justPressed("r")) {
      this.resetLevel();
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

    if (this.state.messageTimer > 0) {
      this.state.messageTimer -= dt;
      if (this.state.messageTimer <= 0) {
        this.state.messageTimer = 0;
        this.state.message = "";
      }
    }

    if (Array.isArray(this.state.noiseEvents) && this.state.noiseEvents.length) {
      for (const event of this.state.noiseEvents) {
        event.ttl -= dt;
      }
      this.state.noiseEvents = this.state.noiseEvents.filter(e => e.ttl > 0);
      this.state.noise = this.state.noiseEvents[this.state.noiseEvents.length - 1] || null;
    } else {
      this.state.noiseEvents = [];
      this.state.noise = null;
    }

    if (this.game.click) {
      const click = this.game.click;
      this.game.click = null;
      if (this.state.playerState === "NORMAL" && this.throwCooldown <= 0) {
        const cam = this.game.camera;
        const worldX = click.x / cam.zoom + cam.x;
        const worldY = click.y / cam.zoom + cam.y;
        const px = this.player.x + this.player.w / 2;
        const py = this.player.y + this.player.h / 2;
        const dx = worldX - px;
        const dy = worldY - py;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
          const t = dist > this.maxThrowRange ? this.maxThrowRange / dist : 1;
          const nx = px + dx * t;
          const ny = py + dy * t;
          const noiseEvent = {
            x: nx,
            y: ny,
            radius: this.noiseRadius,
            ttl: this.noiseTTL,
            createdAt: this.game.timer ? this.game.timer.gameTime : Date.now() / 1000,
          };
          if (!Array.isArray(this.state.noiseEvents)) this.state.noiseEvents = [];
          this.state.noiseEvents.push(noiseEvent);
          this.state.noise = noiseEvent;
          this.throwCooldown = this.throwCooldownDuration;
        }
      }
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
      if (input.isDown("e")) {
        this.holdTime += dt;
        const duration = interaction.holdDuration || 0;
        const progress = duration > 0 ? clamp(this.holdTime / duration, 0, 1) : 0;
        if (progress >= 1) {
          performInteraction(interaction, this.player, this.level, this.state);
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
    } else if (interaction && input.justPressed("e")) {
      performInteraction(interaction, this.player, this.level, this.state);
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

    this.holdInteraction = interaction;
    this.lastInteractionActionId = interaction?.actionId || null;
    this.lastInteractionTarget = interaction?.target || null;
    this.lastInteractionType = interaction?.type || null;

    const inExitZone =
      this.level.exitZone && rectsIntersect(this.player, this.level.exitZone);
    if (inExitZone && this.state.status === "playing") {
      if (this.state.terminalComplete) {
        this.state.status = "won";
      } else if (this.state.messageTimer <= 0) {
        this.state.message = "Finish the objective first.";
        this.state.messageTimer = 1.5;
      }
    }

    input.update();
  }

  draw() {
    // no-op
  }

  resetLevel() {
    this.state.status = "playing";
    this.state.playerState = "NORMAL";
    this.player.hidden = false;
    this.player.x = this.level.playerSpawn.x;
    this.player.y = this.level.playerSpawn.y;
    this.player.lastDir = { x: 1, y: 0 };

    this.state.hasKey = false;
    this.state.hasKeycard = false;
    this.state.objectiveComplete = false;
    this.state.terminalComplete = false;
    this.state.terminalState = "INACTIVE";
    this.state.terminalProgress = 0;

    this.state.uiPrompt = "";
    this.state.message = "";
    this.state.messageTimer = 0;
    this.state.noise = null;
    this.state.noiseEvents = [];
    this.state.activeHideSpot = null;
    this.state.lastCaptureByGuardId = null;
    this.state.debugInfo = { guards: [] };
    this.game.click = null;

    this.holdTime = 0;
    this.holdInteraction = null;
    this.lastInteractionActionId = null;
    this.lastInteractionTarget = null;
    this.lastInteractionType = null;
    this.throwCooldown = 0;

    if (this.keycardSpawn) {
      this.level.keycard = { ...this.keycardSpawn };
      this.state.keycardSpawn = { ...this.keycardSpawn };
    } else {
      this.level.keycard = null;
    }

    if (this.level.lockedDoor) {
      this.level.lockedDoor.locked = true;
      this.level.lockedDoor.state = "LOCKED";
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

  _queueLevelLoad(levelIndex, initialStatus) {
    const levelCount = this._levelCount();
    if (!levelCount) return;

    const safeIndex = clamp(levelIndex, 0, levelCount - 1);
    this.state.selectedLevelIndex = safeIndex;
    this.state.uiPrompt = "";
    this.state.message = "";
    this.state.messageTimer = 0;
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

  _num(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  _rectMatches(a, b) {
    return !!a && !!b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
  }
}
