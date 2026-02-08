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
    this.state.menuOptionRects = [];
    this.state.levelOptionRects = [];

    const status = this.state.status;

    if (status === "splash") {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      ctx.fillRect(0, ch * 0.35 - 110, cw, 220);
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.font = "58px Arial";
      ctx.fillText("SHADOW SIGNAL", cw / 2, ch * 0.35);
      ctx.font = "24px Arial";
      ctx.fillText("Press Any Button To Start", cw / 2, ch * 0.35 + 52);
      ctx.font = "16px Arial";
      ctx.fillText("WASD move | E interact | Left click throw rock", cw / 2, ch * 0.35 + 84);
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
      ctx.restore();
      return;
    }

    if (status === "menu") {
      const selectedIndex = clamp(Number(this.state.menuIndex) || 0, 0, 1);
      const menuOptions = [
        "Start Game",
        "Credits",
      ];

      const panelX = cw * 0.26;
      const panelY = ch * 0.24;
      const panelW = cw * 0.48;
      const panelH = ch * 0.5;
      const optionW = Math.min(420, panelW * 0.8);
      const optionH = 52;
      const optionX = (cw - optionW) / 2;
      const firstOptionY = ch * 0.42;
      const optionGap = 68;

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
      ctx.fillRect(panelX, panelY, panelW, panelH);

      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.font = "44px Arial";
      ctx.fillText("MAIN MENU", cw / 2, ch * 0.31);

      this.state.menuOptionRects = [];
      for (let i = 0; i < menuOptions.length; i++) {
        const y = firstOptionY + i * optionGap;
        const rect = { x: optionX, y: y - optionH / 2, w: optionW, h: optionH };
        this.state.menuOptionRects.push(rect);

        ctx.fillStyle = i === selectedIndex
          ? "rgba(255, 220, 120, 0.95)"
          : "rgba(205, 205, 205, 0.9)";
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

        ctx.fillStyle = "rgba(25, 25, 25, 0.95)";
        ctx.font = "24px Arial";
        ctx.fillText(menuOptions[i], cw / 2, y);
      }

      ctx.fillStyle = "rgba(230, 230, 230, 0.92)";
      ctx.font = "16px Arial";
      ctx.fillText("W/S or Arrow Keys or Mouse: Select", cw / 2, ch * 0.75);
      ctx.fillText("Enter/Space or Click: Confirm  |  Esc: Back", cw / 2, ch * 0.79);
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
      ctx.restore();
      return;
    }

    if (status === "level_select") {
      const levels = Array.isArray(this.state.levelMeta) ? this.state.levelMeta : [];
      const selectedIndex = clamp(
        Number(this.state.selectedLevelIndex) || 0,
        0,
        Math.max(0, levels.length - 1)
      );

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      ctx.fillRect(0, ch * 0.18, cw, ch * 0.64);
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.font = "44px Arial";
      ctx.fillText("LEVEL SELECT", cw / 2, ch * 0.24);

      let y = ch * 0.34;
      ctx.font = "24px Arial";
      if (!levels.length) {
        ctx.fillText("No levels available", cw / 2, y);
      } else {
        this.state.levelOptionRects = [];
        for (let i = 0; i < levels.length; i++) {
          const levelName = levels[i].name || `Level ${i + 1}`;
          const rect = {
            x: cw * 0.25,
            y: y - 16,
            w: cw * 0.5,
            h: 32,
          };
          this.state.levelOptionRects.push(rect);
          ctx.fillStyle = i === selectedIndex
            ? "rgba(255, 220, 120, 0.98)"
            : "rgba(220, 220, 220, 0.95)";
          ctx.fillText(`${i + 1}. ${levelName}`, cw / 2, y);
          y += 34;
        }
      }

      ctx.fillStyle = "rgba(230, 230, 230, 0.92)";
      ctx.font = "16px Arial";
      ctx.fillText("W/S or Arrow Keys or Mouse: Select", cw / 2, ch * 0.74);
      ctx.fillText("Enter/Space or Click: Start  |  Esc: Menu  |  C: Credits", cw / 2, ch * 0.78);
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
      ctx.restore();
      return;
    }

    if (status === "credits") {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(0, 0, 0, 0.82)";
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.font = "48px Arial";
      ctx.fillText("CREDITS", cw / 2, ch * 0.22);
      ctx.font = "22px Arial";
      ctx.fillText("Shadow Signal - Team Project", cw / 2, ch * 0.35);
      ctx.fillText("Rudolf Arakelyan", cw / 2, ch * 0.43);
      ctx.fillText("Kevin Kamau", cw / 2, ch * 0.49);
      ctx.fillText("Benjamin Petrik", cw / 2, ch * 0.55);
      ctx.fillText("Waleid Sami", cw / 2, ch * 0.61);
      ctx.font = "16px Arial";
      ctx.fillText("Press Enter/Space/Esc to return to menu", cw / 2, ch * 0.76);
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
      ctx.restore();
      return;
    }

    if (status === "loading") {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fillRect(0, ch * 0.4 - 60, cw, 120);
      ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
      ctx.font = "34px Arial";
      ctx.fillText("Loading...", cw / 2, ch * 0.4);
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

    if (status === "paused") {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
      ctx.fillRect(0, ch * 0.4 - 80, cw, 160);

      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.font = "48px Arial";
      ctx.fillText("Paused", cw / 2, ch * 0.4);
      ctx.font = "20px Arial";
      ctx.fillText("Esc/P: Resume  |  R: Retry  |  L: Levels  |  T: Title", cw / 2, ch * 0.4 + 44);
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
    }

    if (status === "won" || status === "lost") {
      const message = status === "won" ? "Level Complete" : "Caught";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fillRect(0, ch * 0.4 - 70, cw, 140);

      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.font = "48px Arial";
      ctx.fillText(message, cw / 2, ch * 0.4);
      if (status === "lost" && this.state.lastCaptureByGuardId !== null) {
        ctx.font = "20px Arial";
        ctx.fillText(`Detected by guard ${this.state.lastCaptureByGuardId + 1}`, cw / 2, ch * 0.4 + 44);
      }
      if (status === "won") {
        ctx.font = "20px Arial";
        ctx.fillText("N: Next Level  |  R: Retry  |  L: Levels  |  T: Title", cw / 2, ch * 0.4 + 44);
      } else {
        ctx.font = "20px Arial";
        ctx.fillText("R: Retry  |  L: Levels  |  T: Title", cw / 2, ch * 0.4 + 66);
      }
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
    }

    ctx.restore();
  }
}
