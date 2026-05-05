import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ArchFlow } from '../src/components/ArchFlow';

const DEFAULT_CODE = `flowchart LR
    Users[Users / Browsers] -->|HTTPS| API[API Server]
    Admin[Admin Panel] -->|HTTPS| API
    API -->|SQL| Supabase[(Supabase)]
    API -->|SQL| TimescaleDB[(TimescaleDB)]
    API -->|pub/sub| Redis[(Redis)]
    Users -->|WSS| Relay[WS Relay]
    Relay -->|subscribe| Redis
    Relay -->|terminal| Agent[Agent]
    Agent -->|heartbeat| API`;

// Simple regex-based Mermaid parser — no external deps
function parseMermaid(input: string) {
  const lines = input.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("%%"));
  let direction: "horizontal" | "vertical" = "horizontal";
  const dirMatch = lines[0]?.match(/flowchart\s+(LR|RL|TB|BT|TD)/i);
  if (dirMatch) {
    const d = dirMatch[1].toUpperCase();
    direction = (d === "LR" || d === "RL") ? "horizontal" : "vertical";
  }

  const nodeMap = new Map<string, { id: string; label: string; type: string; group?: string }>();
  const connections: Array<{ from: string; to: string; label?: string; category: string }> = [];
  let currentGroup: string | null = null;

  for (const line of lines) {
    if (/^flowchart\s/i.test(line)) continue;
    if (/^subgraph\s+/i.test(line)) {
      const m = line.match(/^subgraph\s+(.+)/i);
      currentGroup = m ? m[1].trim() : "group";
      continue;
    }
    if (/^end$/i.test(line)) { currentGroup = null; continue; }

    // Match connections: A[Label] -->|text| B[Label]
    const connRe = /([A-Za-z0-9_-]+)(?:\[([^\]]*)\]|\(([^)]*)\)|\{([^}]*)\}|\[\(([^)]*)\)\]|\[\[([^\]]*)\]\])?\s*(-->|---|-\.->|==>)\s*\|([^|]*)\|\s*([A-Za-z0-9_-]+)(?:\[([^\]]*)\]|\(([^)]*)\)|\{([^}]*)\}|\[\(([^)]*)\)\]|\[\[([^\]]*)\]\])?/g;
    let m;
    while ((m = connRe.exec(line)) !== null) {
      const fromId = m[1];
      const fromLabel = m[2] ?? m[3] ?? m[4] ?? m[5] ?? m[6] ?? fromId;
      const arrow = m[7];
      const label = m[8]?.trim() || undefined;
      const toId = m[9];
      const toLabel = m[10] ?? m[11] ?? m[12] ?? m[13] ?? m[14] ?? toId;

      if (!nodeMap.has(fromId)) {
        const fromShape = line.match(new RegExp(fromId + '(\\[\\(|\\[\\[|\\[|\\(|\\{)'))?.[1];
        let type = "rect";
        if (fromShape === "[(" || fromShape === "[") type = "cylinder";
        else if (fromShape === "[[") type = "rounded";
        else if (fromShape === "(") type = "rounded";
        else if (fromShape === "{") type = "hexagon";
        nodeMap.set(fromId, { id: fromId, label: fromLabel, type, group: currentGroup ?? undefined });
      }
      if (!nodeMap.has(toId)) {
        const toShape = line.match(new RegExp(toId + '(\\[\\(|\\[\\[|\\[|\\(|\\{)'))?.[1];
        let type = "rect";
        if (toShape === "[(" || toShape === "[") type = "cylinder";
        else if (toShape === "[[") type = "rounded";
        else if (toShape === "(") type = "rounded";
        else if (toShape === "{") type = "hexagon";
        nodeMap.set(toId, { id: toId, label: toLabel, type, group: currentGroup ?? undefined });
      }

      const category = arrow.includes("-.") ? "external" : arrow.includes("==") ? "control" : "data";
      connections.push({ from: fromId, to: toId, label, category });
    }
  }

  return { direction, nodes: Array.from(nodeMap.values()), connections };
}

// Simple SVG export
function downloadSVG(container: HTMLElement, filename: string) {
  const svg = container.querySelector("svg");
  if (!svg) return;
  const clone = svg.cloneNode(true) as SVGElement;
  const bg = getComputedStyle(container).backgroundColor;
  if (bg && bg !== "rgba(0, 0, 0, 0)") {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const vb = clone.getAttribute("viewBox")?.split(" ").map(Number) ?? [0, 0, 800, 400];
    rect.setAttribute("width", String(vb[2]));
    rect.setAttribute("height", String(vb[3]));
    rect.setAttribute("fill", bg);
    clone.insertBefore(rect, clone.firstChild);
  }
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// Simple PNG export
function downloadPNG(container: HTMLElement, filename: string, scale: number, bg: string) {
  const svg = container.querySelector("svg");
  if (!svg) return;
  const clone = svg.cloneNode(true) as SVGElement;
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  const vb = clone.getAttribute("viewBox")?.split(" ").map(Number) ?? [0, 0, 800, 400];
  rect.setAttribute("width", String(vb[2]));
  rect.setAttribute("height", String(vb[3]));
  rect.setAttribute("fill", bg);
  clone.insertBefore(rect, clone.firstChild);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const svgStr = new XMLSerializer().serializeToString(clone);
  const canvas = document.createElement("canvas");
  canvas.width = vb[2] * scale;
  canvas.height = vb[3] * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);
  const img = new Image();
  const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  img.onload = () => {
    ctx.drawImage(img, 0, 0, vb[2], vb[3]);
    URL.revokeObjectURL(url);
    canvas.toBlob((png) => {
      if (png) {
        const purl = URL.createObjectURL(png);
        const a = document.createElement("a");
        a.href = purl; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(purl);
      }
    }, "image/png");
  };
  img.src = url;
}

function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [direction, setDirection] = useState<"horizontal" | "vertical">("horizontal");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [splitPos, setSplitPos] = useState(40);
  const [parsed, setParsed] = useState({ direction: "horizontal" as const, nodes: [] as any[], connections: [] as any[] });
  const [error, setError] = useState<string | null>(null);
  const dragging = useRef(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const update = useCallback((input: string) => {
    try {
      const result = parseMermaid(input);
      setError(null);
      setParsed(result);
      setDirection(result.direction);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  const handleChange = useCallback((v: string) => {
    setCode(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => update(v), 300);
  }, [update]);

  useEffect(() => { update(DEFAULT_CODE); }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const el = document.getElementById("pane-container");
      if (!el) return;
      const r = el.getBoundingClientRect();
      setSplitPos(Math.max(20, Math.min(80, ((e.clientX - r.left) / r.width) * 100)));
    };
    const onUp = () => { dragging.current = false; document.body.style.cursor = ""; document.body.style.userSelect = ""; };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, []);

  const dark = theme === "dark";
  const bg = dark ? "#020617" : "#f8fafc";
  const panelBg = dark ? "#0f172a" : "#ffffff";
  const border = dark ? "#1e293b" : "#e2e8f0";
  const text = dark ? "#e2e8f0" : "#1e293b";
  const muted = dark ? "#64748b" : "#94a3b8";
  const btn = (active: boolean, extra?: React.CSSProperties): React.CSSProperties => ({
    background: active ? "#0d9488" : dark ? "#1e293b" : "#e2e8f0",
    color: active ? "#fff" : dark ? "#94a3b8" : "#64748b",
    border: `1px solid ${active ? "#0d9488" : border}`,
    padding: "6px 14px", borderRadius: 4, cursor: "pointer",
    fontFamily: "monospace", fontSize: 12, whiteSpace: "nowrap", ...extra,
  });

  return (
    <div style={{ background: bg, color: text, fontFamily: "monospace", height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${border}`, flexShrink: 0, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 700, fontSize: 14, marginRight: 4 }}>archflow</span>
        <span style={{ fontSize: 11, color: muted, marginRight: 16 }}>diagram editor</span>
        <button style={btn(direction === "horizontal")} onClick={() => setDirection("horizontal")}>Horizontal</button>
        <button style={btn(direction === "vertical")} onClick={() => setDirection("vertical")}>Vertical</button>
        <div style={{ width: 1, height: 20, background: border, margin: "0 4px" }} />
        <button style={btn(theme === "dark")} onClick={() => setTheme("dark")}>Dark</button>
        <button style={btn(theme === "light")} onClick={() => setTheme("light")}>Light</button>
        <div style={{ width: 1, height: 20, background: border, margin: "0 4px" }} />
        <button style={btn(false, { background: "#7c3aed", color: "#fff", border: "1px solid #7c3aed" })} onClick={() => { if (previewRef.current) downloadPNG(previewRef.current, "archflow.png", 2, "#ffffff"); }}>⬇ PNG</button>
        <button style={btn(false, { background: "#0369a1", color: "#fff", border: "1px solid #0369a1" })} onClick={() => { if (previewRef.current) downloadSVG(previewRef.current, "archflow.svg"); }}>⬇ SVG</button>
      </div>

      <div id="pane-container" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ width: `${splitPos}%`, display: "flex", flexDirection: "column", borderRight: `1px solid ${border}` }}>
          <div style={{ padding: "6px 12px", fontSize: 11, color: muted, borderBottom: `1px solid ${border}`, background: panelBg }}>Mermaid Input</div>
          <textarea value={code} onChange={(e) => handleChange(e.target.value)} spellCheck={false} style={{
            flex: 1, resize: "none", border: "none", outline: "none", background: panelBg, color: text,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 13, padding: 12, lineHeight: 1.6, tabSize: 4,
          }} />
        </div>
        <div onMouseDown={() => { dragging.current = true; document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; }} style={{ width: 4, cursor: "col-resize", flexShrink: 0, background: border }} />
        <div style={{ width: `${100 - splitPos}%`, display: "flex", flexDirection: "column", overflow: "auto" }}>
          <div style={{ padding: "6px 12px", fontSize: 11, color: muted, borderBottom: `1px solid ${border}`, background: panelBg, display: "flex", justifyContent: "space-between" }}>
            <span>Preview</span>
            <span>{parsed.nodes.length} nodes · {parsed.connections.length} connections</span>
          </div>
          <div style={{ flex: 1, padding: 16, overflow: "auto" }}>
            {error ? (
              <div style={{ color: "#ef4444", fontSize: 12, padding: 16 }}>⚠ {error}</div>
            ) : parsed.nodes.length > 0 ? (
              <div ref={previewRef}>
                <ArchFlow nodes={parsed.nodes} connections={parsed.connections} direction={direction} theme={theme} showLegend={true} />
              </div>
            ) : (
              <div style={{ color: muted, fontSize: 12, textAlign: "center", marginTop: 40 }}>Type Mermaid flowchart syntax to see a live preview</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
