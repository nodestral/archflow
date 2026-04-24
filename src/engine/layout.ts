import type { ArchNode, ArchConnection, NodePosition, FlowDirection } from "./types";

const DEFAULT_NODE_W = 110;
const DEFAULT_NODE_H = 44;
const DEFAULT_NODE_GAP = 20;
const DEFAULT_LAYER_GAP = 70;
const DEFAULT_PADDING = 24;

/**
 * Auto-layout engine using topological sort.
 * Assigns layers based on longest path from root nodes,
 * then positions nodes within each layer.
 */
export function layoutNodes(
  nodes: ArchNode[],
  connections: ArchConnection[],
  direction: FlowDirection,
  opts?: {
    nodeGap?: number;
    layerGap?: number;
    nodeWidth?: number;
    nodeHeight?: number;
    padding?: number;
  }
): { positions: Map<string, NodePosition>; width: number; height: number } {
  const nodeGap = opts?.nodeGap ?? DEFAULT_NODE_GAP;
  const layerGap = opts?.layerGap ?? DEFAULT_LAYER_GAP;
  const nw = opts?.nodeWidth ?? DEFAULT_NODE_W;
  const nh = opts?.nodeHeight ?? DEFAULT_NODE_H;
  const pad = opts?.padding ?? DEFAULT_PADDING;

  const idSet = new Set(nodes.map((n) => n.id));

  // Build adjacency and in-degree
  const outEdges = new Map<string, string[]>();
  const inEdges = new Map<string, string[]>();
  for (const n of nodes) {
    outEdges.set(n.id, []);
    inEdges.set(n.id, []);
  }
  for (const c of connections) {
    if (idSet.has(c.from) && idSet.has(c.to)) {
      outEdges.get(c.from)?.push(c.to);
      inEdges.get(c.to)?.push(c.from);
    }
  }

  // Assign layers via longest path from roots
  const layers = new Map<string, number>();
  const rootNodes = nodes.filter((n) => (inEdges.get(n.id)?.length ?? 0) === 0);

  // BFS to assign layers
  function assignLayer(nodeId: string, currentLayer: number): void {
    const existing = layers.get(nodeId);
    if (existing !== undefined && existing >= currentLayer) return;
    layers.set(nodeId, currentLayer);
    for (const next of outEdges.get(nodeId) ?? []) {
      assignLayer(next, currentLayer + 1);
    }
  }

  // Start from all roots
  for (const root of rootNodes) {
    assignLayer(root.id, 0);
  }

  // Handle nodes with no connections (isolated) — put them in layer 0
  for (const n of nodes) {
    if (!layers.has(n.id)) {
      layers.set(n.id, 0);
    }
  }

  // Group nodes by layer
  const layerGroups = new Map<number, string[]>();
  for (const [id, layer] of layers) {
    if (!layerGroups.has(layer)) layerGroups.set(layer, []);
    layerGroups.get(layer)!.push(id);
  }

  // Sort layers
  const sortedLayers = Array.from(layerGroups.entries()).sort(([a], [b]) => a - b);

  // Within each layer, sort by connection count (most connected = center)
  function connectionCount(id: string): number {
    return (outEdges.get(id)?.length ?? 0) + (inEdges.get(id)?.length ?? 0);
  }

  for (const [, ids] of sortedLayers) {
    ids.sort((a, b) => connectionCount(b) - connectionCount(a));
  }

  // Calculate positions
  const positions = new Map<string, NodePosition>();
  let maxLayerSize = 0;

  for (const [, ids] of sortedLayers) {
    if (ids.length > maxLayerSize) maxLayerSize = ids.length;
  }

  for (const [layerIdx, ids] of sortedLayers) {
    const totalW = ids.length * nw + (ids.length - 1) * nodeGap;
    const totalH = ids.length * nh + (ids.length - 1) * nodeGap;

    for (let i = 0; i < ids.length; i++) {
      if (direction === "horizontal") {
        const x = pad + layerIdx * (nw + layerGap);
        const y = pad + i * (nh + nodeGap) + (maxLayerSize * (nh + nodeGap) - totalH) / 2;
        positions.set(ids[i], { x, y, w: nw, h: nh });
      } else {
        const x = pad + i * (nw + nodeGap) + (maxLayerSize * (nw + nodeGap) - totalW) / 2;
        const y = pad + layerIdx * (nh + layerGap);
        positions.set(ids[i], { x, y, w: nw, h: nh });
      }
    }
  }

  const numLayers = sortedLayers.length;
  let width: number;
  let height: number;

  if (direction === "horizontal") {
    width = pad * 2 + numLayers * nw + (numLayers - 1) * layerGap;
    height = pad * 2 + maxLayerSize * nh + (maxLayerSize - 1) * nodeGap;
  } else {
    width = pad * 2 + maxLayerSize * nw + (maxLayerSize - 1) * nodeGap;
    height = pad * 2 + numLayers * nh + (numLayers - 1) * layerGap;
  }

  return { positions, width, height };
}
