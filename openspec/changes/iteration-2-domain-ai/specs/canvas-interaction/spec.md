# Canvas Interaction Specification

## MODIFIED Requirements

### Requirement: All modifications must be reversible
The system SHALL ensure all canvas interactions dispatch commands to enable undo/redo.

#### Scenario: Drag component
- **WHEN** the user drags a component on the canvas
- **THEN** X6 updates the position immediately for smooth interaction

#### Scenario: Drag complete
- **WHEN** the user releases the mouse after dragging
- **THEN** a MoveComponentCommand is dispatched to the CommandBus

#### Scenario: Delete component
- **WHEN** the user presses Delete with a component selected
- **THEN** a RemoveComponentCommand is dispatched instead of directly calling graph.removeCells()

#### Scenario: Create wire
- **WHEN** the user connects two pins
- **THEN** X6 creates the edge immediately, then a ConnectPinsCommand is dispatched

#### Scenario: Delete wire
- **WHEN** the user deletes a wire
- **THEN** a DisconnectWireCommand is dispatched instead of directly removing the edge

### Requirement: Echo cancellation for user interactions
The system SHALL prevent circular updates when users interact with the canvas.

#### Scenario: Drag without echo
- **WHEN** a user drags a component
- **THEN** the subsequent MoveComponentCommand does not cause GraphSyncer to move the component again

#### Scenario: Position equality check
- **WHEN** GraphSyncer receives a node:moved event
- **THEN** it checks if the X6 node is already at the target position before updating

### Requirement: Command dispatch timing
The system SHALL dispatch commands at appropriate times to balance responsiveness and correctness.

#### Scenario: Drag dispatch on mouseup
- **WHEN** the user is dragging a component
- **THEN** the command is dispatched only when the mouse button is released, not during drag

#### Scenario: Delete dispatch immediately
- **WHEN** the user presses Delete
- **THEN** the command is dispatched immediately

#### Scenario: Wire dispatch on connect
- **WHEN** the user completes a wire connection
- **THEN** the command is dispatched immediately after X6's edge:connected event

### Requirement: Preserve X6 interaction quality
The system SHALL maintain the smooth 60 FPS interaction quality of X6.

#### Scenario: Drag smoothness
- **WHEN** the user drags a component
- **THEN** the visual feedback is immediate with no perceptible lag

#### Scenario: Selection responsiveness
- **WHEN** the user clicks to select a component
- **THEN** the selection highlight appears immediately

#### Scenario: Wire preview
- **WHEN** the user drags from a pin to create a wire
- **THEN** the wire preview follows the mouse smoothly

### Requirement: Multi-select operations
The system SHALL support batch commands for multi-select operations.

#### Scenario: Multi-select drag
- **WHEN** the user drags multiple selected components
- **THEN** a BatchCommand containing multiple MoveComponentCommands is dispatched

#### Scenario: Multi-select delete
- **WHEN** the user deletes multiple selected components
- **THEN** a BatchCommand containing multiple RemoveComponentCommands is dispatched

### Requirement: Keyboard shortcuts
The system SHALL dispatch commands for all keyboard-triggered operations.

#### Scenario: Ctrl+Z undo
- **WHEN** the user presses Ctrl+Z
- **THEN** CommandBus.undo() is called

#### Scenario: Ctrl+Y redo
- **WHEN** the user presses Ctrl+Y
- **THEN** CommandBus.redo() is called

#### Scenario: Ctrl+C copy
- **WHEN** the user presses Ctrl+C
- **THEN** selected components are copied to clipboard (no command needed)

#### Scenario: Ctrl+V paste
- **WHEN** the user presses Ctrl+V
- **THEN** a BatchCommand with AddComponentCommands for pasted components is dispatched
