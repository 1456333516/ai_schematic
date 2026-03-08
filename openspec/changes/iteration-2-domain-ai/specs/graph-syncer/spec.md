# Graph Syncer Specification

## ADDED Requirements

### Requirement: Domain event subscription
The system SHALL subscribe to all domain events and synchronize changes to the X6 graph.

#### Scenario: Subscribe on initialization
- **WHEN** GraphSyncer is instantiated
- **THEN** it subscribes to the EventBus for all domain events

#### Scenario: Handle node:added event
- **WHEN** a node:added event is emitted
- **THEN** GraphSyncer creates the corresponding X6 node with silent: true

#### Scenario: Handle node:removed event
- **WHEN** a node:removed event is emitted
- **THEN** GraphSyncer removes the corresponding X6 node with silent: true

#### Scenario: Handle node:moved event
- **WHEN** a node:moved event is emitted
- **THEN** GraphSyncer updates the X6 node position with silent: true

#### Scenario: Handle edge:added event
- **WHEN** an edge:added event is emitted
- **THEN** GraphSyncer creates the corresponding X6 edge with silent: true

#### Scenario: Handle edge:removed event
- **WHEN** an edge:removed event is emitted
- **THEN** GraphSyncer removes the corresponding X6 edge with silent: true

#### Scenario: Handle property:updated event
- **WHEN** a property:updated event is emitted
- **THEN** GraphSyncer updates the X6 node attributes with silent: true

### Requirement: Echo cancellation for physical interactions
The system SHALL prevent circular updates when users physically interact with the canvas.

#### Scenario: Position equality check
- **WHEN** a node:moved event is received
- **THEN** GraphSyncer checks if the X6 node is already at the target position

#### Scenario: Skip redundant update
- **WHEN** the X6 node position matches the domain position
- **THEN** GraphSyncer skips calling node.position() to prevent echo

#### Scenario: Tolerance threshold
- **WHEN** comparing positions
- **THEN** positions within 0.1 pixels are considered equal

### Requirement: Silent mode for non-physical interactions
The system SHALL use X6's silent parameter to prevent event emission during programmatic updates.

#### Scenario: AI generation uses silent
- **WHEN** GraphSyncer updates X6 in response to AI-generated commands
- **THEN** all X6 API calls use { silent: true } option

#### Scenario: Undo/redo uses silent
- **WHEN** GraphSyncer updates X6 in response to undo/redo commands
- **THEN** all X6 API calls use { silent: true } option

#### Scenario: Silent prevents events
- **WHEN** X6 API is called with silent: true
- **THEN** X6 does not emit node:moved, node:added, or other change events

### Requirement: Incremental synchronization
The system SHALL perform incremental updates rather than full graph replacement.

#### Scenario: Single node update
- **WHEN** one component is modified
- **THEN** only that component's X6 node is updated

#### Scenario: Batch updates
- **WHEN** multiple domain events are emitted in quick succession
- **THEN** GraphSyncer batches the X6 updates into a single animation frame

#### Scenario: Preserve selection
- **WHEN** X6 nodes are updated
- **THEN** the current selection state is preserved

### Requirement: Bidirectional mapping
The system SHALL maintain a bidirectional mapping between domain IDs and X6 cell IDs.

#### Scenario: Domain to X6 lookup
- **WHEN** a domain event references a component ID
- **THEN** GraphSyncer can quickly find the corresponding X6 node

#### Scenario: X6 to domain lookup
- **WHEN** an X6 event references a cell ID
- **THEN** the event handler can quickly find the corresponding domain component ID

### Requirement: Disposal and cleanup
The system SHALL properly clean up subscriptions when disposed.

#### Scenario: Unsubscribe on disposal
- **WHEN** GraphSyncer.dispose() is called
- **THEN** all EventBus subscriptions are removed

#### Scenario: Clear mappings
- **WHEN** GraphSyncer.dispose() is called
- **THEN** the bidirectional ID mapping is cleared
