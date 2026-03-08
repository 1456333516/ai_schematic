## MODIFIED Requirements

### Requirement: AIChatPanel has Analyze Circuit button
The `AIChatPanel` SHALL display an "电路分析" (`AnalyzeCircuit`) button above the chat input area.

The button SHALL:
- Be disabled when `nodeCount === 0` (no components on canvas) or when `isGenerating === true`
- Show `LoadingOutlined` spinner and be disabled during an in-progress analysis call
- On click: call `window.electronAPI.ai.analyze(netlistManager.serialize())` and render the result as a structured message bubble in the chat history

The analysis result message bubble SHALL display:
- A red section for `errors[]` items (if any), each prefixed with ❌
- A yellow section for `warnings[]` items (if any), each prefixed with ⚠️
- A blue section for `suggestions[]` items (if any), each prefixed with 💡
- A green "分析完成" header if all arrays are empty (no issues found)

Each item in the result SHALL show `message` text and optionally `component` in parentheses.

#### Scenario: Analyze button is disabled on empty canvas
- **WHEN** there are no components on the canvas (`nodeCount === 0`)
- **THEN** the "电路分析" button is visually disabled and non-clickable

#### Scenario: Analyze button triggers analysis
- **WHEN** canvas has components and user clicks "电路分析"
- **THEN** the button shows loading state and `ai.analyze()` is called with the current netlist

#### Scenario: Analysis result renders as structured message
- **WHEN** the analysis returns errors and warnings
- **THEN** the chat history shows a new message bubble with red error items and yellow warning items

#### Scenario: Clean analysis renders success state
- **WHEN** analysis returns all empty arrays
- **THEN** the chat shows a green "分析完成，未发现问题" message
