## Context

Three iterations have produced a working Electron + React + X6 schematic editor with AI generation, file persistence, and PNG/PDF export. The domain layer (`NetlistManager`, `CommandBus`, `GraphSyncer`) is stable. Main-process services (`FileService`, `ExportService`, `ClaudeProvider`) follow a consistent pattern.

Current gaps:
- `ClaudeProvider` only has `generateSchematic()` and `modifySchematic()` — no analysis method.
- `ComponentLibrary` has 4 real items (resistor, capacitor, diode, LED) and 6 empty categories.
- `ExportService` supports PNG and PDF only; no BOM.
- No version history mechanism exists; auto-save overwrites the single project file in-place.

## Goals / Non-Goals

**Goals:**
- Add `analyzeSchematic()` to `ClaudeProvider` as a non-streaming Promise call; wire `ai:analyze` IPC.
- Fill all PRD F5 component categories with real items and register corresponding X6 shapes.
- Add `exportBOM()` to `ExportService` using ExcelJS; wire `export:bom` IPC.
- Implement `VersionService` that appends a snapshot on every save; add timeline Drawer UI.

**Non-Goals:**
- Multi-sheet / cross-sheet net labels (Iteration 5).
- No-Connect markers (deferred).
- Streaming analysis results (analysis is single-shot by design).
- Version diff visualization (Iteration 5 scope).

## Decisions

### D1: AI Analysis — Non-Streaming Promise

`analyzeSchematic()` in `ClaudeProvider` uses `this.client.messages.create()` without `stream: true`.
Returns a structured `AnalysisReport` parsed from the model's text response.

**Rationale**: Analysis is a one-shot read of the current schematic state; there are no incremental tool calls to stream. Forcing streaming adds complexity with no UX benefit. The response JSON is compact enough to receive atomically.

**Alternative considered**: Streaming with `text_delta` accumulation, then parse at end — same latency, more code.

**Response format contract**: System prompt instructs Claude to respond with a JSON object in a markdown code block:
```json
{
  "errors": [{ "severity": "error", "message": "...", "component": "R1" }],
  "warnings": [...],
  "suggestions": [...]
}
```
Parser strips the code fence and calls `JSON.parse`. Falls back to `{ errors: [], warnings: [], suggestions: [{ severity: "info", message: rawText }] }` on parse failure.

### D2: Component Library — Inline Data + Shape Registration

New components are added to `LIBRARY_DATA` in `ComponentLibrary.tsx` and new X6 React shapes are registered in `registerShapes.ts`.

**Shape strategy by category**:
| Category | Shape approach |
|---|---|
| Inductor, Fuse, Zener, Schottky | New dedicated React node components (similar to existing DiodeNode) |
| BJT (NPN/PNP), MOS (N/P) | New dedicated React node components |
| Op-amp (single/dual/quad) | New dedicated React node components |
| Logic gates (AND/OR/NOT/NAND/NOR) | New dedicated React node components |
| Connectors (2-pin, 4-pin, USB, DC) | Reuse `schematic-ic` shape with pin count |
| Power symbols (+3.3V, +5V, +12V, VDD, AGND) | Reuse `schematic-vcc` shape, differentiated by label |
| Misc (crystal, buzzer, relay, optocoupler) | New dedicated or reuse IC shape |

**DynamicSymbolRenderer**: A utility function `createDynamicNode(pinCount, label)` that produces an IC-style node config with auto-sized height based on pin count. Used as fallback when `shape` is `'schematic-dynamic'`. No new X6 shape registration required — reuses `schematic-ic`.

**Rationale**: Dedicated components for common types ensures EDA-accurate symbols. Reusing IC shape for connectors and dynamic types avoids shape registration explosion.

### D3: BOM Export — ExcelJS in Main Process

`ExportService.exportBOM(components: BOMRow[], destPath: string)` uses ExcelJS to write `.xlsx`.

**BOM aggregation lives in renderer**: `AIChatPanel` or `ExportDialog` calls `netlistManager.serialize()`, maps components to `BOMRow[]` (merging by `type+value+package`), then sends the aggregated array via `export:bom` IPC. Main process only writes the file.

**Rationale**: Aggregation logic depends on `NetlistManager` which lives in renderer. Sending a pre-aggregated array over IPC is cheaper than sending the full netlist and re-parsing in Main.

### D4: Version History — Append-Only Snapshots in `.aischematic_versions/`

`VersionService` stores snapshots in `{projectDir}/.aischematic_versions/{timestamp}.json`. Each snapshot is a full `ProjectFileData` object. Cap at 50 entries (oldest deleted on overflow).

**Trigger**: `FileService.save()` calls `versionService.createSnapshot(projectPath, data)` synchronously after writing the main project file. Auto-save also triggers a snapshot via `autosave:respond` handler.

**IPC surface**:
- `version:list(projectPath)` → `VersionEntry[]` sorted newest-first
- `version:restore(projectPath, versionId)` → `ProjectFileData` (read the snapshot, return it; caller applies it to renderer state)

**UI**: `VersionHistoryDrawer` opened from `AppLayout` via `menu:version-history` IPC event. Drawer shows Ant Design `Timeline` with `Button` per entry. Restore requires `Modal.confirm` before IPC call.

**Rationale**: Append-only JSON files are trivially durable and inspectable. No binary diff or indexing needed at this scale (50 entries × ~100 KB each = ~5 MB max per project). Semantic diff visualization is deferred to Iteration 5.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Claude returns malformed JSON for analysis | Wrap parse in try/catch; fall back to wrapping raw text as a single suggestion |
| New X6 shapes increase bundle size | All shapes are SVG-based React components — minimal overhead |
| ExcelJS install size (~2 MB) in Main Process bundle | Acceptable; ExcelJS is a pure-JS library with no native deps |
| Snapshot files accumulate silently | Cap enforced in `VersionService.createSnapshot()`: list → sort → delete oldest if > 50 |
| `autosave:respond` handler also calling `createSnapshot` doubles writes | Snapshots are small and cheap; acceptable behavior for frequent auto-saves |
| BOM aggregation in renderer may diverge from display state | Aggregation reads `netlistManager.serialize()` which is always the canonical state |
