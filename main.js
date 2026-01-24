const gameEngine = new GameEngine({ debugging: false });
const ASSET_MANAGER = new AssetManager();

// Simple game state shared by entities
const GAME_STATE = { status: "playing" };

ASSET_MANAGER.downloadAll(() => {
  const canvas = document.getElementById("gameWorld");
  const ctx = canvas.getContext("2d");

  gameEngine.init(ctx);

  // Make sure canvas receives keyboard events (GameEngine listens on canvas) :contentReference[oaicite:4]{index=4}
  canvas.focus();

  const level = TEST_LEVEL;

  const player = new Player(gameEngine, level, GAME_STATE);
  const guard = new Guard(gameEngine, level, GAME_STATE, player);
  const levelRenderer = new LevelRenderer(gameEngine, level, GAME_STATE);

  // IMPORTANT: This engine draws entities in reverse order (last added drawn first) :contentReference[oaicite:5]{index=5}
  // So add player/guard first, then level renderer last so it draws behind them.
  gameEngine.addEntity(player);
  gameEngine.addEntity(guard);
  gameEngine.addEntity(levelRenderer);

  gameEngine.start();
});
