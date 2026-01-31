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
  const hasKeycard = !!(state.hasKeycard || state.hasKey);

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

  if (level.lockedDoor) {
    const doorState = getDoorState(level.lockedDoor);
    if (doorState !== "OPEN") {
      const trigger = level.lockedDoor.trigger || level.lockedDoor;
      const locked = doorState === "LOCKED";
      const prompt = locked
        ? (hasKeycard ? "E: Open Door" : "E: Open Door (Locked)")
        : "E: Open Door";
      const actionId = locked && !hasKeycard ? "door-locked" : "unlock-door";
      addCandidate(trigger, {
        actionId,
        type: "press",
        prompt,
        priority: INTERACTION_PRIORITIES.door,
        target: level.lockedDoor,
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

  if (level.keycard) {
    addCandidate(level.keycard, {
      actionId: "pickup-keycard",
      type: "press",
      prompt: "E: Pick up Keycard",
      priority: INTERACTION_PRIORITIES.keycard,
      target: level.keycard,
    });
  }

  if (level.exitZone) {
    const objectiveRequired = !!level.terminal;
    const locked = objectiveRequired && !state.terminalComplete;
    const prompt = locked
      ? "Exit locked: Finish objective first"
      : "E: Exit";
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

  if (actionId === "pickup-keycard") {
    state.hasKeycard = true;
    state.hasKey = true;
    level.keycard = null;
    state.message = "Keycard acquired.";
    state.messageTimer = MESSAGE_DURATION;
    return;
  }

  if (actionId === "door-locked") {
    state.message = "Locked. Need keycard.";
    state.messageTimer = MESSAGE_DURATION;
    return;
  }

  if (actionId === "unlock-door") {
    const hasKeycard = !!(state.hasKeycard || state.hasKey);
    if (level.lockedDoor?.locked !== false && hasKeycard) {
      level.lockedDoor.locked = false;
      level.lockedDoor.state = "OPEN";
      if (Array.isArray(level.walls)) {
        level.walls = level.walls.filter(w => w !== level.lockedDoor);
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
      state.status = "won";
    }
  }
}
