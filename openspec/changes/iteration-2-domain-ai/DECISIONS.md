# Architecture Decisions - Iteration 2

This document records all architectural decisions made during the planning phase to eliminate ambiguities and ensure zero-decision implementation.

## Core Architecture

### 1. Process Architecture
**Decision**: IPC forwarding to renderer process
- AIService in main process parses tool calls
- Tool calls forwarded via IPC to renderer process
- CommandBus in renderer process executes commands
- Rationale: Single source of truth, state consistency

### 2. Data Structure
**Decision**: Map<string, T> for all collections
- Components: `Map<string, Component>`
- Wires: `Map<string, Wire>`
- Nets: `Map<string, Net>`
- Rationale: O(1) lookup, maintains insertion order, type-safe

### 3. Command Execution Model
**Decision**: Synchronous execution
- `execute(): DomainEvent[]` (not Promise)
- `undo(): DomainEvent[]` (not Promise)
- Rationale: Meets <16ms constraint, simpler implementation

### 4. Serialization Format
**Decision**: Flat JSON arrays
```json
{
  "components": [{"id": "R1", ...}],
  "wires": [{"id": "w1", ...}],
  "nets": [{"name": "Net_1", ...}]
}
```
- Rationale: Human-readable, easy to version, compatible with standard tools

## Data Model

### 5. Component ID Scope
**Decision**: Globally unique across entire project
- Format: "R1", "C1", "U1" (reference designator)
- Rationale: Simple, matches EDA conventions

### 6. ID Conflict Handling
**Decision**: Throw error on duplicate ID
- `addComponent` with existing ID throws `DuplicateIdError`
- Rationale: Strict, prevents accidental overwrites

### 7. Missing Entity Handling
**Decision**: Throw error on missing entity
- `removeComponent(nonexistent)` throws `EntityNotFoundError`
- `disconnectWire(nonexistent)` throws `EntityNotFoundError`
- Rationale: Explicit error feedback, easier debugging

### 8. Pin Reference Format
**Decision**: String format "componentId.pinName"
- Examples: "R1.L", "C1.1", "U1.VCC"
- Parsing: `const [componentId, pinName] = pinRef.split('.')`
- Rationale: Readable, matches circuit conventions

### 9. Coordinate System
**Decision**: Floating-point pixels
```typescript
interface Point {
  x: number  // float, pixels
  y: number  // float, pixels
}
```
- Origin: top-left (0, 0)
- Rationale: Matches X6 default behavior

### 10. Net Type
**Decision**: Enum with 5 types
```typescript
type NetType = 'signal' | 'power' | 'ground' | 'clock' | 'analog'
```
- Rationale: Supports ERC checks, clear semantics

### 11. Net Naming Strategy
**Decision**: Auto-generate as "Net_N"
- Format: "Net_1", "Net_2", ...
- Case-sensitive, no duplicates allowed
- Counter increments globally
- Rationale: Simple, consistent, deterministic

### 12. Wire Routing Storage
**Decision**: Absolute coordinate array
```typescript
interface Wire {
  id: string
  from: PinRef
  to: PinRef
  net: string
  routingPoints: Point[]  // absolute coordinates
}
```
- Rationale: Flexible, supports freeform routing

## AI Integration

### 13. Claude Model
**Decision**: Sonnet 4.6
- Model ID: `claude-sonnet-4-6`
- Rationale: Latest stable version, best performance

### 14. Tool Call Execution Order
**Decision**: Strict sequential execution
- Execute one tool call completely before starting next
- Rationale: Predictable, clear dependencies

### 15. Tool Call Failure Handling
**Decision**: Log error and continue
- Failed tool call logged to validation report
- Remaining tool calls continue executing
- Rationale: Fault tolerance, partial results better than none

### 16. Position Allocation
**Decision**: Command layer allocates positions
- `AddComponentCommand.execute()` calls `GridLayoutEngine.getNextPosition()`
- GridLayoutEngine injected via CommandContext
- Rationale: Clear responsibility, testable

### 17. Undo/Redo Granularity
**Decision**: Entire AI request as one BatchCommand
- All tool calls from one AI request grouped into single `BatchCommand`
- Undo reverts entire generation at once
- Rationale: Matches user mental model

### 18. Error Classification
**Decision**: Error type enum
```typescript
type AIErrorType =
  | 'INVALID_API_KEY'
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN'
```
- Rationale: Type-safe, easy to handle

## Performance & Testing

### 19. Performance Measurement
**Decision**: performance.now() + p95 latency
- Measure each operation with `performance.now()`
- Track p95 latency in development mode
- Warn if p95 exceeds 16ms
- Rationale: Simple, practical, sufficient for target

### 20. Multi-Sheet Support
**Decision**: Single sheet only in Iteration 2
- `sheetId` fixed to `'default'`
- All operations scoped to single sheet
- Rationale: Simplifies implementation, defer complexity

## Implementation Constraints

### Type Definitions

```typescript
// Core types
interface Component {
  id: string
  type: string
  category: string
  properties: Record<string, any>
  pins: Pin[]
  position: Point
}

interface Pin {
  name: string
  direction: 'input' | 'output' | 'bidirectional'
  electricalType: 'signal' | 'power' | 'ground'
}

interface Wire {
  id: string
  from: PinRef  // "componentId.pinName"
  to: PinRef
  net: string
  routingPoints: Point[]
}

interface Net {
  name: string
  type: NetType
  pins: PinRef[]
}

interface Netlist {
  components: Map<string, Component>
  wires: Map<string, Wire>
  nets: Map<string, Net>
}

// Command types
interface Command {
  type: string
  description: string
  timestamp: number  // Date.now()
  sheetId: string    // 'default' for Iteration 2
  execute(context: CommandContext): DomainEvent[]
  undo(context: CommandContext): DomainEvent[]
}

interface DomainEvent {
  type: string
  data: any
  timestamp: number
}

interface CommandContext {
  netlistManager: NetlistManager
  layoutEngine: GridLayoutEngine
}
```

### Error Types

```typescript
class DuplicateIdError extends Error {
  constructor(id: string) {
    super(`Component with ID "${id}" already exists`)
  }
}

class EntityNotFoundError extends Error {
  constructor(type: string, id: string) {
    super(`${type} with ID "${id}" not found`)
  }
}

class InvalidPinRefError extends Error {
  constructor(pinRef: string) {
    super(`Invalid pin reference format: "${pinRef}"`)
  }
}
```

## Validation Rules

### Component Validation
- ID must be non-empty string
- Type must be non-empty string
- Category must be non-empty string
- Position must have valid x, y numbers
- Pins array must not be empty

### Wire Validation
- ID must be unique
- from and to must be valid PinRef format
- from and to must reference existing components and pins
- net must be non-empty string
- routingPoints must be array of valid Points

### Net Validation
- name must be non-empty string
- type must be valid NetType enum value
- pins must be array of valid PinRef strings

## Performance Budgets

- Single NetlistManager operation: <16ms (p95)
- Connectivity query (100+ components): <16ms (p95)
- Command execution: <16ms (p95)
- AI tool call processing: <100ms per call (p95)

## Testing Requirements

All implementations must include:
1. Unit tests for each public method
2. Property-based tests for invariants (see PBT section in specs)
3. Integration tests for cross-module interactions
4. Performance tests verifying <16ms budgets
