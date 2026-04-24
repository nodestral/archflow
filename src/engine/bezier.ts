import type { NodePosition, FlowDirection, PathInfo } from "./types";

/**
 * Check if a line segment from (x1,y1) to (x2,y2) intersects a node's bounding box.
 * Uses a simple Y-range + X-range overlap test for horizontal layouts.
 */
function pathCrossesNode(
  x1: number, y1: number,
  x2: number, y2: number,
  node: NodePosition,
  fromId: string,
  toId: string
): boolean {
  if (node.x === undefined) return false;
  // Don't check against source or target
  // (caller handles this by excluding from/to ids)

  const pad = 8; // padding around node

  // For horizontal layout: check if the bezier's Y range overlaps the node
  // and the node's X range falls between source and target X
  const minY = Math.min(y1, y2) - 4;
  const maxY = Math.max(y1, y2) + 4;
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);

  const nodeLeft = node.x - pad;
  const nodeRight = node.x + node.w + pad;
  const nodeTop = node.y - pad;
  const nodeBottom = node.y + node.h + pad;

  // Check bounding box overlap
  const xOverlap = nodeLeft < maxX && nodeRight > minX;
  const yOverlap = nodeTop < maxY && nodeBottom > minY;

  return xOverlap && yOverlap;
}

/**
 * Calculate bezier path between two nodes with obstacle avoidance.
 * Routes around intermediate nodes that would be crossed.
 */
export function calcPath(
  from: NodePosition,
  to: NodePosition,
  direction: FlowDirection,
  allPositions?: Map<string, NodePosition>,
  fromId?: string,
  toId?: string
): PathInfo {
  let x1: number, y1: number, x2: number, y2: number;

  if (direction === "horizontal") {
    if (to.x >= from.x) {
      x1 = from.x + from.w;
      y1 = from.y + from.h / 2;
      x2 = to.x;
      y2 = to.y + to.h / 2;
    } else {
      x1 = from.x;
      y1 = from.y + from.h / 2;
      x2 = to.x + to.w;
      y2 = to.y + to.h / 2;
    }
  } else {
    if (to.y >= from.y) {
      x1 = from.x + from.w / 2;
      y1 = from.y + from.h;
      x2 = to.x + to.w / 2;
      y2 = to.y;
    } else {
      x1 = from.x + from.w / 2;
      y1 = from.y;
      x2 = to.x + to.w / 2;
      y2 = to.y + to.h;
    }
  }

  let d: string;
  let mx: number;
  let my: number;

  // Obstacle avoidance
  if (allPositions && direction === "horizontal") {
    const obstacles: NodePosition[] = [];
    allPositions.forEach((pos, id) => {
      if (id === fromId || id === toId) return;
      if (pathCrossesNode(x1, y1, x2, y2, pos, fromId ?? "", toId ?? "")) {
        obstacles.push(pos);
      }
    });

    if (obstacles.length > 0) {
      // Find the bounding box of all obstacles
      let obsTop = Infinity;
      let obsBottom = -Infinity;
      for (const obs of obstacles) {
        if (obs.y < obsTop) obsTop = obs.y;
        if (obs.y + obs.h > obsBottom) obsBottom = obs.y + obs.h;
      }

      const obsMidY = (obsTop + obsBottom) / 2;
      const fromMidY = from.y + from.h / 2;
      const toMidY = to.y + to.h / 2;

      // Route above or below obstacles based on which side has more space
      const routeAbove = fromMidY <= obsMidY || toMidY <= obsMidY;
      const arcY = routeAbove ? obsTop - 20 : obsBottom + 20;
      const mx1 = x1 + (x2 - x1) * 0.3;
      const mx2 = x1 + (x2 - x1) * 0.7;

      // Multi-segment bezier: source → arc point → target
      d = `M ${x1} ${y1} C ${mx1} ${y1}, ${mx1} ${arcY}, ${(mx1 + mx2) / 2} ${arcY} S ${mx2} ${y2}, ${x2} ${y2}`;
      mx = (mx1 + mx2) / 2;
      my = arcY;
    } else {
      mx = (x1 + x2) / 2;
      d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
      my = (y1 + y2) / 2;
    }
  } else {
    mx = (x1 + x2) / 2;
    d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
    my = (y1 + y2) / 2;
  }

  return { d, mx, my, x1, y1, x2, y2 };
}
