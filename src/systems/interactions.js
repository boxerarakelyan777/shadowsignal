// src/systems/interactions.js
function getInteraction(player, level, state) {
  if (!player || !level || !state) return null;
  if (state.status !== "playing") return null;

  if (level.exitZone && rectsIntersect(player, level.exitZone)) {
    return { text: "Press E to Exit", actionId: "exit" };
  }

  if (level.hideSpots && level.hideSpots.length) {
    const spot = level.hideSpots.find(h => rectsIntersect(player, h));
    if (spot) {
      return {
        text: player.hidden ? "Press E to Exit Hide" : "Press E to Hide",
        actionId: "toggle-hide",
      };
    }
  }

  return null;
}

function performInteraction(interaction, player, level, state) {
  const actionId = typeof interaction === "string" ? interaction : interaction?.actionId;
  if (!actionId || !player || !state) return;

  if (actionId === "toggle-hide") {
    player.hidden = !player.hidden;
    return;
  }

  if (actionId === "exit") {
    if (state.status === "playing") state.status = "won";
  }
}
