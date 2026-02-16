const gameEngine = new GameEngine({ debugging: false });
const ASSET_MANAGER = new AssetManager();
const LEVEL_CATALOG = [
  { id: "prototype", name: "Prototype Facility", data: PROTOTYPE_LEVEL },
  { id: "tutorial", name: "Training Facility", data: FIRST_LEVEL },
  { id: "test", name: "Test Sandbox", data: TEST_LEVEL },
];
const DEFAULT_LEVEL_INDEX = 0;

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
};

//downloading sprites
ASSET_MANAGER.queueDownload("./assets/sprites/characters/player_walk.png");
ASSET_MANAGER.queueDownload("./assets/sprites/characters/guard_walk.png");
if (typeof listArtPackSpritePaths === "function") {
  const artPackPaths = listArtPackSpritePaths();
  for (const path of artPackPaths) {
    ASSET_MANAGER.queueDownload(path);
  }
}

ASSET_MANAGER.downloadAll(() => {
  // Backround music setup
  const music = new Audio("assets/audio/Backround_music.wav");
  music.preload = "auto";
  music.loop = true;
  music.volume = 0.4;

  const canvas = document.getElementById("gameWorld");
  const ctx = canvas.getContext("2d");
  const baseWidth = canvas.width;
  const baseHeight = canvas.height;
  const zoomFactor = 1.6;

  const resizeCanvas = () => {
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = Math.floor(window.innerWidth);
    const displayHeight = Math.floor(window.innerHeight);

    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    canvas.width = Math.floor(displayWidth * dpr);
    canvas.height = Math.floor(displayHeight * dpr);

    if (gameEngine.ctx) {
      gameEngine.surfaceWidth = canvas.width;
      gameEngine.surfaceHeight = canvas.height;
      gameEngine.camera.width = canvas.width;
      gameEngine.camera.height = canvas.height;
      const scale = Math.min(canvas.width / baseWidth, canvas.height / baseHeight);
      gameEngine.camera.zoom = scale * zoomFactor;
      gameEngine.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  };

  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("orientationchange", resizeCanvas);
  gameEngine.init(ctx);
  resizeCanvas();

  // Make sure canvas receives keyboard events (GameEngine listens on canvas)
  canvas.focus();
  canvas.addEventListener("pointerdown", () => canvas.focus());

  // Start music on the first user gesture that successfully resolves play().
  let musicStarted = false;
  const tryStartMusic = () => {
    if (musicStarted) return;
    const playResult = music.play();
    if (playResult && typeof playResult.then === "function") {
      playResult
        .then(() => {
          musicStarted = true;
          detachAudioStartListeners();
        })
        .catch(() => {
          // Keep listeners active so the next user gesture can try again.
        });
      return;
    }

    musicStarted = true;
    detachAudioStartListeners();
  };

  const audioStartEvents = ["keydown", "pointerdown", "mousedown", "touchstart"];
  const detachAudioStartListeners = () => {
    for (const eventName of audioStartEvents) {
      window.removeEventListener(eventName, tryStartMusic);
    }
  };

  for (const eventName of audioStartEvents) {
    window.addEventListener(eventName, tryStartMusic);
  }


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

  const playerSprite = ASSET_MANAGER.getAsset("./assets/sprites/characters/player_walk.png");
  const guardSprite = ASSET_MANAGER.getAsset("./assets/sprites/characters/guard_walk.png");
  const artPackAssets = {};
  if (typeof listArtPackSpritePaths === "function") {
    for (const path of listArtPackSpritePaths()) {
      const asset = ASSET_MANAGER.getAsset(path);
      if (asset) artPackAssets[path] = asset;
    }
  }
  const player = new Player(gameEngine, level, STATE, playerSprite);
  const guards = guardConfigs.map(
    (guardConfig, index) =>
      new Guard(gameEngine, level, STATE, player, guardConfig, index, guardSprite)
  );
  const levelRenderer = new LevelRenderer(gameEngine, level, STATE, artPackAssets);
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
