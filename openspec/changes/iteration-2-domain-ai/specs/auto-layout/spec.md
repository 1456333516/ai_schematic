# Auto Layout Specification

## ADDED Requirements

### Requirement: Grid-based placement
The system SHALL place AI-generated components on a simple grid layout.

#### Scenario: Grid alignment
- **WHEN** a component is placed by auto-layout
- **THEN** its position is aligned to the 10px grid

#### Scenario: Sequential placement
- **WHEN** multiple components are added
- **THEN** they are placed sequentially from left to right, top to bottom

#### Scenario: Row wrapping
- **WHEN** a row reaches 5 components
- **THEN** the next component starts a new row below

### Requirement: Component spacing
The system SHALL maintain consistent spacing between auto-laid-out components.

#### Scenario: Horizontal spacing
- **WHEN** components are placed in a row
- **THEN** they are separated by at least 100px horizontally

#### Scenario: Vertical spacing
- **WHEN** components are placed in different rows
- **THEN** rows are separated by at least 120px vertically

#### Scenario: Component size consideration
- **WHEN** calculating spacing
- **THEN** the layout accounts for each component's actual width and height

### Requirement: Starting position
The system SHALL begin auto-layout at a consistent canvas position.

#### Scenario: Initial position
- **WHEN** auto-layout begins
- **THEN** the first component is placed at (100, 100) canvas coordinates

#### Scenario: Clear canvas
- **WHEN** auto-layout is triggered on an empty canvas
- **THEN** the starting position is (100, 100)

### Requirement: No coordinate in DSL
The system SHALL not require or use position coordinates from AI-generated DSL.

#### Scenario: DSL without position
- **WHEN** an add_component tool call is received
- **THEN** it does not include x or y coordinates

#### Scenario: Auto-assign position
- **WHEN** a component is added without coordinates
- **THEN** auto-layout assigns a position based on the current layout state

### Requirement: Layout state tracking
The system SHALL track the current auto-layout state to determine next positions.

#### Scenario: Current row tracking
- **WHEN** components are being placed
- **THEN** the layout tracks the current row index

#### Scenario: Current column tracking
- **WHEN** components are being placed
- **THEN** the layout tracks the current column index within the row

#### Scenario: Reset on new generation
- **WHEN** a new AI generation starts
- **THEN** the layout state resets to the initial position

### Requirement: Manual override
The system SHALL allow users to manually reposition auto-laid-out components.

#### Scenario: Drag after auto-layout
- **WHEN** a user drags a component that was auto-laid-out
- **THEN** the component moves to the new position and is no longer managed by auto-layout

#### Scenario: Preserve manual positions
- **WHEN** new components are auto-laid-out
- **THEN** manually positioned components are not affected

### Requirement: Wire routing
The system SHALL not perform automatic wire routing in Iteration 2.

#### Scenario: Manhattan routing
- **WHEN** wires are created between auto-laid-out components
- **THEN** X6's built-in Manhattan router handles the wire paths

#### Scenario: No optimization
- **WHEN** components are auto-laid-out
- **THEN** no attempt is made to minimize wire crossings or optimize topology
