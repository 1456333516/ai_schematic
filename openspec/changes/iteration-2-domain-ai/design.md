# Iteration 2: Domain Core + AI Generation - Design Document

## Context

Iteration 1 established a functional Electron application with X6 canvas, basic component shapes, and UI layout. However, the current architecture has X6 as both the data model and view layer, making it impossible to:
- Generate schematics from AI without coordinates
- Implement undo/redo (X6's built-in history is view-only)
- Validate electrical correctness independent of rendering
- Serialize schematics in a domain-agnostic format

This iteration introduces a clean separation between domain (circuit topology) and view (X6 rendering), enabling AI generation and command-driven architecture.

**Current State:**
- X6 Graph holds all schematic data
- Direct X6 API calls for all modifications
- No undo/redo support
- No AI integration
- Zustand stores only UI state (zoom, cursor, selection)

**Constraints:**
- Must maintain 60 FPS interaction quality
- Cannot break Iteration 1's existing drag-and-drop UX
- Must support 100+ component schematics
- API key must be stored securely (Electron safeStorage)
- Iteration 2 uses simple grid layout (no advanced auto-routing)

**Stakeholders:**
- End users: Expect smooth canvas interaction + AI generation
- Future iterations: Need clean domain model for advanced features (multi-sheet, version control, BOM export)

## Goals / Non-Goals

**Goals:**
- Establish Domain Core as single source of truth for circuit data
- Implement command pattern with full undo/redo support
- Integrate Claude AI using Tool Use mode for structured generation
- Enable bidirectional sync between Domain and X6 with echo cancellation
- Provide streaming AI chat UI with progress indicators
- Securely store API keys using Electron safeStorage
- Support simple grid-based auto-layout for AI-generated components

**Non-Goals:**
- Advanced auto-routing or topology optimization (deferred to Iteration 3+)
- Multi-model AI support (Claude only for Iteration 2)
- PCB layout or Gerber export
- Real-time collaboration
- Version control UI (basic version tracking only)

## Decisions

### Decision 1: Domain Core Architecture

**Choice:** Separate Netlist data model + ConnectivityGraph

**Rationale:**
- Netlist provides serializable, view-independent circuit representation
- ConnectivityGraph enables fast topology queries for ERC and AI analysis
- Separation allows independent evolution of data model and rendering

**Alternatives Considered:**
- **Option A:** Use X6 Graph as domain model
  - ❌ Couples domain logic to view library
  - ❌ Cannot serialize without view-specific data
  - ❌ Difficult to test domain logic independently

- **Option B:** Single unified graph structure
  - ❌ Mixing topology and rendering concerns
  - ✅ Simpler implementation
  - Decision: Rejected due to future extensibility needs

**Implementation:**
```typescript
// Domain layer (src/renderer/domain/)
interface Netlist {
  components: Map<string, Component>
  wires: Map<string, Wire>
  nets: Map<string, Net>
}

class NetlistManager {
  private netlist: Netlist
  private connectivityGraph: ConnectivityGraph

  addComponent(data: ComponentData): void
  removeComponent(id: string): void
  moveComponent(id: string, position: Point): void
  connectPins(from: PinRef, to: PinRef): void
}
```

### Decision 2: X6 Interaction Strategy - "Echo Cancellation"

**Choice:** Event-after conversion + echo cancellation (not full interception)

**Rationale:**
- Preserves X6's native 60 FPS interaction quality
- Avoids reimplementing X6's drag/selection/routing logic
- Echo cancellation prevents circular updates

**Alternatives Considered:**
- **Option A:** Full interception (block all X6 events, reimplement interactions)
  - ❌ Massive implementation effort
  - ❌ Loses X6's performance optimizations
  - ❌ Difficult to maintain parity with X6 updates

- **Option B:** Dual-state (AI uses commands, manual uses X6 directly)
  - ❌ Inconsistent architecture
  - ❌ Undo/redo only works for AI operations
  - ❌ Difficult to reason about state

**Implementation:**
```typescript
// User drags component
graph.on('node:changed:position', ({ node, current }) => {
  // Let X6 update immediately (smooth UX)
  // Dispatch command on mouseup
})

graph.on('node:mouseup', ({ node }) => {
  const pos = node.position()
  commandBus.execute(new MoveComponentCommand(node.id, pos))
})

// GraphSyncer handles domain → X6
eventBus.on('node:moved', (event) => {
  const node = graph.getCellById(event.id)
  const currentPos = node.position()

  // Echo cancellation: skip if already at target
  if (Math.abs(currentPos.x - event.x) < 0.1 &&
      Math.abs(currentPos.y - event.y) < 0.1) {
    return // Skip redundant update
  }

  node.position(event.x, event.y, { silent: true }) // Prevent event loop
})
```

### Decision 3: AI Integration - Claude Tool Use Mode

**Choice:** Use Claude's Tool Use (function calling) with streaming

**Rationale:**
- Tool Use provides structured, validated output (no JSON parsing errors)
- Streaming enables incremental UI updates (components appear one-by-one)
- Tool schema constrains AI output to valid operations

**Alternatives Considered:**
- **Option A:** Prompt AI to generate JSON DSL
  - ❌ Frequent JSON syntax errors
  - ❌ Requires complex error recovery
  - ❌ No streaming of partial results

- **Option B:** Use Claude's structured output mode
  - ❌ Not available for streaming
  - ❌ Less flexible than Tool Use

**Tool Schema Design:**
```typescript
const tools = [
  {
    name: "add_component",
    description: "Add a component to the schematic",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Component reference designator (e.g., R1, C1)" },
        type: { type: "string", enum: ["resistor", "capacitor", "led", ...] },
        category: { type: "string" },
        properties: {
          type: "object",
          properties: {
            value: { type: "string" },
            package: { type: "string" }
          }
        }
      },
      required: ["id", "type", "category"]
    }
  },
  {
    name: "connect_pins",
    description: "Connect two component pins",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Source pin (e.g., R1.L)" },
        to: { type: "string", description: "Target pin (e.g., C1.1)" },
        net: { type: "string", description: "Net name" }
      },
      required: ["from", "to", "net"]
    }
  }
]
```

### Decision 4: Auto-Layout Strategy

**Choice:** Simple grid layout (sequential left-to-right, top-to-bottom)

**Rationale:**
- Iteration 2 focuses on correct netlist generation, not optimal placement
- Grid layout is deterministic and easy to implement
- Users can manually reposition components after generation
- Matches behavior of professional EDA tools (KiCad, Altium) when importing netlists

**Alternatives Considered:**
- **Option A:** Force-directed layout
  - ❌ Non-deterministic results
  - ❌ Doesn't respect electrical hierarchy
  - ❌ Complex implementation

- **Option B:** Hierarchical layout (group by function)
  - ✅ Better visual organization
  - ❌ Requires AI to provide grouping hints
  - ❌ Deferred to Iteration 3+

**Implementation:**
```typescript
class GridLayoutEngine {
  private currentRow = 0
  private currentCol = 0
  private readonly GRID_SIZE = 10
  private readonly COL_SPACING = 100
  private readonly ROW_SPACING = 120
  private readonly COLS_PER_ROW = 5

  getNextPosition(componentWidth: number, componentHeight: number): Point {
    const x = 100 + this.currentCol * this.COL_SPACING
    const y = 100 + this.currentRow * this.ROW_SPACING

    this.currentCol++
    if (this.currentCol >= this.COLS_PER_ROW) {
      this.currentCol = 0
      this.currentRow++
    }

    return { x, y }
  }
}
```

### Decision 5: Validation Pipeline Architecture

**Choice:** Multi-stage pipeline (Schema → Integrity → ERC → Repair)

**Rationale:**
- Staged validation allows early exit on critical errors
- Separation of concerns (syntax vs semantics vs electrical rules)
- RepairOrchestrator can fix common AI mistakes automatically

**Pipeline Stages:**
1. **Schema Validation (Zod):** Validate tool call structure
2. **Reference Integrity:** Check component/pin existence
3. **Basic ERC:** Detect floating pins, shorts, unconnected power
4. **Auto-Repair:** Fix common issues (add missing GND, normalize net names)

**Implementation:**
```typescript
class ValidationPipeline {
  async validate(toolCall: ToolCall): Promise<ValidationResult> {
    // Stage 1: Schema
    const schemaResult = this.validateSchema(toolCall)
    if (!schemaResult.valid) return schemaResult

    // Stage 2: Integrity
    const integrityResult = this.checkIntegrity(toolCall)
    if (!integrityResult.valid) return integrityResult

    // Stage 3: ERC (after all components added)
    // Stage 4: Repair (if ERC finds issues)

    return { valid: true, warnings: [] }
  }
}
```

### Decision 6: API Key Storage

**Choice:** Electron safeStorage (OS-level encryption)

**Rationale:**
- Uses platform-native secure storage (Keychain/DPAPI/libsecret)
- No need to implement custom encryption
- Automatic key rotation on some platforms

**Alternatives Considered:**
- **Option A:** Store in plain text config file
  - ❌ Security risk
  - ❌ Violates best practices

- **Option B:** Custom encryption with app-level key
  - ❌ Key management complexity
  - ❌ Reinventing the wheel

**Implementation:**
```typescript
// Main process
import { safeStorage } from 'electron'

function saveApiKey(key: string): void {
  const encrypted = safeStorage.encryptString(key)
  fs.writeFileSync(API_KEY_PATH, encrypted)
}

function loadApiKey(): string | null {
  if (!fs.existsSync(API_KEY_PATH)) return null
  const encrypted = fs.readFileSync(API_KEY_PATH)
  return safeStorage.decryptString(encrypted)
}
```

## Risks / Trade-offs

### Risk 1: Echo cancellation edge cases
**Risk:** Position comparison tolerance (0.1px) may cause drift over many operations
**Mitigation:**
- Use strict equality for non-drag operations (AI, undo/redo)
- Only apply tolerance for user drag operations
- Add integration tests for 100+ drag operations

### Risk 2: X6 silent mode compatibility
**Risk:** Future X6 versions may change silent parameter behavior
**Mitigation:**
- Pin X6 version in package.json
- Add tests that verify silent mode prevents events
- Document X6 version dependency in architecture.md

### Risk 3: AI generation performance
**Risk:** Streaming 100+ tool calls may overwhelm the UI
**Mitigation:**
- Batch GraphSyncer updates using requestAnimationFrame
- Limit concurrent command execution to 10 at a time
- Add progress throttling (update UI every 100ms max)

### Risk 4: Validation pipeline false positives
**Risk:** ERC may flag valid circuits as errors (e.g., intentional floating pins)
**Mitigation:**
- Classify issues as ERROR/WARNING/INFO
- Allow users to dismiss warnings
- RepairOrchestrator only fixes ERROR-level issues

### Risk 5: API key security on shared machines
**Risk:** safeStorage protects against file access but not local admin
**Mitigation:**
- Document security model in user guide
- Recommend using API keys with usage limits
- Add option to require key re-entry on app start (future)

### Risk 6: Undo stack memory growth
**Risk:** Large schematics with many operations may consume excessive memory
**Mitigation:**
- Limit undo stack to 100 commands
- Use structural sharing for netlist snapshots
- Monitor memory usage in performance tests

## Migration Plan

### Phase 1: Domain Core Setup (No Breaking Changes)
1. Add domain layer modules (Netlist, NetlistManager, ConnectivityGraph)
2. Add command bus and event bus
3. Add GraphSyncer (initially no-op)
4. Existing X6 code continues to work

### Phase 2: Command Integration (Breaking Changes)
1. Refactor SchematicCanvas event handlers to dispatch commands
2. Refactor ComponentLibrary drag-and-drop to use AddComponentCommand
3. Wire GraphSyncer to EventBus
4. Test echo cancellation with manual interactions

### Phase 3: AI Integration
1. Add Anthropic SDK dependency
2. Implement ClaudeProvider and AIService
3. Implement validation pipeline
4. Replace AIChatPanel stub with streaming UI
5. Add SettingsDialog for API key

### Phase 4: Testing & Polish
1. Integration tests for command/event flow
2. Performance tests (100+ components)
3. Echo cancellation edge case tests
4. AI generation end-to-end tests

### Rollback Strategy
- If critical issues found, can disable AI features via feature flag
- Domain Core can be bypassed by reverting to direct X6 manipulation
- No data migration needed (Iteration 1 had no persistence)

## Open Questions

1. **Q:** Should we support canceling individual tool calls during AI generation?
   **A:** No, stop button cancels entire generation. Individual cancellation adds complexity without clear user benefit.

2. **Q:** How to handle AI generating invalid component types?
   **A:** Validation pipeline rejects invalid types. AI prompt includes list of valid types.

3. **Q:** Should undo/redo work across project sessions?
   **A:** No, undo stack is in-memory only for Iteration 2. Persistent undo deferred to version control feature.

4. **Q:** What happens if user manually edits while AI is generating?
   **A:** Commands are serialized through CommandBus, so manual edits queue after AI commands. UI disables manual editing during generation.

5. **Q:** How to handle very large AI responses (500+ components)?
   **A:** Add progress throttling and batch command execution. If performance issues persist, add pagination to tool calls.
