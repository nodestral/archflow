import React, { useMemo } from "react";
import type { ArchConnection, NodePosition, FlowDirection, ArchTheme } from "../engine/types";
import { calcPath, calcPortAssignments } from "../engine/bezier";
import { CATEGORY_STYLES, STRIDE_STYLES } from "../themes";

interface ArchConnectionRendererProps {
  connection: ArchConnection;
  fromPos: NodePosition;
  toPos: NodePosition;
  direction: FlowDirection;
  theme: ArchTheme;
  index: number;
  allPositions?: Map<string, NodePosition>;
  portAssignment?: { index: number; total: number };
}

/**
 * Renders a single connection as a bezier curve with port-based routing,
 * optional animated dot, label, and STRIDE threat indicator.
 */
export function ArchConnectionRenderer({
  connection,
  fromPos,
  toPos,
  direction,
  theme,
  index,
  allPositions,
  portAssignment,
}: ArchConnectionRendererProps) {
  const pathInfo = calcPath(
    fromPos,
    toPos,
    direction,
    allPositions,
    connection.from,
    connection.to,
    portAssignment?.index,
    portAssignment?.total,
  );

  const isStride = !!connection.stride;
  const catStyle = connection.stride
    ? STRIDE_STYLES[connection.stride]
    : (connection.category ? CATEGORY_STYLES[connection.category] : CATEGORY_STYLES.data);

  if (!catStyle) return null;

  const strokeColor = catStyle.dotBg;
  const dotColor = catStyle.dot;
  const dur = 2.0 + index * 0.3;

  return (
    <g>
      <path
        d={pathInfo.d}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeDasharray={catStyle.dashArray}
      />
      <circle cx={pathInfo.x2} cy={pathInfo.y2} r={3} fill={dotColor} opacity={0.6} />

      {connection.label && (
        <text
          x={pathInfo.mx}
          y={pathInfo.my - 7}
          textAnchor="middle"
          fontSize={10}
          fontFamily="monospace"
          fill={dotColor}
          opacity={0.7}
        >
          {connection.label}
        </text>
      )}

      {isStride && (
        <text
          x={pathInfo.mx + 24}
          y={pathInfo.my - 2}
          textAnchor="middle"
          fontSize={9}
          fontFamily="monospace"
          fill={dotColor}
          opacity={0.9}
        >
          ⚠
        </text>
      )}

      {connection.animated !== false && (
        <circle r={2.2} fill={dotColor} opacity={0.85}>
          <animateMotion
            dur={`${dur}s`}
            repeatCount="indefinite"
            path={pathInfo.d}
          />
        </circle>
      )}
    </g>
  );
}

/**
 * Pre-calculate port assignments for all connections.
 */
export function usePortAssignments(
  connections: ArchConnection[]
): Map<string, { index: number; total: number }> {
  return useMemo(
    () => calcPortAssignments(connections),
    [connections]
  );
}
