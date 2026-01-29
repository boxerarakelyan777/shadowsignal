// src/entities/level.js
class LevelRenderer {
  constructor(game, level, state) {
    this.game = game;
    this.level = level;
    this.state = state;
    this.removeFromWorld = false;
  }

  update() {
    // nothing
  }

  draw(ctx, game) {
    const cam = game.camera;

    // Draw walls
    ctx.fillStyle = "rgba(60,60,60,1)";
    for (const w of this.level.walls) {
      ctx.fillRect(
        w.x, 
        w.y, 
        w.w, 
        w.h
      );
    }

    // Hide spots
    ctx.fillStyle = "rgba(20,20,120,0.9)";
    for (const h of this.level.hideSpots) {
      ctx.fillRect(
        h.x, 
        h.y, 
        h.w, 
        h.h
      );
    }

    // Exit
    ctx.fillStyle = "rgba(0,120,120,0.9)";
    const e = this.level.exitZone;
    ctx.fillRect(
      e.x, 
      e.y, 
      e.w, 
      e.h
    );

    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // UI text
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText("WASD move | E interact", 20, 24);
    ctx.fillText(`Status: ${this.state.status}`, 20, 44);

    const player = game.entities.find(e => e.isPlayer);
    const interaction = player ? getInteraction(player, this.level, this.state) : null;
    if (interaction) {
      ctx.fillText(interaction.text, 20, 64);
    }

    if (this.state.status === "won" || this.state.status === "lost") {
      const message = this.state.status === "won" ? "YOU WIN" : "CAUGHT";
      const cw = game.surfaceWidth || ctx.canvas.width;
      const ch = game.surfaceHeight || ctx.canvas.height;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fillRect(0, ch * 0.4 - 70, cw, 140);

      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.font = "48px Arial";
      ctx.fillText(message, cw / 2, ch * 0.4);
      ctx.font = "20px Arial";
      ctx.fillText("Press R to restart", cw / 2, ch * 0.4 + 44);
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
    }

    ctx.restore();
  }
}
