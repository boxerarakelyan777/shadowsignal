// Level 2: infiltration mission with distraction-focused routing.
const LEVEL2_LOCKED_DOOR = createLockedDoor({
  x: 1880,
  y: 620,
  w: 36,
  h: 180,
  trigger: { x: 1820, y: 600, w: 116, h: 220 },
  objectiveLabel: "Open security checkpoint",
  motionType: "split",
  slideAxis: "y",
  openDuration: 0.34,
});

const LEVEL2_GUARD_TUNING = {
  // Mid-tier awareness and response.
  patrolSpeed: 92,
  chaseSpeed: 240,
  visionRange: 292,
  fovDeg: 78,
  detectionTime: 0.95,
  detectionDecayTime: 0.9,
  alertDecayWhileHidden: 0.36,
  investigatePauseDuration: 1.25,
  searchPauseDuration: 0.58,
  searchSweepCount: 3,
  searchSweepRadius: 98,
  hideSpotCheckRadius: 118,
  hideSpotHidePriorityRadius: 100,
  radioRadius: 430,
  pathRepathInterval: 0.45,
};

const LEVEL2_CAMERA_TUNING = {
  // Mid-tier camera pressure.
  visionRange: 318,
  fovDeg: 60,
  sweepDeg: 104,
  panSpeed: 0.62,
  edgePauseDuration: 0.34,
  detectionTime: 0.72,
  detectionDecayTime: 0.9,
  alertRadius: 500,
  alertCooldown: 1.05,
  closeDetectRange: 52,
};

const LEVEL2_GUARDS = [
  createGuard({
    ...LEVEL2_GUARD_TUNING,
    name: "Checkpoint Guard",
    x: 980,
    y: 700,
    waypoints: [
      { x: 860, y: 700 },
      { x: 1760, y: 700 },
      { x: 1760, y: 620 },
      { x: 1450, y: 620 },
      { x: 1180, y: 620 },
      { x: 930, y: 760 },
    ],
  }),
  createGuard({
    ...LEVEL2_GUARD_TUNING,
    name: "Security Wing Guard",
    x: 2240,
    y: 900,
    patrolSpeed: 94,
    visionRange: 300,
    waypoints: [
      { x: 2060, y: 900 },
      { x: 2840, y: 900 },
      { x: 2840, y: 560 },
      { x: 2140, y: 560 },
      { x: 2140, y: 760 },
      { x: 2500, y: 760 },
    ],
  }),
  createGuard({
    ...LEVEL2_GUARD_TUNING,
    name: "Terminal Guard",
    x: 3060,
    y: 620,
    patrolSpeed: 90,
    visionRange: 280,
    fovDeg: 74,
    waypoints: [
      { x: 2960, y: 620 },
      { x: 3320, y: 620 },
      { x: 3320, y: 520 },
      { x: 2980, y: 520 },
      { x: 2880, y: 640 },
      { x: 3180, y: 700 },
    ],
  }),
];

const LEVEL2_CAMERAS = [
  {
    ...LEVEL2_CAMERA_TUNING,
    name: "Keycard Room Camera",
    x: 1288,
    y: 248,
    facing: Math.PI / 2,
    sweepDeg: 96,
    visionRange: 292,
    alertRadius: 440,
  },
  {
    ...LEVEL2_CAMERA_TUNING,
    name: "Checkpoint Camera",
    x: 1740,
    y: 590,
    facing: Math.PI,
    sweepDeg: 110,
    visionRange: 332,
  },
  {
    ...LEVEL2_CAMERA_TUNING,
    name: "Extraction Camera",
    x: 2890,
    y: 488,
    facing: 0.2,
    sweepDeg: 118,
    visionRange: 340,
    detectionTime: 0.66,
    alertRadius: 560,
  },
];

const LEVEL2 = {
  width: 3400,
  height: 1400,
  floorVariant: "ops",
  wallVariant: "reinforced",
  useFloorZones: true,
  enableFloorTransitions: false,
  enableWallDecals: false,
  floorZones: [
    { id: "spawn", role: "spawn", variant: "concrete", x: 24, y: 360, w: 760, h: 674, priority: 68 },
    { id: "corridor", role: "corridor", variant: "ops", flow: "east", x: 24, y: 560, w: 1892, h: 280, priority: 50 },
    { id: "keycard_room", role: "secure", variant: "secure", x: 1080, y: 220, w: 520, h: 340, priority: 86 },
    { id: "secure_wing", role: "secure", variant: "secure", x: 1916, y: 420, w: 1460, h: 614, priority: 44 },
    { id: "extraction_lane", role: "terminal", variant: "ops", x: 2860, y: 460, w: 500, h: 300, priority: 92 },
  ],

  playerSpawn: { x: 120, y: 700 },

  keycard: createKeycard({
    x: 1320,
    y: 360,
    prompt: "E: Pick up Security Keycard",
    acquiredMessage: "Security keycard acquired.",
  }),
  lockedDoor: LEVEL2_LOCKED_DOOR,
  terminal: createTerminal({ x: 3260, y: 560 }),
  exitZone: createExitZone({ x: 3210, y: 860, w: 140, h: 120 }),

  objectiveSteps: [
    { type: "flag", flag: "hasKeycard", label: "Steal security keycard", icon: "keycard" },
    { type: "door", doorIndex: 0, label: "Open security checkpoint" },
    { type: "terminal", label: "Download terminal data", icon: "objective" },
    { type: "extract", label: "Reach extraction", icon: "objective" },
  ],

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
    ], { variant: "default" }),

    ...createWalls([
      // Main corridor.
      { x: 24, y: 560, w: 1248, h: 24 },
      { x: 1408, y: 560, w: 472, h: 24 },
      { x: 24, y: 816, w: 1856, h: 24 },
    ], { variant: "bulkhead" }),

    ...createWalls([
      // Keycard room (upper side access).
      { x: 1080, y: 220, w: 520, h: 24 },
      { x: 1080, y: 220, w: 24, h: 340 },
      { x: 1576, y: 220, w: 24, h: 340 },
      { x: 1080, y: 536, w: 190, h: 24 },
      { x: 1410, y: 536, w: 190, h: 24 },
      { x: 1240, y: 300, w: 70, h: 90 },
      { x: 1380, y: 360, w: 70, h: 90 },
    ], { variant: "default" }),

    ...createWalls([
      // Door frame caps.
      { x: 1880, y: 560, w: 36, h: 60 },
      { x: 1880, y: 800, w: 36, h: 40 },
    ], { variant: "bulkhead" }),

    ...createWalls([
      // Secure wing shell.
      { x: 1916, y: 420, w: 1460, h: 24 },
      { x: 1916, y: 1010, w: 1460, h: 24 },
      { x: 1916, y: 420, w: 24, h: 200 },
      { x: 1916, y: 800, w: 24, h: 234 },
    ], { variant: "reinforced" }),

    ...createWalls([
      // Secure wing interior cover.
      { x: 2240, y: 620, w: 220, h: 24 },
      { x: 2480, y: 780, w: 260, h: 24 },
      { x: 2660, y: 540, w: 24, h: 220 },
      { x: 3000, y: 640, w: 24, h: 260 },
      { x: 2300, y: 900, w: 110, h: 90 },
    ], { variant: "reinforced" }),

    ...createWalls([
      // Extraction room with left-side entry.
      { x: 2860, y: 460, w: 500, h: 24 },
      { x: 2860, y: 736, w: 500, h: 24 },
      { x: 2860, y: 460, w: 24, h: 150 },
      { x: 2860, y: 660, w: 24, h: 100 },
    ], { variant: "default" }),

    // Locked door blocks the center corridor until keycard unlock.
    LEVEL2_LOCKED_DOOR,
  ],

  guards: LEVEL2_GUARDS,
  guard: LEVEL2_GUARDS[0],
  cameras: LEVEL2_CAMERAS,
};
