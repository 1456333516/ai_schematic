# AI Generation Specification

## ADDED Requirements

### Requirement: Claude Tool Use integration
The system SHALL integrate with Claude API using Tool Use (function calling) mode for structured schematic generation.

#### Scenario: Tool schema definition
- **WHEN** the AI service is initialized
- **THEN** it defines tool schemas for add_component, connect_pins, add_power_symbol, and add_net_label

#### Scenario: Streaming tool calls
- **WHEN** the AI generates a schematic
- **THEN** tool calls are streamed incrementally as they are parsed

#### Scenario: Tool call execution
- **WHEN** a complete tool call is received
- **THEN** the corresponding command is created and executed via CommandBus

### Requirement: ClaudeProvider implementation
The system SHALL provide a ClaudeProvider class in the main process that handles Claude API communication.

#### Scenario: API initialization
- **WHEN** ClaudeProvider is instantiated
- **THEN** it loads the API key from Electron safeStorage

#### Scenario: Generate schematic
- **WHEN** generateSchematic(prompt) is called
- **THEN** it sends a streaming request to Claude with the tool schemas and user prompt

#### Scenario: Modify schematic
- **WHEN** modifySchematic(instruction, context) is called
- **THEN** it sends a streaming request with the current netlist context and modification instruction

#### Scenario: Stream parsing
- **WHEN** streaming chunks are received
- **THEN** they are parsed to extract complete tool_use blocks

### Requirement: AIService orchestration
The system SHALL provide an AIService in the main process that coordinates AI requests and IPC communication.

#### Scenario: IPC request handling
- **WHEN** the renderer process sends an AI generation request
- **THEN** AIService validates the request and forwards it to ClaudeProvider

#### Scenario: Stream forwarding
- **WHEN** ClaudeProvider emits a tool call
- **THEN** AIService forwards it to the renderer process via IPC

#### Scenario: Error handling
- **WHEN** the Claude API returns an error
- **THEN** AIService sends an error event to the renderer with error type and message

### Requirement: API key management
The system SHALL securely store and manage the Claude API key using Electron safeStorage.

#### Scenario: Save API key
- **WHEN** the user saves an API key in settings
- **THEN** it is encrypted using safeStorage and persisted to disk

#### Scenario: Load API key
- **WHEN** the application starts
- **THEN** the API key is decrypted from safeStorage if it exists

#### Scenario: Invalid key detection
- **WHEN** the Claude API returns a 401 or 403 error
- **THEN** the system emits an api-key-invalid event to the renderer

### Requirement: Tool schema design
The system SHALL define tool schemas that enable Claude to generate complete schematics without coordinates.

#### Scenario: add_component tool
- **WHEN** Claude calls add_component
- **THEN** it provides id, type, category, and properties but NOT position

#### Scenario: connect_pins tool
- **WHEN** Claude calls connect_pins
- **THEN** it provides from pin reference, to pin reference, and net name

#### Scenario: add_power_symbol tool
- **WHEN** Claude calls add_power_symbol
- **THEN** it provides symbol type (VCC, GND, etc.) and net name

#### Scenario: add_net_label tool
- **WHEN** Claude calls add_net_label
- **THEN** it provides net name and label text

### Requirement: Context awareness
The system SHALL provide Claude with the current schematic context for modification requests.

#### Scenario: Netlist serialization
- **WHEN** modifySchematic is called
- **THEN** the current netlist is serialized to a concise JSON format for Claude's context

#### Scenario: Component list
- **WHEN** Claude receives modification context
- **THEN** it includes all component IDs, types, and properties

#### Scenario: Connection list
- **WHEN** Claude receives modification context
- **THEN** it includes all wire connections and net names

### Requirement: Error recovery
The system SHALL handle AI generation errors gracefully and provide recovery options.

#### Scenario: API timeout
- **WHEN** the Claude API request times out
- **THEN** the system emits a timeout error and offers a retry option

#### Scenario: Invalid tool call
- **WHEN** Claude generates a tool call that fails validation
- **THEN** the system logs the error and continues processing remaining tool calls

#### Scenario: Rate limiting
- **WHEN** the Claude API returns a rate limit error
- **THEN** the system emits a rate-limit error with retry-after information
