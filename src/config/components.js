// src/config/components.js
// Centralized component registry + prefab builders.
// Change defaults/styles/sprite paths here to update globally.

const COMPONENT_LIBRARY = Object.freeze({
  defaults: Object.freeze({
    level: Object.freeze({
      floorVariant: "default",
    }),
    player: Object.freeze({
      componentType: "player",
      w: 22,
      h: 22,
      drawW: 48,
      drawH: 48,
      speed: 220,
    }),
    // Guard geometry/render defaults only.
    // Guard behavior tuning lives in TUNING.guard.
    guard: Object.freeze({
      componentType: "guard",
      w: 28,
      h: 28,
      drawW: 48,
      drawH: 48,
    }),
    wall: Object.freeze({
      componentType: "wall",
      variant: "default",
    }),
    hideSpot: Object.freeze({
      componentType: "hideSpot",
      variant: "default",
      occupied: false,
    }),
    keycard: Object.freeze({
      componentType: "keycard",
      variant: "default",
      w: 26,
      h: 26,
    }),
    terminal: Object.freeze({
      componentType: "terminal",
      variant: "default",
      w: 40,
      h: 30,
    }),
    lockedDoor: Object.freeze({
      componentType: "lockedDoor",
      variant: "locked",
      locked: true,
      state: "LOCKED",
    }),
    exitZone: Object.freeze({
      componentType: "exitZone",
      variant: "default",
    }),
  }),

  visuals: Object.freeze({
    floor: Object.freeze({
      default: Object.freeze({
        gradientStops: Object.freeze(["#111b27", "#0d1620", "#0b121b"]),
        gridSize: 64,
        gridColor: "rgba(168, 205, 244, 0.04)",
      }),
    }),

    wall: Object.freeze({
      default: Object.freeze({
        gradientStops: Object.freeze(["#3f4a57", "#28323f"]),
        gradientAxis: "y",
        borderColor: "rgba(190, 225, 255, 0.12)",
        borderWidth: 1,
      }),
    }),

    hideSpot: Object.freeze({
      default: Object.freeze({
        gradientStops: Object.freeze(["rgba(57, 97, 167, 0.88)", "rgba(25, 54, 123, 0.78)"]),
        gradientAxis: "diag",
        borderColor: "rgba(188, 232, 255, 0.4)",
        borderWidth: 1.5,
      }),
      occupied: Object.freeze({
        gradientStops: Object.freeze(["rgba(58, 149, 219, 0.88)", "rgba(36, 82, 163, 0.75)"]),
        gradientAxis: "diag",
        borderColor: "rgba(188, 232, 255, 0.4)",
        borderWidth: 1.5,
      }),
    }),

    terminal: Object.freeze({
      default: Object.freeze({
        gradientStops: Object.freeze(["#ffd182", "#bd7a2d"]),
        gradientAxis: "diag",
        borderColor: "rgba(255,255,255,0.4)",
        borderWidth: 1.5,
      }),
      complete: Object.freeze({
        gradientStops: Object.freeze(["#7ff3bf", "#2f8e62"]),
        gradientAxis: "diag",
        borderColor: "rgba(255,255,255,0.4)",
        borderWidth: 1.5,
      }),
    }),

    keycard: Object.freeze({
      default: Object.freeze({
        fill: "rgba(255, 220, 82, 0.92)",
        borderColor: "rgba(255, 247, 209, 0.92)",
        borderWidth: 1.25,
      }),
    }),

    lockedDoor: Object.freeze({
      locked: Object.freeze({
        gradientStops: Object.freeze(["#b36a3a", "#7e3f1f"]),
        gradientAxis: "y",
        borderColor: "rgba(255, 219, 179, 0.45)",
        borderWidth: 2,
      }),
      open: Object.freeze({
        gradientStops: Object.freeze(["rgba(134, 222, 164, 0.9)", "rgba(55, 153, 96, 0.62)"]),
        gradientAxis: "y",
        borderColor: "rgba(176, 255, 211, 0.5)",
        borderWidth: 2,
      }),
    }),

    exitZone: Object.freeze({
      default: Object.freeze({
        gradientStops: Object.freeze(["rgba(90, 224, 244, 0.9)", "rgba(22, 125, 163, 0.85)"]),
        gradientAxis: "diag",
        borderColor: "rgba(191, 243, 255, 0.75)",
        borderWidth: 2,
      }),
    }),
  }),
});

const UI_ASSETS = Object.freeze({
  splashBackground: "./assets/ui/splash-background.jpg",
  menuBackground: "./assets/ui/menu-background.jpg",
});

function getComponentDefaults(typeId) {
  const defaults = COMPONENT_LIBRARY.defaults[typeId];
  return defaults ? { ...defaults } : {};
}

function getComponentVisual(typeId, variant = "default") {
  const group = COMPONENT_LIBRARY.visuals[typeId];
  if (!group) return null;
  if (variant && group[variant]) return group[variant];
  return group.default || null;
}

function listComponentSpritePaths() {
  const unique = new Set();
  const visuals = COMPONENT_LIBRARY.visuals;

  for (const typeId of Object.keys(visuals)) {
    const variants = visuals[typeId];
    for (const variantId of Object.keys(variants)) {
      const visual = variants[variantId];
      if (visual && visual.spritePath) unique.add(visual.spritePath);
    }
  }

  return Array.from(unique);
}

function createComponent(typeId, overrides = {}) {
  const base = getComponentDefaults(typeId);
  const component = { ...base, ...(overrides || {}) };
  if (!component.componentType) component.componentType = typeId;
  return component;
}

function createWall(overrides = {}) {
  return createComponent("wall", overrides);
}

function createWalls(rects = [], sharedOverrides = {}) {
  return rects.map(rect => createWall({ ...sharedOverrides, ...rect }));
}

function createHideSpot(overrides = {}) {
  return createComponent("hideSpot", overrides);
}

function createKeycard(overrides = {}) {
  return createComponent("keycard", overrides);
}

function createTerminal(overrides = {}) {
  return createComponent("terminal", overrides);
}

function createLockedDoor(overrides = {}) {
  const door = createComponent("lockedDoor", overrides);
  if (!door.state) {
    door.state = door.locked === false ? "OPEN" : "LOCKED";
  }
  return door;
}

function createExitZone(overrides = {}) {
  return createComponent("exitZone", overrides);
}

function createGuard(overrides = {}) {
  const guard = createComponent("guard", overrides);
  if (Array.isArray(guard.waypoints)) {
    guard.waypoints = guard.waypoints.map(p => ({ x: Number(p.x), y: Number(p.y) }));
  }
  return guard;
}

function createOuterWalls(width, height, thickness = 20) {
  return createWalls([
    { x: 0, y: 0, w: width, h: thickness },
    { x: 0, y: height - thickness, w: width, h: thickness },
    { x: 0, y: 0, w: thickness, h: height },
    { x: width - thickness, y: 0, w: thickness, h: height },
  ]);
}

function normalizeLevelComponents(level) {
  if (!level || typeof level !== "object") return level;

  if (!level.floorVariant) {
    level.floorVariant = getComponentDefaults("level").floorVariant;
  }

  if (Array.isArray(level.walls)) {
    level.walls = level.walls.map(wall => {
      if (!wall) return wall;
      if (wall.componentType === "lockedDoor") return createLockedDoor(wall);
      return createWall(wall);
    });
  }

  if (Array.isArray(level.hideSpots)) {
    level.hideSpots = level.hideSpots.map(spot => createHideSpot(spot));
  }

  if (level.keycard) level.keycard = createKeycard(level.keycard);
  if (level.terminal) level.terminal = createTerminal(level.terminal);
  if (level.lockedDoor) level.lockedDoor = createLockedDoor(level.lockedDoor);
  if (level.exitZone) level.exitZone = createExitZone(level.exitZone);

  if (Array.isArray(level.guards)) {
    level.guards = level.guards.map(guard => createGuard(guard));
  } else if (level.guard) {
    level.guards = [createGuard(level.guard)];
  }

  if (!level.guard && Array.isArray(level.guards) && level.guards.length) {
    level.guard = level.guards[0];
  }

  return level;
}
