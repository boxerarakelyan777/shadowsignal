// Flagship mission level: src/levels/operationNova.js
const NOVA_LOCKED_DOOR = createLockedDoor({
  x: 2214,
  y: 1080,
  w: 44,
  h: 280,
  trigger: { x: 2120, y: 1080, w: 120, h: 280 },
  motionType: "split",
  slideAxis: "y",
  openDuration: 0.34,
});

const NOVA_GUARDS = [
  createGuard({
    name: "Entry Patrol",
    x: 760,
    y: 1220,
    patrolSpeed: 90,
    visionRange: 280,
    fovDeg: 76,
    waypoints: [
      { x: 620, y: 1220 },
      { x: 1120, y: 1220 },
      { x: 1120, y: 1320 },
      { x: 620, y: 1320 },
    ],
  }),
  createGuard({
    name: "Key Lab Guard",
    x: 1460,
    y: 820,
    patrolSpeed: 86,
    visionRange: 265,
    fovDeg: 72,
    waypoints: [
      { x: 1260, y: 820 },
      { x: 1670, y: 820 },
      { x: 1670, y: 930 },
      { x: 1260, y: 930 },
    ],
  }),
  createGuard({
    name: "Secure Wing Patrol",
    x: 2620,
    y: 1180,
    patrolSpeed: 94,
    visionRange: 300,
    fovDeg: 82,
    waypoints: [
      { x: 2440, y: 1180 },
      { x: 3120, y: 1180 },
      { x: 3120, y: 1460 },
      { x: 2440, y: 1460 },
    ],
  }),
  createGuard({
    name: "Terminal Sentinel",
    x: 3680,
    y: 1040,
    patrolSpeed: 88,
    visionRange: 285,
    fovDeg: 78,
    waypoints: [
      { x: 3520, y: 1040 },
      { x: 3920, y: 1040 },
      { x: 3920, y: 1180 },
      { x: 3520, y: 1180 },
    ],
  }),
];

const NOVA_LEVEL = {
  width: 4200,
  height: 1900,
  floorVariant: "ops",
  wallVariant: "default",
  floorZones: [
    { id: "spawn_bay", role: "spawn", variant: "concrete", x: 24, y: 980, w: 900, h: 616, priority: 60 },
    { id: "main_corridor", role: "corridor", variant: "ops", flow: "east", x: 924, y: 1080, w: 2396, h: 304, priority: 40 },
    { id: "key_lab", role: "spawn", variant: "concrete", x: 1100, y: 600, w: 720, h: 420, priority: 70 },
    { id: "secure_wing", role: "secure", variant: "secure", x: 2288, y: 760, w: 1888, h: 836, priority: 20 },
    { id: "terminal_core", role: "terminal", variant: "ops", x: 3320, y: 860, w: 760, h: 420, priority: 90 },
    { id: "extraction_bay", role: "corridor", variant: "ops", x: 3440, y: 1320, w: 640, h: 276, priority: 85 },
  ],

  playerSpawn: { x: 120, y: 1280 },

  keycard: createKeycard({ x: 1448, y: 760 }),
  lockedDoor: NOVA_LOCKED_DOOR,
  terminal: createTerminal({ x: 3890, y: 980 }),
  exitZone: createExitZone({ x: 3780, y: 1420, w: 210, h: 130 }),

  hideSpots: [
    createHideSpot({ x: 180, y: 1460, w: 64, h: 64 }),
    createHideSpot({ x: 680, y: 1460, w: 64, h: 64 }),
    createHideSpot({ x: 1940, y: 1180, w: 64, h: 64 }),
    createHideSpot({ x: 2480, y: 1490, w: 64, h: 64 }),
    createHideSpot({ x: 3880, y: 1180, w: 64, h: 64 }),
    createHideSpot({ x: 3500, y: 1460, w: 64, h: 64 }),
  ],

  walls: [
    ...createOuterWalls(4200, 1900, 24),

    // Spawn chamber.
    ...createWalls([
      { x: 24, y: 980, w: 900, h: 24 },
      { x: 24, y: 1572, w: 900, h: 24 },
      { x: 24, y: 980, w: 24, h: 616 },
      { x: 900, y: 980, w: 24, h: 220 },
      { x: 900, y: 1360, w: 24, h: 236 },
      { x: 270, y: 1120, w: 120, h: 92 },
      { x: 540, y: 1360, w: 100, h: 86 },
    ], { variant: "default" }),

    // Main corridor and door channel.
    ...createWalls([
      { x: 924, y: 1080, w: 496, h: 24 },
      { x: 1500, y: 1080, w: 714, h: 24 },
      { x: 924, y: 1360, w: 1290, h: 24 },
      { x: 2258, y: 1080, w: 1062, h: 24 },
      { x: 2258, y: 1360, w: 1062, h: 24 },
      { x: 2214, y: 1080, w: 44, h: 24 },
      { x: 2214, y: 1360, w: 44, h: 24 },
      { x: 1680, y: 1140, w: 110, h: 80 },
      { x: 1890, y: 1240, w: 120, h: 90 },
    ], { variant: "bulkhead" }),

    // Key lab wing.
    ...createWalls([
      { x: 1100, y: 600, w: 720, h: 24 },
      { x: 1100, y: 600, w: 24, h: 420 },
      { x: 1796, y: 600, w: 24, h: 420 },
      { x: 1100, y: 996, w: 320, h: 24 },
      { x: 1500, y: 996, w: 320, h: 24 },
      { x: 1260, y: 700, w: 96, h: 96 },
      { x: 1540, y: 780, w: 96, h: 96 },
    ], { variant: "default" }),

    // Secure shell and interior.
    ...createWalls([
      { x: 2288, y: 760, w: 1888, h: 24 },
      { x: 2288, y: 1572, w: 1888, h: 24 },
      { x: 2288, y: 760, w: 24, h: 320 },
      { x: 2288, y: 1360, w: 24, h: 236 },
      { x: 2520, y: 900, w: 220, h: 24 },
      { x: 2760, y: 1080, w: 24, h: 220 },
      { x: 2920, y: 1220, w: 260, h: 24 },
      { x: 3060, y: 920, w: 24, h: 220 },
      { x: 2460, y: 1450, w: 120, h: 90 },
      { x: 2860, y: 1460, w: 110, h: 90 },
    ], { variant: "reinforced" }),

    // Terminal room and extraction bay.
    ...createWalls([
      { x: 3320, y: 860, w: 760, h: 24 },
      { x: 3320, y: 1256, w: 760, h: 24 },
      { x: 3320, y: 860, w: 24, h: 170 },
      { x: 3320, y: 1170, w: 24, h: 110 },
      { x: 4056, y: 860, w: 24, h: 420 },
      { x: 3440, y: 1320, w: 250, h: 24 },
      { x: 3830, y: 1320, w: 250, h: 24 },
      { x: 3440, y: 1320, w: 24, h: 276 },
      { x: 4056, y: 1320, w: 24, h: 276 },
      { x: 3520, y: 940, w: 120, h: 80 },
      { x: 3730, y: 1090, w: 120, h: 90 },
      { x: 3610, y: 1410, w: 90, h: 80 },
    ], { variant: "default" }),

    // Locked door.
    NOVA_LOCKED_DOOR,
  ],

  guards: NOVA_GUARDS,
  guard: NOVA_GUARDS[0],
};
