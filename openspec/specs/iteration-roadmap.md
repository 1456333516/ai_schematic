# AI Schematic Generator — Iteration Roadmap

| Field | Value |
|-------|-------|
| Created | 2026-03-07 |
| Source | `docs/PRD.md` · `docs/architecture.md` · `docs/ui-design.md` |
| Total Iterations | 5 |

---

## Iteration 1: Foundation + Basic Canvas (MVP Phase 1)

**Status**: 🟡 Active
**Goal**: Electron app running, UI skeleton, X6 canvas functional, basic component rendering

- Electron + React + TypeScript project scaffolding (electron-vite)
- Main/Renderer/Preload process architecture
- UI skeleton layout (all panels positioned)
- AntV X6 canvas: grid, zoom, pan, selection, snapline, minimap
- 5 basic component shapes (resistor, capacitor, LED, diode, IC generic)
- Welcome page + new project dialog
- Conditional logging infrastructure
- Status bar (coordinates, zoom level)

---

## Iteration 2: Domain Core + AI Generation (MVP Phase 2)

**Status**: ⬜ Pending
**Goal**: Natural language → AI generated schematic → rendered on canvas

- Domain Core: Netlist data model, NetlistManager, ConnectivityGraph
- Command Bus: Command interface, DomainEvent, EventBus, undo/redo
- AI integration: ClaudeProvider (streaming Tool Use), AIService, secure API key storage
- Validation Pipeline: Zod schema, reference integrity, basic ERC, RepairOrchestrator
- GraphSyncer: DomainEvent → X6 incremental sync
- AI chat panel: streaming UI, progress bar, stop button, error/retry
- Full DSL → Validation → Domain → X6 rendering pipeline

---

## Iteration 3: Editing + Library + Export + Project Management (MVP Phase 3)

**Status**: ⬜ Pending
**Goal**: Complete MVP — editable, savable, exportable

- Canvas editing: drag, connect, delete, parameter editing, net labels, power symbols
- Component library panel: category tree, search, drag-to-canvas
- Property panel: component parameter editing with validation
- AI iterative modification via conversation (context-aware)
- Export PNG/PDF: SVGGenerator, export strategies, export settings dialog
- Project management: FileService (create/save/open/recent), atomic writes, auto-save
- Keyboard shortcuts, clipboard (copy/paste)

---

## Iteration 4: AI Analysis + Multi-Sheet + BOM + Version Control (V1.5)

**Status**: ⬜ Pending
**Goal**: Professional features

- AI analysis: circuit correctness, parameter validation, DRC, optimization suggestions
- Multi-sheet: Sheet tab bar, cross-sheet net label connections
- BOM export: BOMExportStrategy (ExcelJS)
- Version control: VersionService (snapshots + incremental ops + semantic diff), rollback
- Enhanced component library: full categories, DynamicSymbolRenderer
- No-Connect markers

---

## Iteration 5: Multi-Model + Advanced Export + Performance (V2.0)

**Status**: ⬜ Pending
**Goal**: Production-ready

- Multi-model support: AI Adapter expansion (GPT, etc.)
- Advanced export: SVG, DXF
- Performance optimization: viewport culling, incremental rendering, 1000+ components
- Version comparison visualization
- Crash recovery enhancement
- Polish: animations, edge cases, accessibility
