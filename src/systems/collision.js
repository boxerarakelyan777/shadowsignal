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
  // Move X
  entity.x += dx;
  for (const wall of walls) {
    if (rectsIntersect(entity, wall)) {
      if (dx > 0) entity.x = wall.x - entity.w;
      else if (dx < 0) entity.x = wall.x + wall.w;
    }
  }

  // Move Y
  entity.y += dy;
  for (const wall of walls) {
    if (rectsIntersect(entity, wall)) {
      if (dy > 0) entity.y = wall.y - entity.h;
      else if (dy < 0) entity.y = wall.y + wall.h;
    }
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function centerOf(r) {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}
