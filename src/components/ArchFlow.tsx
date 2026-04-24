import React, { useMemo } from "react";
import type { ArchFlowProps } from "../engine/types";
import { layoutNodes } from "../engine/layout";
import { getGroupColor, THEMES } from "../themes";
import { ArchNodeRenderer } from "./ArchNode";
import { ArchConnectionRenderer } from "./ArchConnection";
import { ArchLegend } from "./ArchLegend";

/**
 * Architecture flow diagram component.
 *
 * Renders nodes and connections as SVG with auto-layout, bezier curves,
 * animated data flow dots, and optional STRIDE threat model indicators.
 *
 * @example
 * ```tsx
 * <ArchFlow
 *   nodes={[
 *     { id: "api", label: "API Server", group: "backend" },
 *     { id: "db", label: "PostgreSQL", type: "cylinder", group: "storage" },
 *   ]}
 *   connections={[
 *     { from: "api", to: "db", label: "SQL", category: "data" },
 *     { from: "client", to: "api", label: "JWT", category: "auth", stride: "spoofing" },
 *   ]}
 * />
 * ```
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

  // Determine group order (first appearance)
  const groupOrder = useMemo(() => {
    const order: string[] = [];
    for (const n of nodes) {
      if (n.group && !order.includes(n.group)) {
        order.push(n.group);
      }
    }
    return order;
  }, [nodes]);

  // Build node lookup
  const nodeMap = useMemo(() => {
    const map = new Map(nodes.map((n) => [n.id, n]));
    return map;
  }, [nodes]);

  const colors = THEMES[theme];
  const svgW = overrideW ?? width;
  const svgH = overrideH ?? height + (showLegend ? 30 : 0);

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
        {/* Connections (render behind nodes) */}
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
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const pos = positions.get(node.id);
          if (!pos) return null;
          const groupKey = node.group ?? "";
          const style = groupKey ? getGroupColor(groupKey, groupOrder) : { stroke: colors.border, dot: colors.textSub, dotBg: `${colors.textSub}33` };
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

        {/* Legend */}
        {showLegend && (
          <ArchLegend connections={connections} theme={theme} />
        )}
      </svg>
    </div>
  );
}
