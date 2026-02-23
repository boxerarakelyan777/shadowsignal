class Animator {
    constructor(spritesheet, frameWidth, frameHeight, frameDuration, frameCount, loop = true){
        this.spritesheet = spritesheet;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.frameDuration = frameDuration;
        this.frameCount = frameCount;
        this.loop = loop;
        this.elapsedTime = 0;
        this.currentFrame = 0;
        this.isComplete = false;
    }

    update(deltaTime, isActive){
        if (!isActive || this.isComplete) {
            return;
        }
    
        this.elapsedTime += deltaTime;
        if (this.elapsedTime >= this.frameDuration) {
            this.currentFrame++;
            
            if (this.currentFrame >= this.frameCount) {
                if (this.loop) {
                    this.currentFrame = 0; 
                } else {
                    this.currentFrame = this.frameCount - 1; 
                    this.isComplete = true; 
                }
            }
            this.elapsedTime = 0;
        }
    }

    reset(){
        this.currentFrame = 0;
        this.elapsedTime = 0;
        this.isComplete = false;
    }

    draw(ctx, x, y, width, height, direction){
        if(!this.spritesheet) return;
        
        // Safety check: clamp direction to available rows
        const maxRows = Math.floor(this.spritesheet.height / this.frameHeight);
        const safeDirection = direction % maxRows;
        
        // Calculate which frame to sample
        const srcX = this.currentFrame * this.frameWidth;  // Column (0-7)
        const srcY = safeDirection * this.frameHeight;     // Row (0-7, clamped)
        
        ctx.drawImage(
            this.spritesheet,
            srcX, srcY,                         // Start position in sprite sheet
            this.frameWidth, this.frameHeight,  // Sample full 64×64 frame
            x, y,                               // Draw position
            width, height                       // Display at 24×24
        );
    }
}

function getDirectionIndex(dx, dy){
    if(dx === 0 && dy === 0) return 3;

    const angle = Math.atan2(dy, dx);
    const directions = Math.round((angle + Math.PI) / (Math.PI / 4)) % 8;

    // Map to your sprite sheet rows:
    // Row 0: NW, Row 1: W, Row 2: SW, Row 3: S,
    // Row 4: SE, Row 5: E, Row 6: NE, Row 7: N
    const directionMap = {
        0: 1,  // W -> row 1
        1: 0,  // NW -> row 0
        2: 7,  // N -> row 7
        3: 6,  // NE -> row 6
        4: 5,  // E -> row 5
        5: 4,  // SE -> row 4
        6: 3,  // S -> row 3
        7: 2   // SW -> row 2
    };

    return directionMap[directions] || 3;
}

function getAttackDirectionIndex(dx, dy){
    if(dx === 0 && dy === 0) return 4;

    const angle = Math.atan2(dy, dx);
    const directions = Math.round((angle + Math.PI) / (Math.PI / 4)) % 8;

    // Attack sprite sheet row mapping (based on visual inspection)
    // Row 0: N, Row 1: NE, Row 2: E, Row 3: SE
    // Row 4: S, Row 5: SW, Row 6: W, Row 7: NW
    const attackDirectionMap = {
        0: 2,  // W → try row 2
        1: 1,  // NW → try row 1
        2: 0,  // N → try row 0
        3: 7,  // NE → try row 7
        4: 6,  // E → try row 6
        5: 5,  // SE → try row 5
        6: 4,  // S → try row 4
        7: 3   // SW → try row 3
    };

    return attackDirectionMap[directions] || 4;
}