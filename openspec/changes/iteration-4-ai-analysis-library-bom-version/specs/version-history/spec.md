## ADDED Requirements

### Requirement: VersionService stores snapshots alongside project file
`src/main/services/VersionService.ts` SHALL implement snapshot-based version history.

- Snapshots are stored in `{projectDir}/.aischematic_versions/` relative to the `.aischematic` project file.
- Each snapshot is a JSON file named `{timestamp}.json` where `timestamp` is `Date.now()` (milliseconds).
- **Timestamp collision handling**: If a file with the same timestamp already exists, the service SHALL append `_1`, `_2`, etc. until a unique filename is found. Filename pattern: `{timestamp}_{n}.json` where n starts at 1.
- Each snapshot file contains the full `ProjectFileData` object.
- The service SHALL cap snapshots at 50 per project directory; on overflow it SHALL delete the oldest file (lowest timestamp filename, with `_n` suffix stripped for comparison).

`VersionEntry` type:
```typescript
interface VersionEntry {
  id: string          // timestamp string (filename without .json)
  savedAt: string     // ISO timestamp for display
  size: number        // file size in bytes
  projectName: string // meta.name from the snapshot
}
```

#### Scenario: Snapshot is created on save
- **WHEN** `VersionService.createSnapshot(projectPath, data)` is called
- **THEN** a new `.json` file is written in the `.aischematic_versions/` directory alongside the project file

#### Scenario: Old snapshots are pruned at 50
- **WHEN** there are already 50 snapshot files and `createSnapshot()` is called
- **THEN** the oldest snapshot (lowest timestamp) is deleted before the new one is written; total count remains 50

#### Scenario: Versions directory is created if missing
- **WHEN** `createSnapshot()` is called and `.aischematic_versions/` does not exist
- **THEN** the directory is created with `fs.mkdirSync(..., { recursive: true })`

---

### Requirement: VersionService.listVersions returns sorted entries
`VersionService.listVersions(projectPath: string): VersionEntry[]` SHALL read all `.json` files from `.aischematic_versions/`, parse each filename as timestamp, return entries sorted newest-first.

#### Scenario: Returns empty array when no versions
- **WHEN** `listVersions()` is called and the `.aischematic_versions/` directory does not exist
- **THEN** an empty array is returned without throwing

#### Scenario: Returns sorted list newest-first
- **WHEN** multiple snapshot files exist
- **THEN** the returned array has the highest timestamp first

---

### Requirement: VersionService.restoreVersion returns snapshot data
`VersionService.restoreVersion(projectPath: string, versionId: string): ProjectFileData` SHALL read the snapshot file matching `versionId` and return the parsed `ProjectFileData`.

#### Scenario: Valid version ID restores data
- **WHEN** `restoreVersion()` is called with a valid `versionId` that exists as a file
- **THEN** the parsed `ProjectFileData` is returned

#### Scenario: Invalid version ID throws
- **WHEN** `restoreVersion()` is called with a `versionId` whose file does not exist
- **THEN** an error is thrown with a descriptive message

---

### Requirement: version:list and version:restore IPC handlers
The Main Process SHALL register:
- `ipcMain.handle('version:list', (_, projectPath) => versionService.listVersions(projectPath))`
- `ipcMain.handle('version:restore', (_, projectPath, versionId) => versionService.restoreVersion(projectPath, versionId))`

#### Scenario: version:list IPC returns array
- **WHEN** renderer calls `window.electronAPI.version.list(projectPath)`
- **THEN** a `VersionEntry[]` is returned (may be empty)

#### Scenario: version:restore IPC returns project data
- **WHEN** renderer calls `window.electronAPI.version.restore(projectPath, versionId)`
- **THEN** the `ProjectFileData` for that snapshot is returned

---

### Requirement: Preload exposes version.list and version.restore
`src/preload/index.ts` SHALL expose:
- `version.list(projectPath: string): Promise<VersionEntry[]>`
- `version.restore(projectPath: string, versionId: string): Promise<ProjectFileData>`

#### Scenario: Renderer calls version.list via electronAPI
- **WHEN** renderer code calls `window.electronAPI.version.list(path)`
- **THEN** `ipcRenderer.invoke('version:list', path)` is called and the result is returned

---

### Requirement: FileService.save triggers VersionService.createSnapshot
After successfully writing the main project file, `FileService.save()` SHALL call `versionService.createSnapshot(projectPath, data)`.

Snapshot creation errors SHALL be caught and logged only (not thrown to caller); they SHALL NOT interrupt the save flow.

#### Scenario: Save succeeds even if snapshot write fails
- **WHEN** the `.aischematic_versions/` directory is not writable and `save()` is called
- **THEN** the main `.aischematic` project file is saved successfully; the snapshot error is logged to console only

---

### Requirement: VersionHistoryDrawer UI
`src/renderer/components/dialogs/VersionHistoryDrawer.tsx` SHALL implement an Ant Design `Drawer` that:
- Opens from the right side with width 360px
- Title: "版本历史"
- Loads `version.list(projectPath)` on open
- Renders an Ant Design `Timeline` where each item shows: formatted `savedAt` date, project name, file size in KB
- Each timeline item has a "恢复" (`Button` type="link") that triggers a `Modal.confirm` before calling `version.restore()`

On successful restore, the Drawer SHALL:
1. Call `graph.fromJSON(data.canvas)`
2. Call `netlistManager.loadFromDSL(data.schema)`
3. Call `commandBus.clear()` to reset the undo/redo stack (prevents undoing back to pre-restore state)
4. Call `useAppStore.getState().markDirty()`
5. Show `message.success('已恢复到该版本')`
6. Close the Drawer

**Restore confirmation modal content**:
- When `isDirty === false`: `Modal.confirm({ content: '确认恢复到该版本？当前画布将被替换。' })`
- When `isDirty === true`: `Modal.confirm({ content: '当前有未保存的更改，恢复后将丢失。是否继续？' })`

#### Scenario: Drawer opens and shows version list
- **WHEN** "File > Version History" menu item is clicked
- **THEN** the Drawer opens and shows a timeline of saved versions

#### Scenario: Restore requires confirmation
- **WHEN** user clicks "恢复" on a version entry
- **THEN** a `Modal.confirm` appears asking to confirm before restoring

#### Scenario: Restore confirmation warns about unsaved changes
- **WHEN** user clicks "恢复" and `isDirty === true`
- **THEN** the `Modal.confirm` content mentions that unsaved changes will be lost

#### Scenario: Restore clears undo stack
- **WHEN** user confirms restore
- **THEN** `commandBus.clear()` is called before `markDirty()`, so undo history is empty after restore

#### Scenario: Restore applies data to canvas
- **WHEN** user confirms restore
- **THEN** the canvas and domain state are replaced with the snapshot data

---

### Requirement: "Version History" menu item in File menu
`src/main/index.ts` SHALL add a "Version History" menu item in the File menu that sends `menu:version-history` to the renderer.

`AppLayout.tsx` SHALL listen for `menu:version-history` and open the `VersionHistoryDrawer`.

#### Scenario: Menu item sends IPC event
- **WHEN** user clicks File > Version History
- **THEN** `menu:version-history` is sent to the renderer and the Drawer opens

---

### PBT Properties: Version History

#### [INVARIANT] Snapshot count bounded
`0 <= listVersions(p).length <= 50` at all times
[FALSIFICATION STRATEGY] Run 200 rapid createSnapshot calls with simulated timestamps; verify count never exceeds 50.

#### [INVARIANT] Oldest pruned on overflow
After createSnapshot with count > 50: the file with the minimum numeric timestamp is removed
[FALSIFICATION STRATEGY] Insert known timestamped snapshots; trigger overflow; verify exactly the minimum-timestamp file is gone.

#### [INVARIANT] Monotonically sorted list
`listVersions(p)[i].id > listVersions(p)[i+1].id` (numeric, newest-first) for all consecutive pairs
[FALSIFICATION STRATEGY] Generate snapshots with out-of-order timestamps; call listVersions; assert strict descending order.

#### [INVARIANT] Round-trip: createSnapshot then restoreVersion
`restoreVersion(p, id)` returns data equal to what was passed to `createSnapshot(p, data)` (JSON serialization-normalized)
[FALSIFICATION STRATEGY] Fuzz ProjectFileData with varied graph JSON, deep nested schema, special characters in component names.

#### [INVARIANT] Timestamp collision uniqueness
No two snapshot files share the same filename even if `Date.now()` returns the same value
[FALSIFICATION STRATEGY] Mock `Date.now()` to return constant; call createSnapshot 10 times; verify 10 distinct filenames exist.
