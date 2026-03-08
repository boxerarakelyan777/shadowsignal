// src/systems/pathfinding.js

function buildNavigationGrid(level, cellSize = 48) {
  const width = Math.max(1, Number(level?.width) || 1);
  const height = Math.max(1, Number(level?.height) || 1);
  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);

  const walls = Array.isArray(level?.walls) ? level.walls : [];
  const grid = [];

  for (let gy = 0; gy < rows; gy++) {
    const row = [];
    for (let gx = 0; gx < cols; gx++) {
      const centerX = gx * cellSize + cellSize / 2;
      const centerY = gy * cellSize + cellSize / 2;

      row.push({
        x: gx,
        y: gy,
        walkable: isGridCellWalkable(centerX, centerY, cellSize, walls),
      });
    }
    grid.push(row);
  }

  return {
    grid,
    cellSize,
    cols,
    rows,
  };
}

function isGridCellWalkable(centerX, centerY, cellSize, walls) {
  const half = cellSize * 0.32;

  const samplePoints = [
    { x: centerX, y: centerY },
    { x: centerX - half, y: centerY },
    { x: centerX + half, y: centerY },
    { x: centerX, y: centerY - half },
    { x: centerX, y: centerY + half },
  ];

  for (const wall of walls) {
    if (!isBlockingNavWall(wall)) continue;

    for (const p of samplePoints) {
      if (
        p.x > wall.x &&
        p.x < wall.x + wall.w &&
        p.y > wall.y &&
        p.y < wall.y + wall.h
      ) {
        return false;
      }
    }
  }

  return true;
}

function isBlockingNavWall(wall) {
  if (!wall) return false;
  if (
    !Number.isFinite(wall.x) ||
    !Number.isFinite(wall.y) ||
    !Number.isFinite(wall.w) ||
    !Number.isFinite(wall.h) ||
    wall.w <= 0 ||
    wall.h <= 0
  ) {
    return false;
  }

  if (wall.componentType === "lockedDoor" && (wall.locked === false || wall.state === "OPEN")) {
    return false;
  }

  return true;
}

function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function gridNodeKey(node) {
  return `${node.x},${node.y}`;
}

function gridFromWorld(gridData, x, y) {
  if (!gridData) return null;

  const gx = Math.floor(x / gridData.cellSize);
  const gy = Math.floor(y / gridData.cellSize);

  if (gx < 0 || gy < 0 || gx >= gridData.cols || gy >= gridData.rows) return null;
  return gridData.grid[gy][gx];
}

function worldFromGrid(gridData, node) {
  return {
    x: node.x * gridData.cellSize + gridData.cellSize / 2,
    y: node.y * gridData.cellSize + gridData.cellSize / 2,
  };
}

function getWalkableNeighbors(gridData, node) {
  const dirs = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  const result = [];

  for (const dir of dirs) {
    const nx = node.x + dir.x;
    const ny = node.y + dir.y;

    if (nx < 0 || ny < 0 || nx >= gridData.cols || ny >= gridData.rows) continue;

    const neighbor = gridData.grid[ny][nx];
    if (neighbor.walkable) result.push(neighbor);
  }

  return result;
}

function findNearestWalkableNode(gridData, x, y, maxRadius = 8) {
  const start = gridFromWorld(gridData, x, y);
  if (!start) return null;
  if (start.walkable) return start;

  for (let radius = 1; radius <= maxRadius; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const gx = start.x + dx;
        const gy = start.y + dy;

        if (gx < 0 || gy < 0 || gx >= gridData.cols || gy >= gridData.rows) continue;

        const node = gridData.grid[gy][gx];
        if (!node.walkable) continue;

        return node;
      }
    }
  }

  return null;
}

function reconstructGridPath(cameFrom, current, gridData) {
  const path = [worldFromGrid(gridData, current)];
  let key = gridNodeKey(current);

  while (cameFrom.has(key)) {
    const prev = cameFrom.get(key);
    path.push(worldFromGrid(gridData, prev));
    key = gridNodeKey(prev);
  }

  path.reverse();
  return simplifyWorldPath(path);
}

function simplifyWorldPath(path) {
  if (!Array.isArray(path) || path.length <= 2) return path || [];

  const simplified = [path[0]];

  for (let i = 1; i < path.length - 1; i++) {
    const prev = simplified[simplified.length - 1];
    const curr = path[i];
    const next = path[i + 1];

    const dx1 = Math.sign(curr.x - prev.x);
    const dy1 = Math.sign(curr.y - prev.y);
    const dx2 = Math.sign(next.x - curr.x);
    const dy2 = Math.sign(next.y - curr.y);

    if (dx1 === dx2 && dy1 === dy2) {
      continue;
    }

    simplified.push(curr);
  }

  simplified.push(path[path.length - 1]);
  return simplified;
}

function findPath(gridData, startX, startY, endX, endY) {
  if (!gridData || !gridData.grid) return null;

  const start = findNearestWalkableNode(gridData, startX, startY);
  const goal = findNearestWalkableNode(gridData, endX, endY);

  if (!start || !goal) return null;

  if (start.x === goal.x && start.y === goal.y) {
    return [worldFromGrid(gridData, goal)];
  }

  const open = [start];
  const openSet = new Set([gridNodeKey(start)]);
  const cameFrom = new Map();

  const gScore = new Map();
  const fScore = new Map();

  const startKey = gridNodeKey(start);
  gScore.set(startKey, 0);
  fScore.set(startKey, heuristic(start, goal));

  while (open.length) {
    let currentIndex = 0;
    let current = open[0];
    let currentKey = gridNodeKey(current);
    let bestF = fScore.get(currentKey) ?? Infinity;

    for (let i = 1; i < open.length; i++) {
      const candidate = open[i];
      const candidateKey = gridNodeKey(candidate);
      const candidateF = fScore.get(candidateKey) ?? Infinity;
      if (candidateF < bestF) {
        bestF = candidateF;
        current = candidate;
        currentKey = candidateKey;
        currentIndex = i;
      }
    }

    open.splice(currentIndex, 1);
    openSet.delete(currentKey);

    if (current.x === goal.x && current.y === goal.y) {
      return reconstructGridPath(cameFrom, current, gridData);
    }

    const neighbors = getWalkableNeighbors(gridData, current);
    for (const neighbor of neighbors) {
      const neighborKey = gridNodeKey(neighbor);
      const tentativeG = (gScore.get(currentKey) ?? Infinity) + 1;

      if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
        cameFrom.set(neighborKey, current);
        gScore.set(neighborKey, tentativeG);
        fScore.set(neighborKey, tentativeG + heuristic(neighbor, goal));

        if (!openSet.has(neighborKey)) {
          open.push(neighbor);
          openSet.add(neighborKey);
        }
      }
    }
  }

  return null;
}