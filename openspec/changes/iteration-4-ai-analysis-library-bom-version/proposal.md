## Why

Iteration 3 delivered a complete MVP (file persistence, property editing, PNG/PDF export). Iteration 4 elevates the tool from "schematic generator" to "professional design assistant" by adding AI-driven circuit analysis, a complete component library, BOM export, and lightweight version history — the core V1.5 feature set defined in the PRD.

## What Changes

- **AI Circuit Analysis**: New `analyzeSchematic()` capability in `ClaudeProvider`; single-shot `ai:analyze` IPC channel; AIChatPanel gains an "Analyze Circuit" button that returns a structured report (errors / warnings / suggestions) rendered as color-coded message bubbles.
- **BOM Export**: `ExportService` gains `exportBOM()` via ExcelJS; `export:bom` IPC handler; ExportDialog gains a third "BOM" tab; components with identical parameters are merged and counted.
- **Enhanced Component Library**: `ComponentLibrary` panel expanded to cover all PRD-mandated categories (passive, diodes, BJT, MOS, op-amp, logic gates, common ICs, connectors, power symbols, misc); corresponding X6 node shapes registered in `SchematicCanvas`; `DynamicSymbolRenderer` added for unknown types.
- **Lightweight Version History**: New `VersionService` in Main Process appends a JSON snapshot to `{projectDir}/.aischematic_versions/` on every save; capped at 50 entries; `version:list` and `version:restore` IPC handlers; `VersionHistoryDrawer` UI accessible from "File > Version History" menu item.

## Capabilities

### New Capabilities

- `ai-circuit-analysis`: AI analysis of the current schematic — circuit correctness, parameter validation, DRC (dangling pins, short circuits, unconnected net labels), and optimization suggestions; returns structured `AnalysisReport`.
- `bom-export`: Extraction and Excel export of the Bill of Materials from `NetlistManager`; merges components by identical parameters; uses ExcelJS.
- `component-library-enhanced`: Full component category tree matching PRD F5 spec; X6 shape registration for all new types; `DynamicSymbolRenderer` for unknown component types.
- `version-history`: Lightweight snapshot-based version history stored alongside the project file; timeline UI in a Drawer; one-click restore with confirmation.

### Modified Capabilities

- `ai-chat-panel`: Gains "Analyze" button and structured analysis-result rendering (extends existing streaming chat UI without breaking it).
- `export`: ExportDialog gains BOM tab; `ExportService` and preload extended with `export:bom`; existing PNG/PDF paths unchanged.

## Impact

**New files**
- `src/main/services/VersionService.ts`
- `src/renderer/components/dialogs/VersionHistoryDrawer.tsx`
- `src/renderer/components/canvas/DynamicSymbolRenderer.ts`

**Modified files**
- `src/main/services/ClaudeProvider.ts` — add `analyzeSchematic()`
- `src/main/services/ExportService.ts` — add `exportBOM()`
- `src/main/index.ts` — register `ai:analyze`, `export:bom`, `version:list`, `version:restore` IPC handlers; register VersionService; add "Version History" menu item
- `src/preload/index.ts` — expose `ai.analyze`, `export.bom`, `version.list`, `version.restore`
- `src/renderer/components/panels/AIChatPanel.tsx` — add Analyze button + AnalysisReport rendering
- `src/renderer/components/panels/ComponentLibrary.tsx` — full category expansion
- `src/renderer/components/canvas/SchematicCanvas.tsx` — register new X6 shapes
- `src/renderer/components/dialogs/ExportDialog.tsx` — add BOM tab
- `src/renderer/components/layout/AppLayout.tsx` — wire "Version History" menu item
- `src/shared/types/project.ts` — add `AnalysisReport`, `AnalysisItem`, `VersionEntry` types

**New dependencies**
- `exceljs` (Main Process, BOM export)

**IPC channels added**
- `ai:analyze` (invoke)
- `export:bom` (invoke)
- `version:list` (invoke)
- `version:restore` (invoke)
