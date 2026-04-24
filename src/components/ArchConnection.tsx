import React from "react";
import type { ArchConnection, NodePosition, FlowDirection, ArchTheme, PathInfo } from "../engine/types";
import { calcPath } from "../engine/bezier";
import { CATEGORY_STYLES, STRIDE_STYLES, THEMES } from "../themes";

interface ArchConnectionRendererProps {
  connection: ArchConnection;
  fromPos: NodePosition;
  toPos: NodePosition;
  direction: FlowDirection;
  theme: ArchTheme;
  index: number;
}

/**
 * Renders a single connection as a bezier curve with optional animated dot and label.
 * If STRIDE is set, uses threat model styling.
 */
export function ArchConnectionRenderer({
  connection,
  fromPos,
  toPos,
  direction,
  theme,
  index,
}: ArchConnectionRendererProps) {
  const pathInfo = calcPath(fromPos, toPos, direction);

  // Determine style: STRIDE takes priority over category
  const isStride = !!connection.stride;
  const catStyle = connection.stride
    ? STRIDE_STYLES[connection.stride]
    : (connection.category ? CATEGORY_STYLES[connection.category] : CATEGORY_STYLES.data);

  if (!catStyle) return null;

  const colors = THEMES[theme];
  const strokeColor = catStyle.dotBg;
  const dotColor = catStyle.dot;
  const dur = 2.0 + index * 0.3; // Stagger animation timing

  return (
    <g>
      {/* Bezier curve */}
      <path
        d={pathInfo.d}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeDasharray={catStyle.dashArray}
      />

      {/* Endpoint dot */}
      <circle cx={pathInfo.x2} cy={pathInfo.y2} r={3} fill={dotColor} opacity={0.6} />

      {/* Label */}
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

      {/* STRIDE warning indicator */}
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

      {/* Animated dot */}
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
