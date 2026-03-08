# Domain Core Specification

## ADDED Requirements

### Requirement: Netlist data model
The system SHALL maintain a complete circuit netlist as the single source of truth for all schematic data, independent of any rendering layer.

#### Scenario: Component storage
- **WHEN** a component is added to the netlist
- **THEN** the system stores its id, type, category, properties, pins, and position

#### Scenario: Wire storage
- **WHEN** a wire is created between pins
- **THEN** the system stores its id, routing points, net name, start pin reference, and end pin reference

#### Scenario: Net tracking
- **WHEN** pins are connected
- **THEN** the system maintains a net record with name, type, and all connected pin references

### Requirement: NetlistManager operations
The system SHALL provide a NetlistManager class that exposes all netlist modification operations through a consistent API.

#### Scenario: Add component
- **WHEN** addComponent(data) is called with valid component data
- **THEN** the component is added to the netlist and assigned a unique ID if not provided

#### Scenario: Remove component
- **WHEN** removeComponent(id) is called
- **THEN** the component and all connected wires are removed from the netlist

#### Scenario: Move component
- **WHEN** moveComponent(id, position) is called
- **THEN** the component's position is updated without affecting its connections

#### Scenario: Connect pins
- **WHEN** connectPins(from, to) is called with valid pin references
- **THEN** a wire is created connecting the pins and assigned to the appropriate net

#### Scenario: Disconnect wire
- **WHEN** disconnectWire(id) is called
- **THEN** the wire is removed and the net is updated to reflect the disconnection

#### Scenario: Update property
- **WHEN** updateComponentProperty(id, key, value) is called
- **THEN** the component's property is updated without affecting its topology

### Requirement: ConnectivityGraph
The system SHALL maintain a connectivity graph derived from the netlist for efficient topology queries.

#### Scenario: Query connected components
- **WHEN** getConnectedComponents(id) is called
- **THEN** the system returns all component IDs electrically connected to the specified component

#### Scenario: Find path
- **WHEN** findPath(from, to) is called
- **THEN** the system returns an array of component IDs representing the electrical path, or empty array if no path exists

#### Scenario: Detect floating nets
- **WHEN** detectFloatingNets() is called
- **THEN** the system returns all net names that have only one connected pin

### Requirement: Domain immutability
The system SHALL ensure the domain layer never directly references or depends on view layer objects.

#### Scenario: View independence
- **WHEN** any NetlistManager method is called
- **THEN** the operation completes without accessing X6 Graph or any React components

#### Scenario: Data serialization
- **WHEN** the netlist is serialized to JSON
- **THEN** the output contains only domain data with no view-specific properties

### Requirement: Performance constraints
The system SHALL execute all domain operations within performance budgets to maintain 60 FPS interaction.

#### Scenario: Single operation latency
- **WHEN** any NetlistManager method is called
- **THEN** the operation completes in less than 16 milliseconds

#### Scenario: Large schematic support
- **WHEN** the netlist contains 100+ components
- **THEN** all query operations complete in less than 16 milliseconds

## Property-Based Testing Invariants

### Commutativity
- **INVARIANT**: `moveComponent(c1,p1)` commutes with `moveComponent(c2,p2)` when `c1 != c2`
- **INVARIANT**: `updateComponentProperty(c1,k,v1)` commutes with `updateComponentProperty(c2,k2,v2)` when `c1 != c2`
- **INVARIANT**: `connectPins(a,b)` commutes with `connectPins(c,d)` when endpoint sets are disjoint and net names differ
- **INVARIANT**: `addComponent(x)` commutes with `moveComponent(y,p)` when `x.id != y.id`

### Idempotency
- **INVARIANT**: `moveComponent(c,p)` is idempotent: applying twice yields same netlist as once
- **INVARIANT**: `updateComponentProperty(c,k,v)` is idempotent for same `v`

### Round-trip
- **INVARIANT**: Netlist JSON round-trip preserves semantics: `decode(encode(S)) ≡ S`
- **INVARIANT**: `addComponent` then `removeComponent` (same ID) returns pre-state if no dependent ops inserted
- **INVARIANT**: `connectPins` then `disconnectWire` on created wire returns pre-connect topology

### Invariant Preservation
- **INVARIANT**: Component IDs are unique in netlist at all times
- **INVARIANT**: Wire IDs are unique at all times
- **INVARIANT**: Every wire endpoint reference points to an existing component and valid pin
- **INVARIANT**: Removing a component removes all wires incident to its pins
- **INVARIANT**: `moveComponent` preserves connectivity relation (same net memberships and graph edges)
- **INVARIANT**: `updateComponentProperty` preserves topology
- **INVARIANT**: `getConnectedComponents(id)` returns exactly nodes in same connected component as graph traversal baseline
- **INVARIANT**: `findPath(a,b)` returns empty iff disconnected; else path endpoints are `a,b` and each adjacent pair is electrically connected
- **INVARIANT**: `detectFloatingNets()` equals `{net | degree(net)=1}` from net-degree oracle

### Bounds
- **INVARIANT**: Domain operation latency bound: each NetlistManager op completes `<16ms` under benchmark profile
- **INVARIANT**: Query latency bound for `>=100` components: connectivity queries `<16ms`
