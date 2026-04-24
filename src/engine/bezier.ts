import type { NodePosition, FlowDirection, PathInfo } from "./types";

/**
 * Calculate bezier path between two nodes.
 * Handles horizontal (left→right) and vertical (top→bottom) layouts.
 */
export function calcPath(
  from: NodePosition,
  to: NodePosition,
  direction: FlowDirection
): PathInfo {
  let x1: number, y1: number, x2: number, y2: number;

  if (direction === "horizontal") {
    if (to.x >= from.x) {
      // Left to right
      x1 = from.x + from.w;
      y1 = from.y + from.h / 2;
      x2 = to.x;
      y2 = to.y + to.h / 2;
    } else {
      // Right to left (feedback loop)
      x1 = from.x;
      y1 = from.y + from.h / 2;
      x2 = to.x + to.w;
      y2 = to.y + to.h / 2;
    }
  } else {
    if (to.y >= from.y) {
      // Top to bottom
      x1 = from.x + from.w / 2;
      y1 = from.y + from.h;
      x2 = to.x + to.w / 2;
      y2 = to.y;
    } else {
      // Bottom to top (feedback loop)
      x1 = from.x + from.w / 2;
      y1 = from.y;
      x2 = to.x + to.w / 2;
      y2 = to.y + to.h;
    }
  }

  const mx = (x1 + x2) / 2;
  const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;

  return {
    d,
    mx,
    my: (y1 + y2) / 2,
    x1,
    y1,
    x2,
    y2,
  };
}
