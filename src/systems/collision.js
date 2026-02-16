// src/systems/collision.js
function rectsIntersect(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function moveWithWalls(entity, dx, dy, walls) {
  const solids = Array.isArray(walls) ? walls : [];
  const maxStep = 4;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / maxStep));
  const stepX = dx / steps;
  const stepY = dy / steps;

  for (let i = 0; i < steps; i++) {
    if (stepX !== 0) {
      entity.x += stepX;
      for (const wall of solids) {
        if (!isBlockingWall(wall)) continue;
        if (rectsIntersect(entity, wall)) {
          if (stepX > 0) entity.x = wall.x - entity.w;
          else entity.x = wall.x + wall.w;
          break;
        }
      }
    }

    if (stepY !== 0) {
      entity.y += stepY;
      for (const wall of solids) {
        if (!isBlockingWall(wall)) continue;
        if (rectsIntersect(entity, wall)) {
          if (stepY > 0) entity.y = wall.y - entity.h;
          else entity.y = wall.y + wall.h;
          break;
        }
      }
    }
  }
}

function isBlockingWall(wall) {
  if (!wall) return false;
  if (wall.componentType === "lockedDoor" && (wall.locked === false || wall.state === "OPEN")) {
    return false;
  }
  return Number.isFinite(wall.x) &&
    Number.isFinite(wall.y) &&
    Number.isFinite(wall.w) &&
    Number.isFinite(wall.h) &&
    wall.w > 0 &&
    wall.h > 0;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function centerOf(r) {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}
