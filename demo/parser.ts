import type { ArchNode, ArchConnection, FlowDirection, ConnectionCategory } from "../src/engine/types";

export interface ParseResult {
  direction: FlowDirection;
  nodes: ArchNode[];
  connections: ArchConnection[];
  error?: string;
}

// Map Mermaid node shapes to archflow types
function shapeToType(open: string, close: string): ArchNode["type"] {
  if (open === "[" && close === "]") return "rect";
  if (open === "(" && close === ")") return "rounded";
  if (open === "{" && close === "}") return "hexagon";
  if (open === "[" && close === "]") {
    // Can't distinguish from rect without checking for [( and )]
    return "rect";
  }
  if (open === "(" && close === ")") return "rounded";
  return "rect";
}

// Extract node shape and label from Mermaid syntax
// Examples: A[Label], A(Label), A{Label}, A[(Label)], A[[Label]], A[/>Label]
function parseNodeDef(token: string): { id: string; label: string; type: ArchNode["type"] } | null {
  // Pattern: ID followed by shape brackets
  const match = token.match(/^([A-Za-z0-9_-]+)\s*(\[([\s\S]*?)\]|\(([\s\S]*?)\)|\{([\s\S]*?)\}|(\[([\s\S]*?)\]\)|(\[\[([\s\S]*?)\]\)|\[\/([\s\S]*?)\/\])$/);
  if (!match) return null;

  const id = match[1];

  // Extract label and determine type
  if (match[3] !== undefined) {
    // [Label] — check if it's [(Label)] or [[Label]] or [/>Label]
    const fullShape = token.slice(id.length).trim();
    if (fullShape.startsWith("[(") && fullShape.endsWith(")]")) {
      return { id, label: match[3].trim(), type: "cylinder" };
    }
    if (fullShape.startsWith("[[") && fullShape.endsWith("]]")) {
      return { id, label: match[3].trim(), type: "rounded" };
    }
    if (fullShape.startsWith("[>") || fullShape.startsWith("[/")) {
      return { id, label: match[3].trim(), type: "external" };
    }
    return { id, label: match[3].trim(), type: "rect" };
  }
  if (match[4] !== undefined) {
    // (Label) — rounded
    return { id, label: match[4].trim(), type: "rounded" };
  }
  if (match[5] !== undefined) {
    // {Label} — hexagon
    return { id, label: match[5].trim(), type: "hexagon" };
  }

  return null;
}

// Simple node reference: just an ID (no brackets)
function parseNodeRef(token: string): string | null {
  const trimmed = token.trim();
  if (/^[A-Za-z0-9_-]+$/.test(trimmed)) return trimmed;
  return null;
}

// Map connection style to category
function lineToCategory(line: string): ConnectionCategory {
  if (line.includes("-.") || line.includes(".-")) return "external";
  if (line.includes("===")) return "control";
  return "data";
}

export function parseMermaid(input: string): ParseResult {
  const lines = input.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("%%"));

  // Find direction
  let direction: FlowDirection = "horizontal";
  const dirMatch = lines[0]?.match(/flowchart\s+(LR|RL|TB|BT|TD)/i);
  if (dirMatch) {
    const d = dirMatch[1].toUpperCase();
    direction = (d === "LR" || d === "RL") ? "horizontal" : "vertical";
  }

  const nodes: Map<string, { id: string; label: string; type: ArchNode["type"]; group?: string }> = new Map();
  const connections: ArchConnection[] = [];
  const groups = new Map<string, string>(); // nodeId → group name
  let currentGroup: string | null = null;
  let connIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip direction declaration
    if (/^flowchart\s/i.test(line)) continue;

    // Subgraph
    if (/^subgraph\s+/i.test(line)) {
      const gMatch = line.match(/^subgraph\s+(.+)/i);
      currentGroup = gMatch ? gMatch[1].trim() : "group";
      continue;
    }
    if (/^end$/i.test(line)) {
      currentGroup = null;
      continue;
    }

    // Connection line
    // Patterns: A --> B, A -->|label| B, A -.-> B, A --- B, A ==> B
    // Also: A --> B --> C (chain)
    const connRegex = /([A-Za-z0-9_-]+(?:\s*[\[\(\{\/].*?[\]\)\}\/])?)\s*(-+\.?->|==+>|---|-+\.?-+|===+|-+->)\s*\|?\s*([^|]*?)\s*\|?\s*([A-Za-z0-9_-]+(?:\s*[\[\(\{\/].*?[\]\)\}\/])?)/g;

    let m: RegExpExecArray | null;
    while ((m = connRegex.exec(line)) !== null) {
      const fromRaw = m[1].trim();
      const arrow = m[2];
      const label = m[3].trim();
      const toRaw = m[4].trim();

      // Parse from node
      const fromDef = parseNodeDef(fromRaw);
      if (fromDef) {
        if (!nodes.has(fromDef.id)) {
          nodes.set(fromDef.id, { ...fromDef, group: currentGroup ?? undefined });
        }
        if (currentGroup && !nodes.get(fromDef.id)!.group) {
          nodes.get(fromDef.id)!.group = currentGroup;
        }
        const fromId = fromDef.id;

        // Parse to node
        const toDef = parseNodeDef(toRaw);
        if (toDef) {
          if (!nodes.has(toDef.id)) {
            nodes.set(toDef.id, { ...toDef, group: currentGroup ?? undefined });
          }
          if (currentGroup && !nodes.get(toDef.id)!.group) {
            nodes.get(toDef.id)!.group = currentGroup;
          }

          connections.push({
            from: fromId,
            to: toDef.id,
            label: label || undefined,
            category: lineToCategory(arrow),
          });
          connIndex++;
        }
      }
    }

    // If no connection found, try to parse as a standalone node definition
    if (!connRegex.test(line)) {
      const nodeDef = parseNodeDef(line);
      if (nodeDef && !nodes.has(nodeDef.id)) {
        nodes.set(nodeDef.id, { ...nodeDef, group: currentGroup ?? undefined });
      }
    }
  }

  // Convert to arrays
  const nodeArray: ArchNode[] = Array.from(nodes.values()).map(n => ({
    id: n.id,
    label: n.label,
    type: n.type,
    group: n.group,
  }));

  return {
    direction,
    nodes: nodeArray,
    connections,
  };
}
