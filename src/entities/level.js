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
    //const d = this.state.debug || {};
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText(
      `WASD move | E hide on blue | Status: ${this.state.status}`, //`Camera: (${Math.floor(this.game.camera.x)}, ${Math.floor(this.game.camera.y)})`,
      20,
      24
    );

    if (this.state.status === "won") {
      ctx.font = "48px Arial";
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.fillText("YOU WIN", 380, 380);
    } else if (this.state.status === "lost") {
      ctx.font = "48px Arial";
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.fillText("CAUGHT", 390, 380);
    }

    ctx.restore();
  }
}
