## Why

Iteration 2 delivered the AI generation pipeline and domain core, but the application cannot yet save/load projects, export results, or meaningfully edit component properties — making it unusable as a real tool. Iteration 3 completes the MVP by wiring up file persistence, export, a functional property editor, and full menu integration.

## What Changes

- **PropertyPanel**: Replace the stub (shows only node ID) with a full form editor for RefDes, Value, Package, Tolerance, Rating, Notes; position info shown read-only; all changes routed through `CommandBus` for undo/redo support
- **FileService**: Replace 4 empty IPC stubs with real file I/O; project format is dual-track JSON `{ schema, canvas, meta }`; atomic writes via tmp→rename; recent-projects list (max 10); 60-second auto-save
- **ExportService**: Implement PNG (SVG→nativeImage) and PDF (printToPDF) export; add ExportDialog for settings; enable the previously-disabled Tools › Export menu
- **IPC full wiring**: AppLayout handles all missing menu events (save, open, undo, redo, delete, select-all, export-*, zoom-*); undo/redo routed to CommandBus; recent-projects menu rebuilt dynamically
- **AI iterative context**: AIChatPanel sends current `netlist.serialize()` when calling `ai:modify` so Claude can make targeted edits; a "Modify mode" indicator appears when the canvas is non-empty

## Capabilities

### New Capabilities

- `property-editing`: Real-time component property editing panel with validation and undo/redo support
- `file-persistence`: Full project save/load/recent lifecycle with atomic writes and auto-save
- `export`: PNG and PDF export from the canvas with a settings dialog
- `menu-integration`: Complete wiring of all application menu actions to their respective services and domain operations
- `ai-iterative-context`: Context-aware AI modification that sends current netlist state with each modify request

### Modified Capabilities

- `ai-chat-panel`: Extended to support modify mode — sends netlist context on `ai:modify` calls (requirement change: AI can now modify existing circuits, not only generate from scratch)

## Impact

**Modified files:**
- `src/renderer/components/panels/PropertyPanel.tsx` — full rewrite from stub
- `src/renderer/components/panels/AIChatPanel.tsx` — add modify-mode + context passing
- `src/renderer/components/layout/AppLayout.tsx` — add ~12 new IPC menu listeners
- `src/main/index.ts` — replace 4 stub handlers, enable Export menu, add recent-projects menu rebuild, integrate ExportService

**New files:**
- `src/main/services/FileService.ts` — project file I/O
- `src/main/services/ExportService.ts` — PNG/PDF export
- `src/renderer/components/dialogs/ExportDialog.tsx` — export settings UI

**Dependencies:** No new npm packages required (uses Electron built-ins: `fs`, `path`, `nativeImage`, `webContents.printToPDF`; Zod already installed)
