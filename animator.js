class Animator {
    constructor(spritesheet, frameWidth, frameHeight, frameDuration, frameCount){
        this.spritesheet = spritesheet;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.frameDuration = frameDuration;
        this.frameCount = frameCount;
        this.elapsedTime = 0;
        this.currentFrame = 0;
    }

    update(deltaTime, isMoving){
        if(!isMoving){
            this.currentFrame = 0;
            this.elapsedTime = 0;
            return;
        }
    
        this.elapsedTime += deltaTime;
        if(this.elapsedTime >= this.frameDuration){
            this.currentFrame = (this.currentFrame + 1) % this.frameCount;
            this.elapsedTime = 0;
        }
    }

    draw(ctx, x, y, width, height, direction){
        if(!this.spritesheet) return;
        
        // Calculate which frame to sample
        const srcX = this.currentFrame * this.frameWidth;  // Column (0-7)
        const srcY = direction * this.frameHeight;         // Row (0-7)
        
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
    if(dx === 0 && dy === 0) return 0;

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