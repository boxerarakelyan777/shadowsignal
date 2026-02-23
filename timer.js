// This game shell was happily modified from Googler Seth Ladd's "Bad Aliens" game and his Google IO talk in 2011

class Timer {
    constructor() {
        this.gameTime = 0;
        // Cap simulation delta to reduce visible "teleport" jumps on frame spikes.
        this.maxStep = 1 / 30;
        this.lastTimestamp = performance.now();
    };

    tick() {
        const current = performance.now();
        const delta = Math.max(0, (current - this.lastTimestamp) / 1000);
        this.lastTimestamp = current;

        const gameDelta = Math.min(delta, this.maxStep);
        this.gameTime += gameDelta;
        return gameDelta;
    };
};
