import React from "react";
import type { ArchConnection, ConnectionCategory, StrideCategory, ArchTheme } from "../engine/types";
import { CATEGORY_STYLES, STRIDE_STYLES, THEMES } from "../themes";

interface ArchLegendProps {
  connections: ArchConnection[];
  theme: ArchTheme;
}

/**
 * Auto-generated legend showing all connection categories and STRIDE markers used.
 */
export function ArchLegend({ connections, theme }: ArchLegendProps) {
  const colors = THEMES[theme];

  // Collect unique categories and stride markers
  const usedCategories = new Set<ConnectionCategory>();
  const usedStride = new Set<StrideCategory>();

  for (const c of connections) {
    if (c.category) usedCategories.add(c.category);
    if (c.stride) usedStride.add(c.stride);
  }

  // If no explicit categories, default to "data"
  if (usedCategories.size === 0 && usedStride.size === 0) {
    usedCategories.add("data");
  }

  const items: { label: string; color: string; dash?: string; isStride: boolean }[] = [];

  for (const cat of usedCategories) {
    const style = CATEGORY_STYLES[cat];
    if (style) items.push({ label: style.label, color: style.dot, dash: style.dashArray, isStride: false });
  }

  for (const s of usedStride) {
    const style = STRIDE_STYLES[s];
    if (style) items.push({ label: `⚠ ${style.label}`, color: style.dot, dash: style.dashArray, isStride: true });
  }

  if (items.length === 0) return null;

  return (
    <g transform={`translate(0, 10)`}>
      {items.map((item, i) => {
        const x = i * 100;
        return (
          <g key={i} transform={`translate(${x}, 0)`}>
            <line
              x1={0} y1={0} x2={20} y2={0}
              stroke={item.color}
              strokeWidth={2}
              strokeDasharray={item.dash}
              opacity={0.7}
            />
            <text
              x={26}
              y={3}
              fontSize={9}
              fontFamily="monospace"
              fill={colors.textSub}
              opacity={0.8}
            >
              {item.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}
