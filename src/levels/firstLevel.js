// Mission Level src/levels/firstLevel.js
const FIRST_LEVEL_DOOR = createLockedDoor({
  x: 1880,
  y: 620,
  w: 36,
  h: 180,
  trigger: { x: 1820, y: 600, w: 116, h: 220 },
  motionType: "split",
  slideAxis: "y",
  openDuration: 0.34,
});

const FIRST_LEVEL_GUARDS = [
  createGuard({
    name: "Corridor Guard",
    x: 980,
    y: 700,
    patrolSpeed: 88,
    visionRange: 285,
    fovDeg: 76,
    waypoints: [
      { x: 900, y: 700 },
      { x: 1500, y: 700 },
      { x: 1500, y: 760 },
      { x: 900, y: 760 },
    ],
  }),
  createGuard({
    name: "Security Guard",
    x: 2240,
    y: 900,
    patrolSpeed: 92,
    visionRange: 300,
    fovDeg: 80,
    waypoints: [
      { x: 2140, y: 900 },
      { x: 2740, y: 900 },
      { x: 2740, y: 560 },
      { x: 2140, y: 560 },
    ],
  }),
  createGuard({
    name: "Terminal Guard",
    x: 3060,
    y: 620,
    patrolSpeed: 84,
    visionRange: 250,
    fovDeg: 70,
    waypoints: [
      { x: 2980, y: 620 },
      { x: 3320, y: 620 },
      { x: 3320, y: 520 },
      { x: 2980, y: 520 },
    ],
  }),
];

const FIRST_LEVEL = {
  width: 3400,
  height: 1400,
  floorVariant: "default",

  playerSpawn: { x: 120, y: 700 },

  // Objective chain: keycard -> secured door -> terminal -> extraction.
  keycard: createKeycard({ x: 1320, y: 360 }),
  lockedDoor: FIRST_LEVEL_DOOR,
  terminal: createTerminal({ x: 3260, y: 560 }),
  exitZone: createExitZone({ x: 3210, y: 860, w: 140, h: 120 }),

  hideSpots: [
    createHideSpot({ x: 165, y: 895, w: 64, h: 64 }),
    createHideSpot({ x: 1175, y: 865, w: 64, h: 64 }),
    createHideSpot({ x: 2055, y: 895, w: 64, h: 64 }),
    createHideSpot({ x: 2755, y: 475, w: 64, h: 64 }),
    createHideSpot({ x: 3115, y: 875, w: 64, h: 64 }),
  ],

  walls: [
    ...createOuterWalls(3400, 1400, 24),
    ...createWalls([
      // Spawn chamber.
      { x: 24, y: 360, w: 760, h: 24 },
      { x: 24, y: 1010, w: 760, h: 24 },
      { x: 760, y: 360, w: 24, h: 220 },
      { x: 760, y: 816, w: 24, h: 218 },
      { x: 260, y: 650, w: 130, h: 110 },
      { x: 500, y: 470, w: 100, h: 90 },

      // Main corridor.
      { x: 24, y: 560, w: 1248, h: 24 },
      { x: 1408, y: 560, w: 472, h: 24 },
      { x: 24, y: 816, w: 1856, h: 24 },

      // Keycard room (upper side access).
      { x: 1080, y: 220, w: 520, h: 24 },
      { x: 1080, y: 220, w: 24, h: 340 },
      { x: 1576, y: 220, w: 24, h: 340 },
      { x: 1080, y: 536, w: 190, h: 24 },
      { x: 1410, y: 536, w: 190, h: 24 },
      { x: 1240, y: 300, w: 70, h: 90 },
      { x: 1380, y: 360, w: 70, h: 90 },

      // Door frame caps.
      { x: 1880, y: 560, w: 36, h: 60 },
      { x: 1880, y: 800, w: 36, h: 40 },

      // Secure wing shell.
      { x: 1916, y: 420, w: 1460, h: 24 },
      { x: 1916, y: 1010, w: 1460, h: 24 },
      { x: 1916, y: 420, w: 24, h: 200 },
      { x: 1916, y: 800, w: 24, h: 234 },

      // Secure wing interior cover.
      { x: 2240, y: 620, w: 220, h: 24 },
      { x: 2480, y: 780, w: 260, h: 24 },
      { x: 2660, y: 540, w: 24, h: 220 },
      { x: 3000, y: 640, w: 24, h: 260 },
      { x: 2300, y: 900, w: 110, h: 90 },

      // Terminal room with left-side entry.
      { x: 2860, y: 460, w: 500, h: 24 },
      { x: 2860, y: 736, w: 500, h: 24 },
      { x: 2860, y: 460, w: 24, h: 150 },
      { x: 2860, y: 660, w: 24, h: 100 },
    ]),
    // Locked door blocks the center corridor until keycard unlock.
    FIRST_LEVEL_DOOR,
  ],

  guards: FIRST_LEVEL_GUARDS,
  guard: FIRST_LEVEL_GUARDS[0],
};
