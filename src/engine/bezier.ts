import type { NodePosition, FlowDirection, PathInfo } from "./types";

type PortSide = "top" | "bottom" | "left" | "right";

interface PortAssignment {
  x: number;
  y: number;
  side: PortSide;
}

/**
 * Get the position of a port on a node's edge.
 */
function getPortPos(pos: NodePosition, side: PortSide, index: number, total: number): PortAssignment {
  const { x, y, w, h } = pos;
  const cx = x + w / 2;
  const cy = y + h / 2;

  // Distribute multiple ports along the edge
  const spread = Math.max(0, (total - 1) * 10);
  const offset = total > 1 ? (index - (total - 1) / 2) * (spread / (total - 1)) : 0;

  switch (side) {
    case "left":
      return { x, y: cy + offset, side: "left" };
    case "right":
      return { x: x + w, y: cy + offset, side: "right" };
    case "top":
      return { x: cx + offset, y, side: "top" };
    case "bottom":
      return { x: cx + offset, y: y + h, side: "bottom" };
  }
}

/**
 * Assign connection ports to each node.
 * Distributes connections evenly across available edges.
 */
function assignPorts(
  connections: Array<{ from: string; to: string }>,
  nodeIds: string[],
  direction: FlowDirection
): Map<string, Map<string, PortAssignment>> {
  // Count outgoing and incoming per node
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  for (const id of nodeIds) {
    outgoing.set(id, []);
    incoming.set(id, []);
  }

  for (const conn of connections) {
    outgoing.get(conn.from)?.push(conn.to);
    incoming.get(conn.to)?.push(conn.from);
  }

  // Assign ports: result is Map<nodeId, Map<connectedNodeId, PortAssignment>>
  const ports = new Map<string, Map<string, PortAssignment>>();

  for (const nodeId of nodeIds) {
    const nodePorts = new Map<string, PortAssignment>();

    // Outgoing connections
    const outs = outgoing.get(nodeId) ?? [];
    const outSide: PortSide = direction === "horizontal" ? "right" : "bottom";
    outs.forEach((targetId, i) => {
      nodePorts.set(`${nodeId}->${targetId}`, getPortPos(
        { x: 0, y: 0, w: 0, h: 0 }, // placeholder, real pos filled later
        outSide, i, outs.length
      ));
    });

    // Incoming connections
    const ins = incoming.get(nodeId) ?? [];
    const inSide: PortSide = direction === "horizontal" ? "left" : "top";
    ins.forEach((sourceId, i) => {
      nodePorts.set(`${sourceId}->${nodeId}`, getPortPos(
        { x: 0, y: 0, w: 0, h: 0 },
        inSide, i, ins.length
      ));
    });

    ports.set(nodeId, nodePorts);
  }

  return ports;
}

/**
 * Check if a straight-ish path between two points would cross a node.
 */
function wouldCrossNode(
  x1: number, y1: number,
  x2: number, y2: number,
  node: NodePosition
): boolean {
  const pad = 10;
  const minY = Math.min(y1, y2) - 6;
  const maxY = Math.max(y1, y2) + 6;
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
 * Calculate bezier path between two nodes with port-based routing and obstacle avoidance.
 */
export function calcPath(
  from: NodePosition,
  to: NodePosition,
  direction: FlowDirection,
  allPositions?: Map<string, NodePosition>,
  fromId?: string,
  toId?: string,
  // Port index for distributing multiple connections
  fromPortIndex?: number,
  fromPortTotal?: number,
  toPortIndex?: number,
  toPortTotal?: number,
): PathInfo {
  // Determine connection sides based on layout direction
  const isForward = direction === "horizontal"
    ? to.x >= from.x
    : to.y >= from.y;

  let fromSide: PortSide, toSide: PortSide;

  if (direction === "horizontal") {
    fromSide = isForward ? "right" : "left";
    toSide = isForward ? "left" : "right";
  } else {
    fromSide = isForward ? "bottom" : "top";
    toSide = isForward ? "top" : "bottom";
  }

  // Get port positions with distribution
  const fromPort = getPortPos(from, fromSide, fromPortIndex ?? 0, fromPortTotal ?? 1);
  const toPort = getPortPos(to, toSide, toPortIndex ?? 0, toPortTotal ?? 1);

  let x1 = fromPort.x, y1 = fromPort.y;
  let x2 = toPort.x, y2 = toPort.y;

  // Obstacle avoidance
  let needsReroute = false;
  let obsTop = Infinity, obsBottom = -Infinity;

  if (allPositions) {
    for (const [id, pos] of allPositions) {
      if (id === fromId || id === toId) continue;
      if (wouldCrossNode(x1, y1, x2, y2, pos)) {
        needsReroute = true;
        if (pos.y < obsTop) obsTop = pos.y;
        if (pos.y + pos.h > obsBottom) obsBottom = pos.y + pos.h;
      }
    }
  }

  let d: string;
  let mx: number;
  let my: number;

  if (needsReroute && direction === "horizontal") {
    const obsMidY = (obsTop + obsBottom) / 2;
    const routeAbove = y1 <= obsMidY && y2 <= obsMidY;
    const arcY = routeAbove ? obsTop - 24 : obsBottom + 24;

    const mx1 = x1 + (x2 - x1) * 0.3;
    const mx2 = x1 + (x2 - x1) * 0.7;

    // S-curve through the arc point
    d = `M ${x1} ${y1} C ${mx1} ${y1}, ${mx1} ${arcY}, ${(mx1 + mx2) / 2} ${arcY} S ${mx2} ${y2}, ${x2} ${y2}`;
    mx = (mx1 + mx2) / 2;
    my = arcY;
  } else {
    mx = (x1 + x2) / 2;
    my = (y1 + y2) / 2;

    if (direction === "horizontal") {
      d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
    } else {
      d = `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
    }
  }

  return { d, mx, my, x1, y1, x2, y2 };
}

/**
 * Calculate all port assignments for a set of connections and nodes.
 * Returns a map of connection keys to port index info.
 */
export function calcPortAssignments(
  connections: Array<{ from: string; to: string }> |
  Array<{ from: string; to: string; label?: string; category?: string; stride?: string; animated?: boolean }>,
  _nodeIds?: string[]
): Map<string, { index: number; total: number }> {
  // Count incoming per target node
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
