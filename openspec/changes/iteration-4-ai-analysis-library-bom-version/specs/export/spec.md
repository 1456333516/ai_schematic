## MODIFIED Requirements

### Requirement: ExportDialog has three tabs (PNG, PDF, BOM)
`ExportDialog` SHALL present three tabs: "PNG"、"PDF"、"BOM".

Existing PNG and PDF tab behavior is unchanged. The new BOM tab SHALL:
- Show a read-only preview `Table` with columns: 序号, 位号, 名称, 值, 数量
- Pre-aggregate component data from `netlistManager.serialize()` when the BOM tab is first selected (lazy load)
- Show a disabled input displaying the suggested filename (`{projectName}.xlsx`)
- Provide an "Export BOM" primary button

On "Export BOM" click:
1. Call `window.electronAPI.system.showSaveDialog({ filters: [{ name: 'Excel', extensions: ['xlsx'] }] })`
2. If path selected, aggregate BOM rows, call `window.electronAPI.export.bom(rows, destPath)`
3. On success: show `message.success('BOM 已导出')` and close dialog
4. On error: show `message.error(errorMessage)` without closing

#### Scenario: BOM tab shows aggregated component list
- **WHEN** user opens ExportDialog with 5 components (2 identical resistors)
- **THEN** BOM tab shows 4 rows (2 unique types + merged R row with quantity=2)

#### Scenario: BOM export triggers save dialog
- **WHEN** user clicks "Export BOM" in the BOM tab
- **THEN** the system save dialog opens filtered to .xlsx files

#### Scenario: Cancel save dialog aborts export
- **WHEN** user opens save dialog and cancels without selecting a path
- **THEN** no IPC call to `export:bom` is made and dialog stays open
