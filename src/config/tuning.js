// src/config/tuning.js
const TUNING = {
  guard: {
    patrolSpeed: 90,
    chaseSpeed: 140,
    returnSpeed: 100,
    visionRange: 320,
    fovDeg: 80,
    waypointReachDistance: 8,
    stuckMoveThreshold: 0.5,
    stuckAdvanceDelay: 0.35,
  },
  rock: {
    maxThrowRange: 250,
    noiseRadius: 160,
    noiseTTL: 1.0,
    cooldown: 0.5,
  },
  los: {
    epsilon: 1e-6,
    edgeInset: 0.1,
  },
};

Object.freeze(TUNING.guard);
Object.freeze(TUNING.rock);
Object.freeze(TUNING.los);
Object.freeze(TUNING);
