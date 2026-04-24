# @nodestral/archflow

React SVG architecture flow diagrams with auto-layout, STRIDE threat modeling, and animated data flow.

## Install

```bash
npm install @nodestral/archflow
```

## Usage

```tsx
import { ArchFlow } from "@nodestral/archflow";

const nodes = [
  { id: "dashboard", label: "Dashboard", sublabel: "Next.js", group: "frontend" },
  { id: "api", label: "API Server", sublabel: "Go / Gin", group: "backend" },
  { id: "db", label: "PostgreSQL", sublabel: "Primary", type: "cylinder", group: "storage" },
  { id: "redis", label: "Redis", sublabel: "Cache", type: "cylinder", group: "infra" },
  { id: "agent", label: "Agent", sublabel: "Go, <20MB", group: "edge" },
];

const connections = [
  { from: "dashboard", to: "api", label: "HTTPS", category: "data" },
  { from: "api", to: "db", label: "SQL", category: "data" },
  { from: "api", to: "redis", label: "pub/sub", category: "internal" },
  { from: "agent", to: "api", label: "heartbeat", category: "data" },
  // STRIDE threat modeling
  { from: "internet", to: "api", label: "HTTPS", category: "external", stride: "spoofing" },
];

function App() {
  return (
    <ArchFlow
      nodes={nodes}
      connections={connections}
      direction="horizontal"
      theme="dark"
      showLegend={true}
    />
  );
}
```

## Node Types

| Type | Shape | Use for |
|------|-------|---------|
| `rect` (default) | Rounded rectangle | Services, APIs |
| `cylinder` | Database cylinder | Databases, caches |
| `rounded` | Pill shape | External boundaries |
| `hexagon` | Hexagon | Queues, workers |
| `external` | Dashed rectangle | Third-party services |

## Connection Categories

| Category | Color | Style | Use for |
|----------|-------|-------|---------|
| `data` | Blue | Solid | Normal data flow |
| `auth` | Green | Solid | Authentication |
| `control` | Purple | Dashed | Management, admin |
| `internal` | Gray | Solid | Service-to-service |
| `external` | Amber | Dashed | Third-party, internet |

## STRIDE Threat Modeling

Mark any connection with a `stride` property to add threat indicators:

```tsx
{ from: "client", to: "api", label: "JWT", stride: "spoofing" }
{ from: "api", to: "db", label: "SQL", stride: "injection" }
```

| STRIDE | Label |
|--------|-------|
| `spoofing` | S — Spoofing |
| `tampering` | T — Tampering |
| `repudiation` | R — Repudiation |
| `information-disclosure` | I — Info Disclosure |
| `denial-of-service` | D — Denial of Service |
| `elevation-of-privilege` | E — Elevation of Privilege |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `nodes` | `ArchNode[]` | required | Nodes to render |
| `connections` | `ArchConnection[]` | required | Connections between nodes |
| `direction` | `"horizontal" \| "vertical"` | `"horizontal"` | Layout direction |
| `theme` | `"dark" \| "light"` | `"dark"` | Visual theme |
| `showLegend` | `boolean` | `true` | Show auto-generated legend |
| `width` | `number` | auto | Override SVG width |
| `height` | `number` | auto | Override SVG height |
| `nodeGap` | `number` | 20 | Gap between nodes in same layer |
| `layerGap` | `number` | 70 | Gap between layers |
| `nodeWidth` | `number` | 110 | Node width |
| `nodeHeight` | `number` | 44 | Node height |
| `padding` | `number` | 24 | Diagram padding |

## License

MIT
