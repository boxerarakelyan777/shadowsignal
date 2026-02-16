// Prototype Level src/levels/prototypeLevel.js
const PROTOTYPE_LOCKED_DOOR = createLockedDoor({
  x: 1300,
  y: 380,
  w: 30,
  h: 160,
  trigger: { x: 1240, y: 380, w: 90, h: 160 },
});

const PROTOTYPE_GUARD = createGuard({
  x: 2000,
  y: 440,
  waypoints: [
    { x: 1750, y: 440 },
    { x: 2600, y: 440 },
  ],
});

const PROTOTYPE_LEVEL = {
  width: 3000,
  height: 900,
  floorVariant: "default",

  playerSpawn: { x: 120, y: 420 },

  exitZone: createExitZone({ x: 2850, y: 440, w: 100, h: 80 }),

  keycard: createKeycard({ x: 1100, y: 220 }),

  terminal: createTerminal({ x: 2400, y: 360 }),

  lockedDoor: PROTOTYPE_LOCKED_DOOR,

  hideSpots: [
    createHideSpot({ x: 2593, y: 553, w: 64, h: 64 }),
  ],

  walls: [
    ...createOuterWalls(3000, 900, 20),

    ...createWalls([
      // Spawn room
      { x: 20, y: 180, w: 600, h: 20 },
      { x: 20, y: 700, w: 600, h: 20 },
      { x: 20, y: 180, w: 20, h: 540 },
      { x: 620, y: 180, w: 20, h: 200 },
      { x: 620, y: 540, w: 20, h: 160 },

      // Corridor walls (to door)
      { x: 640, y: 360, w: 360, h: 20 },
      { x: 1080, y: 360, w: 220, h: 20 },
      { x: 640, y: 540, w: 660, h: 20 },

      // Corridor walls (after door to objective room)
      { x: 1330, y: 360, w: 70, h: 20 },
      { x: 1330, y: 540, w: 70, h: 20 },
      // Door frame caps (prevent top/bottom crevice clipping)
      { x: 1300, y: 360, w: 30, h: 20 },
      { x: 1300, y: 540, w: 30, h: 20 },

      // Key room
      { x: 1000, y: 120, w: 300, h: 20 },
      { x: 1000, y: 120, w: 20, h: 240 },
      { x: 1280, y: 120, w: 20, h: 240 },

      // Key room interior corner
      { x: 1180, y: 200, w: 40, h: 40 },

      // Objective room boundaries
      { x: 1400, y: 240, w: 1580, h: 20 },
      { x: 1400, y: 660, w: 1580, h: 20 },
      { x: 1400, y: 240, w: 20, h: 140 },
      { x: 1400, y: 520, w: 20, h: 140 },
    ]),

    // Locked door blocks the corridor until unlocked
    PROTOTYPE_LOCKED_DOOR,
  ],

  guards: [PROTOTYPE_GUARD],
  guard: PROTOTYPE_GUARD,
};
