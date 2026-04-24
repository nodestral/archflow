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

  // Estimate item widths: 20px line + 4px gap + ~7px per char + spacing
  const ITEM_SPACING = 20;
  const itemWidths = items.map((item) => 20 + 4 + item.label.length * 7);
  const totalLegendW = itemWidths.reduce((a, b) => a + b, 0) + (items.length - 1) * ITEM_SPACING;

  // Available width
  const maxLineWidth = svgWidth - 16; // 8px padding each side

  // Wrap items into rows
  const rows: { label: string; color: string; dash?: string }[][] = [];
  let currentRow: typeof items = [];
  let currentRowW = 0;

  for (let i = 0; i < items.length; i++) {
    const itemW = itemWidths[i];
    if (currentRow.length > 0 && currentRowW + ITEM_SPACING + itemW > maxLineWidth) {
      rows.push(currentRow);
      currentRow = [];
      currentRowW = 0;
    }
    currentRow.push(items[i]);
    currentRowW += itemW;
    if (currentRow.length === 1) currentRowW = itemW;
    else currentRowW += ITEM_SPACING + itemW - (currentRowW - ITEM_SPACING);
  }
  if (currentRow.length > 0) rows.push(currentRow);

  const ROW_HEIGHT = 22;
  const legendHeight = rows.length * ROW_HEIGHT;

  return (
    <g>
      {rows.map((row, rowIdx) => {
        const rowW = row.reduce((sum, _, i) => sum + itemWidths[items.indexOf(row[i])] + (i > 0 ? ITEM_SPACING : 0), 0);
        const rowStartX = Math.max(8, (svgWidth - rowW) / 2);
        let cx = rowStartX;

        return (
          <g key={rowIdx} transform={`translate(0, ${rowIdx * ROW_HEIGHT})`}>
            {rowIdx === 0 && (
              <line
                x1={8}
                y1={-6}
                x2={svgWidth - 8}
                y2={-6}
                stroke={colors.border}
                strokeWidth={0.5}
              />
            )}
            {row.map((item) => {
              const itemIdx = items.indexOf(item);
              const x = cx;
              cx += itemWidths[itemIdx] + ITEM_SPACING;
              return (
                <g key={itemIdx} transform={`translate(${x}, 6)`}>
                  <line
                    x1={0} y1={0} x2={20} y2={0}
                    stroke={item.color}
                    strokeWidth={2}
                    strokeDasharray={item.dash}
                    opacity={0.7}
                  />
                  <text
                    x={26}
                    y={4}
                    fontSize={10}
                    fontFamily="monospace"
                    fill={colors.textSub}
                    opacity={0.85}
                  >
                    {item.label}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}
