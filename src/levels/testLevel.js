// src/levels/testLevel.js
const TEST_GUARD = {
  x: 760,
  y: 160,
  w: 28,
  h: 28,
  // Waypoints in open space (won't hit walls)
  waypoints: [
    { x: 820, y: 160 },
    { x: 820, y: 420 },
    { x: 640, y: 420 },
    { x: 640, y: 160 },
  ],
};

const TEST_LEVEL = {
  width: 1024,
  height: 768,

  playerSpawn: { x: 120, y: 120 },

  exitZone: { x: 930, y: 700, w: 70, h: 50 },

  hideSpots: [
    { x: 220, y: 520, w: 50, h: 50 },
    { x: 720, y: 560, w: 50, h: 50 },
  ],

  // Keep only borders for now (so patrol can't get blocked)
  walls: [
    { x: 0, y: 0, w: 1024, h: 20 },
    { x: 0, y: 748, w: 1024, h: 20 },
    { x: 0, y: 0, w: 20, h: 768 },
    { x: 1004, y: 0, w: 20, h: 768 },

    // One interior wall just to test LOS blocking (optional)
    { x: 480, y: 220, w: 25, h: 320 },
  ],

  guards: [TEST_GUARD],
  guard: TEST_GUARD,
};
