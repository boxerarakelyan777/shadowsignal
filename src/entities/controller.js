// src/entities/controller.js
class GameController {
  constructor(game, state, level, player) {
    this.game = game;
    this.state = state;
    this.level = level;
    this.player = player;
    this.removeFromWorld = false;
  }

  update() {
    const input = this.state.input;
    if (!input) return;

    if (input.justPressed("r")) {
      window.location.reload();
      return;
    }

    if (this.state.status === "playing") {
      const interaction = getInteraction(this.player, this.level, this.state);
      if (interaction && input.justPressed("e")) {
        performInteraction(interaction, this.player, this.level, this.state);
      }
    }

    input.update();
  }

  draw() {
    // no-op
  }
}
