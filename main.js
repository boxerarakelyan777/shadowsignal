const gameEngine = new GameEngine({ debugging: false });
const ASSET_MANAGER = new AssetManager();

// Simple game state shared by entities
const STATE = { status: "playing", input: null };

ASSET_MANAGER.downloadAll(() => {
  const canvas = document.getElementById("gameWorld");
  const ctx = canvas.getContext("2d");

  gameEngine.init(ctx);

  // Make sure canvas receives keyboard events (GameEngine listens on canvas)
  canvas.focus();

  const level = FIRST_LEVEL;
  gameEngine.level = level; //to set camera

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
