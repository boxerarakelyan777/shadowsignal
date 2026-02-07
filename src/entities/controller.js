// src/entities/controller.js
class GameController {
  constructor(game, state, level, player) {
    this.game = game;
    this.state = state;
    this.level = level;
    this.player = player;
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
  }

  update() {
    const input = this.state.input;
    if (!input) return;

    if (input.justPressed("g")) {
      this.state.debug = !this.state.debug;
    }

    if (input.justPressed("r")) {
      this.resetLevel();
      input.update();
      return;
    }

    if (input.justPressed("k") && this.state.status === "playing") {
      this.state.playerState = "CAPTURED";
      this.state.status = "lost";
    }

    const spacePressed =
      input.justPressed(" ") ||
      input.justPressed("Space") ||
      input.justPressed("Spacebar");

    if (this.state.status !== "playing") {
      this.state.uiPrompt = "";
      this.state.noise = null;
      this.state.noiseEvents = [];
      this.state.message = "";
      this.state.messageTimer = 0;
      this.game.click = null;
      if (this.state.status === "title" && spacePressed) {
        this.state.status = "playing";
      }
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
      if (!this.level.walls.includes(this.level.lockedDoor)) {
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

  _num(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
}
