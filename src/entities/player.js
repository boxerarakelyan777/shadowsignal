// src/entities/player.js
class Player {
  constructor(game, level, state, spritesheet) {
    this.game = game;
    this.level = level;
    this.state = state;
    const defaults = getComponentDefaults("player");

    // Collision box slightly smaller than the visual size for fair corners.
    this.w = numberOr(level?.player?.w, numberOr(defaults.w, 22));
    this.h = numberOr(level?.player?.h, numberOr(defaults.h, 22));
    this.drawW = numberOr(level?.player?.drawW, numberOr(defaults.drawW, 48));
    this.drawH = numberOr(level?.player?.drawH, numberOr(defaults.drawH, 48));
    this.drawOffsetX = (this.w - this.drawW) / 2;
    this.drawOffsetY = (this.h - this.drawH) / 2;
    this.x = level.playerSpawn.x;
    this.y = level.playerSpawn.y;

    this.speed = numberOr(level?.player?.speed, numberOr(defaults.speed, 220)); // pixels/sec
    this.hidden = false;
    this.lastDir = { x: 1, y: 0 };
    this.currentDirection = getDirectionIndex(this.lastDir.x, this.lastDir.y);


    this.removeFromWorld = false;

    this.isPlayer = true;

    if (spritesheet) { // adds spritesheet if it exists
      this.animator = new Animator(
        spritesheet, 
        64, 
        64, 
        0.1, 
        8);
    } else {
      this.animator = null;
    }
  }

  getRect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  get bounds() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update() {
    if (this.state.status !== "playing") return;
    if (this.state.playerState !== "NORMAL") return;
    // If hidden, don't move (simple + clear)
    if (this.hidden) return;

    let vx = 0;
    let vy = 0;
    if (this.game.keys["w"] || this.game.keys["ArrowUp"]) vy -= 1;
    if (this.game.keys["s"] || this.game.keys["ArrowDown"]) vy += 1;
    if (this.game.keys["a"] || this.game.keys["ArrowLeft"]) vx -= 1;
    if (this.game.keys["d"] || this.game.keys["ArrowRight"]) vx += 1;

    // Normalize diagonal (and any combined input)
    const isMoving = vx !== 0 || vy !== 0;
    if(isMoving){
      const len = Math.hypot(vx, vy);
      vx /= len;
      vy /= len;
      this.lastDir = { x: vx, y: vy };
      this.currentDirection = getDirectionIndex(vx, vy); //sends the direction index
    }

    const dt = this.game.clockTick;
    const dx = vx * this.speed * dt;
    const dy = vy * this.speed * dt;

    moveWithWalls(this, dx, dy, this.level.walls);

    if(this.animator) {
      this.animator.update(dt, isMoving);
    }
  }

  draw(ctx) {
    const nonGameplayScreens = ["splash", "menu", "level_select", "credits", "loading"];
    if (nonGameplayScreens.includes(this.state.status)) return;
    if (this.state.playerState === "EXTRACTED" || this.state.playerExtracted) return;

    const extractionFx = this.state.status === "extracting" ? this.state.extractionFx : null;

    ctx.save();
    ctx.globalAlpha = this.hidden ? 0.35 : 1.0;

    if (extractionFx) {
      const duration = Math.max(0.01, numberOr(extractionFx.duration, 1.45));
      const t = clamp(numberOr(extractionFx.elapsed, 0) / duration, 0, 1);
      const chargeT = clamp(t / 0.22, 0, 1);
      const launchT = clamp((t - 0.14) / 0.62, 0, 1);
      const finishT = clamp((t - 0.78) / 0.22, 0, 1);
      const chargeEase = chargeT * chargeT * (3 - 2 * chargeT);
      const launchEase = 1 - Math.pow(1 - launchT, 3);
      const finishEase = finishT * finishT;
      const centerX = this.x + this.w / 2;
      const centerY = this.y + this.h / 2;
      const lift = numberOr(extractionFx.lift, 132) * launchEase;
      const spinTurns = numberOr(extractionFx.spinTurns, 4.8);
      const rotation = (launchEase * 0.82 + finishEase * 0.58) * Math.PI * 2 * spinTurns;
      const scale = 1 + 0.08 * chargeEase + 0.16 * launchEase + 0.24 * finishEase;
      const glowRadius = this.drawW * (0.34 + 0.34 * launchEase + 0.2 * finishEase);
      const beamPulse = 0.66 + 0.34 * Math.sin(t * 36);
      const beamW = this.drawW * (0.24 + 0.16 * launchEase + 0.08 * beamPulse);
      const beamTop = centerY - lift - (42 + 118 * launchEase);
      const beamBottom = centerY + 24;

      const padGlow = ctx.createRadialGradient(
        centerX,
        centerY + 6,
        2,
        centerX,
        centerY + 6,
        this.drawW * (0.34 + 0.42 * launchEase)
      );
      padGlow.addColorStop(0, "rgba(112, 226, 255, 0.32)");
      padGlow.addColorStop(0.7, "rgba(80, 182, 223, 0.14)");
      padGlow.addColorStop(1, "rgba(44, 105, 145, 0)");
      ctx.fillStyle = padGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY + 6, this.drawW * (0.34 + 0.42 * launchEase), 0, Math.PI * 2);
      ctx.fill();

      const beam = ctx.createLinearGradient(centerX, beamBottom, centerX, beamTop);
      beam.addColorStop(0, `rgba(102, 208, 243, ${(0.18 + 0.1 * launchEase).toFixed(3)})`);
      beam.addColorStop(0.45, `rgba(152, 234, 255, ${(0.3 + 0.18 * launchEase).toFixed(3)})`);
      beam.addColorStop(1, "rgba(184, 245, 255, 0)");
      ctx.fillStyle = beam;
      ctx.fillRect(centerX - beamW / 2, beamTop, beamW, beamBottom - beamTop);

      ctx.strokeStyle = `rgba(165, 236, 255, ${(0.28 + 0.24 * launchEase).toFixed(3)})`;
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + 7, this.drawW * (0.2 + 0.12 * beamPulse), this.drawH * 0.16, 0, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < 4; i++) {
        const orbitA = t * 14 + i * (Math.PI * 0.5);
        const orbitR = this.drawW * (0.16 + 0.12 * launchEase) + i * 2.2;
        const px = centerX + Math.cos(orbitA) * orbitR;
        const py = centerY - lift * 0.45 + Math.sin(orbitA) * orbitR * 0.6;
        ctx.fillStyle = `rgba(188, 246, 255, ${(0.22 + 0.16 * (1 - finishEase)).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(px, py, 2 + i * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }

      const glow = ctx.createRadialGradient(
        centerX,
        centerY - lift + this.drawH * 0.1,
        2,
        centerX,
        centerY - lift + this.drawH * 0.1,
        glowRadius
      );
      glow.addColorStop(0, "rgba(193, 245, 255, 0.52)");
      glow.addColorStop(0.65, "rgba(109, 209, 241, 0.2)");
      glow.addColorStop(1, "rgba(68, 133, 162, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(centerX, centerY - lift + this.drawH * 0.1, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.translate(centerX, centerY - lift);
      ctx.rotate(rotation);
      ctx.scale(scale, scale);
      ctx.globalAlpha *= (1 - 0.56 * finishEase);

      if (this.animator) {
        this.animator.draw(
          ctx,
          -this.w / 2 + this.drawOffsetX,
          -this.h / 2 + this.drawOffsetY,
          this.drawW,
          this.drawH,
          this.currentDirection ?? 0
        );
      } else {
        ctx.fillStyle = "rgba(0,180,0,1)";
        ctx.fillRect(
          -this.w / 2 + this.drawOffsetX,
          -this.h / 2 + this.drawOffsetY,
          this.drawW,
          this.drawH
        );
      }

      if (finishEase > 0) {
        ctx.fillStyle = `rgba(226, 250, 255, ${(0.4 * finishEase).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(0, 0, this.drawW * (0.44 + 0.46 * finishEase), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (this.animator) {
      this.animator.draw(
        ctx,
        this.x + this.drawOffsetX,
        this.y + this.drawOffsetY,
        this.drawW,
        this.drawH,
        this.currentDirection ?? 0
      );
    } else {
      ctx.fillStyle = this.hidden ? "rgba(0,150,0,0.6)" : "rgba(0,180,0,1)";
      ctx.fillRect(
        this.x + this.drawOffsetX,
        this.y + this.drawOffsetY,
        this.drawW,
        this.drawH
      );
    }

    ctx.restore();
  }
}

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
