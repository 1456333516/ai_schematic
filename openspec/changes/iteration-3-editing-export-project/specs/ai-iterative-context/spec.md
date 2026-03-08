## ADDED Requirements

### Requirement: AI modify calls include current netlist context
When the user sends a message in AIChatPanel and the canvas contains at least one component, the system SHALL invoke `ai:modify` (not `ai:generate`) and include the serialised netlist as context. The IPC payload SHALL be `{ instruction: string, context: NetlistDSL }` where `context` is the result of `netlistManager.serialize()`.

#### Scenario: Modify mode when canvas is non-empty
- **WHEN** user types "add a 100nF capacitor in parallel with R1" and the canvas has existing components
- **THEN** the IPC call is `ai:modify` with the current netlist as context, not `ai:generate`

#### Scenario: Generate mode when canvas is empty
- **WHEN** user types a prompt and the canvas has no components
- **THEN** the IPC call is `ai:generate` with only the prompt string (existing behaviour preserved)

### Requirement: AIChatPanel shows a modify-mode indicator
When the canvas contains at least one component, the AIChatPanel input area SHALL display a subtle indicator (e.g., small badge or label) communicating that subsequent messages will modify the existing circuit rather than generating a new one.

#### Scenario: Indicator visible with components
- **WHEN** the canvas has 2 or more components
- **THEN** a "Modify mode" label or badge appears above or inside the chat input field

#### Scenario: Indicator hidden on empty canvas
- **WHEN** the canvas has zero components
- **THEN** no modify-mode indicator is shown
