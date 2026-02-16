// This game shell was happily modified from Googler Seth Ladd's "Bad Aliens" game and his Google IO talk in 2011

class GameEngine {
    constructor(options) {
        // What you will use to draw
        // Documentation: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
        this.ctx = null;

        // Everything that will be updated and drawn each frame
        this.entities = [];

        // Information on the input
        this.click = null;
        this.mouse = null;
        this.wheel = null;
        this.keys = {};
        this.input = new Input(this);

        // Options and the Details
        this.options = options || {
            debugging: false,
        };

        this.camera = {
            x: 0,
            y: 0,
            width: 1024,
            height: 768,
            zoom: 0.75 // zoom out (1 = normal  )
        };
        this.pendingSceneAction = null;
        this.overlayDrawFns = [];

    };

    init(ctx) {
        this.ctx = ctx;
        this.surfaceWidth = ctx.canvas.width;
        this.surfaceHeight = ctx.canvas.height;
        this.camera.width = ctx.canvas.width;
        this.camera.height = ctx.canvas.height;
        this.startInput();
        this.timer = new Timer();
    };

    start() {
        this.running = true;
        const gameLoop = () => {
            this.loop();
            requestAnimFrame(gameLoop, this.ctx.canvas);
        };
        gameLoop();
    };

    startInput() {
        const getXandY = e => {
            const rect = this.ctx.canvas.getBoundingClientRect();
            const scaleX = this.ctx.canvas.width / rect.width;
            const scaleY = this.ctx.canvas.height / rect.height;
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            };
        };
        
        this.ctx.canvas.addEventListener("mousemove", 
            e => {
                if (this.options.debugging) {
                    console.log("MOUSE_MOVE", getXandY(e));
                }
                this.mouse = getXandY(e);
            }
        );

        this.ctx.canvas.addEventListener("click", 
            e => {
                if (this.options.debugging) {
                    console.log("CLICK", getXandY(e));
                }
                this.click = getXandY(e);
            }
        );

        this.ctx.canvas.addEventListener("wheel", 
            e => {
                if (this.options.debugging) {
                    console.log("WHEEL", getXandY(e), e.wheelDelta);
                }
                e.preventDefault(); // Prevent Scrolling
                this.wheel = e;
            },
            {passive: false}
        );

        this.ctx.canvas.addEventListener("contextmenu", 
            e => {
                if (this.options.debugging) {
                    console.log("RIGHT_CLICK", getXandY(e));
                }
                e.preventDefault(); // Prevent Context Menu
                this.rightclick = getXandY(e);
            }
        );

        const clearKeys = () => {
            this.keys = {};
            if (this.input) this.input.previousKeys = {};
        };

        const handleKeyDown = event => {
            this.keys[event.key] = true;
        };

        const handleKeyUp = event => {
            this.keys[event.key] = false;
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("blur", clearKeys);
        this.ctx.canvas.addEventListener("blur", clearKeys);
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) clearKeys();
        });
    };

    addEntity(entity) {
        this.entities.push(entity);
    };

    draw() {
        const ctx = this.ctx;
        const cam = this.camera;
        this.overlayDrawFns = [];

        // fill the canvas 
        // TODO: Need to make transparent to allow image backgrounds
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        ctx.save();
        ctx.scale(cam.zoom, cam.zoom);
        ctx.translate(-cam.x, -cam.y);
        ctx.imageSmoothingEnabled = true;
        if ("imageSmoothingQuality" in ctx) {
            ctx.imageSmoothingQuality = "high";
        }

        // Draw latest things first 
        for (let i = this.entities.length - 1; i >= 0; i--) {
            this.entities[i].draw(ctx, this);
        }

        ctx.restore();

        if (Array.isArray(this.overlayDrawFns) && this.overlayDrawFns.length) {
            for (const drawOverlay of this.overlayDrawFns) {
                if (typeof drawOverlay === "function") {
                    drawOverlay(ctx, this);
                }
            }
        }
    };

    update() {
        if (typeof this.pendingSceneAction === "function") {
            const action = this.pendingSceneAction;
            this.pendingSceneAction = null;
            action();
        }

        let entitiesCount = this.entities.length;

        for (let i = 0; i < entitiesCount; i++) {
            let entity = this.entities[i];

            if (!entity.removeFromWorld) {
                entity.update();
            }
        }

        const player = this.entities.find(e => e.isPlayer);

        if(player && this.level) {
            const viewWidth = this.camera.width / this.camera.zoom;
            const viewHeight = this.camera.height / this.camera.zoom;

            let targetX = player.x + player.w / 2 - viewWidth / 2;
            let targetY = player.y + player.h / 2 - viewHeight / 2;
            
            this.camera.x = clamp(
                targetX, 
                0, 
                Math.max(0, this.level.width - viewWidth)
            );
            this.camera.y = clamp(
                targetY,
                0,
                Math.max(0, this.level.height - viewHeight)
            );
        }

        for (let i = this.entities.length - 1; i >= 0; --i) {
            if (this.entities[i].removeFromWorld) {
                this.entities.splice(i, 1);
            }
        }
    };

    loop() {
        this.clockTick = this.timer.tick();
        this.update();
        this.draw();
    };

};

// KV Le was here :)
