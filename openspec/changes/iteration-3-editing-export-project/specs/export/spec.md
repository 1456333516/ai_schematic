## ADDED Requirements

### Requirement: Export dialog lets user configure export settings
Before each export, an ExportDialog SHALL appear with: output file path (pre-filled via system save dialog), scale factor (1×/2×/4× for PNG), and page orientation (Portrait/Landscape for PDF). Confirming the dialog triggers the export; cancelling aborts.

#### Scenario: PNG export dialog
- **WHEN** user selects Tools › Export › Export PNG...
- **THEN** a system save dialog appears, followed by ExportDialog with scale options; confirming saves the PNG

#### Scenario: PDF export dialog
- **WHEN** user selects Tools › Export › Export PDF...
- **THEN** a system save dialog appears, followed by ExportDialog with orientation options; confirming saves the PDF

### Requirement: PNG export produces a raster image from the canvas
The system SHALL export the current canvas as a PNG file. The renderer SHALL compute the export bounds using `graph.getContentBBox()` plus 20px padding on all sides, then call `graph.toSVG({ bounds })` with those bounds and send the SVG string to the main process via IPC. The main process SHALL render the SVG in a hidden offscreen BrowserWindow with a **white (#FFFFFF) background**, capture the result as PNG data using `capturePage()`, and write it to the chosen file path. The offscreen BrowserWindow SHALL wait for `did-finish-load` before calling `capturePage()` to ensure all rendering is complete.

#### Scenario: PNG file created
- **WHEN** user completes PNG export for a schematic with 3 components
- **THEN** a valid PNG file is written to the chosen path containing the rendered schematic with white background

#### Scenario: Scale factor applied
- **WHEN** user selects 2× scale before exporting
- **THEN** the output PNG has double the pixel dimensions of the 1× export (width = contentBBox.width + 40px) * 2

#### Scenario: Export bounds include all components
- **WHEN** canvas has components positioned outside the visible viewport
- **THEN** exported PNG includes all components (full graph.getContentBBox() + 20px padding)

#### Scenario: Cancel after system save dialog
- **WHEN** user opens PNG export flow but cancels the system save dialog
- **THEN** ExportDialog does NOT open; no file is written; no IPC calls are made

### Requirement: PDF export uses Electron printToPDF with A4 paper
The system SHALL export the canvas as a PDF using `webContents.printToPDF({ printBackground: true, paperSize: 'A4', landscape: <user-selected> })`. Page orientation (Portrait or Landscape) SHALL be selectable in ExportDialog. Paper size is fixed at A4.

#### Scenario: PDF file created
- **WHEN** user completes PDF export
- **THEN** a valid PDF file is written to the chosen path

#### Scenario: Portrait vs Landscape
- **WHEN** user selects Portrait in ExportDialog
- **THEN** `printToPDF` is called with `landscape: false`

#### Scenario: Cancel at ExportDialog
- **WHEN** user opens PDF export flow, the system save dialog succeeds, but user clicks Cancel in ExportDialog
- **THEN** no file is written and no IPC call is made to export:pdf

### Requirement: Export menu items are enabled
The Tools › Export submenu items (Export PNG..., Export PDF...) SHALL be enabled when `projectPath !== null`. They SHALL remain disabled when no project path is set (i.e., welcome screen or new unsaved session).

#### Scenario: Export enabled with open project
- **WHEN** a project has a saved path (projectPath is set)
- **THEN** Tools › Export › Export PNG... and Export PDF... are clickable

#### Scenario: Export disabled without project
- **WHEN** projectPath is null (welcome screen)
- **THEN** Tools › Export items are greyed out; direct IPC calls to export:png / export:pdf SHALL return `{ success: false, error: "No project open" }`

## Property-Based Testing Properties

### [INVARIANT] PNG validity
For any non-empty schematic, exported PNG bytes start with the PNG signature `[0x89, 0x50, 0x4E, 0x47]` and decode as a valid image.
→ [FALSIFICATION STRATEGY] Generate random schematics (1–50 components), export, verify magic bytes and image parser success.

### [INVARIANT] PNG scale law
For the same schematic, `pixelWidth(scale=k) = (contentBBox.width + 40) * k` for k ∈ {1, 2, 4}.
→ [FALSIFICATION STRATEGY] Export same scene at all three scales; assert exact pixel width/height ratios.

### [INVARIANT] PNG includes all content
For any schematic, all component bounding boxes are within the exported PNG canvas area.
→ [FALSIFICATION STRATEGY] Generate schematics with components at extreme coordinates; assert none are clipped.

### [INVARIANT] PDF validity
For any schematic, exported PDF bytes start with `%PDF-` and contain at least one page.
→ [FALSIFICATION STRATEGY] Fuzz orientation and scene complexity; validate with PDF parser.
