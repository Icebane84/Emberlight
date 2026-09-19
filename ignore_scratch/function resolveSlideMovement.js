/**
 * Resolves player movement against grid wall segments with sliding response.
 * @param {number} currX - Current player X position.
 * @param {number} currY - Current player Y position.
 * @param {number} targetX - Proposed target X position.
 * @param {number} targetY - Proposed target Y position.
 * @param {number} radius - Player collision radius.
 * @param {string[][]} map - 2D grid map matrix.
 * @returns {{ x: number, y: number }} Collision-resolved position.
 */
function resolveSlideMovement(currX, currY, targetX, targetY, radius, map) {
    // 1. Extract neighboring wall segments dynamically from the grid
    const segments = extractWallSegments(targetX, targetY, radius, map);
    
    let finalX = targetX;
    let finalY = targetY;

    // 2. Test X-axis movement independently for clean sliding
    const testXPos = { x: targetX, y: currY };
    if (checkCollision(testXPos.x, testXPos.y, radius, segments)) {
        finalX = currX; // Block X motion if colliding
    }

    // 3. Test Y-axis movement independently
    const testYPos = { x: finalX, y: targetY };
    if (checkCollision(testYPos.x, testYPos.y, radius, segments)) {
        finalY = currY; // Block Y motion if colliding
    }

    return { x: finalX, y: finalY };
}

function extractWallSegments(px, py, radius, map) {
    const segments = [];
    const minX = Math.max(0, Math.floor(px - radius - 1));
    const maxX = Math.min(map[0].length - 1, Math.ceil(px + radius + 1));
    const minY = Math.max(0, Math.floor(py - radius - 1));
    const maxY = Math.min(map.length - 1, Math.ceil(py + radius + 1));

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            if (map[y][x] === '#' || map[y][x] === 'B') {
                // Add 4 edges of the solid cell block
                segments.push({ x1: x, y1: y, x2: x + 1, y2: y });     // Top
                segments.push({ x1: x + 1, y1: y, x2: x + 1, y2: y + 1 }); // Right
                segments.push({ x1: x + 1, y1: y + 1, x2: x, y2: y + 1 }); // Bottom
                segments.push({ x1: x, y1: y + 1, x2: x, y2: y });     // Left
            }
        }
    }
    return segments;
}

function checkCollision(cx, cy, r, segments) {
    for (const seg of segments) {
        if (isCircleIntersectingSegment(cx, cy, r, seg.x1, seg.y1, seg.x2, seg.y2)) {
            return true;
        }
    }
    return false;
}

function isCircleIntersectingSegment(cx, cy, r, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) return Math.hypot(cx - x1, cy - y1) <= r;

    let t = ((cx - x1) * dx + (cy - y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const nearestX = x1 + t * dx;
    const nearestY = y1 + t * dy;

    return Math.hypot(cx - nearestX, cy - nearestY) <= r;
}