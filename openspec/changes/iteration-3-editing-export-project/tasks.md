## 1. FileService — Main Process (新建)

- [x] 1.1 Create `src/main/services/FileService.ts` with class skeleton and path constants (`RECENT_PATH = app.getPath('userData')/recent.json`)
- [x] 1.2 Implement `FileService.save(projectPath: string, data: ProjectFileData): void` using atomic tmp→rename write
- [x] 1.3 Implement `FileService.open(projectPath: string): ProjectFileData` with JSON parse and version check
- [x] 1.4 Implement `FileService.getRecentProjects(): RecentEntry[]` (reads/parses `recent.json`, returns `[]` on missing file)
- [x] 1.5 Implement `FileService.addRecentProject(entry: RecentEntry): void` (prepend, deduplicate by path, cap at 10, write back)
- [x] 1.6 Define shared type `ProjectFileData = { schema: NetlistDSL; canvas: object; meta: { name: string; version: string; savedAt: string } }` in `src/shared/types/project.ts`
- [x] 1.7 Implement auto-save: `FileService.startAutoSave(intervalMs = 60000)` using `setInterval` that emits `autosave:request` IPC event to renderer; interval SHALL only be started after `projectPath` is set; auto-save failures are logged to console only (silent UX)
- [x] 1.8 Implement `FileService.stopAutoSave()` to clear the interval

## 2. FileService — IPC Wiring in main/index.ts

- [x] 2.1 Instantiate `FileService` in `app.whenReady()` alongside `AIService`
- [x] 2.2 Replace stub `file:createProject` handler: show save dialog, create initial empty `.aischematic` file, call `fileService.addRecentProject()`, return `{ success: true, path }`
- [x] 2.3 Replace stub `file:saveProject` handler: receive `{ path, data }`, call `fileService.save()`, call `fileService.addRecentProject()`, rebuild Recent Projects menu, return `{ success: true }`
- [x] 2.4 Replace stub `file:openProject` handler: call `fileService.open(path)`, call `fileService.addRecentProject()`, rebuild Recent Projects menu, return `{ success: true, data }`
- [x] 2.5 Replace stub `file:getRecentProjects` handler: call `fileService.getRecentProjects()`, return the array
- [x] 2.6 Add `ipcMain.handle('autosave:respond', ...)` that receives graph+netlist data from renderer and calls `fileService.save()` silently
- [x] 2.7 Implement `rebuildRecentMenu()` helper that reads recent list and rebuilds the `Recent Projects` submenu in the native menu
- [x] 2.8 Add `file:openDialog` IPC handler that shows `dialog.showOpenDialog` filtered to `*.aischematic` and returns the chosen path

## 3. FileService — Preload API Extension

- [x] 3.1 Add `file.saveProject(path: string, data: ProjectFileData)` to `src/preload/index.ts`
- [x] 3.2 Add `file.openProject(path: string)` to `src/preload/index.ts`
- [x] 3.3 Add `file.openDialog()` to `src/preload/index.ts` (calls `file:openDialog` handler)
- [x] 3.4 Add `ipcRenderer.on('autosave:request', callback)` subscription helper in preload
- [x] 3.5 Update `src/renderer/types/electron.d.ts` to reflect the new API signatures

## 4. ExportService — Main Process (新建)

- [x] 4.1 Create `src/main/services/ExportService.ts` with class skeleton
- [x] 4.2 Implement `ExportService.exportPNG(pngDataUrl: string, destPath: string): Promise<void>` — decode base64 PNG data URL from renderer canvas rendering, write PNG buffer to destPath
- [x] 4.3 Implement `ExportService.exportPDF(destPath: string, landscape: boolean): Promise<void>` — call `mainWindow.webContents.printToPDF({ printBackground: true, paperSize: 'A4', landscape })`, write buffer to file
- [x] 4.4 Add IPC handler `export:png` that receives `{ pngDataUrl, destPath }` and calls `exportService.exportPNG()`
- [x] 4.5 Add IPC handler `export:pdf` that receives `{ destPath, landscape }` and calls `exportService.exportPDF()`
- [x] 4.6 Instantiate `ExportService` in `app.whenReady()`, pass `mainWindow` reference after window creation
- [x] 4.7 Enable the `Tools › Export` submenu (remove `enabled: false`) and hook `menu:export-png` / `menu:export-pdf` send calls

## 5. ExportDialog — Renderer (新建)

- [x] 5.1 Create `src/renderer/components/dialogs/ExportDialog.tsx` with Ant Design Modal
- [x] 5.2 Add scale selector (Radio.Group: 1×, 2×, 4×) shown for PNG exports
- [x] 5.3 Add orientation selector (Radio.Group: Portrait, Landscape) shown for PDF exports only; paper size is fixed at A4 (no selector needed)
- [x] 5.4 Wire Confirm button: for PNG, serialize graph SVG via DOM, render to canvas, send PNG data URL; for PDF invoke `export:pdf` with `{ destPath, landscape }`. Cancelling ExportDialog must NOT trigger any IPC call.
- [x] 5.5 Show success notification (Ant Design `message.success`) on completion; show error notification on failure
- [x] 5.6 Export preload bindings: add `export.png(pngDataUrl, destPath)` and `export.pdf(destPath, landscape)` to preload

## 6. PropertyPanel — Full Implementation (重写)

- [x] 6.1 Rewrite `src/renderer/components/panels/PropertyPanel.tsx` — read `node.getData()` from selected X6 node, populate form with all fields
- [x] 6.2 Implement read-only position/rotation display (subscribe to `node:change:position` and `node:change:angle` X6 events)
- [x] 6.3 Implement editable fields with Ant Design Form: RefDes, Value, Package, Tolerance, Rating
- [x] 6.4 Implement Notes as Ant Design Input.TextArea (4 rows)
- [x] 6.5 Add Zod validation: RefDes non-empty rule; Value non-empty rule; all others optional
- [x] 6.6 On field blur or Enter: dispatch `UpdatePropertyCommand` through `commandBus` from `DomainContext`
- [x] 6.7 Subscribe to `EventBus` `PROPERTY_UPDATED` events to refresh form when undo/redo changes the selected node's properties
- [x] 6.8 Handle multi-select state: show "N components selected" placeholder, hide form
- [x] 6.9 Ensure form is disabled (read-only) during AI generation (when `isGenerating` is true in some shared state, or simply check canvas store)

## 7. AppLayout — Menu IPC Wiring (修改)

- [x] 7.1 Add `menu:save` listener: get current `projectPath` from `useAppStore`; if set call `graph.toJSON()` + `netlistManager.serialize()` and invoke `file:saveProject`; else fall through to Save As flow
- [x] 7.2 Add `menu:save-as` listener: show system save dialog filtered to `*.aischematic`, then invoke `file:saveProject` with new path, update `useAppStore.projectPath`
- [x] 7.3 Add `menu:open-project` listener: if `isDirty === true`, show native dialog with Save/Discard/Cancel — Save calls save flow first, Cancel aborts the entire open flow; then call `file.openDialog()`, invoke `file:openProject`, call `graph.fromJSON(data.canvas)`, call `netlistManager.loadFromDSL(data.schema)`, call `useAppStore.setProject()`, set `isDirty = false`
- [x] 7.4 Add `menu:undo` listener: call `commandBus.undo()` from `useDomain()`
- [x] 7.5 Add `menu:redo` listener: call `commandBus.redo()` from `useDomain()`
- [x] 7.6 Add `menu:delete` listener: call `graph.removeCells(graph.getSelectedCells())`
- [x] 7.7 Add `menu:select-all` listener: call `graph.select(graph.getNodes())`
- [x] 7.8 Add `menu:zoom-in` listener: call `graph.zoom(0.1)`
- [x] 7.9 Add `menu:zoom-out` listener: call `graph.zoom(-0.1)`
- [x] 7.10 Add `menu:zoom-fit` listener: call `graph.zoomToFit({ padding: 40 })`
- [x] 7.11 Add `menu:export-png` listener: show system save dialog then open `ExportDialog` in PNG mode
- [x] 7.12 Add `menu:export-pdf` listener: show system save dialog then open `ExportDialog` in PDF mode
- [x] 7.13 Mount `ExportDialog` in AppLayout JSX (alongside existing `SettingsDialog`)
- [x] 7.14 Register `autosave:request` IPC listener: respond with current `graph.toJSON()` + `netlistManager.serialize()` via `autosave:respond`

## 8. AIChatPanel — Modify Mode + Context (修改)

- [x] 8.1 Subscribe to `useCanvasStore.nodeCount` to determine generate vs modify mode
- [x] 8.2 In `handleSend`: if `nodeCount > 0`, call `ai:modify` with `{ instruction: input, context: netlistManager.serialize() }`; else call `ai:generate` with prompt only (existing path)
- [x] 8.3 Add modify-mode indicator: when `nodeCount > 0`, display a small "Modify mode" badge/label above the input field using Ant Design Tag or Typography.Text
- [x] 8.4 Access `netlistManager` from `useDomain()` context hook

## 9. useAppStore — Project Path State

- [x] 9.1 Add `projectPath: string | null` and `setProjectPath(path: string): void` to `useAppStore` (may already exist — verify and add if missing)
- [x] 9.2 Add `isDirty: boolean` and `markDirty() / markClean()` to track unsaved changes; `isDirty` is set to `true` on any `CommandBus.execute()` call, and to `false` after successful save, save-as, auto-save, or open
- [x] 9.3 Set window title to `"<ProjectName> — AI Schematic"` (or `"● <ProjectName>"` when dirty) by calling `document.title` in a `useEffect` watching `projectName` and `isDirty`

## 10. Integration Testing

- [ ] 10.1 Manual test: create project → add 3 components → Save (Ctrl+S) → verify `.aischematic` file exists and parses correctly
- [ ] 10.2 Manual test: open saved `.aischematic` file → verify canvas and domain state are restored (same components, same positions)
- [ ] 10.3 Manual test: edit component value via PropertyPanel → Ctrl+Z → verify value reverts on form and canvas
- [ ] 10.4 Manual test: AI generate circuit → send follow-up message → verify `ai:modify` is called (check devtools IPC log)
- [ ] 10.5 Manual test: Tools › Export › Export PNG → verify PNG file is created and viewable
- [ ] 10.6 Manual test: Tools › Export › Export PDF → verify PDF file is created and openable
- [ ] 10.7 Manual test: wait 60 seconds with open project → verify auto-save updates file modification time on disk
- [ ] 10.8 Manual test: File › Recent Projects → verify saved project appears; open it → verify it loads correctly
