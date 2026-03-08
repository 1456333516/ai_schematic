# Validation Pipeline Specification

## ADDED Requirements

### Requirement: Zod schema validation
The system SHALL validate all tool call inputs using Zod schemas before execution.

#### Scenario: Component schema validation
- **WHEN** an add_component tool call is received
- **THEN** the input is validated against the component schema (id, type, category, properties)

#### Scenario: Connection schema validation
- **WHEN** a connect_pins tool call is received
- **THEN** the input is validated against the connection schema (from, to, net)

#### Scenario: Validation failure
- **WHEN** a tool call fails schema validation
- **THEN** a validation error is emitted with details of the failed fields

### Requirement: Reference integrity checks
The system SHALL verify that all references in tool calls point to existing entities.

#### Scenario: Component existence check
- **WHEN** connect_pins references a component ID
- **THEN** the system verifies the component exists in the netlist

#### Scenario: Pin validity check
- **WHEN** connect_pins references a pin ID
- **THEN** the system verifies the pin exists on the referenced component

#### Scenario: Net consistency check
- **WHEN** multiple connections reference the same net name
- **THEN** the system verifies the net type is consistent across all connections

### Requirement: Basic ERC (Electrical Rules Check)
The system SHALL perform basic electrical rules checking on the generated netlist.

#### Scenario: Floating pin detection
- **WHEN** ERC is run
- **THEN** it detects all component pins that are not connected to any net

#### Scenario: Short circuit detection
- **WHEN** ERC is run
- **THEN** it detects nets with multiple output pins connected

#### Scenario: Unconnected power detection
- **WHEN** ERC is run
- **THEN** it detects power symbols (VCC, GND) that are not connected to any component

### Requirement: RepairOrchestrator
The system SHALL provide automatic repair for common validation errors.

#### Scenario: Auto-add missing GND
- **WHEN** a component has a GND pin but no GND symbol exists
- **THEN** RepairOrchestrator automatically adds a GND symbol and connects it

#### Scenario: Auto-fix net name conflicts
- **WHEN** two nets have similar names (e.g., "VCC" and "Vcc")
- **THEN** RepairOrchestrator normalizes them to a single net name

#### Scenario: Auto-remove duplicate wires
- **WHEN** multiple wires connect the same two pins
- **THEN** RepairOrchestrator removes the duplicate wires

### Requirement: Validation pipeline stages
The system SHALL execute validation in a defined sequence of stages.

#### Scenario: Stage 1 - Schema validation
- **WHEN** a tool call is received
- **THEN** schema validation runs first and blocks execution if it fails

#### Scenario: Stage 2 - Reference integrity
- **WHEN** schema validation passes
- **THEN** reference integrity checks run and emit warnings for missing references

#### Scenario: Stage 3 - ERC
- **WHEN** all tool calls are processed
- **THEN** ERC runs on the complete netlist and emits warnings for electrical issues

#### Scenario: Stage 4 - Auto-repair
- **WHEN** ERC detects repairable issues
- **THEN** RepairOrchestrator attempts to fix them automatically

### Requirement: Validation reporting
The system SHALL provide detailed validation reports for user review.

#### Scenario: Error severity levels
- **WHEN** validation issues are detected
- **THEN** they are classified as ERROR, WARNING, or INFO

#### Scenario: Error location
- **WHEN** a validation error is reported
- **THEN** it includes the component ID or wire ID where the error occurred

#### Scenario: Repair actions
- **WHEN** RepairOrchestrator fixes an issue
- **THEN** the repair action is logged in the validation report

## Property-Based Testing Invariants

### Commutativity
- **INVARIANT**: Net-name normalization repair is order-independent for equivalent names (`VCC`,`Vcc`,`vcc`)
- **INVARIANT**: Duplicate-wire removal result is order-independent

### Idempotency
- **INVARIANT**: Schema validation of same tool payload is deterministic/idempotent
- **INVARIANT**: Reference-integrity check of unchanged netlist+tool call is deterministic/idempotent
- **INVARIANT**: `RepairOrchestrator` is idempotent: `repair(repair(S)) = repair(S)`
- **INVARIANT**: Running ERC twice without netlist mutation yields identical issue set

### Round-trip
- **INVARIANT**: Validation report serialization round-trip preserves issue identity (`severity/code/location/message`)

### Invariant Preservation
- **INVARIANT**: Reference-integrity failure yields issue entries tied to missing component/pin refs
- **INVARIANT**: Net consistency: all connections sharing a net name have one consistent net type after validation/repair
- **INVARIANT**: ERC floating-pin detector has no false negatives vs oracle (pin with zero incident nets must be reported)
- **INVARIANT**: ERC short-circuit rule: any net with >1 output pin is reported
- **INVARIANT**: Unconnected power symbols are always reported by ERC
- **INVARIANT**: Every auto-repair action creates a corresponding log entry in validation report
- **INVARIANT**: Validation issue severity is always in `{ERROR, WARNING, INFO}`
- **INVARIANT**: Validation issue location references existing component/wire IDs when provided

### Monotonicity
- **INVARIANT**: Stage execution is monotone: Schema → Integrity → ERC → Repair; no stage runs before predecessors pass/are eligible
- **INVARIANT**: Error count monotonicity through repair: count of repairable target issues does not increase after one repair pass

### Bounds
- **INVARIANT**: Duplicate-wire bound after repair: for any unordered pin pair, wire multiplicity `<= 1`
- **INVARIANT**: Floating-net result bound: every returned net has exactly one connected pin (`degree=1`)
- **INVARIANT**: Validation report field bounds: each issue has non-empty `message`, valid `severity`, and bounded location identifier type
