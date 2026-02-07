// src/systems/vision.js
function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function pointInRect(p, r) {
  return p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h;
}

function losEpsilon() {
  if (typeof TUNING !== "undefined" && TUNING.los) {
    const value = Number(TUNING.los.epsilon);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 1e-6;
}

function losInset() {
  if (typeof TUNING !== "undefined" && TUNING.los) {
    const value = Number(TUNING.los.edgeInset);
    if (Number.isFinite(value) && value >= 0) return value;
  }
  return 0;
}

function clipTest(p, q, interval) {
  const eps = losEpsilon();
  if (Math.abs(p) <= eps) return q >= -eps;

  const t = q / p;
  if (p < 0) {
    if (t > interval.t1) return false;
    if (t > interval.t0) interval.t0 = t;
  } else {
    if (t < interval.t0) return false;
    if (t < interval.t1) interval.t1 = t;
  }
  return true;
}

function segmentIntersectsAabb(a, b, minX, minY, maxX, maxY) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const interval = { t0: 0, t1: 1 };

  if (!clipTest(-dx, a.x - minX, interval)) return false;
  if (!clipTest(dx, maxX - a.x, interval)) return false;
  if (!clipTest(-dy, a.y - minY, interval)) return false;
  if (!clipTest(dy, maxY - a.y, interval)) return false;

  return interval.t1 >= interval.t0 - losEpsilon();
}

function segmentIntersectsRect(a, b, r) {
  const inset = losInset();
  const minX = r.x + inset;
  const minY = r.y + inset;
  const maxX = r.x + r.w - inset;
  const maxY = r.y + r.h - inset;

  if (maxX <= minX || maxY <= minY) return false;

  const insetRect = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  if (pointInRect(a, insetRect) || pointInRect(b, insetRect)) return true;

  return segmentIntersectsAabb(a, b, minX, minY, maxX, maxY);
}

function hasLineOfSight(fromPt, toPt, walls) {
  for (const w of walls) {
    if (segmentIntersectsRect(fromPt, toPt, w)) return false;
  }
  return true;
}
