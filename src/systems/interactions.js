// src/systems/interactions.js
const INTERACTION_PRIORITIES = {
  door: 5,
  hide: 4,
  terminal: 3,
  keycard: 2,
  exit: 1,
};

const HOLD_DURATION = 2.0;
const MESSAGE_DURATION = 1.5;
const DIST_EPSILON = 0.01;

function getInteraction(player, level, state) {
  if (!player || !level || !state) return null;
  if (state.status !== "playing") return null;
  if (state.playerState === "CAPTURED") return null;

  const candidates = [];
  const playerCenter = centerOf(player);
  const isHidden = player.hidden || state.playerState === "HIDDEN";
  const doors = getLevelDoors(level);
  const pickups = getLevelPickups(level);

  const addCandidate = (trigger, data) => {
    if (!trigger) return;
    // Chosen interaction rule: overlap with trigger zone.
    if (!rectsIntersect(player, trigger)) return;
    candidates.push({ ...data, trigger });
  };

  if (isHidden) {
    if (state.activeHideSpot) {
      addCandidate(state.activeHideSpot, {
        actionId: "toggle-hide",
        type: "press",
        prompt: "E: Exit Hiding",
        priority: INTERACTION_PRIORITIES.hide,
        target: state.activeHideSpot,
      });
    } else if (level.hideSpots && level.hideSpots.length) {
      for (const spot of level.hideSpots) {
        addCandidate(spot, {
          actionId: "toggle-hide",
          type: "press",
          prompt: "E: Exit Hiding",
          priority: INTERACTION_PRIORITIES.hide,
          target: spot,
        });
      }
    }
    return selectBestInteraction(candidates, playerCenter);
  }

  for (const door of doors) {
    const doorState = getDoorState(door);
    if (doorState !== "OPEN") {
      const trigger = door.trigger || door;
      const requirementMet = isDoorRequirementMet(door, state);
      const prompt = requirementMet
        ? (door.openPrompt || "E: Open Door")
        : (door.lockedPrompt || `E: Open Door (${getDoorRequirementLabel(door)})`);
      const actionId = requirementMet ? "unlock-door" : "door-locked";
      addCandidate(trigger, {
        actionId,
        type: "press",
        prompt,
        priority: INTERACTION_PRIORITIES.door,
        target: door,
      });
    }
  }

  if (level.hideSpots && level.hideSpots.length) {
    for (const spot of level.hideSpots) {
      if (spot.occupied) continue;
      addCandidate(spot, {
        actionId: "toggle-hide",
        type: "press",
        prompt: "E: Hide",
        priority: INTERACTION_PRIORITIES.hide,
        target: spot,
      });
    }
  }

  if (level.terminal) {
    if (state.terminalComplete || state.terminalState === "COMPLETE") {
      addCandidate(level.terminal, {
        actionId: null,
        type: "press",
        prompt: "Terminal complete",
        priority: INTERACTION_PRIORITIES.terminal,
        target: level.terminal,
      });
    } else {
      const progress = Math.round((state.terminalProgress || 0) * 100);
      const prompt = state.terminalState === "DOWNLOADING"
        ? `Downloading... ${progress}%`
        : "Hold E: Download Data";
      addCandidate(level.terminal, {
        actionId: "use-terminal",
        type: "hold",
        prompt,
        priority: INTERACTION_PRIORITIES.terminal,
        holdDuration: HOLD_DURATION,
        target: level.terminal,
      });
    }
  }

  for (const pickup of pickups) {
    addCandidate(pickup, {
      actionId: "pickup-item",
      type: "press",
      prompt: pickup.prompt || "E: Pick up Keycard",
      priority: INTERACTION_PRIORITIES.keycard,
      target: pickup,
    });
  }

  if (level.exitZone) {
    const objectiveRequired = !!level.terminal;
    const locked = objectiveRequired && !state.terminalComplete;
    const prompt = locked
      ? "Exit locked: Finish objective first"
      : "E: Extract";
    addCandidate(level.exitZone, {
      actionId: locked ? "exit-locked" : "exit",
      type: "press",
      prompt,
      priority: INTERACTION_PRIORITIES.exit,
      target: level.exitZone,
    });
  }

  return selectBestInteraction(candidates, playerCenter);
}

function getDoorState(door) {
  if (!door) return "LOCKED";
  if (door.state) return door.state;
  if (door.locked === false) return "OPEN";
  return "LOCKED";
}

function selectBestInteraction(candidates, playerCenter) {
  let best = null;
  for (const candidate of candidates) {
    const cCenter = centerOf(candidate.trigger);
    const dx = cCenter.x - playerCenter.x;
    const dy = cCenter.y - playerCenter.y;
    const distSq = dx * dx + dy * dy;
    if (
      !best ||
      distSq < best.distSq - DIST_EPSILON ||
      (Math.abs(distSq - best.distSq) <= DIST_EPSILON &&
        candidate.priority > best.priority)
    ) {
      best = { ...candidate, distSq };
    }
  }
  return best;
}

function performInteraction(interaction, player, level, state) {
  const actionId = typeof interaction === "string" ? interaction : interaction?.actionId;
  if (!actionId || !player || !state) return;

  if (actionId === "toggle-hide") {
    if (player.hidden || state.playerState === "HIDDEN") {
      const spot = state.activeHideSpot || interaction?.target;
      if (spot) spot.occupied = false;
      state.activeHideSpot = null;
      player.hidden = false;
      state.playerState = "NORMAL";
    } else {
      const spot = interaction?.target;
      if (spot) {
        spot.occupied = true;
        state.activeHideSpot = spot;
        player.hidden = true;
        state.playerState = "HIDDEN";
      }
    }
    return;
  }

  if (actionId === "pickup-item" || actionId === "pickup-keycard") {
    const pickup = interaction?.target || level?.keycard || null;
    const flags = resolvePickupFlags(pickup);
    for (const flag of flags) {
      if (!flag) continue;
      state[flag] = true;
    }

    // Keep legacy keycard flow compatible.
    if (flags.includes("hasBlueCard")) state.hasKeycard = true;
    if (flags.includes("hasKeycard")) state.hasBlueCard = true;

    if (Array.isArray(level?.pickups)) {
      level.pickups = level.pickups.filter(item => !rectMatches(item, pickup));
    }
    if (level?.keycard && rectMatches(level.keycard, pickup)) {
      level.keycard = null;
    }
    state.message = pickup?.acquiredMessage || "Keycard acquired.";
    state.messageTimer = MESSAGE_DURATION;
    return;
  }

  if (actionId === "door-locked") {
    const door = interaction?.target || null;
    state.message = door?.lockedMessage || `Locked. Need ${getDoorRequirementLabel(door)}.`;
    state.messageTimer = MESSAGE_DURATION;
    return;
  }

  if (actionId === "unlock-door") {
    const door = interaction?.target || level?.lockedDoor || null;
    if (door?.locked !== false && isDoorRequirementMet(door, state)) {
      door.locked = false;
      door.state = "OPEN";
      door.openProgress = 0;
      if (Array.isArray(level.walls)) {
        level.walls = level.walls.filter(w => !rectMatches(w, door));
      }
    }
    return;
  }

  if (actionId === "use-terminal") {
    state.terminalComplete = true;
    state.objectiveComplete = true;
    state.terminalState = "COMPLETE";
    state.terminalProgress = 1;
    state.message = "Data downloaded.";
    state.messageTimer = MESSAGE_DURATION;
    return;
  }

  if (actionId === "exit-locked") {
    state.message = "Finish the objective first.";
    state.messageTimer = MESSAGE_DURATION;
    return;
  }

  if (actionId === "exit") {
    const objectiveRequired = !!level?.terminal;
    if (state.status === "playing" && (!objectiveRequired || state.terminalComplete)) {
      state.pendingExtraction = true;
    }
  }
}

function rectMatches(a, b) {
  return !!a && !!b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

function getLevelDoors(level) {
  if (!level) return [];
  const doors = [];
  if (level.lockedDoor) doors.push(level.lockedDoor);
  if (Array.isArray(level.lockedDoors)) {
    for (const door of level.lockedDoors) {
      if (!door) continue;
      if (!doors.some(existing => rectMatches(existing, door))) doors.push(door);
    }
  }
  return doors;
}

function getLevelPickups(level) {
  if (!level) return [];
  const pickups = [];
  if (level.keycard) pickups.push(level.keycard);
  if (Array.isArray(level.pickups)) {
    for (const pickup of level.pickups) {
      if (!pickup) continue;
      if (!pickups.some(existing => rectMatches(existing, pickup))) pickups.push(pickup);
    }
  }
  return pickups;
}

function resolvePickupFlags(pickup) {
  if (!pickup) return ["hasKeycard", "hasBlueCard"];
  if (Array.isArray(pickup.grantsFlags) && pickup.grantsFlags.length) {
    return pickup.grantsFlags.map(flag => (flag || "").toString()).filter(Boolean);
  }
  const single = (pickup.grantsFlag || "").toString();
  if (single) return [single];
  return ["hasKeycard", "hasBlueCard"];
}

function isDoorRequirementMet(door, state) {
  if (!door || !state) return false;
  const requiredFlag = (door.requiredFlag || "").toString();
  if (!requiredFlag) return !!state.hasKeycard;
  return !!state[requiredFlag];
}

function getDoorRequirementLabel(door) {
  if (!door) return "keycard";
  if (door.requirementLabel) return door.requirementLabel;
  const requiredFlag = (door.requiredFlag || "").toString();
  if (requiredFlag === "terminalComplete") return "completed objective";
  if (requiredFlag === "hasRedPass") return "RED pass";
  return "keycard";
}
