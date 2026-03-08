## ADDED Requirements

### Requirement: Save and Save As menu events persist the project
`menu:save` SHALL call FileService to save to the current project path (if set) or fall through to a Save As dialog. `menu:save-as` SHALL always show a system save dialog and update the current project path.

#### Scenario: Save with existing path
- **WHEN** user presses Ctrl+S with an open project that has been saved before
- **THEN** the project is saved silently to the existing path

#### Scenario: Save As shows dialog
- **WHEN** user presses Ctrl+Shift+S
- **THEN** a system Save As dialog appears; on confirm, the project saves to the new path and the title bar updates

### Requirement: Open Project menu event loads a file
`menu:open-project` SHALL show a system open dialog filtered to `.aischematic` files. On confirm, it SHALL call FileService to load the selected file and transition the app to editor view.

#### Scenario: Open project flow
- **WHEN** user selects File › Open Project... and picks a valid .aischematic file
- **THEN** the app transitions to editor view with the loaded schematic

### Requirement: Undo/Redo menu events use CommandBus
`menu:undo` SHALL call `commandBus.undo()`. `menu:redo` SHALL call `commandBus.redo()`. These SHALL be equivalent to the existing Ctrl+Z / Ctrl+Y keyboard shortcuts which already route to CommandBus.

#### Scenario: Menu undo
- **WHEN** user selects Edit › Undo
- **THEN** the last command is undone via CommandBus, same as pressing Ctrl+Z

### Requirement: Zoom menu events control the canvas
`menu:zoom-in` SHALL call `graph.zoom(0.1)`, `menu:zoom-out` SHALL call `graph.zoom(-0.1)`, `menu:zoom-fit` SHALL call `graph.zoomToFit({ padding: 40 })`.

#### Scenario: Zoom in from menu
- **WHEN** user selects View › Zoom In
- **THEN** the canvas zoom level increases by 10%

### Requirement: Delete and Select All menu events operate on selection
`menu:delete` SHALL remove all currently selected cells. `menu:select-all` SHALL select all nodes on the canvas.

#### Scenario: Delete from menu
- **WHEN** user selects one component then clicks Edit › Delete
- **THEN** the selected component is removed from the canvas

#### Scenario: Select all
- **WHEN** user selects Edit › Select All
- **THEN** all nodes on the canvas are selected
