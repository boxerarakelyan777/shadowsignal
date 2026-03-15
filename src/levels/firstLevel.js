// Level 1: built from the prototype layout with polished floor/wall zoning.
const LEVEL1_LOCKED_DOOR = createLockedDoor({
  x: 1300,
  y: 380,
  w: 30,
  h: 160,
  trigger: { x: 1240, y: 380, w: 90, h: 160 },
  objectiveLabel: "Open training checkpoint",
  motionType: "split",
  slideAxis: "y",
  openDuration: 0.34,
});

const LEVEL1_GUARD = createGuard({
  name: "Training Patrol",
  x: 1940,
  y: 440,
  patrolSpeed: 86,
  visionRange: 265,
  fovDeg: 72,
  waypoints: [
    { x: 1750, y: 440 },
    { x: 2600, y: 440 },
    { x: 2600, y: 560 },
    { x: 1750, y: 560 },
  ],
});

const FIRST_LEVEL = {
  width: 3000,
  height: 900,
  floorVariant: "ops",
  wallVariant: "reinforced",
  useFloorZones: true,
  enableFloorTransitions: false,
  enableWallDecals: false,
  floorZones: [
    { id: "spawn", role: "spawn", variant: "concrete", x: 20, y: 180, w: 620, h: 540, priority: 68 },
    { id: "corridor", role: "corridor", variant: "ops", flow: "east", x: 620, y: 330, w: 780, h: 260, priority: 52 },
    { id: "key_room", role: "secure", variant: "secure", x: 1000, y: 120, w: 300, h: 240, priority: 88 },
    { id: "secure_wing", role: "secure", variant: "secure", x: 1400, y: 240, w: 1580, h: 440, priority: 46 },
    { id: "terminal_room", role: "terminal", variant: "ops", x: 2240, y: 300, w: 560, h: 260, priority: 94 },
  ],

  playerSpawn: { x: 120, y: 420 },

  keycard: createKeycard({
    x: 1100,
    y: 220,
    prompt: "E: Pick up Training Keycard",
    acquiredMessage: "Training keycard acquired.",
  }),
  terminal: createTerminal({ x: 2400, y: 360 }),
  lockedDoor: LEVEL1_LOCKED_DOOR,
  exitZone: createExitZone({ x: 2850, y: 440, w: 100, h: 80 }),

  objectiveSteps: [
    { type: "flag", flag: "hasKeycard", label: "Pick up training keycard", icon: "keycard" },
    { type: "door", doorIndex: 0, label: "Open training checkpoint" },
    { type: "terminal", label: "Download training data", icon: "objective" },
    { type: "extract", label: "Reach extraction", icon: "objective" },
  ],

  hideSpots: [
    createHideSpot({ x: 210, y: 595, w: 64, h: 64 }),
    createHideSpot({ x: 810, y: 575, w: 64, h: 64 }),
    createHideSpot({ x: 1920, y: 595, w: 64, h: 64 }),
    createHideSpot({ x: 2593, y: 553, w: 64, h: 64 }),
  ],

  walls: [
    ...createOuterWalls(3000, 900, 20),

    // Spawn room.
    ...createWalls([
      { x: 20, y: 180, w: 600, h: 20 },
      { x: 20, y: 700, w: 600, h: 20 },
      { x: 20, y: 180, w: 20, h: 540 },
      { x: 620, y: 180, w: 20, h: 200 },
      { x: 620, y: 540, w: 20, h: 160 },
      { x: 250, y: 500, w: 90, h: 80 },
    ], { variant: "default" }),

    // Corridor lane to the checkpoint door.
    ...createWalls([
      { x: 640, y: 360, w: 360, h: 20 },
      { x: 1080, y: 360, w: 220, h: 20 },
      { x: 640, y: 540, w: 660, h: 20 },
      { x: 1330, y: 360, w: 70, h: 20 },
      { x: 1330, y: 540, w: 70, h: 20 },
      { x: 1300, y: 360, w: 30, h: 20 },
      { x: 1300, y: 540, w: 30, h: 20 },
    ], { variant: "bulkhead" }),

    // Key room above corridor.
    ...createWalls([
      { x: 1000, y: 120, w: 300, h: 20 },
      { x: 1000, y: 120, w: 20, h: 240 },
      { x: 1280, y: 120, w: 20, h: 240 },
      { x: 1180, y: 200, w: 40, h: 40 },
    ], { variant: "default" }),

    // Secure wing and terminal approach.
    ...createWalls([
      { x: 1400, y: 240, w: 1580, h: 20 },
      { x: 1400, y: 660, w: 1580, h: 20 },
      { x: 1400, y: 240, w: 20, h: 140 },
      { x: 1400, y: 520, w: 20, h: 140 },
      { x: 1820, y: 340, w: 120, h: 20 },
      { x: 2100, y: 460, w: 120, h: 20 },
      { x: 2330, y: 340, w: 20, h: 120 },
      { x: 2480, y: 460, w: 20, h: 120 },
      { x: 2650, y: 520, w: 80, h: 80 },
    ], { variant: "reinforced" }),

    // Locked door in the center corridor.
    LEVEL1_LOCKED_DOOR,
  ],

  guards: [LEVEL1_GUARD],
  guard: LEVEL1_GUARD,
};
