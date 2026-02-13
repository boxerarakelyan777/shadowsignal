// src/config/tuning.js
const TUNING = {
  // Guard behavior source-of-truth (AI/gameplay values).
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
    throwSpeed: 760,
    arcHeight: 18,
    noiseRadius: 120,
    impactVisualRadius: 14,
    noiseTTL: 0.7,
    cooldown: 0.45,
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
