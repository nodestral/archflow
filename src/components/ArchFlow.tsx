import React, { useMemo } from "react";
import type { ArchFlowProps } from "../engine/types";
import { layoutNodes } from "../engine/layout";
import { calcPath, calcPortAssignments } from "../engine/bezier";
import { getGroupColor, THEMES } from "../themes";
import { ArchNodeRenderer } from "./ArchNode";
import { ArchConnectionRenderer, usePortAssignments } from "./ArchConnection";
import { ArchLegend } from "./ArchLegend";

/**
 * Architecture flow diagram component.
 *
 * Renders nodes and connections as SVG with auto-layout, bezier curves,
 * animated data flow dots, obstacle avoidance, and STRIDE threat indicators.
 */
export function ArchFlow({
  nodes,
  connections,
  direction = "horizontal",
  theme = "dark",
  showLegend = true,
  width: overrideW,
  height: overrideH,
  nodeGap,
  layerGap,
  nodeWidth,
  nodeHeight,
  padding,
}: ArchFlowProps) {
  const { positions, width, height } = useMemo(
    () => layoutNodes(nodes, connections, direction, { nodeGap, layerGap, nodeWidth, nodeHeight, padding }),
    [nodes, connections, direction, nodeGap, layerGap, nodeWidth, nodeHeight, padding]
  );

  // Calculate actual path bounds to account for obstacle avoidance arcs
  const pathBounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const conn of connections) {
      const fromPos = positions.get(conn.from);
      const toPos = positions.get(conn.to);
      if (!fromPos || !toPos) continue;

      const pathInfo = calcPath(fromPos, toPos, direction, positions, conn.from, conn.to);

      // Sample the bezier at multiple points to find actual bounds
      const points = sampleBezier(pathInfo);
      for (const p of points) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
    }

    // Also include node bounds
    positions.forEach((pos) => {
      if (pos.x < minX) minX = pos.x;
      if (pos.y < minY) minY = pos.y;
      if (pos.x + pos.w > maxX) maxX = pos.x + pos.w;
      if (pos.y + pos.h > maxY) maxY = pos.y + pos.h;
    });

    return { minX, minY, maxX, maxY };
  }, [connections, positions, direction]);

  const groupOrder = useMemo(() => {
    const order: string[] = [];
    for (const n of nodes) {
      if (n.group && !order.includes(n.group)) order.push(n.group);
    }
    return order;
  }, [nodes]);

  // Port assignments for distributing connections across node edges
  const portAssignments = usePortAssignments(connections);

  const colors = THEMES[theme];
  const pad = padding ?? 24;

  // Dynamic SVG dimensions based on actual content bounds
  const contentW = pathBounds.maxX - pathBounds.minX;
  const contentH = pathBounds.maxY - pathBounds.minY;
  const legendH = showLegend ? 50 : 0; // enough for 2 rows of legend

  const svgW = overrideW ?? Math.ceil(contentW + pad * 2);
  const svgH = overrideH ?? Math.ceil(contentH + pad * 2 + legendH);

  return (
    <div
      style={{
        overflowX: "auto",
        borderRadius: 8,
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        padding: 12,
      }}
    >
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        width="100%"
        style={{ maxWidth: svgW }}
      >
        {/* Connections */}
        {connections.map((conn, i) => {
          const fromPos = positions.get(conn.from);
          const toPos = positions.get(conn.to);
          if (!fromPos || !toPos) return null;
          return (
            <ArchConnectionRenderer
              key={`${conn.from}-${conn.to}-${i}`}
              connection={conn}
              fromPos={fromPos}
              toPos={toPos}
              direction={direction}
              theme={theme}
              index={i}
              allPositions={positions}
              portAssignment={portAssignments.get(`${conn.from}->${conn.to}`)}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const pos = positions.get(node.id);
          if (!pos) return null;
          const groupKey = node.group ?? "";
          const style = groupKey
            ? getGroupColor(groupKey, groupOrder)
            : { stroke: colors.border, dot: colors.textSub, dotBg: `${colors.textSub}33` };
          return (
            <ArchNodeRenderer
              key={node.id}
              node={node}
              pos={pos}
              style={style}
              theme={theme}
            />
          );
        })}

        {/* Legend — positioned at bottom, centered */}
        {showLegend && (
          <g transform={`translate(0, ${svgH - legendH})`}>
            <ArchLegend connections={connections} theme={theme} svgWidth={svgW} />
          </g>
        )}
      </svg>
    </div>
  );
}

/** Sample points along a bezier path to find bounding box */
function sampleBezier(pathInfo: { d: string; x1: number; y1: number; x2: number; y2: number }): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const steps = 20;

  for (let t = 0; t <= 1; t += 1 / steps) {
    // Simple linear interpolation for cubic bezier approximation
    // For S-curves (multi-segment), we sample the start/end and midpoint
    points.push({
      x: pathInfo.x1 + (pathInfo.x2 - pathInfo.x1) * t,
      y: pathInfo.y1 + (pathInfo.y2 - pathInfo.y1) * t,
    });
  }

  // For obstacle avoidance arcs, extend Y bounds by the arc offset
  // The arc goes 20px outside the source/target Y range
  const minY = Math.min(pathInfo.y1, pathInfo.y2);
  const maxY = Math.max(pathInfo.y1, pathInfo.y2);
  points.push({ x: (pathInfo.x1 + pathInfo.x2) / 2, y: minY - 24 });
  points.push({ x: (pathInfo.x1 + pathInfo.x2) / 2, y: maxY + 24 });

  return points;
}
