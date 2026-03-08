## 1. 依赖与类型准备

- [x] 1.1 Run `npm install exceljs` and verify it appears in `package.json` dependencies
- [x] 1.2 Add `AnalysisItem`, `AnalysisReport`, `BOMRow`, `VersionEntry` interfaces to `src/shared/types/project.ts`

## 2. ClaudeProvider — AI 分析

- [x] 2.1 Add `analyzeSchematic(netlist: NetlistContext): Promise<AnalysisReport>` method to `ClaudeProvider` using non-streaming `messages.create()`; system prompt instructs Claude to return JSON in a markdown code block with `errors[]`, `warnings[]`, `suggestions[]`
- [x] 2.2 Implement JSON extraction: strip markdown code fence from response text, call `JSON.parse`; on failure return `{ errors: [], warnings: [], suggestions: [{ severity: 'suggestion', message: rawText }] }`
- [x] 2.3 Select model name using same `isOfficialApi` logic as existing methods

## 3. AIService — ai:analyze IPC

- [x] 3.1 Add `ipcMain.handle('ai:analyze', ...)` handler in `AIService.ts` that calls `provider.analyzeSchematic(netlist)` and returns the `AnalysisReport`
- [x] 3.2 Add `ai.analyze(netlist)` to `src/preload/index.ts` via `ipcRenderer.invoke('ai:analyze', netlist)`

## 4. AIChatPanel — 分析按钮与结果渲染

- [x] 4.1 Add `isAnalyzing: boolean` local state to `AIChatPanel`
- [x] 4.2 Add "电路分析" Button above the input area; disable when `nodeCount === 0 || isGenerating || isAnalyzing`; show `LoadingOutlined` when `isAnalyzing`
- [x] 4.3 Implement `handleAnalyze()`: set `isAnalyzing = true`, call `window.electronAPI.ai.analyze(netlistManager.serialize())`, push result as a new `{ role: 'analysis', report: AnalysisReport }` message into chat history; set `isAnalyzing = false` in finally block
- [x] 4.4 Add `AnalysisResultBubble` component (inline or separate file) that renders an `AnalysisReport`: red section for errors, yellow for warnings, blue for suggestions, green "分析完成" when all arrays empty; each item shows `message` + optional `(component)` suffix

## 5. ExportService — BOM 导出

- [x] 5.1 Add `exportBOM(rows: BOMRow[], destPath: string): Promise<void>` to `ExportService`; create ExcelJS `Workbook`, add worksheet "BOM", add bold header row (序号/位号/名称/值/封装/数量/描述), add data rows, call `workbook.xlsx.writeFile(destPath)`
- [x] 5.2 Add `ipcMain.handle('export:bom', ...)` handler in `src/main/index.ts` receiving `{ rows, destPath }`, calling `exportService.exportBOM()`
- [x] 5.3 Add `export.bom(rows, destPath)` to `src/preload/index.ts` via `ipcRenderer.invoke('export:bom', { rows, destPath })`

## 6. ExportDialog — BOM 标签页

- [x] 6.1 Add BOM aggregation helper `aggregateBOM(netlist: NetlistDSL): BOMRow[]` that groups components by `(type, label, value, package)`, assigns 1-based index, merges `refDes` strings, counts `quantity`
- [x] 6.2 Add "BOM" as a third tab in `ExportDialog`'s `Tabs` component
- [x] 6.3 Implement BOM tab content: lazy-compute `bomRows` when tab becomes active, render Ant Design `Table` with columns 序号/位号/名称/值/数量
- [x] 6.4 Add "Export BOM" button in BOM tab: show `dialog.showSaveDialog` for `.xlsx`, call `export.bom(bomRows, destPath)`, show `message.success` or `message.error`

## 7. VersionService — 快照管理

- [x] 7.1 Create `src/main/services/VersionService.ts` with class skeleton; implement private `getVersionsDir(projectPath: string): string` returning `path.join(path.dirname(projectPath), '.aischematic_versions')`
- [x] 7.2 Implement `createSnapshot(projectPath: string, data: ProjectFileData): void`: ensure versions dir exists, write `Date.now().toString() + '.json'`, prune oldest if count > 50
- [x] 7.3 Implement `listVersions(projectPath: string): VersionEntry[]`: read dir (return `[]` if missing), parse filenames as timestamps, map to `VersionEntry`, sort newest-first
- [x] 7.4 Implement `restoreVersion(projectPath: string, versionId: string): ProjectFileData`: read and parse snapshot file, throw if missing
- [x] 7.5 Instantiate `VersionService` in `app.whenReady()` in `src/main/index.ts`
- [x] 7.6 Add `ipcMain.handle('version:list', ...)` and `ipcMain.handle('version:restore', ...)` handlers
- [x] 7.7 Add `version.list(projectPath)` and `version.restore(projectPath, versionId)` to `src/preload/index.ts`

## 8. FileService — 触发快照

- [x] 8.1 Pass `versionService` reference into `FileService` (or call from `main/index.ts` after `fileService.save()` resolves) so that every `file:saveProject` and `autosave:respond` handler calls `versionService.createSnapshot(projectPath, data)` in a try/catch (log error, never throw)

## 9. VersionHistoryDrawer UI

- [x] 9.1 Create `src/renderer/components/dialogs/VersionHistoryDrawer.tsx` — Ant Design `Drawer` (width=360, placement="right", title="版本历史")
- [x] 9.2 On Drawer open: call `window.electronAPI.version.list(projectPath)` and store in local state; show `Spin` while loading
- [x] 9.3 Render Ant Design `Timeline` with one item per `VersionEntry`: show formatted `savedAt`, `projectName`, size in KB
- [x] 9.4 Add "恢复" `Button type="link"` per timeline item; on click show `Modal.confirm('确认恢复到该版本？', ...)`
- [x] 9.5 On confirm: call `window.electronAPI.version.restore(projectPath, versionId)`, apply result via `graph.fromJSON(data.canvas)` + `netlistManager.loadFromDSL(data.schema)` + `useAppStore.getState().markDirty()`, show `message.success('已恢复到该版本')`, close Drawer
- [x] 9.6 Mount `<VersionHistoryDrawer />` in `AppLayout.tsx` alongside existing `ExportDialog` and `SettingsDialog`

## 10. 版本历史菜单集成

- [x] 10.1 Add "Version History" separator + menu item in the File menu in `src/main/index.ts` that calls `mainWindow.webContents.send('menu:version-history')`
- [x] 10.2 Add `menu:version-history` IPC listener in `AppLayout.tsx` that sets Drawer open state to `true`

## 11. 元器件库扩展 — 新节点组件

- [x] 11.1 Create `src/renderer/components/shapes/components/InductorNode.tsx` — SVG coil symbol, 2 ports (L, R)
- [x] 11.2 Create `src/renderer/components/shapes/components/FuseNode.tsx` — SVG rectangular fuse symbol, 2 ports (L, R)
- [x] 11.3 Create `src/renderer/components/shapes/components/ZenerNode.tsx` — SVG zener diode symbol (bent cathode bar), 2 ports (A, K)
- [x] 11.4 Create `src/renderer/components/shapes/components/SchottkyNode.tsx` — SVG schottky symbol (S-shaped cathode bar), 2 ports (A, K)
- [x] 11.5 Create `src/renderer/components/shapes/components/NPNNode.tsx` — SVG NPN BJT symbol, 3 ports (B, C, E)
- [x] 11.6 Create `src/renderer/components/shapes/components/PNPNode.tsx` — SVG PNP BJT symbol, 3 ports (B, C, E)
- [x] 11.7 Create `src/renderer/components/shapes/components/NMOSNode.tsx` — SVG N-channel MOSFET symbol, 3 ports (G, D, S)
- [x] 11.8 Create `src/renderer/components/shapes/components/PMOSNode.tsx` — SVG P-channel MOSFET symbol, 3 ports (G, D, S)
- [x] 11.9 Create `src/renderer/components/shapes/components/OpAmpNode.tsx` — SVG triangular op-amp symbol, 5 ports (IN+, IN-, V+, V-, OUT)
- [x] 11.10 Create `src/renderer/components/shapes/components/GateAndNode.tsx` — SVG AND gate (D-shape body), ports (A, B, Y)
- [x] 11.11 Create `src/renderer/components/shapes/components/GateOrNode.tsx` — SVG OR gate (curved body), ports (A, B, Y)
- [x] 11.12 Create `src/renderer/components/shapes/components/GateNotNode.tsx` — SVG NOT gate (triangle + bubble), ports (A, Y)
- [x] 11.13 Create `src/renderer/components/shapes/components/GateNandNode.tsx` — SVG NAND gate (AND + bubble), ports (A, B, Y)
- [x] 11.14 Create `src/renderer/components/shapes/components/GateNorNode.tsx` — SVG NOR gate (OR + bubble), ports (A, B, Y)
- [x] 11.15 Create `src/renderer/components/shapes/components/CrystalNode.tsx` — SVG crystal oscillator symbol, 2 ports (P1, P2)

## 12. 元器件库扩展 — 注册 X6 形状

- [x] 12.1 Register `schematic-inductor`, `schematic-fuse`, `schematic-zener`, `schematic-schottky` in `registerShapes.ts`
- [x] 12.2 Register `schematic-npn`, `schematic-pnp`, `schematic-nmos`, `schematic-pmos` in `registerShapes.ts`
- [x] 12.3 Register `schematic-opamp` in `registerShapes.ts`
- [x] 12.4 Register `schematic-gate-and`, `schematic-gate-or`, `schematic-gate-not`, `schematic-gate-nand`, `schematic-gate-nor` in `registerShapes.ts`
- [x] 12.5 Register `schematic-crystal` in `registerShapes.ts`

## 13. 元器件库扩展 — LIBRARY_DATA 填充

- [x] 13.1 Add to 无源器件: capacitor-electrolytic (`schematic-ic` pinCount=2 or dedicated), inductor (`schematic-inductor`), ferrite-bead (`schematic-inductor`), fuse (`schematic-fuse`)
- [x] 13.2 Add to 二极管: zener (`schematic-zener`), schottky (`schematic-schottky`)
- [x] 13.3 Add to 三极管: NPN (`schematic-npn`), PNP (`schematic-pnp`)
- [x] 13.4 Add to MOS管: N-MOS (`schematic-nmos`), P-MOS (`schematic-pmos`)
- [x] 13.5 Add to 运算放大器: single op-amp (`schematic-opamp`), dual op-amp (`schematic-ic` pinCount=8), quad op-amp (`schematic-ic` pinCount=14)
- [x] 13.6 Add to 逻辑门: AND (`schematic-gate-and`), OR (`schematic-gate-or`), NOT (`schematic-gate-not`), NAND (`schematic-gate-nand`), NOR (`schematic-gate-nor`)
- [x] 13.7 Add to 常用IC: 555 timer (`schematic-ic` pinCount=8), LDO generic (`schematic-ic` pinCount=3), DC-DC generic (`schematic-ic` pinCount=8), MCU-32 (`schematic-ic` pinCount=32), MCU-48 (`schematic-ic` pinCount=48)
- [x] 13.8 Add to 连接器: 2P header (`schematic-ic` pinCount=2), 4P header (`schematic-ic` pinCount=4), 6P header (`schematic-ic` pinCount=6), USB-TypeC (`schematic-ic` pinCount=6), DC jack (`schematic-ic` pinCount=2)
- [x] 13.9 Add to 电源符号: VDD (`schematic-vcc`), AGND (`schematic-gnd`), +3.3V (`schematic-vcc`), +5V (`schematic-vcc`), +12V (`schematic-vcc`) — differentiated by label
- [x] 13.10 Add to 其他: crystal (`schematic-crystal`), buzzer (`schematic-ic` pinCount=2), relay (`schematic-ic` pinCount=5), optocoupler (`schematic-ic` pinCount=4)

## 14. DynamicSymbolRenderer

- [x] 14.1 Create `src/renderer/components/canvas/DynamicSymbolRenderer.ts` exporting `createDynamicNode(pinCount: number, label: string): NodeConfig` that reuses `schematic-ic` shape with auto-calculated height and evenly distributed ports

## 15. 集成测试

- [ ] 15.1 Manual test: open project with components → click "电路分析" → verify analysis result bubble appears with colored sections
- [ ] 15.2 Manual test: AI analysis on empty canvas → verify button is disabled
- [ ] 15.3 Manual test: Export Dialog → BOM tab → verify component list is aggregated correctly (same-value resistors merged)
- [ ] 15.4 Manual test: BOM export → verify `.xlsx` file opens in Excel with correct columns and data
- [ ] 15.5 Manual test: save project → navigate to `{projectDir}/.aischematic_versions/` → verify snapshot `.json` file exists
- [ ] 15.6 Manual test: save project 51 times → verify only 50 snapshot files remain in versions dir
- [ ] 15.7 Manual test: File > Version History → verify Drawer opens with timeline of saves
- [ ] 15.8 Manual test: restore a version from Drawer → verify canvas and domain state revert correctly
- [ ] 15.9 Manual test: drag inductor, NPN, AND gate from library to canvas → verify all render correctly
- [ ] 15.10 Manual test: search "zener" in component library → verify zener diode item appears in results
