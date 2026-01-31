const gameEngine = new GameEngine({ debugging: false });
const ASSET_MANAGER = new AssetManager();

// Simple game state shared by entities
const STATE = {
  status: "title",
  hasKey: false,
  hasKeycard: false,
  objectiveComplete: false,
  terminalComplete: false,
  terminalState: "INACTIVE",
  terminalProgress: 0,
  playerState: "NORMAL",
  activeHideSpot: null,
  noise: null,
  noiseEvents: [],
  debug: false,
  uiPrompt: "",
  message: "",
  messageTimer: 0,
  input: null,
  keycardSpawn: null,
};

ASSET_MANAGER.downloadAll(() => {
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

  const level = PROTOTYPE_LEVEL;
  gameEngine.level = level; //to set camera
  STATE.keycardSpawn = level.keycard ? { ...level.keycard } : null;

  STATE.input = new Input(gameEngine);

  const player = new Player(gameEngine, level, STATE);
  const guard = new Guard(gameEngine, level, STATE, player);
  const levelRenderer = new LevelRenderer(gameEngine, level, STATE);
  const controller = new GameController(gameEngine, STATE, level, player);

  gameEngine.addEntity(controller);
  gameEngine.addEntity(guard);
  gameEngine.addEntity(player);
  // IMPORTANT: This engine draws entities in reverse order (last added drawn first).
  // Add level renderer last so it draws behind everything else.
  gameEngine.addEntity(levelRenderer);


  gameEngine.start();
});
