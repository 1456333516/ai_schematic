# Iteration 1: Foundation + Basic Canvas

| Field | Value |
|-------|-------|
| Change ID | iteration-1-foundation |
| Created | 2026-03-07 |
| Status | Proposed |
| Source Docs | `docs/PRD.md` · `docs/architecture.md` · `docs/ui-design.md` |

---

## 1. Objective

Build the runnable Electron application skeleton with complete UI layout, functional AntV X6 canvas, basic component shape rendering, welcome page, and conditional logging infrastructure. This iteration delivers no AI or persistence — it establishes the foundation all subsequent iterations depend on.

---

## 2. Deliverables

### 2.1 Project Scaffolding

- **Build tool**: `electron-vite` (Vite-based, supports main/preload/renderer)
- **Runtime**: Electron ≥ 33.x, React 18.x, TypeScript ≥ 5.x
- **State**: Zustand ≥ 4.x
- **UI**: Ant Design ≥ 5.x
- **Canvas**: AntV X6 ≥ 2.x + `@antv/x6-react-shape` ≥ 2.x
- **X6 Plugins**: `@antv/x6-plugin-selection`, `@antv/x6-plugin-snapline`, `@antv/x6-plugin-keyboard`, `@antv/x6-plugin-clipboard`, `@antv/x6-plugin-minimap`
- **Validation**: Zod ≥ 3.x (install now, used in Iteration 2)

Directory structure:

```
ai_schematic/
├── electron.vite.config.ts
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.web.json
├── src/
│   ├── main/                    # Electron Main Process
│   │   ├── index.ts             # App entry, window creation
│   │   └── ipc/
│   │       └── handlers.ts      # IPC handler registry (skeleton)
│   ├── preload/
│   │   └── index.ts             # contextBridge API exposure
│   ├── renderer/                # React Renderer Process
│   │   ├── index.html
│   │   ├── main.tsx             # React entry
│   │   ├── App.tsx              # Root layout component
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.tsx        # Main grid layout
│   │   │   │   ├── MenuBar.tsx          # (placeholder — Electron native menu)
│   │   │   │   ├── Toolbar.tsx          # Tool buttons
│   │   │   │   ├── StatusBar.tsx        # Coordinates + zoom + grid + AI status
│   │   │   │   └── SheetTabs.tsx        # Sheet tab bar (placeholder)
│   │   │   ├── panels/
│   │   │   │   ├── ComponentLibrary.tsx # Left panel: category tree + search
│   │   │   │   ├── AIChatPanel.tsx      # Right panel: placeholder chat UI
│   │   │   │   └── PropertyPanel.tsx    # Bottom panel: placeholder
│   │   │   ├── canvas/
│   │   │   │   ├── SchematicCanvas.tsx  # X6 Graph host component
│   │   │   │   └── MiniMap.tsx          # MiniMap container
│   │   │   ├── welcome/
│   │   │   │   ├── WelcomePage.tsx      # Start page
│   │   │   │   └── NewProjectDialog.tsx # Create project modal
│   │   │   └── shapes/
│   │   │       ├── registerShapes.ts    # X6 shape registration
│   │   │       └── components/
│   │   │           ├── ResistorNode.tsx
│   │   │           ├── CapacitorNode.tsx
│   │   │           ├── DiodeNode.tsx
│   │   │           ├── LEDNode.tsx
│   │   │           ├── ICNode.tsx
│   │   │           ├── VCCNode.tsx
│   │   │           └── GNDNode.tsx
│   │   ├── stores/
│   │   │   ├── useAppStore.ts           # Global app state (view mode, active panel)
│   │   │   └── useCanvasStore.ts        # Canvas state (zoom, grid, cursor)
│   │   ├── styles/
│   │   │   ├── global.css               # Reset + CSS variables (design tokens)
│   │   │   └── layout.css               # Grid layout styles
│   │   └── types/
│   │       └── electron.d.ts            # Window.electronAPI type declaration
│   └── shared/
│       ├── utils/
│       │   └── logger.ts                # Conditional compilation logger
│       └── types/
│           └── project.ts               # Project metadata types (skeleton)
├── resources/                           # Electron app icons
└── docs/                                # Existing documentation
```

### 2.2 Electron Shell

**Main Process** (`src/main/index.ts`):
- Create BrowserWindow with these settings from `docs/ui-design.md`:
  - Default size: 1440×900 (min: 1024×680)
  - `webPreferences.preload` pointing to preload script
  - `webPreferences.contextIsolation: true`
  - `webPreferences.nodeIntegration: false`
- Electron native Menu (structure from `docs/ui-design.md` §3.3):
  - File (New/Open/Save/SaveAs/Recent/Settings/Exit)
  - Edit (Undo/Redo/Cut/Copy/Paste/Delete/SelectAll)
  - View (Zoom controls, Grid toggle, Panel toggles)
  - Tools (AI Analysis placeholder, Export placeholder, Version History placeholder)
  - Help (Shortcuts, About)
  - Menu items that require Renderer action send IPC messages
- Keyboard accelerators as defined in UI doc §3.4

**Preload Script** (`src/preload/index.ts`):
- Expose `window.electronAPI` via `contextBridge`
- Skeleton API surface (methods return placeholder responses for now):
  - `file.createProject(name, path)` → stub
  - `file.openProject(path)` → stub
  - `file.saveProject(data)` → stub
  - `file.getRecentProjects()` → stub (returns empty array)
  - `system.showSaveDialog(options)` → real Electron dialog
  - `system.showOpenDialog(options)` → real Electron dialog

**Type Declaration** (`src/renderer/types/electron.d.ts`):
- Typed `Window.electronAPI` matching preload exports

### 2.3 UI Skeleton Layout

Based on `docs/ui-design.md` §2.1 main layout structure:

```
┌────────────────────────────────────────────────────────────┐
│ A  Menu Bar (Electron native)                        32px  │
├──────────┬──────────────────────────────────┬──────────────┤
│ C Toolbar │  ← → ↺ ↻  |  🖱️ ✋ ☐  | ⊞ ⊟ ⊡  │              │ 36px
├──────────┼──────────────────────────────────┤              │
│ B        │                                  │ E            │
│ Component│         D  Schematic Canvas      │ AI Chat      │
│ Library  │            (AntV X6)             │ Panel        │
│ 240px    │                                  │ 360px        │
│          ├──────────────────────────────────┤              │
│          │ F  Property Panel (placeholder)  │              │
│          ├──────────────────────────────────┤              │
│          │ G  Sheet Tabs (placeholder)  28px│              │
├──────────┴──────────────────────────────────┴──────────────┤
│ H  Status Bar                                        24px  │
└────────────────────────────────────────────────────────────┘
```

**Design tokens** from `docs/ui-design.md` §1.2:
- CSS custom properties for all colors (primary, success, warning, error, canvas colors, neutral scale)
- Font scale from §1.3
- Spacing from §1.4 (base unit 4px)

**Panel B (Component Library)**:
- Search input (non-functional filter, UI only)
- Static category tree matching PRD §2.5: 无源器件, 二极管, 三极管, MOS管, 运算放大器, 逻辑门, 常用IC, 连接器, 电源符号, 其他
- Each category expandable/collapsible
- Items show icon + Chinese name + English abbreviation
- Drag from list → add component to canvas (basic implementation)

**Panel E (AI Chat)**:
- Panel header with collapse button
- Empty conversation area with welcome message
- Input area with textarea + send button (disabled — no AI backend yet)
- "AI Analysis" and "Clear" buttons (disabled)
- Collapsible via `Ctrl+Shift+R`

**Panel F (Property Panel)**:
- Placeholder text: "Select a component to view properties"
- Expands when a canvas node is selected (basic)

**Panel G (Sheet Tabs)**:
- Single tab "Sheet 1" (active)
- "+" button (non-functional placeholder)

**Toolbar (C)**:
- Undo/Redo buttons (disabled state — no CommandBus yet)
- Rotate/Flip buttons
- Mode buttons: Select (default active), Pan, Box-select
- Zoom: In/Out/Fit
- Net Label / Power Symbol buttons (placeholder)
- Button states per UI doc §3.4: default/hover/active/disabled

**Status Bar (H)**:
- Mouse coordinates (X/Y) — real-time from X6
- Zoom percentage — from X6
- Grid status: ON/OFF
- AI status: "● Offline" (gray — no AI connected)

### 2.4 AntV X6 Canvas

Configuration per `docs/architecture.md` §6.3 and `docs/ui-design.md` §3.6.1:

```typescript
{
  width: 4000,
  height: 3000,
  grid: { visible: true, size: 10, type: 'dot', args: { color: '#ddd', thickness: 1 } },
  background: { color: '#FFFFFF' },
  mousewheel: { enabled: true, modifiers: 'ctrl', minScale: 0.2, maxScale: 4 },
  panning: { enabled: true },
  connecting: {
    router: { name: 'manhattan' },
    connector: { name: 'rounded', args: { radius: 2 } },
    snap: { radius: 20 },
    allowBlank: false,
    allowLoop: false,
    allowMulti: false,
    highlight: true,
  },
  highlighting: {
    magnetAdsorbed: {
      name: 'stroke',
      args: { attrs: { fill: '#5F95FF', stroke: '#5F95FF' } },
    },
  },
}
```

**Plugins**:
- Selection: `{ enabled: true, multiple: true, rubberband: true, movable: true, showNodeSelectionBox: true }`
- Snapline: `{ enabled: true }`
- Keyboard: `{ enabled: true }` — bind Delete key to remove selected cells
- Clipboard: `{ enabled: true }`
- MiniMap: `{ container: #minimap, width: 200, height: 160 }`

**Registered Shapes** (7 components — 5 basic + 2 power symbols):

| Shape Name | Component | Size (W×H) | Pins | SVG Style |
|------------|-----------|------------|------|-----------|
| `schematic-resistor` | ResistorNode | 80×30 | 2 (left/right) | Rectangular block, LCEDA green `#4B8B3B` |
| `schematic-capacitor` | CapacitorNode | 60×30 | 2 (left/right) | Two parallel lines |
| `schematic-diode` | DiodeNode | 60×40 | 2 (A/K) | Triangle + bar |
| `schematic-led` | LEDNode | 60×40 | 2 (A/K) | Diode + arrows |
| `schematic-ic` | ICNode | 120×max(80, pin_count×20) | Dynamic (min:4, max:40, default:8) | Rectangle + pin labels |
| `schematic-vcc` | VCCNode | 30×20 | 1 (bottom) | Upward arrow, text color `#FF0000` |
| `schematic-gnd` | GNDNode | 30×20 | 1 (top) | Three decreasing horizontal lines, `#000000` |

> **Expansion note**: Remaining shapes from `ui-design.md` §3.6.2 (electrolytic capacitor, inductor, NPN, N-MOS, op-amp) are deferred to Iteration 2. The shape registration architecture (`registerShapes.ts`) must be extensible — each shape is registered via a standalone function, new shapes are added without modifying existing code.

**Wire edge style** (`schematic-wire`):
- Stroke: `#4B8B3B`, width 1.5px
- Router: manhattan, Connector: rounded (radius 2)
- No markers

**Canvas interactions enabled in this iteration**:
- Zoom (Ctrl+scroll), pan (middle-click drag / space+drag)
- Click to select, Ctrl+click for multi-select, rubber-band selection
- Drag to move selected nodes
- Delete key to remove selected cells
- Connect pins by dragging from port to port (basic)
- Status bar updates on mouse move and zoom change

### 2.5 Welcome Page

Per `docs/ui-design.md` §3.1:
- Shown when no project is open (replaces canvas area)
- Logo + app name centered
- Two action buttons: "New Project" / "Open Project"
- Recent projects list (reads from stub — initially empty)
- "New Project" opens NewProjectDialog modal
- "Open Project" calls `window.electronAPI.system.showOpenDialog`

**NewProjectDialog** per `docs/ui-design.md` §3.2:
- Project name input (validation: non-empty, 1-64 chars, no special fs chars)
- Storage path input + "Browse" button (calls showOpenDialog for directory)
- Cancel / Create buttons
- On "Create": for now, just close dialog and switch to canvas view (no actual file creation until Iteration 3)

### 2.6 Conditional Compilation Logger

```typescript
// src/shared/utils/logger.ts
const IS_DEV = import.meta.env.DEV;

type LogFn = (tag: string, ...args: unknown[]) => void;

const noop: LogFn = () => {};

const createDevLog = (level: string, consoleFn: (...args: unknown[]) => void): LogFn =>
  (tag: string, ...args: unknown[]) => {
    consoleFn(`%c[${level}][${tag}]`, 'color: gray; font-weight: bold', ...args);
  };

export const logger = {
  /** Debug output — stripped in production builds via tree-shaking */
  debug: IS_DEV ? createDevLog('DBG', console.log) : noop,
  /** Info output — stripped in production builds */
  info: IS_DEV ? createDevLog('INF', console.info) : noop,
  /** Warnings — always present */
  warn: (tag: string, ...args: unknown[]) =>
    console.warn(`[WARN][${tag}]`, ...args),
  /** Errors — always present */
  error: (tag: string, ...args: unknown[]) =>
    console.error(`[ERR][${tag}]`, ...args),
} as const;
```

**Behavior**:
- `dev` mode (`npm run dev`): `debug` / `info` print with colored tags
- `production` build (`npm run build`): `debug` / `info` are `noop`, Vite dead-code elimination removes them entirely; zero runtime cost
- `warn` / `error` always active in both modes

**Usage convention**:
- Tag = module name, e.g. `logger.debug('Canvas', 'Graph initialized', { width, height })`
- Every module should use consistent tags for easy log filtering

### 2.7 Zustand Stores

**useAppStore** — global application state:
```typescript
interface AppState {
  // View
  currentView: 'welcome' | 'editor';
  // Panel visibility
  componentLibraryVisible: boolean;
  aiChatPanelVisible: boolean;
  propertyPanelVisible: boolean;
  // Project (skeleton)
  projectName: string | null;
  projectPath: string | null;
  // Actions
  setCurrentView: (view: AppState['currentView']) => void;
  toggleComponentLibrary: () => void;
  toggleAIChatPanel: () => void;
  setPropertyPanelVisible: (visible: boolean) => void;
  setProject: (name: string, path: string) => void;
}
```

**useCanvasStore** — canvas-specific state:
```typescript
interface CanvasState {
  // Viewport
  zoom: number;
  cursorX: number;
  cursorY: number;
  gridVisible: boolean;
  // Tool mode
  activeTool: 'select' | 'pan' | 'boxSelect';
  // Selection
  selectedNodeIds: string[];
  // Actions
  setZoom: (zoom: number) => void;
  setCursor: (x: number, y: number) => void;
  toggleGrid: () => void;
  setActiveTool: (tool: CanvasState['activeTool']) => void;
  setSelectedNodes: (ids: string[]) => void;
}
```

---

## 3. Constraints

- **No AI backend** in this iteration — AI panel is UI-only placeholder
- **No file persistence** — project create/save/open are stubs
- **No Domain Core** — components are added directly to X6 graph (Domain layer comes in Iteration 2)
- **No Command Bus** — undo/redo buttons present but disabled
- **No export** — export menu items present but disabled
- All component symbols follow LCEDA (嘉立创 EDA) visual standard:
  - Outline color: `#4B8B3B`
  - Reference designator color: `#0000FF`
  - Value text color: `#000000`
  - Pin port color: `#5F95FF`

### 3.1 Resolved Design Constraints

The following decisions were resolved during plan review and are **binding** for implementation:

#### C1 — Drag-and-Drop Mechanism
- **Decision**: Use X6 `Addon.Dnd` (built-in plugin)
- **Rationale**: Automatic coordinate transformation under zoom/pan, native grid snap support, minimal code
- **Drag payload**: `{ shape: string, data: { label, refDesPrefix, category } }`
- **Drop behavior**: Grid-snapped placement at graph coordinates; auto-assign next monotonic reference designator

#### C2 — Reference Designator Allocation
- **Decision**: Monotonic increment, no gap reuse
- **Strategy**: Per-prefix counter (R→1,2,3..; C→1,2,3..) stored in `useCanvasStore`. Deleting R2 does NOT make the next resistor R2 — it remains R3
- **Scope**: Global (single sheet in Iteration 1). Per-sheet isolation deferred to multi-sheet iteration
- **Copy-paste**: Pasted nodes receive new designators; position offset by `(20, 20)px`
- **Manual renumber**: Not implemented in Iteration 1; reserved for future toolbar action

#### C3 — State Authority (Source of Truth)
- **Decision**: X6 Graph is authoritative for node/edge data; Zustand stores only derived UI state
- **Sync direction**: One-way — X6 graph events → Zustand store updates
- **Zustand scope**: `zoom`, `cursorX/Y`, `selectedNodeIds`, `gridVisible`, `activeTool`
- **Canvas mutations**: All canvas operations (add/move/delete/connect) go directly to X6 Graph API
- **Migration note**: In Iteration 2, Domain Core becomes authoritative; X6 becomes a view projection

#### C4 — Keyboard Shortcut Precedence
- **Decision**: Focus-layered priority
- **Priority stack** (highest → lowest):
  1. Text input focused → browser default behavior (typing characters, Ctrl+A selects text)
  2. Electron `globalShortcut` → always active (none registered in Iter-1)
  3. Electron `Menu` accelerators → global: Ctrl+Z/Y/S/O/N, Ctrl+Shift+L/R/S, Ctrl+0/+/-, Ctrl+G
  4. X6 `keyboard` plugin → canvas-focused only: Delete, V, H, B, R, X, N, P
  5. React `onKeyDown` → component-level (e.g., Escape to close dialogs)
- **Conflict rule**: Single-letter keys (V/H/B/R/X/N/P) MUST NOT fire when any `<input>`, `<textarea>`, or `[contenteditable]` element has focus

#### C5 — Canvas Boundary Behavior
- **Decision**: Auto-scroll on drag near edge
- **Behavior**: When dragging a node/component within 50px of visible viewport edge, canvas auto-pans at 8px/frame in that direction
- **Drop outside 4000×3000**: Clamp to nearest valid grid point within canvas bounds
- **User feedback**: None needed — auto-scroll is seamless

#### C6 — Panel Resize & Collapse
- **Implementation**: CSS Grid with `grid-template-columns` dynamically controlled by Zustand state
- **Resize**: Custom splitter (4px hit area, cursor: `col-resize`), `pointer-capture` during drag
- **Width memory**: Panel widths stored in `useAppStore` (session-level, not persisted). Collapse/expand restores last width
- **Constraints**: B panel: 180–360px (default 240px); E panel: 280–520px (default 360px)
- **Animation**: Collapse/expand uses `200ms ease-out` CSS transition on `grid-template-columns`

#### C7 — Event Throttling
- **Decision**: `requestAnimationFrame`-based throttling
- **High-frequency events**:
  - `graph:mousemove` → `rAF`-gated → `useCanvasStore.setCursor(x, y)`
  - `node:moving` → `rAF`-gated → (no store update needed in Iter-1, visual handled by X6)
  - `graph:scale` → direct → `useCanvasStore.setZoom(scale)`
  - `selection:changed` → direct (no throttle) → `useCanvasStore.setSelectedNodes(ids)`

#### C8 — Performance Targets
- **React-shape threshold**: ≤200 nodes per sheet → use `@antv/x6-react-shape` freely
- **Warning**: When node count exceeds 200, show status bar warning: "⚠ 200+ components — performance may degrade"
- **No SVG fallback in Iter-1**: Pure SVG/markup shape degradation is deferred to performance optimization iteration
- **Target FPS**: ≥30fps at 200 nodes during pan/zoom; ≥60fps at ≤100 nodes

#### C9 — IC Pin Model
- **Pin count**: Static at creation time. Min: 4, Max: 40, Default: 8
- **Height formula**: `max(80, pin_count × 20)` px, width fixed at 120px
- **Pin layout**: Left side: pins 1..⌈n/2⌉, Right side: pins ⌈n/2⌉+1..n
- **Pin labels**: Default "P1", "P2"... — editable via property panel in future iteration
- **Dynamic resize**: Not supported in Iter-1

#### C10 — Error Handling Strategy
- **Shape registration failure**: `logger.error('Shapes', ...)` + status bar warning "Shape registration failed" (3s)
- **Plugin init failure**: `logger.error('Canvas', ...)` + status bar warning; canvas still functional without failed plugin
- **DnD invalid payload**: Silently reject drop, `logger.warn('DnD', ...)`. No crash, no modal
- **Unknown component type**: Render as generic IC rectangle with "?" marker + `logger.warn`
- **Principle**: Never crash, never block user. Degrade gracefully and log for debugging

#### C11 — IPC Security Baseline
- `contextIsolation: true`, `nodeIntegration: false` (already in proposal §2.2)
- Preload exposes ONLY methods listed in §2.2 via `contextBridge`
- Iteration 1 stubs do NOT need Zod validation (no real data flow). Zod validation mandatory from Iteration 2+
- Iter-1 stub runtime behavior: stubs return hardcoded values (empty arrays, success booleans) — no untrusted input processing, no filesystem access
- `webPreferences.sandbox: true` when Electron ≥ 33 defaults allow

#### C12 — Clipboard Metadata Sanitization
- On paste: regenerate `node.id` (UUID), strip any `_x6_*` internal keys, strip `plugin_*` transient data
- Preserve: `shape`, `data.label`, `data.refDesPrefix`, `data.category`, port definitions, geometry (position+size)
- Assign new designator via `getNextRefDes(prefix)`, apply `(20, 20)px` position offset

#### C13 — X6→Zustand Event Contract
- **Event map** (exhaustive for Iter-1):
  | X6 Event | Zustand Target | Payload | Throttle |
  |----------|---------------|---------|----------|
  | `graph:mousemove` | `useCanvasStore.setCursor` | `{ x: number, y: number }` (graph coords) | rAF |
  | `graph:scale` | `useCanvasStore.setZoom` | `{ sx: number }` (scale factor) | none |
  | `selection:changed` | `useCanvasStore.setSelectedNodes` | `{ added: Cell[], removed: Cell[] }` → extract `id[]` | none |
  | `node:added` | status bar node count check | `{ node: Node }` → increment count | none |
  | `node:removed` | status bar node count check | `{ node: Node }` → decrement count | none |
- **Transaction boundary**: Each event handler completes synchronously. No batching across events in Iter-1
- **No reverse sync**: Zustand → X6 writes go through explicit Graph API calls, never through store subscriptions

#### C14 — Electron globalShortcut in Iter-1
- **No `globalShortcut` registered** in Iteration 1 — only Electron Menu accelerators are used
- Menu accelerators are automatically suppressed when BrowserWindow loses focus (Electron default behavior)
- Single-letter shortcut guard (C4) is implemented at X6 keyboard plugin level: check `document.activeElement` tag before dispatching

---

## 4. Success Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | `npm run dev` launches Electron window within 3s | Manual test |
| 2 | UI layout matches §2.1 wireframe with all 8 zones visible | Visual inspection |
| 3 | X6 canvas displays dot grid, supports Ctrl+scroll zoom and pan | Manual test |
| 4 | Can drag a resistor from component library to canvas | Manual test |
| 5 | Can connect two component pins with a wire | Manual test |
| 6 | Can select and delete a component with Delete key | Manual test |
| 7 | Status bar shows real-time cursor coordinates and zoom level | Manual test |
| 8 | MiniMap renders and allows viewport dragging | Manual test |
| 9 | Welcome page shows on startup, "New Project" opens dialog | Manual test |
| 10 | Component library panel collapses/expands via Ctrl+Shift+L | Manual test |
| 11 | AI chat panel collapses/expands via Ctrl+Shift+R | Manual test |
| 12 | `logger.debug` outputs in dev mode, silent in production build | Build + run both modes |
| 13 | All 7 component shapes (5 basic + VCC + GND) render with correct LCEDA-style SVG | Visual inspection |
| 14 | VCC and GND power symbols can be placed and connected | Manual test |
| 15 | Copy-paste assigns new designators with (20,20)px offset | Manual test |
| 16 | Panel resize preserves width after collapse/expand cycle | Manual test |
