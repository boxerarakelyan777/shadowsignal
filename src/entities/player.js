// src/entities/player.js
class Player {
  constructor(game, level, state, walkSprite, idleSprite, attackSprite) {
    this.game = game;
    this.level = level;
    this.state = state;

    // Collision box slightly smaller than the visual size for fair corners.
    this.w = 22;
    this.h = 22;
    this.drawW = 48 ;
    this.drawH = 48;
    this.drawOffsetX = (this.w - this.drawW) / 2;
    this.drawOffsetY = (this.h - this.drawH) / 2;
    this.x = level.playerSpawn.x;
    this.y = level.playerSpawn.y;

    this.speed = 220; // pixels/sec
    this.hidden = false;
    this.lastDir = { x: 1, y: 0 };
    this.currentDirection = 3; // default facing south

    this.removeFromWorld = false;
    this.isPlayer = true;

    this.animState = "idle"; // current animation status
    this.lastAnimState = "idle";

    this.animations = {};
    
    if(idleSprite){
      this.animations.idle = new Animator(idleSprite, 64, 64, 0.15, 12, true);
    }
    if(walkSprite){
      this.animations.walk = new Animator(walkSprite, 64, 64, 0.1, 8, true);
    }
    if(attackSprite){
      this.animations.attack = new Animator(attackSprite, 96, 96, 0.07, 7, false);
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
    if (this.hidden) return; // If hidden, don't move (simple + clear)

    const dt = this.game.clockTick;

    let vx = 0;
    let vy = 0;
    if (this.game.keys["w"] || this.game.keys["ArrowUp"]) vy -= 1;
    if (this.game.keys["s"] || this.game.keys["ArrowDown"]) vy += 1;
    if (this.game.keys["a"] || this.game.keys["ArrowLeft"]) vx -= 1;
    if (this.game.keys["d"] || this.game.keys["ArrowRight"]) vx += 1;

    const isMoving = vx !== 0 || vy !== 0; // Normalize diagonal (and any combined input)

    if(isMoving){
      const len = Math.hypot(vx, vy);
      vx /= len;
      vy /= len;
      this.lastDir = { x: vx, y: vy };
      this.currentDirection = getDirectionIndex(vx, vy); //sends the direction index
    }


    const dx = vx * this.speed * dt;
    const dy = vy * this.speed * dt;
    moveWithWalls(this, dx, dy, this.level.walls);

    if(this.animState === "attack"){
      if(this.animations.attack && this.animations.attack.isComplete){ //stay in attack animation until complete
        this.animState = isMoving ? "walk" : "idle";
      }
    }else if(isMoving){
      this.animState = "walk";
    }else{
      this.animState = "idle";
    }

    if(this.animState !== this.lastAnimState){ //reset animation if state changed
      if(this.animations[this.animState]){
        this.animations[this.animState].reset();
      }
      this.lastAnimState = this.animState;
    }

    if(this.animations[this.animState]){ //update the active animation
      this.animations[this.animState].update(dt,true);
    }
  }

  triggerAttack(direction){ //trigger attack animation (called from controller)
    this.animState = "attack";
    this.currentDirection = direction;
    if(this.animations.attack){
      this.animations.attack.reset();
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.hidden ? 0.35 : 1.0;

    const currentAnim = this.animations[this.animState];
    if(currentAnim){

      let displayW = this.drawW;
      let displayH = this.drawH;
      let offsetX = this.drawOffsetX;
      let offsetY = this.drawOffsetY;

      if(this.animState === "attack"){
        //attack sprites are 96x96, so display them 1.5x larger
        displayW = 72; //= 48 * 1.5
        displayH = 72;

        offsetX = (this.w - displayW) / 2;
        offsetY = (this.h - displayH) / 2;

        //attack animation needs unique offsetting
        const attackOffsetX = 0;  // Negative = left, Positive = right
        const attackOffsetY = 0;  // Negative = up, Positive = down
        
        offsetX += attackOffsetX;
        offsetY += attackOffsetY;
      }

      currentAnim.draw(
        ctx,
        this.x + offsetX,
        this.y + offsetY,
        displayW,
        displayH,
        this.currentDirection
      );
    }else{ //fallback
      ctx.fillStyle= this.hidden ? "rgba(0,150,0,0.6)" : "rgba(0,180,0,1)";
      ctx.fillRect(
        this.x + this.drawOffsetX,
        this.y + this.drawOffsetY,
        this.drawW,
        this.drawH
      )
    }

    ctx.restore();
  }
}
