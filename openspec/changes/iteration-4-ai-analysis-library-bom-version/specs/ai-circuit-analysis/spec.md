## ADDED Requirements

### Requirement: ClaudeProvider exposes analyzeSchematic
`ClaudeProvider` SHALL expose an `analyzeSchematic(netlist: NetlistContext): Promise<AnalysisReport>` method that calls the Anthropic API with a structured system prompt instructing Claude to return a JSON analysis report.

`AnalysisReport` is defined as:
```typescript
interface AnalysisItem {
  severity: 'error' | 'warning' | 'suggestion'
  message: string
  component?: string  // refDes of related component, if applicable
}
interface AnalysisReport {
  errors: AnalysisItem[]
  warnings: AnalysisItem[]
  suggestions: AnalysisItem[]
}
```

The method SHALL parse Claude's JSON response. On parse failure it SHALL return `{ errors: [], warnings: [], suggestions: [{ severity: 'suggestion', message: rawText }] }`.

#### Scenario: Successful analysis with structured response
- **WHEN** `analyzeSchematic()` is called with a valid `NetlistContext`
- **THEN** the method returns a `Promise<AnalysisReport>` with at least one of `errors`, `warnings`, or `suggestions` populated based on Claude's assessment

#### Scenario: Claude returns malformed JSON
- **WHEN** the API response cannot be parsed as valid `AnalysisReport` JSON
- **THEN** the method returns `{ errors: [], warnings: [], suggestions: [{ severity: 'suggestion', message: <raw text> }] }` without throwing

#### Scenario: API key not configured
- **WHEN** `analyzeSchematic()` is called and `this.client` is null
- **THEN** the method throws `Error('API key not configured')`

---

### Requirement: ai:analyze IPC channel
The Main Process SHALL register an `ipcMain.handle('ai:analyze', ...)` handler that receives a serialized `NetlistContext`, calls `claudeProvider.analyzeSchematic()`, and returns the `AnalysisReport`.

The handler SHALL NOT use streaming. It is a standard `invoke`/`handle` round-trip.

#### Scenario: Successful IPC round-trip
- **WHEN** renderer calls `window.electronAPI.ai.analyze(netlist)`
- **THEN** the handler returns the resolved `AnalysisReport` from `ClaudeProvider`

#### Scenario: Analysis fails
- **WHEN** `claudeProvider.analyzeSchematic()` throws
- **THEN** the IPC handler propagates the error and the renderer receives a rejected promise

---

### Requirement: Preload exposes ai.analyze
`src/preload/index.ts` SHALL expose `ai.analyze(netlist: NetlistContext): Promise<AnalysisReport>` via `contextBridge`.

#### Scenario: Type-safe call from renderer
- **WHEN** renderer calls `window.electronAPI.ai.analyze(netlist)`
- **THEN** the call is forwarded to `ipcRenderer.invoke('ai:analyze', netlist)` and the result is returned

---

### Requirement: Shared types for AnalysisReport
`src/shared/types/project.ts` SHALL export `AnalysisItem` and `AnalysisReport` interfaces so both Main and Renderer processes share the same type contract.

#### Scenario: Type import in both processes
- **WHEN** `ClaudeProvider.ts` and `AIChatPanel.tsx` both import `AnalysisReport` from `@shared/types/project`
- **THEN** TypeScript compilation succeeds with no type errors

---

### PBT Properties: AI Circuit Analysis

#### [INVARIANT] Severity bucket consistency
Every item in `errors[]` has `severity === 'error'`; every item in `warnings[]` has `severity === 'warning'`; every item in `suggestions[]` has `severity === 'suggestion'`
[FALSIFICATION STRATEGY] Generate adversarial API responses with mismatched severity values; assert schema validation rejects misclassified items.

#### [INVARIANT] Parse-failure fallback shape is exact
On any JSON parse failure: `errors.length === 0 && warnings.length === 0 && suggestions.length === 1 && suggestions[0].severity === 'suggestion' && suggestions[0].message === rawText`
[FALSIFICATION STRATEGY] Feed truncated JSON, binary garbage, empty string, plain prose text as mock API response; assert exact fallback structure.

#### [INVARIANT] Round-trip serialization
`JSON.parse(JSON.stringify(report))` equals `report` for any valid `AnalysisReport`
[FALSIFICATION STRATEGY] Fuzz reports with optional `component` field (present/absent), Unicode messages, empty arrays, maximum-length strings.

#### [INVARIANT] Non-negative array lengths
`errors.length >= 0 && warnings.length >= 0 && suggestions.length >= 0`
[FALSIFICATION STRATEGY] Generate all edge cases including fully empty report `{errors:[],warnings:[],suggestions:[]}`.
