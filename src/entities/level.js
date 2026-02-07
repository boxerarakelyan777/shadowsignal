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

    // Locked door
    if (this.level.lockedDoor) {
      const d = this.level.lockedDoor;
      ctx.fillStyle = d.locked ? "rgba(160,90,40,1)" : "rgba(90,160,90,0.6)";
      ctx.fillRect(d.x, d.y, d.w, d.h);
    }

    // Hide spots
    for (const h of this.level.hideSpots) {
      ctx.fillStyle = h.occupied ? "rgba(20,80,140,0.6)" : "rgba(20,20,120,0.9)";
      ctx.fillRect(
        h.x, 
        h.y, 
        h.w, 
        h.h
      );
    }

    // Terminal
    if (this.level.terminal) {
      ctx.fillStyle = this.state.objectiveComplete
        ? "rgba(40,160,120,0.9)"
        : "rgba(200,120,40,0.9)";
      ctx.fillRect(
        this.level.terminal.x,
        this.level.terminal.y,
        this.level.terminal.w,
        this.level.terminal.h
      );
    }

    // Keycard
    if (this.level.keycard) {
      ctx.fillStyle = "rgba(240,200,40,0.95)";
      ctx.fillRect(
        this.level.keycard.x,
        this.level.keycard.y,
        this.level.keycard.w,
        this.level.keycard.h
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

    // Noise (debug visual)
    if (this.state.noise) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "rgba(120,200,255,0.35)";
      ctx.beginPath();
      ctx.arc(
        this.state.noise.x,
        this.state.noise.y,
        this.state.noise.radius,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = "rgba(120,200,255,0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // UI text
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    const cw = game.surfaceWidth || ctx.canvas.width;
    const ch = game.surfaceHeight || ctx.canvas.height;

    if (this.state.status === "title") {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      ctx.fillRect(0, ch * 0.35 - 90, cw, 180);
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.font = "54px Arial";
      ctx.fillText("SHADOW SIGNAL", cw / 2, ch * 0.35);
      ctx.font = "20px Arial";
      ctx.fillText("Press Space to Start", cw / 2, ch * 0.35 + 46);
      ctx.font = "16px Arial";
      ctx.fillText("WASD move | E interact | Left click throw rock", cw / 2, ch * 0.35 + 76);
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
      ctx.restore();
      return;
    }

    const hasKeycard = this.state.hasKeycard || this.state.hasKey;
    ctx.fillText("WASD move | E interact | Left click throw rock", 20, 24);
    ctx.fillText(`Keycard: ${hasKeycard ? "Yes" : "No"}`, 20, 44);
    ctx.fillText(
      `Objective: ${this.state.objectiveComplete ? "Complete" : "Pending"}`,
      20,
      64
    );
    if (this.state.uiPrompt) {
      ctx.fillText(this.state.uiPrompt, 20, 84);
    }
    if (this.state.message) {
      ctx.fillText(this.state.message, 20, 104);
    }

    if (this.state.debug && this.state.debugInfo && Array.isArray(this.state.debugInfo.guards)) {
      let y = 134;
      for (const guardInfo of this.state.debugInfo.guards) {
        if (!guardInfo) continue;
        const label = guardInfo.name || `Guard ${guardInfo.id + 1}`;
        const sees = guardInfo.sees ? "SEE" : "NO-SEE";
        const los = guardInfo.hasLos ? "LOS" : "NO-LOS";
        ctx.fillText(`${label}: ${guardInfo.aiState || "?"} | ${sees} | ${los}`, 20, y);
        y += 20;
      }
    }

    if (this.state.status === "won" || this.state.status === "lost") {
      const message = this.state.status === "won" ? "Level Complete" : "Caught - Press R to Retry";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fillRect(0, ch * 0.4 - 70, cw, 140);

      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.font = "48px Arial";
      ctx.fillText(message, cw / 2, ch * 0.4);
      if (this.state.status === "lost" && this.state.lastCaptureByGuardId !== null) {
        ctx.font = "20px Arial";
        ctx.fillText(`Detected by guard ${this.state.lastCaptureByGuardId + 1}`, cw / 2, ch * 0.4 + 44);
      }
      if (this.state.status === "won") {
        ctx.font = "20px Arial";
        ctx.fillText("Press R to restart", cw / 2, ch * 0.4 + 44);
      }
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
    }

    ctx.restore();
  }
}
