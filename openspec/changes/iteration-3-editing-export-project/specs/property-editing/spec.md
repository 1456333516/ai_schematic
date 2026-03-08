## ADDED Requirements

### Requirement: Property panel displays selected component attributes
When exactly one component node is selected on the canvas, the PropertyPanel SHALL display a form containing: RefDes (editable text), Value (editable text), Package (editable text), Tolerance (editable text), Rating (editable text), Notes (editable textarea), X position (read-only), Y position (read-only), and Rotation (read-only). When zero or more than one node is selected, the panel SHALL show a neutral placeholder.

#### Scenario: Single component selected
- **WHEN** user clicks a single component on the canvas
- **THEN** PropertyPanel displays all editable and read-only fields populated from that component's node data

#### Scenario: No selection
- **WHEN** no node is selected
- **THEN** PropertyPanel renders null (hidden)

#### Scenario: Multiple components selected
- **WHEN** user selects 2 or more components
- **THEN** PropertyPanel shows only the count ("N components selected") with no edit fields

### Requirement: Property edits are validated before commit
The system SHALL validate RefDes as non-empty. Value SHALL accept any non-empty string. All other fields (Package, Tolerance, Rating, Notes) are optional. Invalid input SHALL display an inline error and prevent the command from being dispatched.

#### Scenario: Empty RefDes rejected
- **WHEN** user clears the RefDes field and blurs or presses Enter
- **THEN** an inline validation error appears and no command is dispatched

#### Scenario: Valid edit committed
- **WHEN** user changes Value to "10kΩ" and blurs the field
- **THEN** an UpdatePropertyCommand is dispatched through CommandBus with the new value

### Requirement: Property edits are undoable
All property changes committed through the PropertyPanel SHALL be reversible via CommandBus undo (Ctrl+Z).

#### Scenario: Undo property change
- **WHEN** user changes RefDes from "R1" to "R2" and then presses Ctrl+Z
- **THEN** RefDes reverts to "R1" on both the canvas and the PropertyPanel form

### Requirement: Property form updates live on undo/redo
When CommandBus emits a PROPERTY_UPDATED domain event (triggered by undo or redo), the PropertyPanel form SHALL refresh to reflect the reverted/reapplied values.

#### Scenario: Form refreshes after undo
- **WHEN** Ctrl+Z reverts a property change on the currently-selected node
- **THEN** the PropertyPanel form fields reflect the reverted values without requiring re-selection

### Requirement: Selection change immediately resets the form
When the canvas selection changes to a different node, the PropertyPanel SHALL immediately discard any in-progress (uncommitted) edits and repopulate all fields from the newly selected node's data.

#### Scenario: In-progress edit discarded on selection change
- **WHEN** user has typed in the RefDes field (not yet blurred/Enter) and then clicks a different component
- **THEN** the form resets to the new node's RefDes; the partial input is discarded without dispatching any command

### Requirement: Optional fields are omitted when empty
When a PropertyPanel field for Package, Tolerance, Rating, or Notes is submitted as an empty string, the system SHALL omit that key from `node.setData()` rather than storing `""`. When reading `node.getData()`, missing keys SHALL be treated as empty string for display purposes.

#### Scenario: Empty optional field not persisted
- **WHEN** user clears the Package field and blurs
- **THEN** `node.getData().package` is `undefined` (key absent), not `""`

## Property-Based Testing Properties

### [INVARIANT] Validation bounds
`RefDes` and `Value` dispatch a command iff `trim(value).length > 0`. Optional fields (Package, Tolerance, Rating, Notes) always dispatch (including empty).
→ [FALSIFICATION STRATEGY] Generate Unicode/whitespace/control-character strings for required fields; assert dispatch is blocked only when trimmed length is 0.

### [INVARIANT] Commit trigger rule
Property changes result in exactly one `UpdatePropertyCommand` per blur/Enter event, and zero commands per intermediate keystroke.
→ [FALSIFICATION STRATEGY] Intercept `commandBus.execute`; simulate random keystroke sequences with/without blur/Enter; assert command count equals blur+Enter count, not keystroke count.

### [INVARIANT] Undo/redo involution
After committing edit `e`, `redo(undo(e))` restores the identical domain+canvas+form state as before the undo.
→ [FALSIFICATION STRATEGY] Generate random edit sequences, apply random undo/redo walks, assert state equality hashes at checkpoints.

### [INVARIANT] CommandBus-only mutation path
Every committed property change corresponds to exactly one `UpdatePropertyCommand`; no direct X6 `node.setData()` call is made from PropertyPanel without going through CommandBus.
→ [FALSIFICATION STRATEGY] Spy on `commandBus.execute` and X6 `node.setData`; fuzz edit actions and assert forbidden direct mutations are zero.

### [INVARIANT] Form-selection consistency
Single-select always shows node's current data fields. Multi-select always shows count placeholder. Zero-select always hides panel.
→ [FALSIFICATION STRATEGY] Generate random selection transitions; compare rendered form model to current selected-node snapshot after each transition.
