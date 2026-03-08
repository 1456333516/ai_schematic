## ADDED Requirements

### Requirement: Project files use the dual-track .aischematic format
Saved project files SHALL use the extension `.aischematic` and contain a JSON object with three top-level keys: `schema` (NetlistDSL object from `netlistManager.serialize()`), `canvas` (X6 graph JSON from `graph.toJSON()`), and `meta` (object with `name: string`, `version: string`, `savedAt: ISO8601 UTC string`). The `meta.version` field SHALL be set to `"1.0"` for files created by this iteration. `meta.savedAt` SHALL always be formatted as ISO-8601 UTC (e.g., `"2026-03-08T12:00:00.000Z"`) and SHALL be strictly greater than the previous `savedAt` for any given project path.

#### Scenario: Save project structure
- **WHEN** user saves a project with 3 components and 2 wires
- **THEN** the written file parses as `{ schema: { components: [...], connections: [...] }, canvas: { cells: [...] }, meta: { name, version, savedAt } }`

#### Scenario: Backward compatibility marker
- **WHEN** a future reader opens the file
- **THEN** it can inspect `meta.version` to decide how to parse it

### Requirement: Save writes atomically
The system SHALL write project data to a temporary file (`<targetPath>.tmp`) and then rename it to the target path. If the rename fails, the original file SHALL remain intact.

#### Scenario: Atomic write on save
- **WHEN** user triggers Save (Ctrl+S) with an existing project path
- **THEN** a `.tmp` file is created, written, and renamed; no partial write reaches the target file

### Requirement: Open project restores full state
When opening an `.aischematic` file, the system SHALL call `graph.fromJSON(data.canvas)` to restore the visual state and `netlistManager.loadFromDSL(data.schema)` to restore the domain state. Both operations SHALL complete before the GraphSyncer attaches.

#### Scenario: Open round-trip
- **WHEN** user saves a project and reopens it
- **THEN** the canvas shows the same components in the same positions with the same connections

### Requirement: Unsaved changes prompt before opening a project
When the user initiates `menu:open-project` and `isDirty === true`, the system SHALL display a native dialog with three options: **Save** (save current project then proceed to open), **Discard** (discard unsaved changes and proceed to open), **Cancel** (abort the open operation and return to the current state). If no unsaved changes exist (`isDirty === false`), the open flow proceeds immediately without a dialog.

#### Scenario: Open with unsaved changes — Save chosen
- **WHEN** user triggers open-project with isDirty=true and selects Save
- **THEN** current project is saved, then the open dialog appears for the new project

#### Scenario: Open with unsaved changes — Discard chosen
- **WHEN** user triggers open-project with isDirty=true and selects Discard
- **THEN** current state is discarded without saving, and the open dialog appears

#### Scenario: Open with unsaved changes — Cancel chosen
- **WHEN** user triggers open-project with isDirty=true and selects Cancel
- **THEN** no file dialog appears; the application remains in its current state unchanged

### Requirement: isDirty state is managed by CommandBus and file operations
`isDirty` SHALL be set to `true` whenever `CommandBus.execute()` is called. It SHALL be set to `false` after a successful manual save, Save As, or auto-save. It SHALL also be set to `false` after successfully opening a project.

#### Scenario: isDirty set after edit
- **WHEN** user dispatches any UpdatePropertyCommand or structural graph mutation via CommandBus
- **THEN** isDirty becomes true

#### Scenario: isDirty cleared after save
- **WHEN** file:saveProject IPC returns success
- **THEN** isDirty becomes false

### Requirement: Recent projects list is maintained
The system SHALL persist a list of up to 10 recently opened/saved projects in `app.getPath('userData')/recent.json`. Each entry SHALL contain `{ name, path, savedAt }`. After each save or open, the list SHALL be updated (newest first, duplicates removed by normalized path using `path.normalize()`) and the native "Recent Projects" submenu SHALL be rebuilt. Path normalization SHALL be case-insensitive on Windows.

#### Scenario: Recent list updated after save
- **WHEN** user saves a project for the first time
- **THEN** the project appears at the top of File › Recent Projects

#### Scenario: Duplicate path deduplication
- **WHEN** user saves the same project twice
- **THEN** File › Recent Projects shows only one entry for that path

#### Scenario: List capped at 10
- **WHEN** user has 10 recent projects and opens an 11th
- **THEN** the oldest entry is removed and the list remains at 10 items

### Requirement: Auto-save runs every 60 seconds
When a project path is set (`projectPath !== null`), the FileService SHALL automatically save the current state every 60 seconds using the same atomic write path as a manual save. Auto-save SHALL be silent (no notification, no error dialog on failure — errors are only logged to console). Auto-save SHALL NOT reset the CommandBus undo stack. Auto-save SHALL NOT be active when `projectPath === null` (i.e., no project has been opened or saved yet). A successful auto-save SHALL set `isDirty = false`.

#### Scenario: Auto-save triggers
- **WHEN** 60 seconds elapse with an open project (projectPath set)
- **THEN** the project file is updated on disk without any user interaction

#### Scenario: Auto-save disabled without project path
- **WHEN** app starts fresh with no saved project path
- **THEN** no auto-save interval is active; no IPC autosave:request is emitted

#### Scenario: Auto-save does not affect undo history
- **WHEN** auto-save fires after the user makes 5 edits
- **THEN** Ctrl+Z still undoes all 5 edits

#### Scenario: IPC response shape
- **WHEN** any file:saveProject, file:openProject, or file:createProject IPC call succeeds
- **THEN** returns `{ success: true }` (plus data fields for open); on failure returns `{ success: false, error: string }` where `error` is a human-readable message

## Property-Based Testing Properties

### [INVARIANT] Atomic save fault-tolerance
For any save payload `D` and existing file `F0`, a failed atomic save leaves target bytes unchanged: `bytes(target) = bytes(F0)`; no partial prefix/suffix states are observable.
→ [FALSIFICATION STRATEGY] Inject fault at `{write tmp, rename}` steps; assert target is either exactly old bytes or exactly full new bytes, never mixed. Verify no `.tmp` artifact remains.

### [INVARIANT] Dual-track round-trip integrity
`open(save(X))` preserves `schema` and `canvas` structurally, and `meta.version === "1.0"`.
→ [FALSIFICATION STRATEGY] Generate random valid `{schema, canvas}` graphs, save/open/save, compare canonical JSON equality across cycles.

### [INVARIANT] Recent list invariants
After any sequence of save/open operations: `|recent| <= 10`, all paths are unique (after `path.normalize()`), sorted newest-first by operation timestamp.
→ [FALSIFICATION STRATEGY] Generate random sequences of >10 paths with duplicates; assert cap/dedup/order after each step.

### [INVARIANT] savedAt monotonicity
For the same project path, successive saves produce strictly increasing `savedAt` timestamps.
→ [FALSIFICATION STRATEGY] Advance system clock in random increments; assert `savedAt[i+1] > savedAt[i]` as ISO-8601 string comparison and Date comparison.

### [INVARIANT] Auto-save undo stack isolation
After N edits followed by M auto-save triggers, `CommandBus` undo depth remains N.
→ [FALSIFICATION STRATEGY] Fake 60s timer ticks with random edit counts; snapshot undo stack before and after auto-save; assert depth unchanged.
