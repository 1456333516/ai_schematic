# Iteration 1 — Task Breakdown

All tasks reference `openspec/changes/iteration-1-foundation/proposal.md` for detailed specs.
Resolved design constraints: proposal §3.1 (C1–C14).

---

## Phase A: Project Scaffolding

- [x] **A1**: Initialize electron-vite project — manual setup with package.json, electron.vite.config.ts, tsconfig files, all deps installed
- [x] **A2**: Establish directory structure — all dirs/files per proposal §2.1
- [x] **A3**: Conditional logger — `src/shared/utils/logger.ts` with DEV-gated debug/info, always-on warn/error

---

## Phase B: Electron Shell

- [x] **B1**: Main process setup — BrowserWindow 1440×900 (min 1024×680), contextIsolation, sandbox, preload
- [x] **B2**: Preload script — contextBridge with file stubs + real dialog APIs + IPC listener helper
- [x] **B3**: Type declarations — `electron.d.ts` with typed Window.electronAPI
- [x] **B4**: Electron native menu — File/Edit/View/Tools/Help with accelerators, IPC to renderer

---

## Phase C: UI Layout

- [x] **C1**: Design tokens — CSS custom properties for all colors, fonts, spacing, layout dimensions
- [x] **C2**: AppLayout grid — CSS Grid 8-zone layout, dynamic columns via Zustand, splitter with pointer-capture
- [x] **C3**: Toolbar — Undo/Redo (disabled), Rotate/Flip, Mode select/pan/boxSelect, Zoom in/out/fit
- [x] **C4**: Status bar — cursor coords, zoom %, grid status, AI "Offline", 200+ node warning
- [x] **C5**: Sheet tabs — "Sheet 1" active tab, "+" placeholder

---

## Phase D: Zustand Stores

- [x] **D1**: useAppStore — currentView, panel visibility/width, project info, all actions
- [x] **D2**: useCanvasStore — zoom, cursor, grid, activeTool, selection, nodeCount, refDesCounters + getNextRefDes

---

## Phase E: AntV X6 Canvas

- [x] **E1**: SchematicCanvas — Graph init with grid/panning/mousewheel/connecting config, 5 plugins
- [x] **E2**: registerShapes — 7 shapes (resistor/capacitor/diode/led/ic/vcc/gnd) + wire edge, extensible architecture
- [x] **E3**: SVG component nodes — Resistor 80×30, Capacitor 60×30, Diode 60×40, LED 60×40, IC dynamic pins
- [x] **E3b**: Power symbols — VCC (upward arrow, red) + GND (3 lines, black), single-pin each
- [x] **E4**: MiniMap — 200×160, bottom-right positioned via plugin
- [x] **E5**: Canvas↔Store wiring — rAF mousemove, direct scale/selection, node:added auto-refDes, IPC menu events

---

## Phase F: Component Library Panel

- [x] **F1**: Category tree data — 10 categories matching PRD §2.5, VCC/GND in 电源符号
- [x] **F2**: ComponentLibrary UI — search filter, Ant Design Collapse, 36px item height, hover highlight
- [x] **F3**: Drag-to-canvas — X6 Dnd plugin, auto refDes on drop, double-click to center-add

---

## Phase G: Welcome Page

- [x] **G1**: WelcomePage — logo + title, New/Open buttons, recent projects list
- [x] **G2**: NewProjectDialog — name validation (1-64 chars, no special fs chars), path browse, create → editor view

---

## Phase H: Integration & Polish

- [x] **H1**: Panel collapse/expand — CSS grid transition 200ms ease-out, width memory in useAppStore
- [x] **H2**: Keyboard shortcuts — focus-layered: input guard for single-letter keys, X6 keyboard plugin binds, Electron menu accelerators
- [x] **H3**: Copy-paste — Ctrl+C/V with new refDes, (20,20)px offset
- [x] **H4**: Build verification — `electron-vite build` passes clean, dev server starts successfully
