import React from "react";
import type { ArchConnection, ConnectionCategory, StrideCategory, ArchTheme } from "../engine/types";
import { CATEGORY_STYLES, STRIDE_STYLES, THEMES } from "../themes";

interface ArchLegendProps {
  connections: ArchConnection[];
  theme: ArchTheme;
  /** Total SVG width to center the legend within */
  svgWidth: number;
}

/**
 * Auto-generated legend showing all connection categories and STRIDE markers used.
 * Positioned at the bottom, centered horizontally.
 */
export function ArchLegend({ connections, theme, svgWidth }: ArchLegendProps) {
  const colors = THEMES[theme];

  const usedCategories = new Set<ConnectionCategory>();
  const usedStride = new Set<StrideCategory>();

  for (const c of connections) {
    if (c.category) usedCategories.add(c.category);
    if (c.stride) usedStride.add(c.stride);
  }

  if (usedCategories.size === 0 && usedStride.size === 0) {
    usedCategories.add("data");
  }

  const items: { label: string; color: string; dash?: string }[] = [];

  for (const cat of usedCategories) {
    const style = CATEGORY_STYLES[cat];
    if (style) items.push({ label: style.label, color: style.dot, dash: style.dashArray });
  }

  for (const s of usedStride) {
    const style = STRIDE_STYLES[s];
    if (style) items.push({ label: `⚠ ${style.label}`, color: style.dot, dash: style.dashArray });
  }

  if (items.length === 0) return null;

  // Estimate item widths: 20px line + 4px gap + ~7px per char + 12px spacing between items
  const ITEM_SPACING = 16;
  const itemWidths = items.map((item) => 20 + 4 + item.label.length * 7);
  const totalLegendW = itemWidths.reduce((a, b) => a + b, 0) + (items.length - 1) * ITEM_SPACING;

  // Center legend within SVG width
  const startX = Math.max(8, (svgWidth - totalLegendW) / 2);

  // Build x positions
  const positions: number[] = [];
  let cx = startX;
  for (let i = 0; i < items.length; i++) {
    positions.push(cx);
    cx += itemWidths[i] + ITEM_SPACING;
  }

  return (
    <g>
      {/* Separator line */}
      <line
        x1={startX}
        y1={0}
        x2={startX + totalLegendW}
        y2={0}
        stroke={colors.border}
        strokeWidth={0.5}
      />
      {items.map((item, i) => (
        <g key={i} transform={`translate(${positions[i]}, 16)`}>
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
      ))}
    </g>
  );
}
