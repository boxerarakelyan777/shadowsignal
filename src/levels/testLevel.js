// src/levels/testLevel.js
const TEST_GUARD = createGuard({
  x: 760,
  y: 160,
  // Waypoints in open space (won't hit walls)
  waypoints: [
    { x: 820, y: 160 },
    { x: 820, y: 420 },
    { x: 640, y: 420 },
    { x: 640, y: 160 },
  ],
});

const TEST_LEVEL = {
  width: 1024,
  height: 768,
  floorVariant: "default",
  wallVariant: "default",
  floorZones: [
    { id: "spawn", role: "spawn", variant: "concrete", x: 0, y: 0, w: 540, h: 768, priority: 30 },
    { id: "corridor", role: "corridor", variant: "ops", flow: "south", x: 540, y: 0, w: 484, h: 768, priority: 20 },
    { id: "secure_corner", role: "secure", variant: "secure", x: 740, y: 0, w: 284, h: 340, priority: 40 },
  ],

  playerSpawn: { x: 240, y: 240 },

  exitZone: createExitZone({ x: 930, y: 700, w: 70, h: 50 }),

  hideSpots: [
    createHideSpot({ x: 213, y: 513, w: 64, h: 64 }),
    createHideSpot({ x: 713, y: 553, w: 64, h: 64 }),
  ],

  // Keep only borders for now (so patrol can't get blocked)
  walls: createWalls([
    { x: 0, y: 0, w: 1024, h: 20 },
    { x: 0, y: 748, w: 1024, h: 20 },
    { x: 0, y: 0, w: 20, h: 768 },
    { x: 1004, y: 0, w: 20, h: 768 },

    // One interior wall just to test LOS blocking (optional)
    { x: 480, y: 220, w: 25, h: 320 },
  ]),

  guards: [TEST_GUARD],
  guard: TEST_GUARD,
};
