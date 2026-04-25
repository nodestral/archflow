import type { NodePosition, FlowDirection, PathInfo } from "../engine/types";

type PortSide = "top" | "bottom" | "left" | "right";

interface PortInfo {
  side: PortSide;
  index: number;  // position within connections on this side
  total: number;  // total connections on this side
}

/**
 * Get a point on a node's edge. Distributes multiple ports evenly along the edge.
 * The usable area is 80% of the edge length, centered.
 */
function getPort(pos: NodePosition, side: PortSide, index: number, total: number): { x: number; y: number } {
  const { x, y, w, h } = pos;
  const cx = x + w / 2;
  const cy = y + h / 2;

  // Usable range: 80% of edge, centered
  const usable = (side === "left" || side === "right") ? h * 0.7 : w * 0.7;
  let offset: number;

  if (total <= 1) {
    offset = 0;
  } else {
    offset = -usable / 2 + (index / (total - 1)) * usable;
  }

  switch (side) {
    case "left":   return { x, y: cy + offset };
    case "right":  return { x: x + w, y: cy + offset };
    case "top":    return { x: cx + offset, y };
    case "bottom": return { x: cx + offset, y: y + h };
  }
}

/**
 * Determine exit side from source node and entry side to target node
 * based on their relative positions in the layout.
 */
function pickSides(
  from: NodePosition,
  to: NodePosition,
  direction: FlowDirection
): { fromSide: PortSide; toSide: PortSide } {
  const fromCx = from.x + from.w / 2;
  const fromCy = from.y + from.h / 2;
  const toCx = to.x + to.w / 2;
  const toCy = to.y + to.h / 2;

  const dx = toCx - fromCx;
  const dy = toCy - fromCy;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (direction === "horizontal") {
    // If vertical offset is significant (>30% of horizontal, with minimum), route vertically
    if (absDy > absDx * 0.3 && absDy > 10) {
      if (dy < 0) return { fromSide: "top", toSide: "bottom" };
      else return { fromSide: "bottom", toSide: "top" };
    }
    if (dx >= 0) return { fromSide: "right", toSide: "left" };
    else return { fromSide: "left", toSide: "right" };
  } else {
    if (absDx > absDy * 0.3 && absDx > 10) {
      if (dx < 0) return { fromSide: "left", toSide: "right" };
      else return { fromSide: "right", toSide: "left" };
    }
    if (dy >= 0) return { fromSide: "bottom", toSide: "top" };
    else return { fromSide: "top", toSide: "bottom" };
  }
}

/**
 * Check if a direct path between two points would cross a node.
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
 * Build port assignments: for each connection, determine which side it exits/enters
 * and its position among other connections on that same side of that node.
 */
export function calcPortAssignments(
  connections: Array<{ from: string; to: string }>,
  allPositions?: Map<string, NodePosition>,
  direction?: FlowDirection,
): Map<string, PortInfo> {
  const assignments = new Map<string, PortInfo>();

  // Group connections by (nodeId, side) to count and index
  const outgoing = new Map<string, Array<{ connIdx: number; side: PortSide }>>();
  const incoming = new Map<string, Array<{ connIdx: number; side: PortSide }>>();

  connections.forEach((conn, connIdx) => {
    const fromPos = allPositions?.get(conn.from);
    const toPos = allPositions?.get(conn.to);
    if (!fromPos || !toPos || !direction) return;

    const { fromSide, toSide } = pickSides(fromPos, toPos, direction);

    const outKey = `${conn.from}|${fromSide}`;
    if (!outgoing.has(outKey)) outgoing.set(outKey, []);
    outgoing.get(outKey)!.push({ connIdx, side: fromSide });

    const inKey = `${conn.to}|${toSide}`;
    if (!incoming.has(inKey)) incoming.set(inKey, []);
    incoming.get(inKey)!.push({ connIdx, side: toSide });
  });

  // Assign indices
  for (const [, entries] of outgoing) {
    entries.forEach((entry, index) => {
      const key = `out-${entry.connIdx}`;
      assignments.set(key, { side: entry.side, index, total: entries.length });
    });
  }
  for (const [, entries] of incoming) {
    entries.forEach((entry, index) => {
      const key = `in-${entry.connIdx}`;
      assignments.set(key, { side: entry.side, index, total: entries.length });
    });
  }

  return assignments;
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
  fromPortInfo?: PortInfo,
  toPortInfo?: PortInfo,
): PathInfo {
  const { fromSide, toSide } = pickSides(from, to, direction);

  // Use provided port info, or default to center of the chosen side
  const fp = fromPortInfo
    ? getPort(from, fromPortInfo.side, fromPortInfo.index, fromPortInfo.total)
    : getPort(from, fromSide, 0, 1);
  const tp = toPortInfo
    ? getPort(to, toPortInfo.side, toPortInfo.index, toPortInfo.total)
    : getPort(to, toSide, 0, 1);

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
    const obsMidY = (obsTop + obsBottom) / 2;
    const obsMidX = (obsLeft + obsRight) / 2;

    if (direction === "horizontal") {
      const routeAbove = y1 <= obsMidY && y2 <= obsMidY;
      const arcY = routeAbove ? obsTop - 28 : obsBottom + 28;
      const mx1 = x1 + (x2 - x1) * 0.25;
      const mx2 = x1 + (x2 - x1) * 0.75;
      d = `M ${x1} ${y1} C ${mx1} ${y1}, ${mx1} ${arcY}, ${(mx1 + mx2) / 2} ${arcY} S ${mx2} ${y2}, ${x2} ${y2}`;
      mx = (mx1 + mx2) / 2;
      my = arcY;
    } else {
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

    if ((fromSide === "right" && toSide === "left") || (fromSide === "left" && toSide === "right")) {
      d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
    } else if ((fromSide === "bottom" && toSide === "top") || (fromSide === "top" && toSide === "bottom")) {
      d = `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
    } else {
      const cp1x = fromSide === "top" || fromSide === "bottom" ? x1 : mx;
      const cp1y = fromSide === "left" || fromSide === "right" ? y1 : my;
      const cp2x = toSide === "top" || toSide === "bottom" ? x2 : mx;
      const cp2y = toSide === "left" || toSide === "right" ? y2 : my;
      d = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
    }
  }

  return { d, mx, my, x1, y1, x2, y2 };
}
