const gameEngine = new GameEngine({ debugging: false });
const ASSET_MANAGER = new AssetManager();
const LEVEL_CATALOG = [
  { id: "nova", name: "Operation Nova", data: NOVA_LEVEL },
  { id: "prototype", name: "Prototype Facility", data: PROTOTYPE_LEVEL },
  { id: "tutorial", name: "Training Facility", data: FIRST_LEVEL },
  { id: "test", name: "Test Sandbox", data: TEST_LEVEL },
];
const DEFAULT_LEVEL_INDEX = 0;
const MAX_RENDER_DPR = 1.5;
const MAX_RENDER_PIXELS = 2560 * 1440;

// Simple game state shared by entities
const STATE = {
  status: "splash",
  levelIndex: DEFAULT_LEVEL_INDEX,
  selectedLevelIndex: DEFAULT_LEVEL_INDEX,
  menuIndex: 0,
  levelCount: LEVEL_CATALOG.length,
  levelMeta: LEVEL_CATALOG.map(level => ({ id: level.id, name: level.name })),
  hasKeycard: false,
  objectiveComplete: false,
  terminalComplete: false,
  terminalState: "INACTIVE",
  terminalProgress: 0,
  playerState: "NORMAL",
  playerExtracted: false,
  activeHideSpot: null,
  noise: null,
  noiseEvents: [],
  rockProjectiles: [],
  noiseEventSeq: 0,
  throwCharge: 1,
  activeInteraction: null,
  vfxEvents: [],
  vfxEventSeq: 0,
  pendingExtraction: false,
  extractionFx: null,
  debug: false,
  uiPrompt: "",
  message: "",
  messageTimer: 0,
  input: null,
  keycardSpawn: null,
  lastCaptureByGuardId: null,
  debugInfo: { guards: [] },
  menuOptionRects: [],
  levelOptionRects: [],
  focusOptionRects: [],
  audioSliderRects: [],
  audio: null,
};

//downloading sprites
ASSET_MANAGER.queueDownload("./assets/sprites/characters/player_walk.png");
ASSET_MANAGER.queueDownload("./assets/sprites/characters/player_idle.png");
ASSET_MANAGER.queueDownload("./assets/sprites/characters/player_attack.png");
ASSET_MANAGER.queueDownload("./assets/sprites/characters/guard_walk.png");
ASSET_MANAGER.queueDownload("./assets/sprites/characters/guard_idle.png");
ASSET_MANAGER.queueDownload("./assets/sprites/characters/guard_attack.png");
if (typeof listArtPackSpritePaths === "function") {
  const artPackPaths = listArtPackSpritePaths();
  for (const path of artPackPaths) {
    ASSET_MANAGER.queueDownload(path);
  }
}
if (typeof listComponentSpritePaths === "function") {
  const componentPaths = listComponentSpritePaths();
  for (const path of componentPaths) {
    ASSET_MANAGER.queueDownload(path);
  }
}

ASSET_MANAGER.downloadAll(() => {
  const canvas = document.getElementById("gameWorld");
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true }) || canvas.getContext("2d");
  const baseWidth = canvas.width;
  const baseHeight = canvas.height;
  const zoomFactor = 1.6;
  let resizeRaf = 0;

  const resizeCanvas = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_RENDER_DPR);
    const displayWidth = Math.floor(window.innerWidth);
    const displayHeight = Math.floor(window.innerHeight);
    const desiredWidth = Math.max(1, Math.floor(displayWidth * dpr));
    const desiredHeight = Math.max(1, Math.floor(displayHeight * dpr));
    const desiredPixels = desiredWidth * desiredHeight;
    const renderScale = desiredPixels > MAX_RENDER_PIXELS
      ? Math.sqrt(MAX_RENDER_PIXELS / desiredPixels)
      : 1;
    const internalWidth = Math.max(1, Math.floor(desiredWidth * renderScale));
    const internalHeight = Math.max(1, Math.floor(desiredHeight * renderScale));

    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    canvas.width = internalWidth;
    canvas.height = internalHeight;

    if (gameEngine.ctx) {
      gameEngine.surfaceWidth = canvas.width;
      gameEngine.surfaceHeight = canvas.height;
      gameEngine.camera.width = canvas.width;
      gameEngine.camera.height = canvas.height;
      const scale = Math.min(canvas.width / baseWidth, canvas.height / baseHeight);
      const rawZoom = scale * zoomFactor;
      gameEngine.camera.zoom = Math.max(0.25, Math.round(rawZoom * 8) / 8);
      gameEngine.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  };

  const scheduleResize = () => {
    if (resizeRaf) return;
    resizeRaf = window.requestAnimationFrame(() => {
      resizeRaf = 0;
      resizeCanvas();
    });
  };

  window.addEventListener("resize", scheduleResize);
  window.addEventListener("orientationchange", scheduleResize);
  gameEngine.init(ctx);
  resizeCanvas();

  // Make sure canvas receives keyboard events (GameEngine listens on canvas)
  canvas.focus();
  canvas.addEventListener("pointerdown", () => canvas.focus());
  STATE.audio = new AudioSystem(STATE);
  STATE.audio.installGestureUnlock();

  STATE.input = gameEngine.input || new Input(gameEngine);
  loadLevelSession(DEFAULT_LEVEL_INDEX, "splash");

  gameEngine.start();
});

function loadLevelSession(levelIndex, initialStatus = "playing") {
  const safeLevelIndex = clamp(levelIndex, 0, LEVEL_CATALOG.length - 1);
  const levelEntry = LEVEL_CATALOG[safeLevelIndex];
  const level = cloneLevel(levelEntry.data);
  normalizeLevelComponents(level);
  const guardConfigs = normalizeLevelGuards(level);

  gameEngine.level = level;
  STATE.levelIndex = safeLevelIndex;
  STATE.selectedLevelIndex = safeLevelIndex;
  STATE.levelCount = LEVEL_CATALOG.length;
  STATE.keycardSpawn = level.keycard ? { ...level.keycard } : null;
  STATE.lastCaptureByGuardId = null;
  STATE.debugInfo = { guards: [] };
  STATE.menuOptionRects = [];
  STATE.levelOptionRects = [];
  STATE.focusOptionRects = [];
  STATE.audioSliderRects = [];
  STATE.menuIndex = clamp(Number(STATE.menuIndex) || 0, 0, 1);
  STATE.status = initialStatus;
  STATE.playerState = "NORMAL";
  STATE.playerExtracted = false;
  STATE.hasKeycard = false;
  STATE.objectiveComplete = false;
  STATE.terminalComplete = false;
  STATE.terminalState = "INACTIVE";
  STATE.terminalProgress = 0;
  STATE.activeHideSpot = null;
  STATE.noise = null;
  STATE.noiseEvents = [];
  STATE.rockProjectiles = [];
  STATE.noiseEventSeq = 0;
  STATE.throwCharge = 1;
  STATE.activeInteraction = null;
  STATE.vfxEvents = [];
  STATE.vfxEventSeq = 0;
  STATE.pendingExtraction = false;
  STATE.extractionFx = null;
  STATE.uiPrompt = "";
  STATE.message = "";
  STATE.messageTimer = 0;
  STATE.input = gameEngine.input || STATE.input || new Input(gameEngine);
  gameEngine.click = null;
  gameEngine.keys = {};
  if (STATE.input) STATE.input.previousKeys = {};

  const playerWalkSprite = ASSET_MANAGER.getAsset("./assets/sprites/characters/player_walk.png");
  const playerIdleSprite = ASSET_MANAGER.getAsset("./assets/sprites/characters/player_idle.png");
  const playerAttackSprite = ASSET_MANAGER.getAsset("./assets/sprites/characters/player_attack.png");
  const guardSprites = {
    walk: ASSET_MANAGER.getAsset("./assets/sprites/characters/guard_walk.png"),
    idle: ASSET_MANAGER.getAsset("./assets/sprites/characters/guard_idle.png"),
    attack: ASSET_MANAGER.getAsset("./assets/sprites/characters/guard_attack.png"),
  };
  const artPackAssets = {};
  if (typeof listArtPackSpritePaths === "function") {
    for (const path of listArtPackSpritePaths()) {
      const asset = ASSET_MANAGER.getAsset(path);
      if (asset) artPackAssets[path] = asset;
    }
  }
  const componentAssets = {};
  if (typeof listComponentSpritePaths === "function") {
    for (const path of listComponentSpritePaths()) {
      const asset = ASSET_MANAGER.getAsset(path);
      if (asset) componentAssets[path] = asset;
    }
  }
  const player = new Player(
    gameEngine,
    level,
    STATE,
    playerWalkSprite,
    playerIdleSprite,
    playerAttackSprite
  );
  const guards = guardConfigs.map(
    (guardConfig, index) =>
      new Guard(gameEngine, level, STATE, player, guardConfig, index, guardSprites)
  );
  const levelRenderer = new LevelRenderer(gameEngine, level, STATE, artPackAssets, componentAssets);
  const controller = new GameController(gameEngine, STATE, level, player, {
    scheduleLevelLoad,
    levelCatalog: LEVEL_CATALOG,
  });

  gameEngine.entities = [
    controller,
    ...guards,
    player,
    // IMPORTANT: This engine draws entities in reverse order (last added drawn first).
    // Keep level renderer last so it draws behind everything else.
    levelRenderer,
  ];
}

function scheduleLevelLoad(levelIndex, initialStatus = "playing") {
  window.setTimeout(() => {
    loadLevelSession(levelIndex, initialStatus);
  }, 0);
}

function normalizeLevelGuards(level) {
  if (!level) return [];

  let guards = [];
  if (Array.isArray(level.guards) && level.guards.length) {
    guards = level.guards;
  } else if (level.guard) {
    guards = [level.guard];
  }

  // Keep both fields in sync while the codebase migrates from guard -> guards.
  level.guards = guards;
  level.guard = guards[0] || null;
  return guards;
}

function cloneLevel(level) {
  return JSON.parse(JSON.stringify(level));
}
