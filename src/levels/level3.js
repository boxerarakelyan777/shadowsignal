// Mission Level 3: src/levels/level3.js
// Theme: "The Vault Heist - Multi-Phase" (BLUE -> RED -> TERMINAL -> EXIT)

const LEVEL3_TILE = 32;
const LEVEL3_WIDTH_TILES = 64;
const LEVEL3_HEIGHT_TILES = 36;
const LEVEL3_WIDTH = LEVEL3_WIDTH_TILES * LEVEL3_TILE;
const LEVEL3_HEIGHT = LEVEL3_HEIGHT_TILES * LEVEL3_TILE;

function level3Tile(value) {
  return value * LEVEL3_TILE;
}

function level3RectTiles(x1, y1, x2, y2, overrides = {}) {
  return {
    x: level3Tile(x1),
    y: level3Tile(y1),
    w: level3Tile(x2 - x1 + 1),
    h: level3Tile(y2 - y1 + 1),
    ...(overrides || {}),
  };
}

function level3Spawn(tileX, tileY) {
  return {
    x: level3Tile(tileX) + 5,
    y: level3Tile(tileY) + 5,
  };
}

function level3GuardSpawn(tileX, tileY) {
  return {
    x: level3Tile(tileX) + 2,
    y: level3Tile(tileY) + 2,
  };
}

function level3Waypoint(tileX, tileY) {
  return {
    x: level3Tile(tileX) + LEVEL3_TILE * 0.5,
    y: level3Tile(tileY) + LEVEL3_TILE * 0.5,
  };
}

// Door A: Atrium -> Operations entry choke (requires BLUE).
const LEVEL3_DOOR_A = createLockedDoor({
  doorId: "door_a",
  objectiveLabel: "Open Door A (BLUE)",
  x: level3Tile(34),
  y: level3Tile(12),
  w: level3Tile(1),
  h: level3Tile(3),
  trigger: {
    x: level3Tile(33),
    y: level3Tile(12),
    w: level3Tile(2),
    h: level3Tile(3),
  },
  requiredFlag: "hasKeycard",
  requirementLabel: "BLUE keycard",
  lockedPrompt: "E: Open Door A (Need BLUE)",
  lockedMessage: "Door A locked. Need BLUE keycard.",
  openPrompt: "E: Open Door A",
  motionType: "split",
  slideAxis: "y",
  openDuration: 0.34,
});

// Door B: Vault antechamber gate (requires RED).
const LEVEL3_DOOR_B = createLockedDoor({
  doorId: "door_b",
  objectiveLabel: "Open Door B (RED)",
  x: level3Tile(50),
  y: level3Tile(14),
  w: level3Tile(1),
  h: level3Tile(3),
  trigger: {
    x: level3Tile(49),
    y: level3Tile(14),
    w: level3Tile(2),
    h: level3Tile(3),
  },
  requiredFlag: "hasRedPass",
  requirementLabel: "RED pass",
  lockedPrompt: "E: Open Door B (Need RED)",
  lockedMessage: "Door B locked. Need RED pass.",
  openPrompt: "E: Open Door B",
  motionType: "split",
  slideAxis: "y",
  openDuration: 0.34,
});

// Door C: Service shutter to extraction lane (requires terminal complete).
const LEVEL3_DOOR_C = createLockedDoor({
  doorId: "door_c",
  objectiveLabel: "Open Exit Shutter",
  x: level3Tile(46),
  y: level3Tile(24),
  w: level3Tile(3),
  h: level3Tile(1),
  trigger: {
    x: level3Tile(46),
    y: level3Tile(22),
    w: level3Tile(3),
    h: level3Tile(2),
  },
  requiredFlag: "terminalComplete",
  requirementLabel: "completed download",
  lockedPrompt: "Exit shutter locked (Finish download)",
  lockedMessage: "Exit shutter locked until download completes.",
  openPrompt: "E: Open Exit Shutter",
  motionType: "split",
  slideAxis: "x",
  openDuration: 0.34,
});

const LEVEL3_BLUE_CARD = createKeycard({
  ...level3RectTiles(8, 7, 8, 7),
  pickupId: "blue_card",
  grantsFlags: ["hasKeycard", "hasBlueCard"],
  prompt: "E: Pick up BLUE keycard",
  acquiredMessage: "BLUE keycard acquired.",
});

const LEVEL3_RED_PASS = createKeycard({
  ...level3RectTiles(52, 7, 52, 7),
  pickupId: "red_pass",
  grantsFlag: "hasRedPass",
  prompt: "E: Pick up RED vault pass",
  acquiredMessage: "RED vault pass acquired.",
});

const LEVEL3_GUARDS = [
  createGuard({
    name: "Atrium Sweeper",
    ...level3GuardSpawn(32, 19),
    patrolSpeed: 96,
    chaseSpeed: 145,
    visionRange: 300,
    fovDeg: 74,
    waypoints: [
      level3Waypoint(25, 14),
      level3Waypoint(33, 14),
      level3Waypoint(33, 21),
      level3Waypoint(25, 21),
    ],
  }),
  createGuard({
    name: "Security Hall Guard",
    ...level3GuardSpawn(20, 13),
    patrolSpeed: 92,
    chaseSpeed: 140,
    visionRange: 288,
    fovDeg: 72,
    waypoints: [
      level3Waypoint(20, 13),
      level3Waypoint(19, 13),
      level3Waypoint(19, 11),
      level3Waypoint(12, 11),
      level3Waypoint(12, 8),
      level3Waypoint(17, 8),
      level3Waypoint(17, 10),
      level3Waypoint(19, 10),
      level3Waypoint(19, 12),
      level3Waypoint(20, 12),
    ],
  }),
  createGuard({
    name: "DoorA Sentinel",
    ...level3GuardSpawn(32, 13),
    patrolSpeed: 88,
    chaseSpeed: 136,
    visionRange: 280,
    fovDeg: 70,
    waypoints: [
      level3Waypoint(29, 13),
      level3Waypoint(33, 13),
      level3Waypoint(33, 14),
      level3Waypoint(29, 14),
    ],
  }),
  createGuard({
    name: "Operations Roamer",
    ...level3GuardSpawn(48, 9),
    patrolSpeed: 94,
    chaseSpeed: 142,
    visionRange: 286,
    fovDeg: 72,
    waypoints: [
      level3Waypoint(49, 12),
      level3Waypoint(49, 9),
      level3Waypoint(51, 9),
      level3Waypoint(51, 11),
      level3Waypoint(53, 11),
      level3Waypoint(53, 12),
      level3Waypoint(52, 12),
      level3Waypoint(52, 11),
      level3Waypoint(51, 11),
      level3Waypoint(51, 9),
      level3Waypoint(49, 9),
      level3Waypoint(49, 11),
    ],
  }),
  createGuard({
    name: "Vault Patrol",
    ...level3GuardSpawn(56, 15),
    patrolSpeed: 98,
    chaseSpeed: 148,
    visionRange: 300,
    fovDeg: 74,
    waypoints: [
      level3Waypoint(52, 17),
      level3Waypoint(57, 17),
      level3Waypoint(57, 15),
      level3Waypoint(60, 15),
      level3Waypoint(60, 9),
      level3Waypoint(60, 13),
      level3Waypoint(58, 13),
      level3Waypoint(58, 15),
      level3Waypoint(56, 15),
      level3Waypoint(56, 17),
    ],
  }),
  createGuard({
    name: "Exit Roamer",
    ...level3GuardSpawn(56, 30),
    patrolSpeed: 90,
    chaseSpeed: 138,
    visionRange: 280,
    fovDeg: 70,
    waypoints: [
      level3Waypoint(53, 30),
      level3Waypoint(61, 30),
      level3Waypoint(61, 33),
      level3Waypoint(55, 33),
      level3Waypoint(55, 31),
      level3Waypoint(53, 31),
    ],
  }),
];

function createLevel3() {
  return {
    width: LEVEL3_WIDTH,
    height: LEVEL3_HEIGHT,
    floorVariant: "ops",
    wallVariant: "reinforced",
    useFloorZones: true,
    enableFloorTransitions: false,
    enableWallDecals: false,

    floorZones: [
      // Concrete logistics zones.
      { id: "loading_dock", role: "spawn", variant: "concrete", x: level3Tile(2), y: level3Tile(24), w: level3Tile(17), h: level3Tile(11), priority: 96 },
      { id: "service_exit", role: "corridor", flow: "east", variant: "concrete", x: level3Tile(52), y: level3Tile(26), w: level3Tile(11), h: level3Tile(9), priority: 94 },

      // Maintenance ring (safer route).
      { id: "maintenance_west", role: "corridor", flow: "north", variant: "concrete", x: level3Tile(13), y: level3Tile(14), w: level3Tile(9), h: level3Tile(19), priority: 72 },
      { id: "maintenance_north", role: "corridor", flow: "east", variant: "concrete", x: level3Tile(19), y: level3Tile(9), w: level3Tile(36), h: level3Tile(3), priority: 70 },
      { id: "maintenance_east", role: "corridor", flow: "south", variant: "concrete", x: level3Tile(45), y: level3Tile(9), w: level3Tile(9), h: level3Tile(26), priority: 74 },

      // Main infiltration lanes.
      { id: "atrium", role: "corridor", flow: "east", variant: "ops", x: level3Tile(23), y: level3Tile(13), w: level3Tile(19), h: level3Tile(13), priority: 84 },
      { id: "security_bend", role: "corridor", flow: "east", variant: "ops", x: level3Tile(18), y: level3Tile(11), w: level3Tile(4), h: level3Tile(5), priority: 88 },
      { id: "service_approach", role: "corridor", flow: "east", variant: "ops", x: level3Tile(45), y: level3Tile(24), w: level3Tile(7), h: level3Tile(10), priority: 86 },

      // Secured rooms and checkpoints.
      { id: "security_office", role: "secure", variant: "secure", x: level3Tile(5), y: level3Tile(5), w: level3Tile(13), h: level3Tile(7), priority: 98 },
      { id: "door_a_checkpoint", role: "secure", variant: "secure", x: level3Tile(30), y: level3Tile(10), w: level3Tile(6), h: level3Tile(5), priority: 90 },
      { id: "ops_hall", role: "secure", variant: "secure", x: level3Tile(35), y: level3Tile(11), w: level3Tile(19), h: level3Tile(3), priority: 92 },
      { id: "operations_room", role: "secure", variant: "secure", x: level3Tile(45), y: level3Tile(5), w: level3Tile(11), h: level3Tile(5), priority: 97 },
      { id: "vault_corridor", role: "terminal", flow: "east", variant: "secure", x: level3Tile(51), y: level3Tile(15), w: level3Tile(11), h: level3Tile(3), priority: 98 },
      { id: "vault_room", role: "terminal", variant: "secure", x: level3Tile(55), y: level3Tile(5), w: level3Tile(7), h: level3Tile(9), priority: 99 },
    ],

    playerSpawn: level3Spawn(4, 32),

    pickups: [LEVEL3_BLUE_CARD, LEVEL3_RED_PASS],
    keycard: LEVEL3_BLUE_CARD,

    lockedDoors: [LEVEL3_DOOR_A, LEVEL3_DOOR_B, LEVEL3_DOOR_C],
    lockedDoor: LEVEL3_DOOR_A,

    terminal: createTerminal(level3RectTiles(60, 9, 61, 10)),
    exitZone: createExitZone(level3RectTiles(60, 32, 61, 33)),

    objectiveSteps: [
      { type: "flag", flag: "hasKeycard", label: "Acquire BLUE keycard", icon: "keycard" },
      { type: "door", doorId: "door_a", label: "Breach Door A (Operations)" },
      { type: "flag", flag: "hasRedPass", label: "Acquire RED vault pass", icon: "keycard" },
      { type: "door", doorId: "door_b", label: "Breach Door B (Vault)" },
      { type: "terminal", label: "Download vault data", icon: "objective" },
      { type: "door", doorId: "door_c", label: "Open exit shutter" },
      { type: "extract", label: "Reach extraction", icon: "objective" },
    ],

    hideSpots: [
      // Loading dock locker near bay wall (reset pocket).
      createHideSpot(level3RectTiles(5, 27, 5, 27)),
      // Maintenance closet near security wing.
      createHideSpot(level3RectTiles(14, 21, 14, 21)),
      // Security office locker by the south wall.
      createHideSpot(level3RectTiles(6, 11, 6, 11)),
      // Door A checkpoint booth shadow.
      createHideSpot(level3RectTiles(29, 13, 29, 13)),
      // Operations wing side locker near egress.
      createHideSpot(level3RectTiles(45, 9, 45, 9)),
      // Vault back-corner hide behind rack lane.
      createHideSpot(level3RectTiles(55, 12, 55, 12)),
      // Final extraction approach hide at service alcove.
      createHideSpot(level3RectTiles(53, 33, 53, 33)),
    ],

    walls: [
      ...createOuterWalls(LEVEL3_WIDTH, LEVEL3_HEIGHT, 24),

      // Inner perimeter keeps traversal inside the designed facility footprint.
      ...createWalls([
        level3RectTiles(0, 0, 63, 0),
        level3RectTiles(0, 35, 63, 35),
        level3RectTiles(0, 0, 0, 35),
        level3RectTiles(63, 0, 63, 35),
      ], { variant: "reinforced" }),

      // A) Loading Dock shell + connector corridor to the maintenance ring.
      ...createWalls([
        level3RectTiles(2, 24, 18, 24),
        level3RectTiles(2, 34, 18, 34),
        level3RectTiles(2, 24, 2, 34),
        level3RectTiles(18, 24, 18, 29),
        level3RectTiles(18, 33, 18, 34),
        level3RectTiles(18, 33, 22, 33),
      ], { variant: "reinforced" }),

      // A) Loading dock crate cover.
      ...createWalls([
        level3RectTiles(6, 30, 8, 31),
        level3RectTiles(10, 28, 12, 29),
        level3RectTiles(14, 31, 15, 33),
        level3RectTiles(8, 33, 9, 34),
      ], { variant: "reinforced" }),

      // B) Maintenance ring lanes (longer, safer path with bends and trap lines).
      ...createWalls([
        level3RectTiles(12, 14, 12, 32),
        level3RectTiles(22, 8, 22, 11),
        level3RectTiles(22, 16, 22, 29),
        level3RectTiles(19, 8, 33, 8),
        level3RectTiles(23, 11, 33, 11),
        level3RectTiles(44, 8, 44, 9),
        level3RectTiles(44, 15, 44, 22),
        level3RectTiles(44, 24, 44, 34),
        level3RectTiles(54, 8, 54, 13),
        level3RectTiles(54, 19, 54, 22),
        level3RectTiles(54, 23, 54, 27),
        level3RectTiles(54, 33, 54, 34),
      ], { variant: "reinforced" }),

      // B) Maintenance closets (risk/reward dead ends).
      ...createWalls([
        // Closet 1: near security wing (with hide spot).
        level3RectTiles(12, 18, 16, 18),
        level3RectTiles(12, 22, 16, 22),
        level3RectTiles(12, 18, 12, 22),
        level3RectTiles(16, 18, 16, 19),
        level3RectTiles(16, 21, 16, 22),

        // Closet 2: near operations wing (bait, no hide).
        level3RectTiles(44, 18, 48, 18),
        level3RectTiles(44, 22, 48, 22),
        level3RectTiles(48, 18, 48, 22),
        level3RectTiles(44, 18, 44, 19),
        level3RectTiles(44, 21, 44, 22),

        // Closet 3: near exit wing.
        level3RectTiles(50, 28, 54, 28),
        level3RectTiles(50, 32, 54, 32),
        level3RectTiles(54, 28, 54, 29),
        level3RectTiles(54, 32, 54, 32),
        level3RectTiles(50, 28, 50, 29),
        level3RectTiles(50, 31, 50, 32),
      ], { variant: "reinforced" }),

      // C) Central Atrium: fast but exposed route with cover islands.
      ...createWalls([
        level3RectTiles(22, 12, 33, 12),
        level3RectTiles(35, 12, 42, 12),
        level3RectTiles(22, 26, 42, 26),
        level3RectTiles(22, 12, 22, 13),
        level3RectTiles(22, 16, 22, 26),
        level3RectTiles(42, 12, 42, 12),
        level3RectTiles(42, 16, 42, 26),

        level3RectTiles(26, 15, 27, 16),
        level3RectTiles(31, 15, 32, 16),
        level3RectTiles(36, 15, 37, 16),
        level3RectTiles(26, 22, 27, 23),
        level3RectTiles(31, 22, 32, 23),
        level3RectTiles(36, 22, 37, 23),

        level3RectTiles(22, 18, 24, 19),
        level3RectTiles(40, 18, 42, 19),
      ], { variant: "default" }),

      // D) Security Office: BLUE card objective with bent approach and safe pocket.
      ...createWalls([
        level3RectTiles(4, 4, 18, 4),
        level3RectTiles(4, 12, 18, 12),
        level3RectTiles(4, 4, 4, 12),
        level3RectTiles(18, 4, 18, 9),
        level3RectTiles(18, 12, 18, 12),

        level3RectTiles(20, 11, 22, 11),
        level3RectTiles(18, 15, 21, 15),
        level3RectTiles(21, 12, 21, 12),

        level3RectTiles(7, 9, 10, 9),
        level3RectTiles(12, 6, 15, 6),
        level3RectTiles(5, 5, 6, 6),
      ], { variant: "reinforced" }),

      // E) Door A checkpoint and operations wing where RED pass sits deep inside.
      ...createWalls([
        level3RectTiles(30, 11, 33, 12),

        level3RectTiles(35, 10, 47, 10),
        level3RectTiles(52, 10, 54, 10),
        level3RectTiles(35, 14, 48, 14),
        level3RectTiles(52, 14, 54, 14),

        level3RectTiles(44, 4, 56, 4),
        level3RectTiles(44, 4, 44, 10),
        level3RectTiles(56, 4, 56, 10),
        level3RectTiles(44, 10, 47, 10),
        level3RectTiles(52, 10, 56, 10),

        level3RectTiles(46, 11, 47, 12),
        level3RectTiles(50, 12, 51, 13),

        level3RectTiles(48, 8, 51, 8),
        level3RectTiles(54, 5, 55, 6),
      ], { variant: "default" }),

      // F) Door B channel + vault corridor + server vault terminal room.
      ...createWalls([
        level3RectTiles(50, 10, 50, 13),
        level3RectTiles(50, 17, 50, 24),

        level3RectTiles(50, 14, 57, 14),
        level3RectTiles(61, 14, 62, 14),
        level3RectTiles(50, 18, 62, 18),
        level3RectTiles(62, 14, 62, 18),

        level3RectTiles(54, 15, 55, 16),
        level3RectTiles(58, 16, 59, 17),

        level3RectTiles(54, 4, 62, 4),
        level3RectTiles(54, 4, 54, 14),
        level3RectTiles(62, 4, 62, 14),
        level3RectTiles(54, 14, 57, 14),
        level3RectTiles(61, 14, 62, 14),

        level3RectTiles(56, 6, 57, 7),
        level3RectTiles(58, 11, 59, 12),
      ], { variant: "bulkhead" }),

      // Global phase gates: Door A divider and Door C shutter lane.
      ...createWalls([
        level3RectTiles(34, 2, 34, 11),
        level3RectTiles(34, 15, 34, 34),
        level3RectTiles(35, 24, 45, 24),
        level3RectTiles(49, 24, 62, 24),
      ], { variant: "bulkhead" }),

      // G) Service Exit wing and final cover before extraction.
      ...createWalls([
        level3RectTiles(52, 26, 62, 26),
        level3RectTiles(52, 34, 62, 34),
        level3RectTiles(52, 26, 52, 29),
        level3RectTiles(52, 32, 52, 34),
        level3RectTiles(62, 26, 62, 34),

        level3RectTiles(54, 25, 56, 25),
        level3RectTiles(58, 28, 59, 29),
      ], { variant: "default" }),

      // Doors are solid walls until unlocked.
      LEVEL3_DOOR_A,
      LEVEL3_DOOR_B,
      LEVEL3_DOOR_C,
    ],

    guards: LEVEL3_GUARDS,
    guard: LEVEL3_GUARDS[0],

    // Designated rock bait spots:
    // A(40,14) for Guard1, B(30,10) for Guard3, C(52,18) for Guard5.
  };
}

const LEVEL_3 = createLevel3();
