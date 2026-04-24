import type { NodePosition, FlowDirection, PathInfo } from "../engine/types";

type PortSide = "top" | "bottom" | "left" | "right";

/**
 * Get a point on a node's edge at a specific offset from center.
 */
function getPort(pos: NodePosition, side: PortSide, offset: number): { x: number; y: number } {
  const { x, y, w, h } = pos;
  const cx = x + w / 2;
  const cy = y + h / 2;

  switch (side) {
    case "left":   return { x, y: cy + offset };
    case "right":  return { x: x + w, y: cy + offset };
    case "top":    return { x: cx + offset, y };
    case "bottom": return { x: cx + offset, y: y + h };
  }
}

/**
 * Determine the best exit side from source and entry side to target
 * based on relative positions.
 */
function bestSides(
  from: NodePosition,
  to: NodePosition,
  direction: FlowDirection
): { fromSide: PortSide; toSide: PortSide } {
  const fromCx = from.x + from.w / 2;
  const fromCy = from.y + from.h / 2;
  const toCx = to.x + to.w / 2;
  const toCy = to.y + to.h / 2;

  if (direction === "horizontal") {
    // Primary: left→right flow
    if (toCx > fromCx + from.w / 2) {
      // Target is clearly to the right
      return { fromSide: "right", toSide: "left" };
    } else if (toCx < fromCx - from.w / 2) {
      // Target is clearly to the left
      return { fromSide: "left", toSide: "right" };
    } else {
      // Same column or overlapping — use vertical sides based on Y position
      if (toCy < fromCy) {
        // Target is above
        return { fromSide: "top", toSide: "bottom" };
      } else {
        // Target is below
        return { fromSide: "bottom", toSide: "top" };
      }
    }
  } else {
    // Vertical: top→bottom flow
    if (toCy > fromCy + from.h / 2) {
      return { fromSide: "bottom", toSide: "top" };
    } else if (toCy < fromCy - from.h / 2) {
      return { fromSide: "top", toSide: "bottom" };
    } else {
      // Same row — use horizontal sides
      if (toCx < fromCx) {
        return { fromSide: "left", toSide: "right" };
      } else {
        return { fromSide: "right", toSide: "left" };
      }
    }
  }
}

/**
 * Check if a path would cross a node.
 */
function wouldCrossNode(
  x1: number, y1: number,
  x2: number, y2: number,
  node: NodePosition
): boolean {
  const pad = 12;
  const minY = Math.min(y1, y2) - 8;
  const maxY = Math.max(y1, y2) + 8;
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);

  return (
    node.x - pad < maxX &&
    node.x + node.w + pad > minX &&
    node.y - pad < maxY &&
    node.y + node.h + pad > minY
  );
}

/**
 * Calculate bezier path with smart port routing and obstacle avoidance.
 */
export function calcPath(
  from: NodePosition,
  to: NodePosition,
  direction: FlowDirection,
  allPositions?: Map<string, NodePosition>,
  fromId?: string,
  toId?: string,
  fromPortIndex?: number,
  fromPortTotal?: number,
  toPortIndex?: number,
  toPortTotal?: number,
): PathInfo {
  // Determine best sides based on relative positions
  const { fromSide, toSide } = bestSides(from, to, direction);

  // Port spread: distribute multiple connections along the edge
  const PORT_SPREAD = 10;
  const fromOffset = fromPortTotal && fromPortTotal > 1
    ? (fromPortIndex! - (fromPortTotal - 1) / 2) * PORT_SPREAD
    : 0;
  const toOffset = toPortTotal && toPortTotal > 1
    ? (toPortIndex! - (toPortTotal - 1) / 2) * PORT_SPREAD
    : 0;

  const fp = getPort(from, fromSide, fromOffset);
  const tp = getPort(to, toSide, toOffset);

  const x1 = fp.x, y1 = fp.y;
  const x2 = tp.x, y2 = tp.y;

  // Obstacle avoidance
  let needsReroute = false;
  let obsTop = Infinity, obsBottom = -Infinity;
  let obsLeft = Infinity, obsRight = -Infinity;

  if (allPositions) {
    for (const [id, pos] of allPositions) {
      if (id === fromId || id === toId) continue;
      if (wouldCrossNode(x1, y1, x2, y2, pos)) {
        needsReroute = true;
        if (pos.y < obsTop) obsTop = pos.y;
        if (pos.y + pos.h > obsBottom) obsBottom = pos.y + pos.h;
        if (pos.x < obsLeft) obsLeft = pos.x;
        if (pos.x + pos.w > obsRight) obsRight = pos.x + pos.w;
      }
    }
  }

  let d: string;
  let mx: number;
  let my: number;

  if (needsReroute) {
    // Determine if we should route above, below, left, or right of obstacles
    const obsMidY = (obsTop + obsBottom) / 2;
    const obsMidX = (obsLeft + obsRight) / 2;

    if (direction === "horizontal") {
      // Prefer vertical detour
      const routeAbove = y1 <= obsMidY && y2 <= obsMidY;
      const arcY = routeAbove ? obsTop - 28 : obsBottom + 28;
      const mx1 = x1 + (x2 - x1) * 0.25;
      const mx2 = x1 + (x2 - x1) * 0.75;

      d = `M ${x1} ${y1} C ${mx1} ${y1}, ${mx1} ${arcY}, ${(mx1 + mx2) / 2} ${arcY} S ${mx2} ${y2}, ${x2} ${y2}`;
      mx = (mx1 + mx2) / 2;
      my = arcY;
    } else {
      // Horizontal detour for vertical layout
      const routeLeft = x1 <= obsMidX && x2 <= obsMidX;
      const arcX = routeLeft ? obsLeft - 28 : obsRight + 28;
      const my1 = y1 + (y2 - y1) * 0.25;
      const my2 = y1 + (y2 - y1) * 0.75;

      d = `M ${x1} ${y1} C ${x1} ${my1}, ${arcX} ${my1}, ${arcX} ${(my1 + my2) / 2} S ${x2} ${my2}, ${x2} ${y2}`;
      mx = arcX;
      my = (my1 + my2) / 2;
    }
  } else {
    mx = (x1 + x2) / 2;
    my = (y1 + y2) / 2;

    // Generate smooth bezier based on which sides we're connecting
    if ((fromSide === "right" && toSide === "left") || (fromSide === "left" && toSide === "right")) {
      // Horizontal flow
      d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
    } else if ((fromSide === "bottom" && toSide === "top") || (fromSide === "top" && toSide === "bottom")) {
      // Vertical flow
      d = `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
    } else {
      // Mixed (e.g., top→left, right→bottom) — use two control points
      const cp1x = fromSide === "top" || fromSide === "bottom" ? x1 : mx;
      const cp1y = fromSide === "left" || fromSide === "right" ? y1 : my;
      const cp2x = toSide === "top" || toSide === "bottom" ? x2 : mx;
      const cp2y = toSide === "left" || toSide === "right" ? y2 : my;
      d = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
    }
  }

  return { d, mx, my, x1, y1, x2, y2 };
}

/**
 * Pre-calculate port assignments for distributing connections across node edges.
 */
export function calcPortAssignments(
  connections: Array<{ from: string; to: string }>,
  _nodeIds?: string[]
): Map<string, { index: number; total: number }> {
  const incomingCounts = new Map<string, string[]>();

  for (const conn of connections) {
    if (!incomingCounts.has(conn.to)) incomingCounts.set(conn.to, []);
    incomingCounts.get(conn.to)!.push(conn.from);
  }

  const assignments = new Map<string, { index: number; total: number }>();

  for (const [targetId, sources] of incomingCounts) {
    const total = sources.length;
    sources.forEach((sourceId, index) => {
      assignments.set(`${sourceId}->${targetId}`, { index, total });
    });
  }

  return assignments;
}
