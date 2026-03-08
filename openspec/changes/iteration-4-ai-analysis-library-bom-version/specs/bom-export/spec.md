## ADDED Requirements

### Requirement: ExportService.exportBOM writes Excel file
`ExportService` SHALL expose `exportBOM(rows: BOMRow[], destPath: string): Promise<void>` that uses ExcelJS to write an `.xlsx` file.

`BOMRow` is defined as:
```typescript
interface BOMRow {
  index: number       // 序号
  refDes: string      // 位号 (e.g., "R1, R2")
  name: string        // 名称
  value: string       // 值 (e.g., "10k")
  package: string     // 封装 (e.g., "0402")
  quantity: number    // 数量
  notes: string       // 描述
}
```

The worksheet SHALL have a header row with columns: 序号、位号、名称、值、封装、数量、描述. Column widths SHALL be auto-fitted. Header row SHALL use bold font.

#### Scenario: Successful BOM export
- **WHEN** `exportBOM()` is called with a non-empty `BOMRow[]` and a valid `destPath` ending in `.xlsx`
- **THEN** an Excel file is written to `destPath` with one header row and one data row per `BOMRow` entry

#### Scenario: Empty component list
- **WHEN** `exportBOM()` is called with an empty array
- **THEN** the Excel file is written with only the header row and no data rows (no error thrown)

---

### Requirement: BOM aggregation in renderer before IPC call
Before invoking `export:bom`, the renderer SHALL aggregate components from `netlistManager.serialize()`:
- Group components by `(type, label, value, package)` tuple
- Empty or undefined `value`/`package` fields are treated as `""` (empty string) for grouping purposes
- Each group produces one `BOMRow` with `quantity = group.length` and `refDes = sorted group IDs joined by ", "`
- `index` is assigned sequentially (1-based) after sorting
- Output rows SHALL be sorted by `refDesPrefix` alphabetically (A→Z); within the same prefix, by numeric suffix ascending (e.g., R1 < R2 < R10)

#### Scenario: Identical components are merged
- **WHEN** the netlist contains R1=10k/0402 and R2=10k/0402
- **THEN** the BOM has one row with refDes="R1, R2" and quantity=2

#### Scenario: Different components remain separate rows
- **WHEN** the netlist contains R1=10k and R2=100k
- **THEN** the BOM has two separate rows

#### Scenario: Empty value field participates in grouping
- **WHEN** two components have identical type/label/package but an undefined value
- **THEN** they are merged into one row (both value and package treated as "")

#### Scenario: Row ordering follows refDesPrefix alphabetical order
- **WHEN** BOM contains rows with prefixes U, R, C
- **THEN** C rows appear before R rows before U rows in the output

---

### PBT Properties: BOM Aggregation

#### [INVARIANT] Quantity conservation
`Σ row.quantity === total component count`
[FALSIFICATION STRATEGY] Generate random netlists (0–200 components with random type/value/package); aggregate; assert sum of quantities equals input length.

#### [INVARIANT] Idempotency of aggregation
`aggregateBOM(aggregateBOM(C)) throws or equals aggregateBOM(C)` — repeated aggregation on same input always yields same output
[FALSIFICATION STRATEGY] Shuffle component array ordering 100x; compare output deep-equality each time.

#### [INVARIANT] Index contiguity (1-based)
For output array of length N: `rows[i].index === i + 1` for all i ∈ [0, N-1]
[FALSIFICATION STRATEGY] Fuzz all edge cases: empty input, 1 item, all identical, all unique.

#### [INVARIANT] Group key uniqueness
No two output rows share the same `(type, label, value, package)` tuple
[FALSIFICATION STRATEGY] Generate components with random fields; after aggregation, check no duplicate group keys exist.

#### [INVARIANT] Bounds — quantity ≥ 1
`∀ row: row.quantity >= 1`
[FALSIFICATION STRATEGY] Attempt to produce zero-quantity rows via empty group key tuples.

---

### Requirement: export:bom IPC handler
The Main Process SHALL register `ipcMain.handle('export:bom', ...)` that receives `{ rows: BOMRow[], destPath: string }` and calls `exportService.exportBOM()`.

#### Scenario: IPC triggers file write
- **WHEN** renderer calls `window.electronAPI.export.bom(rows, destPath)`
- **THEN** the handler writes the `.xlsx` file and returns `{ success: true }`

---

### Requirement: Preload exposes export.bom
`src/preload/index.ts` SHALL expose `export.bom(rows: BOMRow[], destPath: string): Promise<{ success: boolean }>` via `contextBridge`.

#### Scenario: Preload forwards to IPC
- **WHEN** renderer calls `window.electronAPI.export.bom(rows, destPath)`
- **THEN** `ipcRenderer.invoke('export:bom', { rows, destPath })` is called

---

### Requirement: ExportDialog has BOM tab
`ExportDialog` SHALL have a third tab "BOM" alongside existing PNG and PDF tabs.

The BOM tab SHALL:
- Show a preview table of the BOM rows (refDes, name, value, quantity columns)
- Show a file path input pre-filled with the current project name + `.xlsx`
- Have a "Export BOM" confirm button

On confirm: open system save dialog for `.xlsx`, call `export.bom()`, show success/error notification.

#### Scenario: BOM tab renders preview
- **WHEN** user opens ExportDialog and clicks "BOM" tab
- **THEN** a table is shown with the aggregated component list

#### Scenario: BOM export succeeds
- **WHEN** user selects a save path and confirms
- **THEN** `export.bom()` is called and a success notification is shown

---

### Requirement: exceljs dependency installed
`exceljs` SHALL be added to `dependencies` in `package.json`.

#### Scenario: Import resolves without error
- **WHEN** `ExportService.ts` imports `ExcelJS` from `'exceljs'`
- **THEN** TypeScript compilation and Electron build succeed
