import type { ConnectionCategory, CategoryStyle, GroupStyle } from "../engine/types";

export type { GroupStyle, CategoryStyle };

/**
 * Visual styles for connection categories.
 */
export const CATEGORY_STYLES: Record<ConnectionCategory, CategoryStyle> = {
  data: {
    stroke: "rgba(96,165,250,0.5)",
    dot: "#60a5fa",
    dotBg: "rgba(96,165,250,0.25)",
    label: "Data Flow",
  },
  auth: {
    stroke: "rgba(52,211,153,0.5)",
    dot: "#34d399",
    dotBg: "rgba(52,211,153,0.25)",
    label: "Auth",
  },
  control: {
    stroke: "rgba(192,132,252,0.5)",
    dot: "#c084fc",
    dotBg: "rgba(192,132,252,0.25)",
    dashArray: "6 3",
    label: "Control",
  },
  internal: {
    stroke: "rgba(148,163,184,0.4)",
    dot: "#94a3b8",
    dotBg: "rgba(148,163,184,0.2)",
    label: "Internal",
  },
  external: {
    stroke: "rgba(251,191,36,0.5)",
    dot: "#fbbf24",
    dotBg: "rgba(251,191,36,0.25)",
    dashArray: "4 4",
    label: "External",
  },
};

/**
 * STRIDE threat model styles.
 * All red-toned but distinguishable.
 */
export const STRIDE_STYLES: Record<string, CategoryStyle> = {
  spoofing: {
    stroke: "rgba(239,68,68,0.5)",
    dot: "#ef4444",
    dotBg: "rgba(239,68,68,0.2)",
    label: "S — Spoofing",
  },
  tampering: {
    stroke: "rgba(249,115,22,0.5)",
    dot: "#f97316",
    dotBg: "rgba(249,115,22,0.2)",
    label: "T — Tampering",
  },
  repudiation: {
    stroke: "rgba(234,179,8,0.5)",
    dot: "#eab308",
    dotBg: "rgba(234,179,8,0.2)",
    label: "R — Repudiation",
  },
  "information-disclosure": {
    stroke: "rgba(168,85,247,0.5)",
    dot: "#a855f7",
    dotBg: "rgba(168,85,247,0.2)",
    label: "I — Info Disclosure",
  },
  "denial-of-service": {
    stroke: "rgba(236,72,153,0.5)",
    dot: "#ec4899",
    dotBg: "rgba(236,72,153,0.2)",
    label: "D — Denial of Service",
  },
  "elevation-of-privilege": {
    stroke: "rgba(244,63,94,0.5)",
    dot: "#f43f5e",
    dotBg: "rgba(244,63,94,0.2)",
    label: "E — Elevation of Privilege",
  },
};

/**
 * Default node group colors.
 * Cycles through these based on group index.
 */
export const DEFAULT_GROUP_COLORS: GroupStyle[] = [
  { stroke: "rgba(96,165,250,0.5)", dot: "#60a5fa", dotBg: "rgba(96,165,250,0.25)" },
  { stroke: "rgba(52,211,153,0.5)", dot: "#34d399", dotBg: "rgba(52,211,153,0.25)" },
  { stroke: "rgba(251,191,36,0.5)", dot: "#fbbf24", dotBg: "rgba(251,191,36,0.25)" },
  { stroke: "rgba(192,132,252,0.5)", dot: "#c084fc", dotBg: "rgba(192,132,252,0.25)" },
  { stroke: "rgba(251,113,133,0.5)", dot: "#fb7185", dotBg: "rgba(251,113,133,0.25)" },
  { stroke: "rgba(56,189,248,0.5)", dot: "#38bdf8", dotBg: "rgba(56,189,248,0.25)" },
  { stroke: "rgba(45,212,191,0.5)", dot: "#2dd4bf", dotBg: "rgba(45,212,191,0.25)" },
  { stroke: "rgba(253,186,116,0.5)", dot: "#fdba74", dotBg: "rgba(253,186,116,0.25)" },
];

/**
 * Theme-specific colors.
 */
export const THEMES = {
  dark: {
    bg: "#020617",     // slate-950
    text: "#e2e8f0",   // slate-200
    textSub: "#94a3b8", // slate-400
    nodeFill: "rgba(255,255,255,0.03)",
    border: "rgba(148,163,184,0.15)",
  },
  light: {
    bg: "#ffffff",
    text: "#1e293b",   // slate-800
    textSub: "#64748b", // slate-500
    nodeFill: "rgba(0,0,0,0.02)",
    border: "rgba(148,163,184,0.3)",
  },
};

/**
 * Get group color by group key. Assigns colors to groups in order of first appearance.
 */
export function getGroupColor(
  groupKey: string,
  groupOrder: string[]
): GroupStyle {
  const idx = groupOrder.indexOf(groupKey);
  return DEFAULT_GROUP_COLORS[idx % DEFAULT_GROUP_COLORS.length];
}
