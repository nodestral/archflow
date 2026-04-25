import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArchFlow } from '../src/components/ArchFlow';

const nodes = [
  { id: "users", label: "Users", sublabel: "Browsers", type: "rounded" as const, group: "frontend" },
  { id: "admin", label: "Admin", sublabel: "Browser", type: "rounded" as const, group: "frontend" },
  { id: "api", label: "API Server", sublabel: "Go / Gin", group: "backend" },
  { id: "relay", label: "WS Relay", sublabel: "Go", group: "backend" },
  { id: "supabase", label: "Supabase", sublabel: "Users, Nodes", type: "cylinder" as const, group: "storage" },
  { id: "timescaledb", label: "TimescaleDB", sublabel: "Metrics", type: "cylinder" as const, group: "storage" },
  { id: "redis", label: "Redis", sublabel: "Pub/Sub", type: "cylinder" as const, group: "infra" },
  { id: "agent", label: "Agent", sublabel: "Go, <20MB", group: "edge" },
];

const connections = [
  { from: "users", to: "api", label: "HTTPS", category: "data" as const, stride: "spoofing" as const },
  { from: "users", to: "relay", label: "WSS", category: "data" as const, stride: "tampering" as const },
  { from: "admin", to: "api", label: "HTTPS", category: "auth" as const, stride: "elevation-of-privilege" as const },
  { from: "api", to: "supabase", label: "SQL", category: "data" as const, stride: "information-disclosure" as const },
  { from: "api", to: "timescaledb", label: "SQL", category: "data" as const },
  { from: "api", to: "redis", label: "pub/sub", category: "internal" as const },
  { from: "relay", to: "redis", label: "subscribe", category: "internal" as const },
  { from: "relay", to: "agent", label: "terminal", category: "control" as const, stride: "denial-of-service" as const },
  { from: "agent", to: "api", label: "heartbeat", category: "data" as const, stride: "repudiation" as const },
];

function App() {
  const [direction, setDirection] = useState<"horizontal" | "vertical">("horizontal");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  return (
    <div style={{ background: theme === "dark" ? "#020617" : "#fff", color: theme === "dark" ? "#e2e8f0" : "#1e293b", fontFamily: "monospace", padding: 24, minHeight: "100vh" }}>
      <h1 style={{ fontSize: 18, marginBottom: 8 }}>@nodestral/archflow</h1>
      <p style={{ fontSize: 12, color: "#64748b", marginBottom: 24 }}>Live debug</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {(["horizontal", "vertical"] as const).map(d => (
          <button key={d} onClick={() => setDirection(d)} style={{
            background: direction === d ? "#0d9488" : "#1e293b",
            color: direction === d ? "#fff" : "#94a3b8",
            border: `1px solid ${direction === d ? "#0d9488" : "#334155"}`,
            padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontFamily: "monospace", fontSize: 12,
          }}>
            {d}
          </button>
        ))}
        {(["dark", "light"] as const).map(t => (
          <button key={t} onClick={() => setTheme(t)} style={{
            background: theme === t ? "#0d9488" : "#1e293b",
            color: theme === t ? "#fff" : "#94a3b8",
            border: `1px solid ${theme === t ? "#0d9488" : "#334155"}`,
            padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontFamily: "monospace", fontSize: 12,
          }}>
            {t}
          </button>
        ))}
      </div>
      <ArchFlow nodes={nodes} connections={connections} direction={direction} theme={theme} showLegend={true} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
