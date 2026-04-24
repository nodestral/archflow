/** Shape of a node in the diagram */
export type NodeType = "rect" | "cylinder" | "rounded" | "hexagon" | "external";

/** Direction of the flow layout */
export type FlowDirection = "horizontal" | "vertical";

/** Data flow category for connections */
export type ConnectionCategory =
  | "data"
  | "auth"
  | "control"
  | "internal"
  | "external";

/** STRIDE threat model category */
export type StrideCategory =
  | "spoofing"
  | "tampering"
  | "repudiation"
  | "information-disclosure"
  | "denial-of-service"
  | "elevation-of-privilege";

/** A node (service, database, etc.) in the architecture */
export interface ArchNode {
  /** Unique identifier */
  id: string;
  /** Display name */
  label: string;
  /** Secondary label (tech stack, version, etc.) */
  sublabel?: string;
  /** Shape of the node */
  type?: NodeType;
  /** Group key for color assignment */
  group?: string;
}

/** A connection between two nodes */
export interface ArchConnection {
  /** Source node id */
  from: string;
  /** Target node id */
  to: string;
  /** Label on the connection path */
  label?: string;
  /** Flow category — determines color and line style */
  category?: ConnectionCategory;
  /** STRIDE threat model marker — adds threat indicator */
  stride?: StrideCategory;
  /** Show animated dot traveling along path */
  animated?: boolean;
}

/** Theme configuration */
export type ArchTheme = "dark" | "light";

/** Component props */
export interface ArchFlowProps {
  /** Nodes to render */
  nodes: ArchNode[];
  /** Connections between nodes */
  connections: ArchConnection[];
  /** Layout direction */
  direction?: FlowDirection;
  /** Visual theme */
  theme?: ArchTheme;
  /** Show auto-generated legend */
  showLegend?: boolean;
  /** Override SVG width */
  width?: number;
  /** Override SVG height */
  height?: number;
  /** Gap between nodes in the same layer (px in viewBox) */
  nodeGap?: number;
  /** Gap between layers (px in viewBox) */
  layerGap?: number;
  /** Node width (px in viewBox) */
  nodeWidth?: number;
  /** Node height (px in viewBox) */
  nodeHeight?: number;
  /** Padding around the diagram (px in viewBox) */
  padding?: number;
}

/** Computed position for a node */
export interface NodePosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Computed bezier path info */
export interface PathInfo {
  /** SVG path string */
  d: string;
  /** Midpoint x */
  mx: number;
  /** Midpoint y */
  my: number;
  /** Start x */
  x1: number;
  /** Start y */
  y1: number;
  /** End x */
  x2: number;
  /** End y */
  y2: number;
}

/** Visual style for a connection category */
export interface CategoryStyle {
  stroke: string;
  dot: string;
  dotBg: string;
  dashArray?: string;
  label: string;
}

/** Visual style for a node group */
export interface GroupStyle {
  stroke: string;
  dot: string;
  dotBg: string;
}
