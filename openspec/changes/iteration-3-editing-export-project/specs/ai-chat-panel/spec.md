## MODIFIED Requirements

### Requirement: AIChatPanel selects generate or modify mode based on canvas state
The AIChatPanel SHALL determine which IPC call to make based on whether the canvas is empty or not. When the canvas has zero components, it SHALL call `ai:generate` with only the user prompt (preserving existing Iteration 2 behaviour). When the canvas has one or more components, it SHALL call `ai:modify` with `{ instruction: string, context: NetlistDSL }`.

#### Scenario: Empty canvas uses generate
- **WHEN** user sends a message and `nodeCount === 0`
- **THEN** `window.electronAPI.ipcRenderer.invoke('ai:generate', prompt)` is called

#### Scenario: Non-empty canvas uses modify
- **WHEN** user sends a message and `nodeCount >= 1`
- **THEN** `window.electronAPI.ipcRenderer.invoke('ai:modify', { instruction: prompt, context: netlistManager.serialize() })` is called

#### Scenario: Modify-mode indicator visible
- **WHEN** `nodeCount >= 1`
- **THEN** a "Modify mode" visual indicator is displayed in the chat panel input area

#### Scenario: Generate-mode indicator (default state)
- **WHEN** `nodeCount === 0`
- **THEN** no modify-mode indicator is shown; panel behaves as in Iteration 2
