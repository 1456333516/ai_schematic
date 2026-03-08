# Iteration 2: Domain Core + AI Generation - Implementation Tasks

## 1. Project Setup

- [x] 1.1 Add @anthropic-ai/sdk dependency to package.json
- [x] 1.2 Add zod dependency for validation schemas
- [x] 1.3 Create src/renderer/domain/ directory structure
- [x] 1.4 Create src/renderer/commands/ directory structure
- [x] 1.5 Create src/renderer/view/ directory for GraphSyncer
- [x] 1.6 Create src/main/services/ directory for AI services

## 2. Domain Core - Data Models

- [x] 2.1 Implement Component interface and type definitions (src/renderer/domain/types.ts)
- [x] 2.2 Implement Wire interface and type definitions
- [x] 2.3 Implement Net interface and type definitions
- [x] 2.4 Implement Netlist interface with Map-based storage
- [x] 2.5 Add PinRef type for pin references (e.g., "R1.L")

## 3. Domain Core - NetlistManager

- [x] 3.1 Implement NetlistManager class skeleton
- [x] 3.2 Implement addComponent(data: ComponentData): void
- [x] 3.3 Implement removeComponent(id: string): void
- [x] 3.4 Implement moveComponent(id: string, position: Point): void
- [x] 3.5 Implement connectPins(from: PinRef, to: PinRef): void
- [x] 3.6 Implement disconnectWire(id: string): void
- [x] 3.7 Implement updateComponentProperty(id: string, key: string, value: any): void
- [x] 3.8 Add getComponent(id: string): Component | undefined
- [x] 3.9 Add getWire(id: string): Wire | undefined
- [x] 3.10 Add getNet(name: string): Net | undefined

## 4. Domain Core - ConnectivityGraph

- [x] 4.1 Implement ConnectivityGraph class with adjacency list
- [x] 4.2 Implement buildFromNetlist(netlist: Netlist): void
- [x] 4.3 Implement getConnectedComponents(id: string): string[]
- [x] 4.4 Implement findPath(from: string, to: string): string[]
- [x] 4.5 Implement detectFloatingNets(): string[]
- [x] 4.6 Add incremental update methods for graph maintenance

## 5. Command Bus - Core Infrastructure

- [x] 5.1 Define Command interface (type, description, timestamp, sheetId, execute, undo)
- [x] 5.2 Define DomainEvent interface (type, data, timestamp)
- [x] 5.3 Define CommandContext interface (netlistManager)
- [x] 5.4 Implement EventBus class with emit() and subscribe()
- [x] 5.5 Implement CommandBus class skeleton
- [x] 5.6 Implement CommandBus.execute(cmd: Command): void
- [x] 5.7 Implement CommandBus.undo(): void
- [x] 5.8 Implement CommandBus.redo(): void
- [x] 5.9 Implement undo/redo stack management with 100-command limit
- [x] 5.10 Implement canUndo() and canRedo() state methods

## 6. Command Bus - Command Implementations

- [x] 6.1 Implement AddComponentCommand with execute() and undo()
- [x] 6.2 Implement RemoveComponentCommand with execute() and undo()
- [x] 6.3 Implement MoveComponentCommand with execute() and undo()
- [x] 6.4 Implement ConnectPinsCommand with execute() and undo()
- [x] 6.5 Implement DisconnectWireCommand with execute() and undo()
- [x] 6.6 Implement UpdatePropertyCommand with execute() and undo()
- [x] 6.7 Implement BatchCommand for grouping multiple commands

## 7. GraphSyncer - Domain to X6 Synchronization

- [x] 7.1 Implement GraphSyncer class skeleton
- [x] 7.2 Implement bidirectional ID mapping (domain ID ↔ X6 cell ID)
- [x] 7.3 Implement EventBus subscription in constructor
- [x] 7.4 Implement handleNodeAdded(event) with silent: true
- [x] 7.5 Implement handleNodeRemoved(event) with silent: true
- [x] 7.6 Implement handleNodeMoved(event) with echo cancellation
- [x] 7.7 Implement handleEdgeAdded(event) with silent: true
- [x] 7.8 Implement handleEdgeRemoved(event) with silent: true
- [x] 7.9 Implement handlePropertyUpdated(event) with silent: true
- [x] 7.10 Implement position equality check with 0.1px tolerance
- [x] 7.11 Implement requestAnimationFrame batching for updates
- [x] 7.12 Implement dispose() method to clean up subscriptions

## 8. Canvas Integration - Event Handler Refactoring

- [x] 8.1 Refactor SchematicCanvas node:mouseup to dispatch MoveComponentCommand
- [x] 8.2 Refactor SchematicCanvas Delete key to dispatch RemoveComponentCommand
- [x] 8.3 Refactor SchematicCanvas edge:connected to dispatch ConnectPinsCommand
- [x] 8.4 Refactor SchematicCanvas edge:removed to dispatch DisconnectWireCommand
- [x] 8.5 Refactor ComponentLibrary drag-and-drop to dispatch AddComponentCommand
- [x] 8.6 Wire Ctrl+Z to CommandBus.undo()
- [x] 8.7 Wire Ctrl+Y to CommandBus.redo()
- [x] 8.8 Wire Ctrl+V paste to dispatch BatchCommand with AddComponentCommands
- [x] 8.9 Update Toolbar undo/redo buttons to use CommandBus state

## 9. AI Integration - Main Process Services

- [x] 9.1 Implement ClaudeProvider class in src/main/services/ClaudeProvider.ts
- [x] 9.2 Define tool schemas for add_component, connect_pins, add_power_symbol, add_net_label
- [x] 9.3 Implement ClaudeProvider.generateSchematic(prompt: string) with streaming
- [x] 9.4 Implement ClaudeProvider.modifySchematic(instruction: string, context: NetlistContext) with streaming
- [x] 9.5 Implement streaming chunk parser to extract tool_use blocks
- [x] 9.6 Implement AIService class in src/main/services/AIService.ts
- [x] 9.7 Implement IPC handlers for ai:generate and ai:modify
- [x] 9.8 Implement IPC event emitters for ai:tool-call, ai:error, ai:complete
- [x] 9.9 Add error handling for 401/403/429/timeout errors

## 10. AI Integration - API Key Management

- [x] 10.1 Implement saveApiKey(key: string) using safeStorage in main process
- [x] 10.2 Implement loadApiKey(): string | null using safeStorage
- [x] 10.3 Add IPC handlers for settings:save-api-key and settings:load-api-key
- [x] 10.4 Implement API key validation (starts with "sk-ant-")
- [x] 10.5 Add error event emission for invalid API key (401/403)

## 11. Validation Pipeline

- [x] 11.1 Define Zod schemas for tool call inputs (src/renderer/validation/schemas.ts)
- [x] 11.2 Implement ValidationPipeline class skeleton
- [x] 11.3 Implement validateSchema(toolCall) using Zod
- [x] 11.4 Implement checkReferenceIntegrity(toolCall, netlist)
- [x] 11.5 Implement basicERC(netlist) for floating pins, shorts, unconnected power
- [x] 11.6 Implement RepairOrchestrator class
- [x] 11.7 Implement auto-add missing GND repair
- [x] 11.8 Implement net name normalization repair
- [x] 11.9 Implement duplicate wire removal repair
- [x] 11.10 Implement ValidationResult reporting with ERROR/WARNING/INFO levels

## 12. Auto-Layout Engine

- [x] 12.1 Implement GridLayoutEngine class (src/renderer/domain/GridLayoutEngine.ts)
- [x] 12.2 Implement getNextPosition(componentWidth, componentHeight): Point
- [x] 12.3 Implement row/column tracking with 5 columns per row
- [x] 12.4 Implement grid alignment (10px grid)
- [x] 12.5 Implement spacing constants (100px horizontal, 120px vertical)
- [x] 12.6 Implement reset() method for new generation sessions
- [x] 12.7 Integrate GridLayoutEngine with AddComponentCommand

## 13. AI Chat Panel UI

- [x] 13.1 Replace AIChatPanel stub with full implementation
- [x] 13.2 Implement message list component with user/AI message styling
- [x] 13.3 Implement auto-scroll to bottom on new messages
- [x] 13.4 Implement markdown rendering for AI messages
- [x] 13.5 Implement streaming text display with incremental updates
- [x] 13.6 Implement progress indicator for AI generation
- [x] 13.7 Implement current operation display ("Adding R1...")
- [x] 13.8 Implement component count display ("Added 3 of 10 components")
- [x] 13.9 Implement stop button with streaming abort
- [x] 13.10 Implement error message display with retry button
- [x] 13.11 Implement multi-line input field with Enter to send
- [x] 13.12 Implement input field disable during generation
- [x] 13.13 Wire IPC listeners for ai:tool-call, ai:error, ai:complete events

## 14. Settings Dialog

- [x] 14.1 Create SettingsDialog component (src/renderer/components/dialogs/SettingsDialog.tsx)
- [x] 14.2 Implement modal dialog with Ant Design Modal
- [x] 14.3 Implement API key input field with password type
- [x] 14.4 Implement show/hide toggle for API key
- [x] 14.5 Implement "Test Connection" button
- [x] 14.6 Implement test connection logic with success/error feedback
- [x] 14.7 Implement save button to persist API key via IPC
- [x] 14.8 Add gear icon to UI (bottom-right corner) to open settings
- [x] 14.9 Implement auto-open on 401/403 errors with error message
- [x] 14.10 Add placeholder sections for grid size and auto-save interval (disabled)

## 15. Conversation History Persistence

- [x] 15.1 Define conversation history data structure
- [x] 15.2 Implement saveConversation(messages) in main process FileService
- [x] 15.3 Implement loadConversation(projectPath) in main process FileService
- [x] 15.4 Add IPC handlers for conversation:save and conversation:load
- [x] 15.5 Wire AIChatPanel to save messages on send/receive
- [x] 15.6 Wire project open to load conversation history

## 16. Integration and Wiring

- [x] 16.1 Initialize NetlistManager in App.tsx or SchematicCanvas
- [x] 16.2 Initialize CommandBus with NetlistManager context
- [x] 16.3 Initialize EventBus and wire to CommandBus
- [x] 16.4 Initialize GraphSyncer with X6 graph and EventBus
- [x] 16.5 Initialize GridLayoutEngine
- [x] 16.6 Wire AIChatPanel to send IPC requests to AIService
- [x] 16.7 Wire AIService tool call events to CommandBus execution
- [x] 16.8 Wire ValidationPipeline to tool call processing
- [x] 16.9 Add domain initialization on project create/open
- [x] 16.10 Add domain cleanup on project close

## 17. Testing

- [x] 17.1 Add unit tests for NetlistManager operations
- [x] 17.2 Add unit tests for ConnectivityGraph queries
- [x] 17.3 Add unit tests for Command execute/undo
- [x] 17.4 Add unit tests for ValidationPipeline stages
- [x] 17.5 Add integration test for user drag → command → domain → GraphSyncer → X6
- [x] 17.6 Add integration test for AI tool call → validation → command → domain → X6
- [x] 17.7 Add integration test for undo/redo with 10+ operations
- [x] 17.8 Add performance test for 100+ component schematic
- [x] 17.9 Add echo cancellation test (drag same component 100 times)
- [x] 17.10 Add test for API key encryption/decryption

## 18. Documentation and Polish

- [x] 18.1 Update architecture.md with Domain Core and Command Bus sections
- [x] 18.2 Add JSDoc comments to all public APIs
- [x] 18.3 Add inline comments for echo cancellation logic
- [x] 18.4 Add error messages for common validation failures
- [x] 18.5 Add loading states for AI generation
- [x] 18.6 Add success toast for API key save
- [x] 18.7 Update README with AI generation usage instructions
- [x] 18.8 Add example prompts for AI generation
