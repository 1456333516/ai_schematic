## Context

The codebase has a clean domain architecture (NetlistManager → CommandBus → GraphSyncer → X6) from Iteration 2, but the surface layer is incomplete: PropertyPanel is a stub, all file-operation IPC handlers return fake data, and the export menu is disabled. The AppLayout only handles 5 of the ~18 menu events sent by the main process. This design bridges those gaps without touching the stable Iteration 1/2 core.

Key constraints from the existing code:
- `CommandBus` in `DomainContext` is the single source of truth for mutations; PropertyPanel edits **must** go through `UpdatePropertyCommand`
- X6 node data is stored via `node.getData()` / `node.setData()` — the domain types already define `properties`, `pins`, `position` on `Component`
- `graph.toJSON()` / `graph.fromJSON()` are the X6 serialisation round-trip; this must be combined with `netlistManager.serialize()` for the dual-track format
- PNG export cannot use native addons (`sharp`) — must stay within Electron's sandbox-safe APIs

## Goals / Non-Goals

**Goals:**
- Full property editing with Zod validation and undo/redo via CommandBus
- Real file persistence (create, save, open, recent, auto-save) using `.aischematic` format
- PNG and PDF export without new native dependencies
- All ~18 menu events correctly handled in AppLayout
- AI modify calls carry current netlist context

**Non-Goals:**
- Multi-sheet support (Iteration 4)
- BOM export (Iteration 4)
- Version history / snapshots (Iteration 4)
- Advanced export (SVG, DXF — Iteration 5)
- Property editing for wires/nets (not in scope for MVP)

## Decisions

### D1 — Dual-track project file format

**Decision:** Save `{ schema: NetlistDSL, canvas: X6GraphJSON, meta: { name, version, savedAt } }` as a single `.aischematic` JSON file.

**Rationale:** Pure X6 JSON loses domain semantics (net names, pin refs) needed for AI context. Pure DSL loses X6 layout data (exact positions, edge routing). Dual-track avoids a complex DSL→X6 reconstructor while keeping AI context intact.

**Alternative considered:** Pure DSL + GraphSyncer reconstruct — rejected because the GraphSyncer currently only does incremental updates; a full rebuild from DSL would require significant new code.

**On load:** `graph.fromJSON(canvas)` restores the visual; `netlistManager.loadFromDSL(schema)` restores the domain. Both happen before `GraphSyncer` attaches so no spurious events fire.

### D2 — Atomic writes via tmp→rename

**Decision:** Write to `<path>.tmp` then `fs.renameSync` to target path.

**Rationale:** Crash during write corrupts the file. `rename` is atomic on same-filesystem (all major OS). Cost is negligible for typical schematic sizes (<1 MB).

### D3 — PropertyPanel reads from X6, writes through CommandBus

**Decision:** On selection change, read `node.getData()` to populate the form. On form submit/blur, dispatch `UpdatePropertyCommand` through the existing `CommandBus`.

**Rationale:** Keeps a single mutation path. `UpdatePropertyCommand` already exists in `src/renderer/commands/implementations.ts` and handles domain + event emission. GraphSyncer handles the X6 label refresh via `PROPERTY_UPDATED` event.

**Node data shape used:**
```typescript
{
  refDes: string,       // editable
  refDesPrefix: string, // read-only (used for auto-numbering)
  label: string,        // maps to Value
  category: string,     // read-only (component type)
  // New fields persisted in node data:
  package?: string,
  tolerance?: string,
  rating?: string,
  notes?: string
}
```

### D4 — PNG export via offscreen SVG→Canvas→PNG

**Decision:** Renderer calls `graph.toSVG()` → sends SVG string via IPC → main process converts with `nativeImage.createFromDataURL()` after a Canvas element renders it in an offscreen BrowserWindow, then saves PNG via `fs.writeFileSync`.

**Rationale:** `nativeImage` cannot directly rasterise SVG. The simplest approach within Electron's sandbox is to open a minimal hidden BrowserWindow, render the SVG into an HTML Canvas, call `toDataURL('image/png')`, and capture it. No native addon required.

**Alternative considered:** `webContents.capturePage()` on the main window — rejected because it captures the full app UI, not just the schematic.

### D5 — PDF export via printToPDF

**Decision:** Use `mainWindow.webContents.printToPDF({ printBackground: true, landscape: true })`.

**Rationale:** Built into Electron, zero additional dependencies, produces standard PDF. Quality is sufficient for MVP.

### D6 — Auto-save via setInterval in main process

**Decision:** FileService starts a 60-second interval that requests the current graph/netlist state from renderer via IPC, then saves to the current project path if one exists.

**Rationale:** Main process owns the file path and the save logic; renderer owns the live graph state. A pull-based approach (main requests data every 60s) avoids coupling the renderer to save timing.

### D7 — Recent projects stored in userData/recent.json

**Decision:** Max 10 entries, each `{ name, path, savedAt }`. Rebuilt into the native menu after every save/open.

**Rationale:** Simple JSON in userData survives app reinstall (it's in AppData). Native menu rebuild keeps "Recent Projects" accurate without a renderer render cycle.

## Risks / Trade-offs

- **Offscreen PNG rendering complexity** → The hidden BrowserWindow approach adds ~50 lines of bootstrap code in ExportService; if it proves unreliable, fallback is to instruct the user to use `printToPDF` for both formats.
- **graph.fromJSON() + netlistManager divergence** → If a future operation modifies only one track (e.g., a direct X6 manipulation bypasses CommandBus), the saved file will be inconsistent. Mitigation: strict policy that all mutations go through CommandBus; GraphSyncer keeps X6 in sync.
- **Auto-save IPC round-trip** → Requesting graph+netlist state every 60s over IPC is cheap for typical schematics (<500 components). For very large schematics this could cause a brief UI freeze. Mitigation: use `requestIdleCallback` on renderer side when responding to auto-save requests.
- **PropertyPanel form debounce** → Dispatching `UpdatePropertyCommand` on every keystroke would flood the undo stack. Mitigation: dispatch on blur / Enter, not on change.
