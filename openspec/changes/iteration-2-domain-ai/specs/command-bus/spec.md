# Command Bus Specification

## ADDED Requirements

### Requirement: Command interface
The system SHALL define a Command interface that all schematic modification operations must implement.

#### Scenario: Command structure
- **WHEN** a command is created
- **THEN** it MUST have type, description, timestamp, sheetId, execute(), and undo() methods

#### Scenario: Execute returns events
- **WHEN** a command's execute() method is called
- **THEN** it returns an array of DomainEvent objects describing the changes

#### Scenario: Undo returns events
- **WHEN** a command's undo() method is called
- **THEN** it returns an array of DomainEvent objects describing the reversal

### Requirement: Command implementations
The system SHALL provide concrete command classes for all schematic operations.

#### Scenario: AddComponentCommand
- **WHEN** AddComponentCommand is executed
- **THEN** the component is added to the netlist via NetlistManager

#### Scenario: RemoveComponentCommand
- **WHEN** RemoveComponentCommand is executed
- **THEN** the component and its connections are removed from the netlist

#### Scenario: MoveComponentCommand
- **WHEN** MoveComponentCommand is executed
- **THEN** the component's position is updated in the netlist

#### Scenario: ConnectPinsCommand
- **WHEN** ConnectPinsCommand is executed
- **THEN** a wire is created between the specified pins

#### Scenario: DisconnectWireCommand
- **WHEN** DisconnectWireCommand is executed
- **THEN** the wire is removed from the netlist

#### Scenario: UpdatePropertyCommand
- **WHEN** UpdatePropertyCommand is executed
- **THEN** the component's property is updated in the netlist

#### Scenario: BatchCommand
- **WHEN** BatchCommand is executed with multiple sub-commands
- **THEN** all sub-commands are executed in sequence and treated as a single undoable operation

### Requirement: CommandBus orchestration
The system SHALL provide a CommandBus that manages command execution, undo/redo stacks, and event emission.

#### Scenario: Execute command
- **WHEN** execute(cmd) is called
- **THEN** the command is executed, events are emitted, and the command is pushed to the undo stack

#### Scenario: Undo operation
- **WHEN** undo() is called and the undo stack is not empty
- **THEN** the top command is undone, events are emitted, and the command is moved to the redo stack

#### Scenario: Redo operation
- **WHEN** redo() is called and the redo stack is not empty
- **THEN** the top command is re-executed, events are emitted, and the command is moved back to the undo stack

#### Scenario: Clear redo on new command
- **WHEN** a new command is executed after an undo
- **THEN** the redo stack is cleared

### Requirement: Event Bus
The system SHALL provide an Event Bus for publishing and subscribing to domain events.

#### Scenario: Emit event
- **WHEN** emit(event) is called
- **THEN** all registered subscribers receive the event

#### Scenario: Subscribe to events
- **WHEN** subscribe(handler) is called
- **THEN** the handler is registered and an unsubscribe function is returned

#### Scenario: Unsubscribe
- **WHEN** the unsubscribe function is called
- **THEN** the handler no longer receives events

### Requirement: Command context
The system SHALL provide a CommandContext containing only domain layer objects for command execution.

#### Scenario: Context isolation
- **WHEN** a command's execute() or undo() method is called
- **THEN** it receives a context containing only NetlistManager and no view layer references

### Requirement: Undo/redo state
The system SHALL expose undo/redo availability state for UI binding.

#### Scenario: Can undo
- **WHEN** canUndo() is called
- **THEN** it returns true if the undo stack is not empty

#### Scenario: Can redo
- **WHEN** canRedo() is called
- **THEN** it returns true if the redo stack is not empty

### Requirement: Command history limits
The system SHALL limit the undo stack size to prevent unbounded memory growth.

#### Scenario: Stack size limit
- **WHEN** the undo stack exceeds 100 commands
- **THEN** the oldest command is removed from the stack

## Property-Based Testing Invariants

### Commutativity
- **INVARIANT**: `Batch([A,B,C])` is associative with grouping: `Batch([A,B,C]) == Batch([Batch([A,B]),C])` in resulting state/events
- **INVARIANT**: EventBus delivery set for one `emit(e)` is independent of subscriber registration order

### Idempotency
- **INVARIANT**: `canUndo()` and `canRedo()` are pure/idempotent reads (no state mutation)
- **INVARIANT**: Unsubscribe operation is idempotent (calling returned unsubscribe multiple times keeps handler detached)

### Round-trip
- **INVARIANT**: Command round-trip: `undo(execute(cmd,S)) = S` for reversible commands
- **INVARIANT**: Redo round-trip: `redo(undo(execute(cmd,S))) = execute(cmd,S)`
- **INVARIANT**: `Batch([c1..cn])` undo then redo round-trips exactly as one unit
- **INVARIANT**: Event emission round-trip to subscribers preserves event payload equality (no mutation in transit)

### Invariant Preservation
- **INVARIANT**: Schema-failed tool calls never execute downstream mutation commands

### Monotonicity
- **INVARIANT**: CommandBus undo stack size is monotone `+1` per successful execute until cap, `-1` per undo, `+1` per redo
- **INVARIANT**: After any `execute(newCmd)` following at least one `undo`, redo stack size becomes `0`
- **INVARIANT**: Command history order is execution order; popped by undo in strict LIFO sequence
- **INVARIANT**: Event delivery count per subscriber is monotone with number of emits while subscribed
- **INVARIANT**: If bus assigns timestamps at execution, emitted event timestamps are non-decreasing in emission order

### Bounds
- **INVARIANT**: Undo stack length is always `<= 100`
- **INVARIANT**: `canUndo() == (undoStackSize > 0)` and `canRedo() == (redoStackSize > 0)` always hold
- **INVARIANT**: Command event emission bound: events emitted by `execute/undo/redo` equal sum of returned `DomainEvent[]` lengths
