import React from "react";
import type { ArchNode, NodePosition, ArchTheme } from "../engine/types";
import { GroupStyle, THEMES } from "../themes";

interface ArchNodeRendererProps {
  node: ArchNode;
  pos: NodePosition;
  style: GroupStyle;
  theme: ArchTheme;
}

/**
 * Renders a single node as SVG shapes.
 * Supports rect, cylinder, rounded, hexagon, and external types.
 */
export function ArchNodeRenderer({ node, pos, style, theme }: ArchNodeRendererProps) {
  const colors = THEMES[theme];
  const { x, y, w, h } = pos;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const type = node.type ?? "rect";

  const textY = node.sublabel ? y + h / 2 - 3 : y + h / 2 + 4;
  const subY = node.sublabel ? y + h / 2 + 12 : 0;

  return (
    <g>
      {type === "cylinder" ? renderCylinder(x, y, w, h, style, colors) :
       type === "hexagon" ? renderHexagon(cx, cy, w, h, style, colors) :
       type === "rounded" ? renderRounded(x, y, w, h, style, colors) :
       type === "external" ? renderExternal(x, y, w, h, style, colors) :
       renderRect(x, y, w, h, style, colors)}

      {/* Label */}
      <text
        x={cx}
        y={textY}
        textAnchor="middle"
        fontSize={11}
        fontWeight="600"
        fontFamily="monospace"
        fill={colors.text}
      >
        {node.label}
      </text>

      {/* Sublabel */}
      {node.sublabel && (
        <text
          x={cx}
          y={subY}
          textAnchor="middle"
          fontSize={9}
          fontFamily="monospace"
          fill={style.dot}
          opacity={0.8}
        >
          {node.sublabel}
        </text>
      )}
    </g>
  );
}

function renderRect(x: number, y: number, w: number, h: number, style: GroupStyle, colors: typeof THEMES.dark) {
  return (
    <rect
      x={x} y={y} width={w} height={h} rx={5}
      fill={colors.nodeFill}
      stroke={style.stroke}
      strokeWidth={1}
    />
  );
}

function renderCylinder(x: number, y: number, w: number, h: number, style: GroupStyle, colors: typeof THEMES.dark) {
  const ry = 6;
  return (
    <g>
      <ellipse cx={x + w / 2} cy={y + ry} rx={w / 2} ry={ry} fill={colors.nodeFill} stroke={style.stroke} strokeWidth={1} />
      <rect x={x} y={y + ry} width={w} height={h - ry * 2} fill={colors.nodeFill} stroke="none" />
      <line x1={x} y1={y + ry} x2={x} y2={y + h - ry} stroke={style.stroke} strokeWidth={1} />
      <line x1={x + w} y1={y + ry} x2={x + w} y2={y + h - ry} stroke={style.stroke} strokeWidth={1} />
      <ellipse cx={x + w / 2} cy={y + h - ry} rx={w / 2} ry={ry} fill={colors.nodeFill} stroke={style.stroke} strokeWidth={1} />
    </g>
  );
}

function renderRounded(x: number, y: number, w: number, h: number, style: GroupStyle, colors: typeof THEMES.dark) {
  return (
    <rect
      x={x} y={y} width={w} height={h} rx={16}
      fill={colors.nodeFill}
      stroke={style.stroke}
      strokeWidth={1}
    />
  );
}

function renderExternal(x: number, y: number, w: number, h: number, style: GroupStyle, colors: typeof THEMES.dark) {
  return (
    <rect
      x={x} y={y} width={w} height={h} rx={5}
      fill={colors.nodeFill}
      stroke={style.stroke}
      strokeWidth={1}
      strokeDasharray="4 3"
    />
  );
}

function renderHexagon(cx: number, cy: number, w: number, h: number, style: GroupStyle, colors: typeof THEMES.dark) {
  const rx = w / 2;
  const ry = h / 2;
  const points = [
    `${cx - rx * 0.75},${cy - ry}`,
    `${cx + rx * 0.75},${cy - ry}`,
    `${cx + rx},${cy}`,
    `${cx + rx * 0.75},${cy + ry}`,
    `${cx - rx * 0.75},${cy + ry}`,
    `${cx - rx},${cy}`,
  ].join(" ");
  return <polygon points={points} fill={colors.nodeFill} stroke={style.stroke} strokeWidth={1} />;
}
