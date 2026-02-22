// src/systems/audio.js
// Centralized audio manager for music + SFX routing.

const AUDIO_SETTINGS_STORAGE_KEY = "shadow_signal_audio_settings_v1";

const AUDIO_ASSETS = Object.freeze({
  music: Object.freeze({
    menu: "./assets/audio/music/mus_menu_loop.mp3",
    gameplay: "./assets/audio/music/mus_legacy_loop.wav",
    alert: "./assets/audio/music/mus_legacy_loop.wav",
    credits: "./assets/audio/music/mus_credits_loop.mp3",
    legacy: "./assets/audio/music/mus_legacy_loop.wav",
  }),
  sfx: Object.freeze({
    ui_nav_move: Object.freeze([
      "./assets/audio/sfx/ui/ui_nav_move_01.wav",
    ]),
    ui_nav_confirm: Object.freeze([
      "./assets/audio/sfx/ui/ui_nav_confirm_01.wav",
    ]),
    ui_nav_back: Object.freeze([
      "./assets/audio/sfx/ui/ui_nav_back_01.wav",
    ]),
    ui_denied: Object.freeze([
      "./assets/audio/sfx/ui/ui_denied_01.wav",
    ]),

    ply_throw_rock: Object.freeze([
      "./assets/audio/sfx/player/ply_throw_rock_01.wav",
    ]),
    ply_footstep: Object.freeze([
      "./assets/audio/sfx/player/ply_footstep_01.wav",
    ]),
    rock_impact: Object.freeze([
      "./assets/audio/sfx/player/rock_impact_01.wav",
    ]),

    grd_footstep_patrol: Object.freeze([
      "./assets/audio/sfx/guards/grd_footstep_patrol_01.wav",
    ]),
    grd_footstep_alert: Object.freeze([
      "./assets/audio/sfx/guards/grd_footstep_alert_02.wav",
    ]),

    obj_keycard_pickup: Object.freeze([
      "./assets/audio/sfx/objectives/obj_keycard_pickup_02.wav",
    ]),
    obj_door_locked_deny: Object.freeze([
      "./assets/audio/sfx/objectives/obj_door_locked_deny_01.wav",
    ]),
    obj_door_unlock: Object.freeze([
      "./assets/audio/sfx/objectives/obj_door_unlock_02.wav",
    ]),
    obj_door_slide: Object.freeze([
      "./assets/audio/sfx/objectives/obj_door_slide_01.wav",
    ]),
    obj_terminal_start: Object.freeze([
      "./assets/audio/sfx/objectives/obj_terminal_start_01.wav",
    ]),
    obj_terminal_loop: Object.freeze([
      "./assets/audio/sfx/objectives/obj_terminal_loop_01.wav",
    ]),
    obj_terminal_complete: Object.freeze([
      "./assets/audio/sfx/objectives/obj_terminal_complete_01.wav",
    ]),
    obj_exit_locked: Object.freeze([
      "./assets/audio/sfx/objectives/obj_exit_locked_01.wav",
    ]),
    obj_extraction_start: Object.freeze([
      "./assets/audio/sfx/objectives/obj_extraction_start_04.wav",
    ]),

    sys_detection_rise_loop: Object.freeze([
      "./assets/audio/sfx/system/sys_detection_rise_loop_01.wav",
    ]),
    sys_alert_active_loop: Object.freeze([
      "./assets/audio/sfx/system/sys_alert_active_loop_01.wav",
    ]),
    sys_capture_impact: Object.freeze([
      "./assets/audio/sfx/system/sys_capture_impact_01.wav",
    ]),
  }),
});

class AudioSystem {
  constructor(state) {
    this.state = state;
    this.unlocked = false;
    this.pendingMusicKey = null;
    this.currentMusicKey = null;
    this.masterVolume = 0.9;
    this.musicVolume = 0.18;
    this.sfxVolume = 0.62;
    this.uiVolume = 0.72;
    this.footstepVolume = 0.34;
    this.guardHearingNear = 72;
    this.guardHearingFar = 560;
    this.alertSignalActive = false;
    this.alertEnterSustain = 0.12;
    this.alertExitSustain = 0.65;
    this.alertHardOnTimer = 0;
    this.alertHardOffTimer = 0;
    this.alertLoopStartDelay = 0.75;
    this.alertLoopStartTimer = 0;
    this._unlockHandler = null;
    this._unlockEvents = ["keydown", "pointerdown", "mousedown", "touchstart"];

    this.music = new Audio();
    this.music.preload = "auto";
    this.music.loop = true;
    this.music.volume = 0;

    this.terminalLoop = new Audio(this._pickPath("obj_terminal_loop") || "");
    this.terminalLoop.preload = "auto";
    this.terminalLoop.loop = true;
    this.terminalLoop.volume = 0;
    this.terminalLoopActive = false;

    this.alertLoop = new Audio(this._pickPath("sys_alert_active_loop") || "");
    this.alertLoop.preload = "auto";
    this.alertLoop.loop = true;
    this.alertLoop.volume = 0;
    this.alertLoopActive = false;

    this.alertRise = new Audio(this._pickPath("sys_detection_rise_loop") || "");
    this.alertRise.preload = "auto";
    this.alertRise.loop = false;
    this.alertRise.volume = 0;

    this.activeSfx = new Set();
    this.playerStepCooldown = 0;
    this.guardStepCooldown = new Map();
    this.globalGuardStepCooldown = 0;
    this.uiMoveCooldown = 0;

    this.prevStatus = null;
    this.prevTerminalState = null;
    this.prevMenuIndex = null;
    this.prevSelectedLevelIndex = null;
    this.prevFocusIndex = null;
    this.prevMessage = null;

    this._loadPersistedSettings();
    this.sfxPools = new Map();
    this.sfxPoolIndex = new Map();
    this._preloadAssets();
  }

  installGestureUnlock() {
    if (this._unlockHandler) return;
    this._unlockHandler = () => {
      if (this.unlocked) return;
      this.unlocked = true;
      this._detachUnlockListeners();
      if (this.pendingMusicKey) {
        this._playMusic(this.pendingMusicKey);
      } else {
        this._refreshMusicForState(this.state);
      }
      if (this._terminalShouldLoop(this.state)) {
        this._startTerminalLoop();
      }
      if (this.alertSignalActive && this.alertLoopStartTimer <= 0) {
        this._startAlertLoop();
      }
    };

    for (const eventName of this._unlockEvents) {
      window.addEventListener(eventName, this._unlockHandler, { passive: true });
    }
  }

  update(state, dt = 0) {
    this.state = state || this.state;
    const step = this._num(dt, 0);
    if (step > 0) {
      this.playerStepCooldown = Math.max(0, this.playerStepCooldown - step);
      this.globalGuardStepCooldown = Math.max(0, this.globalGuardStepCooldown - step);
      this.uiMoveCooldown = Math.max(0, this.uiMoveCooldown - step);
    }

    this._handleStatusAndTerminalTransitions(this.state);
    this._handleAlertTransitions(this.state, step);
    this._advanceAlertLoopTimer(step);
    this._refreshMusicForState(this.state);
    this._snapshotState(this.state);
  }

  onUiMove() {
    this._playUiMove();
  }

  onUiConfirm() {
    this._play("ui_nav_confirm", { volume: 0.72 });
  }

  onUiBack() {
    this._play("ui_nav_back", { volume: 0.72 });
  }

  onInteraction(actionId, context = {}) {
    if (!actionId) return;

    if (actionId === "pickup-keycard") {
      this._play("obj_keycard_pickup", { volume: 0.88 });
      return;
    }

    if (actionId === "door-locked") {
      this._play("obj_door_locked_deny", { volume: 0.82 });
      return;
    }

    if (actionId === "unlock-door") {
      this._play("obj_door_unlock", { volume: 0.84 });
      window.setTimeout(() => {
        this._play("obj_door_slide", { volume: 0.76 });
      }, 70);
      return;
    }

    if (actionId === "use-terminal") {
      if (context?.state?.terminalComplete) {
        this._play("obj_terminal_complete", { volume: 0.92 });
      }
      return;
    }

    if (actionId === "toggle-hide") {
      this._play("ui_nav_move", { volume: 0.32 });
    }
  }

  onThrow() {
    this._play("ply_throw_rock", { volume: 0.78 });
  }

  onRockImpact() {
    this._play("rock_impact", { volume: 0.9 });
  }

  onExtractionStart() {
    this._play("obj_extraction_start", { volume: 0.86 });
  }

  onExtractionFinish() {
    this._play("obj_terminal_complete", { volume: 0.74 });
  }

  onPlayerMovement(isMoving, dt, hidden, status, playerState) {
    const gameplayActive = status === "playing" && playerState === "NORMAL" && !hidden;
    if (!gameplayActive || !isMoving) return;
    if (this.playerStepCooldown > 0) return;

    this._play("ply_footstep", { volume: 0.34 });
    this.playerStepCooldown = Math.max(0.28, 0.43 - this._num(dt, 0) * 0.2);
  }

  onGuardMovement(guardId, isMoving, dt, aiState, status, guardCenter, playerCenter) {
    const id = this._num(guardId, 0);
    const current = this._num(this.guardStepCooldown.get(id), 0);
    const next = Math.max(0, current - this._num(dt, 0));
    this.guardStepCooldown.set(id, next);
    if (status !== "playing" || !isMoving) return;
    if (this.globalGuardStepCooldown > 0) return;
    if (next > 0) {
      return;
    }

    let attenuation = 1;
    const gx = Number(guardCenter?.x);
    const gy = Number(guardCenter?.y);
    const px = Number(playerCenter?.x);
    const py = Number(playerCenter?.y);
    if (Number.isFinite(gx) && Number.isFinite(gy) && Number.isFinite(px) && Number.isFinite(py)) {
      const dist = Math.hypot(gx - px, gy - py);
      if (dist >= this.guardHearingFar) return;
      if (dist > this.guardHearingNear) {
        const t = 1 - (dist - this.guardHearingNear) / Math.max(1, this.guardHearingFar - this.guardHearingNear);
        attenuation = this._clamp(t, 0, 1);
        attenuation *= attenuation;
      }
      if (attenuation <= 0.05) return;
    }

    const alert = aiState === "CHASE" || aiState === "SEARCH";
    this._play(alert ? "grd_footstep_alert" : "grd_footstep_patrol", {
      volume: (alert ? 0.52 : 0.42) * attenuation,
    });
    this.guardStepCooldown.set(id, alert ? 0.34 : 0.52);
    this.globalGuardStepCooldown = alert ? 0.08 : 0.12;
  }

  stopAllLoops() {
    this._stopTerminalLoop();
    this._stopAlertRise();
    this._stopAlertLoop();
    if (!this.music.paused) {
      this.music.pause();
      this.music.currentTime = 0;
    }
    this.currentMusicKey = null;
    this.pendingMusicKey = null;
  }

  _handleStatusAndTerminalTransitions(state) {
    const status = (state?.status || "playing").toString();
    const terminalState = (state?.terminalState || "INACTIVE").toString().toUpperCase();
    const message = (state?.message || "").toString();

    if (this.prevStatus !== null && status !== this.prevStatus) {
      this._onStatusTransition(this.prevStatus, status);
    }

    if (this.prevTerminalState !== null && terminalState !== this.prevTerminalState) {
      this._onTerminalTransition(this.prevTerminalState, terminalState);
    }

    if (this.prevMessage !== null && message && message !== this.prevMessage) {
      if (message === "Finish the objective first.") {
        this._play("obj_exit_locked", { volume: 0.86 });
      }
    }
  }

  _onStatusTransition(prevStatus, nextStatus) {
    if (nextStatus === "lost") {
      this.alertSignalActive = false;
      this.alertHardOnTimer = 0;
      this.alertHardOffTimer = 0;
      this.alertLoopStartTimer = 0;
      this._stopAlertRise();
      this._stopAlertLoop();
      this._play("sys_capture_impact", { volume: 0.9 });
    }

    if (nextStatus !== "playing" && nextStatus !== "extracting" && nextStatus !== "paused") {
      this.alertSignalActive = false;
      this.alertHardOnTimer = 0;
      this.alertHardOffTimer = 0;
      this.alertLoopStartTimer = 0;
      this._stopTerminalLoop();
      this._stopAlertRise();
      this._stopAlertLoop();
    }
  }

  _handleAlertTransitions(state, dt = 0) {
    const step = this._num(dt, 0);
    const status = (state?.status || "").toString();
    const eligible = this._isAlertEligibleStatus(status);
    const hardAlert = eligible && this._hasHardAlertSignal(state);

    if (hardAlert) {
      this.alertHardOnTimer = Math.min(10, this.alertHardOnTimer + step);
      this.alertHardOffTimer = 0;
    } else {
      this.alertHardOffTimer = Math.min(10, this.alertHardOffTimer + step);
      this.alertHardOnTimer = 0;
    }

    if (!eligible) {
      if (this.alertSignalActive) {
        this.alertSignalActive = false;
        this._onAlertExit();
      }
      return;
    }

    if (!this.alertSignalActive) {
      if (hardAlert && this.alertHardOnTimer >= this.alertEnterSustain) {
        this.alertSignalActive = true;
        this._onAlertEnter();
      }
      return;
    }

    if (!hardAlert && this.alertHardOffTimer >= this.alertExitSustain) {
      this.alertSignalActive = false;
      this._onAlertExit();
    }
  }

  _onAlertEnter() {
    this.alertLoopStartTimer = this.alertLoopStartDelay;
    this._playAlertRise();
    if (this.alertLoopStartTimer <= 0) {
      this._startAlertLoop();
    }
  }

  _onAlertExit() {
    this.alertLoopStartTimer = 0;
    this._stopAlertRise();
    this._stopAlertLoop();
  }

  _advanceAlertLoopTimer(dt = 0) {
    if (!this.alertSignalActive) return;
    const step = this._num(dt, 0);
    if (step > 0 && this.alertLoopStartTimer > 0) {
      this.alertLoopStartTimer = Math.max(0, this.alertLoopStartTimer - step);
    }
    if (this.alertLoopStartTimer <= 0 && !this.alertLoopActive) {
      this._startAlertLoop();
    }
  }

  _isAlertEligibleStatus(status) {
    return status === "playing" || status === "extracting" || status === "paused";
  }

  _hasHardAlertSignal(state) {
    const guards = state?.debugInfo?.guards;
    if (!Array.isArray(guards) || !guards.length) return false;
    for (const guard of guards) {
      if (!guard) continue;
      if (guard.aiState === "CHASE" || guard.sees === true) return true;
    }
    return false;
  }

  _onTerminalTransition(prevState, nextState) {
    if (nextState === "DOWNLOADING" && prevState !== "DOWNLOADING") {
      this._play("obj_terminal_start", { volume: 0.72 });
      this._startTerminalLoop();
      return;
    }

    if (prevState === "DOWNLOADING" && nextState !== "DOWNLOADING") {
      this._stopTerminalLoop();
      if (nextState !== "COMPLETE") {
        this._play("ui_nav_back", { volume: 0.34 });
      }
    }

    if (nextState === "COMPLETE" && prevState !== "COMPLETE") {
      this._stopTerminalLoop();
      this._play("obj_terminal_complete", { volume: 0.92 });
    }
  }

  _refreshMusicForState(state) {
    const key = this._selectMusicKey(state);
    if (!key) return;
    if (!this.unlocked) {
      this.pendingMusicKey = key;
      return;
    }
    if (key === this.currentMusicKey) return;
    this._playMusic(key);
  }

  _selectMusicKey(state) {
    const status = (state?.status || "playing").toString();

    if (status === "credits") return "credits";

    if (status === "playing" || status === "extracting" || status === "paused" || status === "won" || status === "lost") {
      return this._isAlertState() ? "alert" : "gameplay";
    }

    return "menu";
  }

  _isAlertState() {
    return !!this.alertSignalActive;
  }

  _playMusic(key) {
    let path = AUDIO_ASSETS.music[key];
    if (!path) path = AUDIO_ASSETS.music.menu || AUDIO_ASSETS.music.legacy;
    if (!path) return;

    this.currentMusicKey = key;
    this.pendingMusicKey = null;

    if (this.music.src.endsWith(path) && !this.music.paused) {
      this.music.volume = this._musicVolumeFor(key);
      return;
    }

    this.music.pause();
    this.music.src = path;
    this.music.currentTime = 0;
    this.music.loop = true;
    this.music.volume = this._musicVolumeFor(key);
    this.music.play().catch(() => {
      this.pendingMusicKey = key;
    });
  }

  _musicVolumeFor(key) {
    const base = this.musicVolume * this.masterVolume;
    if (key === "alert") return this._clamp(base * 1.08, 0, 1);
    if (key === "credits") return this._clamp(base * 0.9, 0, 1);
    return this._clamp(base, 0, 1);
  }

  _startTerminalLoop() {
    if (!this.unlocked || !this.terminalLoop.src) return;
    if (this.terminalLoopActive) return;
    this.terminalLoop.loop = true;
    this.terminalLoop.volume = this._clamp(this.sfxVolume * 0.32 * this.masterVolume, 0, 1);
    this.terminalLoop.currentTime = 0;
    this.terminalLoop.play().then(() => {
      this.terminalLoopActive = true;
    }).catch(() => {
      this.terminalLoopActive = false;
    });
  }

  _stopTerminalLoop() {
    if (!this.terminalLoop) return;
    this.terminalLoop.pause();
    this.terminalLoop.currentTime = 0;
    this.terminalLoopActive = false;
  }

  _startAlertLoop() {
    if (!this.unlocked || !this.alertLoop.src) return;
    if (this.alertLoopActive) return;
    this.alertLoop.loop = true;
    this.alertLoop.volume = this._clamp(this.sfxVolume * 0.26 * this.masterVolume, 0, 1);
    this.alertLoop.currentTime = 0;
    this.alertLoop.play().then(() => {
      this.alertLoopActive = true;
    }).catch(() => {
      this.alertLoopActive = false;
    });
  }

  _stopAlertLoop() {
    if (!this.alertLoop) return;
    this.alertLoop.pause();
    this.alertLoop.currentTime = 0;
    this.alertLoopActive = false;
  }

  _playAlertRise() {
    if (!this.unlocked || !this.alertRise?.src) return;
    this.alertRise.pause();
    this.alertRise.currentTime = 0;
    this.alertRise.volume = this._clamp(this.sfxVolume * 0.52 * this.masterVolume, 0, 1);
    this.alertRise.play().catch(() => {});
  }

  _stopAlertRise() {
    if (!this.alertRise) return;
    this.alertRise.pause();
    this.alertRise.currentTime = 0;
  }

  _playUiMove() {
    if (this.uiMoveCooldown > 0) return;
    this.uiMoveCooldown = 0.035;
    this._play("ui_nav_move", { volume: 0.48 });
  }

  _play(cueId, options = {}) {
    const path = this._pickPath(cueId);
    if (!path || !this.unlocked) return;

    const element = this._acquireSfxVoice(path);
    if (!element) return;
    element.pause();
    element.currentTime = 0;
    const requested = this._num(options.volume, 1);
    const categoryGain = this._categoryVolumeFor(cueId);
    const gain = this._clamp(this.sfxVolume * categoryGain * requested * this.masterVolume, 0, 1);
    element.volume = gain;
    this.activeSfx.add(element);
    element.play().catch(() => {});
  }

  _pickPath(cueId) {
    const list = AUDIO_ASSETS.sfx[cueId];
    if (!Array.isArray(list) || !list.length) return null;
    const index = Math.floor(Math.random() * list.length);
    return list[index];
  }

  _terminalShouldLoop(state) {
    const status = (state?.status || "").toString();
    const terminalState = (state?.terminalState || "").toString().toUpperCase();
    return status === "playing" && terminalState === "DOWNLOADING";
  }

  _snapshotState(state) {
    this.prevStatus = (state?.status || "playing").toString();
    this.prevTerminalState = (state?.terminalState || "INACTIVE").toString().toUpperCase();
    this.prevMenuIndex = this._num(state?.menuIndex, 0);
    this.prevSelectedLevelIndex = this._num(state?.selectedLevelIndex, 0);
    this.prevFocusIndex = this._num(state?.focusIndex, -1);
    this.prevMessage = (state?.message || "").toString();
  }

  adjustSetting(settingId, delta = 0.05) {
    const key = this._resolveSettingKey(settingId);
    if (!key) return null;

    const next = this._clamp(this._num(this[key], 0) + this._num(delta, 0), 0, 1);
    return this.setSetting(settingId, next);
  }

  setSetting(settingId, value = 0) {
    const key = this._resolveSettingKey(settingId);
    if (!key) return null;

    const next = this._clamp(this._num(value, 0), 0, 1);
    this[key] = next;
    this._applyRuntimeVolumes();
    this._savePersistedSettings();
    return next;
  }

  getSettingsSnapshot() {
    return {
      master: this._clamp(this._num(this.masterVolume, 0), 0, 1),
      music: this._clamp(this._num(this.musicVolume, 0), 0, 1),
      sfx: this._clamp(this._num(this.sfxVolume, 0), 0, 1),
      ui: this._clamp(this._num(this.uiVolume, 0), 0, 1),
      footsteps: this._clamp(this._num(this.footstepVolume, 0), 0, 1),
    };
  }

  _preloadAssets() {
    const unique = new Set();
    for (const path of Object.values(AUDIO_ASSETS.music)) {
      if (path) unique.add(path);
    }
    for (const sounds of Object.values(AUDIO_ASSETS.sfx)) {
      if (!Array.isArray(sounds)) continue;
      for (const path of sounds) {
        if (path) unique.add(path);
      }
    }
    for (const path of unique) {
      const audio = new Audio(path);
      audio.preload = "auto";
      if (!path.endsWith(".mp3") && !path.endsWith(".wav")) continue;
      if (path.includes("/sfx/")) {
        const pool = [];
        const poolSize = 5;
        for (let i = 0; i < poolSize; i++) {
          const voice = new Audio(path);
          voice.preload = "auto";
          pool.push(voice);
        }
        this.sfxPools.set(path, pool);
        this.sfxPoolIndex.set(path, 0);
      }
    }
  }

  _acquireSfxVoice(path) {
    const pool = this.sfxPools.get(path);
    if (!Array.isArray(pool) || !pool.length) {
      return new Audio(path);
    }
    const idx = this._num(this.sfxPoolIndex.get(path), 0) % pool.length;
    const voice = pool[idx];
    this.sfxPoolIndex.set(path, (idx + 1) % pool.length);
    return voice;
  }

  _categoryVolumeFor(cueId) {
    if (!cueId) return 1;
    if (cueId.startsWith("ui_")) return this._clamp(this.uiVolume, 0, 1);
    if (cueId.includes("footstep")) return this._clamp(this.footstepVolume, 0, 1);
    return 1;
  }

  _resolveSettingKey(settingId) {
    if (settingId === "master") return "masterVolume";
    if (settingId === "music") return "musicVolume";
    if (settingId === "sfx") return "sfxVolume";
    if (settingId === "ui") return "uiVolume";
    if (settingId === "footsteps") return "footstepVolume";
    return null;
  }

  _applyRuntimeVolumes() {
    if (this.currentMusicKey) {
      this.music.volume = this._musicVolumeFor(this.currentMusicKey);
    } else {
      this.music.volume = this._musicVolumeFor(this._selectMusicKey(this.state));
    }

    if (this.terminalLoopActive) {
      this.terminalLoop.volume = this._clamp(this.sfxVolume * 0.32 * this.masterVolume, 0, 1);
    }
    if (this.alertLoopActive) {
      this.alertLoop.volume = this._clamp(this.sfxVolume * 0.26 * this.masterVolume, 0, 1);
    }
    if (this.alertRise && !this.alertRise.paused) {
      this.alertRise.volume = this._clamp(this.sfxVolume * 0.52 * this.masterVolume, 0, 1);
    }
  }

  _loadPersistedSettings() {
    if (typeof localStorage === "undefined") return;
    try {
      const raw = localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object") return;

      if (Number.isFinite(Number(saved.masterVolume))) this.masterVolume = this._clamp(Number(saved.masterVolume), 0, 1);
      if (Number.isFinite(Number(saved.musicVolume))) this.musicVolume = this._clamp(Number(saved.musicVolume), 0, 1);
      if (Number.isFinite(Number(saved.sfxVolume))) this.sfxVolume = this._clamp(Number(saved.sfxVolume), 0, 1);
      if (Number.isFinite(Number(saved.uiVolume))) this.uiVolume = this._clamp(Number(saved.uiVolume), 0, 1);
      if (Number.isFinite(Number(saved.footstepVolume))) this.footstepVolume = this._clamp(Number(saved.footstepVolume), 0, 1);
    } catch (_err) {
      // Ignore malformed local settings and keep defaults.
    }
  }

  _savePersistedSettings() {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify({
        masterVolume: this.masterVolume,
        musicVolume: this.musicVolume,
        sfxVolume: this.sfxVolume,
        uiVolume: this.uiVolume,
        footstepVolume: this.footstepVolume,
      }));
    } catch (_err) {
      // Ignore storage errors.
    }
  }

  _detachUnlockListeners() {
    if (!this._unlockHandler) return;
    for (const eventName of this._unlockEvents) {
      window.removeEventListener(eventName, this._unlockHandler);
    }
    this._unlockHandler = null;
  }

  _num(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  _clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
}
